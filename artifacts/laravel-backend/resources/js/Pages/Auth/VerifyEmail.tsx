import { router } from '@inertiajs/react';
import AuthLayout from '../../Layouts/AuthLayout';

export default function VerifyEmail({ status }: { status?: string }) {
    return <AuthLayout title="Xác minh email" description="Vui lòng mở liên kết đã gửi tới email để bảo vệ tài khoản.">{status === 'verification-link-sent' && <p className="mb-4 text-sm text-emerald-700">Đã gửi một liên kết xác minh mới.</p>}<button onClick={() => router.post('/xac-minh-email/gui-lai')} className="h-11 w-full bg-[#0b4fa4] font-bold text-white">Gửi lại email xác minh</button><button onClick={() => router.post('/dang-xuat')} className="mt-3 h-11 w-full border border-[#cdd9e6] font-semibold text-[#315575]">Đăng xuất</button></AuthLayout>;
}
