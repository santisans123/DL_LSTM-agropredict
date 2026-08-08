import React, { useState } from 'react';
import { ShieldCheck, Loader2, ChevronDown, PlayCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SplitMetrics {
  alpha: number;
  n: number;
  k: number;
  totalRows: number;
}

interface ReliabilityDetail {
  name: string;
  period: string;
  prediksi: number;
  aktual: number;
  accuracy: number;
  match: boolean;
}

interface ReliabilityResult {
  source: string;
  test: SplitMetrics;
  all: SplitMetrics;
  details: ReliabilityDetail[];
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

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <ShieldCheck size={20} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black text-slate-900">Reliabilitas Model (Cronbach's Alpha)</h3>
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">✓</span>
          </div>
          <p className="text-xs font-medium text-slate-500">
            Pengujian tambahan untuk mengukur konsistensi hasil Prediksi model terhadap data Aktual (ground truth), di luar metrik klasifikasi konvensional di atas.
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
        {status === 'done' && result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-6 space-y-6"
          >
            {/* Table 1: Cakupan Data */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 text-left text-[10px] uppercase font-black text-slate-500">Cakupan Data</th>
                    <th className="px-5 py-3 text-right text-[10px] uppercase font-black text-slate-500">Jumlah Data</th>
                    <th className="px-5 py-3 text-right text-[10px] uppercase font-black text-slate-500">Cronbach's Alpha</th>
                    <th className="px-5 py-3 text-left text-[10px] uppercase font-black text-slate-500">Kategori Reliabilitas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  <tr>
                    <td className="px-5 py-4">Data Uji (Test Set)</td>
                    <td className="px-5 py-4 text-right font-mono">{result.test.totalRows}</td>
                    <td className="px-5 py-4 text-right font-mono font-bold">{result.test.alpha.toFixed(4)}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-black ${getTier(result.test.alpha).bgClass} ${getTier(result.test.alpha).textClass}`}>
                        {getTier(result.test.alpha).badge}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-5 py-4">Seluruh Dataset</td>
                    <td className="px-5 py-4 text-right font-mono">{result.all.totalRows}</td>
                    <td className="px-5 py-4 text-right font-mono font-bold">{result.all.alpha.toFixed(4)}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-black ${getTier(result.all.alpha).bgClass} ${getTier(result.all.alpha).textClass}`}>
                        {getTier(result.all.alpha).badge}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Blue Alert Box */}
            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5 flex items-start gap-3.5 text-sm text-blue-900 leading-6 font-medium">
              <span className="text-base shrink-0">📌</span>
              <div>
                Pada data uji (paling representatif karena tidak pernah dilihat model saat training), Cronbach's Alpha ={' '}
                <strong className="font-mono font-bold">{result.test.alpha.toFixed(4)}</strong> — kategori reliabilitas:{' '}
                <strong>{getTier(result.test.alpha).badge}</strong>. Nilai ini mengukur seberapa konsisten hasil Prediksi model bergerak searah dengan data Aktual: semakin tinggi nilainya, semakin dapat diandalkan hasil prediksi model sebagai representasi kondisi lapangan yang sesungguhnya.
              </div>
            </div>

            {/* Header 2: Kesesuaian */}
            <div className="pt-2">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                Tabel Kesesuaian Prediksi vs Aktual (per Komoditas, Data Uji)
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Data mentah di balik nilai Cronbach's Alpha pada data uji di atas: setiap komoditas dibandingkan Prediksi model dengan Aktual (ground truth).
              </p>
            </div>

            {/* Table 2: Kesesuaian per Komoditas */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden max-h-[350px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-5 py-3 text-left text-[10px] uppercase font-black text-slate-500">Komoditas</th>
                    <th className="px-5 py-3 text-left text-[10px] uppercase font-black text-slate-500">Periode</th>
                    <th className="px-5 py-3 text-right text-[10px] uppercase font-black text-slate-500">Prediksi</th>
                    <th className="px-5 py-3 text-right text-[10px] uppercase font-black text-slate-500">Aktual</th>
                    <th className="px-5 py-3 text-center text-[10px] uppercase font-black text-slate-500">Cocok</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {result.details.map((row, idx) => (
                    <tr key={idx} className={row.match ? 'hover:bg-emerald-50/10' : 'hover:bg-rose-50/10'}>
                      <td className="px-5 py-3 font-bold text-slate-900">{row.name}</td>
                      <td className="px-5 py-3 text-slate-500">{row.period}</td>
                      <td className="px-5 py-3 text-right font-mono">{row.prediksi.toLocaleString('id-ID')} kg</td>
                      <td className="px-5 py-3 text-right font-mono">{row.aktual.toLocaleString('id-ID')} kg</td>
                      <td className="px-5 py-3 text-center">
                        {row.match ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-100">
                            ✓ Cocok
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 border border-rose-100">
                            ✗ Tidak Cocok
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Match Rate Note */}
            {(() => {
              const matchCount = result.details.filter((d) => d.match).length;
              const totalCount = result.details.length;
              const matchRate = totalCount > 0 ? (matchCount / totalCount) * 100 : 0;
              return (
                <p className="text-xs font-bold text-slate-500 px-1">
                  Match rate: {matchRate.toFixed(2)}% ({matchCount} dari {totalCount} data uji, Prediksi mendekati Aktual dengan toleransi error ≤ 30%).
                </p>
              );
            })()}

            {/* Accordion: Detail Teknis */}
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
                          Nilai Cronbach's Alpha Data Uji:{' '}
                          <span className="font-mono">{result.test.alpha.toFixed(4)}</span>
                        </p>
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-black ${getTier(result.test.alpha).bgClass} ${getTier(result.test.alpha).textClass}`}>
                          {getTier(result.test.alpha).badge}
                        </span>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                          Dihitung dari {result.test.n} komoditas pada data uji, {result.test.k} bulan pengujian
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
                            dari data hasil prediksi ({result.test.n} komoditas × {result.test.k} bulan yang datanya lengkap).
                          </li>
                          <li>
                            Hitung skor akurasi tiap sel (komoditas × bulan):{' '}
                            <code className="font-mono text-[11px] bg-white px-1 py-0.5 rounded border border-slate-200">
                              100 − |aktual − prediksi| / aktual × 100
                            </code>
                            , dibatasi 0–100 (jika aktual = 0 dan prediksi = 0, akurasi = 100%; jika aktual = 0 dan prediksi != 0, akurasi = 0%).
                          </li>
                          <li>Susun jadi matriks {result.test.n} baris (komoditas) × {result.test.k} kolom (bulan).</li>
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
