import React from 'react';
import { Database } from 'lucide-react';

const SOURCES = [
  ['Produksi', 'Dataset BPP Kecamatan Cisarua'],
  ['Luas Panen', 'Dataset BPP Kecamatan Cisarua'],
  ['Harga', 'Dataset historis / rencana integrasi Kemendag'],
  ['Suhu', 'Open-Meteo API + dataset historis'],
  ['Curah Hujan', 'Open-Meteo API + dataset historis'],
  ['Prediksi Produksi', 'Model LSTM'],
  ['Rekomendasi', 'LSTM + SHAP + AI insight'],
  ['Persentase Kenaikan', 'Perhitungan sistem'],
];

export function DataSourceTable() {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
          <Database size={20} />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-900">Transparansi Sumber Data</h3>
          <p className="text-xs font-medium text-slate-500">Asal setiap informasi yang digunakan dashboard.</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-[10px] uppercase font-black text-slate-500">Informasi</th>
              <th className="px-6 py-3 text-left text-[10px] uppercase font-black text-slate-500">Sumber</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {SOURCES.map(([info, source]) => (
              <tr key={info}>
                <td className="px-6 py-2.5 font-bold text-slate-800">{info}</td>
                <td className="px-6 py-2.5 font-medium text-slate-600">{source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
