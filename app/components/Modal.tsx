'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    maxWidth?: string;
    noScroll?: boolean;
}

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl', noScroll = false }: ModalProps) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShow(true);
            document.body.style.overflow = 'hidden';
        } else {
            const timer = setTimeout(() => setShow(false), 200);
            document.body.style.overflow = 'unset';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isOpen && !show) return null;

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
            <div
                className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div
                className={`relative w-full ${maxWidth} bg-card rounded-3xl shadow-2xl ring-1 ring-border border border-border transform transition-all duration-200 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
            >
                <div className="flex items-center justify-between px-8 py-6 border-b border-border">
                    <h3 className="text-xl font-black text-foreground tracking-tight">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className={`p-8 ${noScroll ? '' : 'max-h-[calc(100vh-12rem)] overflow-y-auto custom-scrollbar'}`}>
                    {children}
                </div>
            </div>
        </div>
    );
}
