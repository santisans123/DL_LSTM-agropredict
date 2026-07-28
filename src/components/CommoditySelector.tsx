import React from 'react';
import { Commodity } from '../constants';
import { Leaf, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  commodities: Commodity[];
  selectedId: string;
  onSelect: (commodity: Commodity) => void;
}

const formatMape = (value: number) => (Number.isFinite(value) ? `${value}%` : '-');

export function CommoditySelector({ commodities, selectedId, onSelect }: Props) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Leaf className="text-green-600 w-6 h-6" />
            Daftar Komoditas Hortikultura
          </h2>
          <p className="text-sm text-slate-500 font-medium">Pilih salah satu komoditas untuk memuat konfigurasi model LSTM terlatih</p>
        </div>
        <div className="flex w-fit items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-xs font-black">
          <Sparkles size={14} />
          <span>{commodities.length} Komoditas Aktif</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 gap-5 xl:gap-6">
        {commodities.map((crop) => {
          const isSelected = crop.id === selectedId;
          const typicalPrediction = crop.history[crop.history.length - 1].predicted;
          
          return (
            <motion.button
              key={crop.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(crop)}
              className={`p-4 rounded-2xl border-2 text-left transition-all duration-200 relative overflow-hidden flex flex-col justify-between min-h-[158px] ${
                isSelected 
                  ? 'border-green-600 bg-white shadow-lg shadow-green-600/10' 
                  : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm hover:shadow-md'
              }`}
            >
              <div className="flex justify-between items-start w-full">
                <span className="text-3xl">{crop.image}</span>
                <span className={`text-[9px] font-extrabold px-2 py-1 rounded-lg uppercase ${
                  crop.category === 'Buah-buahan' 
                    ? 'bg-rose-50 text-rose-600' 
                    : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {crop.category}
                </span>
              </div>

              <div className="mt-3 text-left">
                <h3 className="font-black text-slate-800 text-base truncate">{crop.name}</h3>
                <p className="text-[10px] text-slate-400 font-bold font-mono uppercase mt-1 truncate">{crop.pricePerKgRange}</p>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between w-full">
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 uppercase font-black">MAPE</span>
                  <span className="text-sm font-black text-slate-700">{formatMape(crop.metrics.mape)}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[9px] text-slate-400 uppercase font-black">Est. Bulan Depan</span>
                  <span className="text-sm font-black text-green-600">{typicalPrediction.toLocaleString('id-ID')} kg</span>
                </div>
              </div>

              {isSelected && (
                <div className="absolute top-3 right-3 flex items-center justify-center bg-green-600 text-white p-1 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
