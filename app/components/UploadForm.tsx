'use client';

import { useState, useRef } from 'react';
import { useToast } from './Toast';
import { Trash2, Calendar, File, AlertCircle, Upload, Send, CheckCircle2, History } from 'lucide-react';
import { useRouter } from 'next/navigation';
import DateInput from './DateInput';

interface FileData {
  file: File;
  number: string;
  type: string;
  name: string;
  issuedDate: string;
  category: 'incoming' | 'outgoing' | 'other';
}

interface UploadFormProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function UploadForm({ onSuccess, onCancel }: UploadFormProps) {
  const [filesData, setFilesData] = useState<FileData[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<number, Record<string, string>>>({});
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const handleFileChange = (files: FileList | null) => {
    if (!files) return;
    const newFilesData: FileData[] = Array.from(files).map(file => {
      const fileName = file.name.replace(/\.[^/.]+$/, '');
      const parts = fileName.split(' ');
      return {
        file,
        type: parts[0]?.toUpperCase() || '',
        number: parts[1] || '',
        name: parts.slice(2).join(' ') || '',
        issuedDate: '',
        category: 'other',
      };
    });
    const updated = [...filesData, ...newFilesData];
    setFilesData(updated);
    if (selectedIndex === null) setSelectedIndex(filesData.length);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const updated = filesData.filter((_, i) => i !== index);
    setFilesData(updated);
    if (selectedIndex === index) {
      setSelectedIndex(updated.length > 0 ? 0 : null);
    } else if (selectedIndex !== null && selectedIndex > index) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const validate = (index: number) => {
    const data = filesData[index];
    const newErrors: Record<string, string> = {};

    if (!data.category) newErrors.category = 'Vui lòng chọn phân loại văn bản';
    if (!data.number) newErrors.number = 'Số hiệu văn bản là bắt buộc';
    if (!data.type) newErrors.type = 'Loại văn bản là bắt buộc';
    if (!data.name) newErrors.name = 'Vui lòng nhập trích yếu nội dung';
    if (!data.issuedDate) newErrors.issuedDate = 'Vui lòng chọn năm ban hành';

    setErrors(prev => ({ ...prev, [index]: newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const validateAll = () => {
    let firstErrorIndex: number | null = null;
    const allErrors: Record<number, Record<string, string>> = {};

    filesData.forEach((data, index) => {
      const fieldErrors: Record<string, string> = {};
      if (!data.category) fieldErrors.category = 'Vui lòng chọn phân loại văn bản';
      if (!data.number) fieldErrors.number = 'Số hiệu văn bản là bắt buộc';
      if (!data.type) fieldErrors.type = 'Loại văn bản là bắt buộc';
      if (!data.name) fieldErrors.name = 'Vui lòng nhập trích yếu nội dung';
      if (!data.issuedDate) fieldErrors.issuedDate = 'Vui lòng chọn năm ban hành';

      if (Object.keys(fieldErrors).length > 0) {
        allErrors[index] = fieldErrors;
        if (firstErrorIndex === null) firstErrorIndex = index;
      }
    });

    setErrors(allErrors);
    return firstErrorIndex;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filesData.length) {
      addToast('Vui lòng chọn ít nhất một file', 'error');
      return;
    }

    const errorIndex = validateAll();
    if (errorIndex !== null) {
      setSelectedIndex(errorIndex);
      addToast('Vui lòng hoàn thiện thông tin bắt buộc', 'error');

      // Scroll to error field after a short delay to allow tab switching/render
      setTimeout(() => {
        const firstErrorField = formRef.current?.querySelector('.border-destructive');
        if (firstErrorField) {
          firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;

    try {
      for (const data of filesData) {
        const formData = new FormData();
        formData.append('file', data.file);
        formData.append('number', data.number);
        formData.append('type', data.type || '');
        formData.append('name', data.name);
        formData.append('category', data.category);
        if (data.issuedDate) formData.append('issued_date', data.issuedDate);

        const res = await fetch('/api/documents', {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          body: formData,
        });
        if (res.status === 401) {
          localStorage.removeItem('token');
          router.push('/login');
          addToast('Phiên làm việc hết hạn, vui lòng đăng nhập lại', 'error');
          return;
        }
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || `Lỗi upload: ${data.file.name}`);
        }
        successCount++;
      }
      addToast(`Đã tải lên ${successCount} văn bản thành công`, 'success');
      onSuccess();
    } catch (error: any) {
      addToast(error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFileData = (index: number, field: keyof FileData, value: string) => {
    setFilesData(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
    // Clear error for this field
    if (errors[index]?.[field]) {
      setErrors(prev => {
        const newFileErrors = { ...prev[index] };
        delete newFileErrors[field];
        return { ...prev, [index]: newFileErrors };
      });
    }
  };

  const isComplete = (index: number) => {
    const data = filesData[index];
    return data && data.number && data.name && data.category && data.type && data.issuedDate;
  };

  const isFormValid = filesData.length > 0 && filesData.every((_, i) => isComplete(i));

  if (filesData.length === 0) {
    return (
      <div className="space-y-6">
        <div
          className="relative group border-2 border-dashed border-border hover:border-primary/50 rounded-3xl p-16 transition-all bg-muted/30 cursor-pointer flex flex-col items-center gap-6 hover:bg-muted/50"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            multiple
            ref={fileInputRef}
            onChange={e => handleFileChange(e.target.files)}
            className="hidden"
          />
          <div className="w-24 h-24 bg-card rounded-3xl flex items-center justify-center shadow-2xl shadow-black/5 group-hover:scale-110 transition-transform ring-1 ring-border">
            <Upload className="w-12 h-12 text-primary" />
          </div>
          <div className="text-center">
            <h4 className="text-xl font-black text-foreground mb-2">Bắt đầu tải văn bản mới</h4>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest opacity-60">PDF, DOC, DOCX (Tối đa 20MB)</p>
          </div>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full h-14 bg-muted hover:bg-muted/80 text-foreground rounded-2xl font-black transition-all"
          >
            Hủy bỏ
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[75vh]">
      <div className="flex flex-1 min-h-0 flex-col lg:flex-row gap-0">
        {/* Left Column: File List (30%) */}
        <div className="w-full lg:w-[30%] flex flex-col gap-4 pr-0 lg:pr-8 border-r-0 lg:border-r border-border mb-6 lg:mb-0">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Danh sách file ({filesData.length})</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider rounded-lg hover:bg-primary/20 transition-all"
            >
              + Thêm file
            </button>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              multiple
              ref={fileInputRef}
              onChange={e => handleFileChange(e.target.files)}
              className="hidden"
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar max-h-[200px] lg:max-h-none">
            {filesData.map((data, index) => {
              const fileErrors = errors[index] || {};
              const hasError = Object.keys(fileErrors).length > 0;

              return (
                <div
                  key={index}
                  onClick={() => setSelectedIndex(index)}
                  className={`group relative p-4 rounded-2xl border transition-all cursor-pointer ${selectedIndex === index
                    ? 'border-primary bg-primary/5 shadow-md shadow-primary/5'
                    : 'border-border/50 bg-background hover:border-primary/30'
                    } ${hasError ? 'border-destructive/50 bg-destructive/5' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${isComplete(index) ? 'bg-emerald-500' : hasError ? 'bg-destructive animate-pulse' : 'bg-amber-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-foreground truncate">{data.file.name}</p>
                      <p className="text-[10px] font-black text-muted-foreground uppercase opacity-50">{(data.file.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button
                      onClick={(e) => removeFile(e, index)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Form (70%) */}
        <div ref={formRef} className="flex-1 pl-0 lg:pl-10 overflow-y-auto custom-scrollbar">
          {selectedIndex !== null ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 pb-4">
              {/* File Info Header */}
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-2xl border border-border/50">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center ring-1 ring-primary/20 shrink-0">
                  <File className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-black text-foreground truncate" title={filesData[selectedIndex].file.name}>
                    {filesData[selectedIndex].file.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {isComplete(selectedIndex) ? (
                      <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-tighter">
                        <CheckCircle2 className="w-3 h-3" /> Tất cả thông tin đã hợp lệ
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[10px] font-black text-amber-600 uppercase tracking-tighter">
                        <AlertCircle className="w-3 h-3" /> Vui lòng nhập đầy đủ thông tin bắt buộc
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Segmented Control Category */}
              <div className="space-y-3">
                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                  Phân loại văn bản <span className="text-destructive font-black">*</span>
                  {errors[selectedIndex]?.category && <span className="text-[9px] text-destructive lowercase font-bold">({errors[selectedIndex].category})</span>}
                </label>
                <div className={`grid grid-cols-3 gap-2 p-1.5 bg-muted/50 rounded-2xl border-2 transition-all ${errors[selectedIndex]?.category ? 'border-destructive/30 ring-4 ring-destructive/5' : 'border-transparent'}`}>
                  {[
                    { id: 'incoming', label: 'Công văn đến' },
                    { id: 'outgoing', label: 'Công văn đi' },
                    { id: 'other', label: 'Văn bản khác' }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => updateFileData(selectedIndex, 'category', cat.id as any)}
                      className={`h-12 rounded-xl transition-all duration-150 flex items-center justify-center text-[10px] font-black uppercase tracking-wider ${filesData[selectedIndex].category === cat.id
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]'
                        : 'text-muted-foreground hover:bg-background hover:text-foreground'
                        }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {/* Số hiệu */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                    Số hiệu văn bản <span className="text-destructive font-black">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={filesData[selectedIndex].number}
                      onChange={e => updateFileData(selectedIndex, 'number', e.target.value)}
                      className={`w-full h-12 px-5 rounded-2xl bg-background border-2 transition-all uppercase text-[12px] font-black outline-none ${errors[selectedIndex]?.number
                        ? 'border-destructive bg-destructive/5 ring-4 ring-destructive/5'
                        : 'border-border/50 focus:border-primary focus:ring-4 focus:ring-primary/5'
                        }`}
                      placeholder="VD: 123/TB-KTĐBCL"
                    />
                    {errors[selectedIndex]?.number && (
                      <p className="mt-1.5 text-[9px] font-bold text-destructive flex items-center gap-1 ml-1">
                        <AlertCircle className="w-3 h-3" /> {errors[selectedIndex].number}
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
                      value={filesData[selectedIndex].type}
                      onChange={e => updateFileData(selectedIndex, 'type', e.target.value)}
                      className={`w-full h-12 px-5 rounded-2xl bg-background border-2 transition-all uppercase text-[12px] font-black outline-none ${errors[selectedIndex]?.type
                        ? 'border-destructive bg-destructive/5 ring-4 ring-destructive/5'
                        : 'border-border/50 focus:border-primary focus:ring-4 focus:ring-primary/5'
                        }`}
                      placeholder="VD: TB, CV, QĐ..."
                    />
                    {errors[selectedIndex]?.type && (
                      <p className="mt-1.5 text-[9px] font-bold text-destructive flex items-center gap-1 ml-1">
                        <AlertCircle className="w-3 h-3" /> {errors[selectedIndex].type}
                      </p>
                    )}
                  </div>
                </div>

                {/* Trích yếu */}
                <div className="col-span-1 md:col-span-2 space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                    Trích yếu nội dung <span className="text-destructive font-black">*</span>
                  </label>
                  <div className="relative">
                    <textarea
                      value={filesData[selectedIndex].name}
                      onChange={e => updateFileData(selectedIndex, 'name', e.target.value)}
                      className={`w-full p-5 rounded-2xl bg-background border-2 transition-all text-[12px] font-bold min-h-[120px] outline-none leading-relaxed ${errors[selectedIndex]?.name
                        ? 'border-destructive bg-destructive/5 ring-4 ring-destructive/5'
                        : 'border-border/50 focus:border-primary focus:ring-4 focus:ring-primary/5'
                        }`}
                      placeholder="Nhập trích yếu nội dung văn bản..."
                    />
                    {errors[selectedIndex]?.name && (
                      <p className="mt-1.5 text-[9px] font-bold text-destructive flex items-center gap-1 ml-1">
                        <AlertCircle className="w-3 h-3" /> {errors[selectedIndex].name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Năm ban hành (Smart Date Input) */}
                <div className="col-span-1 md:col-span-2">
                  <DateInput
                    label="Ngày ban hành"
                    required
                    value={filesData[selectedIndex].issuedDate}
                    onChange={(val) => updateFileData(selectedIndex, 'issuedDate', val)}
                  />
                  {errors[selectedIndex]?.issuedDate && !filesData[selectedIndex].issuedDate && (
                    <p className="mt-1.5 text-[9px] font-bold text-destructive flex items-center gap-1 ml-1">
                      <AlertCircle className="w-3 h-3" /> {errors[selectedIndex].issuedDate}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-muted/10 rounded-3xl border-2 border-dashed border-border/50">
              <div className="w-20 h-20 bg-background rounded-full flex items-center justify-center shadow-sm mb-6">
                <File className="w-10 h-10 text-muted-foreground opacity-20" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50">Chọn file từ danh sách bên trái để hoàn thiện thông tin</p>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="flex gap-4 pt-8 mt-8 border-t border-border shrink-0">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-8 h-14 bg-muted hover:bg-muted/80 text-foreground rounded-2xl font-black transition-all text-[11px] uppercase tracking-widest"
          >
            Hủy bỏ
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || filesData.length === 0}
          className={`flex-1 h-14 rounded-2xl font-black transition-all flex items-center justify-center gap-3 group text-[11px] uppercase tracking-widest shadow-xl ${isFormValid
            ? 'bg-primary text-primary-foreground shadow-primary/20 hover:opacity-95'
            : 'bg-muted text-muted-foreground cursor-not-allowed opacity-70'
            }`}
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <>
              <Send className={`w-4 h-4 transition-transform ${isFormValid ? 'group-hover:translate-x-1 group-hover:-translate-y-1' : ''}`} />
              <span>XÁC NHẬN LƯU VĂN BẢN ({filesData.length})</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}