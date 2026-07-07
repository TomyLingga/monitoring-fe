'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import DashboardView from '@/components/views/DashboardView';
import MasterDataView from '@/components/views/MasterDataView';
import ProductionView from '@/components/views/ProductionView';
import StokView from '@/components/views/StokView';
import SalesView from '@/components/views/SalesView';
import LogisticsView from '@/components/views/LogisticsView';
import FinanceView from '@/components/views/FinanceView';
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
  const [theme, setTheme] = useState('dark');
  
  const getLocalDateString = (offsetDays = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const getThirtyDaysAgo = () => getLocalDateString(-30);
  const getTodayStr = () => getLocalDateString(0);

  const [startDate, setStartDate] = useState(() => getThirtyDaysAgo());
  const [endDate, setEndDate] = useState(() => getTodayStr());

  // Master Data & Dashboard State (Local variables to enable instant reactivity)
  const [dashboardData, setDashboardData] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [storages, setStorages] = useState([]);
  const [products, setProducts] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [incomingLogs, setIncomingLogs] = useState([]);
  const [dailyTargets, setDailyTargets] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [kontrakPenjualans, setKontrakPenjualans] = useState([]);
  const [pengirimanPenjualans, setPengirimanPenjualans] = useState([]);
  const [pembayaranPenjualans, setPembayaranPenjualans] = useState([]);
  const [dailySalesTargets, setDailySalesTargets] = useState([]);
  const [levyDuties, setLevyDuties] = useState([]);

  // Sales Date Filter State
  const [salesStartDate, setSalesStartDate] = useState(() => getThirtyDaysAgo());
  const [salesEndDate, setSalesEndDate] = useState(() => getTodayStr());

  // Production State
  const [prodStartDate, setProdStartDate] = useState(() => getThirtyDaysAgo());
  const [prodEndDate, setProdEndDate] = useState(() => getTodayStr());
  const [prosesRefineries, setProsesRefineries] = useState([]);
  const [prosesFraksinasis, setProsesFraksinasis] = useState([]);
  const [prosesPackagings, setProsesPackagings] = useState([]);
  const [dailyProductionTargets, setDailyProductionTargets] = useState([]);

  // Logistics State
  const [logisticsStartDate, setLogisticsStartDate] = useState(() => getThirtyDaysAgo());
  const [logisticsEndDate, setLogisticsEndDate] = useState(() => getTodayStr());
  const [truckings, setTruckings] = useState([]);
  const [logisticPeTargets, setLogisticPeTargets] = useState([]);
  const [logisticAdditionalPes, setLogisticAdditionalPes] = useState([]);
  const [logisticPeUsages, setLogisticPeUsages] = useState([]);

  // Finance State
  const [financeStartDate, setFinanceStartDate] = useState(() => getThirtyDaysAgo());
  const [financeEndDate, setFinanceEndDate] = useState(() => getTodayStr());
  const [bankAccounts, setBankAccounts] = useState([]);
  const [balances, setBalances] = useState([]);
  const [balanceChartData, setBalanceChartData] = useState([]);
  const [bankTransactions, setBankTransactions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [kursData, setKursData] = useState({ uka: [], jisdor: [] });

  // Sync to prevent NextJS hydration errors
  useEffect(() => {
    setIsClient(true);
    const storedUser = localStorage.getItem('cpo_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Apply saved theme on mount (client-only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('cpo_theme');
      const preferredTheme = savedTheme || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
      setTheme(preferredTheme);
      // Apply immediately
      document.documentElement.classList.toggle('dark', preferredTheme === 'dark');
      document.documentElement.style.colorScheme = preferredTheme;
    }
  }, []);

  // Sync theme class on <html> whenever theme changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
      document.documentElement.style.colorScheme = theme;
      localStorage.setItem('cpo_theme', theme);
    }
  }, [theme]);

  // Fetch data specific to the active tab
  const loadDataForTab = useCallback(async (tab = currentTab) => {
    if (!user) return;
    setIsRefreshing(true);
    try {
      if (tab === 'dashboard') {
        const [dash, sups, stores, prods, ctrs, targets] = await Promise.all([
          apiCall(`/dashboard?start_date=${startDate}&end_date=${endDate}`),
          apiCall('/suppliers'),
          apiCall('/storages'),
          apiCall('/master-produks'),
          apiCall('/kontrak-cpos'),
          apiCall('/daily-targets')
        ]);
        setSuppliers(Array.isArray(sups) ? sups : []);
        setProducts(Array.isArray(prods) ? prods : []);
        setContracts(Array.isArray(ctrs) ? ctrs : []);
        setDailyTargets(Array.isArray(targets) ? targets : []);
        const mergedStorages = (Array.isArray(stores) ? stores : []).map(store => {
          const liveInfo = (dash?.storages || []).find(s => s.id === store.id);
          return { ...store, stok: liveInfo?.stok || [], terisi: liveInfo?.terisi || 0, persentase: liveInfo?.persentase || 0 };
        });
        setStorages(mergedStorages);
        setIncomingLogs(dash?.incoming_logs || []);
        setDashboardData(dash);
      } 
      else if (tab === 'produksi') {
        const [refs, fraks, packs, prodTargets, stores, prods] = await Promise.all([
          apiCall(`/proses-refineries?start_date=${prodStartDate}&end_date=${prodEndDate}`),
          apiCall(`/proses-fraksinasis?start_date=${prodStartDate}&end_date=${prodEndDate}`),
          apiCall(`/proses-packagings?start_date=${prodStartDate}&end_date=${prodEndDate}`),
          apiCall('/daily-production-targets'),
          apiCall('/storages'),
          apiCall('/master-produks')
        ]);
        setProsesRefineries(Array.isArray(refs) ? refs : []);
        setProsesFraksinasis(Array.isArray(fraks) ? fraks : []);
        setProsesPackagings(Array.isArray(packs) ? packs : []);
        setDailyProductionTargets(Array.isArray(prodTargets) ? prodTargets : []);
        setStorages(Array.isArray(stores) ? stores : []);
        setProducts(Array.isArray(prods) ? prods : []);
      } 
      else if (tab === 'sales') {
        const [stores, prods, custs, sCtrs, sShips, sPays, sTargets, levies] = await Promise.all([
          apiCall('/storages'),
          apiCall('/master-produks'),
          apiCall('/buyers'),
          apiCall('/kontrak-penjualans'),
          apiCall(`/pengiriman-penjualans?start_date=${salesStartDate}&end_date=${salesEndDate}`),
          apiCall('/pembayaran-penjualans'),
          apiCall(`/daily-sales-targets?start_date=${salesStartDate}&end_date=${salesEndDate}`),
          apiCall('/levy-duties')
        ]);
        setStorages(Array.isArray(stores) ? stores : []);
        setProducts(Array.isArray(prods) ? prods : []);
        setBuyers(Array.isArray(custs) ? custs : []);
        setKontrakPenjualans(Array.isArray(sCtrs) ? sCtrs : []);
        setPengirimanPenjualans(Array.isArray(sShips) ? sShips : []);
        setPembayaranPenjualans(Array.isArray(sPays) ? sPays : []);
        setDailySalesTargets(Array.isArray(sTargets) ? sTargets : []);
        setLevyDuties(Array.isArray(levies) ? levies : []);
      } 
      else if (tab === 'stok') {
        const [stores, prods, prodStocks] = await Promise.all([
          apiCall('/storages'),
          apiCall('/master-produks'),
          apiCall('/stok-produks')
        ]);
        setStorages(Array.isArray(stores) ? stores : []);
        setProducts(Array.isArray(prods) ? prods : []);
        setStocks(Array.isArray(prodStocks) ? prodStocks : []);
      } 
      else if (tab === 'master') {
        const [sups, stores, prods, custs, banks] = await Promise.all([
          apiCall('/suppliers'),
          apiCall('/storages'),
          apiCall('/master-produks'),
          apiCall('/buyers'),
          apiCall('/finance/bank-accounts')
        ]);
        setSuppliers(Array.isArray(sups) ? sups : []);
        setStorages(Array.isArray(stores) ? stores : []);
        setProducts(Array.isArray(prods) ? prods : []);
        setBuyers(Array.isArray(custs) ? custs : []);
        setBankAccounts(Array.isArray(banks) ? banks : []);
      }
      else if (tab === 'logistics') {
        const [trucks, peT, peA, peU] = await Promise.all([
          apiCall(`/truckings?start_date=${logisticsStartDate}&end_date=${logisticsEndDate}`),
          apiCall(`/logistic-pe-targets?start_date=${logisticsStartDate}&end_date=${logisticsEndDate}`),
          apiCall(`/logistic-additional-pes?start_date=${logisticsStartDate}&end_date=${logisticsEndDate}`),
          apiCall(`/logistic-pe-usages?start_date=${logisticsStartDate}&end_date=${logisticsEndDate}`)
        ]);
        setTruckings(Array.isArray(trucks) ? trucks : []);
        setLogisticPeTargets(Array.isArray(peT) ? peT : []);
        setLogisticAdditionalPes(Array.isArray(peA) ? peA : []);
        setLogisticPeUsages(Array.isArray(peU) ? peU : []);
      } else if (tab === 'finance') {
        const [banks, bals, balChart, txns, pays, kursUka, kursJisdor, sups] = await Promise.all([
          apiCall('/finance/bank-accounts'),
          apiCall(`/finance/balances?start_date=${financeStartDate}&end_date=${financeEndDate}`),
          apiCall(`/finance/balances?start_date=${getLocalDateString(-150)}&end_date=${getTodayStr()}`),
          apiCall(`/finance/bank-transactions?start_date=${financeStartDate}&end_date=${financeEndDate}`),
          apiCall(`/finance/payments?start_date=${financeStartDate}&end_date=${financeEndDate}`),
          apiCall(`/kurs-bi/uka?mts=USD&startdate=${getLocalDateString(-150)}&enddate=${getTodayStr()}`),
          apiCall(`/kurs-bi/jisdor?mts=USD&startDate=${getLocalDateString(-150)}&endDate=${getTodayStr()}`),
          apiCall('/suppliers')
        ]);
        setBankAccounts(Array.isArray(banks) ? banks : []);
        setBalances(Array.isArray(bals) ? bals : []);
        setBalanceChartData(Array.isArray(balChart) ? balChart : []);
        setBankTransactions(Array.isArray(txns) ? txns : []);
        setPayments(Array.isArray(pays) ? pays : []);
        setKursData({
          uka: Array.isArray(kursUka) ? kursUka : [],
          jisdor: Array.isArray(kursJisdor) ? kursJisdor : []
        });
        setSuppliers(Array.isArray(sups) ? sups : []);
      }
    } catch (e) {
      console.error(`Data load failed for tab ${tab}`, e);
    } finally {
      setIsRefreshing(false);
    }
  }, [user, currentTab, startDate, endDate, prodStartDate, prodEndDate, salesStartDate, salesEndDate, logisticsStartDate, logisticsEndDate, financeStartDate, financeEndDate]);

  // Backward compatible wrapper for legacy CRUD operations
  const fetchAllData = useCallback(() => {
    return loadDataForTab(currentTab);
  }, [loadDataForTab, currentTab]);

  // Auto-fetch when tab or dates change
  useEffect(() => {
    if (user) loadDataForTab(currentTab);
  }, [user, currentTab, loadDataForTab]);

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
      const outstandingNominal = totalHarga - totalTerbayar;

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

  // ── CRUD: Buyers ──
  const handleAddBuyer = async (payload) => {
    try {
      await apiCall('/buyers', { method: 'POST', body: JSON.stringify(payload) });
      await fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateBuyer = async (id, payload) => {
    try {
      await apiCall(`/buyers/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      await fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBuyer = async (id) => {
    try {
      await apiCall(`/buyers/${id}`, { method: 'DELETE' });
      await fetchAllData();
    } catch (err) {
      console.error(err);
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
      case 'produksi':  return 'Dashboard Produksi';
      case 'sales':     return 'Dashboard Sales';
      case 'stok':      return 'Dashboard Stok & Inventori';
      case 'logistics': return 'Dashboard Logistik';
      case 'finance':   return 'Dashboard Keuangan';
      case 'master':    return 'Master Data Control Center';
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

            {currentTab === 'produksi' && (
              <ProductionView
                products={products}
                storages={storages}
                startDate={prodStartDate}
                endDate={prodEndDate}
                onDateChange={(s, e) => { setProdStartDate(s); setProdEndDate(e); }}
                prosesRefineries={prosesRefineries}
                prosesFraksinasis={prosesFraksinasis}
                prosesPackagings={prosesPackagings}
                dailyProductionTargets={dailyProductionTargets}
                onAddRefinery={async (p) => { try { const r = await apiCall('/proses-refineries', { method: 'POST', body: JSON.stringify(p) }); setProsesRefineries(prev => [r, ...prev]); } catch(e) { console.error(e); } }}
                onUpdateRefinery={async (id, p) => { try { const r = await apiCall(`/proses-refineries/${id}`, { method: 'PUT', body: JSON.stringify(p) }); setProsesRefineries(prev => prev.map(x => x.id === id ? r : x)); } catch(e) { console.error(e); } }}
                onDeleteRefinery={async (id) => { try { await apiCall(`/proses-refineries/${id}`, { method: 'DELETE' }); setProsesRefineries(prev => prev.filter(x => x.id !== id)); } catch(e) { console.error(e); } }}
                onAddFraksinasi={async (p) => { try { const r = await apiCall('/proses-fraksinasis', { method: 'POST', body: JSON.stringify(p) }); setProsesFraksinasis(prev => [r, ...prev]); } catch(e) { console.error(e); } }}
                onUpdateFraksinasi={async (id, p) => { try { const r = await apiCall(`/proses-fraksinasis/${id}`, { method: 'PUT', body: JSON.stringify(p) }); setProsesFraksinasis(prev => prev.map(x => x.id === id ? r : x)); } catch(e) { console.error(e); } }}
                onDeleteFraksinasi={async (id) => { try { await apiCall(`/proses-fraksinasis/${id}`, { method: 'DELETE' }); setProsesFraksinasis(prev => prev.filter(x => x.id !== id)); } catch(e) { console.error(e); } }}
                onAddPackaging={async (p) => { try { const r = await apiCall('/proses-packagings', { method: 'POST', body: JSON.stringify(p) }); setProsesPackagings(prev => [r, ...prev]); } catch(e) { console.error(e); } }}
                onUpdatePackaging={async (id, p) => { try { const r = await apiCall(`/proses-packagings/${id}`, { method: 'PUT', body: JSON.stringify(p) }); setProsesPackagings(prev => prev.map(x => x.id === id ? r : x)); } catch(e) { console.error(e); } }}
                onDeletePackaging={async (id) => { try { await apiCall(`/proses-packagings/${id}`, { method: 'DELETE' }); setProsesPackagings(prev => prev.filter(x => x.id !== id)); } catch(e) { console.error(e); } }}
                onAddProductionTarget={async (p) => { try { const r = await apiCall('/daily-production-targets', { method: 'POST', body: JSON.stringify(p) }); setDailyProductionTargets(prev => [r, ...prev.filter(x => !(x.tgl?.split('T')[0] === p.tgl && x.jenis === p.jenis))]); } catch(e) { console.error(e); } }}
                onUpdateProductionTarget={async (id, p) => { try { const r = await apiCall(`/daily-production-targets/${id}`, { method: 'PUT', body: JSON.stringify(p) }); setDailyProductionTargets(prev => prev.map(x => x.id === id ? r : x)); } catch(e) { console.error(e); } }}
                onDeleteProductionTarget={async (id) => { try { await apiCall(`/daily-production-targets/${id}`, { method: 'DELETE' }); setDailyProductionTargets(prev => prev.filter(x => x.id !== id)); } catch(e) { console.error(e); } }}
                onBulkAddRefinery={async (payloads) => { await apiCall('/proses-refineries/bulk', { method: 'POST', body: JSON.stringify({ data: payloads }) }); await fetchAllData(); }}
                onBulkAddFraksinasi={async (payloads) => { await apiCall('/proses-fraksinasis/bulk', { method: 'POST', body: JSON.stringify({ data: payloads }) }); await fetchAllData(); }}
                onBulkAddPackaging={async (payloads) => { await apiCall('/proses-packagings/bulk', { method: 'POST', body: JSON.stringify({ data: payloads }) }); await fetchAllData(); }}
              />
            )}

            {currentTab === 'sales' && (
              <SalesView
                contracts={kontrakPenjualans}
                buyers={buyers}
                products={products}
                storages={storages}
                shipments={pengirimanPenjualans}
                payments={pembayaranPenjualans}
                dailyTargets={dailySalesTargets}
                startDate={salesStartDate}
                endDate={salesEndDate}
                setStartDate={setSalesStartDate}
                setEndDate={setSalesEndDate}
                theme={theme}
                onAddSalesTarget={async (p) => { const r = await apiCall('/daily-sales-targets', { method: 'POST', body: JSON.stringify(p) }); setDailySalesTargets(prev => [r, ...prev.filter(x => x.tgl !== p.tgl)]); await fetchAllData(); }}
                onUpdateSalesTarget={async (id, p) => { const r = await apiCall(`/daily-sales-targets/${id}`, { method: 'PUT', body: JSON.stringify(p) }); setDailySalesTargets(prev => prev.map(x => x.id === id ? r : x)); await fetchAllData(); }}
                onDeleteSalesTarget={async (id) => { await apiCall(`/daily-sales-targets/${id}`, { method: 'DELETE' }); setDailySalesTargets(prev => prev.filter(x => x.id !== id)); await fetchAllData(); }}
                onAddContract={async (p) => { const r = await apiCall('/kontrak-penjualans', { method: 'POST', body: JSON.stringify(p) }); setKontrakPenjualans(prev => [r, ...prev]); await fetchAllData(); }}
                onUpdateContract={async (id, p) => { const r = await apiCall(`/kontrak-penjualans/${id}`, { method: 'PUT', body: JSON.stringify(p) }); setKontrakPenjualans(prev => prev.map(x => x.id === id ? r : x)); await fetchAllData(); }}
                onDeleteContract={async (id) => { await apiCall(`/kontrak-penjualans/${id}`, { method: 'DELETE' }); setKontrakPenjualans(prev => prev.filter(x => x.id !== id)); await fetchAllData(); }}
                onAddShipment={async (p) => { const r = await apiCall('/pengiriman-penjualans', { method: 'POST', body: JSON.stringify(p) }); setPengirimanPenjualans(prev => [r, ...prev]); await fetchAllData(); }}
                onUpdateShipment={async (id, p) => { const r = await apiCall(`/pengiriman-penjualans/${id}`, { method: 'PUT', body: JSON.stringify(p) }); setPengirimanPenjualans(prev => prev.map(x => x.id === id ? r : x)); await fetchAllData(); }}
                onDeleteShipment={async (id) => { await apiCall(`/pengiriman-penjualans/${id}`, { method: 'DELETE' }); setPengirimanPenjualans(prev => prev.filter(x => x.id !== id)); await fetchAllData(); }}
                onAddPayment={async (p) => { const r = await apiCall('/pembayaran-penjualans', { method: 'POST', body: JSON.stringify(p) }); setPembayaranPenjualans(prev => [r, ...prev]); await fetchAllData(); }}
                onUpdatePayment={async (id, p) => { const r = await apiCall(`/pembayaran-penjualans/${id}`, { method: 'PUT', body: JSON.stringify(p) }); setPembayaranPenjualans(prev => prev.map(x => x.id === id ? r : x)); await fetchAllData(); }}
                onDeletePayment={async (id) => { await apiCall(`/pembayaran-penjualans/${id}`, { method: 'DELETE' }); setPembayaranPenjualans(prev => prev.filter(x => x.id !== id)); await fetchAllData(); }}
                onBulkAddShipment={async (payloads) => { await apiCall('/pengiriman-penjualans/bulk', { method: 'POST', body: JSON.stringify({ data: payloads }) }); await fetchAllData(); }}
                onBulkAddPayment={async (payloads) => { await apiCall('/pembayaran-penjualans/bulk', { method: 'POST', body: JSON.stringify({ data: payloads }) }); await fetchAllData(); }}
                levyDuties={levyDuties}
                onAddLevyDuty={async (p) => { const r = await apiCall('/levy-duties', { method: 'POST', body: JSON.stringify(p) }); setLevyDuties(prev => [r, ...prev]); await fetchAllData(); }}
                onUpdateLevyDuty={async (id, p) => { const r = await apiCall(`/levy-duties/${id}`, { method: 'PUT', body: JSON.stringify(p) }); setLevyDuties(prev => prev.map(x => x.id === id ? r : x)); await fetchAllData(); }}
                onDeleteLevyDuty={async (id) => { await apiCall(`/levy-duties/${id}`, { method: 'DELETE' }); setLevyDuties(prev => prev.filter(x => x.id !== id)); await fetchAllData(); }}
                onBulkAddLevyDuty={async (payloads) => { await apiCall('/levy-duties/bulk', { method: 'POST', body: JSON.stringify({ data: payloads }) }); await fetchAllData(); }}
              />
            )}

            {currentTab === 'stok' && (
              <StokView
                stocks={stocks}
                products={products}
                storages={storages}
                theme={theme}
                onAddStock={async (payload) => {
                  try {
                    const res = await apiCall('/stok-produks', { method: 'POST', body: JSON.stringify(payload) });
                    setStocks(prev => [res, ...prev.filter(x => !(x.produk_id === payload.produk_id && x.storage_id === payload.storage_id))]);
                  } catch (e) {
                    console.error(e);
                  }
                }}
                onUpdateStock={async (id, payload) => {
                  try {
                    const res = await apiCall(`/stok-produks/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
                    setStocks(prev => prev.map(x => x.id === id ? res : x));
                  } catch (e) {
                    console.error(e);
                  }
                }}
                onDeleteStock={async (id) => {
                  try {
                    await apiCall(`/stok-produks/${id}`, { method: 'DELETE' });
                    setStocks(prev => prev.filter(x => x.id !== id));
                  } catch (e) {
                    console.error(e);
                  }
                }}
                onBulkAddStock={async (payloads) => { await apiCall('/stok-produks/bulk', { method: 'POST', body: JSON.stringify({ data: payloads }) }); await fetchAllData(); }}
              />
            )}

            {currentTab === 'logistics' && (
              <LogisticsView
                truckings={truckings}
                peTargets={logisticPeTargets}
                peAdditionals={logisticAdditionalPes}
                peUsages={logisticPeUsages}
                startDate={logisticsStartDate}
                endDate={logisticsEndDate}
                onStartDateChange={setLogisticsStartDate}
                onEndDateChange={setLogisticsEndDate}
                onAddTrucking={async (p) => { const r = await apiCall('/truckings', { method: 'POST', body: JSON.stringify(p) }); setTruckings(prev => [r, ...prev]); await fetchAllData(); }}
                onUpdateTrucking={async (id, p) => { const r = await apiCall(`/truckings/${id}`, { method: 'PUT', body: JSON.stringify(p) }); setTruckings(prev => prev.map(x => x.id === id ? r : x)); await fetchAllData(); }}
                onDeleteTrucking={async (id) => { await apiCall(`/truckings/${id}`, { method: 'DELETE' }); setTruckings(prev => prev.filter(x => x.id !== id)); await fetchAllData(); }}
                onBulkAddTrucking={async (payloads) => { await apiCall('/truckings/bulk', { method: 'POST', body: JSON.stringify({ data: payloads }) }); await fetchAllData(); }}
                
                onAddPeTarget={async (p) => { const r = await apiCall('/logistic-pe-targets', { method: 'POST', body: JSON.stringify(p) }); setLogisticPeTargets(prev => [r, ...prev]); await fetchAllData(); }}
                onUpdatePeTarget={async (id, p) => { const r = await apiCall(`/logistic-pe-targets/${id}`, { method: 'PUT', body: JSON.stringify(p) }); setLogisticPeTargets(prev => prev.map(x => x.id === id ? r : x)); await fetchAllData(); }}
                onDeletePeTarget={async (id) => { await apiCall(`/logistic-pe-targets/${id}`, { method: 'DELETE' }); setLogisticPeTargets(prev => prev.filter(x => x.id !== id)); await fetchAllData(); }}
                onBulkAddPeTarget={async (payloads) => { await apiCall('/logistic-pe-targets/bulk', { method: 'POST', body: JSON.stringify({ data: payloads }) }); await fetchAllData(); }}
                
                onAddPeAdditional={async (p) => { const r = await apiCall('/logistic-additional-pes', { method: 'POST', body: JSON.stringify(p) }); setLogisticAdditionalPes(prev => [r, ...prev]); await fetchAllData(); }}
                onUpdatePeAdditional={async (id, p) => { const r = await apiCall(`/logistic-additional-pes/${id}`, { method: 'PUT', body: JSON.stringify(p) }); setLogisticAdditionalPes(prev => prev.map(x => x.id === id ? r : x)); await fetchAllData(); }}
                onDeletePeAdditional={async (id) => { await apiCall(`/logistic-additional-pes/${id}`, { method: 'DELETE' }); setLogisticAdditionalPes(prev => prev.filter(x => x.id !== id)); await fetchAllData(); }}
                onBulkAddPeAdditional={async (payloads) => { await apiCall('/logistic-additional-pes/bulk', { method: 'POST', body: JSON.stringify({ data: payloads }) }); await fetchAllData(); }}
                
                onAddPeUsage={async (p) => { const r = await apiCall('/logistic-pe-usages', { method: 'POST', body: JSON.stringify(p) }); setLogisticPeUsages(prev => [r, ...prev]); await fetchAllData(); }}
                onUpdatePeUsage={async (id, p) => { const r = await apiCall(`/logistic-pe-usages/${id}`, { method: 'PUT', body: JSON.stringify(p) }); setLogisticPeUsages(prev => prev.map(x => x.id === id ? r : x)); await fetchAllData(); }}
                onDeletePeUsage={async (id) => { await apiCall(`/logistic-pe-usages/${id}`, { method: 'DELETE' }); setLogisticPeUsages(prev => prev.filter(x => x.id !== id)); await fetchAllData(); }}
                onBulkAddPeUsage={async (payloads) => { await apiCall('/logistic-pe-usages/bulk', { method: 'POST', body: JSON.stringify({ data: payloads }) }); await fetchAllData(); }}
              />
            )}

            {currentTab === 'finance' && (
              <FinanceView
                bankAccounts={bankAccounts}
                balances={balances}
                balanceChartData={balanceChartData}
                bankTransactions={bankTransactions}
                payments={payments}
                kursData={kursData}
                suppliers={suppliers}
                startDate={financeStartDate}
                endDate={financeEndDate}
                onStartDateChange={setFinanceStartDate}
                onEndDateChange={setFinanceEndDate}
                onAddBank={async (p) => { const r = await apiCall('/finance/bank-accounts', { method: 'POST', body: JSON.stringify(p) }); setBankAccounts(prev => [r, ...prev]); await fetchAllData(); }}
                onUpdateBank={async (id, p) => { const r = await apiCall(`/finance/bank-accounts/${id}`, { method: 'PUT', body: JSON.stringify(p) }); setBankAccounts(prev => prev.map(x => x.id === id ? r : x)); await fetchAllData(); }}
                onDeleteBank={async (id) => { await apiCall(`/finance/bank-accounts/${id}`, { method: 'DELETE' }); setBankAccounts(prev => prev.filter(x => x.id !== id)); await fetchAllData(); }}
                onAddBalance={async (p) => { const r = await apiCall('/finance/balances', { method: 'POST', body: JSON.stringify(p) }); setBalances(prev => [r, ...prev]); await fetchAllData(); }}
                onUpdateBalance={async (id, p) => { const r = await apiCall(`/finance/balances/${id}`, { method: 'PUT', body: JSON.stringify(p) }); setBalances(prev => prev.map(x => x.id === id ? r : x)); await fetchAllData(); }}
                onDeleteBalance={async (id) => { await apiCall(`/finance/balances/${id}`, { method: 'DELETE' }); setBalances(prev => prev.filter(x => x.id !== id)); await fetchAllData(); }}
                onAddPayment={async (p) => { const r = await apiCall('/finance/payments', { method: 'POST', body: JSON.stringify(p) }); setPayments(prev => [r, ...prev]); await fetchAllData(); }}
                onUpdatePayment={async (id, p) => { const r = await apiCall(`/finance/payments/${id}`, { method: 'PUT', body: JSON.stringify(p) }); setPayments(prev => prev.map(x => x.id === id ? r : x)); await fetchAllData(); }}
                onDeletePayment={async (id) => { await apiCall(`/finance/payments/${id}`, { method: 'DELETE' }); setPayments(prev => prev.filter(x => x.id !== id)); await fetchAllData(); }}
                
                onAddBankTransaction={async (p) => { await apiCall('/finance/bank-transactions', { method: 'POST', body: JSON.stringify(p) }); await fetchAllData(); }}
                onUpdateBankTransaction={async (id, p) => { await apiCall(`/finance/bank-transactions/${id}`, { method: 'PUT', body: JSON.stringify(p) }); await fetchAllData(); }}
                onDeleteBankTransaction={async (id) => { await apiCall(`/finance/bank-transactions/${id}`, { method: 'DELETE' }); await fetchAllData(); }}
                
                onAddPaymentHistory={async (p) => { await apiCall('/finance/payment-histories', { method: 'POST', body: JSON.stringify(p) }); await fetchAllData(); }}
                onDeletePaymentHistory={async (id) => { await apiCall(`/finance/payment-histories/${id}`, { method: 'DELETE' }); await fetchAllData(); }}
              />
            )}

            {currentTab === 'master' && (
              <MasterDataView
                suppliers={suppliers}
                onAddSupplier={handleAddSupplier}
                onUpdateSupplier={handleUpdateSupplier}
                onDeleteSupplier={async (id) => { await apiCall(`/suppliers/${id}`, { method: 'DELETE' }); setSuppliers(prev => prev.filter(x => x.id !== id)); }}
                onBulkAddSupplier={async (payloads) => { await apiCall('/suppliers/bulk', { method: 'POST', body: JSON.stringify({ data: payloads }) }); await fetchAllData(); }}
                
                storages={storages}
                onAddStorage={handleAddStorage}
                onUpdateStorage={handleUpdateStorage}
                onDeleteStorage={async (id) => { await apiCall(`/storages/${id}`, { method: 'DELETE' }); setStorages(prev => prev.filter(x => x.id !== id)); }}
                onBulkAddStorage={async (payloads) => { await apiCall('/storages/bulk', { method: 'POST', body: JSON.stringify({ data: payloads }) }); await fetchAllData(); }}
                
                products={products}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={async (id) => { await apiCall(`/master-produks/${id}`, { method: 'DELETE' }); setProducts(prev => prev.filter(x => x.id !== id)); }}
                onBulkAddProduct={async (payloads) => { await apiCall('/master-produks/bulk', { method: 'POST', body: JSON.stringify({ data: payloads }) }); await fetchAllData(); }}

                buyers={buyers}
                onAddBuyer={handleAddBuyer}
                onUpdateBuyer={handleUpdateBuyer}
                onDeleteBuyer={handleDeleteBuyer}

                bankAccounts={bankAccounts}
                onAddBank={async (p) => { try { const r = await apiCall('/finance/bank-accounts', { method: 'POST', body: JSON.stringify(p) }); setBankAccounts(prev => [r, ...prev]); } catch(e) { console.error(e); } }}
                onUpdateBank={async (id, p) => { try { const r = await apiCall(`/finance/bank-accounts/${id}`, { method: 'PUT', body: JSON.stringify(p) }); setBankAccounts(prev => prev.map(x => x.id === id ? r : x)); } catch(e) { console.error(e); } }}
                onDeleteBank={async (id) => { await apiCall(`/finance/bank-accounts/${id}`, { method: 'DELETE' }); setBankAccounts(prev => prev.filter(x => x.id !== id)); }}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
