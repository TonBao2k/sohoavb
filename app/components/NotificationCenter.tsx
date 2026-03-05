'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Check, X, FileText, User, Clock, CheckCircle2, MessageSquare, ArrowRight } from 'lucide-react';
import { useToast } from './Toast';

interface Notification {
    id: number;
    user_id: number;
    sender_id: number;
    doc_id: number | null;
    type: 'share_request' | 'share_accepted' | 'share_rejected' | 'system';
    message: string;
    is_read: boolean;
    created_at: string;
    sender_username?: string;
    doc_number?: string;
    doc_name?: string;
}

export default function NotificationCenter() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { addToast } = useToast();

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/notifications', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            }
        } catch (error) {
            console.error('Fetch notifications error:', error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id: number) => {
        try {
            const res = await fetch('/api/notifications', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ id })
            });
            if (res.ok) {
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            }
        } catch (error) {
            console.error('Mark as read error:', error);
        }
    };

    const handleAction = async (notificationId: number, action: 'accept' | 'reject') => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/notifications/actions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ notificationId, action })
            });
            const data = await res.json();
            if (res.ok) {
                addToast(action === 'accept' ? 'Đã nhận văn bản thành công' : 'Đã từ chối văn bản', 'success');
                // Refresh list
                fetchNotifications();
                // If the app has a global refresh listener, we should trigger it here
                if (window) window.dispatchEvent(new CustomEvent('refresh-docs'));
            } else {
                addToast(data.error || 'Thao tác thất bại', 'error');
            }
        } catch (error) {
            addToast('Lỗi khi thực hiện thao tác', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2.5 rounded-xl border border-border shadow-sm shadow-black/5 hover:bg-muted transition-all relative group ${isOpen ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}
            >
                <Bell className={`w-5 h-5 transition-transform group-hover:rotate-12 ${unreadCount > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-black rounded-full flex items-center justify-center ring-4 ring-background animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-[400px] bg-card border border-border shadow-2xl rounded-3xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-6 border-b border-border bg-muted/20 flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                Thông báo
                                {unreadCount > 0 && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-lg">{unreadCount} mới</span>}
                            </h3>
                            <p className="text-[10px] font-bold text-muted-foreground mt-0.5">Yêu cầu chia sẻ & cập nhật hệ thống</p>
                        </div>
                        <button
                            onClick={() => {
                                fetch('/api/notifications', {
                                    method: 'PATCH',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        Authorization: `Bearer ${localStorage.getItem('token')}`
                                    },
                                    body: JSON.stringify({ all: true })
                                }).then(() => setNotifications(prev => prev.map(n => ({ ...n, is_read: true }))));
                            }}
                            className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest"
                        >
                            Đã đọc tất cả
                        </button>
                    </div>

                    <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Bell className="w-8 h-8 text-muted-foreground/20" />
                                </div>
                                <p className="text-sm font-bold text-muted-foreground">Chưa có thông báo nào</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border/50">
                                {notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        className={`p-5 transition-colors cursor-default relative ${n.is_read ? 'opacity-80' : 'bg-primary/5'}`}
                                        onClick={() => !n.is_read && markAsRead(n.id)}
                                    >
                                        {!n.is_read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />}

                                        <div className="flex gap-4">
                                            <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center shadow-sm ${n.type === 'share_request' ? 'bg-primary/10 text-primary' :
                                                    n.type === 'share_accepted' ? 'bg-success/10 text-success' :
                                                        'bg-muted text-muted-foreground'
                                                }`}>
                                                {n.type === 'share_request' ? <FileText className="w-5 h-5" /> :
                                                    n.type === 'share_accepted' ? <CheckCircle2 className="w-5 h-5" /> :
                                                        <Bell className="w-5 h-5" />}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <User className="w-3 h-3 text-muted-foreground shrink-0" />
                                                        <span className="text-[11px] font-black text-foreground truncate uppercase tracking-tight">{n.sender_username}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-muted-foreground shrink-0 ml-2">
                                                        <Clock className="w-3 h-3" />
                                                        <span className="text-[9px] font-bold">
                                                            {new Date(n.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>

                                                <p className="text-[12px] font-bold text-foreground leading-relaxed mb-3">{n.message}</p>

                                                {n.type === 'share_request' && !n.is_read && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            disabled={isLoading}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleAction(n.id, 'accept');
                                                            }}
                                                            className="h-9 px-4 bg-primary text-primary-foreground rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:opacity-90 shadow-lg shadow-primary/20 transition-all flex-1"
                                                        >
                                                            <Check className="w-3.5 h-3.5" />
                                                            Nhận
                                                        </button>
                                                        <button
                                                            disabled={isLoading}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleAction(n.id, 'reject');
                                                            }}
                                                            className="h-9 px-4 bg-muted text-foreground rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-border transition-all flex-1"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                            Từ chối
                                                        </button>
                                                    </div>
                                                )}

                                                {n.doc_number && (
                                                    <div className="mt-2 text-[9px] font-black text-muted-foreground flex items-center gap-1.5 bg-muted/30 w-fit px-2 py-1 rounded-md">
                                                        <span className="text-primary/70">{n.doc_number}</span>
                                                        <ArrowRight className="w-2.5 h-2.5 opacity-30" />
                                                        <span className="truncate max-w-[150px]">{n.doc_name}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
