import React, { useState } from 'react';
import GlassCard from '../GlassCard';
import SuppliersView from './SuppliersView';
import StorageMasterView from './StorageMasterView';
import ProductMasterView from './ProductMasterView';
import { Users, Database, Tag, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

export default function MasterDataView({
  suppliers,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  
  storages,
  onAddStorage,
  onUpdateStorage,
  onDeleteStorage,
  
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct
}) {
  const [activeSubTab, setActiveSubTab] = useState('suppliers'); 
  
  // Custom Confirmation Modal & Toast States
  const [toast, setToast] = useState(null); // { message: '', type: 'success' | 'error' }
  const [confirmDialog, setConfirmDialog] = useState(null); // { message: '', onConfirm: () => void }

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // Wrapped delete actions to intercept and show custom confirm dialogs
  const wrappedDeleteSupplier = (id) => {
    setConfirmDialog({
      message: 'Hapus Supplier ini? Tindakan ini akan menghapus semua kontrak terkait.',
      onConfirm: () => {
        onDeleteSupplier(id);
        setConfirmDialog(null);
        showToast('Supplier berhasil dihapus', 'success');
      }
    });
  };

  const wrappedDeleteStorage = (id) => {
    setConfirmDialog({
      message: 'Hapus Storage ini? Pastikan kapasitas penyimpanan sudah kosong.',
      onConfirm: () => {
        onDeleteStorage(id);
        setConfirmDialog(null);
        showToast('Storage berhasil dihapus', 'success');
      }
    });
  };

  const wrappedDeleteProduct = (id) => {
    setConfirmDialog({
      message: 'Hapus Produk ini? Tindakan ini tidak dapat dibatalkan.',
      onConfirm: () => {
        onDeleteProduct(id);
        setConfirmDialog(null);
        showToast('Produk berhasil dihapus', 'success');
      }
    });
  };

  // Wrapped add/update actions to show beautiful toasts
  const wrappedAddSupplier = (payload) => {
    onAddSupplier(payload);
    showToast('Supplier baru berhasil ditambahkan', 'success');
  };
  const wrappedUpdateSupplier = (id, payload) => {
    onUpdateSupplier(id, payload);
    showToast('Supplier berhasil diperbarui', 'success');
  };

  const wrappedAddStorage = (payload) => {
    onAddStorage(payload);
    showToast('Storage baru berhasil ditambahkan', 'success');
  };
  const wrappedUpdateStorage = (id, payload) => {
    onUpdateStorage(id, payload);
    showToast('Storage berhasil diperbarui', 'success');
  };

  const wrappedAddProduct = (payload) => {
    onAddProduct(payload);
    showToast('Produk baru berhasil ditambahkan', 'success');
  };
  const wrappedUpdateProduct = (id, payload) => {
    onUpdateProduct(id, payload);
    showToast('Produk berhasil diperbarui', 'success');
  };

  const subTabs = [
    { id: 'suppliers', label: 'Supplier Master', icon: Users, desc: 'Daftar Mitra Supplier CPO' },
    { id: 'storages', label: 'Storage Master', icon: Database, desc: 'Pengaturan Tangki & Gudang' },
    { id: 'products', label: 'Produk Master', icon: Tag, desc: 'Daftar Varian Produk & Satuan' },
  ];

  return (
    <div className="space-y-6 relative">
      {/* Custom Toast Alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-[9999] animate-fade-in">
          <div className={`flex items-center space-x-3 px-4.5 py-3 rounded-2xl border backdrop-blur-md shadow-2xl ${
            toast.type === 'success' 
              ? 'bg-teal-950/90 border-teal-500/30 text-teal-300' 
              : 'bg-red-950/90 border-red-500/30 text-red-300'
          }`}>
            {toast.type === 'success' ? <CheckCircle className="h-5 w-5 text-teal-400 shrink-0" /> : <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />}
            <span className="text-xs font-semibold">{toast.message}</span>
            <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white pl-2">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Custom Confirm Dialog Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[9990]">
          <GlassCard className="w-full max-w-sm border-red-500/20" hover={false}>
            <div className="flex items-center space-x-3.5 mb-4 text-red-400">
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-white text-base">Konfirmasi Hapus</h3>
            </div>
            <p className="text-xs text-slate-350 leading-relaxed mb-6">{confirmDialog.message}</p>
            <div className="flex space-x-3">
              <button 
                onClick={confirmDialog.onConfirm}
                className="flex-1 py-2.5 rounded-xl bg-red-650 hover:bg-red-600 text-white font-bold text-xs transition-colors shadow-lg shadow-red-500/10"
              >
                Hapus
              </button>
              <button 
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 font-semibold text-xs hover:text-white transition-colors"
              >
                Batal
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Tab Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`p-4 rounded-2xl glass-card text-left transition-all border flex items-center space-x-4 ${
                isActive
                  ? 'border-teal-500/60 bg-gradient-to-br from-teal-500/10 to-sky-500/5 shadow-lg shadow-teal-500/5'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className={`p-2.5 rounded-xl border ${
                isActive ? 'bg-teal-500/10 border-teal-500/30 text-teal-400' : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h4 className={`text-sm font-bold ${isActive ? 'text-teal-300' : 'text-slate-400'}`}>{tab.label}</h4>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{tab.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="transition-all duration-250">
        {activeSubTab === 'suppliers' && (
          <SuppliersView
            suppliers={suppliers}
            onAdd={wrappedAddSupplier}
            onUpdate={wrappedUpdateSupplier}
            onDelete={wrappedDeleteSupplier}
          />
        )}
        {activeSubTab === 'storages' && (
          <StorageMasterView
            storages={storages}
            onAdd={wrappedAddStorage}
            onUpdate={wrappedUpdateStorage}
            onDelete={wrappedDeleteStorage}
          />
        )}
        {activeSubTab === 'products' && (
          <ProductMasterView
            products={products}
            onAdd={wrappedAddProduct}
            onUpdate={wrappedUpdateProduct}
            onDelete={wrappedDeleteProduct}
          />
        )}
      </div>
    </div>
  );
}
