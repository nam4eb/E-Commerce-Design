import { extractEntities } from "./entities";
import { modelCandidates, normalizeText } from "./normalization";
import { intentSkill, type ChatIntent } from "./taxonomy";
import type { ChatContext, IntentResult } from "./types";
import { classifyCommerceIntent } from "./provider";

const has = (text: string, terms: string[]) =>
  terms.some((term) => text.includes(term));
const matches = (text: string, pattern: RegExp) => pattern.test(text);

function deterministicIntent(message: string, context: ChatContext): [ChatIntent, number] {
  const text = normalizeText(message);
  const category = extractEntities(message).category;
  const models = modelCandidates(message);
  const ac = category === "air-conditioner" || has(text, ["btu", "cong suat lanh"]);
  const area = /\d+(?:\.\d+)?\s*(?:m2|m vuong|met vuong)/.test(text);
  const priceConstraint =
    /(?:duoi|tren|tam|khoang|tu)\s*\d+(?:\.\d+)?\s*(?:trieu|dong|d\b)/.test(
      text,
    ) ||
    /(?:duoi|tren|tam|khoang|tu|gia duoi)\s*\d+(?:\.\d+)?\s*tr\b/.test(
      text,
    ) ||
    /(?:tam|tu)\s*\d+(?:\.\d+)?\s*den\s*\d+(?:\.\d+)?\s*trieu/.test(
      text,
    );
  const feature = has(text, [
    "wifi",
    "inverter",
    "oled",
    "qled",
    "120hz",
    "say kho",
    "tu dong",
    "chay em",
    "tiet kiem dien",
  ]);
  const advice = has(text, ["tu van", "nen mua", "nen chon", "phu hop", "loai nao"]);
  const roomConsultation = has(text, ["phong ngu", "phong khach", "van phong", "thong bep", "thong voi bep"]);

  if (matches(text, /^(xin chao|chao|hello|hi)(\s|$)/) || has(text, ["co ai tu van"]))
    return ["GREETING", 1];
  if (has(text, ["gap nhan vien", "tu van vien", "deal gia truc tiep", "nguoi that"]))
    return ["HUMAN_HANDOFF", 1];
  if (has(text, ["du bao thoi tiet", "viet code", "ke mot cau chuyen", "bai tap", "chung khoan"]))
    return ["OUT_OF_SCOPE", 1];
  if (has(text, ["thi phan", "hai long", "toan quoc", "top may o viet nam", "ban chay nhat thi truong"]))
    return ["UNKNOWN_DATA", 1];
  if (has(text, ["moi mua ma", "moi mua khong bat", "rung manh khi vat", "bi dong nuoc", "khong bat duoc wi fi", "keu to bat thuong"]))
    return ["AFTER_SALES", 0.99];
  if (has(text, ["doi tra", "doi duoc", "hoan tien", "mo hop roi"]))
    return ["RETURN_EXCHANGE", 1];
  if (has(text, ["bao hanh dai hon"])) return ["FEATURE_COMPARE", 0.99];
  if (has(text, ["bao hanh", "warranty"])) return ["WARRANTY", 1];
  if (has(text, ["giao hang", "van chuyen", "nhan duoc hang", "ship"]))
    return ["SHIPPING", 1];
  if (has(text, ["lap dat", "vat tu", "cong lap"])) return ["INSTALLATION", 0.99];
  if (has(text, ["khuyen mai", "giam gia", "qua tang", "mien phi lap dat"]))
    return ["PRODUCT_PROMOTION", 0.98];
  if (has(text, ["bao gia", "xuat bao gia"])) return ["QUOTE_REQUEST", 1];
  if (has(text, ["so luong lon", "gia du an", "chiet khau", "trang bi may giat cho khu can ho"]) ||
      (matches(text, /(?:mua|can|trang bi)\s*(?:khoang\s*)?\d+/) &&
        has(text, ["van phong", "khach san", "can ho", "du an"])))
    return ["COMMERCIAL_B2B", 0.99];
  if (has(text, ["dung duoc cho model", "tuong thich", "lap chung", "ket noi duoc voi"]))
    return ["COMPATIBILITY", 0.98];
  if (matches(text, /^(khong|y toi la|doi lai|sua lai)/)) return ["CORRECTION", 0.98];
  if (context.pendingSkill === "AIR_CONDITIONER_SIZING" && (area || roomConsultation || has(text, ["huong tay", "ap mai", "nhieu kinh"])))
    return ["AIR_CONDITIONER_SIZING", 1];
  if (has(text, ["con thu hai", "mau vua noi", "con vua noi", "no co "]))
    return ["FOLLOW_UP_CONTEXT", 0.9];

  if (has(text, ["ban chay", "best seller", "khach mua nhieu"]))
    return ["BEST_SELLER", 1];
  if (has(text, ["dang hot", "quan tam nhieu", "nhieu nguoi xem", "khach hoi nhieu", "noi bat tuan"]))
    return ["POPULAR_TRENDING", 0.99];
  if (has(text, ["re nhat", "gia thap nhat"])) return ["PRICE_RANKING", 1];
  if (has(text, ["tiet kiem dien nhat", "chay em nhat", "bao hanh dai nhat"]))
    return ["FEATURE_RANKING", 1];
  if (has(text, ["tot nhat"])) return ["BEST_BY_CRITERIA", 0.96];
  if (has(text, ["tien dien", "ton khoang bao nhieu dien", "tieu thu bao nhieu kwh", "8 tieng moi ngay", "cspf 5.5", "mot lan ton khoang bao nhieu dien"]))
    return ["ENERGY_ESTIMATE", 0.99];
  if (has(text, ["chenh nhau bao nhieu", "con nao re hon", "mau nao re nhat"]) &&
      has(text, ["hai", "ba", "nay", "vua neu"]))
    return ["PRICE_COMPARE", 0.98];
  if (has(text, ["con nao tiet kiem dien hon", "chay em hon", "bao hanh dai hon", "mau nao co 120hz", "con nao co lam da"]))
    return ["FEATURE_COMPARE", 0.98];
  if (has(text, ["so sanh", "khac nhau", "hay "]) &&
      (models.length >= 2 || has(text, ["hai con", "hai mau", "hai tu lanh", "hai tivi", "hai may"])))
    return ["PRODUCT_COMPARE", 0.98];

  if (ac && area && has(text, ["huong tay", "nang tay", "ap mai", "tang thuong", "nhieu kinh"]))
    return ["AIR_CONDITIONER_HEAT_LOAD", 1];
  if (ac && area && has(text, ["bao nhieu btu", "cong suat", "dung dieu hoa", "nen dung", "mau nao"]))
    return ["AIR_CONDITIONER_SIZING", 1];
  if (ac && area) return ["AIR_CONDITIONER_SIZING", 0.99];
  if (roomConsultation && (area || has(text, ["thong bep", "thong voi bep", "lien bep", "lien thong bep"])))
    return ["AIR_CONDITIONER_SIZING", 0.99];
  if (category === "washing-machine" && has(text, ["bao nhieu kg", "kg du khong"]) && has(text, ["nguoi", "gia dinh", "nha "]))
    return ["WASHING_MACHINE_SIZING", 1];
  if (category === "refrigerator" && has(text, ["bao nhieu lit", "dung tich", "lit du khong", "phu hop may nguoi"]))
    return ["REFRIGERATOR_SIZING", 1];
  if (has(text, ["can tu bao nhieu lit"]) && has(text, ["nguoi", "gia dinh", "nha "]))
    return ["REFRIGERATOR_SIZING", 1];
  if (category === "television" && has(text, ["bao nhieu inch", "kich thuoc tivi"]) && has(text, ["cach", "khoang cach", "phong"]))
    return ["TV_SIZING", 1];
  if (category === "water-heater" && has(text, ["bao nhieu lit", "lit du khong", "binh 20 hay 30"]))
    return ["WATER_HEATER_SIZING", 1];
  if (category === "air-purifier" && area && has(text, ["cong suat", "cadr", "phu hop"]))
    return ["AIR_PURIFIER_SIZING", 1];
  if (has(text, ["la gi", "khac inverter", "cspf", "cong nghe"]) && feature)
    return ["PRODUCT_TECH_EXPLAIN", 0.97];
  if (has(text, ["nen de bao nhieu do", "che do nao", "su dung the nao", "dung sao", "ve sinh bao lau"]))
    return ["PRODUCT_USAGE_GUIDANCE", 0.97];
  if (has(text, ["mau den", "mau trang", "co ban ", "phien ban", "size "]) && has(text, ["mau nay", "ban ", "phien ban"]))
    return ["VARIANT_AVAILABILITY", 0.96];
  if (has(text, ["khong can", "khong lay", "khong muon", "loai tru"]))
    return ["NEGATIVE_REQUIREMENT", 0.99];

  if (category === "dishwasher" && advice) return ["DISHWASHER_ADVICE", 0.97];
  if (category === "dryer" && (advice || has(text, ["bom nhiet", "it nhan", "dat chong", "tiet kiem dien"])))
    return ["DRYER_ADVICE", 0.97];
  if (category === "vacuum") return ["VACUUM_ADVICE", 0.97];
  if (category === "air-purifier" && (advice || has(text, ["tre nho", "thu cung", "pm2.5", "di ung", "chay em"])))
    return ["AIR_PURIFIER_ADVICE", 0.97];
  if (category === "water-heater" && (advice || has(text, ["truc tiep hay gian tiep", "ap luc nuoc", "chong giat", "nha tam nho"])))
    return ["WATER_HEATER_ADVICE", 0.97];
  if (has(text, ["ap luc nuoc", "nha tam nho"]) && has(text, ["binh", "loai nao"]))
    return ["WATER_HEATER_ADVICE", 0.97];
  if (category === "washing-machine" && advice) return ["WASHING_MACHINE_ADVICE", 0.97];
  if (category === "refrigerator" && advice) return ["REFRIGERATOR_ADVICE", 0.97];
  if (category === "television" && (advice || has(text, ["oled hay qled", "mini led", "120hz co can"])))
    return ["TV_ADVICE", 0.97];
  if (category === "kitchen" && advice) return ["COOKING_APPLIANCE_ADVICE", 0.96];
  if (ac && advice && has(text, ["phong ngu", "chay em", "loai nao"]))
    return ["AIR_CONDITIONER_USAGE_ADVICE", 0.96];

  if (
    category &&
    has(text, [
      "nhung loai",
      "nhung dong",
      "side by side",
      "shop co tivi oled",
      "co may say quan ao",
    ])
  )
    return ["CATEGORY_DISCOVERY", 0.97];
  if (
    priceConstraint &&
    has(text, ["con hang"]) &&
    category &&
    (extractEntities(message).brand || feature)
  )
    return ["MULTI_CONSTRAINT_SEARCH", 0.99];

  if (models.length && has(text, ["co khong", "tim giup", "co model"]))
    return ["PRODUCT_SEARCH_EXACT", 0.99];
  if (models.length && has(text, ["gia bao nhieu", "bao nhieu tien", "gia con", "gia cua"]))
    return ["PRODUCT_PRICE", 1];
  if (has(text, ["gia bao nhieu", "bao nhieu tien", "gia con", "gia cua"]))
    return ["PRODUCT_PRICE", 0.97];
  if (has(text, ["con hang", "ton kho", "het hang", "con may cai"]))
    return !context.lastProductId && !models.length && !category
      ? ["FOLLOW_UP_CONTEXT", 0.92]
      : ["PRODUCT_STOCK", 0.99];

  const constraintCount = [
    category,
    extractEntities(message).brand,
    priceConstraint,
    feature,
    /\b(?:9000|12000|18000|24000)\b/.test(text),
    has(text, ["con hang"]),
  ].filter(Boolean).length;
  if (constraintCount >= 3 && (priceConstraint || has(text, ["con hang"])))
    return ["MULTI_CONSTRAINT_SEARCH", 0.97];
  if (priceConstraint && category) return ["BUDGET_SEARCH", 0.95];
  if (
    category &&
    extractEntities(message).brand &&
    !priceConstraint &&
    !has(text, ["con hang"]) &&
    (has(text, ["tim", "inverter", "qled", "oled", "inch", "lit", "12k"]))
  )
    return ["PRODUCT_SEARCH_FUZZY", 0.96];
  if (feature && has(text, ["tim", "co ", "can "])) return ["FEATURE_SEARCH", 0.93];
  if (models.length && has(text, ["tim", "12k", "inverter"]))
    return ["PRODUCT_SEARCH_FUZZY", 0.92];
  if (extractEntities(message).brand && category && has(text, ["cho xem", "co mau nao", "dang co"]))
    return ["BRAND_SEARCH", 0.96];
  if (has(text, ["hang nao", "thuong hieu nao"])) return ["BRAND_ADVICE", 0.94];
  if (category && has(text, ["nhung loai", "nhung dong", "co tivi oled", "co may say"]))
    return ["CATEGORY_DISCOVERY", 0.94];
  if (models.length === 0 && matches(text, /\b(?:lg|sony|tivi|dieu hoa)\s*\d{1,2}\b/))
    return ["AMBIGUOUS_MODEL", 0.93];
  if (category && advice && text.split(" ").length <= 5)
    return ["INCOMPLETE_REQUEST", 0.91];
  if (category && advice) return ["PRODUCT_ADVICE", 0.9];
  if (category || extractEntities(message).brand) return ["PRODUCT_SEARCH_FUZZY", 0.72];
  return ["INCOMPLETE_REQUEST", 0.45];
}

export function classifyIntent(
  message: string,
  context: ChatContext = {},
): IntentResult {
  const [intent, confidence] = deterministicIntent(message, context);
  return {
    intent,
    confidence,
    entities: extractEntities(message, context) as Record<string, unknown>,
    skill: intentSkill[intent],
  };
}

export function resolveIntent(message: string, context: ChatContext = {}) {
  return classifyIntent(message, context).intent;
}

export async function classifyIntentHybrid(
  message: string,
  context: ChatContext = {},
): Promise<IntentResult> {
  const deterministic = classifyIntent(message, context);
  if (deterministic.confidence >= 0.7) return deterministic;
  try {
    const classified = await classifyCommerceIntent(message, context);
    return {
      ...classified,
      entities: { ...deterministic.entities, ...classified.entities },
    };
  } catch {
    return deterministic;
  }
}
