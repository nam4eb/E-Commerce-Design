import { Link, router } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import CatalogProductCard, { CatalogProduct } from '../../Components/CatalogProductCard';
import SeoHead from '../../Components/SeoHead';
import StoreLayout from '../../Layouts/StoreLayout';

export default function BrandShow({ brand, products, categories, filters, seo, breadcrumbs, jsonLd }: any) {
    const [draft, setDraft] = useState({ q: filters.q ?? '', category: filters.category ?? '', sort: typeof filters.sort === 'string' ? filters.sort : 'popular' });
    const visit = (next: typeof draft) => router.get(brand.url, Object.fromEntries(Object.entries(next).filter(([, value]) => value && value !== 'popular')), { preserveState: true, replace: true });
    return <StoreLayout><SeoHead seo={seo} jsonLd={jsonLd}/><main className="container-store py-8">
        <nav aria-label="Breadcrumb" className="mb-5 flex gap-2 text-xs text-[#8293a8]">{breadcrumbs.map((item: any, index: number) => <span key={item.url} className="flex items-center gap-2">{index > 0 && <ChevronRight size={14}/>}<Link href={item.url}>{item.name}</Link></span>)}</nav>
        <header className="border-b border-[#dce5ef] pb-7"><div className="text-xs font-bold uppercase tracking-[.18em] text-[#c37c0c]">Thương hiệu chính hãng</div><h1 className="mt-1 font-display text-4xl font-bold text-[#14385f]">{brand.name}</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-[#71869d]">{brand.description}</p></header>
        <div className="mt-7 grid gap-7 lg:grid-cols-[220px_1fr]"><form action={brand.url} method="get" className="space-y-5"><label className="block text-sm font-bold text-[#214665]">Tìm sản phẩm<input name={draft.q ? 'q' : undefined} value={draft.q} onChange={e => setDraft({...draft, q: e.target.value})} className="mt-2 w-full border border-[#dbe5ef] px-3 py-2 font-normal"/></label><label className="block text-sm font-bold text-[#214665]">Ngành hàng<select name={draft.category ? 'category' : undefined} value={draft.category} onChange={e => setDraft({...draft, category: e.target.value})} className="mt-2 w-full border border-[#dbe5ef] px-3 py-2 font-normal"><option value="">Tất cả</option>{categories.map((category: any) => <option key={category.id} value={category.slug}>{category.name} ({category.products_count})</option>)}</select></label>{draft.sort !== 'popular' && <input type="hidden" name="sort" value={draft.sort}/>}<button className="w-full bg-[#0b4fa4] py-2.5 text-sm font-bold text-white">Áp dụng</button><Link href={brand.url} className="block text-center text-sm font-bold text-[#0b4fa4]">Xóa bộ lọc</Link></form>
            <section><div className="mb-5 flex items-center justify-between"><span className="text-sm text-[#71869d]">{products.total} sản phẩm</span><select value={draft.sort} onChange={e => { const next = {...draft, sort: e.target.value}; setDraft(next); visit(next); }} className="border border-[#dbe5ef] px-3 py-2 text-sm"><option value="popular">Phổ biến</option><option value="sale">Ưu đãi</option><option value="price-low">Giá thấp đến cao</option><option value="price-high">Giá cao đến thấp</option></select></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{products.data.map((product: CatalogProduct) => <CatalogProductCard key={product.id} product={product}/>)}</div><Pagination links={products.links}/></section>
        </div>
    </main></StoreLayout>;
}

function Pagination({links}: any) { return <nav aria-label="Phân trang" className="mt-8 flex justify-center gap-2">{links.map((link: any, index: number) => link.url ? <Link key={index} href={link.url} className={`border px-3 py-2 text-sm ${link.active ? 'bg-[#0b4fa4] text-white' : 'bg-white text-[#315575]'}`}><span dangerouslySetInnerHTML={{__html: link.label}}/></Link> : null)}</nav>; }
