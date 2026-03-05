'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, UserPlus, Check, X, Users } from 'lucide-react';

interface User {
    id: number;
    username: string;
    full_name: string;
    department: string | null;
    position: string | null;
}

interface ShareRecipientSelectorProps {
    selectedIds: number[];
    onChange: (ids: number[]) => void;
}

export default function ShareRecipientSelector({ selectedIds, onChange }: ShareRecipientSelectorProps) {
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<User[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Synchronize selectedUsers with selectedIds (especially when reset)
    useEffect(() => {
        if (selectedIds.length === 0) {
            setSelectedUsers([]);
        }
    }, [selectedIds]);

    const searchUsers = useCallback(async (query: string) => {
        if (query.length < 1) {
            setResults([]);
            return;
        }
        setIsLoading(true);
        try {
            const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            if (res.ok) {
                const data = await res.json();
                setResults(data);
            }
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => searchUsers(search), 300);
        return () => clearTimeout(timer);
    }, [search, searchUsers]);

    const toggleUser = (user: User) => {
        const isSelected = selectedIds.includes(user.id);
        if (isSelected) {
            onChange(selectedIds.filter(id => id !== user.id));
            setSelectedUsers(prev => prev.filter(u => u.id !== user.id));
        } else {
            onChange([...selectedIds, user.id]);
            setSelectedUsers(prev => [...prev, user]);
        }
    };

    const removeUser = (userId: number) => {
        onChange(selectedIds.filter(id => id !== userId));
        setSelectedUsers(prev => prev.filter(u => u.id !== userId));
    };

    return (
        <div className="space-y-4">
            {/* Selected Tags */}
            <div className="flex flex-wrap gap-2 min-h-[44px] p-2 bg-background rounded-xl border border-border/50 shadow-inner">
                {selectedUsers.length === 0 && (
                    <span className="text-[10px] text-muted-foreground m-1 font-bold italic uppercase tracking-widest opacity-50">Chọn người nhận bên dưới...</span>
                )}
                {selectedUsers.map(user => (
                    <div
                        key={user.id}
                        className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 bg-primary text-primary-foreground rounded-lg text-[10px] font-black uppercase tracking-wider animate-in"
                    >
                        {user.full_name}
                        <button
                            type="button"
                            onClick={() => removeUser(user.id)}
                            className="p-1 hover:bg-white/20 rounded-md transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </div>

            {/* Search Input */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Tìm theo tên hoặc tên đăng nhập..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full h-11 pl-11 pr-4 rounded-xl bg-muted border-none text-sm font-bold focus:ring-2 focus:ring-primary transition-all placeholder:font-medium"
                />
            </div>

            {/* Results List */}
            <div className="max-h-52 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {isLoading && (
                    <div className="p-4 text-center text-[10px] font-black text-muted-foreground uppercase animate-pulse">Đang tìm kiếm...</div>
                )}
                {!isLoading && results.length === 0 && search.length > 0 && (
                    <div className="p-4 text-center text-[10px] font-black text-muted-foreground uppercase">Không tìm thấy nhân sự</div>
                )}
                {results.map(user => (
                    <button
                        key={user.id}
                        type="button"
                        onClick={() => toggleUser(user)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all border ${selectedIds.includes(user.id)
                            ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/10'
                            : 'bg-card border-border hover:border-primary/50'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-[10px] font-black uppercase text-primary border border-border">
                                {user.username.charAt(0)}
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-bold text-foreground">{user.full_name}</p>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase">
                                    {user.department || 'Phòng ban'} • {user.position || 'Chuyên viên'}
                                </p>
                            </div>
                        </div>
                        {selectedIds.includes(user.id) ? (
                            <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-white">
                                <Check className="w-3 h-3" />
                            </div>
                        ) : (
                            <UserPlus className="w-4 h-4 text-muted-foreground" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
