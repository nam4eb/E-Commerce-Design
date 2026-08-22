import { router, usePage } from '@inertiajs/react';
import { Heart, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';

type Shared = { auth: { user: { id: number } | null }; commerce: { cartCount: number; wishlistProductIds: number[] } };

export function AddToCartButton({ productId, quantity = 1, installationRequired = false, redirectTo, className, children }: { productId: number; quantity?: number; installationRequired?: boolean; redirectTo?: string; className?: string; children?: ReactNode }) {
    const [busy, setBusy] = useState(false);
    return <button type="button" disabled={busy} className={className} onClick={() => {
        setBusy(true);
        router.post('/gio-hang/items', { product_id: productId, quantity, installation_required: installationRequired }, { preserveScroll: !redirectTo, onSuccess: () => { if (redirectTo) router.visit(redirectTo); }, onFinish: () => setBusy(false) });
    }}><ShoppingCart size={14}/>{busy ? 'Đang thêm…' : children ?? 'Thêm giỏ'}</button>;
}

export function WishlistButton({ productId, className, compact = false }: { productId: number; className?: string; compact?: boolean }) {
    const { auth, commerce } = usePage<Shared>().props;
    const active = commerce?.wishlistProductIds?.includes(productId) ?? false;
    const [busy, setBusy] = useState(false);
    return <button type="button" disabled={busy} aria-label={active ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'} className={className} onClick={() => {
        if (!auth?.user) { router.visit('/dang-nhap'); return; }
        setBusy(true);
        const options = { preserveScroll: true, onFinish: () => setBusy(false) };
        if (active) router.delete(`/yeu-thich/${productId}`, options);
        else router.put(`/yeu-thich/${productId}`, {}, options);
    }}><Heart size={compact ? 16 : 14} fill={active ? 'currentColor' : 'none'}/>{!compact && (active ? 'Đã yêu thích' : 'Yêu thích')}</button>;
}
