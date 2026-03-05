'use client';

import { useState } from 'react';
import { useToast } from './Toast';
import { Save, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import DateInput from './DateInput';

interface Doc {
    id: number;
    number: string;
    type: string;
    name: string;
    issued_date: string | null;
    category?: string;
}

interface EditDocFormProps {
    doc: Doc;
    onSuccess: () => void;
    onCancel: () => void;
}

export default function EditDocForm({ doc, onSuccess, onCancel }: EditDocFormProps) {
    const [form, setForm] = useState({
        number: doc.number,
        type: doc.type || '',
        name: doc.name,
        issued_date: doc.issued_date ? doc.issued_date.substring(0, 10) : '',
        category: doc.category || 'other'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const { addToast } = useToast();
    const router = useRouter();

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!form.category) newErrors.category = 'Vui lòng chọn phân loại văn bản';
        if (!form.number) newErrors.number = 'Số hiệu văn bản là bắt buộc';
        if (!form.type) newErrors.type = 'Loại văn bản là bắt buộc';
        if (!form.name) newErrors.name = 'Vui lòng nhập trích yếu nội dung';
        if (!form.issued_date) newErrors.issued_date = 'Vui lòng chọn năm ban hành';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const updateField = (field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => {
                const updated = { ...prev };
                delete updated[field];
                return updated;
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) {
            addToast('Vui lòng hoàn thiện các thông tin bắt buộc', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/documents/${doc.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify(form),
            });

            if (res.status === 401) {
                localStorage.removeItem('token');
                router.push('/login');
                addToast('Phiên làm việc hết hạn, vui lòng đăng nhập lại', 'error');
                return;
            }

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Lỗi khi cập nhật văn bản');
            }

            addToast('Cập nhật văn bản thành công', 'success');
            onSuccess();
        } catch (error: any) {
            addToast(error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 pb-2">
            {/* Category selection */}
            <div className="space-y-3">
                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                    Phân loại văn bản <span className="text-destructive font-black">*</span>
                    {errors.category && <span className="text-[9px] text-destructive lowercase font-bold">({errors.category})</span>}
                </label>
                <div className={`grid grid-cols-3 gap-2 p-1.5 bg-muted/50 rounded-2xl border-2 transition-all ${errors.category ? 'border-destructive/30 ring-4 ring-destructive/5' : 'border-transparent'}`}>
                    {[
                        { id: 'incoming', label: 'Công văn đến' },
                        { id: 'outgoing', label: 'Công văn đi' },
                        { id: 'other', label: 'Văn bản khác' }
                    ].map((cat) => (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => updateField('category', cat.id)}
                            className={`h-12 rounded-xl transition-all duration-150 flex items-center justify-center text-[10px] font-black uppercase tracking-wider ${form.category === cat.id
                                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]'
                                : 'text-muted-foreground hover:bg-background hover:text-foreground'
                                }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-7">
                {/* Số hiệu */}
                <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                        Số hiệu văn bản <span className="text-destructive font-black">*</span>
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={form.number}
                            onChange={e => updateField('number', e.target.value)}
                            className={`w-full h-12 px-5 rounded-2xl bg-background border-2 transition-all uppercase text-[12px] font-black outline-none ${errors.number
                                ? 'border-destructive bg-destructive/5 ring-4 ring-destructive/5'
                                : 'border-border/50 focus:border-primary focus:ring-4 focus:ring-primary/5'
                                }`}
                            placeholder="VD: 123/TB-KTĐBCL"
                        />
                        {errors.number && (
                            <p className="mt-1.5 text-[9px] font-bold text-destructive flex items-center gap-1 ml-1">
                                <AlertCircle className="w-3 h-3" /> {errors.number}
                            </p>
                        )}
                    </div>
                </div>

                {/* Loại văn bản */}
                <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                        Loại văn bản <span className="text-destructive font-black">*</span>
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={form.type}
                            onChange={e => updateField('type', e.target.value)}
                            className={`w-full h-12 px-5 rounded-2xl bg-background border-2 transition-all uppercase text-[12px] font-black outline-none ${errors.type
                                ? 'border-destructive bg-destructive/5 ring-4 ring-destructive/5'
                                : 'border-border/50 focus:border-primary focus:ring-4 focus:ring-primary/5'
                                }`}
                            placeholder="VD: TB, CV, QĐ..."
                        />
                        {errors.type && (
                            <p className="mt-1.5 text-[9px] font-bold text-destructive flex items-center gap-1 ml-1">
                                <AlertCircle className="w-3 h-3" /> {errors.type}
                            </p>
                        )}
                    </div>
                </div>

                {/* Trích yếu */}
                <div className="md:col-span-2 space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                        Trích yếu nội dung <span className="text-destructive font-black">*</span>
                    </label>
                    <div className="relative">
                        <textarea
                            value={form.name}
                            onChange={e => updateField('name', e.target.value)}
                            className={`w-full p-5 rounded-2xl bg-background border-2 transition-all text-[12px] font-bold min-h-[120px] outline-none leading-relaxed ${errors.name
                                ? 'border-destructive bg-destructive/5 ring-4 ring-destructive/5'
                                : 'border-border/50 focus:border-primary focus:ring-4 focus:ring-primary/5'
                                }`}
                            placeholder="Nhập trích yếu nội dung văn bản..."
                        />
                        {errors.name && (
                            <p className="mt-1.5 text-[9px] font-bold text-destructive flex items-center gap-1 ml-1">
                                <AlertCircle className="w-3 h-3" /> {errors.name}
                            </p>
                        )}
                    </div>
                </div>

                {/* Ngày ban hành (Smart Date Input) */}
                <div className="md:col-span-2">
                    <DateInput
                        label="Ngày ban hành"
                        required
                        value={form.issued_date || ''}
                        onChange={(val) => updateField('issued_date', val)}
                    />
                    {errors.issued_date && !form.issued_date && (
                        <p className="mt-1.5 text-[9px] font-bold text-destructive flex items-center gap-1 ml-1">
                            <AlertCircle className="w-3 h-3" /> {errors.issued_date}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex gap-4 pt-8 mt-8 border-t border-border">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 h-14 bg-muted hover:bg-muted/80 text-foreground rounded-2xl font-black transition-all text-[11px] uppercase tracking-widest"
                >
                    Hủy bỏ
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-[2] h-14 bg-primary hover:opacity-95 text-primary-foreground rounded-2xl font-black shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-3 text-[11px] uppercase tracking-widest"
                >
                    {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            <span>Lưu thay đổi</span>
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
