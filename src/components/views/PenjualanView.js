import React, { useState } from 'react';
import GlassCard from '../GlassCard';
import { ShoppingCart, PlusCircle, Search, TrendingUp, Calendar, ShieldCheck } from 'lucide-react';

export default function PenjualanView({ salesContracts, buyers, products, onAddSalesContract }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [form, setForm] = useState({ buyer_id: '', produk_id: '', nomor_kontrak: '', qty: '', harga_satuan: '', tgl_kontrak: '', tgl_jatuh_tempo: '', termin_pembayaran: '' });

  const formatRupiah = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onAddSalesContract(form);
    setShowModal(false);
    setForm({ buyer_id: '', produk_id: '', nomor_kontrak: '', qty: '', harga_satuan: '', tgl_kontrak: '', tgl_jatuh_tempo: '', termin_pembayaran: '' });
  };

  const filtered = salesContracts.filter(c => 
    c.nomor_kontrak.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.buyer?.nama.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kontrak penjualan / buyer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
          />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl glass-button-primary text-sm self-start lg:self-auto"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Buat Kontrak Penjualan</span>
        </button>
      </div>

      {/* Sales contracts list */}
      <div className="space-y-5">
        {filtered.map((contract) => {
          const totalVal = contract.qty * contract.harga_satuan;
          const outstanding = contract.qty - (contract.total_terkirim || 0);
          
          return (
            <GlassCard key={contract.id} className="border-l-4 border-l-sky-500/80" hover={false}>
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center pb-4 mb-4 border-b border-slate-800/80 gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-sky-950 text-sky-300 border border-sky-800/60 rounded">
                      {contract.termin_pembayaran || 'CAD'}
                    </span>
                    <span className="text-slate-500 text-xs font-semibold">No. Kontrak:</span>
                    <strong className="text-white text-sm">{contract.nomor_kontrak}</strong>
                  </div>
                  <h4 className="text-base font-black text-white mt-1">{contract.buyer?.nama}</h4>
                </div>
                <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-300 capitalize">{contract.status}</span>
                </div>
              </div>

              {/* Grid Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Produk</span>
                  <p className="text-sm font-bold text-white mt-1">{contract.produk?.nama || 'RBD Palm Olein'}</p>
                  <span className="text-[10px] text-slate-400">Kode: {contract.produk?.kode || 'RBDPOL'}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kuantitas</span>
                  <p className="text-base font-extrabold text-white">{contract.qty.toLocaleString('id-ID')} Ton</p>
                  <span className="text-[10px] text-slate-400">Harga: {formatRupiah(contract.harga_satuan)}/kg</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Realisasi Kirim</span>
                  <p className="text-base font-extrabold text-emerald-400">{(contract.total_terkirim || 0).toLocaleString('id-ID')} Ton</p>
                  <span className="text-[10px] text-slate-500">Belum Kirim: {outstanding.toLocaleString('id-ID')} Ton</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Nilai Kontrak</span>
                  <p className="text-base font-extrabold text-white">{formatRupiah(totalVal)}</p>
                  <span className="text-[10px] text-slate-400">Jatuh Tempo: {contract.tgl_jatuh_tempo}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Termin</span>
                  <p className="text-sm font-semibold text-sky-300 mt-1">{contract.termin_pembayaran || 'CAD 14 Days'}</p>
                  <span className="text-[10px] text-slate-400">Tgl Kontrak: {contract.tgl_kontrak}</span>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* MODAL Create Sales Contract */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <GlassCard className="w-full max-w-lg" hover={false}>
            <h3 className="text-lg font-bold text-white mb-6">Kontrak Penjualan Baru</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Buyer / Customer</label>
                  <select
                    required
                    value={form.buyer_id}
                    onChange={(e) => setForm({ ...form, buyer_id: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm bg-slate-900"
                  >
                    <option value="">Pilih Buyer</option>
                    {buyers.map(b => <option key={b.id} value={b.id}>{b.nama}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Produk</label>
                  <select
                    required
                    value={form.produk_id}
                    onChange={(e) => setForm({ ...form, produk_id: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm bg-slate-900"
                  >
                    <option value="">Pilih Produk</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nomor Kontrak</label>
                  <input
                    type="text" required placeholder="SAL-..."
                    value={form.nomor_kontrak}
                    onChange={(e) => setForm({ ...form, nomor_kontrak: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Termin Pembayaran</label>
                  <input
                    type="text" placeholder="CAD 14 Hari"
                    value={form.termin_pembayaran}
                    onChange={(e) => setForm({ ...form, termin_pembayaran: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Volume (Ton)</label>
                  <input
                    type="number" required placeholder="500"
                    value={form.qty}
                    onChange={(e) => setForm({ ...form, qty: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Harga Jual (Rp/kg)</label>
                  <input
                    type="number" required placeholder="14200"
                    value={form.harga_satuan}
                    onChange={(e) => setForm({ ...form, harga_satuan: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tanggal Kontrak</label>
                  <input
                    type="date" required
                    value={form.tgl_kontrak}
                    onChange={(e) => setForm({ ...form, tgl_kontrak: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Jatuh Tempo</label>
                  <input
                    type="date" required
                    value={form.tgl_jatuh_tempo}
                    onChange={(e) => setForm({ ...form, tgl_jatuh_tempo: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button type="submit" className="flex-1 py-2.5 rounded-xl glass-button-primary text-sm font-semibold">Simpan Kontrak</button>
                <button type="button" onClick={() => setShowModal(null)} className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-sm font-semibold">Batal</button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
