import React from 'react';
import { BarChart3, Bell, Cpu, Database, MapPin, Search, Sprout, User } from 'lucide-react';

interface Props {
  onNavigate: (target: 'lstm' | 'komoditas' | 'dashboard') => void;
}

export function Header({ onNavigate }: Props) {
  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto h-20 px-4 md:px-8 flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-950 text-white flex items-center justify-center shadow-lg shadow-slate-900/10">
            <Sprout className="text-emerald-400 w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-950 leading-none">Agro-LSTM Predictor BPP</h2>
              <span className="hidden sm:inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-700">
                BPP
              </span>
              <span className="hidden sm:inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                Research Dashboard
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-slate-500">
              <MapPin className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">Kecamatan Cisarua, Kabupaten Bandung Barat</span>
            </div>
          </div>
        </div>

        <div className="hidden xl:flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('lstm')}
            className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <Cpu size={15} className="text-blue-600" />
            LSTM RNN
          </button>
          <button
            type="button"
            onClick={() => onNavigate('komoditas')}
            className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <Database size={15} className="text-emerald-600" />
            7 Komoditas
          </button>
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <BarChart3 size={15} className="text-indigo-600" />
            Dashboard Prediksi
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari komoditas..."
              className="pl-10 pr-4 py-2.5 bg-slate-100 border-none rounded-full text-xs focus:ring-2 focus:ring-green-500/20 w-56 transition-all"
            />
          </div>
          <button className="p-2.5 hover:bg-slate-100 rounded-full text-slate-500 transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          <div className="h-8 w-[1px] bg-slate-200 hidden sm:block"></div>
          <button className="flex items-center gap-3 p-1 hover:bg-slate-100 rounded-full transition-colors pr-3">
            <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
              <User className="w-5 h-5" />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-black text-slate-900">Researcher User</p>
              <p className="text-[10px] font-semibold text-slate-500">Administrator</p>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
