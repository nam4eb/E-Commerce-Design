import { Link } from '@inertiajs/react';
import CatalogProductCard, { CatalogProduct } from '../../Components/CatalogProductCard';
import SeoHead from '../../Components/SeoHead';
import StoreLayout from '../../Layouts/StoreLayout';

export default function SearchIndex({query, products, seo}: any) {
    return <StoreLayout><SeoHead seo={seo}/><main className="container-store py-8"><h1 className="font-display text-3xl font-bold text-[#14385f]">Kết quả tìm kiếm cho “{query}”</h1><p className="mt-2 text-sm text-[#71869d]">Tìm thấy {products.total} sản phẩm.</p>{products.data.length ? <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{products.data.map((product: CatalogProduct) => <CatalogProductCard key={product.id} product={product}/>)}</div> : <div className="mt-8 border border-dashed border-[#b9ccdf] p-10 text-center text-[#71869d]">Chưa tìm thấy sản phẩm phù hợp.</div>}<nav className="mt-8 flex justify-center gap-2">{products.links.map((link: any,index: number)=>link.url?<Link key={index} href={link.url} className={`border px-3 py-2 text-sm ${link.active?'bg-[#0b4fa4] text-white':'text-[#315575]'}`}><span dangerouslySetInnerHTML={{__html:link.label}}/></Link>:null)}</nav></main></StoreLayout>;
}
