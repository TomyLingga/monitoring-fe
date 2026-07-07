import React, { useState, useMemo } from 'react';
import { DollarSign, Building, Wallet, CreditCard, Plus, Edit, Trash2, CheckCircle, AlertTriangle, X, TrendingUp, Filter, Eye, Info } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, BarChart, Bar } from 'recharts';

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

const formatDateStr = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd} ${mm} ${yyyy}`;
};

const formatCurrency = (val) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
};

const getToday = () => new Date().toISOString().split('T')[0];

export default function FinanceView({
  bankAccounts = [],
  balances = [],
  balanceChartData = [],
  bankTransactions = [],
  payments = [],
  kursData = { uka: [], jisdor: [] },
  suppliers = [],
  onAddPayment,
  onUpdatePayment,
  onDeletePayment,
  onAddBankTransaction,
  onUpdateBankTransaction,
  onDeleteBankTransaction,
  onAddPaymentHistory,
  onDeletePaymentHistory,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [kursFilter, setKursFilter] = useState('daily');
  const [saldoFilter, setSaldoFilter] = useState('daily');

  // Specific Filters
  const [selectedBankId, setSelectedBankId] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState(''); // '', 'proses', 'selesai'

  // Pagination states
  const PAGE_SIZE = 10;
  const [txnPage, setTxnPage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);

  // Forms
  const [txnForm, setTxnForm] = useState({ bank_account_id: '', type: 'in', amount: '', transaction_date: getToday(), description: '' });
  const [paymentForm, setPaymentForm] = useState({ supplier_id: '', amount: '', fr_number: '', job_object: '', status: 'proses' });
  const [historyForm, setHistoryForm] = useState({ payment_id: '', bank_account_id: '', amount: '', payment_date: getToday() });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const triggerDelete = (type, item) => {
    setConfirmDialog({
      message: `Hapus data ini secara permanen?`,
      onConfirm: async () => {
        try {
          if (type === 'payment') await onDeletePayment(item.id);
          else if (type === 'txn') await onDeleteBankTransaction(item.id);
          else if (type === 'history') await onDeletePaymentHistory(item.id);
          showToast('Data berhasil dihapus');
        } catch (e) {
          showToast('Gagal menghapus data', 'error');
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleTxnSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (selectedItem) await onUpdateBankTransaction(selectedItem.id, txnForm);
      else await onAddBankTransaction(txnForm);
      showToast('Transaksi berhasil disimpan');
      setActiveModal(null);
    } catch (err) {
      showToast('Gagal menyimpan transaksi', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (selectedItem) await onUpdatePayment(selectedItem.id, paymentForm);
      else await onAddPayment(paymentForm);
      showToast('Payment berhasil disimpan');
      setActiveModal(null);
    } catch (err) {
      showToast('Gagal menyimpan Payment', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleHistorySubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onAddPaymentHistory(historyForm);
      showToast('Pembayaran berhasil dicatat');
      setActiveModal(null);
    } catch (err) {
      showToast('Gagal mencatat pembayaran', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Processed Data ---

  // Kurs Data processing for Chart
  const processedKurs = useMemo(() => {
    const { uka = [], jisdor = [] } = kursData || {};
    if (!uka.length && !jisdor.length) return { data: [], latestJisdor: 0, latestJual: 0, latestBeli: 0 };
    
    const dateMap = {};
    
    uka.forEach(d => {
        const tgl = d.tanggal.split('T')[0];
        if (!dateMap[tgl]) dateMap[tgl] = { tanggal: tgl, jual: null, beli: null, jisdor: null };
        dateMap[tgl].jual = d.jual;
        dateMap[tgl].beli = d.beli;
    });

    jisdor.forEach(d => {
        const tgl = d.tanggal.split('T')[0];
        if (!dateMap[tgl]) dateMap[tgl] = { tanggal: tgl, jual: null, beli: null, jisdor: null };
        dateMap[tgl].jisdor = d.nilai;
    });
    
    let merged = Object.values(dateMap).sort((a, b) => a.tanggal.localeCompare(b.tanggal));

    if (kursFilter === 'weekly' || kursFilter === 'monthly') {
      const grouped = {};
      merged.forEach(d => {
        const date = new Date(d.tanggal);
        let key = '';
        if (kursFilter === 'weekly') {
          const start = new Date(date.getFullYear(), 0, 1).getTime();
          const week = Math.ceil((((date.getTime() - start) / 86400000) + 1) / 7);
          key = `${date.getFullYear()}-W${week.toString().padStart(2, '0')}`;
        } else {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        if (!grouped[key]) grouped[key] = { items: 0, jual: 0, beli: 0, jisdor: 0, tgl: key };
        grouped[key].items++;
        grouped[key].jual += d.jual || 0;
        grouped[key].beli += d.beli || 0;
        grouped[key].jisdor += d.jisdor || 0;
      });
      merged = Object.values(grouped).map(g => ({
        tanggal: g.tgl,
        jual: g.jual / g.items,
        beli: g.beli / g.items,
        jisdor: g.jisdor / g.items
      }));
    }

    const latest = merged[merged.length - 1] || {};
    const allJisdor = merged.filter(d => d.jisdor).map(d => d.jisdor);
    const allJual   = merged.filter(d => d.jual).map(d => d.jual);
    const allBeli   = merged.filter(d => d.beli).map(d => d.beli);
    const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    return {
      data: merged,
      latestDate:   latest.tanggal || null,
      latestJisdor: latest.jisdor  || 0,
      latestJual:   latest.jual    || 0,
      latestBeli:   latest.beli    || 0,
      avgJisdor:    avg(allJisdor),
      avgJual:      avg(allJual),
      avgBeli:      avg(allBeli),
    };
  }, [kursData, kursFilter]);

  // Cash Flow / Saldo Akhir Chart Data (5 months with filter)
  const cashFlowData = useMemo(() => {
    // Aggregate all bank accounts' balances per date
    const grouped = {};
    (balanceChartData.length > 0 ? balanceChartData : balances).forEach(b => {
      const dt = (b.tgl || '').split('T')[0];
      if (!dt) return;
      if (!grouped[dt]) grouped[dt] = 0;
      grouped[dt] += parseFloat(b.balance || 0);
    });

    let sorted = Object.keys(grouped).sort().map(k => ({ tgl: k, saldo: grouped[k] }));

    if (saldoFilter === 'weekly') {
      const wGrouped = {};
      sorted.forEach(d => {
        const date = new Date(d.tgl);
        const start = new Date(date.getFullYear(), 0, 1).getTime();
        const week = Math.ceil((((date.getTime() - start) / 86400000) + 1) / 7);
        const key = `${date.getFullYear()}-W${week.toString().padStart(2, '0')}`;
        if (!wGrouped[key]) wGrouped[key] = { tgl: key, saldo: 0, count: 0 };
        wGrouped[key].saldo += d.saldo;
        wGrouped[key].count++;
      });
      sorted = Object.values(wGrouped).map(g => ({ tgl: g.tgl, saldo: g.saldo / g.count }));
    } else if (saldoFilter === 'monthly') {
      const mGrouped = {};
      sorted.forEach(d => {
        const date = new Date(d.tgl);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!mGrouped[key]) mGrouped[key] = { tgl: key, saldo: 0, count: 0 };
        mGrouped[key].saldo += d.saldo;
        mGrouped[key].count++;
      });
      sorted = Object.values(mGrouped).map(g => ({ tgl: g.tgl, saldo: g.saldo / g.count }));
    }

    return sorted.map(d => ({ tanggal: d.tgl, saldo: d.saldo }));
  }, [balanceChartData, balances, saldoFilter]);

  // Outstanding Payment Card
  const outstandingStats = useMemo(() => {
    let totalOutstanding = 0;
    let countOutstanding = 0;
    payments.filter(p => p.status === 'proses').forEach(p => {
      const paid = (p.payment_histories || []).reduce((sum, h) => sum + parseFloat(h.amount), 0);
      const sisa = parseFloat(p.amount) - paid;
      if (sisa > 0) {
        totalOutstanding += sisa;
        countOutstanding++;
      }
    });
    return { total: totalOutstanding, count: countOutstanding };
  }, [payments]);

  // Selected Bank Details (For Saldo Harian tab)
  const selectedBankDetails = useMemo(() => {
    if (!selectedBankId) return null;
    const bank = bankAccounts.find(b => b.id === parseInt(selectedBankId));
    // Find latest balance
    const bankBalances = balances.filter(b => b.bank_account_id === parseInt(selectedBankId)).sort((a, b) => new Date(b.tgl) - new Date(a.tgl));
    const latestBalance = bankBalances.length > 0 ? parseFloat(bankBalances[0].balance) : 0;
    return { ...bank, latestBalance };
  }, [selectedBankId, bankAccounts, balances]);

  const filteredTxns = useMemo(() => {
    let txns = bankTransactions;
    if (selectedBankId) txns = txns.filter(t => t.bank_account_id === parseInt(selectedBankId));
    return txns;
  }, [bankTransactions, selectedBankId]);

  const filteredPayments = useMemo(() => {
    let pays = payments;
    if (paymentStatusFilter) pays = pays.filter(p => p.status === paymentStatusFilter);
    return pays;
  }, [payments, paymentStatusFilter]);

  return (
    <div className="space-y-6 relative animate-fade-in">
      {/* Toast & Dialogs */}
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
          }`}>Dashboard</button>
          <button onClick={() => setActiveTab('balances')} className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'balances' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}>Mutasi & Saldo Harian</button>
          <button onClick={() => setActiveTab('payments')} className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'payments' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}>List Payment</button>
        </div>
        
        <div className="flex items-center space-x-2 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
          <span className="text-xs text-slate-400 font-bold">Periode:</span>
          <CustomDateInput value={startDate} onChange={onStartDateChange} />
          <span className="text-slate-500 text-xs">-</span>
          <CustomDateInput value={endDate} onChange={onEndDateChange} />
        </div>
      </div>

      {/* DASHBOARD TAB */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-fade-in pt-4">
          {/* Cards row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Outstanding Payment */}
            <GlassCard className="p-5 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center justify-between mb-4 z-10">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Outstanding Payment</h3>
                <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400"><AlertTriangle className="h-4 w-4" /></div>
              </div>
              <div className="z-10">
                <div className="text-2xl font-black text-white">{formatCurrency(outstandingStats.total)}</div>
                <div className="text-xs font-semibold text-slate-500 mt-1">{outstandingStats.count} Tagihan menunggu pelunasan</div>
              </div>
            </GlassCard>

            {/* Kurs BI Latest */}
            <GlassCard className="p-5 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center justify-between mb-3 z-10">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kurs BI (Terbaru)</h3>
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"><DollarSign className="h-4 w-4" /></div>
              </div>
              <div className="z-10 space-y-1.5">
                {processedKurs.latestDate && (
                  <p className="text-[10px] text-slate-500 font-semibold">{formatDateStr(processedKurs.latestDate)}</p>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 uppercase">JISDOR</span>
                  <span className="text-sm font-black text-emerald-400">Rp {(processedKurs.latestJisdor || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 uppercase">Jual</span>
                  <span className="text-sm font-bold text-rose-400">Rp {(processedKurs.latestJual || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 uppercase">Beli</span>
                  <span className="text-sm font-bold text-sky-400">Rp {(processedKurs.latestBeli || 0).toLocaleString('id-ID')}</span>
                </div>
              </div>
            </GlassCard>

            {/* Kurs BI Rerata */}
            <GlassCard className="p-5 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center justify-between mb-3 z-10">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kurs BI (Rerata 5 Bln)</h3>
                <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400"><TrendingUp className="h-4 w-4" /></div>
              </div>
              <div className="z-10 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 uppercase">JISDOR</span>
                  <span className="text-sm font-black text-emerald-400">Rp {(processedKurs.avgJisdor || 0).toLocaleString('id-ID', {maximumFractionDigits: 0})}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 uppercase">Jual</span>
                  <span className="text-sm font-bold text-rose-400">Rp {(processedKurs.avgJual || 0).toLocaleString('id-ID', {maximumFractionDigits: 0})}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 uppercase">Beli</span>
                  <span className="text-sm font-bold text-sky-400">Rp {(processedKurs.avgBeli || 0).toLocaleString('id-ID', {maximumFractionDigits: 0})}</span>
                </div>
              </div>
            </GlassCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2"><TrendingUp className="h-4 w-4 text-sky-400"/><span>Tren Total Saldo Akhir</span></h3>
                <div className="flex bg-slate-900/60 p-1 rounded-lg border border-slate-800">
                  <button onClick={() => setSaldoFilter('daily')} className={`px-3 py-1 rounded-md text-[10px] font-bold ${saldoFilter === 'daily' ? 'bg-sky-500/20 text-sky-400' : 'text-slate-400 hover:text-white'}`}>Harian</button>
                  <button onClick={() => setSaldoFilter('weekly')} className={`px-3 py-1 rounded-md text-[10px] font-bold ${saldoFilter === 'weekly' ? 'bg-sky-500/20 text-sky-400' : 'text-slate-400 hover:text-white'}`}>Mingguan</button>
                  <button onClick={() => setSaldoFilter('monthly')} className={`px-3 py-1 rounded-md text-[10px] font-bold ${saldoFilter === 'monthly' ? 'bg-sky-500/20 text-sky-400' : 'text-slate-400 hover:text-white'}`}>Bulanan</button>
                </div>
              </div>
              <div className="h-[280px]">
                {cashFlowData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cashFlowData}>
                      <defs>
                        <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="tanggal" stroke="#475569" fontSize={10} tickMargin={10} minTickGap={20} />
                      <YAxis stroke="#475569" fontSize={10} tickFormatter={(val) => `Rp${(val/1000000).toFixed(0)}M`} />
                      <Tooltip contentStyle={{backgroundColor:'#0f172a', borderColor:'#1e293b', borderRadius:'12px', fontSize:'12px'}} formatter={(val) => [formatCurrency(val), 'Total Saldo']} />
                      <Area type="monotone" dataKey="saldo" stroke="#38bdf8" strokeWidth={3} fillOpacity={1} fill="url(#colorSaldo)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs">Belum ada data saldo.</div>
                )}
              </div>
            </GlassCard>
            
            <GlassCard className="p-5">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2"><DollarSign className="h-4 w-4 text-emerald-400"/><span>Pergerakan Kurs BI (USD/IDR)</span></h3>
                <div className="flex bg-slate-900/60 p-1 rounded-lg border border-slate-800">
                  <button onClick={()=>setKursFilter('daily')} className={`px-3 py-1 rounded-md text-[10px] font-bold ${kursFilter==='daily' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'}`}>Harian</button>
                  <button onClick={()=>setKursFilter('weekly')} className={`px-3 py-1 rounded-md text-[10px] font-bold ${kursFilter==='weekly' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'}`}>Mingguan</button>
                  <button onClick={()=>setKursFilter('monthly')} className={`px-3 py-1 rounded-md text-[10px] font-bold ${kursFilter==='monthly' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'}`}>Bulanan</button>
                </div>
              </div>
              <div className="h-[280px]">
                {processedKurs.data.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={processedKurs.data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="tanggal" stroke="#475569" fontSize={10} tickMargin={10} minTickGap={20} />
                      <YAxis stroke="#475569" fontSize={10} domain={['auto', 'auto']} tickFormatter={(val) => `Rp${val/1000}k`} />
                      <Tooltip contentStyle={{backgroundColor:'#0f172a', borderColor:'#1e293b', borderRadius:'12px', fontSize:'12px'}} formatter={(val, name) => [`Rp ${val ? val.toLocaleString('id-ID', {maximumFractionDigits:0}) : 0}`, name.toUpperCase()]} />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Line type="monotone" dataKey="jisdor" name="JISDOR" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{r:6}} />
                      <Line type="monotone" dataKey="jual" name="Jual" stroke="#fb7185" strokeWidth={2} dot={false} strokeDasharray="3 3" />
                      <Line type="monotone" dataKey="beli" name="Beli" stroke="#38bdf8" strokeWidth={2} dot={false} strokeDasharray="3 3" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs">Belum ada data kurs. (Atau error fetch dari API)</div>
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* BALANCES / MUTASI TAB */}
      {activeTab === 'balances' && (
        <div className="space-y-4 pt-4 animate-fade-in">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Filter by Bank */}
            <div className="w-full md:w-1/3">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Pilih Rekening</label>
              <select 
                value={selectedBankId} 
                onChange={(e) => { setSelectedBankId(e.target.value); setTxnPage(1); }}
                className="w-full px-4 py-3 rounded-xl glass-input text-xs bg-slate-900 text-white border-slate-700"
              >
                <option value="">-- Tampilkan Semua --</option>
                {bankAccounts.map(b => (
                  <option key={b.id} value={b.id}>{b.bank_name} - {b.account_number} ({b.currency})</option>
                ))}
              </select>

              {/* Selected Bank Details Card */}
              {selectedBankDetails && (
                <GlassCard className="mt-4 p-5 animate-fade-in">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-white font-bold text-lg">{selectedBankDetails.bank_name}</h4>
                      <p className="text-slate-400 text-xs">{selectedBankDetails.account_name}</p>
                    </div>
                    <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg"><Wallet className="h-5 w-5"/></div>
                  </div>
                  <div className="space-y-1 mb-4">
                    <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Nomor Rekening</p>
                    <p className="text-slate-300 text-sm font-mono tracking-wider">{selectedBankDetails.account_number}</p>
                  </div>
                  <div className="pt-4 border-t border-slate-800">
                    <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">Sisa Saldo Akhir</p>
                    <p className={`text-xl font-black ${selectedBankDetails.latestBalance < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {selectedBankDetails.currency} {new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2 }).format(selectedBankDetails.latestBalance)}
                    </p>
                  </div>
                </GlassCard>
              )}
            </div>

            {/* Mutasi Table */}
            <div className="w-full md:w-2/3">
              <div className="flex justify-between items-center bg-slate-900/60 px-4 py-3 rounded-2xl border border-slate-800 mb-4">
                <span className="text-xs text-slate-400 font-bold">Log Uang Masuk / Keluar (Mutasi)</span>
                <button 
                  onClick={() => { 
                    setSelectedItem(null); 
                    setTxnForm({ bank_account_id: selectedBankId || '', type: 'in', amount: '', transaction_date: getToday(), description: '' }); 
                    setActiveModal('add_txn'); 
                  }} 
                  className="flex items-center space-x-1 px-4 py-1.5 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30 text-xs font-bold hover:bg-teal-500/30"
                >
                  <Plus className="h-3.5 w-3.5"/><span>Catat Mutasi</span>
                </button>
              </div>

              <GlassCard className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase">
                      <th className="py-3 px-4">Tgl</th>
                      <th className="py-3 px-4">Rekening</th>
                      <th className="py-3 px-4">Deskripsi</th>
                      <th className="py-3 px-4 text-right">Masuk / Keluar</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredTxns.slice((txnPage - 1) * PAGE_SIZE, txnPage * PAGE_SIZE).map(t => (
                      <tr key={t.id} className="hover:bg-slate-900/40">
                        <td className="py-3 px-4 font-semibold text-slate-300">{formatDateStr(t.transaction_date)}</td>
                        <td className="py-3 px-4">
                          <span className="text-white font-bold">{t.bank_account?.bank_name}</span>
                          <span className="text-slate-500 block text-[10px]">{t.bank_account?.account_number}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 max-w-[200px] truncate" title={t.description}>{t.description || '-'}</td>
                        <td className={`py-3 px-4 text-right font-bold ${t.type === 'in' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {t.type === 'in' ? '+ ' : '- '}
                          {new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(t.amount)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {t.reference_type ? (
                            <span className="text-[10px] text-slate-500 px-2 py-0.5 bg-slate-800 rounded">Auto (Sistem)</span>
                          ) : (
                            <div className="flex justify-center space-x-2">
                              <button onClick={() => { setSelectedItem(t); setTxnForm({ bank_account_id: t.bank_account_id, type: t.type, amount: t.amount, transaction_date: t.transaction_date.split('T')[0], description: t.description || '' }); setActiveModal('add_txn'); }} className="p-1 text-slate-400 hover:text-sky-400"><Edit className="h-3.5 w-3.5"/></button>
                              <button onClick={() => triggerDelete('txn', t)} className="p-1 text-slate-400 hover:text-red-400"><Trash2 className="h-3.5 w-3.5"/></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredTxns.length === 0 && (
                      <tr><td colSpan="5" className="py-8 text-center text-slate-500 text-xs">Belum ada mutasi untuk kriteria ini.</td></tr>
                    )}
                  </tbody>
                </table>
                {filteredTxns.length > 0 && (
                  <div className="flex justify-between items-center mt-2 px-4 pb-3">
                    <button disabled={txnPage === 1} onClick={() => setTxnPage(prev => prev - 1)} className="text-xs text-slate-400 hover:text-white disabled:opacity-50">Prev</button>
                    <span className="text-[10px] text-slate-500">{txnPage} / {Math.ceil(filteredTxns.length / PAGE_SIZE) || 1}</span>
                    <button disabled={txnPage >= Math.ceil(filteredTxns.length / PAGE_SIZE)} onClick={() => setTxnPage(prev => prev + 1)} className="text-xs text-slate-400 hover:text-white disabled:opacity-50">Next</button>
                  </div>
                )}
              </GlassCard>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENTS TAB */}
      {activeTab === 'payments' && (
        <div className="space-y-4 pt-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900/60 px-4 py-3 rounded-2xl border border-slate-800 gap-4">
            <div className="flex items-center space-x-3">
              <span className="text-xs text-slate-400 font-bold">Daftar Tagihan & Pembayaran</span>
              <select value={paymentStatusFilter} onChange={(e) => { setPaymentStatusFilter(e.target.value); setPaymentPage(1); }} className="px-3 py-1 rounded-lg glass-input text-xs bg-slate-900/80 text-white">
                <option value="">Semua Status</option>
                <option value="proses">Proses (Belum Lunas)</option>
                <option value="selesai">Selesai (Lunas)</option>
              </select>
            </div>
            <button 
              onClick={() => { 
                setSelectedItem(null); 
                setPaymentForm({ supplier_id: '', amount: '', fr_number: '', job_object: '', status: 'proses' }); 
                setActiveModal('add_payment'); 
              }} 
              className="flex items-center space-x-1 px-4 py-1.5 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-bold hover:bg-orange-500/30"
            >
              <Plus className="h-3.5 w-3.5"/><span>Buat Tagihan</span>
            </button>
          </div>

          <GlassCard className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase">
                  <th className="py-3 px-4">Tgl Dibuat</th>
                  <th className="py-3 px-4">Supplier / Objek</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Total / Terbayar</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPayments.slice((paymentPage - 1) * PAGE_SIZE, paymentPage * PAGE_SIZE).map(p => {
                  const paid = (p.payment_histories || []).reduce((sum, h) => sum + parseFloat(h.amount), 0);
                  const sisa = parseFloat(p.amount) - paid;
                  const isSelesai = p.status === 'selesai' || sisa <= 0;
                  
                  return (
                    <tr key={p.id} className="hover:bg-slate-900/40">
                      <td className="py-3 px-4 font-semibold text-slate-300">{formatDateStr(p.created_at)}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{p.supplier?.nama}</div>
                        <div className="text-[10px] text-slate-500 mt-1 flex flex-col">
                          {p.job_object && <span>Obj: {p.job_object}</span>}
                          {p.fr_number && <span>FR: {p.fr_number}</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isSelesai ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>
                          {isSelesai ? 'Selesai' : 'Proses'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="text-white font-bold">{formatCurrency(p.amount)}</div>
                        <div className={`text-[10px] font-semibold mt-1 ${sisa <= 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                          Terbayar: {formatCurrency(paid)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center space-x-2">
                          {!isSelesai && (
                            <button 
                              onClick={() => { setHistoryForm({ payment_id: p.id, bank_account_id: '', amount: sisa, payment_date: getToday() }); setActiveModal('add_history'); }}
                              className="px-2 py-1 bg-teal-500/20 text-teal-400 rounded text-[10px] font-bold hover:bg-teal-500/30 transition-colors"
                            >Bayar</button>
                          )}
                          <button onClick={() => { setSelectedItem(p); setPaymentForm({ supplier_id: p.supplier_id, amount: p.amount, fr_number: p.fr_number || '', job_object: p.job_object || '', status: p.status }); setActiveModal('add_payment'); }} className="p-1 text-slate-400 hover:text-sky-400"><Edit className="h-3.5 w-3.5"/></button>
                          <button onClick={() => triggerDelete('payment', p)} className="p-1 text-slate-400 hover:text-red-400"><Trash2 className="h-3.5 w-3.5"/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredPayments.length === 0 && (
                  <tr><td colSpan="5" className="py-8 text-center text-slate-500 text-xs">Belum ada tagihan.</td></tr>
                )}
              </tbody>
            </table>
            {filteredPayments.length > 0 && (
              <div className="flex justify-between items-center mt-2 px-4 pb-3">
                <button disabled={paymentPage === 1} onClick={() => setPaymentPage(prev => prev - 1)} className="text-xs text-slate-400 hover:text-white disabled:opacity-50">Prev</button>
                <span className="text-[10px] text-slate-500">{paymentPage} / {Math.ceil(filteredPayments.length / PAGE_SIZE) || 1}</span>
                <button disabled={paymentPage >= Math.ceil(filteredPayments.length / PAGE_SIZE)} onClick={() => setPaymentPage(prev => prev + 1)} className="text-xs text-slate-400 hover:text-white disabled:opacity-50">Next</button>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* Modals */}
      {activeModal === 'add_txn' && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[9990] animate-fade-in">
          <GlassCard className="w-full max-w-sm p-6 border-teal-500/20" hover={false}>
            <div className="flex justify-between items-center mb-6"><h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Catat Mutasi Manual</h3><button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleTxnSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Rekening Bank</label>
                <select required value={txnForm.bank_account_id} onChange={e => setTxnForm(prev => ({ ...prev, bank_account_id: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white">
                  <option value="">-- Pilih --</option>
                  {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bank_name} - {b.account_number} ({b.currency})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Jenis Mutasi</label>
                  <select required value={txnForm.type} onChange={e => setTxnForm(prev => ({ ...prev, type: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white">
                    <option value="in">Masuk (+)</option>
                    <option value="out">Keluar (-)</option>
                  </select>
                </div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tanggal</label><input type="date" required value={txnForm.transaction_date} onChange={e => setTxnForm(prev => ({ ...prev, transaction_date: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" /></div>
              </div>
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nominal</label><input type="number" required value={txnForm.amount} onChange={e => setTxnForm(prev => ({ ...prev, amount: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" placeholder="Contoh: 10000000" /></div>
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Deskripsi</label><input type="text" value={txnForm.description} onChange={e => setTxnForm(prev => ({ ...prev, description: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" placeholder="Setoran awal, dll..." /></div>
              <div className="flex space-x-3 pt-4"><button type="submit" className="flex-1 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors">Simpan</button><button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-semibold hover:text-white transition-colors">Batal</button></div>
            </form>
          </GlassCard>
        </div>
      )}

      {activeModal === 'add_payment' && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[9990] animate-fade-in">
          <GlassCard className="w-full max-w-sm p-6 border-orange-500/20" hover={false}>
            <div className="flex justify-between items-center mb-6"><h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Data Tagihan Payment</h3><button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button></div>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Supplier / Vendor</label>
                <select required value={paymentForm.supplier_id} onChange={e => setPaymentForm(prev => ({ ...prev, supplier_id: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white">
                  <option value="">-- Pilih --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                </select>
              </div>
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Total Tagihan (Nominal)</label><input type="number" required value={paymentForm.amount} onChange={e => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nomor FR (Opsional)</label><input type="text" value={paymentForm.fr_number} onChange={e => setPaymentForm(prev => ({ ...prev, fr_number: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" /></div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Status Tagihan</label>
                  <select value={paymentForm.status} onChange={e => setPaymentForm(prev => ({ ...prev, status: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white">
                    <option value="proses">Proses</option>
                    <option value="selesai">Selesai</option>
                  </select>
                </div>
              </div>
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Objek Pekerjaan</label><input type="text" value={paymentForm.job_object} onChange={e => setPaymentForm(prev => ({ ...prev, job_object: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" placeholder="Sewa kapal, fee..." /></div>
              
              <div className="flex space-x-3 pt-4"><button type="submit" className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-colors">Simpan Tagihan</button><button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-semibold hover:text-white transition-colors">Batal</button></div>
            </form>
          </GlassCard>
        </div>
      )}

      {activeModal === 'add_history' && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[9990] animate-fade-in">
          <GlassCard className="w-full max-w-sm p-6 border-indigo-500/20" hover={false}>
            <div className="flex justify-between items-center mb-6"><h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Bayar Cicilan / Paralel</h3><button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleHistorySubmit} className="space-y-4">
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl mb-4">
                <p className="text-[10px] text-indigo-300 flex items-center space-x-1.5"><Info className="h-3.5 w-3.5"/><span>Saldo Rekening akan otomatis terpotong saat ini disimpan.</span></p>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Gunakan Rekening</label>
                <select required value={historyForm.bank_account_id} onChange={e => setHistoryForm(prev => ({ ...prev, bank_account_id: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white">
                  <option value="">-- Pilih Rekening Pembayar --</option>
                  {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bank_name} - {b.account_number} ({b.currency})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nilai Yang Dibayar</label><input type="number" required value={historyForm.amount} onChange={e => setHistoryForm(prev => ({ ...prev, amount: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" /></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tgl Bayar</label><input type="date" required value={historyForm.payment_date} onChange={e => setHistoryForm(prev => ({ ...prev, payment_date: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" /></div>
              </div>
              <div className="flex space-x-3 pt-4"><button type="submit" className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors">Bayar & Potong Saldo</button><button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-semibold hover:text-white transition-colors">Batal</button></div>
            </form>
          </GlassCard>
        </div>
      )}

    </div>
  );
}
