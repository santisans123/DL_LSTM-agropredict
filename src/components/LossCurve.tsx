import React, { useMemo, useState } from "react";
import { Activity, BarChart3, CircleDot } from 'lucide-react';

export function LossCurve() {
  const sources = useMemo(() => [
    "/program_colabs/artefak_model/loss_lstm_revisi.png",
    "/api/artifacts/loss_lstm_revisi.png",
  ], []);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
          <Activity size={20} />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-900">Grafik Total Loss</h3>
          <p className="text-xs font-medium text-slate-500">Perbandingan training loss dan validation loss selama pelatihan LSTM.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
        {imageError ? (
          <div className="h-[320px] w-full rounded-xl bg-white flex items-center justify-center text-sm font-semibold text-slate-400 border border-dashed border-slate-200">
            Grafik loss belum termuat
          </div>
        ) : (
          <img
            src={sources[sourceIndex]}
            alt="Grafik total loss training dan validation"
            className="h-[320px] w-full rounded-xl object-contain bg-white"
            onError={() => {
              if (sourceIndex < sources.length - 1) {
                setSourceIndex(sourceIndex + 1);
              } else {
                setImageError(true);
              }
            }}
          />
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 flex items-center gap-2">
          <BarChart3 size={14} className="text-rose-500" />
          <span className="font-semibold text-slate-600">Training loss turun stabil</span>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 flex items-center gap-2">
          <CircleDot size={14} className="text-amber-500" />
          <span className="font-semibold text-slate-600">Validation loss dipantau</span>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 flex items-center gap-2">
          <Activity size={14} className="text-slate-500" />
          <span className="font-semibold text-slate-600">Indikasi overfitting rendah</span>
        </div>
      </div>
    </section>
  );
}
