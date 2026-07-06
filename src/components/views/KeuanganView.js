import React from 'react';
import GlassCard from '../GlassCard';
import { Wallet, Landmark, TrendingUp, RefreshCw, Send, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function KeuanganView({ financeData }) {
  const formatRupiah = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  const pePercentage = Math.round((financeData.pe.pemakaian / (financeData.pe.target + financeData.pe.tambahan)) * 100);

  return (
    <div className="space-y-6">
      {/* Overview stats: Bank Accounts & PE Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bank Balances */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-base font-bold uppercase tracking-wider text-slate-400">Akun Rekening Kas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {financeData.saldoBank.map((bank) => (
              <GlassCard key={bank.id} className="relative overflow-hidden" hover={false}>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rekening Bank</span>
                    <h4 className="font-extrabold text-white text-base mt-0.5">{bank.nama_bank}</h4>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">No: {bank.no_rek}</p>
                  </div>
                  <Landmark className="h-5 w-5 text-teal-400" />
                </div>
                <div className="mt-6">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Saldo Terakhir</span>
                  <p className="text-2xl font-black text-white mt-1">
                    {bank.kurs > 1 
                      ? `USD ${bank.saldo.toLocaleString('id-ID')}`
                      : formatRupiah(bank.saldo)
                    }
                  </p>
                  {bank.kurs > 1 && (
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Setara: {formatRupiah(bank.saldo * bank.kurs)} (Kurs: Rp {bank.kurs.toLocaleString('id-ID')})
                    </p>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* Persetujuan Ekspor (PE) quota status */}
        <div className="space-y-4">
          <h3 className="text-base font-bold uppercase tracking-wider text-slate-400">Quota PE (Persetujuan Ekspor)</h3>
          <GlassCard className="flex flex-col justify-between h-[210px] border-teal-500/20" hover={false}>
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-slate-400">Total Alokasi Quota</span>
                <span className="text-[10px] font-black px-2 py-0.5 bg-teal-950 text-teal-300 border border-teal-800/60 rounded-full">
                  PE LOG
                </span>
              </div>
              <p className="text-2xl font-black text-white">{(financeData.pe.target + financeData.pe.tambahan).toLocaleString('id-ID')} Ton</p>
              <p className="text-[10px] text-slate-500 mt-1">
                Target Bulanan: {financeData.pe.target.toLocaleString('id-ID')} Ton • Tambahan: {financeData.pe.tambahan.toLocaleString('id-ID')} Ton
              </p>
            </div>

            {/* Quota bar visual */}
            <div className="space-y-1.5 mt-2">
              <div className="flex justify-between text-xs font-semibold text-slate-400">
                <span>Terpakai: {financeData.pe.pemakaian.toLocaleString('id-ID')} Ton ({pePercentage}%)</span>
                <span>Sisa: {financeData.pe.sisa.toLocaleString('id-ID')} Ton</span>
              </div>
              <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-sky-500 shadow-lg shadow-teal-500/25"
                  style={{ width: `${pePercentage}%` }}
                ></div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Outgoing Realized Payments Log */}
      <GlassCard hover={false}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-base font-bold text-white">Aktivitas Realisasi Pembayaran</h3>
            <p className="text-xs text-slate-400">Daftar pengeluaran kas / pelunasan kontrak supplier & vendor logistik</p>
          </div>
          <Wallet className="h-5 w-5 text-teal-400" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Tanggal Pembayaran</th>
                <th className="py-3 px-4">Mitra / Penerima</th>
                <th className="py-3 px-4">Deskripsi Pekerjaan</th>
                <th className="py-3 px-4">No. FR (Request)</th>
                <th className="py-3 px-4">Sumber Bank</th>
                <th className="py-3 px-4 text-right">Jumlah</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {financeData.payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-400">{payment.tgl_pembayaran_realisasi}</td>
                  <td className="py-3.5 px-4 font-bold text-white">{payment.mitra}</td>
                  <td className="py-3.5 px-4 max-w-xs truncate text-slate-400 font-medium">{payment.objek_pekerjaan}</td>
                  <td className="py-3.5 px-4 font-mono text-teal-400 font-semibold">{payment.nomor_fr || 'FR-N/A'}</td>
                  <td className="py-3.5 px-4">Bank {payment.bank}</td>
                  <td className="py-3.5 px-4 text-right font-extrabold text-white">{formatRupiah(payment.jumlah)}</td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center justify-center space-x-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] text-emerald-400 font-extrabold uppercase">
                      <CheckCircle2 className="h-3 w-3 shrink-0" />
                      <span>Realisasi</span>
                    </div>
                  </td>
                </tr>
              ))}
              {financeData.payments.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500 font-semibold">
                    Belum ada realisasi pembayaran keluar.
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
