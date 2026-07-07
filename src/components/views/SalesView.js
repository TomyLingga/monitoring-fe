import React, { useState, useMemo } from 'react';
import GlassCard from '../GlassCard';
import { 
  TrendingUp, Plus, Edit, Trash2, Calendar, FileText, 
  DollarSign, Truck, ShoppingBag, CreditCard, ChevronLeft, ChevronRight, X, AlertTriangle, CheckCircle
} from 'lucide-react';

export default function SalesView({
  contracts,
  buyers,
  products,
  storages,
  shipments,
  payments,
  theme,
  onAddContract,
  onUpdateContract,
  onDeleteContract,
  onAddShipment,
  onUpdateShipment,
  onDeleteShipment,
  onAddPayment,
  onUpdatePayment,
  onDeletePayment
}) {
  const [activeTab, setActiveTab] = useState('contracts'); // 'contracts' | 'shipments' | 'payments'
  
  // Custom Toast & dialogs
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Pagination states
  const [contractPage, setContractPage] = useState(1);
  const [shipmentPage, setShipmentPage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // Active modals
  const [activeModal, setActiveModal] = useState(null); // 'add_contract' | 'edit_contract' | 'add_shipment' | 'edit_shipment' | 'add_payment' | 'edit_payment'
  const [selectedItem, setSelectedItem] = useState(null);

  // Form states
  const [contractForm, setContractForm] = useState({
    buyer_id: '', produk_id: '', nomor_kontrak: '', qty: '', harga_satuan: '',
    tgl_kontrak: '', tgl_jatuh_tempo: '', termin_pembayaran: 'CAD', status: 'aktif'
  });

  const [shipmentForm, setShipmentForm] = useState({
    kontrak_penjualan_id: '', qty_kirim: '', qty_terima: '', via: 'Truck Fuso',
    termin: '', status: 'Selesai', incoterm: 'LOCO', tgl: '', storage_id: '',
    create_invoice: false, nomor_invoice: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    kontrak_penjualan_id: '', nominal: '', tgl_bayar: '', catatan: ''
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  // ── KPI calculations ──
  const kpis = useMemo(() => {
    const totalQtySold = contracts.reduce((sum, c) => sum + parseFloat(c.qty || 0), 0);
    const totalValue = contracts.reduce((sum, c) => sum + (parseFloat(c.qty || 0) * parseFloat(c.harga_satuan || 0)), 0);
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.nominal || 0), 0);
    const totalOustanding = Math.max(0, totalValue - totalPaid);
    const totalQtyShipped = shipments.reduce((sum, s) => sum + parseFloat(s.qty_kirim || 0), 0);

    return { totalQtySold, totalValue, totalPaid, totalOustanding, totalQtyShipped };
  }, [contracts, payments, shipments]);

  // ── Contract Modals ──
  const openAddContract = () => {
    setSelectedItem(null);
    setContractForm({
      buyer_id: buyers[0]?.id ? String(buyers[0].id) : '',
      produk_id: products[0]?.id ? String(products[0].id) : '',
      nomor_kontrak: `SALES-${new Date().getFullYear()}-00${contracts.length + 1}`,
      qty: '', harga_satuan: '',
      tgl_kontrak: new Date().toISOString().split('T')[0],
      tgl_jatuh_tempo: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
      termin_pembayaran: 'CAD', status: 'aktif'
    });
    setActiveModal('add_contract');
  };

  const openEditContract = (c) => {
    setSelectedItem(c);
    setContractForm({
      buyer_id: String(c.buyer_id),
      produk_id: String(c.produk_id),
      nomor_kontrak: c.nomor_kontrak,
      qty: String(c.qty),
      harga_satuan: String(c.harga_satuan),
      tgl_kontrak: c.tgl_kontrak?.split('T')[0] ?? '',
      tgl_jatuh_tempo: c.tgl_jatuh_tempo?.split('T')[0] ?? '',
      termin_pembayaran: c.termin_pembayaran ?? 'CAD',
      status: c.status ?? 'aktif'
    });
    setActiveModal('edit_contract');
  };

  const handleContractSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...contractForm,
      buyer_id: parseInt(contractForm.buyer_id),
      produk_id: parseInt(contractForm.produk_id),
      qty: parseFloat(contractForm.qty),
      harga_satuan: parseFloat(contractForm.harga_satuan)
    };

    try {
      if (selectedItem) {
        await onUpdateContract(selectedItem.id, payload);
        showToast('Kontrak penjualan berhasil diperbarui', 'success');
      } else {
        await onAddContract(payload);
        showToast('Kontrak penjualan baru berhasil dibuat', 'success');
      }
      setActiveModal(null);
    } catch (err) {
      showToast('Gagal menyimpan kontrak', 'error');
    }
  };

  // ── Shipment Modals ──
  const openAddShipment = (preSelectedContract = null) => {
    setSelectedItem(null);
    const contractId = preSelectedContract ? String(preSelectedContract.id) : (contracts[0]?.id ? String(contracts[0].id) : '');
    const activeContract = contracts.find(c => String(c.id) === contractId);

    setShipmentForm({
      kontrak_penjualan_id: contractId,
      qty_kirim: activeContract ? String(activeContract.outstanding_qty || activeContract.qty) : '',
      qty_terima: '',
      via: 'Truck Fuso',
      termin: activeContract ? activeContract.termin_pembayaran : 'CAD',
      status: 'Selesai',
      incoterm: 'LOCO',
      tgl: new Date().toISOString().split('T')[0],
      storage_id: '',
      create_invoice: true,
      nomor_invoice: `INV-SALES-00${shipments.length + 1}`
    });
    setActiveModal('add_shipment');
  };

  const openEditShipment = (s) => {
    setSelectedItem(s);
    setShipmentForm({
      kontrak_penjualan_id: String(s.kontrak_penjualan_id),
      qty_kirim: String(s.qty_kirim),
      qty_terima: String(s.qty_terima ?? ''),
      via: s.via ?? 'Truck Fuso',
      termin: s.termin ?? '',
      status: s.status ?? 'Selesai',
      incoterm: s.incoterm ?? 'LOCO',
      tgl: s.tgl?.split('T')[0] ?? '',
      storage_id: s.storage_id ? String(s.storage_id) : '',
      create_invoice: false,
      nomor_invoice: ''
    });
    setActiveModal('edit_shipment');
  };

  const handleShipmentSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...shipmentForm,
      kontrak_penjualan_id: parseInt(shipmentForm.kontrak_penjualan_id),
      qty_kirim: parseFloat(shipmentForm.qty_kirim),
      qty_terima: shipmentForm.qty_terima ? parseFloat(shipmentForm.qty_terima) : parseFloat(shipmentForm.qty_kirim),
      storage_id: shipmentForm.storage_id ? parseInt(shipmentForm.storage_id) : null
    };

    try {
      if (selectedItem) {
        await onUpdateShipment(selectedItem.id, payload);
        showToast('Pengiriman penjualan berhasil diperbarui', 'success');
      } else {
        await onAddShipment(payload);
        showToast('Pengiriman penjualan baru berhasil dibuat', 'success');
      }
      setActiveModal(null);
    } catch (err) {
      showToast('Gagal menyimpan pengiriman', 'error');
    }
  };

  // ── Payment Modals ──
  const openAddPayment = (preSelectedContract = null) => {
    setSelectedItem(null);
    const contractId = preSelectedContract ? String(preSelectedContract.id) : (contracts[0]?.id ? String(contracts[0].id) : '');
    const activeContract = contracts.find(c => String(c.id) === contractId);

    setPaymentForm({
      kontrak_penjualan_id: contractId,
      nominal: activeContract ? String(activeContract.outstanding_payment || 0) : '',
      tgl_bayar: new Date().toISOString().split('T')[0],
      catatan: 'Pembayaran angsuran kontrak'
    });
    setActiveModal('add_payment');
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...paymentForm,
      kontrak_penjualan_id: parseInt(paymentForm.kontrak_penjualan_id),
      nominal: parseFloat(paymentForm.nominal)
    };

    try {
      await onAddPayment(payload);
      showToast('Pembayaran penjualan berhasil dicatat', 'success');
      setActiveModal(null);
    } catch (err) {
      showToast('Gagal menyimpan pembayaran', 'error');
    }
  };

  // Delete helpers
  const triggerDelete = (type, item) => {
    setConfirmDialog({
      message: `Hapus ${type} ini? Tindakan ini akan mengembalikan alokasi stok produk.`,
      onConfirm: async () => {
        try {
          if (type === 'kontrak') await onDeleteContract(item.id);
          else if (type === 'pengiriman') await onDeleteShipment(item.id);
          else await onDeletePayment(item.id);
          showToast(`${type} berhasil dihapus`, 'success');
        } catch (e) {
          showToast(`Gagal menghapus ${type}`, 'error');
        }
        setConfirmDialog(null);
      }
    });
  };

  // Pagination filters
  const paginatedContracts = useMemo(() => {
    const start = (contractPage - 1) * ITEMS_PER_PAGE;
    return contracts.slice(start, start + ITEMS_PER_PAGE);
  }, [contracts, contractPage]);

  const paginatedShipments = useMemo(() => {
    const start = (shipmentPage - 1) * ITEMS_PER_PAGE;
    return shipments.slice(start, start + ITEMS_PER_PAGE);
  }, [shipments, shipmentPage]);

  const paginatedPayments = useMemo(() => {
    const start = (paymentPage - 1) * ITEMS_PER_PAGE;
    return payments.slice(start, start + ITEMS_PER_PAGE);
  }, [payments, paymentPage]);

  return (
    <div className="space-y-6 relative">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-[9999] animate-fade-in">
          <div className={`flex items-center space-x-3 px-4.5 py-3 rounded-2xl border backdrop-blur-md shadow-2xl ${
            toast.type === 'success' ? 'bg-teal-950/90 border-teal-500/30 text-teal-300' : 'bg-red-950/90 border-red-500/30 text-red-300'
          }`}>
            {toast.type === 'success' ? <CheckCircle className="h-5 w-5 text-teal-400" /> : <AlertTriangle className="h-5 w-5 text-red-400" />}
            <span className="text-xs font-semibold text-white">{toast.message}</span>
            <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white pl-2"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[9990]">
          <GlassCard className="w-full max-w-sm border-red-500/20" hover={false}>
            <div className="flex items-center space-x-3 text-red-400 mb-4">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="font-extrabold text-white text-base">Konfirmasi Hapus</h3>
            </div>
            <p className="text-xs text-slate-300 mb-6">{confirmDialog.message}</p>
            <div className="flex space-x-3">
              <button onClick={confirmDialog.onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs">Hapus</button>
              <button onClick={() => setConfirmDialog(null)} className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">Batal</button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard className="p-4 flex items-center space-x-4 border-l-4 border-l-teal-500" hover={false}>
          <div className="p-3 rounded-xl bg-teal-500/10 text-teal-400"><ShoppingBag className="h-5 w-5" /></div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total Nilai Kontrak</p>
            <h4 className="text-sm font-black text-white">{formatRupiah(kpis.totalValue)}</h4>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center space-x-4 border-l-4 border-l-emerald-500" hover={false}>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400"><DollarSign className="h-5 w-5" /></div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Pembayaran Diterima</p>
            <h4 className="text-sm font-black text-white">{formatRupiah(kpis.totalPaid)}</h4>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center space-x-4 border-l-4 border-l-amber-500" hover={false}>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400"><CreditCard className="h-5 w-5" /></div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Piutang Dagang</p>
            <h4 className="text-sm font-black text-white">{formatRupiah(kpis.totalOustanding)}</h4>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center space-x-4 border-l-4 border-l-sky-500" hover={false}>
          <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400"><Truck className="h-5 w-5" /></div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total Qty Dikirim</p>
            <h4 className="text-sm font-black text-white">{kpis.totalQtyShipped.toLocaleString('id-ID')} Kg</h4>
          </div>
        </GlassCard>
      </div>

      {/* Tabs list navigation */}
      <div className="flex space-x-2 border-b border-slate-800 pb-px">
        <button onClick={() => setActiveTab('contracts')} className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
          activeTab === 'contracts' ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-white'
        }`}>Kontrak Penjualan</button>
        <button onClick={() => setActiveTab('shipments')} className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
          activeTab === 'shipments' ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-white'
        }`}>Pengiriman Penjualan</button>
        <button onClick={() => setActiveTab('payments')} className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
          activeTab === 'payments' ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-white'
        }`}>Daftar Penerimaan Pembayaran</button>
      </div>

      {/* Tab: Kontrak Penjualan */}
      {activeTab === 'contracts' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={openAddContract} className="flex items-center space-x-1.5 px-4 py-2 rounded-xl glass-button-primary text-xs font-bold"><Plus className="h-4 w-4" /><span>Buat Kontrak Penjualan</span></button>
          </div>
          <GlassCard className="overflow-hidden" hover={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Nomor Kontrak</th>
                    <th className="py-3 px-4">Buyer / Customer</th>
                    <th className="py-3 px-4">Produk</th>
                    <th className="py-3 px-4 text-right">Kuantitas (Qty)</th>
                    <th className="py-3 px-4 text-right">Harga Satuan</th>
                    <th className="py-3 px-4 text-right">Total Nilai</th>
                    <th className="py-3 px-4 text-right">Terkirim</th>
                    <th className="py-3 px-4 text-right">Terbayar</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paginatedContracts.map((c) => {
                    const outstanding = Math.max(0, c.qty - c.total_terkirim);
                    return (
                      <tr key={c.id} className="hover:bg-slate-900/40 transition-colors align-middle">
                        <td className="py-3 px-4 font-bold text-white">{c.nomor_kontrak}</td>
                        <td className="py-3 px-4 font-semibold text-slate-300">{c.buyer?.nama ?? 'N/A'}</td>
                        <td className="py-3 px-4 text-teal-400 font-bold">{c.produk?.nama_produk ?? 'N/A'}</td>
                        <td className="py-3 px-4 text-right text-white font-black">{parseFloat(c.qty).toLocaleString('id-ID')} {c.produk?.satuan ?? 'Kg'}</td>
                        <td className="py-3 px-4 text-right text-slate-300">{formatRupiah(c.harga_satuan)}</td>
                        <td className="py-3 px-4 text-right text-emerald-400 font-black">{formatRupiah(c.total_nilai_kontrak)}</td>
                        <td className="py-3 px-4 text-right text-sky-400 font-bold">{c.total_terkirim.toLocaleString('id-ID')}</td>
                        <td className="py-3 px-4 text-right text-teal-300 font-bold">{formatRupiah(c.total_terbayar)}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            c.status === 'aktif' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'bg-slate-800 text-slate-400'
                          }`}>{c.status}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button onClick={() => openAddShipment(c)} disabled={outstanding <= 0} className="px-2 py-1 rounded bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 text-[10px] font-bold disabled:opacity-30 disabled:pointer-events-none" title="Kirim Barang">Kirim</button>
                            <button onClick={() => openAddPayment(c)} disabled={c.outstanding_payment <= 0} className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-bold disabled:opacity-30 disabled:pointer-events-none" title="Catat Pembayaran">Bayar</button>
                            <button onClick={() => openEditContract(c)} className="p-1 rounded bg-slate-900 text-slate-400 hover:text-teal-400 border border-slate-800 transition-colors"><Edit className="h-3.5 w-3.5" /></button>
                            <button onClick={() => triggerDelete('kontrak', c)} className="p-1 rounded bg-slate-900 text-slate-400 hover:text-red-400 border border-slate-800 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedContracts.length === 0 && (
                    <tr><td colSpan={10} className="py-8 text-center text-slate-500 italic">Belum ada kontrak penjualan</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {contracts.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between p-4 border-t border-slate-800 text-xs">
                <span className="text-slate-400 font-bold">Total {contracts.length} kontrak</span>
                <div className="flex items-center space-x-2">
                  <button onClick={() => setContractPage(p => Math.max(1, p - 1))} disabled={contractPage === 1} className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 disabled:opacity-35"><ChevronLeft className="h-4 w-4" /></button>
                  <span className="text-white font-bold">Hal {contractPage} / {Math.ceil(contracts.length / ITEMS_PER_PAGE)}</span>
                  <button onClick={() => setContractPage(p => Math.min(Math.ceil(contracts.length / ITEMS_PER_PAGE), p + 1))} disabled={contractPage === Math.ceil(contracts.length / ITEMS_PER_PAGE)} className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 disabled:opacity-35"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* Tab: Pengiriman Penjualan */}
      {activeTab === 'shipments' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => openAddShipment(null)} className="flex items-center space-x-1.5 px-4 py-2 rounded-xl glass-button-primary text-xs font-bold"><Plus className="h-4 w-4" /><span>Buat Pengiriman</span></button>
          </div>
          <GlassCard className="overflow-hidden" hover={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Nomor Kontrak</th>
                    <th className="py-3 px-4">Buyer / Customer</th>
                    <th className="py-3 px-4">Produk</th>
                    <th className="py-3 px-4 text-right">Qty Kirim</th>
                    <th className="py-3 px-4 text-right">Qty Terima</th>
                    <th className="py-3 px-4">Ekspedisi (Via)</th>
                    <th className="py-3 px-4">Incoterm</th>
                    <th className="py-3 px-4">Termin</th>
                    <th className="py-3 px-4">Nomor Invoice</th>
                    <th className="py-3 px-4 text-right">Nilai Invoice</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paginatedShipments.map((s) => {
                    const invoice = s.invoices?.[0];
                    return (
                      <tr key={s.id} className="hover:bg-slate-900/40 transition-colors align-middle">
                        <td className="py-3 px-4 text-slate-400 font-semibold">{s.tgl ? new Date(s.tgl).toLocaleDateString('id-ID') : '-'}</td>
                        <td className="py-3 px-4 font-bold text-white">{s.kontrak_penjualan?.nomor_kontrak ?? 'N/A'}</td>
                        <td className="py-3 px-4 font-semibold text-slate-350">{s.kontrak_penjualan?.buyer?.nama ?? 'N/A'}</td>
                        <td className="py-3 px-4 text-teal-400 font-bold">{s.kontrak_penjualan?.produk?.nama_produk ?? 'N/A'}</td>
                        <td className="py-3 px-4 text-right text-white font-black">{parseFloat(s.qty_kirim).toLocaleString('id-ID')}</td>
                        <td className="py-3 px-4 text-right text-emerald-400 font-bold">{parseFloat(s.qty_terima || s.qty_kirim).toLocaleString('id-ID')}</td>
                        <td className="py-3 px-4 text-slate-400 font-semibold">{s.via ?? '-'}</td>
                        <td className="py-3 px-4 text-slate-400 font-mono">{s.incoterm ?? 'LOCO'}</td>
                        <td className="py-3 px-4 text-slate-500 font-bold">{s.termin ?? 'CAD'}</td>
                        <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">{invoice?.nomor_invoice ?? '-'}</td>
                        <td className="py-3 px-4 text-right text-amber-400 font-black">{invoice?.nilai ? formatRupiah(invoice.nilai) : '-'}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            s.status === 'Selesai' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                          }`}>{s.status}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button onClick={() => openEditShipment(s)} className="p-1 rounded bg-slate-900 text-slate-400 hover:text-teal-400 border border-slate-800 transition-colors"><Edit className="h-3.5 w-3.5" /></button>
                            <button onClick={() => triggerDelete('pengiriman', s)} className="p-1 rounded bg-slate-900 text-slate-400 hover:text-red-400 border border-slate-800 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedShipments.length === 0 && (
                    <tr><td colSpan={13} className="py-8 text-center text-slate-500 italic">Belum ada data pengiriman</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {shipments.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between p-4 border-t border-slate-800 text-xs">
                <span className="text-slate-400 font-bold">Total {shipments.length} pengiriman</span>
                <div className="flex items-center space-x-2">
                  <button onClick={() => setShipmentPage(p => Math.max(1, p - 1))} disabled={shipmentPage === 1} className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 disabled:opacity-35"><ChevronLeft className="h-4 w-4" /></button>
                  <span className="text-white font-bold">Hal {shipmentPage} / {Math.ceil(shipments.length / ITEMS_PER_PAGE)}</span>
                  <button onClick={() => setShipmentPage(p => Math.min(Math.ceil(shipments.length / ITEMS_PER_PAGE), p + 1))} disabled={shipmentPage === Math.ceil(shipments.length / ITEMS_PER_PAGE)} className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 disabled:opacity-35"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* Tab: Pembayaran Penjualan */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => openAddPayment(null)} className="flex items-center space-x-1.5 px-4 py-2 rounded-xl glass-button-primary text-xs font-bold"><Plus className="h-4 w-4" /><span>Catat Pembayaran Baru</span></button>
          </div>
          <GlassCard className="overflow-hidden" hover={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Tanggal Bayar</th>
                    <th className="py-3 px-4">Nomor Kontrak</th>
                    <th className="py-3 px-4">Buyer / Customer</th>
                    <th className="py-3 px-4 text-right">Nominal Diterima</th>
                    <th className="py-3 px-4">Catatan</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paginatedPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-900/40 transition-colors align-middle">
                      <td className="py-3 px-4 text-slate-400 font-semibold">{p.tgl_bayar ? new Date(p.tgl_bayar).toLocaleDateString('id-ID') : '-'}</td>
                      <td className="py-3 px-4 font-bold text-white">{p.kontrak_penjualan?.nomor_kontrak ?? 'N/A'}</td>
                      <td className="py-3 px-4 font-semibold text-slate-350">{p.kontrak_penjualan?.buyer?.nama ?? 'N/A'}</td>
                      <td className="py-3 px-4 text-right text-emerald-450 font-black">{formatRupiah(p.nominal)}</td>
                      <td className="py-3 px-4 text-slate-400">{p.catatan ?? '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <button onClick={() => triggerDelete('pembayaran', p)} className="p-1 rounded bg-slate-900 text-slate-400 hover:text-red-400 border border-slate-800 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                      </td>
                    </tr>
                  ))}
                  {paginatedPayments.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-slate-500 italic">Belum ada penerimaan pembayaran</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {payments.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between p-4 border-t border-slate-800 text-xs">
                <span className="text-slate-400 font-bold">Total {payments.length} transaksi</span>
                <div className="flex items-center space-x-2">
                  <button onClick={() => setPaymentPage(p => Math.max(1, p - 1))} disabled={paymentPage === 1} className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 disabled:opacity-35"><ChevronLeft className="h-4 w-4" /></button>
                  <span className="text-white font-bold">Hal {paymentPage} / {Math.ceil(payments.length / ITEMS_PER_PAGE)}</span>
                  <button onClick={() => setPaymentPage(p => Math.min(Math.ceil(payments.length / ITEMS_PER_PAGE), p + 1))} disabled={paymentPage === Math.ceil(payments.length / ITEMS_PER_PAGE)} className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 disabled:opacity-35"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* Modal: Kontrak */}
      {(activeModal === 'add_contract' || activeModal === 'edit_contract') && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[9990]">
          <GlassCard className="w-full max-w-md border-teal-500/20" hover={false}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">{selectedItem ? 'Edit Kontrak Penjualan' : 'Buat Kontrak Penjualan Baru'}</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleContractSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Pilih Buyer / Customer</label>
                <select value={contractForm.buyer_id} onChange={e => setContractForm(prev => ({ ...prev, buyer_id: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white">
                  {buyers.map(b => <option key={b.id} value={b.id}>{b.nama}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Pilih Produk</label>
                  <select value={contractForm.produk_id} onChange={e => setContractForm(prev => ({ ...prev, produk_id: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white">
                    {products.map(p => <option key={p.id} value={p.id}>{p.nama_produk} ({p.kode_produk})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nomor Kontrak</label>
                  <input type="text" required value={contractForm.nomor_kontrak} onChange={e => setContractForm(prev => ({ ...prev, nomor_kontrak: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Kuantitas (Qty)</label>
                  <input type="number" required placeholder="Kg / Box" value={contractForm.qty} onChange={e => setContractForm(prev => ({ ...prev, qty: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Harga Satuan (Rp / unit)</label>
                  <input type="number" required placeholder="Contoh: 16500" value={contractForm.harga_satuan} onChange={e => setContractForm(prev => ({ ...prev, harga_satuan: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tanggal Kontrak</label>
                  <input type="date" required value={contractForm.tgl_kontrak} onChange={e => setContractForm(prev => ({ ...prev, tgl_kontrak: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Jatuh Tempo</label>
                  <input type="date" required value={contractForm.tgl_jatuh_tempo} onChange={e => setContractForm(prev => ({ ...prev, tgl_jatuh_tempo: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Termin Pembayaran</label>
                  <select value={contractForm.termin_pembayaran} onChange={e => setContractForm(prev => ({ ...prev, termin_pembayaran: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white">
                    <option value="CAD">CAD (Cash Against Documents)</option>
                    <option value="CBD">CBD (Cash Before Delivery)</option>
                    <option value="Net 30">Net 30 Hari</option>
                  </select>
                </div>
                {selectedItem && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Status Kontrak</label>
                    <select value={contractForm.status} onChange={e => setContractForm(prev => ({ ...prev, status: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white">
                      <option value="aktif">aktif</option>
                      <option value="selesai">selesai</option>
                      <option value="batal">batal</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="submit" className="flex-1 py-3 rounded-xl glass-button-primary text-xs font-bold">Simpan Kontrak</button>
                <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-semibold hover:text-white transition-colors">Batal</button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* Modal: Pengiriman */}
      {(activeModal === 'add_shipment' || activeModal === 'edit_shipment') && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[9990]">
          <GlassCard className="w-full max-w-md border-teal-500/20" hover={false}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">{selectedItem ? 'Edit Pengiriman Penjualan' : 'Buat Pengiriman Baru'}</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleShipmentSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Pilih Kontrak Penjualan</label>
                <select value={shipmentForm.kontrak_penjualan_id} onChange={e => {
                  const contractId = e.target.value;
                  const activeContract = contracts.find(c => String(c.id) === contractId);
                  setShipmentForm(prev => ({
                    ...prev,
                    kontrak_penjualan_id: contractId,
                    qty_kirim: activeContract ? String(activeContract.outstanding_qty || activeContract.qty) : '',
                    termin: activeContract ? activeContract.termin_pembayaran : 'CAD'
                  }));
                }} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white">
                  <option value="">Pilih Kontrak</option>
                  {contracts.map(c => <option key={c.id} value={c.id}>{c.nomor_kontrak} - {c.buyer?.nama} ({c.produk?.kode_produk})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Kuantitas Kirim</label>
                  <input type="number" required placeholder="Contoh: 250000" value={shipmentForm.qty_kirim} onChange={e => setShipmentForm(prev => ({ ...prev, qty_kirim: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Kuantitas Diterima (Destinasi)</label>
                  <input type="number" placeholder="Sama dengan qty kirim jika kosong" value={shipmentForm.qty_terima} onChange={e => setShipmentForm(prev => ({ ...prev, qty_terima: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Pilih Tangki/Gudang Pengirim</label>
                  <select value={shipmentForm.storage_id} onChange={e => setShipmentForm(prev => ({ ...prev, storage_id: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white">
                    <option value="">Otomatis (Alokasi Otomatis)</option>
                    {storages.map(s => <option key={s.id} value={s.id}>{s.nama} ({s.jenis})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Ekspedisi (Via)</label>
                  <select value={shipmentForm.via} onChange={e => setShipmentForm(prev => ({ ...prev, via: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white">
                    <option value="Truck Fuso">Truck Fuso</option>
                    <option value="Kapal Tanker">Kapal Tanker</option>
                    <option value="Kereta Api Logistik">Kereta Api Logistik</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Incoterm</label>
                  <select value={shipmentForm.incoterm} onChange={e => setShipmentForm(prev => ({ ...prev, incoterm: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white">
                    <option value="LOCO">LOCO (Pembeli Ambil Sendiri)</option>
                    <option value="FRANCO">FRANCO (Penjual Kirim ke Gudang)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tanggal Pengiriman</label>
                  <input type="date" required value={shipmentForm.tgl} onChange={e => setShipmentForm(prev => ({ ...prev, tgl: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" />
                </div>
              </div>

              {!selectedItem && (
                <div className="bg-slate-950/40 p-3.5 border border-slate-900 rounded-xl space-y-3">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="create_invoice" checked={shipmentForm.create_invoice} onChange={e => setShipmentForm(prev => ({ ...prev, create_invoice: e.target.checked }))} className="rounded text-teal-500 focus:ring-teal-400 bg-slate-900 border-slate-800" />
                    <label htmlFor="create_invoice" className="text-[10px] font-bold text-teal-400 uppercase tracking-wider select-none">Hasilkan Invoice Penjualan Sekaligus?</label>
                  </div>
                  {shipmentForm.create_invoice && (
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nomor Invoice</label>
                      <input type="text" required placeholder="Contoh: INV-SALES-001" value={shipmentForm.nomor_invoice} onChange={e => setShipmentForm(prev => ({ ...prev, nomor_invoice: e.target.value }))} className="w-full px-3 py-2 rounded-lg glass-input text-xs bg-slate-900 text-white" />
                    </div>
                  )}
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button type="submit" className="flex-1 py-3 rounded-xl glass-button-primary text-xs font-bold">Simpan Pengiriman</button>
                <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-semibold hover:text-white transition-colors">Batal</button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* Modal: Pembayaran */}
      {(activeModal === 'add_payment' || activeModal === 'edit_payment') && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[9990]">
          <GlassCard className="w-full max-w-md border-teal-500/20" hover={false}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Catat Penerimaan Pembayaran</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Pilih Kontrak Penjualan</label>
                <select value={paymentForm.kontrak_penjualan_id} onChange={e => {
                  const contractId = e.target.value;
                  const activeContract = contracts.find(c => String(c.id) === contractId);
                  setPaymentForm(prev => ({
                    ...prev,
                    kontrak_penjualan_id: contractId,
                    nominal: activeContract ? String(activeContract.outstanding_payment || 0) : ''
                  }));
                }} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white">
                  <option value="">Pilih Kontrak</option>
                  {contracts.map(c => <option key={c.id} value={c.id}>{c.nomor_kontrak} - {c.buyer?.nama} (Outstanding: {formatRupiah(c.outstanding_payment)})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nominal Diterima (Rp)</label>
                <input type="number" required placeholder="Contoh: 5000000000" value={paymentForm.nominal} onChange={e => setPaymentForm(prev => ({ ...prev, nominal: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tanggal Pembayaran</label>
                <input type="date" required value={paymentForm.tgl_bayar} onChange={e => setPaymentForm(prev => ({ ...prev, tgl_bayar: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Catatan / Keterangan</label>
                <input type="text" placeholder="Contoh: Pembayaran Uang Muka" value={paymentForm.catatan} onChange={e => setPaymentForm(prev => ({ ...prev, catatan: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" />
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="submit" className="flex-1 py-3 rounded-xl glass-button-primary text-xs font-bold">Simpan Pembayaran</button>
                <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-semibold hover:text-white transition-colors">Batal</button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
