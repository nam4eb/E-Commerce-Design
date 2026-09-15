import { useEffect, useRef, useState } from "react";
import {
  Bot,
  History,
  LoaderCircle,
  MessageCircle,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import type { StoreContext } from "../App";
import { api, readStored, saveStored } from "../lib/shop-api";
import { useShopConfig } from "./store-extras";

type Message = { role: "user" | "assistant"; content: string };
type Chat = { id: string; title: string; updated_at: string };
const newId = () => crypto.randomUUID();

export function AiChat({ ctx }: { ctx: StoreContext }) {
  const config = useShopConfig();
  const [open, setOpen] = useState(false);
  const [chatId, setChatId] = useState<string>(() =>
    readStored("shop-ai-chat-id", newId()),
  );
  const [messages, setMessages] = useState<Message[]>(() =>
    readStored("shop-ai-messages", []),
  );
  const [chats, setChats] = useState<Chat[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement | null>(null);
  useEffect(
    () => bottom.current?.scrollIntoView({ behavior: "smooth" }),
    [messages, open],
  );
  useEffect(() => {
    if (ctx.user && open)
      api<Chat[]>("/ai/chats")
        .then(setChats)
        .catch(() => setChats([]));
  }, [ctx.user, open]);
  useEffect(() => {
    if (!ctx.user) {
      saveStored("shop-ai-chat-id", chatId);
      saveStored("shop-ai-messages", messages.slice(-12));
    }
  }, [chatId, messages, ctx.user]);
  if (!config?.ai.enabled) return null;

  const reset = () => {
    controller.current?.abort();
    setChatId(newId());
    setMessages([]);
    setInput("");
    setError("");
    setShowHistory(false);
  };
  const load = async (id: string) => {
    try {
      const result = await api<{ messages: Message[] }>(`/ai/chats/${id}`);
      setChatId(id);
      setMessages(result.messages);
      setShowHistory(false);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const history = messages.slice(-10);
    setInput("");
    setError("");
    setBusy(true);
    setMessages([
      ...messages,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ]);
    const abort = new AbortController();
    controller.current = abort;
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        credentials: "same-origin",
        signal: abort.signal,
        headers: { "Content-Type": "application/json", "X-Store-Request": "1" },
        body: JSON.stringify({ chatId, message: text, history }),
      });
      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || "Chatbot chưa thể trả lời.");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((items) =>
          items.map((item, i) =>
            i === items.length - 1
              ? { ...item, content: item.content + chunk }
              : item,
          ),
        );
      }
      if (ctx.user)
        api<Chat[]>("/ai/chats")
          .then(setChats)
          .catch(() => {});
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError((e as Error).message);
        setMessages((items) =>
          items.filter(
            (item, i) =>
              !(
                i === items.length - 1 &&
                item.role === "assistant" &&
                !item.content
              ),
          ),
        );
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
                Tư vấn từ catalog và chính sách cửa hàng
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
                      setChats(chats.filter((c) => c.id !== chat.id));
                      if (chat.id === chatId) reset();
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
                    Xin chào! Tôi có thể giúp bạn:
                  </b>
                  <div className="mt-2 grid gap-2">
                    {[
                      "Tìm điều hòa theo ngân sách",
                      "So sánh sản phẩm trong catalog",
                      "Giải thích chính sách giao hàng",
                    ].map((q) => (
                      <button
                        key={q}
                        className="rounded-lg border px-3 py-2 text-left hover:bg-blue-50"
                        onClick={() => setInput(q)}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((message, i) => (
                <div
                  key={i}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "bg-[#0b4fa4] text-white" : "border bg-white text-slate-700"}`}
                  >
                    {message.content || (
                      <LoaderCircle className="animate-spin" size={17} />
                    )}
                  </div>
                </div>
              ))}
              {error && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
                >
                  {error}
                </p>
              )}
              <div ref={bottom} />
            </div>
          )}
          <form
            className="border-t bg-white p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <div className="flex items-end gap-2">
              <textarea
                aria-label="Tin nhắn cho trợ lý AI"
                rows={2}
                maxLength={2000}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="Hỏi về sản phẩm hoặc chính sách..."
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
              AI có thể nhầm. Kiểm tra thông tin quan trọng trước khi mua; không
              gửi OTP, mật khẩu hoặc số thẻ.
            </p>
          </form>
        </section>
      )}
      <button
        aria-label={open ? "Đóng trợ lý AI" : "Mở trợ lý AI"}
        onClick={() => setOpen(!open)}
        className="ml-auto grid h-14 w-14 place-items-center rounded-full bg-[#0b4fa4] text-white shadow-xl transition hover:scale-105"
      >
        {open ? <X /> : <MessageCircle />}
      </button>
    </div>
  );
}
