import React from 'react';
import { TrendingUp, Database, Thermometer, Target, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  totalProduction: number;
  numData: number;
  avgTemp: number;
  nextMonthPrediction: number;
  accuracy: number;
  productionSource: string;
  dataSource: string;
  tempSource: string;
  predictionSource: string;
  accuracySource: string;
}

function CpuIcon(props: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path d="M15 2v2" />
      <path d="M15 20v2" />
      <path d="M2 15h2" />
      <path d="M2 9h2" />
      <path d="M20 15h2" />
      <path d="M20 9h2" />
      <path d="M9 2v2" />
      <path d="M9 20v2" />
    </svg>
  );
}

export function StatCards({
  totalProduction,
  numData,
  avgTemp,
  nextMonthPrediction,
  accuracy,
  productionSource,
  dataSource,
  tempSource,
  predictionSource,
  accuracySource,
}: Props) {
  const stats = [
    {
      label: 'Total Produksi',
      value: totalProduction.toLocaleString('id-ID'),
      unit: 'kg',
      change: productionSource,
      trend: 'up',
      icon: Database,
      color: 'emerald',
    },
    {
      label: 'Jumlah Data',
      value: numData.toString(),
      unit: 'Bulan',
      change: dataSource,
      trend: 'none',
      icon: TrendingUp,
      color: 'blue',
    },
    {
      label: 'Rata-rata Suhu',
      value: avgTemp.toFixed(1),
      unit: '°C',
      change: tempSource,
      trend: 'none',
      icon: Thermometer,
      color: 'orange',
    },
    {
      label: 'Prediksi Bulan Depan',
      value: nextMonthPrediction.toLocaleString('id-ID'),
      unit: 'kg',
      change: predictionSource,
      trend: 'up',
      icon: Target,
      color: 'indigo',
    },
    {
      label: 'Akurasi Model',
      value: accuracy.toFixed(1),
      unit: '%',
      change: accuracySource,
      trend: 'none',
      icon: CpuIcon,
      color: 'green',
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
        >
          {/* Accent radial glow */}
          <div className="absolute top-0 right-0 w-24 h-24 -mr-6 -mt-6 bg-slate-100 rounded-full group-hover:scale-110 transition-transform duration-300"></div>
          
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className={`p-2.5 rounded-xl bg-${stat.color}-500/10 text-${stat.color}-600`}>
              <stat.icon size={20} />
            </div>
            {stat.trend !== 'none' && (
              <div className={`p-1.5 rounded-full ${
                stat.trend === 'up'
                  ? 'text-emerald-600 bg-emerald-50'
                  : 'text-rose-600 bg-rose-50'
              }`}>
                {stat.trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              </div>
            )}
          </div>

          <div className="relative z-10">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">{stat.label}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900">{stat.value}</span>
              <span className="text-xs font-semibold text-slate-400">{stat.unit}</span>
            </div>
            <p
              className="mt-2 text-[10px] font-semibold leading-4 text-slate-400 truncate"
              title={stat.change}
            >
              Sumber: {stat.change.split('/').pop()}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
