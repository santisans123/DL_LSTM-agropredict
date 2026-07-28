import React, { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BrainCircuit } from 'lucide-react';

interface ShapRow {
  feature: string;
  label: string;
  importance: number;
}

export function ShapExplanation() {
  const [rows, setRows] = useState<ShapRow[]>([]);
  const [source, setSource] = useState('SHAP feature importance');

  useEffect(() => {
    fetch('/api/shap/feature-importance')
      .then((res) => res.json())
      .then((data) => {
        setRows((data.rows || []).slice(0, 7));
        setSource(data.source || 'SHAP feature importance');
      })
      .catch(() => {
        setRows([
          { feature: 'Suhu_Rata', label: 'Suhu Rata', importance: 0.0409 },
          { feature: 'bulan_cos', label: 'Bulan Cos', importance: 0.0253 },
          { feature: 'Luas_Panen_ha', label: 'Luas Panen Ha', importance: 0.0239 },
        ]);
      });
  }, []);

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <BrainCircuit size={20} />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-900">Explainable AI SHAP</h3>
          <p className="text-xs font-medium text-slate-500">Fitur paling berpengaruh terhadap hasil prediksi LSTM.</p>
        </div>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[...rows].reverse()} layout="vertical" margin={{ top: 4, right: 16, left: 24, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis dataKey="label" type="category" width={120} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(value: number) => [value.toFixed(4), 'Importance']}
              contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
            />
            <Bar dataKey="importance" fill="#4f46e5" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-4 text-xs leading-5 font-medium text-slate-500">
        Sumber: {source}. Nilai lebih besar berarti fitur tersebut lebih sering memengaruhi keputusan model.
      </p>
    </section>
  );
}
