'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, FileText, Moon, Sun, Trash2, Eye,
  ChevronLeft, ChevronRight, Calendar, ArrowUpDown,
  Upload, LogOut, ChevronDown, Filter,
  Settings, Database, ListFilter, History, Archive, Share, Info, Users, Menu, MoreVertical, ShieldCheck, Star, CheckSquare, Square, Send, X
} from 'lucide-react';
import ShareRecipientSelector from './components/ShareRecipientSelector';
import UploadForm from './components/UploadForm';
import EditDocForm from './components/EditDocForm';
import { useToast } from './components/Toast';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import Modal from './components/Modal';
import Pagination from './components/Pagination';
import NotificationCenter from './components/NotificationCenter';

interface Doc {
  id: number;
  number: string;
  type: string;
  name: string;
  summary: string | null;
  file_path: string;
  issued_date: string | null;
  created_at: string;
  sender_id: number;
  sender_name?: string;
  read_status?: 'received' | 'read';
  total_recipients?: number;
  read_count?: number;
  is_important: boolean | number;
  category?: 'incoming' | 'outgoing' | 'other' | string;
}

interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
}

const ITEMS_PER_PAGE = 10;

// Pagination removed and extracted to components/Pagination.tsx

export default function Home() {
  const [docs, setDocs] = useState<Doc[]>([]);
  // Inline filters state
  const [filters, setFilters] = useState({
    number: '',
    type: '',
    name: '',
    year: ''
  });

  const [sortConfig, setSortConfig] = useState<{
    field: keyof Doc | null;
    order: 'asc' | 'desc';
  }>({ field: null, order: 'desc' });
  const [darkMode, setDarkMode] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [showUpload, setShowUpload] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Doc | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [view, setView] = useState<'archive' | 'incoming' | 'outgoing' | 'other' | 'important'>('archive');
  const [sortBy, setSortBy] = useState<'newest' | 'number' | 'year'>('newest');
  const [showShare, setShowShare] = useState(false);
  const [sharingDoc, setSharingDoc] = useState<Doc | null>(null);
  const [shareRecipientIds, setShareRecipientIds] = useState<number[]>([]);
  const [isSharing, setIsSharing] = useState(false);

  const { addToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const decoded = jwtDecode<User>(token);
      setUser(decoded);
    } catch (error) {
      localStorage.removeItem('token');
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
    router.push('/login');
    addToast('Phiên làm việc hết hạn, vui lòng đăng nhập lại', 'error');
  }, [router, addToast]);

  const fetchDocs = useCallback(async () => {
    setIsLoading(true);
    try {
      const endpoint = '/api/documents';
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!res.ok) throw new Error(`Lỗi tải dữ liệu`);
      const data = await res.json();
      setDocs(data);
    } catch (error: any) {
      addToast(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast, handleUnauthorized]);

  useEffect(() => {
    if (user) fetchDocs();
  }, [user, fetchDocs]);

  useEffect(() => {
    const handleRefresh = () => fetchDocs();
    window.addEventListener('refresh-docs', handleRefresh);
    return () => window.removeEventListener('refresh-docs', handleRefresh);
  }, [fetchDocs]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    router.push('/login');
    addToast('Đã đăng xuất', 'info');
  };

  const filteredData = useMemo(() => {
    let res = docs;

    if (view === 'important') {
      res = res.filter(d => d.is_important);
    }

    let result = docs.filter(d => {
      // Category filter based on view
      if (view === 'important') {
        if (!d.is_important) return false;
      } else if (view === 'incoming') {
        if (d.category !== 'incoming') return false;
      } else if (view === 'outgoing') {
        if (d.category !== 'outgoing') return false;
      } else if (view === 'other') {
        if (d.category !== 'other') return false;
      }

      // Existing filters
      const matchesNum = d.number.toLowerCase().includes(filters.number.toLowerCase());
      const matchesType = !filters.type || d.type === filters.type;
      const matchesName = d.name.toLowerCase().includes(filters.name.toLowerCase());
      const matchesYear = !filters.year || (d.issued_date && d.issued_date.startsWith(filters.year));
      return matchesNum && matchesType && matchesName && matchesYear;
    });

    // Sort logic
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'number') {
        return a.number.localeCompare(b.number, undefined, { numeric: true, sensitivity: 'base' });
      }
      if (sortBy === 'year') {
        const yearA = a.issued_date ? parseInt(a.issued_date.split('-')[0]) : 0;
        const yearB = b.issued_date ? parseInt(b.issued_date.split('-')[0]) : 0;
        return yearB - yearA;
      }
      return 0;
    });

    return result;
  }, [docs, filters, view, sortBy]);

  const importantDocsCount = useMemo(() => {
    return docs.filter(d => d.is_important).length;
  }, [docs]);

  const uniqueYears = useMemo(() => {
    const years = Array.from(new Set(docs.map(d => d.issued_date ? new Date(d.issued_date).getFullYear().toString() : null).filter(Boolean)));
    return (years as string[]).sort((a, b) => b.localeCompare(a));
  }, [docs]);

  const uniqueTypes = useMemo(() => {
    const types = Array.from(new Set(docs.map(d => d.type).filter(Boolean)));
    return types.sort();
  }, [docs]);

  const paginated = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, page]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(1);
  };

  const toggle = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    const pageIds = paginated.map(d => d.id);
    const allSelected = pageIds.every(id => selected.includes(id));
    setSelected(prev => allSelected ? prev.filter(id => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])]);
  };

  const del = async () => {
    if (!selected.length || !confirm(`Xóa ${selected.length} văn bản đã chọn?`)) return;
    try {
      const responses = await Promise.all(selected.map(id => fetch(`/api/documents/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })));
      if (responses.some(r => r.status === 401)) {
        handleUnauthorized();
        return;
      }
      addToast('Đã xóa thành công!', 'success');
      setSelected([]);
      fetchDocs();
    } catch {
      addToast('Lỗi khi xóa!', 'error');
    }
  };

  const handleShareExisting = async () => {
    if (!sharingDoc || !shareRecipientIds.length) return;
    setIsSharing(true);
    try {
      const res = await fetch(`/api/documents/${sharingDoc.id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ recipient_ids: shareRecipientIds }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!res.ok) throw new Error('Không thể chia sẻ văn bản');
      addToast('Đã chia sẻ văn bản thành công', 'success');
      setShowShare(false);
      setSharingDoc(null);
      setShareRecipientIds([]);
      fetchDocs();
    } catch (error: any) {
      addToast(error.message, 'error');
    } finally {
      setIsSharing(false);
    }
  };

  const toggleImportant = async (doc: Doc) => {
    const newStatus = !doc.is_important;
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ is_important: newStatus }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!res.ok) throw new Error('Không thể cập nhật trạng thái');

      // Update local state for immediate feedback
      setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, is_important: newStatus } : d));
      addToast(newStatus ? 'Đã đánh dấu quan trọng' : 'Đã bỏ đánh dấu quan trọng', 'info');
    } catch (error: any) {
      addToast(error.message, 'error');
    }
  };

  const handleOpenDetail = (doc: Doc) => {
    window.open(doc.file_path, '_blank');
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground font-medium animate-pulse">Đang chuẩn bị dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex bg-background transition-colors ${darkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      <aside className="w-72 bg-card border-r border-border flex flex-col h-screen sticky top-0 transition-all z-10 shadow-sm">
        <div className="p-8 pb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 ring-4 ring-primary/5">
              <ShieldCheck className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-[13px] font-black text-foreground leading-tight tracking-tight uppercase">
                Hệ thống văn bản
              </h1>
              <p className="text-[10px] font-bold text-muted-foreground leading-tight tracking-widest uppercase mt-0.5 opacity-70">
                Trung tâm KT&ĐBCLGD
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-8 overflow-y-auto custom-scrollbar">
          {/* Group: DANH MỤC VĂN BẢN */}
          <div className="space-y-1.5">
            <p className="px-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4 opacity-50">Danh mục văn bản</p>

            <button
              onClick={() => setView('archive')}
              className={`group relative w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${view === 'archive' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
            >
              {view === 'archive' && <div className="absolute left-0 w-1 h-6 bg-primary rounded-r-full" />}
              <Archive className={`w-4 h-4 ${view === 'archive' ? 'text-primary' : 'opacity-70 group-hover:opacity-100'}`} />
              <span className="text-sm">Kho lưu trữ</span>
            </button>

            <button
              onClick={() => setView('incoming')}
              className={`group relative w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${view === 'incoming' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
            >
              {view === 'incoming' && <div className="absolute left-0 w-1 h-6 bg-primary rounded-r-full" />}
              <FileText className={`w-4 h-4 ${view === 'incoming' ? 'text-primary' : 'opacity-70 group-hover:opacity-100'}`} />
              <span className="text-sm">Công văn đến</span>
            </button>

            <button
              onClick={() => setView('outgoing')}
              className={`group relative w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${view === 'outgoing' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
            >
              {view === 'outgoing' && <div className="absolute left-0 w-1 h-6 bg-primary rounded-r-full" />}
              <Send className={`w-4 h-4 ${view === 'outgoing' ? 'text-primary' : 'opacity-70 group-hover:opacity-100'}`} />
              <span className="text-sm">Công văn đi</span>
            </button>

            <button
              onClick={() => setView('other')}
              className={`group relative w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${view === 'other' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
            >
              {view === 'other' && <div className="absolute left-0 w-1 h-6 bg-primary rounded-r-full" />}
              <History className={`w-4 h-4 ${view === 'other' ? 'text-primary' : 'opacity-70 group-hover:opacity-100'}`} />
              <span className="text-sm">Văn bản khác</span>
            </button>
          </div>

          {/* Group: QUẢN LÝ */}
          <div className="space-y-1.5">
            <p className="px-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4 opacity-50">Quản lý</p>

            <button
              onClick={() => setView('important')}
              className={`group relative w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition-all ${view === 'important' ? 'bg-amber-500/10 text-amber-600' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
            >
              <div className="flex items-center gap-3">
                {view === 'important' && <div className="absolute left-0 w-1 h-6 bg-amber-500 rounded-r-full" />}
                <Star className={`w-4 h-4 ${view === 'important' ? 'text-amber-500 fill-amber-500' : 'opacity-70 group-hover:opacity-100'}`} />
                <span className="text-sm">Văn bản quan trọng</span>
              </div>
              {importantDocsCount > 0 && (
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${view === 'important' ? 'bg-amber-500 text-white' : 'bg-muted-foreground/20 text-muted-foreground'}`}>
                  {importantDocsCount}
                </span>
              )}
            </button>

            {user.role === 'admin' && (
              <button
                onClick={() => router.push('/admin/users')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all group font-bold"
              >
                <Users className="w-4 h-4 opacity-70 group-hover:opacity-100 group-hover:text-primary transition-all" />
                <span className="text-sm">Người dùng</span>
              </button>
            )}
          </div>
        </nav>

        <div className="p-4 mt-auto border-t border-border bg-muted/20">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold uppercase ring-1 ring-primary/20">
              {user.username.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{user.username}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">{user.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 glass border-b border-border px-8 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            {view === 'archive' && 'Kho lưu trữ'}
            {view === 'incoming' && 'Công văn đến'}
            {view === 'outgoing' && 'Công văn đi'}
            {view === 'other' && 'Văn bản khác'}
            {view === 'important' && 'Văn bản quan trọng'}
            <span className={`px-2 py-0.5 rounded-md text-xs font-black ${view === 'important' ? 'bg-amber-500/10 text-amber-600' : 'bg-primary/10 text-primary'}`}>
              {filteredData.length}
            </span>
          </h2>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 rounded-xl border border-border bg-card shadow-sm shadow-black/5 hover:bg-muted transition-all"
            >
              {darkMode ? <Sun className="w-5 h-5 text-warning" /> : <Moon className="w-5 h-5 text-primary" />}
            </button>
            <div className="h-8 w-px bg-border" />
            <NotificationCenter />
            <div className="h-8 w-px bg-border" />
            <div className="flex items-center gap-4">
              {selected.length > 0 && (
                <button
                  onClick={del}
                  className="px-5 h-11 bg-destructive hover:opacity-90 text-destructive-foreground rounded-xl flex items-center gap-2 font-black transition-all shadow-lg shadow-destructive/20"
                >
                  <Trash2 className="w-4 h-4" />
                  Xóa ({selected.length})
                </button>
              )}
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-6 h-11 bg-primary hover:opacity-90 text-primary-foreground rounded-xl font-black shadow-lg shadow-primary/20 transition-all"
              >
                <Upload className="w-4 h-4" />
                Tải VB mới
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 space-y-8 max-w-7xl mx-auto w-full overflow-y-auto">
          {/* Enhanced Filter Area */}
          <div className="bg-card rounded-3xl border border-border shadow-sm p-8 space-y-6">
            <div className="flex flex-col gap-6">
              {/* Primary Search: Trích yếu */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-end">
                <div className="lg:col-span-3 space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                    <Search className="w-3.5 h-3.5" />
                    Tìm kiếm theo trích yếu nội dung
                  </label>
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                      type="text"
                      placeholder="Nhập nội dung trích yếu cần tìm..."
                      value={filters.name}
                      onChange={e => handleFilterChange('name', e.target.value)}
                      className="w-full h-14 pl-12 pr-4 rounded-2xl bg-muted/50 border-2 border-transparent focus:border-primary focus:bg-background text-sm font-bold transition-all placeholder:font-medium outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    Sắp xếp theo
                  </label>
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value as any)}
                      className="w-full h-14 px-5 appearance-none rounded-2xl bg-muted/50 border-2 border-transparent focus:border-primary focus:bg-background text-sm font-bold transition-all outline-none cursor-pointer"
                    >
                      <option value="newest">Ngày tải mới nhất</option>
                      <option value="number">Số hiệu tăng dần</option>
                      <option value="year">Năm ban hành</option>
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Secondary Filters Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-border/50">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Số hiệu văn bản</label>
                  <div className="relative group">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                      type="text"
                      placeholder="Lọc số hiệu..."
                      value={filters.number}
                      onChange={e => handleFilterChange('number', e.target.value)}
                      className="w-full h-12 pl-11 pr-4 rounded-xl bg-muted/30 border-2 border-transparent focus:border-primary focus:bg-background text-xs font-bold transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Loại văn bản</label>
                  <div className="relative">
                    <ListFilter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <select
                      value={filters.type}
                      onChange={e => handleFilterChange('type', e.target.value)}
                      className="w-full h-12 pl-11 pr-10 appearance-none rounded-xl bg-muted/30 border-2 border-transparent focus:border-primary focus:bg-background text-xs font-bold transition-all outline-none cursor-pointer"
                    >
                      <option value="">Tất cả loại văn bản</option>
                      {uniqueTypes.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Năm ban hành</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <select
                      value={filters.year}
                      onChange={e => handleFilterChange('year', e.target.value)}
                      className="w-full h-12 pl-11 pr-10 appearance-none rounded-xl bg-muted/30 border-2 border-transparent focus:border-primary focus:bg-background text-xs font-bold transition-all outline-none cursor-pointer"
                    >
                      <option value="">Tất cả năm</option>
                      {uniqueYears.map(y => (y !== null && (
                        <option key={y} value={y}>{y}</option>
                      )))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Table Area */}
          <div className="bg-card rounded-2xl border border-border shadow-sm shadow-black/5 overflow-hidden animate-in">
            <div className="overflow-x-auto min-h-[500px]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="p-6 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={paginated.length > 0 && paginated.every(d => selected.includes(d.id))}
                        onChange={toggleAll}
                        className="w-4 h-4 rounded-md border-border text-primary focus:ring-primary"
                      />
                    </th>
                    {(['number', 'type', 'name', 'issued_date'] as const).map(f => (
                      <th
                        key={f}
                        className="p-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                      >
                        {f === 'number' && 'Số hiệu'}
                        {f === 'type' && 'Loại văn bản'}
                        {f === 'name' && 'Trích yếu nội dung'}
                        {f === 'issued_date' && 'Năm ban hành'}
                      </th>
                    ))}
                    <th className="p-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Ngày tải lên
                    </th>
                    <th className="p-8 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tác vụ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-24 text-center">
                        <div className="flex flex-col items-center justify-center gap-4 py-12 bg-muted/5 rounded-3xl border-2 border-dashed border-border/50 max-w-lg mx-auto">
                          <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center shadow-sm">
                            <Archive className="w-8 h-8 text-muted-foreground/30" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-black text-foreground/80 uppercase tracking-widest">Kho lưu trữ trống</p>
                            <p className="text-[11px] font-bold text-muted-foreground opacity-60">Chưa có văn bản nào trong mục này hoặc không tìm thấy kết quả phù hợp</p>
                          </div>
                          <button
                            onClick={() => setShowUpload(true)}
                            className="mt-2 px-6 h-10 bg-primary/10 text-primary hover:bg-primary text-[10px] font-black uppercase tracking-widest rounded-xl transition-all hover:text-primary-foreground"
                          >
                            Tải văn bản ngay
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginated.map(d => (
                      <tr key={d.id} className="group hover:bg-accent/50 dark:hover:bg-accent/30 border-b border-border/50 last:border-0 transition-all">
                        <td className="p-8 text-center">
                          <input
                            type="checkbox"
                            checked={selected.includes(d.id)}
                            onChange={() => toggle(d.id)}
                            className="w-4 h-4 rounded-md border-border text-primary focus:ring-primary/30 transition-all cursor-pointer"
                          />
                        </td>
                        <td className="p-8 font-black text-foreground/90 tracking-tight">{d.number}</td>
                        <td className="p-8">
                          <span className="px-3 py-1.5 bg-primary/5 text-primary border border-primary/10 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">
                            {d.type}
                          </span>
                        </td>
                        <td className="p-8 max-w-sm">
                          <p onClick={() => handleOpenDetail(d)} className="text-sm font-bold text-foreground leading-relaxed cursor-pointer hover:text-primary transition-all line-clamp-2">
                            {d.name}
                          </p>
                        </td>
                        <td className="p-8">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground/50" />
                            <span className="text-sm font-bold text-foreground/80">
                              {d.issued_date ? new Date(d.issued_date).getFullYear() : '---'}
                            </span>
                          </div>
                        </td>
                        <td className="p-8">
                          <span className="text-xs text-muted-foreground font-black uppercase tracking-tighter opacity-70 group-hover:opacity-100 transition-opacity">
                            {new Date(d.created_at).toLocaleDateString('vi-VN')}
                          </span>
                        </td>
                        <td className="p-8 text-right">
                          <div className="flex justify-end relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(activeMenuId === d.id ? null : d.id);
                              }}
                              className={`p-2.5 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-sm border border-border/50 ${activeMenuId === d.id ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted text-muted-foreground'
                                }`}
                              title="Tác vụ"
                            >
                              <Menu className="w-5 h-5" />
                            </button>

                            {activeMenuId === d.id && (
                              <div
                                className="absolute right-0 top-full mt-2 w-48 bg-card border border-border shadow-2xl rounded-2xl py-2 z-[100] animate-in fade-in zoom-in-95 duration-200 shadow-primary/10"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => {
                                    handleOpenDetail(d);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm font-bold text-foreground hover:bg-primary/5 flex items-center gap-3 transition-colors"
                                >
                                  <Eye className="w-4 h-4 text-primary" />
                                  Xem văn bản
                                </button>
                                <button
                                  onClick={() => {
                                    toggleImportant(d);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm font-bold text-foreground hover:bg-primary/5 flex items-center gap-3 transition-colors"
                                >
                                  {d.is_important ? (
                                    <CheckSquare className="w-4 h-4 text-amber-500" />
                                  ) : (
                                    <Square className="w-4 h-4 text-muted-foreground" />
                                  )}
                                  Đánh dấu quan trọng
                                </button>
                                <button
                                  onClick={() => {
                                    setSharingDoc(d);
                                    setShowShare(true);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm font-bold text-foreground hover:bg-primary/5 flex items-center gap-3 transition-colors"
                                >
                                  <Share className="w-4 h-4" />
                                  Chia sẻ
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingDoc(d);
                                    setShowEdit(true);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm font-bold text-foreground hover:bg-primary/5 flex items-center gap-3 transition-colors"
                                >
                                  <Settings className="w-4 h-4 text-warning" />
                                  Chỉnh sửa
                                </button>
                                <div className="h-px bg-border my-1 mx-2" />
                                <button
                                  onClick={() => {
                                    if (confirm('Xóa văn bản này?')) {
                                      setSelected([d.id]);
                                      del();
                                    }
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm font-bold text-destructive hover:bg-destructive/5 flex items-center gap-3 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Xóa văn bản
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} setPage={setPage} />
          </div>
        </main>
      </div>

      {/* Floating Bulk Action Bar */}
      {selected.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-8 duration-300">
          <div className="flex items-center gap-6 px-8 h-20 bg-card/90 backdrop-blur-2xl border-2 border-primary/20 shadow-2xl shadow-primary/10 rounded-[2.5rem] ring-8 ring-background/50 outline-2 outline-primary/5">
            <div className="flex items-center gap-4 pr-6 border-r border-border/50">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-black text-xs shadow-lg shadow-primary/20">
                {selected.length}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-foreground">Đã chọn</p>
                <p className="text-[9px] font-bold text-muted-foreground opacity-60 whitespace-nowrap">Văn bản đang được xử lý</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setSharingDoc(docs.find(d => d.id === selected[0]) || null);
                  setShowShare(true);
                }}
                className="h-12 px-6 rounded-2xl bg-muted hover:bg-background text-foreground text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 hover:shadow-lg active:scale-95"
              >
                <Share className="w-4 h-4 text-primary" />
                Chia sẻ
              </button>
              <button
                onClick={del}
                className="h-12 px-6 rounded-2xl bg-destructive/10 hover:bg-destructive text-destructive hover:text-destructive-foreground text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 hover:shadow-lg active:scale-95 shadow-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
                Xóa vĩnh viễn
              </button>
              <div className="w-px h-8 bg-border/50 mx-2" />
              <button
                onClick={() => setSelected([])}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-muted text-muted-foreground transition-all group"
                title="Bỏ chọn tất cả"
              >
                <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        title="Tải & Chia sẻ văn bản"
        maxWidth="max-w-7xl"
        noScroll={true}
      >
        <UploadForm
          onSuccess={() => {
            fetchDocs();
            setShowUpload(false);
          }}
          onCancel={() => setShowUpload(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEdit}
        onClose={() => {
          setShowEdit(false);
          setEditingDoc(null);
        }}
        title="Chỉnh sửa văn bản"
      >
        {editingDoc && (
          <EditDocForm
            doc={editingDoc}
            onSuccess={() => {
              fetchDocs();
              setShowEdit(false);
              setEditingDoc(null);
            }}
            onCancel={() => {
              setShowEdit(false);
              setEditingDoc(null);
            }}
          />
        )}
      </Modal>

      {/* Share Modal */}
      <Modal
        isOpen={showShare}
        onClose={() => {
          setShowShare(false);
          setSharingDoc(null);
          setShareRecipientIds([]);
        }}
        title="Chia sẻ văn bản nội bộ"
      >
        {sharingDoc && (
          <div className="space-y-6">
            <div className="p-4 bg-muted rounded-xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Đang chia sẻ:</p>
              <p className="text-sm font-bold text-foreground line-clamp-1">{sharingDoc.number} - {sharingDoc.name}</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Chọn người nhận</p>
              </div>
              <ShareRecipientSelector
                selectedIds={shareRecipientIds}
                onChange={setShareRecipientIds}
              />
            </div>

            <div className="flex gap-4 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setShowShare(false);
                  setSharingDoc(null);
                  setShareRecipientIds([]);
                }}
                className="flex-1 h-12 bg-muted hover:bg-muted/80 text-foreground rounded-xl font-black transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleShareExisting}
                disabled={isSharing || shareRecipientIds.length === 0}
                className="flex-[2] h-12 bg-primary hover:opacity-90 text-primary-foreground rounded-xl font-black shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSharing ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    <Share className="w-4 h-4" />
                    <span>Chia sẻ ngay ({shareRecipientIds.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}