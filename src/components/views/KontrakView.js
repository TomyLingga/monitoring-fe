import React, { useState } from 'react';
import GlassCard from '../GlassCard';
import { 
  FileText, 
  TrendingUp, 
  AlertTriangle, 
  PlusCircle, 
  Truck, 
  DollarSign, 
  Search, 
  Layers 
} from 'lucide-react';

export default function KontrakView({ contracts, suppliers, storages, onAddContract, onAddIncoming, onAddPayment }) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals for Contract, Incoming CPO, and Payments
  const [activeModal, setActiveModal] = useState(null); // 'contract', 'incoming', 'payment'
  const [selectedContractId, setSelectedContractId] = useState('');

  // Forms states
  const [contractForm, setContractForm] = useState({ supplier_id: '', nomor_kontrak: '', qty: '', harga_per_kg: '', cbd_cad: 'CAD', tgl_kontrak: '', tgl_jatuh_tempo: '' });
  const [incomingForm, setIncomingForm] = useState({ storage_id: '', qty: '', tgl: '', no_surat_jalan: '', supir: '', no_kendaraan: '', note: '' });
  const [paymentForm, setPaymentForm] = useState({ nominal: '', tgl_bayar: '', metode_bayar: 'transfer', catatan: '' });

  const formatRupiah = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  const handleContractSubmit = (e) => {
    e.preventDefault();
    onAddContract(contractForm);
    setActiveModal(null);
    setContractForm({ supplier_id: '', nomor_kontrak: '', qty: '', harga_per_kg: '', cbd_cad: 'CAD', tgl_kontrak: '', tgl_jatuh_tempo: '' });
  };

  const handleIncomingSubmit = (e) => {
    e.preventDefault();
    onAddIncoming(selectedContractId, incomingForm);
    setActiveModal(null);
    setIncomingForm({ storage_id: '', qty: '', tgl: '', no_surat_jalan: '', supir: '', no_kendaraan: '', note: '' });
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    onAddPayment(selectedContractId, paymentForm);
    setActiveModal(null);
    setPaymentForm({ nominal: '', tgl_bayar: '', metode_bayar: 'transfer', catatan: '' });
  };

  const filteredContracts = contracts.filter(c => 
    c.nomor_kontrak.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.supplier?.nama.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search and Action Row */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nomor kontrak / supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
          />
        </div>
        <button
          onClick={() => setActiveModal('contract')}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl glass-button-primary text-sm self-start lg:self-auto"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Buat Kontrak CPO</span>
        </button>
      </div>

      {/* Contracts List / Table */}
      <div className="space-y-5">
        {filteredContracts.map((contract) => {
          const totalNilai = contract.qty * contract.harga_per_kg;
          
          return (
            <GlassCard key={contract.id} className="border-l-4 border-l-teal-500/80" hover={false}>
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center pb-4 mb-4 border-b border-slate-800/80 gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-extrabold uppercase px-2 py-0.5 bg-teal-950 text-teal-300 border border-teal-800/60 rounded">
                      {contract.cbd_cad}
                    </span>
                    <span className="text-slate-500 text-xs font-semibold">No. Kontrak:</span>
                    <strong className="text-white text-sm">{contract.nomor_kontrak}</strong>
                  </div>
                  <h4 className="text-base font-black text-white mt-1">{contract.supplier?.nama}</h4>
                </div>
                <div className="flex space-x-2.5">
                  <button
                    onClick={() => { setSelectedContractId(contract.id); setActiveModal('incoming'); }}
                    className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 hover:bg-sky-500/20 text-xs font-bold transition-all"
                  >
                    <Truck className="h-3.5 w-3.5" />
                    <span>Terima CPO</span>
                  </button>
                  <button
                    onClick={() => { setSelectedContractId(contract.id); setActiveModal('payment'); }}
                    className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs font-bold transition-all"
                  >
                    <DollarSign className="h-3.5 w-3.5" />
                    <span>Bayar Kontrak</span>
                  </button>
                </div>
              </div>

              {/* Grid Outstanding & Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                {/* 1. Qty Kontrak */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kuantitas Kontrak</span>
                  <p className="text-base font-extrabold text-white">{contract.qty.toLocaleString('id-ID')} Ton</p>
                  <span className="text-[10px] text-slate-400">Harga: {formatRupiah(contract.harga_per_kg)}/kg</span>
                </div>

                {/* 2. Total Terkirim */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">CPO Dikirim</span>
                  <p className="text-base font-extrabold text-emerald-400">{(contract.total_terkirim || 0).toLocaleString('id-ID')} Ton</p>
                  <span className="text-[10px] text-slate-500">
                    Progress: {Math.round(((contract.total_terkirim || 0) / contract.qty) * 100)}%
                  </span>
                </div>

                {/* 3. OUTSTANDING KIRIM */}
                <div className="space-y-1 p-2 rounded-xl bg-red-950/20 border border-red-950">
                  <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center space-x-1">
                    <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                    <span>Belum Dikirim</span>
                  </span>
                  <p className="text-base font-extrabold text-red-500">{(contract.outstanding_qty || 0).toLocaleString('id-ID')} Ton</p>
                  <span className="text-[10px] text-slate-400">Outstanding Qty</span>
                </div>

                {/* 4. Nilai Kontrak */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nilai Total Kontrak</span>
                  <p className="text-base font-extrabold text-white">{formatRupiah(totalNilai)}</p>
                  <span className="text-[10px] text-slate-400">Tgl: {contract.tgl_kontrak}</span>
                </div>

                {/* 5. Total Terbayar */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sudah Dibayar</span>
                  <p className="text-base font-extrabold text-emerald-400">{formatRupiah(contract.total_terbayar || 0)}</p>
                  <span className="text-[10px] text-slate-500">
                    Paid: {Math.round(((contract.total_terbayar || 0) / totalNilai) * 100)}%
                  </span>
                </div>

                {/* 6. OUTSTANDING NOMINAL */}
                <div className="space-y-1 p-2 rounded-xl bg-amber-950/20 border border-amber-950">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>Belum Dibayar</span>
                  </span>
                  <p className="text-base font-extrabold text-amber-300">{formatRupiah(contract.outstanding_nominal || 0)}</p>
                  <span className="text-[10px] text-slate-400">Outstanding Nominal</span>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* ── MODALS (Glassmorphic Forms overlay) ── */}
      {activeModal === 'contract' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <GlassCard className="w-full max-w-lg" hover={false}>
            <h3 className="text-lg font-bold text-white mb-6">Buat Kontrak CPO Baru</h3>
            <form onSubmit={handleContractSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Supplier</label>
                <select
                  required
                  value={contractForm.supplier_id}
                  onChange={(e) => setContractForm({ ...contractForm, supplier_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm bg-slate-900"
                >
                  <option value="">Pilih Supplier</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">No. Kontrak</label>
                  <input
                    type="text" required placeholder="KTR-CPO-2026-..."
                    value={contractForm.nomor_kontrak}
                    onChange={(e) => setContractForm({ ...contractForm, nomor_kontrak: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Term (CAD/CBD)</label>
                  <select
                    value={contractForm.cbd_cad}
                    onChange={(e) => setContractForm({ ...contractForm, cbd_cad: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm bg-slate-900"
                  >
                    <option value="CAD">Cash Against Delivery (CAD)</option>
                    <option value="CBD">Cash Before Delivery (CBD)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Qty (Ton)</label>
                  <input
                    type="number" required placeholder="1000"
                    value={contractForm.qty}
                    onChange={(e) => setContractForm({ ...contractForm, qty: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Harga (Rp/kg)</label>
                  <input
                    type="number" required placeholder="12500"
                    value={contractForm.harga_per_kg}
                    onChange={(e) => setContractForm({ ...contractForm, harga_per_kg: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tanggal Kontrak</label>
                  <input
                    type="date" required
                    value={contractForm.tgl_kontrak}
                    onChange={(e) => setContractForm({ ...contractForm, tgl_kontrak: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Jatuh Tempo</label>
                  <input
                    type="date" required
                    value={contractForm.tgl_jatuh_tempo}
                    onChange={(e) => setContractForm({ ...contractForm, tgl_jatuh_tempo: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="submit" className="flex-1 py-2.5 rounded-xl glass-button-primary text-sm font-semibold">Simpan Kontrak</button>
                <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-sm font-semibold">Batal</button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {activeModal === 'incoming' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <GlassCard className="w-full max-w-lg" hover={false}>
            <h3 className="text-lg font-bold text-white mb-6">Penerimaan CPO (Surat Jalan)</h3>
            <form onSubmit={handleIncomingSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tangki Tujuan</label>
                  <select
                    required
                    value={incomingForm.storage_id}
                    onChange={(e) => setIncomingForm({ ...incomingForm, storage_id: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm bg-slate-900"
                  >
                    <option value="">Pilih Tangki</option>
                    {storages.filter(s => s.jenis === 'tangki' && s.tipe === 'CPO').map(s => (
                      <option key={s.id} value={s.id}>{s.nama}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Qty (Ton)</label>
                  <input
                    type="number" step="any" required placeholder="250"
                    value={incomingForm.qty}
                    onChange={(e) => setIncomingForm({ ...incomingForm, qty: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">No. Surat Jalan</label>
                  <input
                    type="text" placeholder="SJ-..."
                    value={incomingForm.no_surat_jalan}
                    onChange={(e) => setIncomingForm({ ...incomingForm, no_surat_jalan: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tanggal Terima</label>
                  <input
                    type="date" required
                    value={incomingForm.tgl}
                    onChange={(e) => setIncomingForm({ ...incomingForm, tgl: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nama Supir</label>
                  <input
                    type="text" placeholder="Supir"
                    value={incomingForm.supir}
                    onChange={(e) => setIncomingForm({ ...incomingForm, supir: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">No. Kendaraan</label>
                  <input
                    type="text" placeholder="BK 1234 XX"
                    value={incomingForm.no_kendaraan}
                    onChange={(e) => setIncomingForm({ ...incomingForm, no_kendaraan: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Catatan</label>
                <textarea
                  placeholder="Keterangan tambahan..."
                  value={incomingForm.note}
                  onChange={(e) => setIncomingForm({ ...incomingForm, note: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm h-16"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="submit" className="flex-1 py-2.5 rounded-xl glass-button-primary text-sm font-semibold">Catat Pengiriman</button>
                <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-sm font-semibold">Batal</button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {activeModal === 'payment' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <GlassCard className="w-full max-w-md" hover={false}>
            <h3 className="text-lg font-bold text-white mb-6">Realisasi Pembayaran Kontrak</h3>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nominal Pembayaran (Rp)</label>
                <input
                  type="number" required placeholder="500000000"
                  value={paymentForm.nominal}
                  onChange={(e) => setPaymentForm({ ...paymentForm, nominal: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tanggal Bayar</label>
                  <input
                    type="date" required
                    value={paymentForm.tgl_bayar}
                    onChange={(e) => setPaymentForm({ ...paymentForm, tgl_bayar: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Metode</label>
                  <select
                    value={paymentForm.metode_bayar}
                    onChange={(e) => setPaymentForm({ ...paymentForm, metode_bayar: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm bg-slate-900"
                  >
                    <option value="transfer">Bank Transfer</option>
                    <option value="tunai">Tunai / Cash</option>
                    <option value="giro">Giro</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Keterangan / Catatan</label>
                <input
                  type="text" placeholder="Uang Muka / Pelunasan"
                  value={paymentForm.catatan}
                  onChange={(e) => setPaymentForm({ ...paymentForm, catatan: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="submit" className="flex-1 py-2.5 rounded-xl glass-button-primary text-sm font-semibold">Simpan Pembayaran</button>
                <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-sm font-semibold">Batal</button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
