'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '../components/Toast';
import { FileText, Lock, User, LogIn, ShieldCheck } from 'lucide-react';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToast();
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('token', data.token);
                addToast('Đăng nhập thành công!', 'success');
                router.push('/');
            } else {
                addToast(data.error || 'Sai tài khoản hoặc mật khẩu', 'error');
            }
        } catch (error) {
            addToast('Lỗi kết nối máy chủ', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4 sm:p-6">
            <div className="relative w-full max-w-md animate-in">
                {/* Decorative background blur */}
                <div className="absolute -top-12 -left-12 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl" />

                <div className="relative bg-card p-8 sm:p-10 rounded-3xl shadow-2xl shadow-black/5 ring-1 ring-border border border-border">
                    <div className="flex flex-col items-center gap-6 mb-12">
                        <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/30 ring-8 ring-primary/5">
                            <ShieldCheck className="w-10 h-10 text-primary-foreground" />
                        </div>
                        <div className="text-center space-y-2">
                            <h2 className="text-xl font-black text-foreground tracking-tight uppercase leading-tight">
                                Hệ thống quản lý văn bản
                            </h2>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-60">
                                Trung tâm KT&ĐBCLGD
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tên đăng nhập</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full h-14 pl-12 pr-4 bg-muted border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary transition-all placeholder:font-medium"
                                    placeholder="admin..."
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Mật khẩu</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full h-14 pl-12 pr-4 bg-muted border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary transition-all placeholder:font-medium"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14 bg-primary hover:opacity-90 text-primary-foreground rounded-2xl font-black shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-3 group mt-4"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>ĐĂNG NHẬP</span>
                                    <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        Hệ thống số hóa văn bản hành chính
                    </p>
                </div>
            </div>
        </div>
    );
}