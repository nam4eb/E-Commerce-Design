import { Link, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Filter, Search, Star, X } from 'lucide-react';
import { useState } from 'react';
import SeoHead from '../../Components/SeoHead';
import { AddToCartButton, WishlistButton } from '../../Components/CommerceActions';
import { CompareButton } from '../../Components/Compare';
import StoreLayout from '../../Layouts/StoreLayout';

type Brand = { id: number; name: string; slug: string; products_count: number };
type Product = {
    id: number; name: string; slug: string; sku: string; price: string; original_price?: string | null;
    sale_price?: string | null; stock: number; is_available: boolean; badge?: string | null; btu?: number | null;
    room_size?: string | null; inverter?: boolean | null; brand: { name: string; slug: string }; category: { name: string; slug: string };
    image?: { url: string; alt_text?: string | null } | null; url: string;
};
type PaginationLink = { url: string | null; label: string; active: boolean };
type Products = { data: Product[]; current_page: number; last_page: number; per_page: number; total: number; from: number | null; to: number | null; links: PaginationLink[] };
type Filters = { q?: string; brand?: string; btu?: number; inverter?: string; min_price?: number; max_price?: number; sort?: string; page?: number };

const money = (value: string | number) => Number(value).toLocaleString('vi-VN') + '₫';
const imageAt = (url: string, width: number) => url.replace(/([?&])w=\d+/, `$1w=${width}`);

