import React from 'react';
import { AlertTriangle, Brain, CalendarClock, CheckCircle2, CloudRain, Leaf, Thermometer, TrendingDown, TrendingUp, Wind } from 'lucide-react';
import { Commodity } from '@/src/constants';
import { AIInsightFactor, PredictionData } from '@/src/types';

interface Props {
  commodity: Commodity;
  predictionValue: number;
  status: 'up' | 'down';
  pctChange: number;
  aiInsight: string | null;
  aiFactors: AIInsightFactor[];
  form: PredictionData;
}

function cleanMarkdown(text: string) {
  return text.replace(/\*\*/g, '').replace(/\*/g, '').trim();
}

function getRecommendations(aiInsight: string | null, commodityName: string) {
  if (!aiInsight) {
    return [
      `Optimalkan pemupukan dan luas panen efektif untuk menjaga stabilitas produksi ${commodityName}.`,
      'Pantau suhu rata-rata dan kecepatan angin sebelum menentukan jadwal tanam berikutnya.',
      'Perbarui dataset bulanan agar prediksi LSTM tetap mengikuti kondisi lapangan terbaru.'
    ];
  }

  const bulletLines = aiInsight
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^\*\s+\*\*.+?\*\*:/.test(line));

  return bulletLines.slice(0, 3).map((line) => {
    const match = line.match(/^\*\s+\*\*(.+?)\*\*:\s*(.*)$/);
    return match ? `${cleanMarkdown(match[1])}: ${cleanMarkdown(match[2])}` : cleanMarkdown(line);
  });
}

export function ExecutiveSummary({ commodity, predictionValue, status, pctChange, aiInsight, aiFactors, form }: Props) {
  const previousActual = commodity.history[commodity.history.length - 1].actual;
  const effectiveArea = Math.max(
    0.1,
    form.luasPanenHabis + form.luasPanenBelumHabis * 0.4 + form.luasTambahTanam * 0.1 - form.luasRusak * 0.8
  );
  const recommendations = getRecommendations(aiInsight, commodity.name);
  const fallbackFactors = [
    {
      label: 'Luas Panen Efektif',
      value: effectiveArea.toFixed(1),
      unit: 'ha',
      icon: Leaf,
      note: 'Menggabungkan luas panen habis, belum habis, tambah tanam, dan luas rusak.'
    },
    {
      label: 'Dosis Pupuk',
      value: form.pupuk.toLocaleString('id-ID'),
      unit: 'kg',
      icon: CheckCircle2,
      note: 'Semakin sesuai kebutuhan komoditas, kontribusi hasil lebih stabil.'
    },
    {
      label: 'Suhu Rerata',
      value: form.suhuAvg.toFixed(1),
      unit: '°C',
      icon: Thermometer,
      note: 'Dipakai untuk membaca kecocokan iklim mikro Cisarua.'
    },
    {
      label: 'Curah Hujan',
      value: (form.curahHujan ?? 0).toFixed(1),
      unit: 'mm',
      icon: CloudRain,
      note: 'Diambil dari forecast Open-Meteo saat prediksi dijalankan.'
    },
    {
      label: 'Angin Maks',
      value: form.kecepatanAngin.toFixed(1),
      unit: 'm/s',
      icon: Wind,
      note: 'Angin tinggi dapat menurunkan efektivitas pertumbuhan tanaman.'
    }
  ];
  const factors = aiFactors.length ? aiFactors : fallbackFactors;

  return (
    <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <div className="xl:col-span-4 rounded-2xl bg-slate-950 text-white p-6 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.22),transparent_35%)]" />
        <div className="relative space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Hasil Prediksi Produksi Bulan Depan</p>
              <h2 className="mt-2 text-2xl font-black">{commodity.image} {commodity.name}</h2>
            </div>
            <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-300">
              LSTM
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-black">{predictionValue.toLocaleString('id-ID')}</span>
              <span className="text-xl font-black text-emerald-400">kg</span>
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-400">
              Aktual bulan terakhir: {previousActual.toLocaleString('id-ID')} kg
            </p>
            <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 flex gap-3">
              <CalendarClock size={18} className="text-emerald-300 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200">Target Forecasting</p>
                <p className="mt-1 text-xs leading-5 font-semibold text-slate-300">
                  Prediksi ini untuk <strong className="text-white">bulan berikutnya</strong>, dihitung dari data historis sampai bulan terakhir.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status</p>
              <div className={`mt-2 flex items-center gap-2 text-lg font-black ${status === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {status === 'up' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                {status === 'up' ? 'Meningkat' : 'Menurun'}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Perubahan</p>
              <p className="mt-2 text-2xl font-black">{pctChange}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="xl:col-span-4 rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Brain size={20} />
          </div>
          <div>
            <h3 className="font-black text-slate-900">Rekomendasi</h3>
            <p className="text-xs font-medium text-slate-500">Arahan keputusan berdasarkan output prediksi.</p>
          </div>
        </div>
        <div className="space-y-3">
          {recommendations.map((item, index) => (
            <div key={item} className="flex gap-3 rounded-xl bg-slate-50 border border-slate-100 p-4">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-black text-emerald-700">
                {index + 1}
              </span>
              <p className="text-sm leading-6 font-medium text-slate-700">{item}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="xl:col-span-4 rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="font-black text-slate-900">Faktor yang Memengaruhi</h3>
            <p className="text-xs font-medium text-slate-500">Variabel utama yang membentuk nilai prediksi.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
          {factors.map((factor) => {
            const Icon = 'icon' in factor && factor.icon ? factor.icon : AlertTriangle;
            return (
            <div key={factor.label} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Icon size={16} className="text-slate-500" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{factor.label}</p>
                </div>
                <p className="font-black text-slate-900">
                  {factor.value} <span className="text-xs text-slate-400">{factor.unit}</span>
                </p>
              </div>
              <p className="mt-2 text-xs leading-5 font-medium text-slate-500">{factor.note}</p>
            </div>
          );})}
        </div>
      </div>
    </section>
  );
}
