import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell, AreaChart, Area, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { ProductionHistory, WeatherData } from '@/src/types';

interface Props {
  history: ProductionHistory[];
  weather: WeatherData[];
}

export function Charts({ history, weather }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Actual vs Prediksi */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-md font-bold text-slate-900 mb-6 flex items-center gap-2">
          <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
          Data Aktual vs Prediksi LSTM
        </h3>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 8, right: 14, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis width={58} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} unit="kg" />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                cursor={{ stroke: '#cbd5e1', strokeWidth: 2 }}
              />
              <Legend verticalAlign="top" align="right" />
              <Line type="monotone" dataKey="actual" name="Aktual" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="predicted" name="Prediksi LSTM" stroke="#3b82f6" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Produksi Bulanan */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-md font-bold text-slate-900 mb-6 flex items-center gap-2">
          <div className="w-1.5 h-6 bg-green-500 rounded-full"></div>
          Distribusi Hasil Produksi (kg)
        </h3>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={history} margin={{ top: 8, right: 10, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis width={58} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} unit="kg" />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
              <Bar dataKey="actual" name="Produksi" radius={[4, 4, 0, 0]} barSize={42}>
                {history.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#34d399'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pengaruh Suhu */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-md font-bold text-slate-900 mb-6 flex items-center gap-2">
          <div className="w-1.5 h-6 bg-orange-500 rounded-full"></div>
          Korelasi Suhu vs Hasil Produksi
        </h3>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weather} margin={{ top: 8, right: 6, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" width={44} stroke="#f59e0b" fontSize={10} tickLine={false} axisLine={false} unit="°C" />
              <YAxis yAxisId="right" width={52} orientation="right" stroke="#10b981" fontSize={10} tickLine={false} axisLine={false} unit="kg" />
              <Tooltip contentStyle={{ borderRadius: '12px' }} />
              <Area yAxisId="left" type="monotone" dataKey="temp" name="Suhu (°C)" stroke="#f59e0b" fillOpacity={1} fill="url(#colorTemp)" />
              <Area yAxisId="right" type="monotone" dataKey="production" name="Produksi (kg)" stroke="#10b981" fillOpacity={1} fill="url(#colorProd)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tren Hasil Produksi */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-md font-bold text-slate-900 mb-6 flex items-center gap-2">
          <div className="w-1.5 h-6 bg-purple-500 rounded-full"></div>
          Analisis Tren Hasil Produksi
        </h3>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 8, right: 14, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis width={58} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} unit="kg" />
              <Tooltip />
              <Line type="step" dataKey="actual" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