export default function CategoryShow({ category, products, brands, filters, seo, breadcrumbs, jsonLd }: {
    category: { id: number; name: string; slug: string; description: string; url: string; isAirConditioner: boolean };
    products: Products; brands: Brand[]; filters: Filters; seo: any; breadcrumbs: { name: string; url: string }[]; jsonLd: any;
}) {
    const [mobileFilter, setMobileFilter] = useState(false);
    const [draft, setDraft] = useState({
        q: filters.q ?? '', brand: filters.brand ?? '', btu: filters.btu?.toString() ?? '',
        inverter: filters.inverter === '1', min_price: filters.min_price?.toString() ?? '',
        max_price: filters.max_price?.toString() ?? '', sort: typeof filters.sort === 'string' ? filters.sort : 'popular',
    });

    const visit = (overrides: Partial<typeof draft> = {}) => {
        const next = { ...draft, ...overrides };
        const query = Object.fromEntries(Object.entries({
            q: next.q.trim() || undefined, brand: next.brand || undefined,
            btu: next.btu || undefined, inverter: next.inverter ? '1' : undefined,
            min_price: next.min_price || undefined, max_price: next.max_price || undefined,
            sort: next.sort === 'popular' ? undefined : next.sort,
        }).filter(([, value]) => value !== undefined));
        router.get(category.url, query, { preserveState: true, preserveScroll: true, replace: true });
    };
    const clear = () => {
        const empty = { q: '', brand: '', btu: '', inverter: false, min_price: '', max_price: '', sort: 'popular' };
        setDraft(empty); router.get(category.url, {}, { preserveState: true, replace: true });
    };

    const FilterPane = () => <form action={category.url} method="get" className="space-y-6">
        <div><label htmlFor="category-search" className="text-sm font-bold text-[#214665]">Tìm trong danh mục</label><div className="mt-3 flex border border-[#dbe5ef] bg-white"><input id="category-search" name={draft.q ? 'q' : undefined} value={draft.q} onChange={e => setDraft({ ...draft, q: e.target.value })} placeholder="Tên sản phẩm..." className="min-w-0 flex-1 px-3 py-2 text-sm outline-none"/><button type="submit" aria-label="Tìm kiếm" className="px-3 text-[#0b4fa4]"><Search size={16}/></button></div></div>
        <fieldset><legend className="text-sm font-bold text-[#214665]">Thương hiệu</legend><div className="mt-3 space-y-2"><label className="flex cursor-pointer items-center justify-between text-sm text-[#5c7691]"><span className="flex items-center gap-2"><input type="radio" name={draft.brand ? 'brand' : undefined} value="" checked={!draft.brand} onChange={() => setDraft({ ...draft, brand: '' })} className="accent-[#0b4fa4]"/>Tất cả</span><span>{products.total}</span></label>{brands.map(brand => <label key={brand.id} className="flex cursor-pointer items-center justify-between text-sm text-[#5c7691]"><span className="flex items-center gap-2"><input type="radio" name={draft.brand ? 'brand' : undefined} value={brand.slug} checked={draft.brand === brand.slug} onChange={() => setDraft({ ...draft, brand: brand.slug })} className="accent-[#0b4fa4]"/>{brand.name}</span><span className="text-xs text-[#9aa8b8]">{brand.products_count}</span></label>)}</div></fieldset>
        {category.isAirConditioner && <div><label htmlFor="btu-filter" className="text-sm font-bold text-[#214665]">Công suất điều hòa</label><select id="btu-filter" name={draft.btu ? 'btu' : undefined} value={draft.btu} onChange={e => setDraft({ ...draft, btu: e.target.value })} className="mt-3 w-full border border-[#dbe5ef] bg-white px-3 py-2 text-sm outline-none"><option value="">Tất cả công suất</option><option value="9000">9.000 BTU</option><option value="12000">12.000 BTU</option><option value="18000">18.000 BTU</option><option value="24000">24.000 BTU</option></select><label className="mt-3 flex items-center gap-2 text-sm text-[#5c7691]"><input type="checkbox" name="inverter" value="1" checked={draft.inverter} onChange={e => setDraft({ ...draft, inverter: e.target.checked })} className="accent-[#0b4fa4]"/>Chỉ Inverter</label></div>}
        <div><span className="text-sm font-bold text-[#214665]">Khoảng giá</span><div className="mt-3 grid grid-cols-2 gap-2"><input name={draft.min_price ? 'min_price' : undefined} inputMode="numeric" aria-label="Giá tối thiểu" value={draft.min_price} onChange={e => setDraft({ ...draft, min_price: e.target.value.replace(/\D/g, '') })} placeholder="Từ" className="w-full border border-[#dbe5ef] px-2 py-2 text-xs outline-none"/><input name={draft.max_price ? 'max_price' : undefined} inputMode="numeric" aria-label="Giá tối đa" value={draft.max_price} onChange={e => setDraft({ ...draft, max_price: e.target.value.replace(/\D/g, '') })} placeholder="Đến" className="w-full border border-[#dbe5ef] px-2 py-2 text-xs outline-none"/></div></div>
        {draft.sort !== 'popular' && <input type="hidden" name="sort" value={draft.sort}/>}<button type="submit" className="w-full bg-[#0b4fa4] py-2.5 text-sm font-bold text-white">Áp dụng bộ lọc</button><Link href={category.url} className="block w-full border border-[#cbd9e7] py-2 text-center text-sm font-bold text-[#0b4fa4]">Xóa bộ lọc</Link>
    </form>;

    return <StoreLayout><SeoHead seo={seo} jsonLd={jsonLd}/><main className="container-store py-7 fade-up">
        <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-2 text-xs text-[#8293a8]">{breadcrumbs.map((item, index) => <span key={item.url} className="flex items-center gap-2">{index > 0 && <ChevronRight size={14}/>}<Link href={item.url} className={index === breadcrumbs.length - 1 ? 'font-bold text-[#214665]' : 'hover:text-[#0b4fa4]'}>{item.name}</Link></span>)}</nav>
        <header className="mb-8 border-b border-[#dce5ef] pb-7"><div className="flex flex-wrap items-end justify-between gap-4"><div><div className="mb-1 text-xs font-bold uppercase tracking-[.18em] text-[#c37c0c]">Danh mục sản phẩm</div><h1 className="font-display text-3xl font-bold tracking-tight text-[#14385f] sm:text-4xl">{category.name}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[#71869d]">{category.description}</p><p className="mt-1 text-sm text-[#71869d]">{products.total} sản phẩm chính hãng · Giao nhanh, lắp đặt tận tâm</p></div><button className="flex items-center gap-2 border border-[#cbd9e7] px-3 py-2 text-sm font-semibold text-[#315575] lg:hidden" onClick={() => setMobileFilter(true)}><Filter size={16}/> Bộ lọc</button></div></header>
        <div className="grid gap-8 lg:grid-cols-[225px_1fr]"><aside className="hidden lg:block"><FilterPane/></aside><section aria-label="Danh sách sản phẩm"><div className="mb-5 flex items-center justify-between border-b border-[#e1e8f0] pb-3"><span className="text-sm text-[#71869d]">Hiển thị <b className="text-[#214665]">{products.from ?? 0}–{products.to ?? 0}</b> / {products.total}</span><select aria-label="Sắp xếp sản phẩm" value={draft.sort} onChange={e => { const sort = e.target.value; setDraft({ ...draft, sort }); visit({ sort }); }} className="border border-[#dbe5ef] bg-white px-3 py-2 text-xs font-semibold text-[#36526f] outline-none"><option value="popular">Phổ biến nhất</option><option value="sale">Ưu đãi tốt nhất</option><option value="price-low">Giá thấp đến cao</option><option value="price-high">Giá cao đến thấp</option></select></div>
            {products.data.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{products.data.map(product => <ProductCard key={product.id} product={product}/>)}</div> : <div className="flex min-h-[360px] flex-col items-center justify-center border border-dashed border-[#b9ccdf] bg-[#f7fafd] p-8 text-center"><Search size={38} className="text-[#8da9c5]"/><h2 className="mt-4 font-display text-xl font-bold text-[#214665]">Chưa có sản phẩm phù hợp</h2><p className="mt-2 text-sm text-[#70839a]">Thử bỏ bớt bộ lọc hoặc tìm bằng từ khóa khác.</p><button onClick={clear} className="mt-5 border border-[#0b4fa4] px-4 py-2 text-sm font-bold text-[#0b4fa4]">Xóa bộ lọc</button></div>}
            {products.last_page > 1 && <nav aria-label="Phân trang" className="mt-8 flex flex-wrap justify-center gap-2">{products.links.map((link, index) => link.url ? <Link key={index} href={link.url} preserveScroll className={`grid min-h-10 min-w-10 place-items-center border px-3 text-sm font-bold ${link.active ? 'border-[#0b4fa4] bg-[#0b4fa4] text-white' : 'border-[#d5e1ec] bg-white text-[#315575]'}`}>{index === 0 ? <ChevronLeft size={16}/> : index === products.links.length - 1 ? <ChevronRight size={16}/> : <span dangerouslySetInnerHTML={{ __html: link.label }}/>}</Link> : <span key={index} className="grid min-h-10 min-w-10 place-items-center border border-[#edf1f5] px-3 text-[#a6b2bf]">{index === 0 ? <ChevronLeft size={16}/> : <ChevronRight size={16}/>}</span>)}</nav>}
        </section></div>
        {mobileFilter && <div className="fixed inset-0 z-50 bg-[#102c4b]/40 lg:hidden" onClick={() => setMobileFilter(false)}><div className="absolute bottom-0 left-0 right-0 max-h-[88vh] overflow-y-auto bg-white p-5" onClick={e => e.stopPropagation()}><div className="mb-5 flex items-center justify-between"><b className="font-display text-xl text-[#173b62]">Bộ lọc sản phẩm</b><button aria-label="Đóng bộ lọc" onClick={() => setMobileFilter(false)}><X/></button></div><FilterPane/></div></div>}
        <section className="mt-12 border-t border-[#dce5ef] pt-8"><h2 className="font-display text-2xl font-bold text-[#14385f]">Chọn {category.name.toLocaleLowerCase('vi-VN')} phù hợp nhu cầu</h2><p className="mt-3 max-w-4xl text-sm leading-7 text-[#5e7792]">{category.isAirConditioner ? 'Điều hòa 12.000 BTU thường phù hợp với phòng khoảng 15–20 m². Hiệu quả thực tế còn phụ thuộc cách nhiệt, hướng nắng, chiều cao trần và số người sử dụng.' : `So sánh dung tích, công suất, mức tiêu thụ điện, kích thước và chính sách bảo hành của từng sản phẩm ${category.name.toLocaleLowerCase('vi-VN')} trước khi lựa chọn.`}</p><div className="mt-5 flex flex-wrap gap-3">{brands.map(brand => <Link key={brand.id} href={`/thuong-hieu/${brand.slug}`} className="border border-[#cbd9e7] bg-white px-4 py-2 text-sm font-bold text-[#0b4fa4]">{category.name} {brand.name}</Link>)}</div></section>
    </main></StoreLayout>;
}

function ProductCard({ product }: { product: Product }) {
    const price = product.sale_price ?? product.price;
    const discount = product.original_price ? Math.round((1 - Number(price) / Number(product.original_price)) * 100) : 0;
    return <article className="group relative border border-[#dce5ef] bg-white p-3 transition hover:-translate-y-0.5 hover:border-[#9dbbda] hover:shadow-lg sm:p-4"><div className="absolute left-2 top-2 z-10 bg-[#e55937] px-2 py-1 text-[10px] font-bold text-white">-{discount}%</div><WishlistButton productId={product.id} compact className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center bg-white/90 text-[#6f8499]"/><Link href={product.url} className="block"><div className="aspect-square overflow-hidden bg-[#f4f8fc]"><img src={product.image ? imageAt(product.image.url, 480) : ''} srcSet={product.image ? `${imageAt(product.image.url, 320)} 320w, ${imageAt(product.image.url, 640)} 640w` : undefined} sizes="(max-width: 640px) 45vw, 240px" loading="lazy" decoding="async" width="480" height="480" alt={product.image?.alt_text || product.name} className="h-full w-full object-cover mix-blend-multiply transition duration-300 group-hover:scale-[1.03]"/></div><div className="mt-3 text-[10px] font-bold uppercase tracking-[.15em] text-[#8294a9]">{product.brand.name}</div><h2 className="mt-1 line-clamp-2 min-h-10 text-sm font-bold leading-5 text-[#214665]">{product.name}</h2><div className="mt-2 flex items-center gap-1 text-xs text-[#607991]"><Star size={13} className="text-[#f2ab18]" fill="#f2ab18"/><span>Chính hãng</span></div><div className="mt-3 font-extrabold text-[#d44b2e]">{money(price)}</div>{product.original_price && <div className="mt-1 text-xs text-[#94a2b0] line-through">{money(product.original_price)}</div>}<div className="mt-2 flex flex-wrap gap-1 text-[10px] text-[#607991]">{product.btu && <span className="bg-[#edf4fb] px-2 py-1">{product.btu.toLocaleString('vi-VN')} BTU</span>}{product.inverter && <span className="bg-[#edf7f2] px-2 py-1 text-[#168265]">Inverter</span>}</div></Link><div className="mt-3 flex gap-2"><AddToCartButton productId={product.id} className="flex flex-1 items-center justify-center gap-1 border border-[#0b4fa4] py-2 text-xs font-bold text-[#0b4fa4]">Thêm giỏ</AddToCartButton><CompareButton product={product} compact className="grid w-9 place-items-center border border-[#d5e1ec] text-[#5e7792] disabled:opacity-40"/></div></article>;
}
