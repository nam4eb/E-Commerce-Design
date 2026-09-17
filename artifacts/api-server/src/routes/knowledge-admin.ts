import type { Router } from "express";
import { createRAGServices } from "../ai/rag/rag.service";
import { knowledgeTypes, type KnowledgeDocumentInput, type KnowledgeMetadata } from "../ai/rag/types";
import { check, HttpError, type Guards, type ShopDB } from "../lib/shop-shared";

const safeText = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const forbidden = /(api[_ -]?key|secret|password|private[_ -]?key|bearer\s+[a-z0-9._-]{12,})\s*[:=]/i;

function parseDocument(body: Record<string, unknown>, existing?: KnowledgeDocumentInput): KnowledgeDocumentInput {
  const content = safeText(body.content ?? existing?.content, 200_000);
  const title = safeText(body.title ?? existing?.title, 300);
  const type = safeText(body.type ?? existing?.type, 50);
  check(title && content, "Tiêu đề và nội dung knowledge là bắt buộc");
  check(knowledgeTypes.includes(type as (typeof knowledgeTypes)[number]), "Loại knowledge không hợp lệ");
  check(!forbidden.test(content), "Nội dung có dấu hiệu chứa secret và không thể index");
  return {
    ...existing,
    id: safeText(body.id ?? existing?.id, 120) || undefined,
    title, content, type: type as KnowledgeDocumentInput["type"],
    sourceType: safeText(body.sourceType ?? existing?.sourceType, 100) || "admin",
    sourceName: safeText(body.sourceName ?? existing?.sourceName, 200) || "Admin",
    brandId: safeText(body.brandId ?? existing?.brandId, 100) || undefined,
    categoryId: safeText(body.categoryId ?? existing?.categoryId, 100) || undefined,
    productId: safeText(body.productId ?? existing?.productId, 100) || undefined,
    model: safeText(body.model ?? existing?.model, 100) || undefined,
    status: ["active", "disabled", "obsolete"].includes(String(body.status ?? existing?.status))
      ? String(body.status ?? existing?.status) as KnowledgeDocumentInput["status"] : "active",
    version: Number(body.version ?? existing?.version) || undefined,
    metadata: body.metadata && typeof body.metadata === "object" ? body.metadata as KnowledgeMetadata : existing?.metadata,
  };
}

export function registerKnowledgeAdmin(router: Router, db: ShopDB, { auth, admin }: Guards) {
  router.get("/admin/ai/knowledge", auth, admin, async (_req, res) => {
    res.json(await createRAGServices(db).store.listDocuments());
  });
  router.post("/admin/ai/knowledge", auth, admin, async (req, res) => {
    const document = parseDocument(req.body as Record<string, unknown>);
    const result = await createRAGServices(db).indexer.indexDocument(document);
    res.status(201).json(result);
  });
  router.put("/admin/ai/knowledge/:id", auth, admin, async (req, res) => {
    const services = createRAGServices(db);
    const id = String(req.params.id);
    const existing = await services.store.getDocument(id);
    if (!existing) throw new HttpError(404, "Không tìm thấy knowledge document");
    const result = await services.indexer.indexDocument(parseDocument({ ...req.body, id }, existing));
    res.json(result);
  });
  router.post("/admin/ai/knowledge/:id/reindex", auth, admin, async (req, res) => {
    const services = createRAGServices(db);
    const existing = await services.store.getDocument(String(req.params.id));
    if (!existing) throw new HttpError(404, "Không tìm thấy knowledge document");
    const result = await services.indexer.indexDocument({ ...existing, version: existing.version + 1 });
    res.json(result);
  });
  router.patch("/admin/ai/knowledge/:id/status", auth, admin, async (req, res) => {
    const services = createRAGServices(db);
    const existing = await services.store.getDocument(String(req.params.id));
    if (!existing) throw new HttpError(404, "Không tìm thấy knowledge document");
    const status = String(req.body.status || "");
    check(["active", "disabled", "obsolete"].includes(status), "Trạng thái không hợp lệ");
    res.json(await services.indexer.indexDocument({ ...existing, status: status as KnowledgeDocumentInput["status"], version: existing.version + 1 }));
  });
  router.delete("/admin/ai/knowledge/:id", auth, admin, async (req, res) => {
    const services = createRAGServices(db);
    const id = String(req.params.id);
    if (!(await services.store.getDocument(id))) throw new HttpError(404, "Không tìm thấy knowledge document");
    await services.store.deleteDocument(id);
    res.json({ ok: true });
  });
}
