import React from 'react';
import { ModelMetrics } from '@/src/types';
import { CheckCircle2, AlertCircle, Award, Gauge, Leaf } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  metrics: ModelMetrics;
  source?: string;
}

const formatMetric = (value: number, digits = 2) =>
  Number(value).toLocaleString('id-ID', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export function Evaluation({ metrics, source }: Props) {
  const getMapeInterpretation = (m: number) => {
    if (m < 10) return { label: 'Sangat baik', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Award };
    if (m < 20) return { label: 'Baik', color: 'text-blue-600', bg: 'bg-blue-50', icon: CheckCircle2 };
    if (m < 50) return { label: 'Wajar', color: 'text-orange-600', bg: 'bg-orange-50', icon: AlertCircle };
    return { label: 'Buruk', color: 'text-rose-600', bg: 'bg-rose-50', icon: AlertCircle };
  };

  const getR2Interpretation = (r: number) => {
    if (r > 0.95) return 'Luar biasa';
    if (r >= 0.85) return 'Sangat baik';
    if (r >= 0.70) return 'Baik';
    return 'Kurang optimal';
  };

  const mapeInfo = getMapeInterpretation(metrics.mape);
  const MapeIcon = mapeInfo.icon;

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-900">Evaluasi Model & Informasi Tambahan</h3>
          <p className="text-xs font-medium text-slate-500">Ringkasan kualitas model dari artifact Colab revisi.</p>
          {source && <p className="mt-1 text-[10px] font-bold text-slate-400">Sumber: {source}</p>}
        </div>
        <div className="rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-blue-700">
          Validasi Model
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-0">
        <div className="xl:col-span-8 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div whileHover={{ scale: 1.01 }} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 text-slate-50 opacity-10">
            <Gauge size={120} />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Metric MAPE</p>
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-xl ${mapeInfo.bg} ${mapeInfo.color}`}>
              <MapeIcon size={24} />
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900">{formatMetric(metrics.mape)}%</span>
              </div>
              <p className={`text-xs font-bold uppercase tracking-tight ${mapeInfo.color}`}>{mapeInfo.label}</p>
            </div>
          </div>
          <div className="mt-6 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className={`h-full transition-all duration-1000 ${
              metrics.mape < 10 ? 'bg-emerald-500' : metrics.mape < 20 ? 'bg-blue-500' : metrics.mape < 50 ? 'bg-orange-500' : 'bg-rose-500'
            }`} style={{ width: `${Math.max(8, Math.min(100, ((50 - Math.min(metrics.mape, 50)) / 50) * 100))}%` }}></div>
          </div>
            </motion.div>

            <motion.div whileHover={{ scale: 1.01 }} className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Metric RMSE</p>
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-xl bg-purple-50 text-purple-600">
              <AlertCircle size={24} />
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900">{formatMetric(metrics.rmse)}</span>
              </div>
              <p className="text-xs font-bold uppercase text-purple-600">Root Mean Square Error</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-4 leading-relaxed font-medium uppercase tracking-tight">Kualitas model tinggi ditandai dengan nilai RMSE yang rendah.</p>
            </motion.div>

            <motion.div whileHover={{ scale: 1.01 }} className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">R-Square (R²)</p>
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-xl bg-blue-50 text-blue-600">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900">{formatMetric(metrics.r2, 3)}</span>
              </div>
              <p className="text-xs font-bold uppercase text-blue-600">{getR2Interpretation(metrics.r2)}</p>
            </div>
          </div>
          <div className="mt-6 flex gap-1">
             {[...Array(10)].map((_, i) => (
               <div key={i} className={`h-2 flex-1 rounded-full ${i/10 < metrics.r2 ? 'bg-blue-500' : 'bg-slate-100'}`}></div>
             ))}
          </div>
            </motion.div>
          </div>

          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] uppercase font-black text-slate-500">Kriteria MAPE</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase font-black text-slate-500">Interpretasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { m: '< 10%', i: 'Sangat baik ' },
                  { m: '10–20%', i: 'Baik' },
                  { m: '20–50%', i: 'Wajar' },
                  { m: '≥ 50%', i: 'Buruk / perlu optimasi ulang' }
                ].map((row) => (
                  <tr key={row.m}>
                    <td className="px-5 py-3 font-mono text-xs">{row.m}</td>
                    <td className="px-5 py-3 font-bold text-slate-600">{row.i}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="xl:col-span-4 p-6 bg-emerald-50/60 border-t xl:border-t-0 xl:border-l border-emerald-100 flex">
          <div className="rounded-2xl border border-emerald-100 bg-white/70 p-5 flex flex-col justify-center">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-500 text-white rounded-xl shrink-0">
                <Leaf size={22} />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-black text-emerald-950 uppercase leading-5">Pentingnya Penambahan Metrik "kg"</h4>
                <p className="text-sm text-emerald-900 leading-6 font-semibold">
                  Pupuk (kg) bertindak sebagai input feature penunjang hara tanah, sedangkan Hasil Produksi (kg) bertindak sebagai target utama model. Standar skala metrik ini krusial agar model LSTM mengonversi features tanpa misleading skala pada fungsi loss (RMSE, MAPE).
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
