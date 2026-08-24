import { Link, usePage } from '@inertiajs/react';
import { Menu, Search, ShoppingCart, UserRound, Zap } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { CompareTray } from '../Components/Compare';
import AiChatbot from '../Components/AiChatbot';

export default function StoreLayout({ children }: PropsWithChildren) {
    const page = usePage<{ auth: { user: { name: string } | null }; commerce: { cartCount: number } }>().props;
    const user = page.auth?.user;
    const cartCount = page.commerce?.cartCount ?? 0;
    return <>
        <div className="bg-[#073b86] text-white text-[11px] sm:text-xs"><div className="container-store flex h-8 items-center justify-between"><span className="hidden sm:inline">Hệ thống 28 cửa hàng · Miễn phí giao lắp nội thành</span><span className="sm:hidden">Miễn phí giao lắp nội thành</span><span>Hotline 1800 6865</span></div></div>
        <header className="sticky top-0 z-40 border-b border-[#dce5ef] bg-white/95 backdrop-blur">
            <div className="container-store flex h-[72px] items-center gap-3">
                <Link href="/" className="flex shrink-0 items-center gap-2"><span className="grid h-10 w-10 place-items-center bg-[#f6b91a] text-[#073b86]"><Zap size={22} fill="currentColor" /></span><span className="hidden leading-none sm:block"><b className="font-display text-xl tracking-tight text-[#073b86]">ĐIỆN MÁY</b><br/><b className="text-[10px] tracking-[.24em] text-[#f09f14]">365</b></span></Link>
                <Link href="/dieu-hoa" className="hidden h-10 items-center gap-2 border border-[#dce5ef] px-3 text-sm font-semibold text-[#173b68] lg:flex"><Menu size={17}/> Danh mục</Link>
                <form action="/tim-kiem" method="get" role="search" className="flex h-11 min-w-0 flex-1 items-center border-2 border-[#0b4fa4] bg-[#f5f8fc] px-3 text-sm text-[#7b8fa7]"><button type="submit" aria-label="Tìm kiếm toàn trang" className="mr-2 shrink-0"><Search size={17}/></button><input name="q" minLength={2} maxLength={100} required aria-label="Tìm kiếm sản phẩm" placeholder="Bạn đang tìm gì hôm nay?" className="min-w-0 flex-1 bg-transparent text-[#315575] outline-none placeholder:text-[#7b8fa7]"/></form>
                <Link href={user ? '/tai-khoan' : '/dang-nhap'} className="hidden text-[#173b68] sm:block" aria-label={user ? `Tài khoản ${user.name}` : 'Đăng nhập'}><UserRound/></Link><Link href="/gio-hang" className="relative text-[#173b68]" aria-label={`Giỏ hàng có ${cartCount} sản phẩm`}><ShoppingCart/><span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-[#e55937] px-1 text-[9px] text-white">{cartCount}</span></Link>
            </div>
            <nav className="hidden border-t border-[#edf1f5] lg:block"><div className="container-store flex h-10 items-center gap-7 text-sm font-semibold text-[#315575]"><Link href="/dieu-hoa">Điều hòa</Link><Link href="/tu-lanh">Tủ lạnh</Link><Link href="/may-giat">Máy giặt</Link><Link href="/tivi">Tivi</Link><Link href="/do-gia-dung">Nhà bếp</Link><Link href="/khuyen-mai" className="text-[#c84b25]">Khuyến mãi</Link><Link href="/tin-tuc">Tin tức</Link></div></nav>
        </header>
        {children}
        <footer className="mt-16 bg-[#092f61] py-10 text-white"><div className="container-store"><b className="font-display text-xl">ĐIỆN MÁY 365</b><p className="mt-2 text-sm text-blue-100">Thiết bị điện máy chính hãng · Giao lắp tận tâm</p></div></footer>
        <CompareTray/>
        <AiChatbot/>
    </>;
}
