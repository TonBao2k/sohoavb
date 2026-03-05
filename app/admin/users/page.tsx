'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../components/Toast';
import { Trash2, Edit, UserPlus, User, Mail, Shield, ArrowLeft, Search, ListFilter, ChevronDown, ArrowUpDown, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { useMemo } from 'react';
import Modal from '../../components/Modal';

interface User {
    id: number;
    username: string;
    full_name: string;
    email: string;
    role: 'admin' | 'user';
    created_at: string;
}

export default function UserManagement() {
    const [users, setUsers] = useState<User[]>([]);
    const [filters, setFilters] = useState({
        full_name: '',
        username: '',
        email: '',
        role: ''
    });
    const [sortConfig, setSortConfig] = useState<{
        field: keyof User;
        order: 'asc' | 'desc';
    }>({ field: 'created_at', order: 'desc' });
    const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

    const [form, setForm] = useState({ id: 0, username: '', full_name: '', email: '', role: 'user' as 'admin' | 'user', password: '' });
    const [isEdit, setIsEdit] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [currentUser, setCurrentUser] = useState<{ id: number; username: string; role: string } | null>(null);
    const { addToast } = useToast();
    const router = useRouter();

    const handleUnauthorized = useCallback(() => {
        localStorage.removeItem('token');
        setCurrentUser(null);
        router.push('/login');
        addToast('Phiên làm việc hết hạn, vui lòng đăng nhập lại', 'error');
    }, [router, addToast]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }
        try {
            const decoded = jwtDecode<{ id: number; username: string; role: string }>(token);
            if (decoded.role !== 'admin') {
                addToast('Chỉ admin có quyền truy cập trang này', 'error');
                router.push('/');
                return;
            }
            setCurrentUser(decoded);
        } catch (error) {
            localStorage.removeItem('token');
            router.push('/login');
        }
    }, [router, addToast]);

    useEffect(() => {
        if (currentUser && currentUser.role === 'admin') {
            fetchUsers();
        }
    }, [currentUser]);

    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            if (res.status === 401) {
                handleUnauthorized();
                return;
            }
            if (!res.ok) throw new Error('Lỗi tải dữ liệu');
            const data = await res.json();
            setUsers(data);
        } catch (error: any) {
            addToast('Không thể tải danh sách tài khoản!', 'error');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = isEdit ? `/api/users/${form.id}` : '/api/users';
            const method = isEdit ? 'PUT' : 'POST';
            const body = isEdit ? { ...form, password: form.password || undefined } : form;

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify(body),
            });
            if (res.status === 401) {
                handleUnauthorized();
                return;
            }
            if (!res.ok) throw new Error('Lỗi lưu tài khoản');

            addToast(isEdit ? 'Cập nhật thành công!' : 'Tạo tài khoản thành công!', 'success');
            fetchUsers();
            setShowModal(false);
            setForm({ id: 0, username: '', full_name: '', email: '', role: 'user', password: '' });
            setIsEdit(false);
        } catch (error: any) {
            addToast(error.message, 'error');
        }
    };

    const handleEdit = (user: User) => {
        setForm({ ...user, password: '' });
        setIsEdit(true);
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Xóa tài khoản này? Các văn bản liên quan sẽ bị xóa.')) return;
        try {
            const res = await fetch(`/api/users/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            if (res.status === 401) {
                handleUnauthorized();
                return;
            }
            if (!res.ok) throw new Error('Lỗi xóa tài khoản');
            addToast('Xóa tài khoản thành công!', 'success');
            fetchUsers();
        } catch (error: any) {
            addToast(error.message, 'error');
        }
    };

    const filteredUsers = useMemo(() => {
        let res = [...users];

        if (filters.full_name) {
            const q = filters.full_name.toLowerCase();
            res = res.filter(u => (u.full_name || '').toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q));
        }
        if (filters.email) {
            const q = filters.email.toLowerCase();
            res = res.filter(u => (u.email || '').toLowerCase().includes(q));
        }
        if (filters.role) {
            res = res.filter(u => u.role === filters.role);
        }

        res.sort((a, b) => {
            let av = a[sortConfig.field] || '';
            let bv = b[sortConfig.field] || '';
            if (typeof av === 'string' && typeof bv === 'string') {
                if (av.toLowerCase() < bv.toLowerCase()) return sortConfig.order === 'asc' ? -1 : 1;
                if (av.toLowerCase() > bv.toLowerCase()) return sortConfig.order === 'asc' ? 1 : -1;
            }
            return 0;
        });

        return res;
    }, [users, filters, sortConfig]);

    const sort = (field: keyof User) => {
        setSortConfig(prev => ({
            field,
            order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handleFilterChange = (field: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    if (!currentUser) return null;

    return (
        <div className="min-h-screen bg-background p-8 sm:p-12 transition-colors">
            <div className="max-w-6xl mx-auto space-y-8">
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                        <button
                            onClick={() => router.push('/')}
                            className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors mb-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Quay lại Dashboard
                        </button>
                        <h2 className="text-3xl font-black text-foreground tracking-tight">Quản lý tài khoản</h2>
                        <p className="text-muted-foreground font-medium">Quản trị viên và người dùng hệ thống</p>
                    </div>
                    <button
                        onClick={() => { setIsEdit(false); setForm({ id: 0, username: '', full_name: '', email: '', role: 'user', password: '' }); setShowModal(true); }}
                        className="flex items-center gap-2 px-6 h-12 bg-primary hover:opacity-90 text-primary-foreground rounded-xl font-black shadow-lg shadow-primary/20 transition-all"
                    >
                        <UserPlus className="w-4 h-4" />
                        Thêm tài khoản
                    </button>
                </header>

                <div className="bg-card rounded-3xl border border-border shadow-sm shadow-black/5 overflow-hidden animate-in">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-muted/50 border-b border-border">
                                <tr>
                                    {(['full_name', 'email', 'role'] as const).map(f => (
                                        <th
                                            key={f}
                                            onClick={() => sort(f)}
                                            className="p-8 pb-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-primary transition-all group/h"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <span className={`${sortConfig.field === f ? 'text-primary' : ''} transition-colors`}>
                                                    {f === 'full_name' && 'Người dùng'}
                                                    {f === 'email' && 'Email'}
                                                    {f === 'role' && 'Vai trò'}
                                                </span>
                                                <div className={`transition-all ${sortConfig.field === f ? 'opacity-100' : 'opacity-0 group-hover/h:opacity-50'}`}>
                                                    {sortConfig.field === f ? (
                                                        sortConfig.order === 'asc' ? <ArrowUpDown className="w-3.5 h-3.5 text-primary rotate-180 transition-transform" /> : <ArrowUpDown className="w-3.5 h-3.5 text-primary" />
                                                    ) : (
                                                        <ArrowUpDown className="w-3.5 h-3.5" />
                                                    )}
                                                </div>
                                            </div>
                                        </th>
                                    ))}
                                    <th className="p-8 pb-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Tác vụ</th>
                                </tr>
                                <tr className="bg-muted/20 border-b border-border/50">
                                    <th className="p-4 px-8">
                                        <div className="relative group/f">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within/f:text-primary transition-colors" />
                                            <input
                                                type="text"
                                                placeholder="Lọc tên/username..."
                                                value={filters.full_name}
                                                onChange={e => {
                                                    handleFilterChange('full_name', e.target.value);
                                                    handleFilterChange('username', e.target.value);
                                                }}
                                                className="w-full h-10 pl-9 pr-3 rounded-xl bg-background border border-border/60 text-xs font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:font-medium placeholder:text-muted-foreground/60 shadow-sm"
                                            />
                                        </div>
                                    </th>
                                    <th className="p-4 px-8">
                                        <div className="relative group/f">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within/f:text-primary transition-colors" />
                                            <input
                                                type="text"
                                                placeholder="Lọc email..."
                                                value={filters.email}
                                                onChange={e => handleFilterChange('email', e.target.value)}
                                                className="w-full h-10 pl-9 pr-3 rounded-xl bg-background border border-border/60 text-xs font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:font-medium placeholder:text-muted-foreground/60 shadow-sm"
                                            />
                                        </div>
                                    </th>
                                    <th className="p-4 px-8">
                                        <div className="relative">
                                            <ListFilter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                                            <select
                                                value={filters.role}
                                                onChange={e => handleFilterChange('role', e.target.value)}
                                                className="w-full h-10 pl-9 pr-8 appearance-none rounded-xl bg-background border border-border/60 text-xs font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm cursor-pointer"
                                            >
                                                <option value="">Tất cả vai trò</option>
                                                <option value="user">USER</option>
                                                <option value="admin">ADMIN</option>
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                                        </div>
                                    </th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="group hover:bg-primary/[0.02] border-b border-border/50 last:border-0 transition-all">
                                        <td className="p-8">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold uppercase ring-1 ring-primary/20 shadow-sm">
                                                    {user.username.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-black text-foreground">{user.full_name}</p>
                                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight">@{user.username}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-8 text-sm font-bold text-muted-foreground">{user.email}</td>
                                        <td className="p-8">
                                            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm transition-all ${user.role === 'admin'
                                                ? 'bg-primary/10 text-primary border-primary/20'
                                                : 'bg-muted/50 text-muted-foreground border-border/10'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="p-8 text-right">
                                            <div className="flex justify-end relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveMenuId(activeMenuId === user.id ? null : user.id);
                                                    }}
                                                    className={`p-2.5 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-sm border border-border/50 ${activeMenuId === user.id ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted text-muted-foreground'
                                                        }`}
                                                    title="Tác vụ"
                                                >
                                                    <Menu className="w-5 h-5" />
                                                </button>

                                                {activeMenuId === user.id && (
                                                    <div
                                                        className="absolute right-0 top-full mt-2 w-48 bg-white border border-border shadow-2xl rounded-2xl py-2 z-[100] animate-in fade-in zoom-in-95 duration-200 shadow-primary/10"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <button
                                                            onClick={() => {
                                                                handleEdit(user);
                                                                setActiveMenuId(null);
                                                            }}
                                                            className="w-full px-4 py-2.5 text-left text-sm font-bold text-foreground hover:bg-primary/5 flex items-center gap-3 transition-colors"
                                                        >
                                                            <Edit className="w-4 h-4 text-primary" />
                                                            Chỉnh sửa
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                handleDelete(user.id);
                                                                setActiveMenuId(null);
                                                            }}
                                                            className="w-full px-4 py-2.5 text-left text-sm font-bold text-destructive hover:bg-destructive/5 flex items-center gap-3 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                            Xóa tài khoản
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={isEdit ? 'Cập nhật tài khoản' : 'Thêm tài khoản mới'}
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tên đăng nhập</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={form.username}
                                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-muted border-none text-sm font-bold focus:ring-2 focus:ring-primary transition-all"
                                    required
                                    disabled={isEdit}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Họ và tên</label>
                            <input
                                type="text"
                                value={form.full_name}
                                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                                className="w-full h-11 px-4 rounded-xl bg-muted border-none text-sm font-bold focus:ring-2 focus:ring-primary transition-all"
                                required
                            />
                        </div>
                        <div className="sm:col-span-2 space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email công vụ</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-muted border-none text-sm font-bold focus:ring-2 focus:ring-primary transition-all"
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Mật khẩu</label>
                            <input
                                type="password"
                                value={form.password}
                                placeholder={isEdit ? 'Để trống nếu không đổi' : 'Nhập mật khẩu'}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                className="w-full h-11 px-4 rounded-xl bg-muted border-none text-sm font-bold focus:ring-2 focus:ring-primary transition-all"
                                required={!isEdit}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Vai trò hệ thống</label>
                            <div className="relative">
                                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <select
                                    value={form.role}
                                    onChange={(e) => setForm({ ...form, role: e.target.value as 'admin' | 'user' })}
                                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-muted border-none text-sm font-bold focus:ring-2 focus:ring-primary transition-all appearance-none"
                                >
                                    <option value="user">User - Người dùng</option>
                                    <option value="admin">Admin - Quản trị viên</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="w-full h-12 bg-primary hover:opacity-90 text-primary-foreground rounded-xl font-black shadow-lg shadow-primary/20 transition-all mt-4"
                    >
                        {isEdit ? 'Lưu cập nhật' : 'Tạo tài khoản'}
                    </button>
                </form>
            </Modal>
        </div>
    );
}