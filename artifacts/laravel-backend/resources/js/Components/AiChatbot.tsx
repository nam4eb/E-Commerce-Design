import axios from 'axios';
import { Bot, LoaderCircle, MessageCircle, Send, X } from 'lucide-react';
import { FormEvent, useState } from 'react';

type Message = { role: 'user' | 'assistant'; content: string };
type Source = { title: string; url: string; type: 'product' | 'article' };

const greeting: Message = {
    role: 'assistant',
    content: 'Xin chào! Mình có thể giúp bạn tìm sản phẩm, so sánh thông số và tham khảo bài tư vấn từ dữ liệu Điện Máy 365.',
};

export default function AiChatbot() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([greeting]);
    const [sources, setSources] = useState<Source[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    async function submit(event: FormEvent) {
        event.preventDefault();
        const question = input.trim();
        if (question.length < 2 || loading) return;

        const next = [...messages, { role: 'user' as const, content: question }];
        setMessages(next);
        setInput('');
        setLoading(true);
        setSources([]);

        try {
            const response = await axios.post('/api/v1/chat', {
                message: question,
                page_url: window.location.pathname,
                history: messages.slice(-8),
            });
            setMessages([...next, { role: 'assistant', content: response.data.message }]);
            setSources(response.data.sources ?? []);
        } catch (error: any) {
            setMessages([...next, {
                role: 'assistant',
                content: error.response?.data?.message ?? 'Trợ lý đang tạm thời gián đoạn. Vui lòng thử lại sau.',
            }]);
        } finally {
            setLoading(false);
        }
    }

    return <div className="fixed bottom-5 right-4 z-50 sm:bottom-6 sm:right-6">
        {open && <section aria-label="Trợ lý mua sắm AI" className="mb-3 flex h-[min(620px,72vh)] w-[calc(100vw-2rem)] max-w-[390px] flex-col overflow-hidden border border-[#cdd9e6] bg-white shadow-2xl">
            <header className="flex items-center justify-between bg-[#073b86] px-4 py-3 text-white">
                <div className="flex items-center gap-2"><Bot size={20}/><div><b className="block text-sm">Trợ lý Điện Máy 365</b><span className="text-[11px] text-blue-100">Tư vấn theo dữ liệu cửa hàng</span></div></div>
                <button onClick={() => setOpen(false)} aria-label="Đóng trợ lý"><X size={20}/></button>
            </header>
            <div aria-live="polite" className="flex-1 space-y-3 overflow-y-auto bg-[#f5f8fc] p-3">
                {messages.map((message, index) => <div key={index} className={`max-w-[88%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-6 ${message.role === 'user' ? 'ml-auto bg-[#0b4fa4] text-white' : 'border border-[#dce5ef] bg-white text-[#25496d]'}`}>{message.content}</div>)}
                {loading && <div className="flex items-center gap-2 text-xs text-[#607b98]"><LoaderCircle className="animate-spin" size={15}/> Đang tìm trong dữ liệu cửa hàng...</div>}
                {sources.length > 0 && <div className="border-t border-[#dce5ef] pt-2 text-xs"><b className="text-[#315575]">Thông tin tham khảo</b><div className="mt-1 space-y-1">{sources.map(source => <a key={source.url} href={source.url} className="block text-[#0b4fa4] hover:underline">{source.title}</a>)}</div></div>}
            </div>
            <form onSubmit={submit} className="flex gap-2 border-t border-[#dce5ef] bg-white p-3">
                <label className="sr-only" htmlFor="ai-chat-message">Câu hỏi</label>
                <input id="ai-chat-message" value={input} onChange={event => setInput(event.target.value)} maxLength={1000} placeholder="VD: Phòng 15m² dùng điều hòa nào?" className="min-w-0 flex-1 border border-[#cdd9e6] px-3 py-2 text-sm outline-none focus:border-[#0b4fa4]"/>
                <button disabled={loading || input.trim().length < 2} aria-label="Gửi câu hỏi" className="grid w-10 place-items-center bg-[#f6b91a] text-[#073b86] disabled:opacity-50"><Send size={18}/></button>
            </form>
            <p className="bg-white px-3 pb-2 text-[10px] text-[#7b8fa7]">AI có thể nhầm. Giá và tồn kho cần được xác nhận tại trang sản phẩm.</p>
        </section>}
        <button onClick={() => setOpen(value => !value)} aria-expanded={open} aria-label={open ? 'Đóng trợ lý AI' : 'Mở trợ lý AI'} className="ml-auto grid h-14 w-14 place-items-center rounded-full bg-[#f6b91a] text-[#073b86] shadow-xl transition hover:scale-105">{open ? <X/> : <MessageCircle/>}</button>
    </div>;
}
