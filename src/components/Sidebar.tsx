import React from 'react';
import { 
  LayoutDashboard, 
  Database, 
  CloudSun, 
  BrainCircuit, 
  BarChart3, 
  PieChart, 
  Info,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
  { icon: Database, label: 'Data Produksi', id: 'data-produksi' },
  { icon: CloudSun, label: 'Data Cuaca', id: 'data-cuaca' },
  { icon: BrainCircuit, label: 'Prediksi LSTM', id: 'prediksi' },
  { icon: BarChart3, label: 'Evaluasi Model', id: 'evaluasi' },
  { icon: PieChart, label: 'Grafik Analisis', id: 'grafik' },
  { icon: Info, label: 'Tentang Sistem', id: 'tentang' },
];

export function Sidebar({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (id: string) => void }) {
  return (
    <div className="w-64 bg-slate-900 text-slate-300 h-screen fixed left-0 top-0 z-50 flex flex-col border-r border-slate-800">
      <div className="p-6 border-bottom border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
          <BrainCircuit className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-white text-lg leading-tight uppercase tracking-wider">AgroAlgo</h1>
          <p className="text-[10px] text-slate-500 font-mono tracking-tighter">LSTM PREDICTION V1.0</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group text-sm font-medium",
              activeTab === item.id 
                ? "bg-green-500 text-white shadow-lg shadow-green-500/20" 
                : "hover:bg-slate-800 hover:text-white"
            )}
          >
            <item.icon className={cn("w-5 h-5", activeTab === item.id ? "text-white" : "text-slate-500 group-hover:text-green-400")} />
            <span className="flex-1 text-left">{item.label}</span>
            {activeTab === item.id && <ChevronRight className="w-4 h-4 opacity-50" />}
          </button>
        ))}
      </nav>

      <div className="p-4 mt-auto">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">Research Project</p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Implementasi LSTM untuk Ketahanan Pangan Lokal.
          </p>
        </div>
      </div>
    </div>
  );
}
