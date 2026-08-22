import { Link } from '@inertiajs/react';
import { X } from 'lucide-react';
import { useCompare, type CompareProduct } from '../../Components/Compare';
import SeoHead from '../../Components/SeoHead';
import StoreLayout from '../../Layouts/StoreLayout';

const money = (value: string | number) => Number(value).toLocaleString('vi-VN') + '₫';

export default function CompareIndex() {
    const compare = useCompare();
    const rows: Array<[string, (product: CompareProduct) => string]> = [
        ['Thương hiệu', product => product.brand.name],
        ['Danh mục', product => product.category.name],
        ['SKU', product => product.sku],
        ['Công suất', product => product.btu ? `${product.btu.toLocaleString('vi-VN')} BTU` : '—'],
        ['Diện tích phòng', product => product.room_size || '—'],
        ['Inverter', product => product.inverter == null ? '—' : product.inverter ? 'Có' : 'Không'],
    ];

    return <StoreLayout><SeoHead seo={{ title: 'So sánh sản phẩm | Điện Máy 365', description: 'So sánh tối đa 4 sản phẩm điện máy.', canonical: '', robots: 'noindex,nofollow' }}/><main className="container-store py-8"><h1 className="font-display text-3xl font-bold text-[#14385f]">So sánh sản phẩm</h1><p className="mt-2 text-sm text-[#71869d]">Đối chiếu nhanh thông tin của tối đa 4 sản phẩm đã chọn.</p>
        {!compare.hydrated ? <p className="mt-8 text-sm text-[#71869d]">Đang tải danh sách…</p> : compare.products.length === 0 ? <section className="mt-8 border border-dashed border-[#b9ccdf] bg-[#f7fafd] py-16 text-center"><h2 className="font-display text-xl text-[#173b68]">Chưa có sản phẩm để so sánh</h2><Link href="/dieu-hoa" className="mt-5 inline-flex bg-[#0b4fa4] px-5 py-3 text-sm font-bold text-white">Chọn sản phẩm</Link></section> : <div className="mt-7 overflow-x-auto"><table className="min-w-[720px] w-full border-collapse text-sm"><thead><tr><th className="w-40 border border-[#dce5ef] bg-[#f4f8fc] p-3 text-left">Sản phẩm</th>{compare.products.map(product => <th key={product.id} className="relative min-w-48 border border-[#dce5ef] bg-white p-4 align-top"><button type="button" aria-label={`Bỏ ${product.name}`} onClick={() => compare.remove(product.id)} className="absolute right-2 top-2 text-[#71869d]"><X size={16}/></button>{product.image && <img src={product.image.url} alt={product.image.alt_text || product.name} className="mx-auto h-32 w-32 object-contain"/>}<Link href={product.url} className="mt-3 block text-left font-bold leading-5 text-[#214665]">{product.name}</Link><div className="mt-2 text-left font-extrabold text-[#d44b2e]">{money(product.sale_price ?? product.price)}</div></th>)}</tr></thead><tbody>{rows.map(([label, value]) => <tr key={label}><th className="border border-[#dce5ef] bg-[#f4f8fc] p-3 text-left text-[#315575]">{label}</th>{compare.products.map(product => <td key={product.id} className="border border-[#dce5ef] p-3 text-[#315575]">{value(product)}</td>)}</tr>)}</tbody></table></div>}
    </main></StoreLayout>;
}
