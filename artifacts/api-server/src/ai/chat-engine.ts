import type { ShopDB } from "../lib/shop-shared";
import { classifyIntentHybrid } from "./intent";
import { normalizeText } from "./normalization";
import {
  getProduct,
  resolveProduct,
  searchProducts,
  type StoreProduct,
} from "./product-service";
import { generateGroundedAnswer, type GenerationResult } from "./provider";
import { getBestSellers } from "./ranking-service";
import { calculateAirConditionerCapacity } from "./skills/air-conditioner/calculator";
import type {
  AIChatResponse,
  ChatContext,
  ChatIntent,
  ExtractedEntities,
} from "./types";
import { retrieveRAGKnowledge } from "./rag/rag.service";
import { resolveAnswerSource } from "./rag/source-router";

export interface RAGTrace {
  ragUsed: boolean;
  retrievalLatencyMs: number;
  retrievedChunkCount: number;
  topScore: number;
  documentIds: string[];
  embeddingModel: string;
}

const money = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    value,
  );

function nextContext(
  intent: ChatIntent,
  entities: ExtractedEntities,
  product?: StoreProduct,
): ChatContext {
  return {
    lastIntent: intent,
    lastProductId: product?.productId,
    lastCategoryId: product?.categoryId || entities.category,
    constraints: entities,
  };
}

function response(
  message: string,
  intent: ChatIntent,
  responseType: AIChatResponse["responseType"],
  entities: ExtractedEntities,
  product?: StoreProduct,
  products?: StoreProduct[],
): AIChatResponse {
  return {
    message,
    intent,
    responseType,
    context: nextContext(intent, entities, product || products?.[0]),
    products,
    source: resolveAnswerSource(intent),
  };
}

async function verifiedPolicyAnswer(
  db: ShopDB,
  question: string,
  intent: ChatIntent,
  entities: ExtractedEntities,
  context: ChatContext,
): Promise<{ response: AIChatResponse; generation?: GenerationResult; ragTrace?: RAGTrace }> {
  const rag = await retrieveRAGKnowledge(db, question, intent, entities, context);
  const preservedContext = {
    ...nextContext(intent, entities),
    lastProductId: context.lastProductId,
    lastCategoryId: entities.category || context.lastCategoryId,
  };
  if (!rag.context)
    return {
      response: { ...response(
        "Hiện tại tôi chưa tìm thấy thông tin xác thực trong dữ liệu của hệ thống. Bạn có thể gửi tên hoặc mã model rõ hơn, hoặc liên hệ bộ phận hỗ trợ để kiểm tra chính xác.",
        intent,
        "limitation",
        entities,
      ), context: preservedContext },
      ragTrace: rag.trace,
    };
  try {
    const generation = await generateGroundedAnswer(question, rag.context);
    return {
      response: { ...response(
        generation.text,
        intent,
        "generated",
        entities,
      ), context: preservedContext, sources: rag.sources },
      generation,
      ragTrace: rag.trace,
    };
  } catch {
    return {
      response: { ...response(rag.context.slice(0, 700), intent, "direct", entities), context: preservedContext, sources: rag.sources },
      ragTrace: rag.trace,
    };
  }
}

