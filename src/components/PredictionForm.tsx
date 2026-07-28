import React from 'react';
import { PredictionData } from '@/src/types';
import { Calculator, Shovel, Droplets, Thermometer, Wind, DollarSign, CalendarClock, CloudRain } from 'lucide-react';

interface Props {
  data: PredictionData;
  onChange: (data: PredictionData) => void;
  onSubmit: () => void;
  loading?: boolean;
}

export function PredictionForm({ data, onChange, onSubmit, loading = false }: Props) {
  const handleChange = (field: keyof PredictionData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const InputField = ({ label, field, icon: Icon, unit, type = "number", readOnly = false, hint }: any) => (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5 leading-tight">
        <Icon size={14} className="text-slate-400" />
        {label}
      </label>
      <div className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 transition-all ${
        readOnly
          ? 'border-slate-200 bg-slate-100'
          : 'border-slate-200 bg-slate-50 focus-within:ring-2 focus-within:ring-green-500/20 focus-within:border-green-500'
      }`}>
        <input
          type={type}
          value={(data as any)[field] ?? ''}
          onChange={readOnly ? undefined : (e) => handleChange(field, type === 'number' ? parseFloat(e.target.value) : e.target.value)}
          inputMode={type === 'number' ? 'decimal' : undefined}
          step={type === 'number' ? 'any' : undefined}
          readOnly={readOnly}
          className={`min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none tabular-nums placeholder:text-slate-400 ${
            readOnly ? 'text-slate-500 cursor-not-allowed' : 'text-slate-900'
          }`}
          placeholder="0"
        />
        {unit && (
          <span className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-500">
            {unit}
          </span>
        )}
      </div>
      {hint && <p className="text-[10px] font-semibold text-slate-400">{hint}</p>}
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
          <Calculator size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Input Variabel Prediksi</h3>
          <p className="text-xs text-slate-500">Masukkan parameter untuk estimasi bulan depan</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-l-2 border-green-500 pl-3">Penggunaan Lahan (Hektar)</h4>
          <InputField label="Luas Tanam Akhir" field="luasTanamAkhir" icon={Shovel} unit="ha" />
          <InputField label="Luas Panen Habis" field="luasPanenHabis" icon={Shovel} unit="ha" />
          <InputField label="Luas Panen Belum Habis" field="luasPanenBelumHabis" icon={Shovel} unit="ha" />
          <InputField label="Luas Rusak" field="luasRusak" icon={Shovel} unit="ha" />
          <InputField label="Luas Tambah Tanam" field="luasTambahTanam" icon={Shovel} unit="ha" />
        </div>

        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-l-2 border-blue-500 pl-3">Produksi & Kondisi</h4>
          <InputField label="Pupuk" field="pupuk" icon={Droplets} unit="kg" />
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5 font-mono">
              <Shovel size={14} className="text-slate-400" />
              Media Tanam
            </label>
            <select 
              value={data.mediaTanam}
              onChange={(e) => handleChange('mediaTanam', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
            >
              <option value="Tanah">Tanah</option>
              <option value="Hidroponik">Hidroponik</option>
              <option value="Rumah Kaca">Rumah Kaca</option>
            </select>
          </div>
          <InputField label="Produksi Habis" field="produksiHabis" icon={Droplets} unit="kg" />
          <InputField label="Produksi Belum Habis" field="produksiBelumHabis" icon={Droplets} unit="kg" />
          <InputField label="Harga Jual Petani" field="hargaJual" icon={DollarSign} unit="Rp/kg" />
        </div>

        <div className="md:col-span-2 mt-2 space-y-4">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-l-2 border-orange-500 pl-3">Parameter Iklim & Lingkungan</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Suhu Maks" field="suhuMax" icon={Thermometer} unit="°C" readOnly hint="Otomatis dari Open-Meteo / BPP" />
            <InputField label="Suhu Min" field="suhuMin" icon={Thermometer} unit="°C" readOnly hint="Otomatis dari Open-Meteo / BPP" />
            <InputField label="Suhu Rerata" field="suhuAvg" icon={Thermometer} unit="°C" readOnly hint="Otomatis dari Open-Meteo / BPP" />
            <InputField label="Curah Hujan" field="curahHujan" icon={CloudRain} unit="mm" readOnly hint="Otomatis dari Open-Meteo / BPP" />
            <InputField label="Angin Maks" field="kecepatanAngin" icon={Wind} unit="m/s" readOnly hint="Otomatis dari Open-Meteo / BPP" />
          </div>
        </div>
      </div>

      <button 
        onClick={onSubmit}
        disabled={loading}
        className="w-full mt-6 bg-green-600 hover:bg-green-700 disabled:cursor-wait disabled:bg-green-500 disabled:opacity-80 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-green-600/20 flex items-center justify-center gap-2"
      >
        <CalendarClock size={18} />
        {loading ? 'Memproses Prediksi...' : 'Prediksi Bulan Depan dengan LSTM'}
      </button>
    </div>
  );
}
