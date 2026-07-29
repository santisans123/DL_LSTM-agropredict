import React, { useRef, useState } from 'react';
import { CalendarClock, CheckCircle2, Download, FileSpreadsheet, Send, Table2, UploadCloud, XCircle } from 'lucide-react';
import { DatasetType, DatasetUploadResult } from '@/src/types';

const DATASET_OPTIONS: Array<{ value: DatasetType; label: string; description: string }> = [
  {
    value: 'production',
    label: 'Data Produksi',
    description: 'Produksi, luas panen, luas rusak, tambah tanam, dan harga.',
  },
  {
    value: 'fertilizer',
    label: 'Data Pupuk',
    description: 'Total pupuk per komoditas dan kategori tanaman.',
  },
];

const FORMAT_GUIDE: Record<DatasetType, string[]> = {
  production: [
    'Tahun',
    'Bulan',
    'Nama Komoditas',
    'Luas Panen Habis',
    'Luas Panen Belum Habis',
    'Luas Rusak',
    'Luas Tambah Tanam',
    'Produksi Habis (Kw)',
    'Produksi Belum Habis (Kw)',
    'Harga Jual Petani (Rp/Kg)',
  ],
  weather: [
    'Open-Meteo otomatis',
  ],
  fertilizer: [
    'Jenis_Tanaman',
    'Kategori',
    'Total_Pupuk_Kg',
  ],
};

interface Props {
  fileName: string | null;
  activeCommodityName: string;
  uploadResult: DatasetUploadResult | null;
  activeDatasets: Partial<Record<DatasetType, DatasetUploadResult>>;
  onPreviewLoaded: (result: DatasetUploadResult) => void;
  onApplyDataset: (result: DatasetUploadResult) => void;
}

