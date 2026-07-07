import React, { useState, useMemo, useEffect } from 'react';
import GlassCard from '../GlassCard';
import CustomDateInput from '../ui/CustomDateInput';
import * as XLSX from 'xlsx';
import {
  FlaskConical, Layers, Package, Calendar, Plus, Edit, Trash2,
  ChevronLeft, ChevronRight, X, CheckCircle, AlertTriangle,
  Target, ArrowRight, ArrowLeft, Download, Upload, BarChart2
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';

export default function ProductionView({
  products,
  storages,
  startDate, endDate, onDateChange,
  prosesRefineries, prosesFraksinasis, prosesPackagings,
  dailyProductionTargets,
  onAddRefinery, onUpdateRefinery, onDeleteRefinery,
  onAddFraksinasi, onUpdateFraksinasi, onDeleteFraksinasi,
  onAddPackaging, onUpdatePackaging, onDeletePackaging,
  onAddProductionTarget, onUpdateProductionTarget, onDeleteProductionTarget,
  onBulkAddRefinery, onBulkAddFraksinasi, onBulkAddPackaging
}) {
  const todayStr = new Date().toISOString().split('T')[0];

  // Active process tab: 'refinery' | 'fraksinasi' | 'packaging'
  const [activeTab, setActiveTab] = useState('refinery');
  const activeUnit = activeTab === 'packaging' ? 'Box' : 'Kg';

  // Toast & Confirm
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Modal
  const [activeModal, setActiveModal] = useState(null); // 'add_refinery' | 'edit_refinery' etc.
  const [selectedItem, setSelectedItem] = useState(null);

  // Target Input States
  const [targetDate, setTargetDate] = useState(todayStr);
  const [targetQty, setTargetQty] = useState('');

  // Form state for each process type
  const emptyProcessForm = { tgl: todayStr, catatan: '' };
  const [processForm, setProcessForm] = useState(emptyProcessForm);
  // Dynamic bahan & hasil line items
  const [bahanLines, setBahanLines] = useState([{ produk_id: '', qty: '' }]);
  const [hasilLines, setHasilLines] = useState([{ produk_id: '', qty: '' }]);

  // Pagination
  const [page, setPage] = useState({ refinery: 1, fraksinasi: 1, packaging: 1 });
  const PER_PAGE = 5;

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const formatQty = (v) => {
    const n = parseFloat(v);
    if (isNaN(n)) return '-';
    return n.toLocaleString('id-ID', { maximumFractionDigits: 2 });
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

  const formatDateIndo = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // ── Sync target values on load or change ──
  const existingTarget = useMemo(
    () => (dailyProductionTargets || []).find(t => t.tgl?.split('T')[0] === targetDate && t.jenis === activeTab),
    [dailyProductionTargets, targetDate, activeTab]
  );

  useEffect(() => {
    if (existingTarget) {
      setTargetQty(String(existingTarget.target_qty));
    } else {
      setTargetQty('');
    }
  }, [existingTarget, targetDate, activeTab]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setTabPage(1);
  };

  const selectedRangeTargets = useMemo(
    () => (dailyProductionTargets || []).filter(t => {
      const targetTgl = t.tgl?.split('T')[0] || t.tgl;
      return targetTgl >= startDate && targetTgl <= endDate && t.jenis === activeTab;
    }),
    [dailyProductionTargets, startDate, endDate, activeTab]
  );

  const totalTargetRange = selectedRangeTargets.reduce((s, t) => s + parseFloat(t.target_qty || 0), 0);

  // Total hasil per proses range
  const totalHasilRefinery = useMemo(
    () => prosesRefineries.reduce((s, p) => s + (p.hasil_refineries || p.hasilRefineries || []).reduce((ss, h) => ss + parseFloat(h.qty || 0), 0), 0),
    [prosesRefineries]
  );
  const totalHasilFraksinasi = useMemo(
    () => prosesFraksinasis.reduce((s, p) => s + (p.hasil_fraksinasis || p.hasilFraksinasis || []).reduce((ss, h) => ss + parseFloat(h.qty || 0), 0), 0),
    [prosesFraksinasis]
  );
  const totalHasilPackaging = useMemo(
    () => prosesPackagings.reduce((s, p) => s + (p.hasil_packagings || p.hasilPackagings || []).reduce((ss, h) => ss + parseFloat(h.qty || 0), 0), 0),
    [prosesPackagings]
  );

  const totalHasilActive = useMemo(() => {
    if (activeTab === 'refinery') return totalHasilRefinery;
    if (activeTab === 'fraksinasi') return totalHasilFraksinasi;
    return totalHasilPackaging;
  }, [activeTab, totalHasilRefinery, totalHasilFraksinasi, totalHasilPackaging]);

  const pctTarget = totalTargetRange > 0 ? Math.min(100, Math.round((totalHasilActive / totalTargetRange) * 100)) : 0;

  // ── Chart Data: Daily target vs realisasi ──
  const dailyChartData = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateMap = {};

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().split('T')[0];
      const label = ds.slice(5); // MM-DD
      dateMap[ds] = { date: ds, label, target: 0, realisasi: 0 };
    }

    // Fill targets for activeTab
    (dailyProductionTargets || []).filter(t => t.jenis === activeTab).forEach(t => {
      const ds = t.tgl?.split('T')[0] || t.tgl;
      if (dateMap[ds]) dateMap[ds].target += parseFloat(t.target_qty || 0);
    });

    // Fill realisasi from hasil per process
    const sourceData = activeTab === 'refinery' ? prosesRefineries
      : activeTab === 'fraksinasi' ? prosesFraksinasis : prosesPackagings;

    const hasilKey = activeTab === 'refinery' ? ['hasil_refineries', 'hasilRefineries']
      : activeTab === 'fraksinasi' ? ['hasil_fraksinasis', 'hasilFraksinasis']
      : ['hasil_packagings', 'hasilPackagings'];

    sourceData.forEach(p => {
      const ds = p.tgl?.split('T')[0] || p.tgl;
      if (dateMap[ds]) {
        const items = p[hasilKey[0]] ?? p[hasilKey[1]] ?? [];
        dateMap[ds].realisasi += items.reduce((s, h) => s + parseFloat(h.qty || 0), 0);
      }
    });

    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [startDate, endDate, activeTab, dailyProductionTargets, prosesRefineries, prosesFraksinasis, prosesPackagings]);

  // ── Open modal helpers ──
  const openAddModal = (type) => {
    setSelectedItem(null);
    setProcessForm({ tgl: todayStr, catatan: '' });
    setBahanLines([{ produk_id: '', qty: '', storage_id: '' }]);
    setHasilLines([{ produk_id: '', qty: '', storage_id: '' }]);
    setActiveModal(`add_${type}`);
  };

  const openEditModal = (type, item) => {
    setSelectedItem(item);
    setProcessForm({ tgl: item.tgl?.split('T')[0] ?? todayStr, catatan: item.catatan ?? '' });
    const bahanKey = type === 'refinery' ? (item.bahan_refineries ?? item.bahanRefineries ?? [])
      : type === 'fraksinasi' ? (item.bahan_fraksinasis ?? item.bahanFraksinasis ?? [])
      : (item.bahan_packagings ?? item.bahanPackagings ?? []);
    const hasilKey = type === 'refinery' ? (item.hasil_refineries ?? item.hasilRefineries ?? [])
      : type === 'fraksinasi' ? (item.hasil_fraksinasis ?? item.hasilFraksinasis ?? [])
      : (item.hasil_packagings ?? item.hasilPackagings ?? []);
    setBahanLines(bahanKey.length > 0 ? bahanKey.map(b => ({ produk_id: String(b.produk_id), qty: String(b.qty), storage_id: String(b.storage_id || '') })) : [{ produk_id: '', qty: '', storage_id: '' }]);
    setHasilLines(hasilKey.length > 0 ? hasilKey.map(h => ({ produk_id: String(h.produk_id), qty: String(h.qty), storage_id: String(h.storage_id || '') })) : [{ produk_id: '', qty: '', storage_id: '' }]);
    setActiveModal(`edit_${type}`);
  };

  const closeModal = () => { setActiveModal(null); setSelectedItem(null); };

  // ── Submit handlers ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    const type = activeModal.replace('add_', '').replace('edit_', '');
    const isEdit = activeModal.startsWith('edit_');

    const validBahan = bahanLines.filter(b => b.produk_id && b.qty);
    const validHasil = hasilLines.filter(h => h.produk_id && h.qty);

    if (validBahan.length === 0 && validHasil.length === 0) {
      showToast('Isi minimal 1 bahan atau 1 hasil', 'error');
      return;
    }

    const payload = {
      tgl: processForm.tgl,
      catatan: processForm.catatan,
      bahan: validBahan.map(b => ({ produk_id: parseInt(b.produk_id), qty: parseFloat(b.qty), storage_id: b.storage_id ? parseInt(b.storage_id) : null })),
      hasil: validHasil.map(h => ({ produk_id: parseInt(h.produk_id), qty: parseFloat(h.qty), storage_id: h.storage_id ? parseInt(h.storage_id) : null })),
    };

    try {
      if (type === 'refinery') {
        if (isEdit) await onUpdateRefinery(selectedItem.id, payload);
        else await onAddRefinery(payload);
      } else if (type === 'fraksinasi') {
        if (isEdit) await onUpdateFraksinasi(selectedItem.id, payload);
        else await onAddFraksinasi(payload);
      } else {
        if (isEdit) await onUpdatePackaging(selectedItem.id, payload);
        else await onAddPackaging(payload);
      }
      showToast(`Proses ${type} berhasil ${isEdit ? 'diperbarui' : 'dicatat'}`, 'success');
      closeModal();
    } catch (err) {
      showToast('Gagal menyimpan data', 'error');
    }
  };

  const triggerDelete = (type, id) => {
    const labelMap = { refinery: 'Refinery', fraksinasi: 'Fraksinasi', packaging: 'Packaging' };
    setConfirmDialog({
      message: `Hapus data proses ${labelMap[type]} ini? Semua item bahan dan hasil akan ikut dihapus.`,
      onConfirm: async () => {
        try {
          if (type === 'refinery') await onDeleteRefinery(id);
          else if (type === 'fraksinasi') await onDeleteFraksinasi(id);
          else await onDeletePackaging(id);
          showToast('Data proses berhasil dihapus', 'success');
        } catch (err) {
          showToast('Gagal menghapus data', 'error');
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleTargetSubmit = async (e) => {
    e.preventDefault();
    if (!targetDate || targetQty === '') { showToast('Tanggal dan target wajib diisi', 'error'); return; }
    const payload = { tgl: targetDate, target_qty: parseFloat(targetQty), jenis: activeTab };
    if (existingTarget) {
      await onUpdateProductionTarget(existingTarget.id, payload);
      showToast('Target produksi diperbarui', 'success');
    } else {
      await onAddProductionTarget(payload);
      showToast('Target produksi disimpan', 'success');
    }
  };

  // ── Download Excel Template ──
  const downloadTemplate = () => {
    const wsData = [
      ['tanggal', 'catatan', 'kode_produk_bahan', 'qty_bahan', 'nama_storage_bahan', 'kode_produk_hasil', 'qty_hasil', 'nama_storage_hasil']
    ];

    if (activeTab === 'refinery') {
      wsData.push(
        [todayStr, 'Refinery batch 1', 'CPO, BE, PA', '150000, 200, 100', 'Tangki CPO 01, Penyimpanan BE, Penyimpanan PA', 'RBDPO, PFAD', '145000, 4800', 'Tangki RBDPO 01, Gudang Samping PFAD'],
        [todayStr, 'Refinery batch 2', 'CPO', '100000', 'Tangki CPO 02', 'RBDPO', '98500', 'Tangki RBDPO 01']
      );
    } else if (activeTab === 'fraksinasi') {
      wsData.push(
        [todayStr, 'Fraksinasi batch 1', 'RBDPO', '120000', 'Tangki RBDPO 01', 'OL-IV56, Stearin', '96000, 23500', 'Tangki Olein IV56 01, Tangki Stearin 01']
      );
    } else {
      wsData.push(
        [todayStr, 'Packaging Salvaco', 'OL-IV56, Karton, Pouch', '20000, 2000, 20000', 'Tangki Olein IV56 01, Penyimpanan Karton, Penyimpanan Pouch', 'K-SALVACO', '20000', 'Gudang Kemasan Retail']
      );
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Template ${activeTab.toUpperCase()}`);
    XLSX.writeFile(wb, `template_produksi_${activeTab}.xlsx`);
    showToast(`Template template_produksi_${activeTab}.xlsx diunduh`, 'success');
  };

  // ── Excel Importer ──
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

        const payloads = [];
        for (const row of sheetData) {
          let tglVal = row.tanggal;
          if (!tglVal) throw new Error('Kolom tanggal kosong pada salah satu baris');

          if (typeof tglVal === 'number') {
            const dateObj = new Date((tglVal - 25569) * 86400 * 1000);
            tglVal = dateObj.toISOString().split('T')[0];
          } else {
            tglVal = String(tglVal).trim();
          }

          const catatan = row.catatan ? String(row.catatan).trim() : '';

          const rawBahanKodes = row.kode_produk_bahan ? String(row.kode_produk_bahan).split(',') : [];
          const rawBahanQtys = row.qty_bahan ? String(row.qty_bahan).split(',') : [];
          const rawBahanStorages = row.nama_storage_bahan ? String(row.nama_storage_bahan).split(',') : [];

          const rawHasilKodes = row.kode_produk_hasil ? String(row.kode_produk_hasil).split(',') : [];
          const rawHasilQtys = row.qty_hasil ? String(row.qty_hasil).split(',') : [];
          const rawHasilStorages = row.nama_storage_hasil ? String(row.nama_storage_hasil).split(',') : [];

          const bahanList = [];
          for (let i = 0; i < rawBahanKodes.length; i++) {
            const code = rawBahanKodes[i].trim().toUpperCase();
            if (!code) continue;
            const qty = parseFloat(String(rawBahanQtys[i] || '0').replace(/[^\d.]/g, ''));
            const storageName = rawBahanStorages[i] ? rawBahanStorages[i].trim() : '';
            
            const prod = products.find(p => p.kode_produk?.toUpperCase() === code);
            if (!prod) throw new Error(`Produk bahan "${code}" tidak ditemukan`);

            let storageId = null;
            if (storageName && storageName.toLowerCase() !== 'otomatis') {
              const store = storages.find(s => s.nama?.toLowerCase() === storageName.toLowerCase());
              if (!store) throw new Error(`Storage bahan "${storageName}" tidak ditemukan`);
              storageId = store.id;
            }
            bahanList.push({ produk_id: prod.id, qty, storage_id: storageId });
          }

          const hasilList = [];
          for (let i = 0; i < rawHasilKodes.length; i++) {
            const code = rawHasilKodes[i].trim().toUpperCase();
            if (!code) continue;
            const qty = parseFloat(String(rawHasilQtys[i] || '0').replace(/[^\d.]/g, ''));
            const storageName = rawHasilStorages[i] ? rawHasilStorages[i].trim() : '';

            const prod = products.find(p => p.kode_produk?.toUpperCase() === code);
            if (!prod) throw new Error(`Produk hasil "${code}" tidak ditemukan`);

            let storageId = null;
            if (storageName && storageName.toLowerCase() !== 'otomatis') {
              const store = storages.find(s => s.nama?.toLowerCase() === storageName.toLowerCase());
              if (!store) throw new Error(`Storage hasil "${storageName}" tidak ditemukan`);
              storageId = store.id;
            }
            hasilList.push({ produk_id: prod.id, qty, storage_id: storageId });
          }

          if (bahanList.length === 0 && hasilList.length === 0) {
            throw new Error('Bahan dan hasil tidak boleh kosong pada salah satu baris');
          }

          payloads.push({ tgl: tglVal, catatan, bahan: bahanList, hasil: hasilList });
        }
        
        if (activeTab === 'refinery') await onBulkAddRefinery(payloads);
        else if (activeTab === 'fraksinasi') await onBulkAddFraksinasi(payloads);
        else await onBulkAddPackaging(payloads);

        showToast(`Import berhasil memproses ${payloads.length} data ${activeTab}`, 'success');
      } catch (err) {
        console.error(err);
        showToast('Gagal memproses file Excel', 'error');
      }
      e.target.value = null;
    };
    reader.readAsBinaryString(file);
  };

  // ── Paginated data ──
  const currentData = activeTab === 'refinery' ? prosesRefineries
    : activeTab === 'fraksinasi' ? prosesFraksinasis : prosesPackagings;
  const totalPages = Math.ceil(currentData.length / PER_PAGE) || 1;
  const currentPage = page[activeTab];
  const paginatedData = currentData.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const setTabPage = (v) => setPage(prev => ({ ...prev, [activeTab]: v }));

  // ── Tab config ──
  const tabs = [
    { id: 'refinery',   label: 'Refinery',   icon: FlaskConical, color: 'teal',   count: prosesRefineries.length },
    { id: 'fraksinasi', label: 'Fraksinasi',  icon: Layers,       color: 'sky',    count: prosesFraksinasis.length },
    { id: 'packaging',  label: 'Packaging',   icon: Package,      color: 'purple', count: prosesPackagings.length },
  ];

  // ── helpers for rendering items ──
  const getItems = (proses, type, kind) => {
    if (type === 'refinery')   return kind === 'bahan' ? (proses.bahan_refineries ?? proses.bahanRefineries ?? []) : (proses.hasil_refineries ?? proses.hasilRefineries ?? []);
    if (type === 'fraksinasi') return kind === 'bahan' ? (proses.bahan_fraksinasis ?? proses.bahanFraksinasis ?? []) : (proses.hasil_fraksinasis ?? proses.hasilRefineries ?? []);
    return kind === 'bahan' ? (proses.bahan_packagings ?? proses.bahanPackagings ?? []) : (proses.hasil_packagings ?? proses.hasilPackagings ?? []);
  };

  const isAddModal = activeModal?.startsWith('add_');

  return (
    <div className="space-y-6 relative">
      {/* Toast */}
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
              <button onClick={confirmDialog.onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors">Hapus</button>
              <button onClick={() => setConfirmDialog(null)} className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 font-semibold text-xs hover:text-white transition-colors">Batal</button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ── 1. Filter Periode + KPI Bar ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Period Filter Card */}
        <GlassCard className="lg:col-span-1 flex flex-col justify-between" hover={false}>
          <div className="flex items-center space-x-2 mb-3">
            <Calendar className="h-4 w-4 text-teal-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Filter Periode</h4>
          </div>
          <div className="space-y-3">
            <div className="flex items-center space-x-2 bg-slate-950/40 border border-slate-900 rounded-lg px-2 py-1.5">
              <span className="text-[10px] text-slate-500 font-bold uppercase w-10 shrink-0">Dari</span>
              <CustomDateInput value={startDate} max={todayStr}
                onChange={val => onDateChange(val, endDate)}
                className="flex-1" />
            </div>
            <div className="flex items-center space-x-2 bg-slate-950/40 border border-slate-900 rounded-lg px-2 py-1.5">
              <span className="text-[10px] text-slate-500 font-bold uppercase w-10 shrink-0">S/d</span>
              <CustomDateInput value={endDate} max={todayStr}
                onChange={val => onDateChange(startDate, val)}
                className="flex-1" />
            </div>
          </div>
        </GlassCard>

        {/* KPI: Total Hasil Refinery */}
        <GlassCard className="flex flex-col justify-between h-32" hover={false}>
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Output Refinery</span>
            <div className="p-2 rounded-lg bg-teal-500/10"><FlaskConical className="h-5 w-5 text-teal-400" /></div>
          </div>
          <div>
            <p className="text-xl font-black text-white">{formatQty(totalHasilRefinery)} <span className="text-xs font-normal text-slate-400">Kg</span></p>
            <p className="text-[10px] text-slate-500 font-semibold">{prosesRefineries.length} batch dalam periode</p>
          </div>
        </GlassCard>

        {/* KPI: Total Hasil Fraksinasi */}
        <GlassCard className="flex flex-col justify-between h-32" hover={false}>
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Output Fraksinasi</span>
            <div className="p-2 rounded-lg bg-sky-500/10"><Layers className="h-5 w-5 text-sky-400" /></div>
          </div>
          <div>
            <p className="text-xl font-black text-white">{formatQty(totalHasilFraksinasi)} <span className="text-xs font-normal text-slate-400">Kg</span></p>
            <p className="text-[10px] text-slate-500 font-semibold">{prosesFraksinasis.length} batch dalam periode</p>
          </div>
        </GlassCard>

        {/* KPI: Total Hasil Packaging */}
        <GlassCard className="flex flex-col justify-between h-32" hover={false}>
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Output Packaging</span>
            <div className="p-2 rounded-lg bg-purple-500/10"><Package className="h-5 w-5 text-purple-400" /></div>
          </div>
          <div>
            <p className="text-xl font-black text-white">{formatQty(totalHasilPackaging)} <span className="text-xs font-normal text-slate-400">Box</span></p>
            <p className="text-[10px] text-slate-500 font-semibold">{prosesPackagings.length} batch dalam periode</p>
          </div>
        </GlassCard>
      </div>

      {/* ── 2. Tab Navigasi Utama ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-slate-950/80 border border-slate-850 rounded-3xl p-3 shrink-0 gap-3">
        <div className="flex items-center space-x-1 bg-slate-900/50 p-1 rounded-2xl border border-slate-800/40">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const colorMap = {
              teal: 'text-teal-600 dark:text-teal-400 bg-teal-500/10 dark:bg-teal-500/15 border-teal-500/20 dark:border-teal-500/30',
              sky: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 dark:bg-sky-500/15 border-sky-500/20 dark:border-sky-500/30',
              purple: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 dark:bg-purple-500/15 border-purple-500/20 dark:border-purple-500/30'
            };
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center space-x-2 px-5 py-3 rounded-xl text-xs font-bold uppercase transition-all ${active ? `${colorMap[tab.color]} border` : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                <span className={`inline-flex items-center justify-center h-4.5 w-6 rounded-full text-[9px] font-black ${active ? 'bg-white/10 text-slate-200' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>{tab.count}</span>
              </button>
            );
          })}
        </div>

        {/* Excel Importer & Template Download */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={downloadTemplate}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-350 hover:text-white transition-all text-xs font-bold"
          >
            <Download className="h-4 w-4 text-teal-400" />
            <span>Unduh Template ({activeTab.toUpperCase()})</span>
          </button>

          <label className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-350 hover:text-white transition-all text-xs font-bold cursor-pointer">
            <Upload className="h-4 w-4 text-teal-400" />
            <span>Impor Excel ({activeTab.toUpperCase()})</span>
            <input
              type="file"
              onChange={handleImport}
              className="hidden"
              accept=".xlsx,.xls,.csv"
            />
          </label>
        </div>
      </div>

      {/* ── 3. Target Produksi Harian (Mengikuti activeTab) ── */}
      <GlassCard hover={false}>
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between mb-5 pb-4 border-b border-slate-900 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Target className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white uppercase tracking-wider">Target Produksi Harian — {activeTab.toUpperCase()}</h3>
              <p className="text-xs text-slate-400">Atur target dan bandingkan dengan realisasi output {activeTab}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          {/* Form input target */}
          <form onSubmit={handleTargetSubmit} className="rounded-2xl border border-slate-900 bg-slate-950/40 p-4 space-y-4">
            <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">Atur Target {activeTab.toUpperCase()}</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tanggal</label>
                <input type="date" value={targetDate} max={todayStr}
                  onChange={e => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input text-sm font-sans" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Target ({activeUnit})</label>
                <input type="text" value={formatNumberInput(targetQty)}
                  onChange={e => setTargetQty(parseNumberInput(e.target.value))}
                  placeholder="5.000.000" className="w-full px-3 py-2.5 rounded-xl glass-input text-sm" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="px-4 py-2 rounded-lg glass-button-primary text-xs font-bold">
                {existingTarget ? 'Update Target' : 'Simpan Target'}
              </button>
              {existingTarget && (
                <button type="button" onClick={async () => { await onDeleteProductionTarget(existingTarget.id); setTargetQty(''); showToast('Target dihapus', 'success'); }}
                  className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors">
                  Hapus Target
                </button>
              )}
            </div>
          </form>

          {/* Progress overview */}
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-900 bg-slate-950/40 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Target Periode</p>
                <p className="mt-2 text-xl font-black text-white">{totalTargetRange.toLocaleString('id-ID')} <span className="text-xs font-normal">{activeUnit}</span></p>
              </div>
              <div className="rounded-2xl border border-slate-900 bg-slate-950/40 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Realisasi {activeTab.toUpperCase()}</p>
                <p className="mt-2 text-xl font-black text-teal-600 dark:text-teal-400">{totalHasilActive.toLocaleString('id-ID', { maximumFractionDigits: 0 })} <span className="text-xs font-normal text-slate-400">{activeUnit}</span></p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-900 bg-slate-950/40 p-4 space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-400">Pencapaian Produksi {activeTab.toUpperCase()}</span>
                <strong className={pctTarget >= 100 ? 'text-teal-600 dark:text-teal-400' : pctTarget >= 70 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}>{pctTarget}%</strong>
              </div>
              <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${pctTarget >= 100 ? 'bg-gradient-to-r from-teal-500 to-emerald-400' : pctTarget >= 70 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-gradient-to-r from-red-500 to-rose-400'}`}
                  style={{ width: `${Math.min(pctTarget, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500">{totalHasilActive.toLocaleString('id-ID', { maximumFractionDigits: 0 })} {activeUnit} dari target {totalTargetRange.toLocaleString('id-ID')} {activeUnit}</p>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* ── 3b. Chart Target vs Realisasi ── */}
      <GlassCard hover={false}>
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-900">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20">
              <BarChart2 className="h-5 w-5 text-sky-400" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white uppercase tracking-wider">Chart Target vs Realisasi — {activeTab.toUpperCase()}</h3>
              <p className="text-xs text-slate-400">Perbandingan target harian dengan realisasi output produksi dalam rentang periode</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            <span className="flex items-center space-x-1"><span className="inline-block w-3 h-3 rounded-sm bg-rose-500/80"></span><span className="text-slate-400">Target</span></span>
            <span className="flex items-center space-x-1"><span className="inline-block w-3 h-3 rounded-sm bg-teal-500/80"></span><span className="text-slate-400">Realisasi</span></span>
          </div>
        </div>
        {dailyChartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-500 italic text-xs">Tidak ada data dalam periode ini</div>
        ) : (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="label" stroke="#475569" fontSize={11} tickMargin={6} />
                <YAxis stroke="#475569" fontSize={11} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} width={45} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', borderColor: '#334155', borderRadius: '10px', fontSize: '11px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 700 }}
                  formatter={(value, name) => [value.toLocaleString('id-ID'), name]}
                />
                <Bar dataKey="target" name={`Target (${activeUnit})`} fill="#f43f5e" opacity={0.75} radius={[3,3,0,0]} />
                <Bar dataKey="realisasi" name={`Realisasi (${activeUnit})`} fill="#14b8a6" opacity={0.85} radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </GlassCard>

      {/* ── 4. Table Card (Mengikuti activeTab) ── */}
      <GlassCard hover={false}>
        {/* Table Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-900">
          <div>
            <h3 className="text-base font-extrabold text-white uppercase tracking-wider">Log Riwayat Produksi — {activeTab.toUpperCase()}</h3>
            <p className="text-xs text-slate-400">Daftar batch log proses produksi {activeTab} untuk periode terpilih</p>
          </div>

          <button
            onClick={() => openAddModal(activeTab)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-lg glass-button-primary text-xs font-bold"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Tambah Proses {tabs.find(t => t.id === activeTab)?.label}</span>
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Bahan</th>
                <th className="py-3 px-4">
                  <div className="flex items-center space-x-1"><ArrowRight className="h-3 w-3" /><span>Hasil</span></div>
                </th>
                <th className="py-3 px-4">Catatan</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedData.map(proses => {
                const bahan = getItems(proses, activeTab, 'bahan');
                const hasil = getItems(proses, activeTab, 'hasil');
                return (
                  <tr key={proses.id} className="hover:bg-slate-900/40 transition-colors align-top">
                    <td className="py-4 px-4 text-slate-400 font-semibold whitespace-nowrap">{formatDateIndo(proses.tgl)}</td>
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        {bahan.length === 0 && <span className="text-slate-600 italic">-</span>}
                        {bahan.map((b, i) => (
                          <div key={i} className="flex items-center space-x-2 text-xs">
                            <span className="text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded text-[10px] border border-slate-800">{b.produk?.kode_produk ?? '-'}</span>
                            <span className="text-white font-bold">{formatQty(b.qty)}</span>
                            <span className="text-slate-500">{b.produk?.satuan ?? 'Kg'}</span>
                            <span className="text-slate-500 font-semibold text-[10px]">({b.storage?.nama ?? '-'})</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        {hasil.length === 0 && <span className="text-slate-600 italic">-</span>}
                        {hasil.map((h, i) => (
                          <div key={i} className="flex items-center space-x-2 text-xs">
                            <span className="text-teal-400 font-mono bg-teal-900/20 px-2 py-0.5 rounded text-[10px] border border-teal-800/30">{h.produk?.kode_produk ?? '-'}</span>
                            <span className="text-white font-bold">{formatQty(h.qty)}</span>
                            <span className="text-slate-500">{h.produk?.satuan ?? 'Kg'}</span>
                            <span className="text-slate-500 font-semibold text-[10px]">({h.storage?.nama ?? '-'})</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-400 max-w-xs truncate">{proses.catatan || '-'}</td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button onClick={() => openEditModal(activeTab, proses)} className="p-1 rounded bg-slate-900 text-slate-400 hover:text-teal-400 border border-slate-800 transition-colors"><Edit className="h-3.5 w-3.5" /></button>
                        <button onClick={() => triggerDelete(activeTab, proses.id)} className="p-1 rounded bg-slate-900 text-slate-400 hover:text-red-400 border border-slate-800 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginatedData.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-slate-500 italic">
                    Belum ada data proses {tabs.find(t => t.id === activeTab)?.label} pada periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {currentData.length > PER_PAGE && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-900/60 text-xs">
            <span className="text-slate-500 font-bold uppercase tracking-wider">
              {Math.min(currentData.length, (currentPage - 1) * PER_PAGE + 1)}–{Math.min(currentData.length, currentPage * PER_PAGE)} dari {currentData.length} data
            </span>
            <div className="flex items-center space-x-2">
              <button onClick={() => setTabPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-white font-bold px-2">Hal {currentPage} / {totalPages}</span>
              <button onClick={() => setTabPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* ── MODAL: Add / Edit Process ── */}
      {activeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <GlassCard className="w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden" hover={false}>
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 mb-5 border-b border-slate-800 shrink-0">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  {isAddModal ? 'Catat Proses ' : 'Edit Proses '}
                  {tabs.find(t => t.id === activeTab)?.label}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Isi bahan yang dipakai dan produk yang dihasilkan</p>
              </div>
              <button onClick={closeModal} className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
            </div>

            {/* Modal Body (scrollable) */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-5 pr-1">
              {/* Basic fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tanggal</label>
                  <input type="date" required max={todayStr} value={processForm.tgl}
                    onChange={e => setProcessForm(p => ({ ...p, tgl: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl glass-input text-sm font-sans" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Catatan</label>
                  <input type="text" placeholder="Opsional..." value={processForm.catatan}
                    onChange={e => setProcessForm(p => ({ ...p, catatan: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl glass-input text-sm" />
                </div>
              </div>

              {/* Bahan Lines */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                    <ArrowLeft className="h-3.5 w-3.5 text-amber-400" /><span>Bahan yang Dipakai</span>
                  </h4>
                  <button type="button" onClick={() => setBahanLines(prev => [...prev, { produk_id: '', qty: '', storage_id: '' }])}
                    className="flex items-center space-x-1 text-[10px] font-bold text-teal-400 hover:text-teal-300 transition-colors">
                    <Plus className="h-3 w-3" /><span>Tambah Bahan</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {bahanLines.map((line, i) => (
                    <div key={i} className="flex flex-col md:flex-row md:items-center gap-2 bg-slate-950/40 border border-slate-900 rounded-xl p-3">
                      <select required={i === 0} value={line.produk_id}
                        onChange={e => setBahanLines(prev => prev.map((l, li) => li === i ? { ...l, produk_id: e.target.value } : l))}
                        className="flex-1 px-3 py-2 rounded-lg glass-input text-xs bg-slate-900 text-white">
                        <option value="">Pilih Produk/Material</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.nama_produk} ({p.kode_produk})</option>)}
                      </select>
                      <select value={line.storage_id || ''}
                        onChange={e => setBahanLines(prev => prev.map((l, li) => li === i ? { ...l, storage_id: e.target.value } : l))}
                        className="w-44 px-3 py-2 rounded-lg glass-input text-xs bg-slate-900 text-white">
                        <option value="">Otomatis (Alokasi Otomatis)</option>
                        {storages.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                      </select>
                      <div className="flex items-center space-x-2">
                        <input type="text" placeholder="Qty" value={formatNumberInput(line.qty)}
                          onChange={e => setBahanLines(prev => prev.map((l, li) => li === i ? { ...l, qty: parseNumberInput(e.target.value) } : l))}
                          className="w-24 px-3 py-2 rounded-lg glass-input text-xs" />
                        <span className="text-[10px] text-slate-500 w-8 shrink-0">{products.find(p => String(p.id) === String(line.produk_id))?.satuan ?? 'Kg'}</span>
                      </div>
                      {bahanLines.length > 1 && (
                        <button type="button" onClick={() => setBahanLines(prev => prev.filter((_, li) => li !== i))} className="text-slate-500 hover:text-red-400 self-end md:self-auto"><X className="h-4 w-4" /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Hasil Lines */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                    <ArrowRight className="h-3.5 w-3.5 text-teal-400" /><span>Hasil Produksi</span>
                  </h4>
                  <button type="button" onClick={() => setHasilLines(prev => [...prev, { produk_id: '', qty: '', storage_id: '' }])}
                    className="flex items-center space-x-1 text-[10px] font-bold text-teal-400 hover:text-teal-300 transition-colors">
                    <Plus className="h-3 w-3" /><span>Tambah Hasil</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {hasilLines.map((line, i) => (
                    <div key={i} className="flex flex-col md:flex-row md:items-center gap-2 bg-teal-950/20 border border-teal-900/30 rounded-xl p-3">
                      <select required={i === 0} value={line.produk_id}
                        onChange={e => setHasilLines(prev => prev.map((l, li) => li === i ? { ...l, produk_id: e.target.value } : l))}
                        className="flex-1 px-3 py-2 rounded-lg glass-input text-xs bg-slate-900 text-white">
                        <option value="">Pilih Produk</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.nama_produk} ({p.kode_produk})</option>)}
                      </select>
                      <select value={line.storage_id || ''}
                        onChange={e => setHasilLines(prev => prev.map((l, li) => li === i ? { ...l, storage_id: e.target.value } : l))}
                        className="w-44 px-3 py-2 rounded-lg glass-input text-xs bg-slate-900 text-white">
                        <option value="">Otomatis (Alokasi Otomatis)</option>
                        {storages.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                      </select>
                      <div className="flex items-center space-x-2">
                        <input type="text" placeholder="Qty" value={formatNumberInput(line.qty)}
                          onChange={e => setHasilLines(prev => prev.map((l, li) => li === i ? { ...l, qty: parseNumberInput(e.target.value) } : l))}
                          className="w-24 px-3 py-2 rounded-lg glass-input text-xs" />
                        <span className="text-[10px] text-slate-500 w-8 shrink-0">{products.find(p => String(p.id) === String(line.produk_id))?.satuan ?? (activeTab === 'packaging' ? 'Box' : 'Kg')}</span>
                      </div>
                      {hasilLines.length > 1 && (
                        <button type="button" onClick={() => setHasilLines(prev => prev.filter((_, li) => li !== i))} className="text-slate-500 hover:text-red-400 self-end md:self-auto"><X className="h-4 w-4" /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <div className="flex space-x-3 pt-2 shrink-0">
                <button type="submit" className="flex-1 py-3 rounded-xl glass-button-primary text-sm font-semibold">
                  {isAddModal ? 'Simpan Proses' : 'Update Proses'}
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
