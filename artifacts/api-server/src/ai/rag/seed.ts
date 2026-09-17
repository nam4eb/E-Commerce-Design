import type { ShopDB } from "../../lib/shop-shared";
import { indexKnowledgeDocuments } from "./rag.service";
import type { KnowledgeDocumentInput } from "./types";

export const coreKnowledge: KnowledgeDocumentInput[] = [
  {
    id: "policy-return-v1", title: "Chính sách đổi trả Điện Máy 365", type: "POLICY",
    sourceType: "internal_policy", sourceName: "Điện Máy 365", version: 1,
    metadata: { official: true, language: "vi", source: "store_policy" },
    content: "# Điều kiện đổi trả\nKhách hàng cần liên hệ bộ phận hỗ trợ để xác minh tình trạng sản phẩm, thời điểm mua và điều kiện áp dụng. Chính sách cụ thể phụ thuộc nhóm sản phẩm, lỗi kỹ thuật và tình trạng hàng. Cửa hàng chỉ xác nhận đổi hoặc hoàn tiền sau khi kiểm tra đơn hàng và sản phẩm; chatbot không tự cam kết đổi trả.",
  },
  {
    id: "policy-shipping-v1", title: "Chính sách vận chuyển và lắp đặt", type: "POLICY",
    sourceType: "internal_policy", sourceName: "Điện Máy 365", version: 1,
    metadata: { official: true, language: "vi", source: "store_policy" },
    content: "# Vận chuyển\nThời gian và phí giao hàng được xác nhận theo địa chỉ, sản phẩm và lịch giao tại thời điểm đặt hàng.\n# Lắp đặt\nPhí vật tư phát sinh và hạng mục lắp đặt được kỹ thuật viên khảo sát, báo rõ trước khi thực hiện. Khách hàng cần giữ lối vận chuyển và vị trí lắp đặt an toàn.",
  },
  {
    id: "tech-inverter-v1", title: "Giải thích công nghệ Inverter", type: "TECHNICAL_DOCUMENT",
    sourceType: "internal_technical", sourceName: "Điện Máy 365", categoryId: "air-conditioner", version: 1,
    metadata: { official: true, language: "vi", source: "technical_guide" },
    content: "# Inverter là gì?\nCông nghệ Inverter điều chỉnh tốc độ máy nén thay vì chỉ bật và tắt hoàn toàn. Sau khi đạt nhiệt độ đặt, máy giảm công suất để duy trì nhiệt độ ổn định. Hiệu quả tiết kiệm điện thực tế phụ thuộc tải nhiệt phòng, nhiệt độ cài đặt, thời gian sử dụng và cách lắp đặt.",
  },
  {
    id: "daikin-ftkb35-warranty-v2", title: "Bảo hành Daikin FTKB35", type: "WARRANTY",
    sourceType: "official_manual", sourceName: "Tài liệu hãng Daikin", brandId: "daikin",
    categoryId: "air-conditioner", productId: "ac-ftkb35", model: "FTKB35", version: 2,
    metadata: { official: true, language: "vi", source: "official_manual", model: "FTKB35" },
    content: "# Phạm vi bảo hành\nModel FTKB35 áp dụng điều kiện bảo hành theo phiếu hoặc chính sách hãng tại thời điểm mua. Tài liệu hiện được cửa hàng xác minh ghi nhận máy nén được bảo hành 5 năm; các bộ phận khác được bảo hành 1 năm. Khách hàng cần cung cấp số máy và hóa đơn để kiểm tra điều kiện thực tế.",
  },
];

export async function seedKnowledge(db: ShopDB) {
  const imported: KnowledgeDocumentInput[] = [...coreKnowledge];
  const contentRows = await db.query("SELECT kind,id,data FROM shop_content ORDER BY kind,id");
  for (const row of contentRows) {
    let data: Record<string, unknown> = {};
    try { data = JSON.parse(String(row.data)); } catch { continue; }
    const body = String(data.body || data.content || data.description || "").trim();
    if (!body) continue;
    imported.push({
      id: `content-${row.kind}-${row.id}`, title: String(data.title || row.id),
      type: String(row.kind).toLowerCase().includes("faq") ? "FAQ" : "POLICY",
      sourceType: "existing_content", sourceName: "shop_content", content: body,
      metadata: { official: true, language: "vi", source: "shop_content" },
    });
  }
  return indexKnowledgeDocuments(db, imported);
}
