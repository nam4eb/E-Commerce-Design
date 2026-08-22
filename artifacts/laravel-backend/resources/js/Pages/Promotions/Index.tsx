import { Link } from '@inertiajs/react';
import { ChevronRight, Tag } from 'lucide-react';
import CatalogProductCard, { type CatalogProduct } from '../../Components/CatalogProductCard';
import SeoHead from '../../Components/SeoHead';
import StoreLayout from '../../Layouts/StoreLayout';

type Promotion = { id: number; name: string; type: 'percentage' | 'fixed'; value: string; maximum_discount?: string | null; ends_at?: string | null; products: CatalogProduct[] };

const offer = (promotion: Promotion) => promotion.type === 'percentage'
    ? `Giảm ${Number(promotion.value).toLocaleString('vi-VN')}%${promotion.maximum_discount ? `, tối đa ${Number(promotion.maximum_discount).toLocaleString('vi-VN')}₫` : ''}`
    : `Giảm ${Number(promotion.value).toLocaleString('vi-VN')}₫`;

export default function PromotionIndex({ promotions, seo, breadcrumbs, jsonLd }: { promotions: Promotion[]; seo: any; breadcrumbs: { name: string; url: string }[]; jsonLd: any }) {
    return <StoreLayout><SeoHead seo={seo} jsonLd={jsonLd}/><main className="container-store py-8"><nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-2 text-xs text-[#8293a8]">{breadcrumbs.map((item, index) => <span key={item.url} className="flex items-center gap-2">{index > 0 && <ChevronRight size={14}/>}<Link href={item.url} className={index === breadcrumbs.length - 1 ? 'font-bold text-[#214665]' : 'hover:text-[#0b4fa4]'}>{item.name}</Link></span>)}</nav><header className="bg-gradient-to-r from-[#0b4fa4] to-[#073b86] px-6 py-10 text-white sm:px-10"><div className="flex items-center gap-3 text-[#ffd45b]"><Tag/><span className="text-xs font-extrabold uppercase tracking-[.2em]">Ưu đãi đang diễn ra</span></div><h1 className="mt-3 font-display text-3xl font-black sm:text-4xl">Khuyến mãi Điện Máy 365</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">Ưu đãi được tính lại trên máy chủ theo sản phẩm, thời gian áp dụng và điều kiện đơn hàng.</p></header>
        {promotions.length === 0 ? <section className="mt-8 border border-dashed border-[#b9ccdf] bg-[#f7fafd] py-16 text-center"><h2 className="font-display text-xl text-[#173b68]">Chưa có chương trình đang áp dụng</h2><Link href="/" className="mt-5 inline-flex bg-[#0b4fa4] px-5 py-3 text-sm font-bold text-white">Về trang chủ</Link></section> : <div className="space-y-12 py-10">{promotions.map(promotion => <section key={promotion.id}><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#c84b25]">{offer(promotion)}</p><h2 className="mt-1 font-display text-2xl font-extrabold text-[#14385f]">{promotion.name}</h2>{promotion.ends_at && <p className="mt-1 text-xs text-[#71869d]">Áp dụng đến {new Date(`${promotion.ends_at}T00:00:00`).toLocaleDateString('vi-VN')}</p>}</div></div>{promotion.products.length > 0 ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{promotion.products.map(product => <CatalogProductCard key={product.id} product={product}/>)}</div> : <p className="border border-[#dce5ef] bg-[#f7fafd] p-5 text-sm text-[#71869d]">Chương trình chưa có sản phẩm khả dụng.</p>}</section>)}</div>}
    </main></StoreLayout>;
}
