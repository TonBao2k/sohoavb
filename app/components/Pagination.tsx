'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    page: number;
    totalPages: number;
    setPage: (page: number) => void;
}

export default function Pagination({ page, totalPages, setPage }: PaginationProps) {
    if (totalPages <= 1) return null;

    return (
        <div className="flex flex-col sm:flex-row justify-between items-center px-8 py-6 border-t border-border bg-muted/20 gap-4">
            <div className="flex items-center gap-2">
                <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                    Trang <span className="text-foreground opacity-100">{page}</span> trên {totalPages}
                </p>
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-background/50 rounded-2xl border border-border/50">
                <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="w-10 h-10 flex items-center justify-center rounded-xl border border-transparent hover:border-border hover:bg-background disabled:opacity-20 transition-all shadow-sm active:scale-95"
                    title="Trang trước"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center px-2">
                    {[...Array(totalPages)].map((_, i) => {
                        const p = i + 1;
                        // Show only current, first, last, and neighbors
                        if (
                            p === 1 ||
                            p === totalPages ||
                            (p >= page - 1 && p <= page + 1)
                        ) {
                            return (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`w-10 h-10 rounded-xl text-[11px] font-black transition-all active:scale-95 ${page === p
                                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                            : 'text-muted-foreground hover:bg-background hover:text-foreground'
                                        }`}
                                >
                                    {p}
                                </button>
                            );
                        }
                        if (p === 2 && page > 3) return <span key="dots1" className="px-1 text-muted-foreground opacity-30 text-xs">...</span>;
                        if (p === totalPages - 1 && page < totalPages - 2) return <span key="dots2" className="px-1 text-muted-foreground opacity-30 text-xs">...</span>;
                        return null;
                    })}
                </div>

                <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="w-10 h-10 flex items-center justify-center rounded-xl border border-transparent hover:border-border hover:bg-background disabled:opacity-20 transition-all shadow-sm active:scale-95"
                    title="Trang sau"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
