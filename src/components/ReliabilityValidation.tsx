import React, { useState } from 'react';
import { ShieldCheck, Loader2, ChevronDown, PlayCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ReliabilityItem {
  label: string;
  score: number;
}

interface ReliabilityResult {
  source: string;
  alpha: number;
  n: number;
  k: number;
  items: ReliabilityItem[];
}

function getTier(alpha: number) {
  if (alpha >= 0.9) {
    return {
      badge: 'Sangat Baik (Excellent)',
      headline: 'Sangat bisa diandalkan',
      color: '#10b981',
      textClass: 'text-emerald-700',
      bgClass: 'bg-emerald-50',
    };
  }
  if (alpha >= 0.8) {
    return {
      badge: 'Baik (Good)',
      headline: 'Bisa diandalkan',
      color: '#22c55e',
      textClass: 'text-emerald-700',
      bgClass: 'bg-emerald-50',
    };
  }
  if (alpha >= 0.7) {
    return {
      badge: 'Dapat Diterima (Acceptable)',
      headline: 'Cukup bisa diandalkan',
      color: '#3b82f6',
      textClass: 'text-blue-700',
      bgClass: 'bg-blue-50',
    };
  }
  if (alpha >= 0.6) {
    return {
      badge: 'Diragukan (Questionable)',
      headline: 'Kurang bisa diandalkan',
      color: '#f59e0b',
      textClass: 'text-amber-700',
      bgClass: 'bg-amber-50',
    };
  }
  return {
    badge: 'Buruk (Poor)',
    headline: 'Belum bisa diandalkan',
    color: '#f43f5e',
    textClass: 'text-rose-700',
    bgClass: 'bg-rose-50',
  };
}

const ITEM_GRID_COLS: Record<number, string> = {
  1: 'xl:grid-cols-1',
  2: 'xl:grid-cols-2',
  3: 'xl:grid-cols-3',
  4: 'xl:grid-cols-4',
  5: 'xl:grid-cols-5',
  6: 'xl:grid-cols-6',
};

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polarToCartesian(cx, cy, r, startDeg);
  const end = polarToCartesian(cx, cy, r, endDeg);
  const largeArc = endDeg - startDeg <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function Gauge({ value }: { value: number }) {
  const cx = 150;
  const cy = 140;
  const r = 110;
  const clamped = Math.max(0, Math.min(100, value));
  const needleAngle = 180 + (clamped / 100) * 180;
  const needleTip = polarToCartesian(cx, cy, r - 18, needleAngle);

  const bands: Array<[number, number, string]> = [
    [0, 60, '#f43f5e'],
    [60, 80, '#f59e0b'],
    [80, 100, '#22c55e'],
  ];

  return (
    <svg viewBox="0 0 300 210" className="w-full max-w-xs mx-auto">
      {bands.map(([from, to, color]) => (
        <path
          key={from}
          d={arcPath(cx, cy, r, 180 + (from / 100) * 180, 180 + (to / 100) * 180)}
          fill="none"
          stroke={color}
          strokeWidth={16}
          strokeLinecap="round"
          opacity={0.85}
        />
      ))}
      {[0, 20, 40, 60, 80, 100].map((tick) => {
        const pos = polarToCartesian(cx, cy, r + 20, 180 + (tick / 100) * 180);
        return (
          <text key={tick} x={pos.x} y={pos.y} textAnchor="middle" fontSize={10} className="fill-slate-400 font-bold">
            {tick}
          </text>
        );
      })}
      <line
        x1={cx}
        y1={cy}
        x2={needleTip.x}
        y2={needleTip.y}
        stroke="#0f172a"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r={7} fill="#0f172a" />
      <text x={cx} y={cy + 40} textAnchor="middle" fontSize={30} fontWeight={900} className="fill-slate-900">
        {clamped.toFixed(1)}%
      </text>
    </svg>
  );
}

export function ReliabilityValidation() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<ReliabilityResult | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const runTest = async () => {
    setStatus('loading');
    try {
      const resp = await fetch('/api/model/reliability');
      if (!resp.ok) throw new Error(`API error: ${resp.status}`);
      const data = (await resp.json()) as ReliabilityResult;
      setResult(data);
      setStatus('done');
    } catch (error) {
      console.warn('Reliability test failed:', error);
      setStatus('error');
    }
  };

  const tier = result ? getTier(result.alpha) : null;

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-900">Validasi Sistem (Seberapa Bisa Diandalkan Sistem Ini?)</h3>
          <p className="text-xs font-medium text-slate-500">
            Pakai data uji bawaan (test split dari dataset yang sudah ada) — tidak perlu upload apa pun.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={runTest}
        disabled={status === 'loading'}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700 disabled:cursor-wait disabled:opacity-80 transition-colors"
      >
        {status === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
        {status === 'loading' ? 'Menjalankan Uji...' : "Jalankan Uji Keandalan (Cronbach's Alpha)"}
      </button>

      {status === 'error' && (
        <p className="mt-4 text-xs font-bold text-rose-600">Uji keandalan belum bisa dijalankan saat ini. Coba lagi.</p>
      )}

      <AnimatePresence>
        {status === 'done' && result && tier && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-6 space-y-6"
          >
            <div className="rounded-2xl border border-slate-200 p-6 grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 items-center">
              <Gauge value={result.alpha * 100} />
              <div className="space-y-3">
                <h4 className={`text-xl font-black ${tier.textClass}`}>{tier.headline}</h4>
                <p className="text-sm text-slate-600 leading-6 font-medium">
                  Dari <strong>{result.n} komoditas</strong> yang diuji pada data test selama {result.k} bulan
                  berturut-turut, komoditas yang diprediksi akurat oleh sistem cenderung{' '}
                  {result.alpha >= 0.8 ? 'tetap' : 'tidak selalu'} akurat di bulan-bulan lainnya juga — begitu pula
                  sebaliknya untuk yang sulit diprediksi.
                </p>
                <p className="text-sm text-slate-600 leading-6">
                  <strong className="text-slate-800">Analoginya</strong>: rata-rata akurasi bulanan memang bisa naik
                  turun mengikuti musim panen (lihat kartu di bawah). Yang diukur Cronbach's Alpha bukan apakah
                  angkanya sama persis tiap bulan, tapi apakah <em>pola</em> komoditas mana yang lebih akurat/kurang
                  akurat tetap konsisten dari bulan ke bulan.
                </p>
              </div>
            </div>

            <div className={`grid grid-cols-2 md:grid-cols-3 xl:grid-cols-${Math.min(result.items.length, 6)} gap-3`}>
              {result.items.map((item) => (
                <motion.div
                  key={item.label}
                  whileHover={{ scale: 1.02 }}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">{item.score.toFixed(1)}%</p>
                </motion.div>
              ))}
            </div>

            <p className="text-xs font-semibold text-slate-500">
              {result.alpha >= 0.8
                ? 'Rata-rata akurasi bulanan boleh naik-turun mengikuti musim, tapi pola relatif antar komoditas tetap konsisten — itu yang bikin sistemnya bisa diandalkan.'
                : 'Pola relatif antar komoditas dari bulan ke bulan masih cukup berubah-ubah, jadi keandalan sistem belum sepenuhnya stabil.'}
            </p>

            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowDetail((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50 text-sm font-bold text-slate-700"
              >
                Detail teknis (Cronbach's Alpha)
                <ChevronDown size={16} className={`transition-transform ${showDetail ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showDetail && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-5 space-y-4">
                      <div className="space-y-3">
                        <p className="text-sm font-bold text-slate-800">
                          Nilai Cronbach's Alpha: <span className="font-mono">{result.alpha.toFixed(4)}</span> →
                          ditampilkan sebagai <span className="font-mono">{(result.alpha * 100).toFixed(1)}%</span> di
                          gauge
                        </p>
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-black ${tier.bgClass} ${tier.textClass}`}>
                          {tier.badge}
                        </span>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                          Dihitung dari {result.n} komoditas pada data uji (test split), {result.k} bulan pengujian
                          sebagai item pengukuran berulang.
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Sumber: {result.source}</p>
                      </div>

                      <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-2.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                          Asal angka ini dari mana?
                        </p>
                        <ol className="text-xs text-slate-600 leading-relaxed font-medium list-decimal list-inside space-y-1.5">
                          <li>
                            Ambil baris <code className="font-mono text-[11px] bg-white px-1 py-0.5 rounded border border-slate-200">split = "test"</code>{' '}
                            dari data hasil prediksi ({result.n} komoditas × {result.k} bulan yang datanya lengkap).
                          </li>
                          <li>
                            Hitung skor akurasi tiap sel (komoditas × bulan):{' '}
                            <code className="font-mono text-[11px] bg-white px-1 py-0.5 rounded border border-slate-200">
                              100 − |aktual − prediksi| / aktual × 100
                            </code>
                            , dibatasi 0–100.
                          </li>
                          <li>Susun jadi matriks {result.n} baris (komoditas) × {result.k} kolom (bulan).</li>
                          <li>
                            Terapkan rumus:{' '}
                            <code className="font-mono text-[11px] bg-white px-1 py-0.5 rounded border border-slate-200">
                              α = (k/(k−1)) × (1 − Σvarians tiap bulan / varians total skor per komoditas)
                            </code>
                          </li>
                        </ol>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-medium pt-1 border-t border-slate-200">
                          Yang diukur bukan apakah angka akurasi sama tiap bulan, tapi apakah <em>pola</em> komoditas
                          mana yang lebih akurat/kurang akurat tetap konsisten dari bulan ke bulan — walau rata-rata
                          akurasinya boleh naik-turun mengikuti musim panen.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
