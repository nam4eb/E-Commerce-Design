import type { InputHTMLAttributes } from 'react';

export default function FormField({ label, error, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
    return <label className="block text-sm font-semibold text-[#315575]">{label}<input {...props} className="mt-1.5 h-11 w-full border border-[#cdd9e6] bg-white px-3 font-normal text-[#173b68] outline-none transition focus:border-[#0b4fa4]"/>{error && <span className="mt-1 block text-xs font-normal text-[#c84b25]">{error}</span>}</label>;
}
