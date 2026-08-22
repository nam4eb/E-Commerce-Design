import { useForm } from '@inertiajs/react';
import FormField from '../../Components/FormField';
import AuthLayout from '../../Layouts/AuthLayout';

export default function ForgotPassword({ status }: { status?: string }) {
    const form = useForm({ email: '' });
    return <AuthLayout title="Quên mật khẩu" description="Nhập email để nhận liên kết đặt lại mật khẩu.">{status && <p className="mb-4 text-sm text-emerald-700">{status}</p>}<form onSubmit={e => { e.preventDefault(); form.post('/quen-mat-khau'); }} className="space-y-4"><FormField label="Email" type="email" autoComplete="email" value={form.data.email} onChange={e => form.setData('email', e.target.value)} error={form.errors.email}/><button disabled={form.processing} className="h-11 w-full bg-[#0b4fa4] font-bold text-white">Gửi liên kết</button></form></AuthLayout>;
}
