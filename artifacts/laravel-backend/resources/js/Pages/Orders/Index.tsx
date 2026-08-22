import { Link } from '@inertiajs/react';
import SeoHead from '../../Components/SeoHead';
import StoreLayout from '../../Layouts/StoreLayout';

type Order = { number:string; status:string; grand_total:number|string; placed_at:string };
type Pagination = { data:Order[]; links:Array<{url?:string;label:string;active:boolean}> };
const money=(value:number|string)=>Number(value).toLocaleString('vi-VN')+'₫';

export default function OrderIndex({orders}:{orders:Pagination}) {
 return <StoreLayout><SeoHead seo={{title:'Đơn hàng của tôi | Điện Máy 365',description:'Lịch sử đơn hàng Điện Máy 365.',canonical:'',robots:'noindex,nofollow'}}/><main className="container-store py-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#0b4fa4]">Tài khoản</p><h1 className="font-display mt-1 text-3xl text-[#173b68]">Đơn hàng của tôi</h1><div className="mt-7 overflow-hidden border border-[#dce5ef] bg-white">{orders.data.length===0?<div className="p-12 text-center text-[#607b98]">Bạn chưa có đơn hàng nào.</div>:orders.data.map(order=><Link key={order.number} href={`/don-hang/${order.number}`} className="grid gap-2 border-b border-[#e6edf4] p-4 transition hover:bg-[#f7fafc] sm:grid-cols-[1fr_auto_auto] sm:items-center"><div><b className="text-[#214665]">{order.number}</b><p className="mt-1 text-xs text-[#71869d]">{new Date(order.placed_at).toLocaleString('vi-VN')}</p></div><span className="w-fit bg-[#edf7f2] px-2 py-1 text-xs font-bold uppercase text-[#168265]">{order.status}</span><b className="text-[#d44b2e]">{money(order.grand_total)}</b></Link>)}</div>{orders.links.length>3&&<nav className="mt-5 flex flex-wrap justify-center gap-2">{orders.links.map((link,index)=>link.url?<Link key={index} href={link.url} className={`border px-3 py-2 text-sm ${link.active?'border-[#0b4fa4] bg-[#0b4fa4] text-white':'border-[#dce5ef] bg-white text-[#315575]'}`} dangerouslySetInnerHTML={{__html:link.label}}/>:null)}</nav>}<Link href="/tai-khoan" className="mt-6 inline-block text-sm font-semibold text-[#0b4fa4]">← Quay lại tài khoản</Link></main></StoreLayout>;
}
