import React from 'react';
import { Calculator } from 'lucide-react';
import { Commodity } from '@/src/constants';

interface Props {
  commodity: Commodity;
  predictionValue: number;
}

export function ManualValidation({ commodity, predictionValue }: Props) {
  const lastActual = commodity.history[commodity.history.length - 1].actual;
  const pctChange = ((predictionValue - lastActual) / lastActual) * 100;
  const status = pctChange >= 0 ? 'Meningkat' : 'Menurun';

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <Calculator size={20} />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-900">Validasi Perhitungan Manual</h3>
          <p className="text-xs font-medium text-slate-500">Contoh transparansi perhitungan pada komoditas aktif.</p>
        </div>
      </div>

      <div className="space-y-3 text-sm font-medium text-slate-700">
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Rumus Perubahan</p>
          <p className="mt-2 font-mono text-xs text-slate-700">
            ((Prediksi Bulan Depan - Aktual Terakhir) / Aktual Terakhir) x 100%
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Substitusi {commodity.name}</p>
          <p className="mt-2 font-mono text-xs text-slate-700">
            (({predictionValue.toLocaleString('id-ID')} - {lastActual.toLocaleString('id-ID')}) / {lastActual.toLocaleString('id-ID')}) x 100% = {pctChange.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Interpretasi</p>
          <p className="mt-2 text-sm leading-6 font-bold text-emerald-900">
            Status prediksi {commodity.name}: {status}, karena perubahan bernilai {pctChange >= 0 ? 'positif' : 'negatif'}.
          </p>
        </div>
      </div>
    </section>
  );
}
