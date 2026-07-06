import React from 'react';
import GlassCard from '../GlassCard';
import { Calendar, Tag, Truck, MapPin, User, FileSpreadsheet } from 'lucide-react';

export default function IncomingView({ incomingLogs }) {
  return (
    <div className="space-y-6">
      <GlassCard hover={false}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-bold text-white font-sans">Log Penerimaan CPO (Surat Jalan)</h3>
            <p className="text-xs text-slate-400">Daftar lengkap logistik masuk dari armada supplier</p>
          </div>
          <FileSpreadsheet className="h-5 w-5 text-teal-400" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Kontrak</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Kendaraan / Supir</th>
                <th className="py-3 px-4">Tangki Tujuan</th>
                <th className="py-3 px-4 text-right">Kuantitas</th>
                <th className="py-3 px-4">Surat Jalan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {incomingLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3.5 px-4 font-medium flex items-center space-x-2">
                    <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span>{log.tgl}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-teal-400">{log.kontrak_cpo?.nomor_kontrak}</td>
                  <td className="py-3.5 px-4">{log.kontrak_cpo?.supplier?.nama}</td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-1.5 text-slate-400 font-semibold">
                      <Truck className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <span>{log.no_kendaraan || '-'}</span>
                      <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-500">
                        {log.supir || '-'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <span>{log.storage?.nama_tangki || log.storage?.nama || 'Tangki Utama'}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-extrabold text-white">{log.qty.toLocaleString('id-ID')} Ton</td>
                  <td className="py-3.5 px-4">
                    <span className="bg-slate-900/80 border border-slate-800 px-2.5 py-1 rounded text-slate-400 font-medium">
                      {log.no_surat_jalan || 'N/A'}
                    </span>
                  </td>
                </tr>
              ))}
              {incomingLogs.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500 font-semibold">
                    Belum ada armada CPO masuk yang tercatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
