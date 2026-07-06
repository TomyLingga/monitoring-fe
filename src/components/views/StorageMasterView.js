import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import GlassCard from '../GlassCard';
import { Search, PlusCircle, Trash2, Edit, Database, Warehouse, MapPin, HardDrive, Download, Upload, CheckCircle, AlertTriangle, X } from 'lucide-react';

export default function StorageMasterView({ storages, onAdd, onUpdate, onDelete }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); 
  const [showForm, setShowForm] = useState(false);
  const [editingStorage, setEditingStorage] = useState(null);

  const [nama, setNama] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [kapasitas, setKapasitas] = useState('');
  const [jenis, setJenis] = useState('tangki');

  // Local Toast alert system
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleEditClick = (s) => {
    setEditingStorage(s);
    setNama(s.nama);
    setLokasi(s.lokasi || '');
    setKapasitas(s.kapasitas);
    setJenis(s.jenis);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingStorage(null);
    setNama('');
    setLokasi('');
    setKapasitas('');
    setJenis('tangki');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nama || !kapasitas) return;

    const normalizedNama = nama.trim().toLowerCase();
    const isDuplicate = storages.some(s => s.nama.trim().toLowerCase() === normalizedNama && s.id !== editingStorage?.id);
    
    if (isDuplicate) {
      showToast('Gagal: Nama storage sudah terdaftar!', 'error');
      return;
    }

    const payload = { nama, lokasi, kapasitas: parseFloat(kapasitas), jenis };
    if (editingStorage) {
      onUpdate(editingStorage.id, payload);
      showToast('Storage berhasil diperbarui', 'success');
    } else {
      onAdd(payload);
      showToast('Storage berhasil ditambahkan', 'success');
    }
    handleCloseForm();
  };

  const filtered = storages.filter(s => {
    const matchesSearch = s.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (s.lokasi && s.lokasi.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === 'all' || s.jenis === typeFilter;
    return matchesSearch && matchesType;
  });

  // Excel template
  const downloadTemplate = () => {
    const wsData = [
      ['nama_storage', 'lokasi', 'kapasitas', 'jenis'],
      ['Tangki CPO 06', 'Zona Utara', 2500000, 'tangki'],
      ['Gudang C', 'Blok D', 50000, 'gudang']
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Storage');
    XLSX.writeFile(wb, 'template_storage_master.xlsx');
    showToast('Template Storage diunduh', 'success');
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
          const rawName = row.nama_storage || '';
          if (!rawName.trim()) return;

          const isDuplicate = storages.some(s => s.nama.trim().toLowerCase() === rawName.trim().toLowerCase());
          
          if (isDuplicate) {
            skippedCount++;
          } else {
            onAdd({
              nama: rawName.trim(),
              lokasi: row.lokasi || 'Zona Baru',
              kapasitas: parseFloat(row.kapasitas || 1000000),
              jenis: row.jenis === 'gudang' ? 'gudang' : 'tangki'
            });
            successCount++;
          }
        });

        if (skippedCount > 0) {
          showToast(`Impor sukses: ${successCount} ditambahkan, ${skippedCount} dilewati karena duplikat`, 'error');
        } else {
          showToast(`Berhasil mengimpor ${successCount} storage baru!`, 'success');
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

      {/* Search & Actions with Storage Type Filter */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari storage / lokasi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl glass-input text-sm bg-slate-900 min-w-[140px]"
          >
            <option value="all">Semua Tipe</option>
            <option value="tangki">Tipe: Tangki (Kg)</option>
            <option value="gudang">Tipe: Gudang (Box)</option>
          </select>

          {/* Import / Export Controls */}
          <div className="flex items-center space-x-1.5 justify-end">
            <button 
              onClick={downloadTemplate}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white"
              title="Unduh Template Excel Storage"
            >
              <Download className="h-4 w-4" />
            </button>
            <input 
              type="file" 
              id="import-storage-excel" 
              className="hidden" 
              accept=".xlsx,.xls,.csv" 
              onChange={handleImport} 
            />
            <button 
              onClick={() => document.getElementById('import-storage-excel').click()}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-450 hover:text-teal-400 flex items-center space-x-1.5 text-xs font-bold"
              title="Import Excel Storage"
            >
              <Upload className="h-4 w-4" />
              <span>Import</span>
            </button>
          </div>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl glass-button-primary text-sm self-start md:self-auto whitespace-nowrap"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Tambah Storage</span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Form Panel */}
        {showForm && (
          <GlassCard className="xl:col-span-1 border-teal-500/30 animate-fade-in">
            <h3 className="text-lg font-bold text-white mb-6">
              {editingStorage ? 'Edit Storage Master' : 'Tambah Storage Baru'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nama Storage *</label>
                <input
                  type="text" required placeholder="Tangki CPO 03 / Gudang B"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Lokasi *</label>
                <input
                  type="text" placeholder="Zona Utara / Blok A"
                  value={lokasi}
                  onChange={(e) => setLokasi(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Kapasitas ({jenis === 'tangki' ? 'Kg' : 'Box'}) *
                  </label>
                  <input
                    type="number" required placeholder="5000000"
                    value={kapasitas}
                    onChange={(e) => setKapasitas(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Jenis Storage</label>
                  <select
                    value={jenis}
                    onChange={(e) => setJenis(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm bg-slate-900"
                  >
                    <option value="tangki">Tangki (1 Produk)</option>
                    <option value="gudang">Gudang (Multi Produk)</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <button type="submit" className="flex-1 py-2.5 rounded-xl glass-button-primary text-sm font-semibold">Simpan</button>
                <button type="button" onClick={handleCloseForm} className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-sm font-semibold">Batal</button>
              </div>
            </form>
          </GlassCard>
        )}

        {/* Storages Grid */}
        <div className={showForm ? 'xl:col-span-2 space-y-4' : 'xl:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'}>
          {filtered.map((storage) => {
            const isTank = storage.jenis === 'tangki';
            const unit = isTank ? 'Kg' : 'Box';
            const totalStock = storage.stok ? storage.stok.reduce((acc, curr) => acc + curr.qty, 0) : 0;
            const percentage = storage.kapasitas > 0 ? Math.round((totalStock / storage.kapasitas) * 100) : 0;

            return (
              <GlassCard key={storage.id} className="relative flex flex-col justify-between space-y-4" hover={false}>
                {/* Header info */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${
                      isTank ? 'bg-teal-500/10 border-teal-500/30 text-teal-400' : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                    }`}>
                      {isTank ? <Database className="h-5 w-5" /> : <Warehouse className="h-5 w-5" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{storage.nama}</h4>
                      <p className="text-[10px] text-slate-500 font-semibold flex items-center space-x-1 mt-0.5">
                        <MapPin className="h-3 w-3" />
                        <span>{storage.lokasi || 'No Location'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleEditClick(storage)}
                      className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-teal-400 border border-slate-850 transition-all"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(storage.id)}
                      className="p-1 rounded bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-850 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Storage content info */}
                <div className="space-y-3.5 border-t border-slate-900 pt-3">
                  <div className="flex justify-between text-xs text-slate-400 font-semibold">
                    <span>Jenis: <strong className="text-white uppercase">{storage.jenis}</strong></span>
                    <span>Kapasitas: <strong className="text-white">{storage.kapasitas.toLocaleString('id-ID')} {unit}</strong></span>
                  </div>

                  {/* Stock Products List inside Warehouse or Tank */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Daftar Stok Produk</span>
                    <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                      {storage.stok && storage.stok.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs bg-slate-950/60 p-2 rounded border border-slate-900 font-semibold">
                          <div>
                            <span className="text-white">{item.nama_produk}</span>
                            <span className="text-[9px] bg-slate-900 border border-slate-800 px-1 rounded text-slate-500 ml-1.5 font-bold uppercase">{item.kode_produk}</span>
                          </div>
                          <strong className="text-teal-400">{item.qty.toLocaleString('id-ID')} {unit}</strong>
                        </div>
                      ))}
                      {(!storage.stok || storage.stok.length === 0) && (
                        <div className="text-center text-[10px] text-slate-500 italic py-2 font-medium">Kosong (Tidak ada stok)</div>
                      )}
                    </div>
                  </div>

                  {/* Multi-product visualization for Warehouse vs single product Tank */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400">
                      <span>Total Terisi: {totalStock.toLocaleString('id-ID')} {unit}</span>
                      <span>{percentage}%</span>
                    </div>
                    {isTank ? (
                      /* Tank bar (solid) */
                      <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                        <div 
                          className="h-full rounded-full bg-teal-500 transition-all duration-500" 
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        ></div>
                      </div>
                    ) : (
                      /* Warehouse split bar showing multiple product fills */
                      <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800 flex">
                        {storage.stok && storage.stok.map((item, idx) => {
                          const widthPct = storage.kapasitas > 0 ? (item.qty / storage.kapasitas) * 100 : 0;
                          const bgColors = ['bg-indigo-500', 'bg-sky-500', 'bg-purple-500', 'bg-teal-500'];
                          return (
                            <div 
                              key={idx}
                              className={`h-full first:rounded-l-full last:rounded-r-full ${bgColors[idx % bgColors.length]}`}
                              style={{ width: `${widthPct}%` }}
                              title={`${item.nama_produk}: ${item.qty.toLocaleString()} ${unit}`}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 font-semibold glass-card border border-slate-800 rounded-2xl">
              Tidak ada storage ditemukan.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
