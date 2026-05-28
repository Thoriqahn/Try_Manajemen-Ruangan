import React from 'react';
import { AlertTriangle, Lock, SearchX } from 'lucide-react';

interface ErrorStateProps {
  type: '404' | '403' | '500';
  onAction?: () => void;
  actionLabel?: string;
}

export function ErrorState({ type, onAction, actionLabel = "Kembali ke Beranda" }: ErrorStateProps) {
  let config = {
    icon: <AlertTriangle className="w-16 h-16 text-rose-500" />,
    title: "Terjadi Kesalahan",
    description: "Sistem tidak dapat memproses permintaan Anda.",
    color: "rose"
  };

  if (type === '404') {
    config = {
      icon: <SearchX className="w-16 h-16 text-slate-400 dark:text-slate-500" />,
      title: "Halaman Tidak Ditemukan",
      description: "Maaf, halaman yang Anda cari tidak ada atau telah dipindahkan.",
      color: "slate"
    };
  } else if (type === '403') {
    config = {
      icon: <Lock className="w-16 h-16 text-amber-500" />,
      title: "Akses Ditolak",
      description: "Anda tidak memiliki izin (hak akses) untuk melihat halaman ini.",
      color: "amber"
    };
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-in fade-in zoom-in duration-500">
      <div className={`flex items-center justify-center w-28 h-28 mb-8 rounded-full bg-${config.color}-50 dark:bg-${config.color}-900/20 shadow-inner border border-${config.color}-100 dark:border-${config.color}-800/50 relative overflow-hidden`}>
        <div className={`absolute inset-0 bg-${config.color}-500/10 dark:bg-${config.color}-500/20 blur-xl animate-pulse`} />
        <div className="relative z-10">
          {config.icon}
        </div>
      </div>
      <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3 tracking-tight">
        {config.title}
      </h1>
      <p className="text-base text-slate-500 dark:text-slate-400 max-w-md mb-8 leading-relaxed">
        {config.description}
      </p>
      
      {onAction && (
        <button 
          onClick={onAction}
          className="px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
