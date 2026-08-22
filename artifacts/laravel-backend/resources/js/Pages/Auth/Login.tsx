import { Link, useForm } from '@inertiajs/react';
import FormField from '../../Components/FormField';
import AuthLayout from '../../Layouts/AuthLayout';

export default function Login({ status }: { status?: string }) {
    const form = useForm({ email: '', password: '', remember: false });
    return <AuthLayout title="Đăng nhập" description="Quản lý đơn hàng, địa chỉ giao hàng và sản phẩm yêu thích.">{status && <p className="mb-4 text-sm text-emerald-700">{status}</p>}<form onSubmit={e => { e.preventDefault(); form.post('/dang-nhap'); }} className="space-y-4"><FormField label="Email" type="email" autoComplete="email" value={form.data.email} onChange={e => form.setData('email', e.target.value)} error={form.errors.email}/><FormField label="Mật khẩu" type="password" autoComplete="current-password" value={form.data.password} onChange={e => form.setData('password', e.target.value)} error={form.errors.password}/><label className="flex items-center gap-2 text-sm text-[#607b98]"><input type="checkbox" checked={form.data.remember} onChange={e => form.setData('remember', e.target.checked)}/> Ghi nhớ đăng nhập</label><button disabled={form.processing} className="h-11 w-full bg-[#0b4fa4] font-bold text-white disabled:opacity-60">Đăng nhập</button></form><div className="mt-5 flex justify-between text-sm text-[#0b4fa4]"><Link href="/quen-mat-khau">Quên mật khẩu?</Link><Link href="/dang-ky">Tạo tài khoản</Link></div></AuthLayout>;
}
