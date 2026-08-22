import { useForm } from '@inertiajs/react';
import FormField from '../../Components/FormField';
import AuthLayout from '../../Layouts/AuthLayout';

export default function ResetPassword({ token, email }: { token: string; email: string }) {
    const form = useForm({ token, email, password: '', password_confirmation: '' });
    return <AuthLayout title="Đặt lại mật khẩu" description="Tạo mật khẩu mới cho tài khoản của bạn."><form onSubmit={e => { e.preventDefault(); form.post('/dat-lai-mat-khau'); }} className="space-y-4"><FormField label="Email" type="email" value={form.data.email} onChange={e => form.setData('email', e.target.value)} error={form.errors.email}/><FormField label="Mật khẩu mới" type="password" autoComplete="new-password" value={form.data.password} onChange={e => form.setData('password', e.target.value)} error={form.errors.password}/><FormField label="Xác nhận mật khẩu" type="password" autoComplete="new-password" value={form.data.password_confirmation} onChange={e => form.setData('password_confirmation', e.target.value)}/><button disabled={form.processing} className="h-11 w-full bg-[#0b4fa4] font-bold text-white">Lưu mật khẩu</button></form></AuthLayout>;
}
