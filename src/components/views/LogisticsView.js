import React, { useState, useMemo } from 'react';
import { Truck, FileText, Download, Upload, Plus, Edit, Trash2, CheckCircle, AlertTriangle, X, TrendingUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Line } from 'recharts';

function GlassCard({ children, className = '', hover = true }) {
  return (
    <div className={`bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl transition-all duration-300 ${hover ? 'hover:shadow-2xl hover:bg-slate-900/60' : ''} ${className}`}>
      {children}
    </div>
  );
}

function CustomDateInput({ value, onChange, className = '' }) {
  return (
    <input type="date" value={value} onChange={e => onChange(e.target.value)} className={`px-3 py-1.5 rounded-lg glass-input text-xs bg-slate-900/80 text-white ${className}`} />
  );
}

const getThirtyDaysAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
};
const getToday = () => new Date().toISOString().split('T')[0];

const formatDateStr = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd} ${mm} ${yyyy}`;
};

export default function LogisticsView({
  truckings = [],
  peTargets = [],
  peAdditionals = [],
  peUsages = [],
  onAddTrucking,
  onUpdateTrucking,
  onDeleteTrucking,
  onBulkAddTrucking,
  onAddPeTarget,
  onUpdatePeTarget,
  onDeletePeTarget,
  onBulkAddPeTarget,
  onAddPeAdditional,
  onUpdatePeAdditional,
  onDeletePeAdditional,
  onBulkAddPeAdditional,
  onAddPeUsage,
  onUpdatePeUsage,
  onDeletePeUsage,
  onBulkAddPeUsage,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}) {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'trucking' | 'pe_management'
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Forms
  const [truckingForm, setTruckingForm] = useState({ no_do: '', qty: '', unit_tersedia: '', qty_unit: '', transporter: '', destination: '', tgl: '' });
  const [peTargetForm, setPeTargetForm] = useState({ jumlah: '', tgl: '' });
  const [peAddForm, setPeAddForm] = useState({ qty: '', tgl: '', keterangan: '' });
  const [peUseForm, setPeUseForm] = useState({ qty: '', tgl: '', keterangan: '' });

  // Pagination states
  const [targetPage, setTargetPage] = useState(1);
  const [addPage, setAddPage] = useState(1);
  const [usePage, setUsePage] = useState(1);
  const PAGE_SIZE = 5;

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const triggerDelete = (type, item) => {
    setConfirmDialog({
      message: `Hapus data ini secara permanen?`,
      onConfirm: async () => {
        try {
          if (type === 'trucking') await onDeleteTrucking(item.id);
          else if (type === 'pe_target') await onDeletePeTarget(item.id);
          else if (type === 'pe_additional') await onDeletePeAdditional(item.id);
          else if (type === 'pe_usage') await onDeletePeUsage(item.id);
          showToast('Data berhasil dihapus');
        } catch (e) {
          showToast('Gagal menghapus data', 'error');
        }
        setConfirmDialog(null);
      }
    });
  };

  // ── Handlers ──
  const handleTruckingSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (selectedItem) await onUpdateTrucking(selectedItem.id, truckingForm);
      else await onAddTrucking(truckingForm);
      showToast('Data Trucking berhasil disimpan');
      setActiveModal(null);
    } catch (err) {
      showToast('Gagal menyimpan data Trucking', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePeTargetSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (selectedItem) await onUpdatePeTarget(selectedItem.id, peTargetForm);
      else await onAddPeTarget(peTargetForm);
      showToast('Target PE berhasil disimpan');
      setActiveModal(null);
    } catch (err) {
      showToast('Gagal menyimpan Target PE', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePeAddSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (selectedItem) await onUpdatePeAdditional(selectedItem.id, peAddForm);
      else await onAddPeAdditional(peAddForm);
      showToast('Tambahan PE berhasil disimpan');
      setActiveModal(null);
    } catch (err) {
      showToast('Gagal menyimpan Tambahan PE', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePeUseSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (selectedItem) await onUpdatePeUsage(selectedItem.id, peUseForm);
      else await onAddPeUsage(peUseForm);
      showToast('Pemakaian PE berhasil disimpan');
      setActiveModal(null);
    } catch (err) {
      showToast('Gagal menyimpan Pemakaian PE', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Import Handlers ──
  const downloadTemplate = (type) => {
    let ws;
    let name = '';
    if (type === 'trucking') {
      ws = XLSX.utils.aoa_to_sheet([
        ['no_do', 'transporter', 'destination', 'qty_unit', 'qty', 'tgl'],
        ['DO-2026-001', 'PT Logistik Maju', 'Pelabuhan Tanjung Priok', 3, 250000, getToday()],
      ]);
      name = 'template_trucking';
    } else if (type === 'pe_target') {
      ws = XLSX.utils.aoa_to_sheet([['jumlah', 'tgl'], [5000000, getToday()]]);
      name = 'template_pe_target';
    } else if (type === 'pe_add') {
      ws = XLSX.utils.aoa_to_sheet([
        ['qty', 'tgl', 'keterangan'],
        [50000, getToday(), 'Penambahan kuota awal bulan'],
      ]);
      name = 'template_pe_tambahan';
    } else if (type === 'pe_use') {
      ws = XLSX.utils.aoa_to_sheet([
        ['qty', 'tgl', 'keterangan'],
        [20000, getToday(), 'Untuk ekspor kapal MV Kapuas'],
      ]);
      name = 'template_pe_pemakaian';
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `${name}.xlsx`);
    showToast(`Template ${name} diunduh`);
  };

  const handleImport = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        if (!rows.length) { showToast('File kosong', 'error'); return; }
        const payloads = [];
        
        for (const row of rows) {
          let tglVal = row.tgl;
          if (typeof tglVal === 'number') tglVal = new Date((tglVal - 25569) * 86400000).toISOString().split('T')[0];
          else tglVal = String(tglVal || '').trim();

          if (type === 'trucking') {
            payloads.push({
              no_do: row.no_do || '',
              qty: parseFloat(row.qty || 0),
              qty_unit: parseInt(row.qty_unit || 0),
              unit_tersedia: parseInt(row.qty_unit || 0),
              transporter: row.transporter || '',
              destination: row.destination || '',
              tgl: tglVal
            });
          } else if (type === 'pe_target') {
            payloads.push({ jumlah: parseFloat(row.jumlah || 0), tgl: tglVal });
          } else if (type === 'pe_add' || type === 'pe_use') {
            payloads.push({ qty: parseFloat(row.qty || 0), tgl: tglVal, keterangan: row.keterangan || '' });
          }
        }
        
        if (type === 'trucking') await onBulkAddTrucking(payloads);
        else if (type === 'pe_target') await onBulkAddPeTarget(payloads);
        else if (type === 'pe_add') await onBulkAddPeAdditional(payloads);
        else if (type === 'pe_use') await onBulkAddPeUsage(payloads);

        showToast(`Import berhasil (${payloads.length} baris)`);
      } catch (err) {
        showToast(err.message || 'Gagal import Excel', 'error');
      }
      e.target.value = null;
    };
    reader.readAsBinaryString(file);
  };

  // ── Chart PE ──
  const chartData = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateMap = {};

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dateMap[dateStr] = { date: dateStr, target: 0, add: 0, use: 0, total_available: 0 };
    }

    peTargets.forEach(t => { const dt = t.tgl ? t.tgl.split('T')[0] : null; if (dt && dateMap[dt]) dateMap[dt].target += parseFloat(t.jumlah || 0); });
    peAdditionals.forEach(t => { const dt = t.tgl ? t.tgl.split('T')[0] : null; if (dt && dateMap[dt]) dateMap[dt].add += parseFloat(t.qty || 0); });
    peUsages.forEach(t => { const dt = t.tgl ? t.tgl.split('T')[0] : null; if (dt && dateMap[dt]) dateMap[dt].use += parseFloat(t.qty || 0); });

    let cumulativePE = 0;
    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date)).map(d => {
      cumulativePE += (d.add - d.use);
      d.total_available = cumulativePE;
      return d;
    });
  }, [startDate, endDate, peTargets, peAdditionals, peUsages]);

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

      {/* Tabs list navigation and Filter */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-slate-800 pb-2 gap-4">
        <div className="flex space-x-2">
          <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'dashboard' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}>Dashboard Logistik</button>
          <button onClick={() => setActiveTab('trucking')} className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'trucking' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}>Data Trucking</button>
          <button onClick={() => setActiveTab('pe_management')} className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'pe_management' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}>Persetujuan Ekspor (PE)</button>
        </div>
        
        <div className="flex items-center space-x-2 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
          <span className="text-xs text-slate-400 font-bold">Filter Periode:</span>
          <CustomDateInput value={startDate} onChange={onStartDateChange} />
          <span className="text-slate-500 text-xs">-</span>
          <CustomDateInput value={endDate} onChange={onEndDateChange} />
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassCard className="p-5 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center justify-between mb-4 z-10">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saldo PE Tersedia</h3>
                <div className="p-2 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400"><TrendingUp className="h-4 w-4" /></div>
              </div>
              <div className="z-10">
                <div className="text-2xl font-black text-white">
                  {(chartData.length > 0 ? chartData[chartData.length - 1].total_available : 0).toLocaleString('id-ID')} <span className="text-sm text-slate-400 font-bold">Kg</span>
                </div>
                <div className="text-[10px] font-semibold text-slate-500 mt-1 uppercase tracking-wider">Akumulasi sisa kuota Persetujuan Ekspor</div>
              </div>
            </GlassCard>
          </div>

          <GlassCard className="p-6" hover={false}>
            <div className="flex items-center space-x-3 mb-4 pb-4 border-b border-slate-800">
              <TrendingUp className="h-5 w-5 text-teal-400" />
              <h4 className="text-sm font-bold text-white">Grafik Ketersediaan vs Pemakaian PE</h4>
            </div>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickFormatter={v => v.slice(5)} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', fontSize: '11px' }}
                    itemStyle={{ color: '#f8fafc' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                    formatter={(value, name) => [`${value.toLocaleString('id-ID')} Kg`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="target" stackId="a" name="Target Bulanan" fill="#3b82f6" radius={[0,0,0,0]} />
                  <Bar dataKey="add" stackId="a" name="Tambahan PE" fill="#10b981" radius={[4,4,0,0]} />
                  <Line type="monotone" dataKey="use" name="Pemakaian" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="total_available" name="Saldo PE (Akumulasi)" stroke="#f59e0b" strokeWidth={3} strokeDasharray="5 5" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </div>
      )}

      {activeTab === 'trucking' && (
        <div className="space-y-4 pt-4">
          <div className="flex justify-between items-center bg-slate-900/60 px-4 py-3 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 font-bold">Manajemen Data Trucking</span>
            <div className="flex gap-2">
              <button onClick={() => downloadTemplate('trucking')} className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold hover:text-white"><Download className="h-3.5 w-3.5"/><span>Template</span></button>
              <label className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold hover:text-white cursor-pointer"><Upload className="h-3.5 w-3.5"/><span>Import</span>
                <input type="file" accept=".xlsx,.xls,.csv" onChange={e => handleImport(e, 'trucking')} className="hidden" />
              </label>
              <button onClick={() => { setSelectedItem(null); setTruckingForm({ no_do: '', qty: '', unit_tersedia: '', qty_unit: '', transporter: '', destination: '', tgl: getToday() }); setActiveModal('add_trucking'); }} className="flex items-center space-x-1 px-4 py-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-bold hover:bg-sky-500/30"><Plus className="h-3.5 w-3.5"/><span>Catat Trucking</span></button>
            </div>
          </div>
          <GlassCard className="overflow-x-auto" hover={false}>
            {/* Summary per transporter per day */}
            {(() => {
              const dateGroups = {};
              truckings.forEach(t => {
                const tgl = t.tgl ? t.tgl.split('T')[0] : 'N/A';
                if (!dateGroups[tgl]) dateGroups[tgl] = {};
                const key = t.transporter || 'Unknown';
                if (!dateGroups[tgl][key]) dateGroups[tgl][key] = { qty_unit: 0, qty: 0, destinations: new Set() };
                dateGroups[tgl][key].qty_unit += parseInt(t.qty_unit || t.unit_tersedia || 0);
                dateGroups[tgl][key].qty += parseFloat(t.qty || 0);
                if (t.destination) dateGroups[tgl][key].destinations.add(t.destination);
              });
              const sortedDates = Object.keys(dateGroups).sort().reverse();
              return sortedDates.map(tgl => {
                const transporters = dateGroups[tgl];
                const grandQtyUnit = Object.values(transporters).reduce((s, v) => s + v.qty_unit, 0);
                const grandQty = Object.values(transporters).reduce((s, v) => s + v.qty, 0);
                return (
                  <div key={tgl} className="mb-4">
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-950/60 border-b border-slate-800">
                      <span className="text-[10px] font-black text-sky-400 uppercase tracking-wider">{formatDateStr(tgl)}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] text-slate-500">Grand Total:</span>
                        <span className="text-[10px] font-bold text-white">{grandQtyUnit} Unit</span>
                        <span className="text-[10px] font-bold text-emerald-400">{grandQty.toLocaleString('id-ID')} Kg</span>
                      </div>
                    </div>
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-600 text-[9px] uppercase font-bold">
                          <th className="py-1.5 px-4">Transporter</th>
                          <th className="py-1.5 px-4">Tujuan / Destination</th>
                          <th className="py-1.5 px-4 text-right">Qty Unit</th>
                          <th className="py-1.5 px-4 text-right">Qty Produk (Kg)</th>
                          <th className="py-1.5 px-4 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {truckings.filter(t => (t.tgl ? t.tgl.split('T')[0] : 'N/A') === tgl).map(t => (
                          <tr key={t.id} className="hover:bg-slate-900/40">
                            <td className="py-2.5 px-4 text-slate-300 font-semibold">{t.transporter || '-'}</td>
                            <td className="py-2.5 px-4 text-slate-400">{t.destination || '-'}</td>
                            <td className="py-2.5 px-4 text-right text-sky-400 font-bold">{t.qty_unit ?? t.unit_tersedia ?? 0}</td>
                            <td className="py-2.5 px-4 text-right text-emerald-400 font-black">{parseFloat(t.qty).toLocaleString('id-ID')}</td>
                            <td className="py-2.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => { setSelectedItem(t); setTruckingForm({ no_do: t.no_do || '', qty: t.qty, unit_tersedia: t.unit_tersedia || 0, qty_unit: t.qty_unit || 0, transporter: t.transporter || '', destination: t.destination || '', tgl: t.tgl?.split('T')[0] || getToday() }); setActiveModal('edit_trucking'); }} className="p-1 text-slate-400 hover:text-sky-400"><Edit className="h-3.5 w-3.5"/></button>
                                <button onClick={() => triggerDelete('trucking', t)} className="p-1 text-slate-400 hover:text-red-400"><Trash2 className="h-3.5 w-3.5"/></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {/* Subtotal row per transporter-date */}
                        {Object.entries(transporters).map(([name, vals]) => (
                          <tr key={`sub-${tgl}-${name}`} className="bg-slate-900/40 border-t border-slate-800">
                            <td className="py-1.5 px-4 text-sky-400 font-black text-[9px] uppercase">Subtotal: {name}</td>
                            <td className="py-1.5 px-4 text-slate-500 text-[9px]">{Array.from(vals.destinations).join(', ') || '-'}</td>
                            <td className="py-1.5 px-4 text-right text-sky-400 font-black text-[9px]">{vals.qty_unit} Unit</td>
                            <td className="py-1.5 px-4 text-right text-emerald-400 font-black text-[9px]">{vals.qty.toLocaleString('id-ID')} Kg</td>
                            <td></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              });
            })()}
            {truckings.length === 0 && (
              <div className="py-8 text-center text-slate-500 italic text-xs">Belum ada data trucking</div>
            )}
          </GlassCard>
        </div>
      )}

      {activeTab === 'pe_management' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {/* Target PE */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <span className="text-xs text-blue-400 font-bold">Target PE Harian</span>
              <div className="flex gap-2">
                <button onClick={() => downloadTemplate('pe_target')} className="text-slate-400 hover:text-white" title="Download Template"><Download className="h-4 w-4"/></button>
                <label className="cursor-pointer text-slate-400 hover:text-white" title="Import Excel"><Upload className="h-4 w-4"/><input type="file" onChange={e => handleImport(e, 'pe_target')} className="hidden" /></label>
                <button onClick={() => { setSelectedItem(null); setPeTargetForm({ jumlah: '', tgl: getToday() }); setActiveModal('add_pe_target'); }} className="text-blue-400 hover:text-white"><Plus className="h-4 w-4"/></button>
              </div>
            </div>
            <GlassCard>
              <table className="w-full text-left text-[10px]">
                <thead className="bg-slate-900 border-b border-slate-800 text-slate-500 uppercase">
                  <tr><th className="p-2">Tgl</th><th className="p-2 text-right">Jumlah</th><th className="p-2 text-center">Aksi</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {peTargets.slice((targetPage - 1) * PAGE_SIZE, targetPage * PAGE_SIZE).map(p => (
                    <tr key={p.id} className="hover:bg-slate-900/50">
                      <td className="p-2 text-slate-300">{formatDateStr(p.tgl)}</td>
                      <td className="p-2 text-right text-blue-400 font-bold">{parseFloat(p.jumlah).toLocaleString('id-ID')}</td>
                      <td className="p-2 text-center"><button onClick={() => triggerDelete('pe_target', p)} className="text-slate-500 hover:text-red-400"><Trash2 className="h-3 w-3"/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-between items-center mt-2 px-2 pb-2">
                <button disabled={targetPage === 1} onClick={() => setTargetPage(prev => prev - 1)} className="text-xs text-slate-400 hover:text-white disabled:opacity-50">Prev</button>
                <span className="text-[10px] text-slate-500">{targetPage} / {Math.ceil(peTargets.length / PAGE_SIZE) || 1}</span>
                <button disabled={targetPage >= Math.ceil(peTargets.length / PAGE_SIZE)} onClick={() => setTargetPage(prev => prev + 1)} className="text-xs text-slate-400 hover:text-white disabled:opacity-50">Next</button>
              </div>
            </GlassCard>
          </div>

          {/* Tambahan PE */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <span className="text-xs text-emerald-400 font-bold">Tambahan PE</span>
              <div className="flex gap-2">
                <button onClick={() => downloadTemplate('pe_add')} className="text-slate-400 hover:text-white" title="Download Template"><Download className="h-4 w-4"/></button>
                <label className="cursor-pointer text-slate-400 hover:text-white" title="Import Excel"><Upload className="h-4 w-4"/><input type="file" onChange={e => handleImport(e, 'pe_add')} className="hidden" /></label>
                <button onClick={() => { setSelectedItem(null); setPeAddForm({ qty: '', tgl: getToday() }); setActiveModal('add_pe_add'); }} className="text-emerald-400 hover:text-white"><Plus className="h-4 w-4"/></button>
              </div>
            </div>
            <GlassCard>
              <table className="w-full text-left text-[10px]">
                <thead className="bg-slate-900 border-b border-slate-800 text-slate-500 uppercase">
                  <tr><th className="p-2">Tgl</th><th className="p-2">Keterangan</th><th className="p-2 text-right">Qty</th><th className="p-2 text-center">Aksi</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {peAdditionals.slice((addPage - 1) * PAGE_SIZE, addPage * PAGE_SIZE).map(p => (
                    <tr key={p.id} className="hover:bg-slate-900/50">
                      <td className="p-2 text-slate-300">{formatDateStr(p.tgl)}</td>
                      <td className="p-2 text-slate-400 truncate max-w-[80px]" title={p.keterangan}>{p.keterangan || '-'}</td>
                      <td className="p-2 text-right text-emerald-400 font-bold">{parseFloat(p.qty).toLocaleString('id-ID')}</td>
                      <td className="p-2 text-center"><button onClick={() => triggerDelete('pe_additional', p)} className="text-slate-500 hover:text-red-400"><Trash2 className="h-3 w-3"/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-between items-center mt-2 px-2 pb-2">
                <button disabled={addPage === 1} onClick={() => setAddPage(prev => prev - 1)} className="text-xs text-slate-400 hover:text-white disabled:opacity-50">Prev</button>
                <span className="text-[10px] text-slate-500">{addPage} / {Math.ceil(peAdditionals.length / PAGE_SIZE) || 1}</span>
                <button disabled={addPage >= Math.ceil(peAdditionals.length / PAGE_SIZE)} onClick={() => setAddPage(prev => prev + 1)} className="text-xs text-slate-400 hover:text-white disabled:opacity-50">Next</button>
              </div>
            </GlassCard>
          </div>

          {/* Pemakaian PE */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <span className="text-xs text-rose-400 font-bold">Pemakaian PE</span>
              <div className="flex gap-2">
                <button onClick={() => downloadTemplate('pe_use')} className="text-slate-400 hover:text-white" title="Download Template"><Download className="h-4 w-4"/></button>
                <label className="cursor-pointer text-slate-400 hover:text-white" title="Import Excel"><Upload className="h-4 w-4"/><input type="file" onChange={e => handleImport(e, 'pe_use')} className="hidden" /></label>
                <button onClick={() => { setSelectedItem(null); setPeUseForm({ qty: '', tgl: getToday() }); setActiveModal('add_pe_use'); }} className="text-rose-400 hover:text-white"><Plus className="h-4 w-4"/></button>
              </div>
            </div>
            <GlassCard>
              <table className="w-full text-left text-[10px]">
                <thead className="bg-slate-900 border-b border-slate-800 text-slate-500 uppercase">
                  <tr><th className="p-2">Tgl</th><th className="p-2">Keterangan</th><th className="p-2 text-right">Qty</th><th className="p-2 text-center">Aksi</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {peUsages.slice((usePage - 1) * PAGE_SIZE, usePage * PAGE_SIZE).map(p => (
                    <tr key={p.id} className="hover:bg-slate-900/50">
                      <td className="p-2 text-slate-300">{formatDateStr(p.tgl)}</td>
                      <td className="p-2 text-slate-400 truncate max-w-[80px]" title={p.keterangan}>{p.keterangan || '-'}</td>
                      <td className="p-2 text-right text-rose-400 font-bold">{parseFloat(p.qty).toLocaleString('id-ID')}</td>
                      <td className="p-2 text-center"><button onClick={() => triggerDelete('pe_usage', p)} className="text-slate-500 hover:text-red-400"><Trash2 className="h-3 w-3"/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-between items-center mt-2 px-2 pb-2">
                <button disabled={usePage === 1} onClick={() => setUsePage(prev => prev - 1)} className="text-xs text-slate-400 hover:text-white disabled:opacity-50">Prev</button>
                <span className="text-[10px] text-slate-500">{usePage} / {Math.ceil(peUsages.length / PAGE_SIZE) || 1}</span>
                <button disabled={usePage >= Math.ceil(peUsages.length / PAGE_SIZE)} onClick={() => setUsePage(prev => prev + 1)} className="text-xs text-slate-400 hover:text-white disabled:opacity-50">Next</button>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* Trucking */}
      {(activeModal === 'add_trucking' || activeModal === 'edit_trucking') && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[9990]">
          <GlassCard className="w-full max-w-md p-6 border-sky-500/20" hover={false}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">{selectedItem ? 'Edit Trucking' : 'Catat Trucking'}</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleTruckingSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">No DO</label><input type="text" value={truckingForm.no_do} onChange={e => setTruckingForm(prev => ({ ...prev, no_do: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" /></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tanggal</label><input type="date" required value={truckingForm.tgl} onChange={e => setTruckingForm(prev => ({ ...prev, tgl: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" /></div>
              </div>
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nama Transporter</label><input type="text" value={truckingForm.transporter} onChange={e => setTruckingForm(prev => ({ ...prev, transporter: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" placeholder="Contoh: PT Logistik Maju" /></div>
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tujuan / Destination</label><input type="text" value={truckingForm.destination} onChange={e => setTruckingForm(prev => ({ ...prev, destination: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" placeholder="Contoh: Pelabuhan Tanjung Priok" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Qty Unit (Kendaraan)</label><input type="number" value={truckingForm.qty_unit} onChange={e => setTruckingForm(prev => ({ ...prev, qty_unit: e.target.value, unit_tersedia: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" placeholder="Jumlah truk" /></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Qty Produk (Kg)</label><input type="number" required value={truckingForm.qty} onChange={e => setTruckingForm(prev => ({ ...prev, qty: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" placeholder="Berat dalam Kg" /></div>
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="submit" disabled={isLoading} className="flex-1 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors disabled:opacity-50">Simpan</button>
                <button type="button" onClick={() => setActiveModal(null)} disabled={isLoading} className="flex-1 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-semibold hover:text-white transition-colors disabled:opacity-50">Batal</button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* Target PE */}
      {activeModal === 'add_pe_target' && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[9990]">
          <GlassCard className="w-full max-w-sm p-6 border-blue-500/20" hover={false}>
            <div className="flex justify-between items-center mb-6"><h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Set Target PE</h3><button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button></div>
            <form onSubmit={handlePeTargetSubmit} className="space-y-4">
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Jumlah (Kg)</label><input type="number" required value={peTargetForm.jumlah} onChange={e => setPeTargetForm(prev => ({ ...prev, jumlah: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" /></div>
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tgl</label><input type="date" required value={peTargetForm.tgl} onChange={e => setPeTargetForm(prev => ({ ...prev, tgl: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" /></div>
              <div className="flex space-x-3 pt-4"><button type="submit" className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-xs font-bold">Simpan</button><button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-semibold">Batal</button></div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* Tambahan PE */}
      {activeModal === 'add_pe_add' && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[9990]">
          <GlassCard className="w-full max-w-sm p-6 border-emerald-500/20" hover={false}>
            <div className="flex justify-between items-center mb-6"><h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Catat Tambahan PE</h3><button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button></div>
            <form onSubmit={handlePeAddSubmit} className="space-y-4">
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Qty (Kg)</label><input type="number" required value={peAddForm.qty} onChange={e => setPeAddForm(prev => ({ ...prev, qty: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" /></div>
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Keterangan</label><input type="text" value={peAddForm.keterangan} onChange={e => setPeAddForm(prev => ({ ...prev, keterangan: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" placeholder="Opsional..." /></div>
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tgl</label><input type="date" required value={peAddForm.tgl} onChange={e => setPeAddForm(prev => ({ ...prev, tgl: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" /></div>
              <div className="flex space-x-3 pt-4"><button type="submit" className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-xs font-bold">Simpan</button><button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-semibold">Batal</button></div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* Pemakaian PE */}
      {activeModal === 'add_pe_use' && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[9990]">
          <GlassCard className="w-full max-w-sm p-6 border-rose-500/20" hover={false}>
            <div className="flex justify-between items-center mb-6"><h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Catat Pemakaian PE</h3><button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button></div>
            <form onSubmit={handlePeUseSubmit} className="space-y-4">
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Qty (Kg)</label><input type="number" required value={peUseForm.qty} onChange={e => setPeUseForm(prev => ({ ...prev, qty: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" /></div>
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Keterangan</label><input type="text" value={peUseForm.keterangan} onChange={e => setPeUseForm(prev => ({ ...prev, keterangan: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" placeholder="Opsional..." /></div>
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tgl</label><input type="date" required value={peUseForm.tgl} onChange={e => setPeUseForm(prev => ({ ...prev, tgl: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" /></div>
              <div className="flex space-x-3 pt-4"><button type="submit" className="flex-1 py-3 rounded-xl bg-rose-600 text-white text-xs font-bold">Simpan</button><button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-semibold">Batal</button></div>
            </form>
          </GlassCard>
        </div>
      )}

    </div>
  );
}
