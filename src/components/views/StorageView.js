import React from 'react';
import GlassCard from '../GlassCard';
import { Database, Warehouse, BarChart3, AlertCircle } from 'lucide-react';

export default function StorageView({ storages }) {
  return (
    <div className="space-y-6">
      {/* Visualisation Area */}
      <GlassCard hover={false}>
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-lg font-bold text-white">Visualisasi Level Kapasitas Real-time</h3>
            <p className="text-xs text-slate-400">Indikator visual level pengisian Tangki Cair & Gudang Padat/Kemasan</p>
          </div>
          <BarChart3 className="h-5 w-5 text-teal-400" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {storages.map((storage) => {
            const isTank = storage.jenis === 'tangki';
            const percentage = Math.min(storage.persentase || 0, 100);
            
            // Dynamic liquid color based on product type
            let liquidColor = 'from-amber-500/80 to-yellow-600/80';
            if (storage.tipe === 'RPO') liquidColor = 'from-amber-400/80 to-amber-500/80';
            if (storage.tipe === 'Olein') liquidColor = 'from-yellow-400/70 to-yellow-500/80';
            if (storage.tipe === 'Stearin') liquidColor = 'from-slate-300/80 to-slate-400/80';
            if (storage.tipe === 'PFAD') liquidColor = 'from-amber-800/80 to-yellow-900/80';

            return (
              <div 
                key={storage.id} 
                className="flex flex-col items-center bg-slate-950/30 border border-slate-900 rounded-2xl p-6 space-y-4 hover:border-slate-800/80 transition-colors"
              >
                {/* 1. Storage Header */}
                <div className="text-center">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                    isTank ? 'bg-teal-950 text-teal-300 border border-teal-800/60' : 'bg-indigo-950 text-indigo-300 border border-indigo-800/60'
                  }`}>
                    {storage.jenis}
                  </span>
                  <h4 className="font-bold text-white text-sm mt-1.5">{storage.nama}</h4>
                  <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mt-0.5">Produk: {storage.tipe || 'N/A'}</p>
                </div>

                {/* 2. Visual Component */}
                {isTank ? (
                  /* Tank Cylinder Visualisation */
                  <div className="relative w-28 h-40 bg-slate-900/80 rounded-t-3xl rounded-b-xl border-2 border-slate-800 flex flex-col justify-end overflow-hidden shadow-inner shadow-black/80">
                    {/* Measurement lines */}
                    <div className="absolute inset-0 flex flex-col justify-between py-4 text-[8px] font-bold text-slate-700 select-none pointer-events-none">
                      <div className="border-t border-slate-800/60 w-full pl-2">100%</div>
                      <div className="border-t border-slate-800/60 w-full pl-2">75%</div>
                      <div className="border-t border-slate-800/60 w-full pl-2">50%</div>
                      <div className="border-t border-slate-800/60 w-full pl-2">25%</div>
                    </div>
                    {/* Liquid fill */}
                    <div 
                      className={`w-full bg-gradient-to-t ${liquidColor} rounded-b-lg transition-all duration-1000 ease-in-out relative flex items-center justify-center`}
                      style={{ height: `${percentage}%` }}
                    >
                      {percentage > 15 && (
                        <span className="text-[10px] font-black text-white drop-shadow-md select-none">{percentage}%</span>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Warehouse Crates Visualisation */
                  <div className="w-28 h-40 bg-slate-900/80 rounded-xl border-2 border-slate-800 p-2.5 grid grid-cols-2 grid-rows-3 gap-2 relative shadow-inner shadow-black/80">
                    {/* Filling grid elements */}
                    {[...Array(6)].map((_, idx) => {
                      // Calculate if this block should be "filled"
                      const fillThreshold = ((6 - idx) / 6) * 100;
                      const isFilled = percentage >= (fillThreshold - 10);
                      
                      return (
                        <div 
                          key={idx} 
                          className={`rounded border transition-all duration-500 flex items-center justify-center ${
                            isFilled 
                              ? 'bg-indigo-500/40 border-indigo-500 text-indigo-300 shadow-sm shadow-indigo-500/10' 
                              : 'bg-slate-950/60 border-slate-800 text-slate-800'
                          }`}
                        >
                          <Warehouse className="h-4 w-4" />
                        </div>
                      );
                    })}
                    {/* Percentage overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="bg-slate-950/80 border border-slate-800 px-2 py-0.5 rounded text-[10px] font-black text-slate-300 shadow-md">
                        {percentage}%
                      </span>
                    </div>
                  </div>
                )}

                {/* 3. Text Info */}
                <div className="w-full text-center space-y-1 pt-1">
                  <div className="flex justify-between text-xs border-b border-slate-900 pb-1 text-slate-400">
                    <span>Terisi</span>
                    <strong className="text-slate-300">{storage.terisi.toLocaleString('id-ID')} Ton</strong>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Kapasitas</span>
                    <strong className="text-slate-300">{storage.kapasitas.toLocaleString('id-ID')} Ton</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}
