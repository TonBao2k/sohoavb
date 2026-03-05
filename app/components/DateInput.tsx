'use client';

import { useState, useEffect, useRef } from 'react';
import { Calendar, AlertCircle } from 'lucide-react';

interface DateInputProps {
    value: string; // YYYY-MM-DD
    onChange: (value: string) => void;
    label?: string;
    required?: boolean;
}

export default function DateInput({ value, onChange, label, required }: DateInputProps) {
    const [displayValue, setDisplayValue] = useState('');
    const [error, setError] = useState<string | null>(null);
    const datePickerRef = useRef<HTMLInputElement>(null);

    // Sync internal value (YYYY-MM-DD) to display value (DD/MM/YYYY)
    useEffect(() => {
        if (value && value.length === 10) {
            const [y, m, d] = value.split('-');
            if (y && m && d) {
                setDisplayValue(`${d}/${m}/${y}`);
                setError(null);
            }
        } else if (!value) {
            setDisplayValue('');
        }
    }, [value]);

    const isValidDate = (d: number, m: number, y: number) => {
        if (m < 1 || m > 12) return false;
        if (d < 1 || d > 31) return false;

        // Check days in month
        const daysInMonth = new Date(y, m, 0).getDate();
        if (d > daysInMonth) return false;

        // Check year range (e.g., 1900-2100)
        if (y < 1900 || y > 2100) return false;

        return true;
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let input = e.target.value.replace(/\D/g, ''); // Only digits
        let formatted = '';

        if (input.length > 0) {
            formatted += input.substring(0, 2);
            if (input.length > 2) {
                formatted += '/' + input.substring(2, 4);
                if (input.length > 4) {
                    formatted += '/' + input.substring(4, 8);
                }
            }
        }

        setDisplayValue(formatted);

        if (input.length === 8) {
            const d = parseInt(input.substring(0, 2));
            const m = parseInt(input.substring(2, 4));
            const y = parseInt(input.substring(4, 8));

            if (isValidDate(d, m, y)) {
                const isoDate = `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
                onChange(isoDate);
                setError(null);
            } else {
                setError('Ngày không hợp lệ. Vui lòng nhập theo định dạng dd/mm/yyyy.');
            }
        } else if (input.length > 0 && input.length < 8) {
            setError(null); // Clear error while typing, but don't call onChange yet
        } else if (input.length === 0) {
            onChange('');
            setError(null);
        }
    };

    const handleNativeDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value; // YYYY-MM-DD
        if (newVal) {
            onChange(newVal);
            setError(null);
        }
    };

    return (
        <div className="space-y-2">
            {label && (
                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                    {label} {required && <span className="text-destructive font-black">*</span>}
                </label>
            )}
            <div className="relative group">
                <input
                    type="text"
                    value={displayValue}
                    onChange={handleTextChange}
                    placeholder="dd/mm/yyyy"
                    maxLength={10}
                    className={`w-full h-12 px-5 rounded-2xl bg-background border-2 transition-all text-[12px] font-black outline-none ${error
                            ? 'border-destructive bg-destructive/5 ring-4 ring-destructive/5'
                            : 'border-border/50 focus:border-primary focus:ring-4 focus:ring-primary/5'
                        }`}
                />

                {/* Calendar Icon & Hidden Native Picker */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
                    <button
                        type="button"
                        onClick={() => datePickerRef.current?.showPicker()}
                        className={`p-1.5 rounded-lg hover:bg-muted transition-colors ${error ? 'text-destructive' : 'text-muted-foreground'}`}
                    >
                        <Calendar className="w-4 h-4" />
                    </button>
                    <input
                        type="date"
                        ref={datePickerRef}
                        value={value}
                        onChange={handleNativeDateChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer pointer-events-none"
                        style={{ visibility: 'hidden', position: 'absolute' }}
                    />
                    {/* Note: In modern browsers, we can use showPicker() on the input ref. 
                We keep the input hidden but accessible via the button click. */}
                </div>

                {error && (
                    <p className="mt-1.5 text-[9px] font-bold text-destructive flex items-center gap-1 ml-1 animate-in slide-in-from-top-1 duration-200">
                        <AlertCircle className="w-3 h-3" /> {error}
                    </p>
                )}
            </div>
        </div>
    );
}
