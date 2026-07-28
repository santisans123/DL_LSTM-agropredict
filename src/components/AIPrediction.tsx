import React from 'react';
import { motion } from 'motion/react';
import { Brain, Sparkles, TrendingUp, TrendingDown, Info } from 'lucide-react';

interface Props {
  predictionValue: number;
  status: 'up' | 'down';
  pctChange: number;
  aiInsight: string | null;
  loading: boolean;
  commodityName: string;
}

function cleanMarkdown(text: string) {
  return text.replace(/\*\*/g, '').replace(/\*/g, '').trim();
}

function renderInsight(text: string) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const titleLine = lines.find((line) => !line.startsWith('*') || !line.includes(':'));
  const bulletLines = lines.filter((line) => /^\*\s+\*\*.+?\*\*:/.test(line));

  if (!bulletLines.length) {
    return <p>{cleanMarkdown(text)}</p>;
  }

  return (
    <div className="space-y-3">
      {titleLine && (
        <p className="text-xs font-bold uppercase tracking-wide text-slate-300">
          {cleanMarkdown(titleLine)}
        </p>
      )}
      <div className="grid grid-cols-1 gap-3">
        {bulletLines.map((line, index) => {
          const match = line.match(/^\*\s+\*\*(.+?)\*\*:\s*(.*)$/);
          const heading = match ? cleanMarkdown(match[1]) : `Rekomendasi ${index + 1}`;
          const body = match ? cleanMarkdown(match[2]) : cleanMarkdown(line);

          return (
            <div key={`${heading}-${index}`} className="rounded-xl bg-white/5 p-3.5 border border-white/10">
              <h5 className="text-[10px] font-black uppercase tracking-wide text-green-300 mb-1">
                {heading}
              </h5>
              <p className="text-xs md:text-[13px] leading-5 text-slate-300">
                {body}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AIPrediction({ predictionValue, status, pctChange, aiInsight, loading, commodityName }: Props) {
  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-5 md:p-6 text-white relative overflow-hidden shadow-xl">
      {/* Decorative patterns */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 blur-[100px] rounded-full"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full"></div>

      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
              <Brain className="text-green-400 w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">{commodityName} Prediction</h3>
              <p className="text-slate-400 text-xs font-medium">LSTM Time-Series Analysis</p>
            </div>
          </div>
          <div className="flex w-fit shrink-0 items-center gap-2 bg-white/5 border border-white/10 px-3 py-2 rounded-full backdrop-blur-md">
            <Sparkles className="text-yellow-400 w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Powered by Gemini AI</span>
          </div>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-5 sm:items-end">
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Estimasi Produksi {commodityName} Bulan Depan</p>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl md:text-5xl font-black text-white">{predictionValue.toLocaleString('id-ID')}</span>
                <span className="text-xl font-bold text-green-400">kg</span>
              </div>
            </div>

            <div className="flex items-center gap-5 rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
              <div className="flex flex-col">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Status</p>
                <div className={`flex items-center gap-2 font-bold ${status === 'up' ? 'text-green-400' : 'text-rose-400'}`}>
                  {status === 'up' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                  <span className="uppercase text-base">{status === 'up' ? 'Meningkat' : 'Menurun'}</span>
                </div>
              </div>
              <div className="w-[1px] h-10 bg-white/10"></div>
              <div className="flex flex-col">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Perubahan</p>
                <span className="text-xl font-bold">{pctChange}%</span>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <Info className="text-blue-400 w-4 h-4 shrink-0" />
              <h4 className="text-xs font-black uppercase tracking-widest">AI Strategic Insights</h4>
            </div>
            
            {loading ? (
              <div className="space-y-3">
                <div className="h-4 bg-white/10 rounded-full animate-pulse w-full"></div>
                <div className="h-4 bg-white/10 rounded-full animate-pulse w-[90%] font-mono"></div>
                <div className="h-4 bg-white/10 rounded-full animate-pulse w-[75%]"></div>
              </div>
            ) : (
              <div className="text-sm leading-6 text-slate-300 font-medium whitespace-normal break-words">
                {aiInsight
                  ? renderInsight(aiInsight)
                  : `Wawasan strategis untuk budidaya ${commodityName} optimal pada kondisi iklim Cisarua.`}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
