import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import GlassCard from '../GlassCard';
import { Search, UserPlus, User, FileText, Trash2, Edit, Download, Upload, CheckCircle, AlertTriangle, X } from 'lucide-react';

export default function BuyersView({ buyers, onAdd, onUpdate, onDelete }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBuyer, setEditingBuyer] = useState(null);
  
  // Form State
  const [nama, setNama] = useState('');
  const [keterangan, setKeterangan] = useState('lokal');

  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleEditClick = (buyer) => {
    setEditingBuyer(buyer);
    setNama(buyer.nama || '');
    setKeterangan(buyer.keterangan || 'lokal');
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingBuyer(null);
    setNama('');
    setKeterangan('lokal');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nama) return;

    const normalizedNama = nama.trim().toLowerCase();
    const isDuplicate = buyers.some(b => b.nama.trim().toLowerCase() === normalizedNama && b.id !== editingBuyer?.id);
    
    if (isDuplicate) {
      showToast('Gagal: Nama buyer sudah terdaftar!', 'error');
      return;
    }

    const payload = { nama, keterangan };
    if (editingBuyer) {
      onUpdate(editingBuyer.id, payload);
      showToast('Buyer berhasil diperbarui', 'success');
    } else {
      onAdd(payload);
      showToast('Buyer berhasil ditambahkan', 'success');
    }
    handleCloseForm();
  };

  const filteredBuyers = buyers.filter(b => 
    b.nama.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const downloadTemplate = () => {
    const wsData = [
      ['nama', 'keterangan'],
      ['PT Salim Ivomas Pratama', 'lokal'],
      ['PT Wings Surya', 'lokal'],
      ['PT Unilever Indonesia Tbk', 'ekspor']
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Buyer');
    XLSX.writeFile(wb, 'template_buyer_master.xlsx');
    showToast('Template Buyer diunduh', 'success');
  };

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
          const rawName = row.nama || '';
          if (!rawName.trim()) return;

          const isDuplicate = buyers.some(b => b.nama.trim().toLowerCase() === rawName.trim().toLowerCase());
          
          if (isDuplicate) {
            skippedCount++;
          } else {
            onAdd({
              nama: rawName.trim(),
              keterangan: row.keterangan ? String(row.keterangan).trim().toLowerCase() : 'lokal',
            });
            successCount++;
          }
        });

        if (skippedCount > 0) {
          showToast(`Impor sukses: ${successCount} ditambahkan, ${skippedCount} dilewati karena duplikat`, 'error');
        } else {
          showToast(`Berhasil mengimpor ${successCount} buyer baru!`, 'success');
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

      {/* Action Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama buyer..."
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
              title="Unduh Template Excel Buyer"
            >
              <Download className="h-4 w-4" />
            </button>
            <input 
              type="file" 
              id="import-buyer-excel" 
              className="hidden" 
              accept=".xlsx,.xls,.csv" 
              onChange={handleImport} 
            />
            <button 
              onClick={() => document.getElementById('import-buyer-excel').click()}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-450 hover:text-teal-400 flex items-center space-x-1.5 text-xs font-bold"
              title="Import Excel Buyer"
            >
              <Upload className="h-4 w-4" />
              <span>Import</span>
            </button>
          </div>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl glass-button-primary text-sm font-bold self-start md:self-auto"
        >
          <UserPlus className="h-4 w-4" />
          <span>Tambah Buyer / Customer</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Form Panel */}
        {showForm && (
          <GlassCard className="xl:col-span-1 border-teal-500/30">
            <h3 className="text-lg font-bold text-white mb-6">
              {editingBuyer ? 'Edit Buyer / Customer' : 'Tambah Buyer Baru'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nama Buyer / Perusahaan *</label>
                <input
                  type="text"
                  required
                  placeholder="PT Salim Ivomas Pratama"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Keterangan / Segmen *</label>
                <select
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm bg-slate-900 text-white"
                >
                  <option value="lokal">Lokal</option>
                  <option value="ekspor">Ekspor</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl glass-button-primary text-sm font-semibold"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-sm font-semibold"
                >
                  Batal
                </button>
              </div>
            </form>
          </GlassCard>
        )}

        {/* Buyers List */}
        <div className={showForm ? 'xl:col-span-2 space-y-4' : 'xl:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'}>
          {filteredBuyers.map((buyer) => (
            <GlassCard key={buyer.id} className="relative flex flex-col justify-between space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-xl bg-teal-500/10 flex items-center justify-center border border-teal-500/30">
                    <User className="h-5 w-5 text-teal-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{buyer.nama}</h4>
                    <div className="flex items-center space-x-1.5 mt-0.5">
                      <p className="text-[10px] text-slate-500">Buyer ID: #{buyer.id}</p>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                        buyer.keterangan === 'ekspor' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                      }`}>{buyer.keterangan || 'lokal'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-1.5">
                  <button
                    onClick={() => handleEditClick(buyer)}
                    className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-teal-400 transition-colors"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(buyer.id)}
                    className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-red-950/40 border border-slate-800 hover:border-red-900 text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Status summary */}
              <div className="flex items-center justify-between text-xs bg-slate-950/50 p-2.5 rounded-lg border border-slate-900 mt-2">
                <div className="flex items-center space-x-1.5">
                  <FileText className="h-4 w-4 text-teal-400" />
                  <span className="text-slate-400">Total Kontrak Penjualan</span>
                </div>
                <strong className="text-white">{buyer.kontrak_penjualans_count || 0}</strong>
              </div>
            </GlassCard>
          ))}

          {filteredBuyers.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 font-semibold glass-card rounded-2xl border border-slate-800">
              Tidak ada buyer ditemukan.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
