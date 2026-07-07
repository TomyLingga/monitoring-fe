import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import GlassCard from '../GlassCard';
import { Search, UserPlus, FileText, Trash2, Edit, Download, Upload, CheckCircle, AlertTriangle, X } from 'lucide-react';

export default function BuyersView({ buyers, onAdd, onUpdate, onDelete }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBuyer, setEditingBuyer] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    nama: '',
    alamat: '',
    pic: '',
    telepon: '',
    email: '',
  });

  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleEditClick = (buyer) => {
    setEditingBuyer(buyer);
    setFormData({
      nama: buyer.nama ?? '',
      alamat: buyer.alamat ?? '',
      pic: buyer.pic ?? '',
      telepon: buyer.telepon ?? '',
      email: buyer.email ?? '',
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingBuyer(null);
    setFormData({ nama: '', alamat: '', pic: '', telepon: '', email: '' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nama) return;

    const normalizedNama = formData.nama.trim().toLowerCase();
    const isDuplicate = buyers.some(b => b.nama.trim().toLowerCase() === normalizedNama && b.id !== editingBuyer?.id);
    
    if (isDuplicate) {
      showToast('Gagal: Nama buyer sudah terdaftar!', 'error');
      return;
    }

    if (editingBuyer) {
      onUpdate(editingBuyer.id, formData);
      showToast('Buyer berhasil diperbarui', 'success');
    } else {
      onAdd(formData);
      showToast('Buyer berhasil ditambahkan', 'success');
    }
    handleCloseForm();
  };

  const filteredBuyers = buyers.filter(b => 
    b.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.pic && b.pic.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const downloadTemplate = () => {
    const wsData = [
      ['nama', 'alamat', 'pic', 'telepon', 'email'],
      ['PT Salim Ivomas Pratama', 'Jl. Sudirman Kav 34, Jakarta', 'Ahmad Subagyo', '021-579588', 'sales@salimivomas.com'],
      ['PT Wings Surya', 'Jl. Kalibutuh 189, Surabaya', 'Hendra Wijaya', '031-5322300', 'hendra.wings@wingscorp.com']
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
              alamat: row.alamat ? String(row.alamat).trim() : null,
              pic: row.pic ? String(row.pic).trim() : null,
              telepon: row.telepon ? String(row.telepon).trim() : null,
              email: row.email ? String(row.email).trim() : null,
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
              placeholder="Cari nama buyer atau PIC..."
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
          className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl glass-button-primary text-xs font-bold"
        >
          <UserPlus className="h-4 w-4" />
          <span>Tambah Buyer / Customer</span>
        </button>
      </div>

      {/* Main Form Overlay */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[9990]">
          <GlassCard className="w-full max-w-md border-teal-500/20" hover={false}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                {editingBuyer ? 'Edit Buyer / Customer' : 'Tambah Buyer Baru'}
              </h3>
              <button onClick={handleCloseForm} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nama Perusahaan / Buyer</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PT Salim Ivomas Pratama"
                  value={formData.nama}
                  onChange={e => setFormData(prev => ({ ...prev, nama: e.target.value }))}
                  className="w-full px-4.5 py-2.5 rounded-xl glass-input text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Alamat Kantor / Pabrik</label>
                <textarea
                  placeholder="Contoh: Jl. Sudirman Kav 34, Jakarta"
                  rows={2}
                  value={formData.alamat}
                  onChange={e => setFormData(prev => ({ ...prev, alamat: e.target.value }))}
                  className="w-full px-4.5 py-2.5 rounded-xl glass-input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">PIC / Contact Person</label>
                  <input
                    type="text"
                    placeholder="Nama PIC"
                    value={formData.pic}
                    onChange={e => setFormData(prev => ({ ...prev, pic: e.target.value }))}
                    className="w-full px-4.5 py-2.5 rounded-xl glass-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">No. Telepon</label>
                  <input
                    type="text"
                    placeholder="No. Telp"
                    value={formData.telepon}
                    onChange={e => setFormData(prev => ({ ...prev, telepon: e.target.value }))}
                    className="w-full px-4.5 py-2.5 rounded-xl glass-input text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email Kantor</label>
                <input
                  type="email"
                  placeholder="Contoh: info@company.com"
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4.5 py-2.5 rounded-xl glass-input text-xs"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button type="submit" className="flex-1 py-3 rounded-xl glass-button-primary text-xs font-bold">
                  {editingBuyer ? 'Simpan Perubahan' : 'Tambahkan'}
                </button>
                <button type="button" onClick={handleCloseForm} className="flex-1 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-semibold hover:text-white transition-colors">
                  Batal
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* Main List */}
      <GlassCard className="overflow-hidden" hover={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Nama Buyer</th>
                <th className="py-3 px-4">Alamat</th>
                <th className="py-3 px-4">PIC</th>
                <th className="py-3 px-4">Telepon</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredBuyers.map((b) => (
                <tr key={b.id} className="hover:bg-slate-900/40 transition-colors align-middle">
                  <td className="py-3 px-4 font-bold text-white flex items-center space-x-2">
                    <span className="h-6 w-6 rounded bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold text-xs uppercase">{b.nama[0]}</span>
                    <span>{b.nama}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-semibold">{b.alamat ?? '-'}</td>
                  <td className="py-3 px-4 text-slate-300">{b.pic ?? '-'}</td>
                  <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{b.telepon ?? '-'}</td>
                  <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{b.email ?? '-'}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center space-x-1.5">
                      <button 
                        onClick={() => handleEditClick(b)}
                        className="p-1 rounded bg-slate-900 text-slate-400 hover:text-teal-400 border border-slate-800 transition-colors"
                        title="Edit Buyer"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => onDelete(b.id)}
                        className="p-1 rounded bg-slate-900 text-slate-400 hover:text-red-400 border border-slate-800 transition-colors"
                        title="Hapus Buyer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredBuyers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 italic">Tidak ada buyer ditemukan</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
