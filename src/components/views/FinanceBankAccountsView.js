import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import GlassCard from '../GlassCard';

export default function BankAccountsView({
  bankAccounts = [],
  onAddBank,
  onUpdateBank,
  onDeleteBank
}) {
  const [activeModal, setActiveModal] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [bankForm, setBankForm] = useState({ bank_name: '', account_name: '', account_number: '', currency: 'IDR' });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedItem) {
      onUpdateBank(selectedItem.id, bankForm);
    } else {
      onAddBank(bankForm);
    }
    setActiveModal(null);
  };

  return (
    <div className="space-y-4 pt-4 animate-fade-in">
      <div className="flex justify-between items-center bg-slate-900/60 px-4 py-3 rounded-2xl border border-slate-800">
        <span className="text-xs text-slate-400 font-bold">Master Data Rekening Bank</span>
        <button 
          onClick={() => { 
            setSelectedItem(null); 
            setBankForm({ bank_name: '', account_name: '', account_number: '', currency: 'IDR' }); 
            setActiveModal('add'); 
          }} 
          className="flex items-center space-x-1 px-4 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold hover:bg-indigo-500/30 transition-colors"
        >
          <Plus className="h-3.5 w-3.5"/>
          <span>Tambah Rekening</span>
        </button>
      </div>

      <GlassCard className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
              <th className="py-3 px-4">Nama Bank</th>
              <th className="py-3 px-4">Nama Pemilik</th>
              <th className="py-3 px-4">Nomor Rekening</th>
              <th className="py-3 px-4">Mata Uang</th>
              <th className="py-3 px-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {bankAccounts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(b => (
              <tr key={b.id} className="hover:bg-slate-900/40 transition-colors">
                <td className="py-3 px-4 font-bold text-indigo-400">{b.bank_name}</td>
                <td className="py-3 px-4 text-white font-semibold">{b.account_name}</td>
                <td className="py-3 px-4 text-slate-300 font-mono tracking-widest">{b.account_number}</td>
                <td className="py-3 px-4 text-slate-400">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${b.currency === 'USD' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/50 text-slate-300'}`}>
                    {b.currency}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <button onClick={() => onDeleteBank(b.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="h-3.5 w-3.5"/>
                  </button>
                </td>
              </tr>
            ))}
            {bankAccounts.length === 0 && (
              <tr>
                <td colSpan="5" className="py-8 text-center text-slate-500 text-xs">Belum ada data rekening bank</td>
              </tr>
            )}
          </tbody>
        </table>
        
        {bankAccounts.length > 0 && (
          <div className="flex justify-between items-center mt-2 px-4 pb-3">
            <button disabled={page === 1} onClick={() => setPage(prev => prev - 1)} className="text-xs text-slate-400 hover:text-white disabled:opacity-50 transition-colors">Prev</button>
            <span className="text-[10px] text-slate-500 font-medium">{page} / {Math.ceil(bankAccounts.length / PAGE_SIZE) || 1}</span>
            <button disabled={page >= Math.ceil(bankAccounts.length / PAGE_SIZE)} onClick={() => setPage(prev => prev + 1)} className="text-xs text-slate-400 hover:text-white disabled:opacity-50 transition-colors">Next</button>
          </div>
        )}
      </GlassCard>

      {/* Modal Add/Edit */}
      {activeModal === 'add' && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[9990] animate-fade-in">
          <GlassCard className="w-full max-w-sm p-6 border-indigo-500/20" hover={false}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Data Rekening</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white transition-colors">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nama Bank</label>
                <input type="text" required value={bankForm.bank_name} onChange={e => setBankForm(prev => ({ ...prev, bank_name: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white focus:border-indigo-500/50" placeholder="BCA, Mandiri..." />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nama Pemilik</label>
                <input type="text" required value={bankForm.account_name} onChange={e => setBankForm(prev => ({ ...prev, account_name: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white focus:border-indigo-500/50" placeholder="PT Contoh..." />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nomor Rekening</label>
                <input type="text" required value={bankForm.account_number} onChange={e => setBankForm(prev => ({ ...prev, account_number: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white focus:border-indigo-500/50" placeholder="1234567890" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Mata Uang</label>
                <select value={bankForm.currency} onChange={e => setBankForm(prev => ({ ...prev, currency: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white focus:border-indigo-500/50">
                  <option value="IDR">IDR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="submit" className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors shadow-lg shadow-indigo-500/20">Simpan</button>
                <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-semibold hover:text-white transition-colors">Batal</button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
