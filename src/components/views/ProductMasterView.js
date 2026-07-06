import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import GlassCard from '../GlassCard';
import { Search, PlusCircle, Trash2, Edit, Tag, Download, Upload, CheckCircle, AlertTriangle, X } from 'lucide-react';

export default function ProductMasterView({ products, onAdd, onUpdate, onDelete }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [namaProduk, setNamaProduk] = useState('');
  const [satuan, setSatuan] = useState('Kg');
  const [kodeProduk, setKodeProduk] = useState('');

  // Local Toast alert system
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleEditClick = (p) => {
    setEditingProduct(p);
    setNamaProduk(p.nama_produk);
    setSatuan(p.satuan);
    setKodeProduk(p.kode_produk);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingProduct(null);
    setNamaProduk('');
    setSatuan('Kg');
    setKodeProduk('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!namaProduk || !kodeProduk) return;

    const normalizedNama = namaProduk.trim().toLowerCase();
    const normalizedKode = kodeProduk.trim().toLowerCase();

    const isDuplicate = products.some(p => 
      (p.nama_produk.trim().toLowerCase() === normalizedNama || p.kode_produk.trim().toLowerCase() === normalizedKode) && 
      p.id !== editingProduct?.id
    );
    
    if (isDuplicate) {
      showToast('Gagal: Nama atau Kode produk sudah terdaftar!', 'error');
      return;
    }

    const payload = { nama_produk: namaProduk, satuan, kode_produk: kodeProduk };
    if (editingProduct) {
      onUpdate(editingProduct.id, payload);
      showToast('Produk berhasil diperbarui', 'success');
    } else {
      onAdd(payload);
      showToast('Produk berhasil ditambahkan', 'success');
    }
    handleCloseForm();
  };

  const filtered = products.filter(p => 
    p.nama_produk.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.kode_produk.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Excel template
  const downloadTemplate = () => {
    const wsData = [
      ['nama_produk', 'kode_produk', 'satuan'],
      ['Crude Palm Oil', 'CPO', 'Kg'],
      ['RBD Palm Oil', 'RBDPO', 'Kg'],
      ['Minyak Goreng Minyakita', 'MINYAKITA', 'Box']
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Produk');
    XLSX.writeFile(wb, 'template_produk_master.xlsx');
    showToast('Template Produk diunduh', 'success');
  };

  // Excel importer with duplicate checking
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const dataStr = evt.target.result;
        const workbook = XLSX.read(dataStr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const sheetData = XLSX.utils.sheet_to_json(worksheet);

        let successCount = 0;
        let skippedCount = 0;

        sheetData.forEach(row => {
          const rawName = row.nama_produk || '';
          const rawCode = row.kode_produk || '';
          if (!rawName.trim() || !rawCode.trim()) return;

          const isDuplicate = products.some(p => 
            p.nama_produk.trim().toLowerCase() === rawName.trim().toLowerCase() ||
            p.kode_produk.trim().toLowerCase() === rawCode.trim().toLowerCase()
          );
          
          if (isDuplicate) {
            skippedCount++;
          } else {
            onAdd({
              nama_produk: rawName.trim(),
              kode_produk: rawCode.trim().toUpperCase(),
              satuan: row.satuan || 'Kg'
            });
            successCount++;
          }
        });

        if (skippedCount > 0) {
          showToast(`Impor sukses: ${successCount} ditambahkan, ${skippedCount} dilewati karena duplikat`, 'error');
        } else {
          showToast(`Berhasil mengimpor ${successCount} produk baru!`, 'success');
        }
      } catch (err) {
        console.error(err);
        showToast('Gagal mengimpor file Excel.', 'error');
      }
      e.target.value = null;
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6 relative">
      {/* Local Toast Alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-[9999] animate-fade-in">
          <div className={`flex items-center space-x-3 px-4.5 py-3 rounded-2xl border backdrop-blur-md shadow-2xl ${
            toast.type === 'success' 
              ? 'bg-teal-950/90 border-teal-500/30 text-teal-300' 
              : 'bg-red-950/90 border-red-500/30 text-red-300'
          }`}>
            {toast.type === 'success' ? <CheckCircle className="h-5 w-5 text-teal-400 shrink-0" /> : <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />}
            <span className="text-xs font-semibold text-white">{toast.message}</span>
            <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white pl-2">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Search & Action header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari produk / kode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
            />
          </div>

          {/* Import / Export Controls */}
          <div className="flex items-center space-x-1.5 justify-end">
            <button 
              onClick={downloadTemplate}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white"
              title="Unduh Template Excel Produk"
            >
              <Download className="h-4 w-4" />
            </button>
            <input 
              type="file" 
              id="import-product-excel" 
              className="hidden" 
              accept=".xlsx,.xls,.csv" 
              onChange={handleImport} 
            />
            <button 
              onClick={() => document.getElementById('import-product-excel').click()}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-450 hover:text-teal-400 flex items-center space-x-1.5 text-xs font-bold"
              title="Import Excel Produk"
            >
              <Upload className="h-4 w-4" />
              <span>Import</span>
            </button>
          </div>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl glass-button-primary text-sm self-start md:self-auto"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Tambah Produk</span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Form Panel */}
        {showForm && (
          <GlassCard className="xl:col-span-1 border-teal-500/30">
            <h3 className="text-lg font-bold text-white mb-6">
              {editingProduct ? 'Edit Produk Master' : 'Tambah Produk Baru'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nama Produk *</label>
                <input
                  type="text" required placeholder="Crude Palm Oil"
                  value={namaProduk}
                  onChange={(e) => setNamaProduk(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Kode Produk *</label>
                  <input
                    type="text" required placeholder="CPO"
                    value={kodeProduk}
                    onChange={(e) => setKodeProduk(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Satuan</label>
                  <input
                    type="text" required placeholder="Kg"
                    value={satuan}
                    onChange={(e) => setSatuan(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <button type="submit" className="flex-1 py-2.5 rounded-xl glass-button-primary text-sm font-semibold">Simpan</button>
                <button type="button" onClick={handleCloseForm} className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-sm font-semibold">Batal</button>
              </div>
            </form>
          </GlassCard>
        )}

        {/* Products Grid */}
        <div className={showForm ? 'xl:col-span-2 space-y-4' : 'xl:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'}>
          {filtered.map((prod) => (
            <GlassCard key={prod.id} className="relative flex flex-col justify-between space-y-4" hover={false}>
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-xl bg-teal-500/10 flex items-center justify-center border border-teal-500/30 text-teal-400">
                    <Tag className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{prod.nama_produk}</h4>
                    <p className="text-[10px] text-slate-500 font-semibold flex items-center space-x-1 mt-0.5">
                      <span>Kode: {prod.kode_produk}</span>
                      <span>•</span>
                      <span>Satuan: {prod.satuan}</span>
                    </p>
                  </div>
                </div>

                <div className="flex space-x-1">
                  <button
                    onClick={() => handleEditClick(prod)}
                    className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-teal-400 transition-colors"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(prod.id)}
                    className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-red-950/40 border border-slate-800 hover:border-red-900 text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 font-semibold glass-card border border-slate-800 rounded-2xl">
              Tidak ada produk ditemukan.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
