import { useEffect, useRef, useState } from "react";
import {
  Bot,
  History,
  LoaderCircle,
  MessageCircle,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  X,
} from "lucide-react";
import type { StoreContext } from "../App";
import { api } from "../lib/shop-api";
import { useShopConfig } from "./store-extras";

type Intent = string;
type Context = {
  lastProductId?: string;
  lastCategoryId?: string;
  lastIntent?: Intent;
  constraints?: Record<string, unknown>;
  pendingSkill?: string;
  requirements?: Record<string, unknown>;
  missingFields?: string[];
  candidateProductIds?: string[];
};
type Product = {
  productId: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  originalPrice?: number;
  stock: number;
  brand: string;
};
type Message = {
  role: "user" | "assistant";
  content: string;
  products?: Product[];
};
type Chat = { id: string; title: string; updated_at: string };
type ChatResponse = {
  message: string;
  intent: Intent;
  responseType: string;
  context: Context;
  products?: Product[];
  conversationId: string;
};
const newId = () => crypto.randomUUID();
const money = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    value,
  );
const track = (name: string, detail?: Record<string, unknown>) =>
  window.dispatchEvent(
    new CustomEvent("shop:analytics", { detail: { name, ...detail } }),
  );

export function AiChat({ ctx }: { ctx: StoreContext }) {
  const config = useShopConfig();
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string>(newId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [context, setContext] = useState<Context>({});
  const [chats, setChats] = useState<Chat[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retryText, setRetryText] = useState("");
  const previousUser = useRef(ctx.user?.id);
  const controller = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);
  useEffect(() => {
    if (ctx.user && open)
      api<Chat[]>("/ai/chats")
        .then(setChats)
        .catch(() => setChats([]));
  }, [ctx.user, open]);
  useEffect(() => {
    const loggedInNow = !previousUser.current && ctx.user?.id;
    previousUser.current = ctx.user?.id;
    if (loggedInNow && messages.length && config?.ai.syncEnabled) {
      api<{ id: string }>("/ai/conversations/sync", "POST", {
        conversationId,
        messages,
      })
        .then((result) => setConversationId(result.id))
        .catch((cause) => setError((cause as Error).message));
    }
  }, [ctx.user?.id, config?.ai.syncEnabled, conversationId, messages]);
  if (!config?.ai.enabled) return null;

  const reset = () => {
    controller.current?.abort();
    setConversationId(newId());
    setMessages([]);
    setContext({});
    setInput("");
    setError("");
    setRetryText("");
    setShowHistory(false);
  };
  const load = async (id: string) => {
    try {
      const result = await api<{ messages: Message[] }>(`/ai/chats/${id}`);
      setConversationId(id);
      setMessages(result.messages);
      setContext({});
      setShowHistory(false);
      setError("");
    } catch (cause) {
      setError((cause as Error).message);
    }
  };
  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || busy) return;
    setInput("");
    setError("");
    setRetryText("");
    setBusy(true);
    setMessages((items) => [...items, { role: "user", content: text }]);
    const abort = new AbortController();
    controller.current = abort;
    track("question_sent");
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        credentials: "same-origin",
        signal: abort.signal,
        headers: { "Content-Type": "application/json", "X-Store-Request": "1" },
        body: JSON.stringify({ conversationId, message: text, context }),
      });
      const body = (await response.json().catch(() => null)) as
        ChatResponse | { message?: string } | null;
      if (!response.ok || !body || !("intent" in body))
        throw new Error(body?.message || "Chatbot chưa thể trả lời.");
      setConversationId(body.conversationId);
      setContext(body.context);
      setMessages((items) => [
        ...items,
        { role: "assistant", content: body.message, products: body.products },
      ]);
      if (body.products?.length)
        track("product_recommended", { count: body.products.length });
      if (ctx.user)
        api<Chat[]>("/ai/chats")
          .then(setChats)
          .catch(() => {});
    } catch (cause) {
      if ((cause as Error).name !== "AbortError") {
        setError((cause as Error).message);
        setRetryText(text);
        track("chat_error");
      }
    } finally {
      setBusy(false);
      controller.current = null;
    }
  };

  return (
    <div className="fixed bottom-20 right-3 z-50 md:bottom-5 md:right-5">
      {open && (
        <section
          aria-label="Trợ lý AI"
          className="mb-3 flex h-[min(650px,75dvh)] w-[min(390px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        >
          <header className="flex items-center gap-3 bg-[#073b86] px-4 py-3 text-white">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15">
              <Bot size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <b className="block">Trợ lý Điện Máy 365</b>
              <span className="block truncate text-[11px] text-blue-100">
                Giá và tồn kho từ hệ thống hiện tại
              </span>
            </div>
            {ctx.user && (
              <button
                aria-label="Lịch sử trò chuyện"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History size={19} />
              </button>
            )}
            <button aria-label="Cuộc trò chuyện mới" onClick={reset}>
              <Plus size={20} />
            </button>
            <button aria-label="Đóng chatbot" onClick={() => setOpen(false)}>
              <X size={20} />
            </button>
          </header>
          {showHistory ? (
            <div className="flex-1 overflow-y-auto p-3">
              <h3 className="mb-3 font-bold text-[#173b62]">
                Lịch sử trò chuyện
              </h3>
              {!chats.length && (
                <p className="text-sm text-slate-500">
                  Chưa có cuộc trò chuyện đã lưu.
                </p>
              )}
              {chats.map((chat) => (
                <div key={chat.id} className="flex items-center border-b py-2">
                  <button
                    className="min-w-0 flex-1 truncate text-left text-sm"
                    onClick={() => load(chat.id)}
                  >
                    {chat.title}
                  </button>
                  <button
                    aria-label="Xóa cuộc trò chuyện"
                    className="p-2 text-red-600"
                    onClick={async () => {
                      await api(`/ai/chats/${chat.id}`, "DELETE");
                      setChats(chats.filter((item) => item.id !== chat.id));
                      if (chat.id === conversationId) reset();
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4"
              aria-live="polite"
            >
              {!messages.length && (
                <div className="rounded-xl border bg-white p-4 text-sm leading-6 text-slate-600">
                  <b className="text-[#173b62]">
                    Tôi có thể kiểm tra trực tiếp:
                  </b>
                  <div className="mt-2 grid gap-2">
                    {[
                      "ATKF35XVMV giá bao nhiêu?",
                      "ATKF35XVMV còn hàng không?",
                      "Phòng ngủ 20m² dùng điều hòa bao nhiêu BTU?",
                    ].map((question) => (
                      <button
                        key={question}
                        className="rounded-lg border px-3 py-2 text-left hover:bg-blue-50"
                        onClick={() => setInput(question)}
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "bg-[#0b4fa4] text-white" : "border bg-white text-slate-700"}`}
                  >
                    {message.content}
                    {message.products?.map((product) => (
                      <a
                        key={product.productId}
                        href={`/products/${product.slug}`}
                        onClick={() =>
                          track("product_clicked", {
                            productId: product.productId,
                          })
                        }
                        className="mt-3 block overflow-hidden rounded-xl border bg-white no-underline shadow-sm"
                      >
                        <div className="flex gap-3 p-2">
                          {product.image && (
                            <img
                              src={product.image}
                              alt=""
                              className="h-16 w-16 rounded-lg object-cover"
                            />
                          )}
                          <div className="min-w-0">
                            <b className="line-clamp-2 text-xs text-slate-800">
                              {product.name}
                            </b>
                            <span className="mt-1 block font-bold text-red-600">
                              {money(product.price)}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {product.stock > 0
                                ? `Còn ${product.stock}`
                                : "Tạm hết hàng"}
                            </span>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border bg-white px-4 py-3">
                    <LoaderCircle className="animate-spin" size={17} />
                  </div>
                </div>
              )}
              {error && (
                <div
                  role="alert"
                  className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
                >
                  {error}
                  {retryText && (
                    <button
                      className="mt-2 flex items-center gap-1 font-semibold"
                      onClick={() => void send(retryText)}
                    >
                      <RotateCcw size={14} /> Thử lại
                    </button>
                  )}
                </div>
              )}
              <div ref={bottom} />
            </div>
          )}
          <form
            className="border-t bg-white p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <div className="flex items-end gap-2">
              <textarea
                aria-label="Tin nhắn cho trợ lý AI"
                rows={2}
                maxLength={2000}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
                placeholder="Hỏi giá, tồn kho hoặc nhu cầu sử dụng..."
                className="min-h-11 flex-1 resize-none rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-blue-600"
              />
              <button
                aria-label="Gửi tin nhắn"
                disabled={busy || !input.trim()}
                className="grid h-11 w-11 place-items-center rounded-xl bg-[#0b4fa4] text-white disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
            <p className="mt-2 text-[10px] text-slate-500">
              AI có thể nhầm. Giá và tồn kho được kiểm tra từ hệ thống; không
              gửi OTP, mật khẩu hoặc số thẻ.
            </p>
          </form>
        </section>
      )}
      <button
        aria-label={open ? "Đóng trợ lý AI" : "Mở trợ lý AI"}
        onClick={() => {
          setOpen(!open);
          if (!open) track("chat_opened");
        }}
        className="ml-auto grid h-14 w-14 place-items-center rounded-full bg-[#0b4fa4] text-white shadow-xl transition hover:scale-105"
      >
        {open ? <X /> : <MessageCircle />}
      </button>
    </div>
  );
}
