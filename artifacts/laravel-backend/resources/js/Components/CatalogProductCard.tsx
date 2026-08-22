import { Link } from '@inertiajs/react';
import { AddToCartButton, WishlistButton } from './CommerceActions';
import { CompareButton } from './Compare';

export type CatalogProduct = { id: number; name: string; sku: string; price: string; original_price?: string | null; sale_price?: string | null; brand: { name: string }; category: { name: string }; image?: { url: string; alt_text?: string | null } | null; url: string; btu?: number | null; room_size?: string | null; inverter?: boolean | null };
const money = (value: string | number) => Number(value).toLocaleString('vi-VN') + '₫';
const imageAt = (url: string, width: number) => url.replace(/([?&])w=\d+/, `$1w=${width}`);

export default function CatalogProductCard({ product }: { product: CatalogProduct }) {
    const price = product.sale_price ?? product.price;
    return <article className="group relative border border-[#dce5ef] bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-lg sm:p-4"><WishlistButton productId={product.id} compact className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center bg-white/90 text-[#6f8499]"/>
        <Link href={product.url} className="block"><div className="aspect-square overflow-hidden bg-[#f4f8fc]">{product.image && <img src={imageAt(product.image.url, 480)} srcSet={`${imageAt(product.image.url, 320)} 320w, ${imageAt(product.image.url, 640)} 640w`} sizes="(max-width: 640px) 45vw, 240px" loading="lazy" width="480" height="480" alt={product.image.alt_text || product.name} className="h-full w-full object-cover mix-blend-multiply transition group-hover:scale-[1.03]"/>}</div>
            <div className="mt-3 text-[10px] font-bold uppercase tracking-[.15em] text-[#8294a9]">{product.brand.name} · {product.category.name}</div><h2 className="mt-1 line-clamp-2 min-h-10 text-sm font-bold leading-5 text-[#214665]">{product.name}</h2><div className="mt-3 font-extrabold text-[#d44b2e]">{money(price)}</div>{product.original_price && <div className="mt-1 text-xs text-[#94a2b0] line-through">{money(product.original_price)}</div>}
        </Link><div className="mt-3 flex gap-2"><AddToCartButton productId={product.id} className="flex flex-1 items-center justify-center gap-1 border border-[#0b4fa4] py-2 text-xs font-bold text-[#0b4fa4]">Thêm giỏ</AddToCartButton><CompareButton product={product} compact className="grid w-9 place-items-center border border-[#d5e1ec] text-[#5e7792] disabled:opacity-40"/></div>
    </article>;
}
