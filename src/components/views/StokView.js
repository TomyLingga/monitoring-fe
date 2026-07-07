import React, { useState, useMemo } from 'react';
import GlassCard from '../GlassCard';
import * as XLSX from 'xlsx';
import {
  Boxes, Plus, Edit, Trash2, Download, Upload, X, CheckCircle, AlertTriangle,
  Database, Container, LayoutGrid, Calendar, RefreshCw, BarChart2,
  ChevronLeft, ChevronRight, Warehouse
} from 'lucide-react';

export default function StokView({
  stocks,
  products,
  storages,
  theme,
  onAddStock,
  onUpdateStock,
  onDeleteStock
}) {
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // 'add' | 'edit'
  const [selectedItem, setSelectedItem] = useState(null);

  // Form State
  const [formData, setFormData] = useState({ produk_id: '', storage_id: '', qty: '' });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PER_PAGE = 8;

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStorage, setFilterStorage] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const formatQty = (v, unit = 'Kg') => {
    const n = parseFloat(v);
    if (isNaN(n)) return '0';
    return `${n.toLocaleString('id-ID', { maximumFractionDigits: 2 })} ${unit}`;
  };

  const formatNumberInput = (value) => {
    if (value === undefined || value === null || value === '') return '';
    const raw = String(value).replace(/[^\d.]/g, '');
    if (!raw) return '';
    const parts = raw.split('.');
    parts[0] = parseInt(parts[0], 10).toLocaleString('id-ID');
    return parts.join(',');
  };

  const parseNumberInput = (value) =>
    value.replace(/\./g, '').replace(/,/g, '.').replace(/[^\d.]/g, '');

  // ── Recommendations on showing CPO Stock ──
  // We explicitly show CPO stock alongside other materials/products for a complete factory inventory overview.

  // Filtered stocks
  const filteredStocks = useMemo(() => {
    return (stocks || []).filter(item => {
      const productName = item.produk?.nama_produk || '';
      const productCode = item.produk?.kode_produk || '';
      const storageName = item.storage?.nama || '';
      const matchesSearch = productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            productCode.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStorage = filterStorage ? String(item.storage_id) === String(filterStorage) : true;
      return matchesSearch && matchesStorage;
    });
  }, [stocks, searchQuery, filterStorage]);

  // Totals calculated dynamically
  const totalCurah = useMemo(() => {
    // Curah products: CPO, RBDPO, PFAD, Stearin, Oleins
    const curahCodes = ['CPO', 'RBDPO', 'PFAD', 'STEARIN', 'OL-IV56', 'OL-IV57', 'OL-IV58', 'OL-IV60'];
    return filteredStocks
      .filter(s => curahCodes.includes(s.produk?.kode_produk?.toUpperCase()))
      .reduce((acc, s) => acc + parseFloat(s.qty || 0), 0);
  }, [filteredStocks]);

  const totalKemasan = useMemo(() => {
    // Packaged products
    const packCodes = ['K-MINYAKITA', 'K-SALVACO', 'K-NUSAKITA', 'K-INL'];
    return filteredStocks
      .filter(s => packCodes.includes(s.produk?.kode_produk?.toUpperCase()))
      .reduce((acc, s) => acc + parseFloat(s.qty || 0), 0);
  }, [filteredStocks]);

  const totalBahanTambahan = useMemo(() => {
    // Chemicals, packaging boxes, pouches, etc.
    const addCodes = ['BE', 'PA', 'VIT-A', 'KARTON', 'POUCH'];
    return filteredStocks
      .filter(s => addCodes.includes(s.produk?.kode_produk?.toUpperCase()))
      .reduce((acc, s) => acc + parseFloat(s.qty || 0), 0);
  }, [filteredStocks]);

  // Modal open helpers
  const openAddModal = () => {
    setSelectedItem(null);
    setFormData({ produk_id: '', storage_id: '', qty: '' });
    setActiveModal('add');
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    setFormData({
      produk_id: String(item.produk_id),
      storage_id: String(item.storage_id),
      qty: String(item.qty)
    });
    setActiveModal('edit');
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedItem(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.produk_id || !formData.storage_id || formData.qty === '') {
      showToast('Harap isi semua kolom input', 'error');
      return;
    }

    const payload = {
      produk_id: parseInt(formData.produk_id),
      storage_id: parseInt(formData.storage_id),
      qty: parseFloat(formData.qty)
    };

    try {
      if (activeModal === 'add') {
        await onAddStock(payload);
        showToast('Stok berhasil ditambahkan', 'success');
      } else {
        await onUpdateStock(selectedItem.id, payload);
        showToast('Stok berhasil diperbarui', 'success');
      }
      closeModal();
    } catch (err) {
      showToast('Gagal memproses data stok', 'error');
    }
  };

  const triggerDelete = (item) => {
    setConfirmDialog({
      message: `Hapus data stok produk "${item.produk?.nama_produk}" di storage "${item.storage?.nama}"?`,
      onConfirm: async () => {
        try {
          await onDeleteStock(item.id);
          showToast('Data stok berhasil dihapus', 'success');
        } catch (err) {
          showToast('Gagal menghapus data stok', 'error');
        }
        setConfirmDialog(null);
      }
    });
  };

  // Download excel template
  const downloadTemplate = () => {
    const wsData = [
      ['kode_produk', 'nama_storage', 'qty'],
      ['CPO', 'TANGKI-01', '1250000.50'],
      ['K-MINYAKITA', 'GUDANG-RITEL', '24500'],
      ['BE', 'GUDANG-BAHAN', '12000']
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Stok');
    XLSX.writeFile(wb, 'template_stok_produk.xlsx');
    showToast('Template Stok berhasil diunduh', 'success');
  };

  // Import from excel
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const dataStr = evt.target.result;
        const workbook = XLSX.read(dataStr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const sheetData = XLSX.utils.sheet_to_json(worksheet);

        if (sheetData.length === 0) {
          showToast('File excel kosong', 'error');
          return;
        }

        let successCount = 0;
        let errorCount = 0;
        let errMsg = '';

        for (const row of sheetData) {
          const rawCode = row.kode_produk ? String(row.kode_produk).trim().toUpperCase() : '';
          const rawStorage = row.nama_storage ? String(row.nama_storage).trim() : '';
          const rawQty = row.qty ? parseFloat(String(row.qty).replace(/[^\d.]/g, '')) : 0;

          if (!rawCode || !rawStorage) {
            errorCount++;
            errMsg = 'Kode produk atau nama storage kosong';
            continue;
          }

          const prod = products.find(p => p.kode_produk?.toUpperCase() === rawCode);
          const store = storages.find(s => s.nama?.toLowerCase() === rawStorage.toLowerCase());

          if (!prod) {
            errorCount++;
            errMsg = `Produk dengan kode "${rawCode}" tidak ditemukan`;
            continue;
          }

          if (!store) {
            errorCount++;
            errMsg = `Storage "${rawStorage}" tidak ditemukan`;
            continue;
          }

          try {
            await onAddStock({
              produk_id: prod.id,
              storage_id: store.id,
              qty: rawQty
            });
            successCount++;
          } catch (err) {
            errorCount++;
            errMsg = err.message || 'API error';
          }
        }

        if (errorCount > 0) {
          showToast(`Impor selesai: ${successCount} berhasil, ${errorCount} gagal (${errMsg})`, 'error');
        } else {
          showToast(`Berhasil mengimpor ${successCount} data stok!`, 'success');
        }
      } catch (err) {
        console.error(err);
        showToast('Gagal memproses file Excel', 'error');
      }
      e.target.value = null;
    };
    reader.readAsBinaryString(file);
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredStocks.length / PER_PAGE) || 1;
  const paginatedStocks = filteredStocks.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  return (
    <div className="space-y-6 relative">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-[9999]">
          <div className={`flex items-center space-x-3 px-5 py-3 rounded-2xl border backdrop-blur-md shadow-2xl ${
            toast.type === 'success'
              ? 'bg-emerald-50 dark:bg-teal-950/90 border-emerald-200 dark:border-teal-500/30 text-emerald-800 dark:text-teal-300'
              : 'bg-rose-50 dark:bg-red-950/90 border-rose-200 dark:border-red-500/30 text-rose-800 dark:text-red-300'
          }`}>
            {toast.type === 'success' ? <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-teal-400 shrink-0" /> : <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-red-400 shrink-0" />}
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{toast.message}</span>
            <button onClick={() => setToast(null)}><X className="h-4 w-4 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white" /></button>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[9990]">
          <GlassCard className="w-full max-w-sm border-red-500/20" hover={false}>
            <div className="flex items-center space-x-3 mb-4 text-red-400">
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20"><AlertTriangle className="h-5 w-5" /></div>
              <h3 className="font-extrabold text-white">Konfirmasi Hapus</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">{confirmDialog.message}</p>
            <div className="flex space-x-3">
              <button onClick={confirmDialog.onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors" style={{ color: '#ffffff' }}>Hapus</button>
              <button onClick={() => setConfirmDialog(null)} className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 font-semibold text-xs hover:text-white transition-colors">Batal</button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ── 1. KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <GlassCard className="flex flex-col justify-between h-32" hover={false}>
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Minyak Curah (Termasuk CPO)</span>
            <div className="p-2 rounded-lg bg-teal-500/10"><Container className="h-5 w-5 text-teal-400" /></div>
          </div>
          <div>
            <p className="text-xl font-black text-white">{formatQty(totalCurah, 'Kg')}</p>
            <p className="text-[10px] text-slate-500 font-semibold">Total stok minyak mentah & olahan curah</p>
          </div>
        </GlassCard>

        <GlassCard className="flex flex-col justify-between h-32" hover={false}>
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Kemasan Retail</span>
            <div className="p-2 rounded-lg bg-sky-500/10"><Boxes className="h-5 w-5 text-sky-400" /></div>
          </div>
          <div>
            <p className="text-xl font-black text-white">{formatQty(totalKemasan, 'Box')}</p>
            <p className="text-[10px] text-slate-500 font-semibold">Total produk siap kirim (Salvaco, Minyakita, dll)</p>
          </div>
        </GlassCard>

        <GlassCard className="flex flex-col justify-between h-32" hover={false}>
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bahan Tambahan & Material</span>
            <div className="p-2 rounded-lg bg-purple-500/10"><Database className="h-5 w-5 text-purple-400" /></div>
          </div>
          <div>
            <p className="text-xl font-black text-white">{formatQty(totalBahanTambahan, 'Item/Kg')}</p>
            <p className="text-[10px] text-slate-500 font-semibold">Stok Bleaching Earth, Phosphoric Acid, Vit-A, Karton, dll</p>
          </div>
        </GlassCard>
      </div>

      {/* ── 2. Visualisasi Storage & Tangki ── */}
      <GlassCard hover={false}>
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-900">
          <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20">
            <BarChart2 className="h-5 w-5 text-teal-400" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Visualisasi Tangki & Gudang Penyimpanan</h3>
            <p className="text-xs text-slate-400">Status persentase terisi berdasarkan kapasitas masing-masing tangki/gudang</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {storages.map(storage => {
            const isTangki = storage.jenis === 'tangki';
            // calculate sum of all product stocks stored in this storage
            const curStokQty = stocks
              .filter(s => String(s.storage_id) === String(storage.id))
              .reduce((acc, s) => acc + parseFloat(s.qty || 0), 0);
            
            const maxCap = parseFloat(storage.kapasitas || 0);
            const pct = maxCap > 0 ? Math.min(100, Math.round((curStokQty / maxCap) * 100)) : 0;
            const unit = isTangki ? 'Kg' : 'Box';

            return (
              <div key={storage.id} className="rounded-2xl border border-slate-800/40 bg-slate-950/20 p-4 flex flex-col justify-between items-center text-center space-y-4 hover:border-slate-800 transition-all">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-full">{storage.nama}</span>
                
                {isTangki ? (
                  // Cylinder Tank Visual
                  <div className="w-16 h-28 border-2 border-teal-500/30 rounded-t-xl rounded-b-xl relative bg-slate-900 overflow-hidden flex flex-col justify-end">
                    <div 
                      className="w-full bg-gradient-to-t from-teal-600 to-teal-400 transition-all duration-1000 border-t border-teal-300"
                      style={{ height: `${pct}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center flex-col z-10 select-none">
                      <span className="text-[10px] font-black drop-shadow-md text-white">{pct}%</span>
                    </div>
                  </div>
                ) : (
                  // Warehouse Crates Visual (non-tank)
                  <div className="w-20 h-28 bg-slate-900 border-2 border-sky-500/30 rounded-xl p-1.5 grid grid-cols-2 grid-rows-3 gap-1 relative overflow-hidden shadow-inner shadow-black/80">
                    {[...Array(6)].map((_, idx) => {
                      const fillThreshold = ((6 - idx) / 6) * 100;
                      const isFilled = pct >= (fillThreshold - 10);
                      return (
                        <div 
                          key={idx} 
                          className={`rounded border transition-all duration-500 flex items-center justify-center ${
                            isFilled 
                              ? 'bg-sky-500/40 border-sky-500 text-sky-300' 
                              : 'bg-slate-950/60 border-slate-800 text-slate-800'
                          }`}
                        >
                          <Warehouse className="h-3.5 w-3.5" />
                        </div>
                      );
                    })}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="bg-slate-950/85 border border-slate-800 px-1.5 py-0.5 rounded text-[9px] font-black drop-shadow-md text-white">
                        {pct}%
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-0.5">
                  <p className="text-[11px] font-black text-slate-900 dark:text-white leading-none">{curStokQty.toLocaleString('id-ID', { maximumFractionDigits: 0 })} <span className="text-[9px] font-normal text-slate-500 dark:text-slate-400">{unit}</span></p>
                  <p className="text-[8px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Kapasitas: {maxCap.toLocaleString('id-ID')} {unit}</p>
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* ── 3. Tabel Detail Stok ── */}
      <GlassCard className="mt-6" hover={false}>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 space-y-4 md:space-y-0 border-b border-slate-900/60 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <LayoutGrid className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Detail Stok per Lokasi</h3>
              <p className="text-xs text-slate-400">Rincian kuantitas produk berdasarkan storage</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center space-x-2">
            <select 
              value={filterStorage} 
              onChange={e => { setFilterStorage(e.target.value); setCurrentPage(1); }}
              className="px-4 py-2.5 rounded-xl glass-input text-xs"
            >
              <option value="">Semua Penyimpanan</option>
              {storages.map(s => <option key={s.id} value={s.id}>{s.nama} ({s.jenis.toUpperCase()})</option>)}
            </select>
            <input 
              type="text" 
              placeholder="Cari produk atau storage..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="px-4 py-2.5 rounded-xl glass-input text-xs w-64"
            />
            <button onClick={openAddModal} className="flex items-center space-x-2 px-4 py-2.5 rounded-xl glass-button-primary text-xs font-bold">
              <Plus className="h-4 w-4" />
              <span>Tambah Stok</span>
            </button>
            <div className="relative">
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <button className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors text-xs font-bold">
                <Upload className="h-4 w-4" />
                <span>Import Excel</span>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/50 text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Nama Produk / Material</th>
                <th className="py-3 px-4">Kode Produk</th>
                <th className="py-3 px-4">Lokasi (Storage)</th>
                <th className="py-3 px-4 text-right">Kuantitas</th>
                <th className="py-3 px-4">Satuan</th>
                <th className="py-3 px-4">Terakhir Diupdate</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedStocks.map(item => (
                <tr key={item.id} className="hover:bg-slate-900/40 transition-colors align-middle">
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{item.produk?.nama_produk ?? '-'}</td>
                  <td className="py-3 px-4 font-mono text-[10px] text-teal-400">{item.produk?.kode_produk ?? '-'}</td>
                  <td className="py-3 px-4 text-slate-900 dark:text-slate-300 font-semibold">{item.storage?.nama ?? '-'} <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase">({item.storage?.jenis ?? '-'})</span></td>
                  <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">{parseFloat(item.qty || 0).toLocaleString('id-ID')}</td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{item.produk?.satuan ?? 'Kg'}</td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{new Date(item.updated_at).toLocaleString('id-ID')}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center space-x-1.5">
                      <button onClick={() => openEditModal(item)} className="p-1 rounded bg-slate-900 text-slate-400 hover:text-teal-400 border border-slate-800 transition-colors"><Edit className="h-3.5 w-3.5" /></button>
                      <button onClick={() => triggerDelete(item)} className="p-1 rounded bg-slate-900 text-slate-400 hover:text-red-400 border border-slate-800 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedStocks.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-10 text-center text-slate-500 italic">
                    Belum ada data stok produk atau pencarian tidak ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filteredStocks.length > PER_PAGE && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-900/60 text-xs">
            <span className="text-slate-500 font-bold uppercase tracking-wider">
              {Math.min(filteredStocks.length, (currentPage - 1) * PER_PAGE + 1)}–{Math.min(filteredStocks.length, currentPage * PER_PAGE)} dari {filteredStocks.length} data stok
            </span>
            <div className="flex items-center space-x-2">
              <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-white font-bold px-2">Hal {currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* ── MODAL: Add / Edit Stock ── */}
      {activeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <GlassCard className="w-full max-w-md flex flex-col overflow-hidden" hover={false}>
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 mb-5 border-b border-slate-800 shrink-0">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  {activeModal === 'add' ? 'Tambah Stok Baru' : 'Edit Data Stok'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Atur kuantitas stok produk pada storage tertentu</p>
              </div>
              <button onClick={closeModal} className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Produk / Material</label>
                <select 
                  required 
                  value={formData.produk_id}
                  onChange={e => setFormData(f => ({ ...f, produk_id: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl glass-input text-sm bg-slate-900 text-white"
                >
                  <option value="">Pilih Produk / Material</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.nama_produk} ({p.kode_produk})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Penyimpanan / Tangki / Gudang</label>
                <select 
                  required 
                  value={formData.storage_id}
                  onChange={e => setFormData(f => ({ ...f, storage_id: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl glass-input text-sm bg-slate-900 text-white"
                >
                  <option value="">Pilih Storage</option>
                  {storages.map(s => <option key={s.id} value={s.id}>{s.nama} ({s.jenis.toUpperCase()})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Kuantitas Stok</label>
                <div className="relative">
                  <input 
                    type="text" 
                    required 
                    value={formatNumberInput(formData.qty)}
                    onChange={e => setFormData(f => ({ ...f, qty: parseNumberInput(e.target.value) }))}
                    placeholder="250.000" 
                    className="w-full px-3 py-2.5 rounded-xl glass-input text-sm text-white pr-10" 
                  />
                  <span className="absolute right-3 top-3 text-[10px] text-slate-500 font-bold uppercase">
                    {products.find(p => String(p.id) === String(formData.produk_id))?.satuan ?? 'Kg'}
                  </span>
                </div>
              </div>

              <div className="flex space-x-3 pt-4 shrink-0">
                <button type="submit" className="flex-1 py-3 rounded-xl glass-button-primary text-sm font-semibold">
                  Simpan Stok
                </button>
                <button type="button" onClick={closeModal} className="flex-1 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-sm font-semibold hover:text-white transition-colors">
                  Batal
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
