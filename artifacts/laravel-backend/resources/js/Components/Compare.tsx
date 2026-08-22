import { Link } from '@inertiajs/react';
import { BarChart3, X } from 'lucide-react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

export type CompareProduct = {
    id: number;
    name: string;
    sku: string;
    price: string;
    original_price?: string | null;
    sale_price?: string | null;
    brand: { name: string };
    category: { name: string };
    image?: { url: string; alt_text?: string | null } | null;
    url: string;
    btu?: number | null;
    room_size?: string | null;
    inverter?: boolean | null;
};

type CompareContextValue = {
    products: CompareProduct[];
    hydrated: boolean;
    toggle: (product: CompareProduct) => void;
    remove: (id: number) => void;
    clear: () => void;
    contains: (id: number) => boolean;
};

const STORAGE_KEY = 'dienmay365.compare.v1';
const CompareContext = createContext<CompareContextValue | null>(null);

export function CompareProvider({ children }: PropsWithChildren) {
    const [products, setProducts] = useState<CompareProduct[]>([]);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        try {
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
            if (Array.isArray(stored)) setProducts(stored.slice(0, 4));
        } catch {
            localStorage.removeItem(STORAGE_KEY);
        } finally {
            setHydrated(true);
        }
    }, []);

    useEffect(() => {
        if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    }, [hydrated, products]);

    const value = useMemo<CompareContextValue>(() => ({
        products,
        hydrated,
        toggle: product => setProducts(current => current.some(item => item.id === product.id)
            ? current.filter(item => item.id !== product.id)
            : current.length < 4 ? [...current, product] : current),
        remove: id => setProducts(current => current.filter(item => item.id !== id)),
        clear: () => setProducts([]),
        contains: id => products.some(item => item.id === id),
    }), [hydrated, products]);

    return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare() {
    const context = useContext(CompareContext);
    if (!context) throw new Error('useCompare must be used inside CompareProvider');
    return context;
}

export function CompareButton({ product, className, compact = false }: { product: CompareProduct; className?: string; compact?: boolean }) {
    const compare = useCompare();
    const active = compare.contains(product.id);
    const full = !active && compare.products.length >= 4;
    return <button type="button" disabled={full} aria-pressed={active} aria-label={active ? `Bỏ so sánh ${product.name}` : `So sánh ${product.name}`} title={full ? 'Chỉ có thể so sánh tối đa 4 sản phẩm' : undefined} onClick={() => compare.toggle(product)} className={className}>
        <BarChart3 size={14}/>{!compact && (active ? 'Đã chọn so sánh' : full ? 'Đã đủ 4 sản phẩm' : 'Thêm vào so sánh')}
    </button>;
}

export function CompareTray() {
    const compare = useCompare();
    if (!compare.hydrated || compare.products.length === 0) return null;
    return <aside aria-label="Danh sách so sánh" className="fixed inset-x-0 bottom-0 z-50 border-t border-[#b9cde1] bg-white shadow-[0_-8px_30px_rgba(16,44,75,.15)]">
        <div className="container-store flex items-center gap-3 py-3"><div className="hidden shrink-0 sm:block"><b className="text-sm text-[#173b68]">So sánh sản phẩm</b><p className="text-xs text-[#71869d]">{compare.products.length}/4 sản phẩm</p></div><div className="flex min-w-0 flex-1 gap-2 overflow-x-auto">{compare.products.map(product => <div key={product.id} className="flex min-w-40 max-w-56 items-center gap-2 border border-[#dce5ef] p-2 text-xs"><span className="line-clamp-2 flex-1 font-semibold text-[#315575]">{product.name}</span><button type="button" aria-label={`Bỏ ${product.name}`} onClick={() => compare.remove(product.id)}><X size={14}/></button></div>)}</div><button type="button" onClick={compare.clear} className="hidden text-xs text-[#71869d] md:block">Xóa hết</button><Link href="/so-sanh" className="shrink-0 bg-[#0b4fa4] px-4 py-2 text-xs font-bold text-white">So sánh</Link></div>
    </aside>;
}