export async function answerChat(
  db: ShopDB,
  message: string,
  context: ChatContext,
): Promise<{ response: AIChatResponse; generation?: GenerationResult; ragTrace?: RAGTrace }> {
  const classification = await classifyIntentHybrid(message, context);
  let intent = classification.intent;
  const entities = classification.entities as ExtractedEntities;

  // Resolve semantic follow-ups from short server-validated context.
  if (intent === "FOLLOW_UP_CONTEXT" && context.lastProductId) {
    const text = normalizeText(message);
    if (/con hang|ton kho|het hang|con may cai/.test(text)) intent = "PRODUCT_STOCK";
  }

  if (intent === "GREETING")
    return {
      response: response(
        "Chào bạn! Bạn đang cần tìm sản phẩm nào hoặc muốn giải quyết nhu cầu gì?",
        intent,
        "clarification",
        entities,
      ),
    };

  if (intent === "OUT_OF_SCOPE")
    return {
      response: response(
        "Tôi phụ trách tư vấn sản phẩm và dịch vụ điện máy. Bạn đang cần hỗ trợ thiết bị nào?",
        intent,
        "clarification",
        entities,
      ),
    };

  if (intent === "HUMAN_HANDOFF")
    return {
      response: response(
        "Tôi sẽ chuyển nhu cầu của bạn sang nhân viên tư vấn. Bạn vui lòng mở mục Hỗ trợ và để lại số điện thoại cùng thời gian tiện liên hệ.",
        intent,
        "handoff",
        entities,
      ),
    };

  if (["AIR_CONDITIONER_SIZING", "AIR_CONDITIONER_HEAT_LOAD"].includes(intent)) {
    if (!entities.areaM2)
      return {
        response: response(
          "Phòng cần lắp khoảng bao nhiêu m²?",
          intent,
          "clarification",
          entities,
        ),
      };
    const sizing = calculateAirConditionerCapacity({
      area: entities.areaM2,
      ceilingHeight: entities.ceilingHeight,
      roomType: entities.roomType,
      direction: entities.direction,
      topFloor: entities.topFloor,
      people: entities.people,
      largeGlassArea: entities.largeGlassArea,
      heatSources: entities.heatSources,
    });
    // Retrieval happens only after deterministic sizing and uses the commercial class.
    const products = await searchProducts(db, {
      ...entities,
      category: "air-conditioner",
      capacityBTU: sizing.recommendedCommercialBTU,
      inStock: true,
    });
    return {
      response: {
        ...response(
          `Với phòng ${entities.areaM2} m², tải lạnh ước tính khoảng ${sizing.estimatedBTU.toLocaleString("vi-VN")} BTU; nên chọn dòng ${sizing.recommendedCommercialBTU.toLocaleString("vi-VN")} BTU (${sizing.recommendedHP} HP).${sizing.heatLoad === "HIGH" ? " Tôi đã tăng công suất do phòng có tải nhiệt cao." : " Mức này áp dụng theo các điều kiện bạn đã cung cấp."}${products.length ? ` Có ${products.length} mẫu đúng công suất đang còn hàng.` : " Hiện chưa có mẫu đúng công suất đang còn hàng trong catalog."}`,
          intent,
          "advice",
          { ...entities, capacityBTU: sizing.recommendedCommercialBTU },
          undefined,
          products,
        ),
        recommendation: {
          type: "AIR_CONDITIONER",
          estimatedBTU: sizing.estimatedBTU,
          recommendedBTU: sizing.recommendedCommercialBTU,
          recommendedHP: sizing.recommendedHP,
          heatLoad: sizing.heatLoad,
          missingImportantFactors: sizing.missingImportantFactors,
        },
      },
    };
  }

  if (intent === "BEST_SELLER") {
    const ranking = await getBestSellers(db, {
      categoryId: entities.category,
      brandId: entities.brand,
      timeWindow: "30d",
      limit: 5,
    });
    if (!ranking.available)
      return {
        response: response(
          `Hiện cửa hàng chưa có đủ dữ liệu đơn đã giao trong 30 ngày để xác minh bảng xếp hạng${entities.brand ? ` ${entities.brand}` : ""} bán chạy. Tôi không muốn đoán sai; tôi có thể thay bằng danh sách sản phẩm đang còn hàng hoặc theo mức giá bạn cần.`,
          intent,
          "limitation",
          entities,
        ),
      };
    return {
      response: response(
        `Đây là ${ranking.products.length} sản phẩm có số lượng bán từ đơn đã giao cao nhất trong 30 ngày.`,
        intent,
        "products",
        entities,
        undefined,
        ranking.products,
      ),
    };
  }

  if (["PRICE_RANKING", "FEATURE_RANKING", "BEST_BY_CRITERIA"].includes(intent)) {
    const products = await searchProducts(db, { ...entities, inStock: true }, 5);
    if (intent === "PRICE_RANKING" && products.length) {
      const cheapest = [...products].sort((a, b) => a.price - b.price).slice(0, 5);
      return {
        response: response(
          `Mẫu có giá thấp nhất trong catalog phù hợp hiện tại là ${cheapest[0].name}, giá ${money(cheapest[0].price)}.`,
          intent,
          "products",
          entities,
          cheapest[0],
          cheapest,
        ),
      };
    }
    return {
      response: response(
        intent === "FEATURE_RANKING"
          ? "Tôi chưa có chỉ số kiểm nghiệm đồng nhất để khẳng định mẫu nào đứng nhất về tính năng này. Tôi có thể lọc các mẫu có thông số đã xác minh để bạn so sánh."
          : "Tôi cần thêm một tiêu chí ưu tiên cụ thể, chẳng hạn ngân sách, công suất hoặc tính năng, để chọn đúng mẫu cho bạn.",
        intent,
        intent === "FEATURE_RANKING" ? "limitation" : "clarification",
        entities,
        undefined,
        products,
      ),
    };
  }

  if (["PRODUCT_PRICE", "PRODUCT_STOCK"].includes(intent)) {
    const product = context.lastProductId && !entities.model
      ? await getProduct(db, context.lastProductId)
      : await resolveProduct(db, message, entities, context.lastProductId);
    if (!product)
      return {
        response: response(
          "Bạn gửi giúp tôi tên hoặc mã model đầy đủ để kiểm tra chính xác nhé.",
          intent,
          "clarification",
          entities,
        ),
      };
    const answer =
      intent === "PRODUCT_PRICE"
        ? `${product.name} hiện có giá ${money(product.price)}. Giá được lấy trực tiếp từ hệ thống tại thời điểm trả lời.`
        : product.stock > 0
          ? `${product.name} hiện còn ${product.stock} sản phẩm.`
          : `${product.name} hiện đang tạm hết hàng.`;
    return {
      response: response(answer, intent, "direct", entities, product, [product]),
    };
  }

  if (intent === "PRODUCT_SEARCH_EXACT") {
    const product = await resolveProduct(db, message, entities);
    return {
      response: product
        ? response(
            `Cửa hàng có ${product.name}; giá hiện tại ${money(product.price)}, ${product.stock > 0 ? `còn ${product.stock} sản phẩm` : "đang tạm hết hàng"}.`,
            intent,
            "products",
            entities,
            product,
            [product],
          )
        : response(
            "Tôi chưa tìm thấy model này trong catalog hiện tại. Bạn kiểm tra lại mã đầy đủ giúp tôi nhé.",
            intent,
            "clarification",
            entities,
          ),
    };
  }

  if (
    [
      "BRAND_SEARCH",
      "BUDGET_SEARCH",
      "FEATURE_SEARCH",
      "MULTI_CONSTRAINT_SEARCH",
      "NO_RESULTS",
      "PRODUCT_SEARCH_FUZZY",
      "NEGATIVE_REQUIREMENT",
      "CATEGORY_DISCOVERY",
      "PRODUCT_ADVICE",
      "AIR_CONDITIONER_USAGE_ADVICE",
    ].includes(intent)
  ) {
    const products = await searchProducts(db, entities);
    return {
      response: response(
        products.length
          ? `Tôi tìm thấy ${products.length} sản phẩm đáp ứng các điều kiện đã xác minh.`
          : "Hiện catalog chưa có sản phẩm đáp ứng đầy đủ các điều kiện này. Bạn muốn nới ngân sách hay bỏ bớt một tiêu chí?",
        intent,
        products.length ? "products" : "clarification",
        entities,
        undefined,
        products,
      ),
    };
  }

  if (["WARRANTY", "SHIPPING", "RETURN_EXCHANGE", "INSTALLATION", "PRODUCT_TECH_EXPLAIN", "PRODUCT_USAGE_GUIDANCE"].includes(intent))
    return verifiedPolicyAnswer(db, message, intent, entities, context);

  if (["POPULAR_TRENDING", "UNKNOWN_DATA"].includes(intent))
    return {
      response: response(
        "Cửa hàng chưa có nguồn dữ liệu đã xác minh cho chỉ số này, nên tôi không thể đưa ra thứ hạng hoặc con số đáng tin cậy.",
        intent,
        "limitation",
        entities,
      ),
    };

  if (intent === "CORRECTION") {
    const products = await searchProducts(db, entities);
    return {
      response: response(
        products.length
          ? "Tôi đã cập nhật điều kiện theo yêu cầu mới của bạn. Đây là các mẫu phù hợp."
          : "Tôi đã cập nhật điều kiện mới, nhưng hiện chưa có sản phẩm khớp hoàn toàn.",
        intent,
        products.length ? "products" : "clarification",
        entities,
        undefined,
        products,
      ),
    };
  }

  if (intent === "INCOMPLETE_REQUEST")
    return {
      response: response(
        entities.category === "air-conditioner"
          ? "Phòng cần lắp khoảng bao nhiêu m²?"
          : "Bạn ưu tiên nhu cầu sử dụng nào nhất?",
        intent,
        "clarification",
        entities,
      ),
    };

  if (["AMBIGUOUS_MODEL", "FOLLOW_UP_CONTEXT"].includes(intent))
    return {
      response: response(
        "Bạn gửi thêm mã model đầy đủ hoặc tên sản phẩm đang nhắc tới giúp tôi nhé.",
        intent,
        "clarification",
        entities,
      ),
    };

  const unsupportedSkill = classification.skill;
  return {
    response: response(
      unsupportedSkill
        ? "Tôi đã hiểu nhu cầu, nhưng chưa có đủ logic nghiệp vụ và dữ liệu sản phẩm để tính kết quả đáng tin cậy. Tôi có thể chuyển bạn sang nhân viên tư vấn."
        : "Bạn cho tôi biết thêm một thông tin quan trọng nhất về nhu cầu hoặc sản phẩm đang quan tâm nhé.",
      intent,
      unsupportedSkill ? "limitation" : "clarification",
      entities,
    ),
  };
}
