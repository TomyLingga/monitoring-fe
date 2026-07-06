import React, { useState } from 'react';
import GlassCard from '../GlassCard';
import { Factory, ArrowRight, ClipboardList, Info, Play, Calendar, User } from 'lucide-react';

export default function ProduksiView({ productionData }) {
  const [activeTab, setActiveTab] = useState('refinery'); // 'refinery', 'fraksinasi', 'packaging'

  const tabItems = [
    { id: 'refinery', label: 'Refinery Process', desc: 'CPO → RBDPO & PFAD' },
    { id: 'fraksinasi', label: 'Fractionation Process', desc: 'RBDPO → Olein & Stearin' },
    { id: 'packaging', label: 'Packaging Line', desc: 'Olein → Kemasan Jerigen/Box' },
  ];

  const renderProcessList = (processes) => {
    return (
      <div className="space-y-4">
        {processes.map((p) => (
          <div key={p.id} className="p-5 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-4">
            {/* Process Header */}
            <div className="flex justify-between items-start flex-wrap gap-2 border-b border-slate-900 pb-3">
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded-lg bg-teal-500/10 flex items-center justify-center border border-teal-500/30">
                  <Factory className="h-4.5 w-4.5 text-teal-400" />
                </div>
                <div>
                  <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400">
                    <span className="flex items-center space-x-1"><Calendar className="h-3 w-3" /> <span>{p.tgl}</span></span>
                    <span>•</span>
                    <span>{p.shift}</span>
                  </div>
                  <h4 className="font-bold text-white text-sm mt-0.5">Operator: {p.operator}</h4>
                </div>
              </div>
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-teal-300">
                PROSES #{p.id}
              </span>
            </div>

            {/* Inputs & Outputs flow */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-2">
              {/* Inputs */}
              <div className="flex-1 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bahan Baku (Input)</span>
                <div className="space-y-1">
                  {p.bahan.map((b, i) => (
                    <div key={i} className="flex justify-between text-xs bg-slate-900/60 p-2 rounded border border-slate-850">
                      <span className="text-slate-300 font-medium">{b.nama}</span>
                      <strong className="text-white">{b.qty} Ton</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center shrink-0">
                <div className="h-8 w-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                  <ArrowRight className="h-4 w-4 text-teal-400" />
                </div>
              </div>

              {/* Outputs */}
              <div className="flex-1 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Hasil Produk (Output)</span>
                <div className="space-y-1">
                  {p.hasil.map((h, i) => (
                    <div key={i} className="flex justify-between text-xs bg-slate-900/60 p-2 rounded border border-slate-850">
                      <span className="text-teal-300 font-medium">{h.nama}</span>
                      <strong className="text-teal-400">{h.qty} Ton</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Notes */}
            {p.catatan && (
              <div className="flex space-x-2 text-xs text-slate-400 bg-slate-900/30 p-3 rounded-lg border border-slate-800/40">
                <Info className="h-4 w-4 text-teal-500 shrink-0 mt-0.5" />
                <p className="leading-relaxed"><strong className="text-slate-300">Catatan:</strong> {p.catatan}</p>
              </div>
            )}
          </div>
        ))}

        {processes.length === 0 && (
          <div className="py-12 text-center text-slate-500 font-semibold">
            Belum ada aktivitas produksi tercatat untuk lini ini.
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Tabs list */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tabItems.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`p-4.5 rounded-2xl glass-card text-left transition-all relative border flex flex-col justify-between ${
              activeTab === tab.id
                ? 'border-teal-500/60 bg-gradient-to-br from-teal-500/10 to-sky-500/5 shadow-lg shadow-teal-500/5'
                : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className={`text-xs font-bold ${activeTab === tab.id ? 'text-teal-300' : 'text-slate-400'}`}>
                {tab.label}
              </span>
              <Factory className={`h-4.5 w-4.5 ${activeTab === tab.id ? 'text-teal-400' : 'text-slate-500'}`} />
            </div>
            <p className="text-[10px] text-slate-500 font-semibold">{tab.desc}</p>
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <GlassCard hover={false}>
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white uppercase tracking-wider">Aktivitas Lini {activeTab}</h3>
            <p className="text-xs text-slate-400">Log batch produksi harian untuk proses refinery, fraksinasi, dan kemasan</p>
          </div>
          <button className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-bold hover:bg-teal-500/20 transition-all">
            <Play className="h-3 w-3 fill-current" />
            <span>Mulai Batch Baru</span>
          </button>
        </div>

        {activeTab === 'refinery' && renderProcessList(productionData.refinery)}
        {activeTab === 'fraksinasi' && renderProcessList(productionData.fraksinasi)}
        {activeTab === 'packaging' && renderProcessList(productionData.packaging)}
      </GlassCard>
    </div>
  );
}
