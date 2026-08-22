import { Link } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import SeoHead from '../Components/SeoHead';
import StoreLayout from './StoreLayout';

export default function AuthLayout({ title, description, children }: PropsWithChildren<{ title: string; description: string }>) {
    return <StoreLayout><SeoHead seo={{ title: `${title} | Điện Máy 365`, description, canonical: typeof window === 'undefined' ? '' : window.location.href, robots: 'noindex,nofollow' }}/><main className="container-store py-10 sm:py-16"><div className="mx-auto max-w-md border border-[#dce5ef] bg-white p-6 shadow-sm sm:p-8"><Link href="/" className="text-xs font-bold uppercase tracking-wider text-[#0b4fa4]">← Điện Máy 365</Link><h1 className="font-display mt-4 text-2xl text-[#173b68]">{title}</h1><p className="mt-2 text-sm leading-6 text-[#607b98]">{description}</p><div className="mt-6">{children}</div></div></main></StoreLayout>;
}