export function MonthlyUpload({
  fileName,
  activeCommodityName,
  uploadResult,
  activeDatasets,
  onPreviewLoaded,
  onApplyDataset,
}: Props) {
  const excelInputRef = useRef<HTMLInputElement | null>(null);
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const [datasetType, setDatasetType] = useState<DatasetType>('production');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/dataset/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Dataset-Type': datasetType,
          'X-File-Name': file.name,
          'X-Commodity-Name': activeCommodityName,
        },
        body: await file.arrayBuffer(),
      });
      const text = await resp.text();
      const data = text ? JSON.parse(text) : null;
      if (!data) {
        throw new Error('Server upload belum merespons. Restart npm run dev lalu coba import lagi.');
      }
      if (!resp.ok) throw new Error(data.error || 'Dataset belum bisa diproses.');
      onPreviewLoaded(data as DatasetUploadResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dataset belum bisa diproses. Pastikan server sudah direstart.');
    } finally {
      setLoading(false);
    }
  };

  const previewHeaders = uploadResult?.previewRows[0]
    ? Object.keys(uploadResult.previewRows[0])
    : [];
  const appliedForPreviewType = uploadResult ? activeDatasets[uploadResult.datasetType]?.fileName : null;
  const isApplied = Boolean(uploadResult?.fileName && appliedForPreviewType === uploadResult.fileName);
  const activeCount = DATASET_OPTIONS.filter((option) => activeDatasets[option.value]?.fileName).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <UploadCloud size={22} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">Upload Data Bulanan</h3>
            <p className="mt-1 text-sm leading-6 font-medium text-slate-500">
              Pilih tipe dataset, unduh template, lalu unggah file agar nilai terbaru masuk ke form prediksi. Data cuaca diambil otomatis dari Open-Meteo.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 min-w-[280px]">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
            <FileSpreadsheet size={14} />
            Dataset Preview
          </div>
          <p className="mt-1 truncate text-sm font-bold text-slate-800">
            {fileName || 'Belum ada file diunggah'}
          </p>
          <p className="mt-1 truncate text-[11px] font-bold text-emerald-700">
            {activeCount ? `${activeCount}/${DATASET_OPTIONS.length} dataset aktif` : 'Belum ada dataset aktif'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {DATASET_OPTIONS.map((option) => {
          const active = activeDatasets[option.value];
          return (
            <div
              key={option.value}
              className={`rounded-xl border px-4 py-3 ${
                active
                  ? 'border-emerald-100 bg-emerald-50'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <p className={`text-[10px] font-black uppercase tracking-widest ${
                active ? 'text-emerald-700' : 'text-slate-500'
              }`}>
                {option.label}
              </p>
              <p className={`mt-1 truncate text-xs font-bold ${
                active ? 'text-emerald-950' : 'text-slate-500'
              }`}>
                {active?.fileName || 'Belum diterapkan'}
              </p>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(320px,1fr)_auto] gap-4 xl:items-end">
          <label className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tipe Dataset</span>
            <select
              value={datasetType}
              onChange={(event) => setDatasetType(event.target.value as DatasetType)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
            >
              {DATASET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <p className="text-xs font-medium text-slate-500">
              {DATASET_OPTIONS.find((option) => option.value === datasetType)?.description}
            </p>
            {datasetType === 'production' && (
              <p className="text-xs font-semibold text-slate-400">
                Parameter iklim tidak diunggah manual. Sistem mengambilnya dari Open-Meteo / BPP.
              </p>
            )}
          </label>

          <div className="flex flex-col sm:flex-row gap-3 xl:self-start xl:pt-[22px]">
            <a
              href={`/api/dataset/template/${datasetType}`}
              className="inline-flex h-12 min-w-[210px] items-center justify-center gap-2 rounded-xl bg-blue-50 px-5 text-sm font-black text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <Download size={17} />
              Download Template
            </a>

            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
                event.target.value = '';
              }}
            />
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
                event.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => excelInputRef.current?.click()}
              disabled={loading}
              className="inline-flex h-12 min-w-[170px] items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-black text-white shadow-sm hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70 transition-colors"
            >
              <CalendarClock size={17} />
              {loading ? 'Membaca File...' : 'Upload Excel'}
            </button>
            <button
              type="button"
              onClick={() => csvInputRef.current?.click()}
              disabled={loading}
              className="inline-flex h-12 min-w-[170px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-black text-slate-800 shadow-sm hover:bg-slate-100 disabled:cursor-wait disabled:opacity-70 transition-colors"
            >
              <FileSpreadsheet size={17} />
              {loading ? 'Membaca File...' : 'Upload CSV'}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Format Kolom Wajib</p>
          <p className="text-[11px] font-semibold text-slate-500">
            Berlaku sama untuk file Excel (.xlsx) maupun CSV (.csv)
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {FORMAT_GUIDE[datasetType].map((column) => (
            <span key={column} className="rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-700">
              {column}
            </span>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 flex gap-3 text-sm font-bold text-rose-700">
          <XCircle size={18} className="shrink-0" />
          {error}
        </div>
      )}

      {uploadResult && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-black text-emerald-950">
                  {uploadResult.valid ? 'Dataset bisa dipakai' : 'Dataset perlu diperbaiki'}
                </p>
                <p className="mt-1 text-xs leading-5 font-semibold text-emerald-800">
                  {uploadResult.valid
                    ? isApplied
                      ? `${uploadResult.rowsCount} baris terbaca dan dataset ${DATASET_OPTIONS.find((option) => option.value === uploadResult.datasetType)?.label.toLowerCase()} sudah masuk ke dashboard.`
                      : `${uploadResult.rowsCount} baris terbaca. Klik tombol terapkan agar nilai dan daftar komoditas masuk ke dashboard.`
                    : `Kolom belum lengkap: ${uploadResult.missingColumns.join(', ')}`}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Field yang Dipakai</p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(uploadResult.appliedPatch).length ? (
                  Object.entries(uploadResult.appliedPatch).map(([key, value]) => (
                    <span key={key} className="rounded-lg bg-white/80 border border-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-900">
                      {key}: {String(value)}
                    </span>
                  ))
                ) : (
                  <span className="text-xs font-semibold text-emerald-800">Belum ada nilai yang cocok dengan komoditas aktif.</span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onApplyDataset(uploadResult)}
              disabled={isApplied || !uploadResult.valid || !Object.keys(uploadResult.appliedPatch).length}
              className={`mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-black shadow-sm transition-colors ${
                isApplied
                  ? 'bg-emerald-100 text-emerald-800 cursor-default'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500'
              }`}
            >
              {isApplied ? <CheckCircle2 size={17} /> : <Send size={16} />}
              {isApplied ? 'Sudah Diterapkan' : 'Terapkan ke Dashboard'}
            </button>

            {isApplied && (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-white/80 p-3 text-xs font-bold leading-5 text-emerald-900">
                Data aktif sudah diperbarui. Produksi, cuaca, dan pupuk bisa diterapkan bergantian tanpa menghapus dataset aktif lainnya.
              </div>
            )}
          </div>

          <div className="xl:col-span-8 rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <Table2 size={16} className="text-slate-500" />
              <p className="text-sm font-black text-slate-900">
                Preview Data Terbaca
                {uploadResult.previewRows.length ? (
                  <span className="ml-2 text-xs font-bold text-slate-400">({uploadResult.previewRows.length} baris contoh)</span>
                ) : null}
              </p>
            </div>
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full min-w-[640px] text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    {previewHeaders.map((header) => (
                      <th key={header} className="px-4 py-3 text-left font-black uppercase tracking-widest text-slate-500">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {uploadResult.previewRows.map((row, index) => (
                    <tr key={index}>
                      {previewHeaders.map((header) => (
                        <td key={header} className="px-4 py-3 font-semibold text-slate-700">
                          {String(row[header] ?? '-')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
