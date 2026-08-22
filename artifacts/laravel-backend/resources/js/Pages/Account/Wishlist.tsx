import { Link } from '@inertiajs/react';
import CatalogProductCard, { type CatalogProduct } from '../../Components/CatalogProductCard';
import SeoHead from '../../Components/SeoHead';
import StoreLayout from '../../Layouts/StoreLayout';

export default function Wishlist({products}:{products:CatalogProduct[]}) {
 return <StoreLayout><SeoHead seo={{title:'Sản phẩm yêu thích | Điện Máy 365',description:'Danh sách sản phẩm yêu thích của bạn.',canonical:'',robots:'noindex,nofollow'}}/><main className="container-store py-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#0b4fa4]">Tài khoản</p><h1 className="font-display mt-1 text-3xl text-[#173b68]">Sản phẩm yêu thích</h1>{products.length?<div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{products.map(p=><CatalogProductCard key={p.id} product={p}/>)}</div>:<div className="mt-8 border border-[#dce5ef] bg-white py-14 text-center"><p className="text-[#71869d]">Bạn chưa lưu sản phẩm nào.</p><Link href="/dieu-hoa" className="mt-4 inline-block font-bold text-[#0b4fa4]">Khám phá sản phẩm →</Link></div>}</main></StoreLayout>;
}
