'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import DashboardView from '@/components/views/DashboardView';
import MasterDataView from '@/components/views/MasterDataView';
import { apiCall } from '@/utils/api';
import { ShieldCheck, LogIn, Lock, Mail, AlertCircle, RefreshCw } from 'lucide-react';

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState(null);
  
  // Auth Form State
  const [loginEmail, setLoginEmail] = useState('admin@cpo.com');
  const [loginPassword, setLoginPassword] = useState('admin123');
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Navigation tab: 'dashboard', 'master'
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark';
    const savedTheme = localStorage.getItem('cpo_theme');
    if (savedTheme) return savedTheme;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });
  
  const getThirtyDaysAgo = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  };
  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(getThirtyDaysAgo());
  const [endDate, setEndDate] = useState(getTodayStr());

  // Master Data & Dashboard State (Local variables to enable instant reactivity)
  const [dashboardData, setDashboardData] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [storages, setStorages] = useState([]);
  const [products, setProducts] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [incomingLogs, setIncomingLogs] = useState([]);
  const [dailyTargets, setDailyTargets] = useState([]);

  // Sync to prevent NextJS hydration errors
  useEffect(() => {
    setIsClient(true);
    const storedUser = localStorage.getItem('cpo_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('light', theme === 'light');
      document.documentElement.style.colorScheme = theme;
      localStorage.setItem('cpo_theme', theme);
    }
  }, [theme]);

  // Fetch all app data from API
  const fetchAllData = useCallback(async (start = startDate, end = endDate) => {
    setIsRefreshing(true);
    try {
      const [dash, sups, stores, prods, ctrs, targets] = await Promise.all([
        apiCall(`/dashboard?start_date=${start}&end_date=${end}`),
        apiCall('/suppliers'),
        apiCall('/storages'),
        apiCall('/master-produks'),
        apiCall('/kontrak-cpos'),
        apiCall('/daily-targets'),
      ]);

      // Align state
      setSuppliers(sups);
      setProducts(prods);
      setContracts(ctrs);
      setDailyTargets(Array.isArray(targets) ? targets : []);

      // Extract storages from dashboardData to have details of stok, terisi, and persentase
      const mergedStorages = stores.map(store => {
        const liveInfo = (dash.storages || []).find(s => s.id === store.id);
        return {
          ...store,
          stok: liveInfo ? liveInfo.stok : [],
          terisi: liveInfo ? liveInfo.terisi : 0,
          persentase: liveInfo ? liveInfo.persentase : 0
        };
      });
      setStorages(mergedStorages);

      setIncomingLogs(dash.incoming_logs || []);

      setDashboardData(dash);
    } catch (e) {
      console.error("Data load failed, loading fallback metrics", e);
    } finally {
      setIsRefreshing(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (user) {
      fetchAllData(startDate, endDate);
    }
  }, [user, fetchAllData, startDate, endDate]);

  // Recalculates metrics in local React state so that CRUD modifications are immediately visible.
  const recalculateLocalState = useCallback((updatedContracts, updatedIncoming, updatedStorages) => {
    const today = getTodayStr();

    // 1. Calculate incoming logs filtered by date range
    const filteredIncoming = updatedIncoming.filter(log => {
      const logDate = log.tgl.split('T')[0];
      return logDate >= startDate && logDate <= endDate;
    });

    // 2. Contracts calculations (outstanding_qty, outstanding_nominal)
    const processedContracts = updatedContracts.map(c => {
      // Qty Kirim (demand) vs Qty Terima (actual) from incoming logs
      const contractIncoming = updatedIncoming.filter(log => log.kontrak_cpo_id === c.id);
      const totalTerkirim = contractIncoming.reduce((sum, log) => sum + parseFloat(log.qty_terima || 0), 0);
      const outstandingQty = Math.max(0, parseFloat(c.qty) - totalTerkirim);

      // Payments
      const payments = c.pembayaran_cpos || [];
      const totalTerbayar = payments.reduce((sum, p) => sum + parseFloat(p.nominal || 0), 0);
      const totalHarga = parseFloat(c.qty) * parseFloat(c.harga_per_kg);
      const outstandingNominal = Math.max(0, totalHarga - totalTerbayar);

      const resolvedSupplier = c.supplier || suppliers.find(s => s.id === parseInt(c.supplier_id)) || null;

      return {
        ...c,
        supplier: resolvedSupplier,
        total_terkirim: totalTerkirim,
        outstanding_qty: outstandingQty,
        total_terbayar: totalTerbayar,
        outstanding_nominal: outstandingNominal,
        pembayaran_cpos: payments
      };
    });

    setContracts(processedContracts);
    setIncomingLogs(filteredIncoming);

    // 3. LIVE KPIs (outstanding qty, outstanding nominal, active contracts count)
    const activeContracts = processedContracts.filter(c => !c.is_closed);
    const liveActiveCount = activeContracts.length;
    const liveOutstandingQty = activeContracts.reduce((sum, c) => sum + c.outstanding_qty, 0);
    const liveOutstandingNominal = activeContracts.reduce((sum, c) => sum + c.outstanding_nominal, 0);

    // 4. Receives today
    const incomingToday = updatedIncoming.filter(log => log.tgl.split('T')[0] === today);
    const qtyKirimHariIni = incomingToday.reduce((sum, log) => sum + parseFloat(log.qty_kirim || 0), 0);
    const qtyTerimaHariIni = incomingToday.reduce((sum, log) => sum + parseFloat(log.qty_terima || 0), 0);
    const susutHariIni = incomingToday.reduce((sum, log) => sum + parseFloat(log.selisih_qty || 0), 0);

    // 5. Update dashboardData object
    setDashboardData(prev => ({
      ...prev,
      kontrak_cpo_aktif: liveActiveCount,
      outstanding_qty: liveOutstandingQty,
      outstanding_nominal: liveOutstandingNominal,
      penerimaan_hari_ini: {
        qty_kirim: qtyKirimHariIni,
        qty_terima: qtyTerimaHariIni,
        susut: susutHariIni
      },
      incoming_logs: filteredIncoming,
      storages: updatedStorages
    }));
  }, [startDate, endDate, suppliers]);

  const handleDateFilterChange = (start, end) => {
    setStartDate(start);
    setEndDate(end);
    fetchAllData(start, end);
  };

  // Auth: Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);
    try {
      const res = await apiCall('/login', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      localStorage.setItem('cpo_token', res.token);
      localStorage.setItem('cpo_user', JSON.stringify(res.user));
      setUser(res.user);
    } catch (err) {
      setAuthError('Email atau password salah. Coba: admin@cpo.com / admin123');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auth: Logout handler
  const handleLogout = () => {
    localStorage.removeItem('cpo_token');
    localStorage.removeItem('cpo_user');
    setUser(null);
    setCurrentTab('dashboard');
  };

  // ── CRUD: Suppliers ──
  const handleAddSupplier = async (payload) => {
    const tempId = Date.now();
    const newSup = { id: tempId, ...payload };
    const nextSuppliers = [...suppliers, newSup];
    setSuppliers(nextSuppliers);
    try {
      await apiCall('/suppliers', { method: 'POST', body: JSON.stringify(payload) });
      await fetchAllData();
    } catch (err) {
      console.warn("Backend offline, updating local state", err);
    }
  };

  const handleUpdateSupplier = async (id, payload) => {
    const nextSuppliers = suppliers.map(s => s.id === id ? { ...s, ...payload } : s);
    setSuppliers(nextSuppliers);
    try {
      await apiCall(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      await fetchAllData();
    } catch (err) {
      console.warn("Backend offline, updating local state", err);
    }
  };

  const handleDeleteSupplier = async (id) => {
    if (!confirm('Hapus supplier ini?')) return;
    const nextSuppliers = suppliers.filter(s => s.id !== id);
    setSuppliers(nextSuppliers);
    try {
      await apiCall(`/suppliers/${id}`, { method: 'DELETE' });
      await fetchAllData();
    } catch (err) {
      console.warn("Backend offline, updating local state", err);
    }
  };

  // ── CRUD: Storages ──
  const handleAddStorage = async (payload) => {
    const tempId = Date.now();
    const newStore = { id: tempId, terisi: 0, persentase: 0, stok: [], ...payload };
    const nextStorages = [...storages, newStore];
    setStorages(nextStorages);
    try {
      await apiCall('/storages', { method: 'POST', body: JSON.stringify(payload) });
      await fetchAllData();
    } catch (err) {
      console.warn("Backend offline, updating local state", err);
    }
  };

  const handleUpdateStorage = async (id, payload) => {
    const nextStorages = storages.map(s => s.id === id ? { ...s, ...payload } : s);
    setStorages(nextStorages);
    try {
      await apiCall(`/storages/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      await fetchAllData();
    } catch (err) {
      console.warn("Backend offline, updating local state", err);
    }
  };

  const handleDeleteStorage = async (id) => {
    if (!confirm('Hapus storage ini?')) return;
    const nextStorages = storages.filter(s => s.id !== id);
    setStorages(nextStorages);
    try {
      await apiCall(`/storages/${id}`, { method: 'DELETE' });
      await fetchAllData();
    } catch (err) {
      console.warn("Backend offline, updating local state", err);
    }
  };

  // ── CRUD: Products ──
  const handleAddProduct = async (payload) => {
    const tempId = Date.now();
    const newProd = { id: tempId, ...payload };
    const nextProducts = [...products, newProd];
    setProducts(nextProducts);
    try {
      await apiCall('/master-produks', { method: 'POST', body: JSON.stringify(payload) });
      await fetchAllData();
    } catch (err) {
      console.warn("Backend offline, updating local state", err);
    }
  };

  const handleUpdateProduct = async (id, payload) => {
    const nextProducts = products.map(p => p.id === id ? { ...p, ...payload } : p);
    setProducts(nextProducts);
    try {
      await apiCall(`/master-produks/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      await fetchAllData();
    } catch (err) {
      console.warn("Backend offline, updating local state", err);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm('Hapus produk ini?')) return;
    const nextProducts = products.filter(p => p.id !== id);
    setProducts(nextProducts);
    try {
      await apiCall(`/master-produks/${id}`, { method: 'DELETE' });
      await fetchAllData();
    } catch (err) {
      console.warn("Backend offline, updating local state", err);
    }
  };

  // ── CRUD: Contracts ──
  const handleAddContract = async (payload) => {
    const tempId = Date.now();
    const newContract = {
      id: tempId,
      supplier_id: parseInt(payload.supplier_id),
      nomor_kontrak: payload.nomor_kontrak,
      qty: parseFloat(payload.qty),
      harga_per_kg: parseFloat(payload.harga_per_kg),
      cbd_cad: payload.cbd_cad,
      tgl_kontrak: payload.tgl_kontrak,
      tgl_jatuh_tempo: payload.tgl_jatuh_tempo,
      is_closed: payload.is_closed || false,
      pembayaran_cpos: []
    };

    const nextContracts = [newContract, ...contracts];
    recalculateLocalState(nextContracts, incomingLogs, storages);

    try {
      await apiCall('/kontrak-cpos', { method: 'POST', body: JSON.stringify(payload) });
      await fetchAllData();
    } catch (err) {
      console.warn("Backend offline, updating local state", err);
    }
  };

  const handleUpdateContract = async (id, payload) => {
    const nextContracts = contracts.map(c => {
      if (c.id === id) {
        return {
          ...c,
          supplier_id: parseInt(payload.supplier_id),
          nomor_kontrak: payload.nomor_kontrak,
          qty: parseFloat(payload.qty),
          harga_per_kg: parseFloat(payload.harga_per_kg),
          cbd_cad: payload.cbd_cad,
          tgl_kontrak: payload.tgl_kontrak,
          tgl_jatuh_tempo: payload.tgl_jatuh_tempo,
          is_closed: payload.is_closed
        };
      }
      return c;
    });

    recalculateLocalState(nextContracts, incomingLogs, storages);

    try {
      await apiCall(`/kontrak-cpos/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      await fetchAllData();
    } catch (err) {
      console.warn("Backend offline, updating local state", err);
    }
  };

  const handleDeleteContract = async (id) => {
    if (!confirm('Hapus kontrak CPO ini?')) return;
    const nextContracts = contracts.filter(c => c.id !== id);
    recalculateLocalState(nextContracts, incomingLogs, storages);
    try {
      await apiCall(`/kontrak-cpos/${id}`, { method: 'DELETE' });
      await fetchAllData();
    } catch (err) {
      console.warn("Backend offline, updating local state", err);
    }
  };

  // ── CRUD: Incoming Receives ──
  const handleAddIncoming = async (payload) => {
    // 1. Tank validation check
    const targetStorage = storages.find(s => s.id === parseInt(payload.storage_id));
    if (targetStorage && targetStorage.jenis === 'tangki') {
      const hasOtherProd = targetStorage.stok.some(st => st.kode_produk !== 'CPO' && st.qty > 0);
      if (hasOtherProd) {
        alert("Gagal: Storage jenis Tangki hanya boleh menyimpan 1 jenis produk (CPO)!");
        return;
      }
    }

    const tempId = Date.now();
    const qtyKirim = parseFloat(payload.qty_kirim);
    const qtyTerima = parseFloat(payload.qty_terima);
    const selisih = Math.max(0, qtyKirim - qtyTerima);

    const targetContract = contracts.find(c => c.id === parseInt(payload.kontrak_cpo_id));

    const newIncoming = {
      id: tempId,
      kontrak_cpo_id: parseInt(payload.kontrak_cpo_id),
      storage_id: parseInt(payload.storage_id),
      qty_kirim: qtyKirim,
      qty_terima: qtyTerima,
      selisih_qty: selisih,
      tgl: payload.tgl,
      no_surat_jalan: payload.no_surat_jalan,
      supir: payload.supir,
      no_kendaraan: payload.no_kendaraan,
      note: payload.note,
      kontrak_cpo: targetContract,
      storage: targetStorage
    };

    const nextIncoming = [newIncoming, ...incomingLogs];

    // 2. Adjust target storage level in local state
    const nextStorages = storages.map(s => {
      if (s.id === parseInt(payload.storage_id)) {
        // Add quantity to CPO product stok
        let currentCpoStok = s.stok.find(st => st.kode_produk === 'CPO');
        let nextStok = [];
        if (currentCpoStok) {
          nextStok = s.stok.map(st => st.kode_produk === 'CPO' ? { ...st, qty: st.qty + qtyTerima } : st);
        } else {
          nextStok = [...s.stok, { produk_id: 1, nama_produk: 'Crude Palm Oil', kode_produk: 'CPO', satuan: 'Kg', qty: qtyTerima }];
        }
        const totalTerisi = nextStok.reduce((sum, item) => sum + item.qty, 0);
        return {
          ...s,
          stok: nextStok,
          terisi: totalTerisi,
          persentase: s.kapasitas > 0 ? Math.round((totalTerisi / s.kapasitas) * 100) : 0
        };
      }
      return s;
    });

    recalculateLocalState(contracts, nextIncoming, nextStorages);

    try {
      const res = await apiCall('/incoming-cpos', { method: 'POST', body: JSON.stringify(payload) });
      if (res.message && res.message.includes('Gagal')) {
        alert(res.message);
      } else {
        await fetchAllData();
      }
    } catch (err) {
      console.warn("Backend offline, updating local state", err);
    }
  };

  const handleUpdateIncoming = async (id, payload) => {
    const targetStorage = storages.find(s => s.id === parseInt(payload.storage_id));
    const targetContract = contracts.find(c => c.id === parseInt(payload.kontrak_cpo_id));
    
    const qtyKirim = parseFloat(payload.qty_kirim);
    const qtyTerima = parseFloat(payload.qty_terima);
    const selisih = Math.max(0, qtyKirim - qtyTerima);

    const nextIncoming = incomingLogs.map(log => {
      if (log.id === id) {
        return {
          ...log,
          kontrak_cpo_id: parseInt(payload.kontrak_cpo_id),
          storage_id: parseInt(payload.storage_id),
          qty_kirim: qtyKirim,
          qty_terima: qtyTerima,
          selisih_qty: selisih,
          tgl: payload.tgl,
          no_surat_jalan: payload.no_surat_jalan,
          supir: payload.supir,
          no_kendaraan: payload.no_kendaraan,
          note: payload.note,
          kontrak_cpo: targetContract,
          storage: targetStorage
        };
      }
      return log;
    });

    recalculateLocalState(contracts, nextIncoming, storages);

    try {
      const res = await apiCall(`/incoming-cpos/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      if (res.message && res.message.includes('Gagal')) {
        alert(res.message);
      } else {
        await fetchAllData();
      }
    } catch (err) {
      console.warn("Backend offline, updating local state", err);
    }
  };

  const handleDeleteIncoming = async (id) => {
    if (!confirm('Hapus log penerimaan ini?')) return;
    const nextIncoming = incomingLogs.filter(log => log.id !== id);
    recalculateLocalState(contracts, nextIncoming, storages);
    try {
      await apiCall(`/incoming-cpos/${id}`, { method: 'DELETE' });
      await fetchAllData();
    } catch (err) {
      console.warn("Backend offline, updating local state", err);
    }
  };

  // ── CRUD: Payments (Nested under Contract) ──
  const handleAddPayment = async (contractId, payload) => {
    const tempId = Date.now();
    const newPayment = {
      id: tempId,
      kontrak_cpo_id: contractId,
      nominal: parseFloat(payload.nominal),
      tgl_bayar: payload.tgl_bayar,
      metode_bayar: payload.metode_bayar,
      catatan: payload.catatan
    };

    const nextContracts = contracts.map(c => {
      if (c.id === contractId) {
        const updatedPayments = [...(c.pembayaran_cpos || []), newPayment];
        return {
          ...c,
          pembayaran_cpos: updatedPayments
        };
      }
      return c;
    });

    recalculateLocalState(nextContracts, incomingLogs, storages);

    try {
      await apiCall('/pembayaran-cpos', {
        method: 'POST',
        body: JSON.stringify({ ...payload, kontrak_cpo_id: contractId })
      });
      await fetchAllData();
    } catch (err) {
      console.warn("Backend offline, updating local payment state", err);
    }
  };

  const handleUpdatePayment = async (paymentId, payload) => {
    const nextContracts = contracts.map(c => {
      if (c.id === payload.kontrak_cpo_id) {
        const updatedPayments = (c.pembayaran_cpos || []).map(p => {
          if (p.id === paymentId) {
            return { ...p, ...payload, nominal: parseFloat(payload.nominal) };
          }
          return p;
        });
        return {
          ...c,
          pembayaran_cpos: updatedPayments
        };
      }
      return c;
    });

    recalculateLocalState(nextContracts, incomingLogs, storages);

    try {
      await apiCall(`/pembayaran-cpos/${paymentId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      await fetchAllData();
    } catch (err) {
      console.warn("Backend offline, updating local payment state", err);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!confirm('Hapus pembayaran ini?')) return;
    
    // Find contract containing this payment
    const targetContract = contracts.find(c => (c.pembayaran_cpos || []).some(p => p.id === paymentId));
    if (!targetContract) return;

    const nextContracts = contracts.map(c => {
      if (c.id === targetContract.id) {
        const updatedPayments = (c.pembayaran_cpos || []).filter(p => p.id !== paymentId);
        return {
          ...c,
          pembayaran_cpos: updatedPayments
        };
      }
      return c;
    });

    recalculateLocalState(nextContracts, incomingLogs, storages);

    try {
      await apiCall(`/pembayaran-cpos/${paymentId}`, { method: 'DELETE' });
      await fetchAllData();
    } catch (err) {
      console.warn("Backend offline, updating local payment state", err);
    }
  };

  const handleAddDailyTarget = async (payload) => {
    const tempId = Date.now();
    const normalizedPayload = {
      ...payload,
      target_qty: parseFloat(payload.target_qty)
    };
    const nextTargets = [{ id: tempId, ...normalizedPayload }, ...dailyTargets.filter(target => target.tgl !== payload.tgl)];
    setDailyTargets(nextTargets);

    try {
      await apiCall('/daily-targets', {
        method: 'POST',
        body: JSON.stringify(normalizedPayload)
      });
      await fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateDailyTarget = async (id, payload) => {
    const normalizedPayload = {
      ...payload,
      target_qty: parseFloat(payload.target_qty)
    };
    const nextTargets = dailyTargets.map(target => target.id === id ? { ...target, ...normalizedPayload } : target);
    setDailyTargets(nextTargets);

    try {
      await apiCall(`/daily-targets/${id}`, {
        method: 'PUT',
        body: JSON.stringify(normalizedPayload)
      });
      await fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDailyTarget = async (id) => {
    const nextTargets = dailyTargets.filter(target => target.id !== id);
    setDailyTargets(nextTargets);

    try {
      await apiCall(`/daily-targets/${id}`, { method: 'DELETE' });
      await fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // Prevent server hydration mismatches
  if (!isClient) return null;

  // ── RENDER LOGIN PAGE ──
  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ backgroundColor: 'var(--bg-main)' }}>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full filter blur-[100px] animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-500/10 rounded-full filter blur-[100px] animate-pulse-slow"></div>
        
        <div className="w-full max-w-md p-8 relative border border-teal-500/20 glass-card rounded-3xl">
          <div className="text-center mb-8">
            <div className="inline-flex h-12 w-12 rounded-2xl bg-gradient-to-tr from-teal-400 to-sky-500 items-center justify-center shadow-lg shadow-teal-500/25 mb-4">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">Login Antigravity Hub</h2>
            <p className="text-xs text-slate-400 mt-1">Masukkan kredensial portal CPO Supply Chain</p>
          </div>

          {authError && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Alamat Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
                <input
                  type="email" required placeholder="admin@cpo.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl glass-input text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Kata Sandi</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
                <input
                  type="password" required placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl glass-input text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl glass-button-primary flex items-center justify-center space-x-2 font-bold disabled:opacity-50 text-sm transition-all"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-4.5 w-4.5" />
                  <span>Masuk Portal</span>
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // Loading state
  if (!dashboardData) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-main)' }}>
        <div className="text-center space-y-4">
          <div className="relative inline-flex">
            <span className="flex h-6 w-6 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-6 w-6 bg-teal-500"></span>
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-400 tracking-wider">Memuat Data CPO Supply Chain...</p>
        </div>
      </main>
    );
  }

  const getTabTitle = () => {
    switch (currentTab) {
      case 'dashboard': return 'Dashboard Overview CPO';
      case 'master': return 'Master Data Control Center';
      default: return 'CPO Supply Chain';
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--bg-main)' }}>
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        user={user} 
        onLogout={handleLogout} 
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <main className={`flex-1 min-h-screen p-8 transition-all duration-300 ${sidebarOpen ? 'pl-[352px]' : 'pl-16'}`}>
        <div className="max-w-7xl mx-auto">
          <Header
            title={getTabTitle()}
            onRefresh={() => fetchAllData(startDate, endDate)}
            isRefreshing={isRefreshing}
            onToggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
            currentTheme={theme}
          />

          <div className="transition-all duration-300">
            {currentTab === 'dashboard' && (
              <DashboardView 
                data={dashboardData}
                startDate={startDate}
                endDate={endDate}
                onDateChange={handleDateFilterChange}
                suppliers={suppliers}
                storages={storages}
                contracts={contracts}
                onAddContract={handleAddContract}
                onUpdateContract={handleUpdateContract}
                onDeleteContract={handleDeleteContract}
                onAddIncoming={handleAddIncoming}
                onUpdateIncoming={handleUpdateIncoming}
                onDeleteIncoming={handleDeleteIncoming}
                onAddPayment={handleAddPayment}
                onUpdatePayment={handleUpdatePayment}
                onDeletePayment={handleDeletePayment}
                dailyTargets={dailyTargets}
                onAddDailyTarget={handleAddDailyTarget}
                onUpdateDailyTarget={handleUpdateDailyTarget}
                onDeleteDailyTarget={handleDeleteDailyTarget}
              />
            )}
            
            {currentTab === 'master' && (
              <MasterDataView
                suppliers={suppliers}
                onAddSupplier={handleAddSupplier}
                onUpdateSupplier={handleUpdateSupplier}
                onDeleteSupplier={handleDeleteSupplier}
                
                storages={storages}
                onAddStorage={handleAddStorage}
                onUpdateStorage={handleUpdateStorage}
                onDeleteStorage={handleDeleteStorage}
                
                products={products}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
