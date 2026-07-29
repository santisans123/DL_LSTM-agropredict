import React from 'react';
import { Filter } from 'lucide-react';
import { Commodity } from '@/src/constants';

interface Props {
  commodities: Commodity[];
  selectedCommodity: Commodity;
  showAll: boolean;
  onShowAllChange: (showAll: boolean) => void;
}

const formatMape = (value: number) => (Number.isFinite(value) ? `${value}%` : '-');

export function CommodityTable({ commodities, selectedCommodity, showAll, onShowAllChange }: Props) {
  const rows = showAll ? commodities : [selectedCommodity];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-900">Tabel Komoditas</h3>
          <p className="text-xs font-medium text-slate-500">
            {showAll
              ? 'Menampilkan seluruh komoditas untuk pembandingan umum.'
              : `Filter aktif: hanya menampilkan data ${selectedCommodity.name}.`}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1">
          <Filter size={15} className="ml-2 text-slate-500" />
          <button
            type="button"
            onClick={() => onShowAllChange(false)}
            className={`rounded-lg px-3 py-2 text-xs font-black transition-colors ${
              !showAll ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Komoditas Dipilih
          </button>
          <button
            type="button"
            onClick={() => onShowAllChange(true)}
            className={`rounded-lg px-3 py-2 text-xs font-black transition-colors ${
              showAll ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Semua
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-left text-[10px] uppercase font-black text-slate-500">Komoditas</th>
              <th className="px-6 py-4 text-left text-[10px] uppercase font-black text-slate-500">Kategori</th>
              <th className="px-6 py-4 text-right text-[10px] uppercase font-black text-slate-500">Aktual Terakhir</th>
              <th className="px-6 py-4 text-right text-[10px] uppercase font-black text-slate-500">Prediksi LSTM</th>
              <th className="px-6 py-4 text-right text-[10px] uppercase font-black text-slate-500">MAPE</th>
              <th className="px-6 py-4 text-left text-[10px] uppercase font-black text-slate-500">Harga Petani</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((commodity) => {
              const lastHistory = commodity.history[commodity.history.length - 1];

              return (
                <tr key={commodity.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{commodity.image}</span>
                      <div>
                        <p className="font-black text-slate-900">{commodity.name}</p>
                        <p className="text-xs text-slate-500">Dataset {commodity.history.length} bulan</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                      {commodity.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-slate-700">{lastHistory.actual.toLocaleString('id-ID')} kg</td>
                  <td className="px-6 py-4 text-right font-black text-emerald-700">{lastHistory.predicted.toLocaleString('id-ID')} kg</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-700">{formatMape(commodity.metrics.mape)}</td>
                  <td className="px-6 py-4 font-semibold text-slate-600">
                    {commodity.pricePerKgRange || <span className="text-amber-600 italic">Upload data harga dahulu</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
