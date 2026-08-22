import { Link, useForm } from '@inertiajs/react';
import { CheckCircle2, MapPin, ShieldCheck, Truck } from 'lucide-react';
import { useState } from 'react';
import FormField from '../../Components/FormField';
import SeoHead from '../../Components/SeoHead';
import StoreLayout from '../../Layouts/StoreLayout';
import { validateCheckout, type PricingQuote } from '../../services/checkoutService';

type Address = { id:number; label?:string; recipient_name:string; phone:string; street:string; ward?:string; district:string; city:string; postal_code?:string; is_default:boolean };
type Item = { id:number; quantity:number; product:{ name:string; sku:string; image?:{url:string;alt_text?:string} } };
type Cart = { items:Item[]; count:number; subtotal:number };
type Props = { cart:Cart; quote:PricingQuote; couponCode?:string; addresses:Address[]; idempotencyKey:string };
type CheckoutForm = { idempotency_key:string; address_id:number|null; customer_name:string; customer_phone:string; customer_email:string; shipping_street:string; shipping_ward:string; shipping_district:string; shipping_city:string; shipping_postal_code:string; payment_method:string; notes:string };
const money = (value:number) => value.toLocaleString('vi-VN')+'₫';

export default function CheckoutShow({cart, quote:initialQuote, couponCode, addresses, idempotencyKey}:Props) {
    const defaultAddress = addresses.find(address => address.is_default) ?? addresses[0];
    const form = useForm<CheckoutForm>({
        idempotency_key:idempotencyKey, address_id:defaultAddress?.id ?? null,
        customer_name:defaultAddress?.recipient_name ?? '', customer_phone:defaultAddress?.phone ?? '', customer_email:'',
        shipping_street:defaultAddress?.street ?? '', shipping_ward:defaultAddress?.ward ?? '', shipping_district:defaultAddress?.district ?? '',
        shipping_city:defaultAddress?.city ?? '', shipping_postal_code:defaultAddress?.postal_code ?? '', payment_method:'cod', notes:'',
    });
    const [quote,setQuote] = useState(initialQuote);
    const [quoteError,setQuoteError] = useState('');
    const refreshQuote = async (city:string) => {
        if (!city) return;
        setQuoteError('');
        try { setQuote(await validateCheckout(city,couponCode)); }
        catch (error:any) { setQuoteError(error?.response?.data?.message ?? 'Không thể cập nhật báo giá.'); }
    };
    const chooseAddress = (id:number|null) => {
        form.setData('address_id',id);
        const address=addresses.find(item=>item.id===id);
        if (address) {
            form.setData(data=>({...data,address_id:id,customer_name:address.recipient_name,customer_phone:address.phone,shipping_street:address.street,shipping_ward:address.ward??'',shipping_district:address.district,shipping_city:address.city,shipping_postal_code:address.postal_code??''}));
            void refreshQuote(address.city);
        }
    };
    return <StoreLayout>
        <SeoHead seo={{title:'Thanh toán | Điện Máy 365',description:'Hoàn tất đơn hàng Điện Máy 365.',canonical:'',robots:'noindex,nofollow'}}/>
        <main className="container-store py-8">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#0b4fa4]">Thanh toán an toàn</p>
            <h1 className="font-display mt-1 text-3xl text-[#173b68]">Thông tin giao hàng</h1>
            <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_380px]">
                <form id="checkout-form" onSubmit={event=>{event.preventDefault();form.post('/thanh-toan');}} className="space-y-5">
                    {addresses.length>0&&<section className="border border-[#dce5ef] bg-white p-5"><h2 className="font-display flex items-center gap-2 text-xl text-[#173b68]"><MapPin size={20}/> Địa chỉ đã lưu</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{addresses.map(address=><button type="button" key={address.id} onClick={()=>chooseAddress(address.id)} className={`p-4 text-left text-sm ${form.data.address_id===address.id?'border-2 border-[#0b4fa4] bg-[#f4f8fc]':'border border-[#dce5ef]'}`}><b>{address.label||'Địa chỉ'} {address.is_default&&<span className="text-xs text-[#0b4fa4]">· Mặc định</span>}</b><p className="mt-2">{address.recipient_name} · {address.phone}</p><p className="mt-1 text-[#607b98]">{address.street}, {address.district}, {address.city}</p></button>)}</div><button type="button" onClick={()=>chooseAddress(null)} className="mt-3 text-sm font-semibold text-[#0b4fa4]">Nhập địa chỉ khác</button></section>}
                    <section className="border border-[#dce5ef] bg-white p-5"><h2 className="font-display text-xl text-[#173b68]">Người nhận</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><FormField label="Họ và tên" value={form.data.customer_name} onChange={e=>form.setData('customer_name',e.target.value)} error={form.errors.customer_name}/><FormField label="Số điện thoại" value={form.data.customer_phone} onChange={e=>form.setData('customer_phone',e.target.value)} error={form.errors.customer_phone}/><div className="sm:col-span-2"><FormField label="Email nhận xác nhận (không bắt buộc)" type="email" value={form.data.customer_email} onChange={e=>form.setData('customer_email',e.target.value)} error={form.errors.customer_email}/></div></div></section>
                    <section className="border border-[#dce5ef] bg-white p-5"><h2 className="font-display text-xl text-[#173b68]">Địa chỉ giao hàng</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><FormField label="Số nhà, tên đường" value={form.data.shipping_street} onChange={e=>form.setData('shipping_street',e.target.value)} error={form.errors.shipping_street}/></div><FormField label="Phường/xã" value={form.data.shipping_ward} onChange={e=>form.setData('shipping_ward',e.target.value)} error={form.errors.shipping_ward}/><FormField label="Quận/huyện" value={form.data.shipping_district} onChange={e=>form.setData('shipping_district',e.target.value)} error={form.errors.shipping_district}/><FormField label="Tỉnh/thành phố" value={form.data.shipping_city} onChange={e=>form.setData('shipping_city',e.target.value)} onBlur={()=>void refreshQuote(form.data.shipping_city)} error={form.errors.shipping_city}/><FormField label="Mã bưu chính" value={form.data.shipping_postal_code} onChange={e=>form.setData('shipping_postal_code',e.target.value)}/></div></section>
                    <section className="border border-[#dce5ef] bg-white p-5"><h2 className="font-display text-xl text-[#173b68]">Thanh toán</h2><label className="mt-4 flex cursor-pointer gap-3 border border-[#dce5ef] p-4"><input type="radio" checked={form.data.payment_method==='cod'} onChange={()=>form.setData('payment_method','cod')}/><span><b>Thanh toán khi nhận hàng (COD)</b><small className="mt-1 block text-[#607b98]">Thanh toán trực tiếp khi đơn hàng được giao.</small></span></label><label className="mt-3 flex cursor-pointer gap-3 border border-[#dce5ef] p-4"><input type="radio" checked={form.data.payment_method==='bank_transfer'} onChange={()=>form.setData('payment_method','bank_transfer')}/><span><b>Chuyển khoản ngân hàng</b><small className="mt-1 block text-[#607b98]">Thông tin chuyển khoản sẽ được xác nhận thủ công trong Phase 9.</small></span></label><label className="mt-4 block text-sm font-semibold text-[#315575]">Ghi chú<textarea value={form.data.notes} onChange={e=>form.setData('notes',e.target.value)} className="mt-2 min-h-24 w-full border border-[#cdd9e6] p-3 font-normal outline-none"/></label></section>
                    {((form.errors as Record<string,string>).cart||quoteError)&&<p className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{(form.errors as Record<string,string>).cart||quoteError}</p>}
                </form>
                <aside className="h-fit border border-[#dce5ef] bg-white p-5 lg:sticky lg:top-24"><h2 className="font-display text-xl text-[#173b68]">Đơn hàng ({cart.count})</h2><div className="mt-4 space-y-3 border-b border-[#e6edf4] pb-4">{cart.items.map(item=><div key={item.id} className="flex items-center gap-3 text-sm">{item.product.image&&<img src={item.product.image.url} alt={item.product.image.alt_text||item.product.name} className="h-14 w-14 bg-[#f4f8fc] object-cover"/>}<span className="flex-1"><b className="line-clamp-2">{item.product.name}</b><small className="text-[#71869d]">SL: {item.quantity}</small></span></div>)}</div><div className="mt-4 space-y-2 text-sm"><div className="flex justify-between"><span>Tạm tính</span><b>{money(quote.subtotal)}</b></div><div className="flex justify-between text-[#168265]"><span>Giảm giá</span><b>-{money(quote.promotionDiscount+quote.couponDiscount)}</b></div><div className="flex justify-between"><span>Vận chuyển</span><b>{quote.shippingAddressRequired?'Nhập địa chỉ':money(quote.shippingTotal)}</b></div><div className="flex justify-between"><span>Lắp đặt</span><b>{money(quote.installationTotal)}</b></div></div><div className="mt-4 flex items-end justify-between border-t border-[#e6edf4] pt-4"><b>Tổng thanh toán</b><strong className="text-xl text-[#d44b2e]">{money(quote.grandTotal)}</strong></div><button form="checkout-form" disabled={form.processing} className="mt-5 h-12 w-full bg-[#e65a37] font-bold text-white disabled:opacity-60">{form.processing?'Đang tạo đơn...':'Đặt hàng'}</button><div className="mt-4 space-y-2 text-xs text-[#607b98]"><p className="flex gap-2"><ShieldCheck size={15}/> Giá và tồn kho được khóa, kiểm tra lại trên máy chủ.</p><p className="flex gap-2"><Truck size={15}/> Phí giao hàng dựa trên tỉnh/thành đã nhập.</p><p className="flex gap-2"><CheckCircle2 size={15}/> Gửi lại cùng yêu cầu không tạo đơn trùng.</p></div><Link href="/gio-hang" className="mt-4 block text-center text-sm font-semibold text-[#0b4fa4]">← Quay lại giỏ hàng</Link></aside>
            </div>
        </main>
    </StoreLayout>;
}
