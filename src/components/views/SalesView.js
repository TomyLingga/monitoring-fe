import React, { useState, useMemo } from 'react';
import CustomDateInput from '../ui/CustomDateInput';
import GlassCard from '../GlassCard';
import * as XLSX from 'xlsx';
import { 
  TrendingUp, Plus, Edit, Trash2, Calendar, FileText, Upload, Download, Loader2,
  DollarSign, Truck, ShoppingBag, CreditCard, ChevronLeft, ChevronRight, X, AlertTriangle, CheckCircle, Target, BarChart2
} from 'lucide-react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function SalesView({
  contracts,
  buyers,
  products,
  storages,
  shipments,
  payments,
  dailyTargets,
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  theme,
  onAddSalesTarget,
  onUpdateSalesTarget,
  onDeleteSalesTarget,
  onAddContract,
  onUpdateContract,
  onDeleteContract,
  onAddShipment,
  onUpdateShipment,
  onDeleteShipment,
  onAddPayment,
  onUpdatePayment,
  onDeletePayment,
  onBulkAddShipment,
  onBulkAddPayment,
  levyDuties = [],
  onAddLevyDuty,
  onUpdateLevyDuty,
  onDeleteLevyDuty,
  onBulkAddLevyDuty,
  bankAccounts = []
}) {
  const [activeTab, setActiveTab] = useState('contracts'); // 'contracts' | 'shipments' | 'payments' | 'levyduties'
  
  // Custom Toast & dialogs
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Pagination states
  const [contractPage, setContractPage] = useState(1);
  const [shipmentPage, setShipmentPage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const [levyDutyPage, setLevyDutyPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // Shipment filters — default: status Proses tanpa filter tanggal
  const todayStr = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0];
  const [shipFilterStart, setShipFilterStart] = useState(thirtyDaysAgo);
  const [shipFilterEnd, setShipFilterEnd] = useState(todayStr);
  const [shipFilterStatus, setShipFilterStatus] = useState('Proses');

  // Contract filters — default: status aktif
  const [contractFilterStatus, setContractFilterStatus] = useState('aktif');
  const [contractFilterStart, setContractFilterStart] = useState(thirtyDaysAgo);
  const [contractFilterEnd, setContractFilterEnd] = useState(todayStr);

  // Payment filters
  const [paymentFilterStart, setPaymentFilterStart] = useState(thirtyDaysAgo);
  const [paymentFilterEnd, setPaymentFilterEnd] = useState(todayStr);

  // Active modals
  const [activeModal, setActiveModal] = useState(null); // 'add_contract' | 'edit_contract' | 'add_shipment' | 'edit_shipment' | 'add_payment' | 'edit_payment'
  const [selectedItem, setSelectedItem] = useState(null);

  // Form states
  const [contractForm, setContractForm] = useState({
    buyer_id: '', produk_id: '', nomor_kontrak: '', jenis: 'lokal', mata_uang: 'IDR', incoterm: '',
    qty: '', harga_satuan: '', tgl_kontrak: '', tgl_jatuh_tempo: '', termin_pembayaran: 'CAD', status: 'aktif'
  });

  const [shipmentForm, setShipmentForm] = useState({
    kontrak_penjualan_id: '', qty_kirim: '', qty_terima: '', via: 'Truck Fuso',
    termin: '', status: 'Selesai', tgl: '', storage_id: '',
    create_invoice: false, nomor_invoice: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    kontrak_penjualan_id: '', invoice_id: '', bank_account_id: '', nominal: '', tgl_bayar: '', catatan: ''
  });

  const [levyDutyForm, setLevyDutyForm] = useState({
    invoice_id: '', bank_account_id: '', kapal: '', tarif: '', kurs: '', nilai_akhir: ''
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const formatRupiah = (val) => {
    if (val === undefined || val === null) return '-';
    const num = parseFloat(val) || 0;
    const isNegative = num < 0;
    const absVal = Math.abs(num);
    const formatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(absVal);
    // Remove space between Rp and number if any, then prepend minus if negative
    const cleanFormatted = formatted.replace(/^Rp\s?/, 'Rp ');
    return isNegative ? `- ${cleanFormatted}` : cleanFormatted;
  };

  // ── KPI calculations ──
  const kpis = useMemo(() => {
    const totalQtySold = contracts.reduce((sum, c) => sum + parseFloat(c.qty || 0), 0);
    const totalValue = contracts.reduce((sum, c) => sum + (parseFloat(c.qty || 0) * parseFloat(c.harga_satuan || 0)), 0);
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.nominal || 0), 0);
    const totalOustanding = Math.max(0, totalValue - totalPaid);
    const totalQtyShipped = shipments.reduce((sum, s) => sum + parseFloat(s.qty_kirim || 0), 0);
    const outstandingShipment = Math.max(0, totalQtySold - totalQtyShipped);

    return { totalQtySold, totalValue, totalPaid, totalOustanding, totalQtyShipped, outstandingShipment };
  }, [contracts, payments, shipments]);

  // ── Chart Data ──
  const chartData = useMemo(() => {
    // Generate dates between startDate and endDate
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateMap = {};

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dateMap[dateStr] = { date: dateStr, qty_kirim: 0, target_qty: 0 };
    }

    // Populate targets
    dailyTargets.forEach(t => {
      if (dateMap[t.tgl]) {
        dateMap[t.tgl].target_qty += parseFloat(t.target_qty || 0);
      }
    });

    // Populate actual shipments
    shipments.forEach(s => {
      const sDate = (s.tgl || '').split('T')[0];
      if (sDate && dateMap[sDate]) {
        dateMap[sDate].qty_kirim += parseFloat(s.qty_kirim || 0);
      }
    });

    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [startDate, endDate, dailyTargets, shipments]);

  // ── Target Form State ──
  const [targetForm, setTargetForm] = useState({ tgl: '', target_qty: '' });
  
  const openAddTarget = () => {
    setSelectedItem(null);
    setTargetForm({ tgl: new Date().toISOString().split('T')[0], target_qty: '' });
    setActiveModal('add_target');
  };

  const handleLevyDutySubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const payload = {
      ...levyDutyForm,
      invoice_id: parseInt(levyDutyForm.invoice_id),
      tarif: parseFloat(levyDutyForm.tarif || 0),
      kurs: parseFloat(levyDutyForm.kurs || 0),
      nilai_akhir: parseFloat(levyDutyForm.nilai_akhir || 0)
    };
    try {
      if (selectedItem) {
        await onUpdateLevyDuty(selectedItem.id, payload);
        showToast('Levy Duty berhasil diperbarui');
      } else {
        await onAddLevyDuty(payload);
        showToast('Levy Duty berhasil ditambahkan');
      }
      setActiveModal(null);
    } catch (err) {
      showToast('Gagal menyimpan Levy Duty', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTargetSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (selectedItem) {
        await onUpdateSalesTarget(selectedItem.id, targetForm);
        showToast('Target berhasil diperbarui');
      } else {
        await onAddSalesTarget(targetForm);
        showToast('Target berhasil ditambahkan');
      }
      setActiveModal(null);
    } catch (err) {
      showToast('Gagal menyimpan target', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Contract Modals ──
  const openAddContract = () => {
    setSelectedItem(null);
    setContractForm({
      buyer_id: buyers[0]?.id ? String(buyers[0].id) : '',
      produk_id: products[0]?.id ? String(products[0].id) : '',
      nomor_kontrak: `SALES-${new Date().getFullYear()}-00${contracts.length + 1}`,
      jenis: 'lokal', mata_uang: 'IDR', incoterm: '',
      qty: '', harga_satuan: '',
      tgl_kontrak: new Date().toISOString().split('T')[0],
      tgl_jatuh_tempo: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
      termin_pembayaran: 'CAD', status: 'aktif'
    });
    setActiveModal('add_contract');
  };

  const openEditContract = (c) => {
    setSelectedItem(c);
    setContractForm({
      buyer_id: String(c.buyer_id),
      produk_id: String(c.produk_id),
      nomor_kontrak: c.nomor_kontrak,
      jenis: c.jenis ?? 'lokal',
      mata_uang: c.mata_uang ?? 'IDR',
      incoterm: c.incoterm ?? '',
      qty: String(c.qty),
      harga_satuan: String(c.harga_satuan),
      tgl_kontrak: c.tgl_kontrak?.split('T')[0] ?? '',
      tgl_jatuh_tempo: c.tgl_jatuh_tempo?.split('T')[0] ?? '',
      termin_pembayaran: c.termin_pembayaran ?? 'CAD',
      status: c.status ?? 'aktif'
    });
    setActiveModal('edit_contract');
  };

  const handleContractSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...contractForm,
      buyer_id: parseInt(contractForm.buyer_id),
      produk_id: parseInt(contractForm.produk_id),
      qty: parseFloat(contractForm.qty),
      harga_satuan: parseFloat(contractForm.harga_satuan)
    };

    try {
      if (selectedItem) {
        await onUpdateContract(selectedItem.id, payload);
        showToast('Kontrak penjualan berhasil diperbarui', 'success');
      } else {
        await onAddContract(payload);
        showToast('Kontrak penjualan baru berhasil dibuat', 'success');
      }
      setActiveModal(null);
    } catch (err) {
      showToast('Gagal menyimpan kontrak', 'error');
    }
  };

  // ── Shipment Modals ──
  const openAddShipment = (preSelectedContract = null) => {
    setSelectedItem(null);
    const contractId = preSelectedContract ? String(preSelectedContract.id) : (contracts[0]?.id ? String(contracts[0].id) : '');
    const activeContract = contracts.find(c => String(c.id) === contractId);

    setShipmentForm({
      kontrak_penjualan_id: contractId,
      qty_kirim: activeContract ? String(activeContract.outstanding_qty || activeContract.qty) : '',
      qty_terima: '',
      via: 'Truck Fuso',
      termin: activeContract ? activeContract.termin_pembayaran : 'CAD',
      status: 'Selesai',
      tgl: new Date().toISOString().split('T')[0],
      storage_id: '',
      create_invoice: true,
      nomor_invoice: `INV-SALES-${Date.now()}`,
      nilai_invoice: ''
    });
    setActiveModal('add_shipment');
  };

  const openEditShipment = (s) => {
    setSelectedItem(s);
    setShipmentForm({
      kontrak_penjualan_id: String(s.kontrak_penjualan_id),
      qty_kirim: String(s.qty_kirim),
      qty_terima: String(s.qty_terima ?? ''),
      via: s.via ?? 'Truck Fuso',
      termin: s.termin ?? '',
      status: s.status ?? 'Selesai',
      tgl: s.tgl?.split('T')[0] ?? '',
      storage_id: s.storage_id ? String(s.storage_id) : '',
      create_invoice: false,
      nomor_invoice: '',
      nilai_invoice: ''
    });
    setActiveModal('edit_shipment');
  };

  const handleShipmentSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...shipmentForm,
      kontrak_penjualan_id: parseInt(shipmentForm.kontrak_penjualan_id),
      qty_kirim: parseFloat(shipmentForm.qty_kirim),
      qty_terima: shipmentForm.qty_terima ? parseFloat(shipmentForm.qty_terima) : parseFloat(shipmentForm.qty_kirim),
      storage_id: shipmentForm.storage_id ? parseInt(shipmentForm.storage_id) : null
    };

    try {
      if (selectedItem) {
        await onUpdateShipment(selectedItem.id, payload);
        showToast('Pengiriman penjualan berhasil diperbarui', 'success');
      } else {
        await onAddShipment(payload);
        showToast('Pengiriman penjualan baru berhasil dibuat', 'success');
      }
      setActiveModal(null);
    } catch (err) {
      showToast('Gagal menyimpan pengiriman', 'error');
    }
  };

  // ── Payment Modals ──
  const openAddPayment = (preSelectedContract = null) => {
    setSelectedItem(null);
    const contractId = preSelectedContract ? String(preSelectedContract.id) : (contracts[0]?.id ? String(contracts[0].id) : '');
    const activeContract = contracts.find(c => String(c.id) === contractId);

    setPaymentForm({
      kontrak_penjualan_id: contractId,
      invoice_id: '',
      bank_account_id: '',
      nominal: activeContract ? String(activeContract.outstanding_payment || 0) : '',
      tgl_bayar: new Date().toISOString().split('T')[0],
      catatan: 'Pembayaran angsuran kontrak'
    });
    setActiveModal('add_payment');
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...paymentForm,
      kontrak_penjualan_id: parseInt(paymentForm.kontrak_penjualan_id),
      nominal: parseFloat(paymentForm.nominal)
    };

    try {
      await onAddPayment(payload);
      showToast('Pembayaran penjualan berhasil dicatat', 'success');
      setActiveModal(null);
    } catch (err) {
      showToast('Gagal menyimpan pembayaran', 'error');
    }
  };

  // Delete helpers
  const triggerDelete = (type, item) => {
    setConfirmDialog({
      message: `Hapus ${type} ini? Tindakan ini akan mengembalikan alokasi stok produk.`,
      onConfirm: async () => {
        try {
          if (type === 'kontrak') await onDeleteContract(item.id);
          else if (type === 'pengiriman') await onDeleteShipment(item.id);
          else await onDeletePayment(item.id);
          showToast(`${type} berhasil dihapus`, 'success');
        } catch (e) {
          showToast(`Gagal menghapus ${type}`, 'error');
        }
        setConfirmDialog(null);
      }
    });
  };

  const availableInvoices = useMemo(() => {
    let invoices = [];
    shipments.forEach(s => {
      if (s.invoices && s.invoices.length > 0) {
        s.invoices.forEach(inv => {
          invoices.push({
            ...inv,
            kontrak_penjualan_id: s.kontrak_penjualan_id,
            nomor_kontrak: s.kontrakPenjualan?.nomor_kontrak
          });
        });
      }
    });
    return invoices;
  }, [shipments]);

  // Invoices from ekspor-only contracts (for Levy Duty)
  const eksplorInvoices = useMemo(() => {
    return availableInvoices.filter(inv => {
      const contract = contracts.find(c => c.id === inv.kontrak_penjualan_id);
      return contract?.jenis === 'ekspor';
    });
  }, [availableInvoices, contracts]);

  // Proyeksi pendapatan per kontrak aktif
  const proyeksiData = useMemo(() => {
    return contracts
      .filter(c => c.status === 'aktif' && parseFloat(c.outstanding_qty ?? 0) > 0)
      .map(c => ({
        ...c,
        proyeksi: parseFloat(c.proyeksi_pendapatan ?? 0)
      }))
      .sort((a, b) => b.proyeksi - a.proyeksi);
  }, [contracts]);

  const totalProyeksi = useMemo(() => proyeksiData.reduce((sum, c) => sum + c.proyeksi, 0), [proyeksiData]);

  // Filtered contracts — tanggal hanya aktif saat status bukan 'aktif'
  const filteredContracts = useMemo(() => {
    return contracts.filter(c => {
      const useDate = contractFilterStatus !== 'aktif' && contractFilterStatus !== '';
      const cDate = (c.tgl_kontrak?.split('T')[0] || '');
      const inRange = useDate ? (cDate >= contractFilterStart && cDate <= contractFilterEnd) : true;
      const inStatus = contractFilterStatus === '' || c.status === contractFilterStatus;
      return inRange && inStatus;
    });
  }, [contracts, contractFilterStatus, contractFilterStart, contractFilterEnd]);

  // Pagination filters
  const paginatedContracts = useMemo(() => {
    const start = (contractPage - 1) * ITEMS_PER_PAGE;
    return filteredContracts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredContracts, contractPage]);

  // Filtered shipments — tanggal hanya aktif saat status bukan 'Proses'
  const filteredShipments = useMemo(() => {
    return shipments.filter(s => {
      const sDate = (s.tgl?.split('T')[0] || s.tgl || '');
      const useDate = shipFilterStatus !== 'Proses';
      const inRange = useDate ? (sDate >= shipFilterStart && sDate <= shipFilterEnd) : true;
      const inStatus = shipFilterStatus === '' || s.status === shipFilterStatus;
      return inRange && inStatus;
    });
  }, [shipments, shipFilterStart, shipFilterEnd, shipFilterStatus]);

  const paginatedShipments = useMemo(() => {
    const start = (shipmentPage - 1) * ITEMS_PER_PAGE;
    return filteredShipments.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredShipments, shipmentPage]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const pDate = (p.tgl_bayar?.split('T')[0] || p.tgl_bayar || '');
      return pDate >= paymentFilterStart && pDate <= paymentFilterEnd;
    });
  }, [payments, paymentFilterStart, paymentFilterEnd]);

  const paginatedPayments = useMemo(() => {
    const start = (paymentPage - 1) * ITEMS_PER_PAGE;
    return filteredPayments.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPayments, paymentPage]);

  const paginatedLevyDuties = useMemo(() => {
    const start = (levyDutyPage - 1) * ITEMS_PER_PAGE;
    return levyDuties.slice(start, start + ITEMS_PER_PAGE);
  }, [levyDuties, levyDutyPage]);

  // ── Excel Templates & Import ──
  const downloadShipmentTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['nomor_kontrak', 'qty_kirim', 'qty_terima', 'via', 'incoterm', 'termin', 'status', 'tgl', 'nomor_invoice', 'nilai_invoice'],
      ['SALES-2026-001', 250000, 250000, 'Truck Fuso', 'LOCO', 'CAD', 'Selesai', new Date().toISOString().split('T')[0], `INV-SALES-${Date.now()}`, '4125000000'],
      ['SALES-2026-002', 100000, 100000, 'Kapal Tanker', 'CIF', 'CAD', 'Proses', new Date().toISOString().split('T')[0], '', ''],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Pengiriman');
    XLSX.writeFile(wb, 'template_pengiriman_penjualan.xlsx');
    showToast('Template pengiriman berhasil diunduh');
  };

  const downloadPaymentTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['nomor_kontrak', 'nominal', 'tgl_bayar', 'catatan'],
      ['SALES-2026-001', 5000000000, new Date().toISOString().split('T')[0], 'Pembayaran DP'],
      ['SALES-2026-002', 2500000000, new Date().toISOString().split('T')[0], 'Pelunasan'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Pembayaran');
    XLSX.writeFile(wb, 'template_penerimaan_pembayaran.xlsx');
    showToast('Template pembayaran berhasil diunduh');
  };

  const downloadLevyDutyTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['nomor_invoice', 'kapal', 'tarif', 'kurs', 'nilai_akhir'],
      ['INV-SALES-001', 'MT. GLORY', 200, 16000, 3200000],
      ['INV-SALES-002', 'MT. OMEGA', 150, 15500, 2325000],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Levy Duty');
    XLSX.writeFile(wb, 'template_levy_duty.xlsx');
    showToast('Template Levy Duty berhasil diunduh');
  };

  const handleImportShipment = (e) => {
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
          const contract = contracts.find(c => c.nomor_kontrak === String(row.nomor_kontrak || '').trim());
          if (!contract) throw new Error(`Kontrak ${row.nomor_kontrak} tidak ditemukan.`);
          let tglVal = row.tgl;
          if (typeof tglVal === 'number') tglVal = new Date((tglVal - 25569) * 86400000).toISOString().split('T')[0];
          else tglVal = String(tglVal || '').trim();
          
          payloads.push({
            kontrak_penjualan_id: contract.id,
            qty_kirim: parseFloat(row.qty_kirim || 0),
            qty_terima: parseFloat(row.qty_terima || row.qty_kirim || 0),
            via: row.via || 'Truck Fuso',
            incoterm: row.incoterm || 'LOCO',
            termin: row.termin || 'CAD',
            status: row.status || 'Selesai',
            tgl: tglVal,
            storage_id: null,
            create_invoice: !!row.nomor_invoice,
            nomor_invoice: row.nomor_invoice || '',
            nilai_invoice: row.nilai_invoice ? parseFloat(String(row.nilai_invoice).replace(/[^0-9.]/g, '')) : null
          });
        }
        
        await onBulkAddShipment(payloads);
        showToast(`Import pengiriman: ${payloads.length} baris berhasil diproses`, 'success');
      } catch (err) {
        console.error('Import error:', err);
        showToast(err.message || 'Gagal mengimpor file: Format kolom salah', 'error');
      }
      e.target.value = null;
    };
    reader.readAsBinaryString(file);
  };

  const handleImportPayment = (e) => {
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
          const contract = contracts.find(c => c.nomor_kontrak === String(row.nomor_kontrak || '').trim());
          if (!contract) throw new Error(`Kontrak ${row.nomor_kontrak} tidak ditemukan.`);
          let tglVal = row.tgl_bayar;
          if (typeof tglVal === 'number') tglVal = new Date((tglVal - 25569) * 86400000).toISOString().split('T')[0];
          else tglVal = String(tglVal || '').trim();
          
          payloads.push({
            kontrak_penjualan_id: contract.id,
            nominal: parseFloat(String(row.nominal || '0').replace(/[^0-9.]/g, '')),
            tgl_bayar: tglVal,
            catatan: row.catatan || ''
          });
        }
        
        await onBulkAddPayment(payloads);
        showToast(`Import pembayaran: ${payloads.length} baris berhasil diproses`, 'success');
      } catch (err) {
        showToast(err.message || 'Gagal membaca file Excel', 'error');
      }
      e.target.value = null;
    };
    reader.readAsBinaryString(file);
  };

  const handleImportLevyDuty = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        if (!rows.length) { showToast('File kosong', 'error'); return; }
        const payloads = [];
        
        // Buat map invoice_number -> invoice_id dengan menelusuri pengiriman_penjualans
        const invoiceMap = {};
        shipments.forEach(s => {
          if (s.invoices && s.invoices.length > 0) {
            s.invoices.forEach(inv => {
              invoiceMap[inv.nomor_invoice] = inv.id;
            });
          }
        });

        for (const row of rows) {
          const invId = invoiceMap[String(row.nomor_invoice || '').trim()];
          if (!invId) throw new Error(`Invoice ${row.nomor_invoice} tidak ditemukan.`);
          
          let t = parseFloat(row.tarif || 0);
          let k = parseFloat(row.kurs || 0);
          let na = row.nilai_akhir !== undefined ? parseFloat(row.nilai_akhir) : (t * k);
          
          payloads.push({
            invoice_id: invId,
            kapal: row.kapal || '',
            tarif: t,
            kurs: k,
            nilai_akhir: na
          });
        }
        
        await onBulkAddLevyDuty(payloads);
        showToast(`Import Levy Duty: ${payloads.length} baris berhasil diproses`, 'success');
      } catch (err) {
        showToast(err.message || 'Gagal membaca file Excel', 'error');
      }
      e.target.value = null;
    };
    reader.readAsBinaryString(file);
  };

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

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard className="p-4 flex items-center space-x-4 border-l-4 border-l-teal-500" hover={false}>
          <div className="p-3 rounded-xl bg-teal-500/10 text-teal-400"><ShoppingBag className="h-5 w-5" /></div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total Nilai Kontrak</p>
            <h4 className="text-sm font-black text-white">{formatRupiah(kpis.totalValue)}</h4>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center space-x-4 border-l-4 border-l-emerald-500" hover={false}>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400"><DollarSign className="h-5 w-5" /></div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Pembayaran Diterima</p>
            <h4 className="text-sm font-black text-white">{formatRupiah(kpis.totalPaid)}</h4>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center space-x-4 border-l-4 border-l-amber-500" hover={false}>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400"><CreditCard className="h-5 w-5" /></div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Piutang Dagang</p>
            <h4 className="text-sm font-black text-white">{formatRupiah(kpis.totalOustanding)}</h4>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center space-x-4 border-l-4 border-l-sky-500" hover={false}>
          <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400"><Truck className="h-5 w-5" /></div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total Qty Dikirim</p>
            <h4 className="text-sm font-black text-white">{kpis.totalQtyShipped.toLocaleString('id-ID')} Kg</h4>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center space-x-4 border-l-4 border-l-rose-500" hover={false}>
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400"><AlertTriangle className="h-5 w-5" /></div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Outstanding Pengiriman</p>
            <h4 className="text-sm font-black text-white">{kpis.outstandingShipment.toLocaleString('id-ID')} Kg</h4>
          </div>
        </GlassCard>
      </div>

      {/* Tabs list navigation */}
      <div className="flex space-x-2 border-b border-slate-800 pb-px">
        <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
          activeTab === 'dashboard' ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-white'
        }`}>Dashboard Sales</button>
        <button onClick={() => setActiveTab('contracts')} className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
          activeTab === 'contracts' ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-white'
        }`}>Kontrak Penjualan</button>
        <button onClick={() => setActiveTab('shipments')} className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
          activeTab === 'shipments' ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-white'
        }`}>Pengiriman Penjualan</button>
        <button onClick={() => setActiveTab('payments')} className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
          activeTab === 'payments' ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-white'
        }`}>Daftar Penerimaan Pembayaran</button>
        <button onClick={() => setActiveTab('levyduties')} className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
          activeTab === 'levyduties' ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-white'
        }`}>Pembayaran Levy Duty</button>
      </div>

      {/* Tab: Dashboard Sales */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-fade-in">
          {/* Chart Header Filter */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900/60 p-4 rounded-2xl border border-slate-800 gap-4">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-5 w-5 text-teal-400" />
              <div>
                <h3 className="text-sm font-black text-white">Trend Penjualan Harian</h3>
                <p className="text-[10px] text-slate-400">Perbandingan realisasi pengiriman dengan target harian</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <CustomDateInput value={startDate} onChange={setStartDate} className="w-32" />
              <span className="text-slate-500 font-bold">s/d</span>
              <CustomDateInput value={endDate} onChange={setEndDate} className="w-32" />
            </div>
          </div>

          {/* Achievement Summary Cards */}
          {(() => {
            const totalTarget = chartData.reduce((s, d) => s + d.target_qty, 0);
            const totalRealisasi = chartData.reduce((s, d) => s + d.qty_kirim, 0);
            const pct = totalTarget > 0 ? Math.min(100, Math.round((totalRealisasi / totalTarget) * 100)) : 0;
            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <GlassCard className="p-4 border-l-4 border-l-rose-500" hover={false}>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Target Periode</p>
                  <p className="mt-1 text-xl font-black text-white">{totalTarget.toLocaleString('id-ID')} <span className="text-xs font-normal text-slate-400">Kg</span></p>
                  <p className="text-[10px] text-slate-500 mt-1">Total target {dailyTargets.length} hari dalam rentang periode</p>
                </GlassCard>
                <GlassCard className="p-4 border-l-4 border-l-teal-500" hover={false}>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Realisasi Pengiriman</p>
                  <p className="mt-1 text-xl font-black text-teal-400">{totalRealisasi.toLocaleString('id-ID')} <span className="text-xs font-normal text-slate-400">Kg</span></p>
                  <p className="text-[10px] text-slate-500 mt-1">{shipments.length} pengiriman dalam periode ini</p>
                </GlassCard>
                <GlassCard className="p-4" hover={false}>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Pencapaian Penjualan</p>
                  <p className={`mt-1 text-2xl font-black ${pct >= 100 ? 'text-teal-400' : pct >= 70 ? 'text-amber-400' : 'text-rose-400'}`}>{pct}%</p>
                  <div className="mt-2 w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${pct >= 100 ? 'bg-gradient-to-r from-teal-500 to-emerald-400' : pct >= 70 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-gradient-to-r from-red-500 to-rose-400'}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </GlassCard>
              </div>
            );
          })()}

          {/* Chart */}
          <GlassCard className="p-6" hover={false}>
            <div className="flex items-center space-x-3 mb-4 pb-4 border-b border-slate-800">
              <BarChart2 className="h-5 w-5 text-sky-400" />
              <h4 className="text-sm font-bold text-white">Grafik Target vs Aktual Pengiriman</h4>
              <div className="ml-auto flex items-center space-x-4 text-xs">
                <span className="flex items-center space-x-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-rose-500/80"></span><span className="text-slate-400">Target</span></span>
                <span className="flex items-center space-x-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-teal-500/80"></span><span className="text-slate-400">Aktual Kirim</span></span>
              </div>
            </div>
            {chartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-500 italic text-xs">Tidak ada data dalam periode ini</div>
            ) : (
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }} barCategoryGap="30%">
                    <defs>
                      <linearGradient id="salesTargetGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.9}/>
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.5}/>
                      </linearGradient>
                      <linearGradient id="salesActualGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.9}/>
                        <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.5}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="date" stroke="#475569" fontSize={11} tickMargin={8}
                      tickFormatter={v => v.slice(5)} />
                    <YAxis stroke="#475569" fontSize={11} width={50}
                      tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', borderColor: '#334155', borderRadius: '10px', fontSize: '11px' }}
                      itemStyle={{ color: '#e2e8f0' }}
                      labelStyle={{ color: '#94a3b8', fontWeight: 700 }}
                      formatter={(value, name) => [`${value.toLocaleString('id-ID')} Kg`, name]}
                    />
                    <Bar dataKey="target_qty" name="Target Harian (Kg)" fill="url(#salesTargetGrad)" radius={[4,4,0,0]} />
                    <Bar dataKey="qty_kirim" name="Aktual Dikirim (Kg)" fill="url(#salesActualGrad)" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </GlassCard>

          {/* Daily Targets List */}
          <GlassCard hover={false}>
            <div className="flex justify-between items-center p-5 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <Target className="h-5 w-5 text-rose-400" />
                <h3 className="font-bold text-white">Target Penjualan Harian</h3>
              </div>
              <button onClick={openAddTarget} className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg glass-button-primary text-xs font-bold">
                <Plus className="h-3.5 w-3.5" />
                <span>Set Target</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/50 text-slate-400 uppercase font-bold">
                  <tr>
                    <th className="px-4 py-3 border-b border-slate-800">Tanggal</th>
                    <th className="px-4 py-3 border-b border-slate-800 text-right">Target Qty (Kg)</th>
                    <th className="px-4 py-3 border-b border-slate-800 text-right">Realisasi (Kg)</th>
                    <th className="px-4 py-3 border-b border-slate-800 text-right">Pencapaian</th>
                    <th className="px-4 py-3 border-b border-slate-800 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {dailyTargets.map(t => {
                    const realisasiDay = shipments
                      .filter(s => (s.tgl?.split('T')[0] || s.tgl) === (t.tgl?.split('T')[0] || t.tgl))
                      .reduce((sum, s) => sum + parseFloat(s.qty_kirim || 0), 0);
                    const pct = parseFloat(t.target_qty) > 0 ? Math.min(100, Math.round((realisasiDay / parseFloat(t.target_qty)) * 100)) : 0;
                    return (
                      <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-white">{t.tgl}</td>
                        <td className="px-4 py-3 text-white text-right font-semibold">{parseFloat(t.target_qty).toLocaleString('id-ID')}</td>
                        <td className="px-4 py-3 text-teal-400 text-right font-semibold">{realisasiDay.toLocaleString('id-ID')}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold text-xs ${pct >= 100 ? 'text-teal-400' : pct >= 70 ? 'text-amber-400' : 'text-rose-400'}`}>{pct}%</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => { setSelectedItem(t); setTargetForm({ tgl: t.tgl, target_qty: t.target_qty }); setActiveModal('edit_target'); }} className="p-1 text-slate-400 hover:text-teal-400 transition-colors mr-2"><Edit className="h-4 w-4" /></button>
                          <button onClick={() => setConfirmDialog({ message: 'Hapus target penjualan ini?', onConfirm: async () => { await onDeleteSalesTarget(t.id); setConfirmDialog(null); } })} className="p-1 text-slate-400 hover:text-red-400 transition-colors"><Trash2 className="h-4 w-4" /></button>
                        </td>
                      </tr>
                    );
                  })}
                  {dailyTargets.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-4 py-6 text-center text-slate-500 italic">Belum ada target penjualan untuk rentang tanggal ini.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Tab: Kontrak Penjualan */}
      {activeTab === 'contracts' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 bg-slate-900/60 px-4 py-3 rounded-2xl border border-slate-800">
            {/* Filter tanggal hanya muncul saat status bukan aktif */}
            {contractFilterStatus !== 'aktif' && contractFilterStatus !== '' && (
              <>
                <CustomDateInput value={contractFilterStart} onChange={setContractFilterStart} className="w-32" />
                <span className="text-slate-500 font-bold text-xs">s/d</span>
                <CustomDateInput value={contractFilterEnd} onChange={setContractFilterEnd} className="w-32" />
              </>
            )}
            <select
              value={contractFilterStatus}
              onChange={e => { setContractFilterStatus(e.target.value); setContractPage(1); }}
              className="px-3 py-1.5 rounded-lg glass-input text-xs"
            >
              <option value="aktif">Aktif</option>
              <option value="selesai">Selesai</option>
              <option value="">Semua Status</option>
            </select>
            <div className="ml-auto">
              <button onClick={openAddContract} className="flex items-center space-x-1.5 px-4 py-2 rounded-xl glass-button-primary text-xs font-bold"><Plus className="h-4 w-4" /><span>Buat Kontrak Penjualan</span></button>
            </div>
          </div>
          <GlassCard className="overflow-hidden" hover={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Nomor Kontrak</th>
                    <th className="py-3 px-4">Buyer / Customer</th>
                    <th className="py-3 px-4">Produk</th>
                    <th className="py-3 px-4 text-right">Kuantitas (Qty)</th>
                    <th className="py-3 px-4 text-right">Harga Satuan</th>
                    <th className="py-3 px-4 text-right">Total Nilai</th>
                    <th className="py-3 px-4 text-right">Terkirim</th>
                    <th className="py-3 px-4 text-right text-sky-400">Sisa Kirim</th>
                    <th className="py-3 px-4 text-right">Terbayar</th>
                    <th className="py-3 px-4 text-right text-rose-400">Sisa Bayar</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paginatedContracts.map((c) => {
                    const outstanding = Math.max(0, c.qty - c.total_terkirim);
                    const outstandingPayment = (c.qty * c.harga_satuan) - c.total_terbayar;
                    return (
                      <tr key={c.id} className="hover:bg-slate-900/40 transition-colors align-middle">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{c.nomor_kontrak}</div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${
                              c.jenis === 'ekspor' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}>{c.jenis ?? 'lokal'}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${
                              c.mata_uang === 'USD' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                            }`}>{c.mata_uang ?? 'IDR'}</span>
                            {c.incoterm && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold border bg-violet-500/10 text-violet-400 border-violet-500/20">{c.incoterm}</span>}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-300">{c.buyer?.nama ?? 'N/A'}</td>
                        <td className="py-3 px-4 text-teal-400 font-bold">{c.produk?.nama_produk ?? 'N/A'}</td>
                        <td className="py-3 px-4 text-right text-white font-black">{parseFloat(c.qty).toLocaleString('id-ID')} {c.produk?.satuan ?? 'Kg'}</td>
                        <td className="py-3 px-4 text-right text-slate-300">{c.mata_uang === 'USD' ? `$${parseFloat(c.harga_satuan).toLocaleString('en-US')}` : formatRupiah(c.harga_satuan)}</td>
                        <td className="py-3 px-4 text-right text-emerald-400 font-black">{c.mata_uang === 'USD' ? `$${parseFloat(c.total_nilai_kontrak).toLocaleString('en-US')}` : formatRupiah(c.total_nilai_kontrak)}</td>
                        <td className="py-3 px-4 text-right text-sky-400 font-bold">{c.total_terkirim.toLocaleString('id-ID')}</td>
                        <td className="py-3 px-4 text-right font-bold">
                          <span className={outstanding > 0 ? 'text-amber-400' : 'text-slate-500'}>{outstanding.toLocaleString('id-ID')}</span>
                        </td>
                        <td className="py-3 px-4 text-right text-teal-300 font-bold">{formatRupiah(c.total_terbayar)}</td>
                        <td className="py-3 px-4 text-right font-bold whitespace-nowrap">
                          <span className={outstandingPayment > 0 ? 'text-rose-400' : 'text-emerald-400'}>{formatRupiah(outstandingPayment)}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            c.status === 'aktif'   ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' :
                            c.status === 'selesai' ? 'bg-slate-500/20 text-slate-600 dark:text-slate-400 border border-slate-400/30 dark:border-slate-600/30' :
                                                     'bg-red-500/10 text-red-500 border border-red-400/30'
                          }`}>{c.status}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button onClick={() => openAddShipment(c)} disabled={outstanding <= 0} className="px-2 py-1 rounded bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 text-[10px] font-bold disabled:opacity-30 disabled:pointer-events-none" title="Kirim Barang">Kirim</button>
                            <button onClick={() => openAddPayment(c)} disabled={c.outstanding_payment <= 0} className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-bold disabled:opacity-30 disabled:pointer-events-none" title="Catat Pembayaran">Bayar</button>
                            <button onClick={() => openEditContract(c)} className="p-1 rounded bg-slate-900 text-slate-400 hover:text-teal-400 border border-slate-800 transition-colors"><Edit className="h-3.5 w-3.5" /></button>
                            <button onClick={() => triggerDelete('kontrak', c)} className="p-1 rounded bg-slate-900 text-slate-400 hover:text-red-400 border border-slate-800 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedContracts.length === 0 && (
                    <tr><td colSpan={12} className="py-8 text-center text-slate-500 italic">Belum ada kontrak penjualan</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {filteredContracts.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between p-4 border-t border-slate-800 text-xs">
                <span className="text-slate-400 font-bold">Total {filteredContracts.length} kontrak</span>
                <div className="flex items-center space-x-2">
                  <button onClick={() => setContractPage(p => Math.max(1, p - 1))} disabled={contractPage === 1} className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 disabled:opacity-35"><ChevronLeft className="h-4 w-4" /></button>
                  <span className="text-white font-bold">Hal {contractPage} / {Math.ceil(filteredContracts.length / ITEMS_PER_PAGE)}</span>
                  <button onClick={() => setContractPage(p => Math.min(Math.ceil(filteredContracts.length / ITEMS_PER_PAGE), p + 1))} disabled={contractPage === Math.ceil(filteredContracts.length / ITEMS_PER_PAGE)} className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 disabled:opacity-35"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Proyeksi Pendapatan Penjualan */}
          <GlassCard hover={false}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <BarChart2 className="h-5 w-5 text-violet-400" />
                <div>
                  <h3 className="text-sm font-black text-white">Proyeksi Pendapatan Penjualan</h3>
                  <p className="text-[10px] text-slate-400">Estimasi pendapatan dari outstanding qty kontrak aktif</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase font-bold">Total Proyeksi</p>
                <p className="text-lg font-black text-violet-400">{formatRupiah(totalProyeksi)}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Nomor Kontrak</th>
                    <th className="py-3 px-4">Buyer</th>
                    <th className="py-3 px-4">Produk</th>
                    <th className="py-3 px-4 text-center">Jenis</th>
                    <th className="py-3 px-4 text-center">Mata Uang</th>
                    <th className="py-3 px-4 text-right">Harga Satuan</th>
                    <th className="py-3 px-4 text-right">Qty Outstanding</th>
                    <th className="py-3 px-4 text-right text-violet-400">Proyeksi Nilai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {proyeksiData.map(c => (
                    <tr key={c.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-white">{c.nomor_kontrak}</td>
                      <td className="py-3 px-4 text-slate-300">{c.buyer?.nama ?? 'N/A'}</td>
                      <td className="py-3 px-4 text-teal-400 font-bold">{c.produk?.nama_produk ?? 'N/A'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                          c.jenis === 'ekspor' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>{c.jenis ?? 'lokal'}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                          c.mata_uang === 'USD' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}>{c.mata_uang ?? 'IDR'}</span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        {c.mata_uang === 'USD' ? `$${parseFloat(c.harga_satuan).toLocaleString('en-US')}` : formatRupiah(c.harga_satuan)}
                      </td>
                      <td className="py-3 px-4 text-right text-amber-400 font-bold">{parseFloat(c.outstanding_qty ?? 0).toLocaleString('id-ID')} Kg</td>
                      <td className="py-3 px-4 text-right font-black text-violet-400">
                        {c.mata_uang === 'USD' ? `$${parseFloat(c.proyeksi).toLocaleString('en-US')}` : formatRupiah(c.proyeksi)}
                      </td>
                    </tr>
                  ))}
                  {proyeksiData.length === 0 && (
                    <tr><td colSpan={8} className="py-8 text-center text-slate-500 italic">Tidak ada outstanding kontrak aktif</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Tab: Pengiriman Penjualan */}
      {activeTab === 'shipments' && (
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-900/60 px-4 py-3 rounded-2xl border border-slate-800">
            {/* Filter tanggal hanya muncul saat status bukan Proses */}
            {shipFilterStatus !== 'Proses' && (
              <>
                <CustomDateInput value={shipFilterStart} onChange={setShipFilterStart} className="w-32" />
                <span className="text-slate-500 font-bold text-xs">s/d</span>
                <CustomDateInput value={shipFilterEnd} onChange={setShipFilterEnd} className="w-32" />
              </>
            )}
            <select value={shipFilterStatus} onChange={e => { setShipFilterStatus(e.target.value); setShipmentPage(1); }} className="px-3 py-1.5 rounded-lg glass-input text-xs">
              <option value="Proses">Proses</option>
              <option value="Selesai">Selesai</option>
              <option value="">Semua Status</option>
            </select>
            <div className="ml-auto flex items-center gap-2">
              <button onClick={downloadShipmentTemplate} className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-bold transition-colors">
                <Download className="h-3.5 w-3.5" /><span>Template Excel</span>
              </button>
              <label className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-bold transition-colors cursor-pointer">
                <Upload className="h-3.5 w-3.5" /><span>Import Excel</span>
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportShipment} className="hidden" />
              </label>
              <button onClick={() => openAddShipment(null)} className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg glass-button-primary text-xs font-bold">
                <Plus className="h-3.5 w-3.5" /><span>Buat Pengiriman</span>
              </button>
            </div>
          </div>
          <GlassCard className="overflow-hidden" hover={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">Tanggal</th>
                    <th className="py-3 px-3">Nomor Kontrak</th>
                    <th className="py-3 px-3">Buyer</th>
                    <th className="py-3 px-3">Produk</th>
                    <th className="py-3 px-3">Storage Sumber</th>
                    <th className="py-3 px-3 text-right">Qty Kirim</th>
                    <th className="py-3 px-3 text-right">Qty Terima</th>
                    <th className="py-3 px-3 text-right text-rose-400">Ots. Kirim</th>
                    <th className="py-3 px-3 text-right text-amber-400">Ots. Bayar</th>
                    <th className="py-3 px-3 text-center">Via</th>
                    <th className="py-3 px-3 text-center">Incoterm</th>
                    <th className="py-3 px-3">Termin</th>
                    <th className="py-3 px-3">Nomor Invoice</th>
                    <th className="py-3 px-3 text-right">Nilai Invoice</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paginatedShipments.map((s) => {
                    const invoice = s.invoices?.[0];
                    const contract = s.kontrak_penjualan;
                    const outstandingShipment = contract ? Math.max(0, parseFloat(contract.qty || 0) - parseFloat(contract.total_terkirim || 0)) : 0;
                    const outstandingPayment = contract ? Math.max(0, parseFloat(contract.total_nilai_kontrak || 0) - parseFloat(contract.total_terbayar || 0)) : 0;
                    const storage = s.storage;
                    
                    return (
                      <tr key={s.id} className="hover:bg-slate-900/40 transition-colors align-middle">
                        <td className="py-3 px-3 text-slate-300 font-semibold whitespace-nowrap text-[11px]">
                          {s.tgl ? new Date(s.tgl).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        </td>
                        <td className="py-3 px-3 font-bold text-teal-400 font-mono text-[11px]">{s.kontrak_penjualan?.nomor_kontrak ?? 'N/A'}</td>
                        <td className="py-3 px-3 font-semibold text-white max-w-[120px] truncate" title={s.kontrak_penjualan?.buyer?.nama}>{s.kontrak_penjualan?.buyer?.nama ?? 'N/A'}</td>
                        <td className="py-3 px-3 text-sky-400 font-bold">{s.kontrak_penjualan?.produk?.kode_produk ?? s.kontrak_penjualan?.produk?.nama_produk ?? 'N/A'}</td>
                        <td className="py-3 px-3">
                          {storage ? (
                            <div className="flex flex-col">
                              <span className="text-white font-bold text-[11px]">{storage.nama}</span>
                              <span className="text-slate-500 text-[9px]">{storage.lokasi}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic text-[10px]">Auto</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right text-white font-black">{parseFloat(s.qty_kirim).toLocaleString('id-ID')}</td>
                        <td className="py-3 px-3 text-right text-emerald-400 font-bold">{parseFloat(s.qty_terima || s.qty_kirim).toLocaleString('id-ID')}</td>
                        <td className="py-3 px-3 text-right font-extrabold">
                          <span className={outstandingShipment > 0 ? 'text-rose-400' : 'text-slate-600'}>{outstandingShipment.toLocaleString('id-ID')}</span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold whitespace-nowrap">
                          <span className={outstandingPayment > 0 ? 'text-amber-400' : 'text-slate-600'}>{formatRupiah(outstandingPayment)}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-900/60 border border-slate-800 text-slate-400 font-semibold text-[10px]">
                            {s.via === 'Kapal Tanker' && '🚢'}
                            {s.via === 'Truck Fuso' && '🚛'}
                            {s.via !== 'Kapal Tanker' && s.via !== 'Truck Fuso' && '🚚'}
                            <span className="ml-1">{s.via ?? '-'}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            s.incoterm === 'FRANCO' ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' : 'bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
                          }`}>
                            {s.incoterm ?? 'LOCO'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-400 font-bold text-[10px]">{s.termin ?? 'CAD'}</td>
                        <td className="py-3 px-3 text-slate-300 font-mono text-[10px]">{invoice?.nomor_invoice ?? '-'}</td>
                        <td className="py-3 px-3 text-right text-amber-400 font-bold whitespace-nowrap">{invoice?.nilai ? formatRupiah(invoice.nilai) : '-'}</td>
                        <td className="py-3 px-3 text-center">
                          <button 
                            onClick={() => onUpdateShipment(s.id, { ...s, status: s.status === 'Selesai' ? 'Proses' : 'Selesai', kontrak_penjualan_id: s.kontrak_penjualan_id })}
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-all hover:scale-105 cursor-pointer ${
                              s.status === 'Selesai' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20'
                            }`}
                            title="Klik untuk toggle status"
                          >
                            {s.status}
                          </button>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button onClick={() => openEditShipment(s)} className="p-1 rounded bg-slate-900 text-slate-400 hover:text-teal-400 border border-slate-800 transition-colors" title="Edit"><Edit className="h-3.5 w-3.5" /></button>
                            <button onClick={() => triggerDelete('pengiriman', s)} className="p-1 rounded bg-slate-900 text-slate-400 hover:text-red-400 border border-slate-800 transition-colors" title="Hapus"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedShipments.length === 0 && (
                    <tr><td colSpan={16} className="py-8 text-center text-slate-500 italic">Belum ada data pengiriman</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {shipments.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between p-4 border-t border-slate-800 text-xs">
                <span className="text-slate-400 font-bold">Total {shipments.length} pengiriman</span>
                <div className="flex items-center space-x-2">
                  <button onClick={() => setShipmentPage(p => Math.max(1, p - 1))} disabled={shipmentPage === 1} className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 disabled:opacity-35"><ChevronLeft className="h-4 w-4" /></button>
                  <span className="text-white font-bold">Hal {shipmentPage} / {Math.ceil(shipments.length / ITEMS_PER_PAGE)}</span>
                  <button onClick={() => setShipmentPage(p => Math.min(Math.ceil(shipments.length / ITEMS_PER_PAGE), p + 1))} disabled={shipmentPage === Math.ceil(shipments.length / ITEMS_PER_PAGE)} className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 disabled:opacity-35"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* Tab: Pembayaran Penjualan */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 bg-slate-900/60 px-4 py-3 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 font-bold">Penerimaan Pembayaran</span>
            
            {/* Date Range Filter */}
            <div className="flex items-center space-x-2">
              <CustomDateInput value={paymentFilterStart} onChange={setPaymentFilterStart} className="w-32" />
              <span className="text-slate-500 font-bold text-xs">s/d</span>
              <CustomDateInput value={paymentFilterEnd} onChange={setPaymentFilterEnd} className="w-32" />
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button onClick={() => openAddPayment(null)} className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg glass-button-primary text-xs font-bold">
                <Plus className="h-3.5 w-3.5" /><span>Catat Pembayaran Baru</span>
              </button>
            </div>
          </div>
          <GlassCard className="overflow-hidden" hover={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Tanggal Bayar</th>
                    <th className="py-3 px-4">Nomor Kontrak</th>
                    <th className="py-3 px-4">Buyer / Customer</th>
                    <th className="py-3 px-4 text-right">Nominal Diterima</th>
                    <th className="py-3 px-4">Catatan</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paginatedPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-900/40 transition-colors align-middle">
                      <td className="py-3 px-4 text-slate-400 font-semibold">{p.tgl_bayar ? new Date(p.tgl_bayar).toLocaleDateString('id-ID') : '-'}</td>
                      <td className="py-3 px-4 font-bold text-white">{p.kontrak_penjualan?.nomor_kontrak ?? 'N/A'}</td>
                      <td className="py-3 px-4 font-semibold text-slate-350">{p.kontrak_penjualan?.buyer?.nama ?? 'N/A'}</td>
                      <td className="py-3 px-4 text-right text-emerald-450 font-black">{formatRupiah(p.nominal)}</td>
                      <td className="py-3 px-4 text-slate-400">{p.catatan ?? '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <button onClick={() => triggerDelete('pembayaran', p)} className="p-1 rounded bg-slate-900 text-slate-400 hover:text-red-400 border border-slate-800 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                      </td>
                    </tr>
                  ))}
                  {paginatedPayments.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-slate-500 italic">Belum ada penerimaan pembayaran</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {filteredPayments.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between p-4 border-t border-slate-800 text-xs">
                <span className="text-slate-400 font-bold">Total {filteredPayments.length} transaksi</span>
                <div className="flex items-center space-x-2">
                  <button onClick={() => setPaymentPage(p => Math.max(1, p - 1))} disabled={paymentPage === 1} className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 disabled:opacity-35"><ChevronLeft className="h-4 w-4" /></button>
                  <span className="text-white font-bold">Hal {paymentPage} / {Math.ceil(filteredPayments.length / ITEMS_PER_PAGE)}</span>
                  <button onClick={() => setPaymentPage(p => Math.min(Math.ceil(filteredPayments.length / ITEMS_PER_PAGE), p + 1))} disabled={paymentPage === Math.ceil(filteredPayments.length / ITEMS_PER_PAGE)} className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 disabled:opacity-35"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* Tab: Pembayaran Levy Duty */}
      {activeTab === 'levyduties' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 bg-slate-900/60 px-4 py-3 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 font-bold">Daftar Pembayaran Levy Duty</span>
            <div className="ml-auto flex items-center gap-2">
              <button onClick={downloadLevyDutyTemplate} className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-bold transition-colors">
                <Download className="h-3.5 w-3.5" /><span>Template Excel</span>
              </button>
              <label className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-bold transition-colors cursor-pointer">
                <Upload className="h-3.5 w-3.5" /><span>Import Excel</span>
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportLevyDuty} className="hidden" />
              </label>
              <button onClick={() => { setSelectedItem(null); setLevyDutyForm({ invoice_id: '', kapal: '', tarif: '', kurs: '', nilai_akhir: '' }); setActiveModal('add_levyduty'); }} className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg glass-button-primary text-xs font-bold">
                <Plus className="h-3.5 w-3.5" /><span>Catat Levy Duty</span>
              </button>
            </div>
          </div>
          <GlassCard className="overflow-hidden" hover={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Invoice</th>
                    <th className="py-3 px-4">Kapal</th>
                    <th className="py-3 px-4 text-right">Tarif</th>
                    <th className="py-3 px-4 text-right">Kurs</th>
                    <th className="py-3 px-4 text-right">Nilai Akhir</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paginatedLevyDuties.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-900/40 transition-colors align-middle">
                      <td className="py-3 px-4 font-bold text-white">{l.invoice?.nomor_invoice ?? 'N/A'}</td>
                      <td className="py-3 px-4 font-semibold text-slate-350">{l.kapal ?? '-'}</td>
                      <td className="py-3 px-4 text-right text-emerald-450 font-bold">{parseFloat(l.tarif).toLocaleString('id-ID')}</td>
                      <td className="py-3 px-4 text-right text-emerald-450 font-bold">{parseFloat(l.kurs).toLocaleString('id-ID')}</td>
                      <td className="py-3 px-4 text-right text-teal-400 font-black">{formatRupiah(l.nilai_akhir)}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button onClick={() => { setSelectedItem(l); setLevyDutyForm({ invoice_id: l.invoice_id, kapal: l.kapal, tarif: l.tarif, kurs: l.kurs, nilai_akhir: l.nilai_akhir }); setActiveModal('edit_levyduty'); }} className="p-1 rounded bg-slate-900 text-slate-400 hover:text-teal-400 border border-slate-800 transition-colors"><Edit className="h-3.5 w-3.5" /></button>
                          <button onClick={() => triggerDelete('levy_duty', l)} className="p-1 rounded bg-slate-900 text-slate-400 hover:text-red-400 border border-slate-800 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginatedLevyDuties.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-slate-500 italic">Belum ada pembayaran Levy Duty</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {levyDuties.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between p-4 border-t border-slate-800 text-xs">
                <span className="text-slate-400 font-bold">Total {levyDuties.length} transaksi</span>
                <div className="flex items-center space-x-2">
                  <button onClick={() => setLevyDutyPage(p => Math.max(1, p - 1))} disabled={levyDutyPage === 1} className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 disabled:opacity-35"><ChevronLeft className="h-4 w-4" /></button>
                  <span className="text-white font-bold">Hal {levyDutyPage} / {Math.ceil(levyDuties.length / ITEMS_PER_PAGE)}</span>
                  <button onClick={() => setLevyDutyPage(p => Math.min(Math.ceil(levyDuties.length / ITEMS_PER_PAGE), p + 1))} disabled={levyDutyPage === Math.ceil(levyDuties.length / ITEMS_PER_PAGE)} className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 disabled:opacity-35"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* Modal: Kontrak */}
      {(activeModal === 'add_contract' || activeModal === 'edit_contract') && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[9990]">
          <GlassCard className="w-full max-w-lg border-teal-500/20 max-h-[90vh] overflow-y-auto" hover={false}>
            <div className="flex justify-between items-center mb-6 p-6 pb-0">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">{selectedItem ? 'Edit Kontrak Penjualan' : 'Buat Kontrak Penjualan Baru'}</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleContractSubmit} className="space-y-4 text-left p-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Pilih Buyer / Customer</label>
                <select value={contractForm.buyer_id} onChange={e => setContractForm(prev => ({ ...prev, buyer_id: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white">
                  {buyers.map(b => <option key={b.id} value={b.id}>{b.nama}</option>)}
                </select>
              </div>
              {/* Jenis & Mata Uang */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Jenis Penjualan</label>
                  <select value={contractForm.jenis} onChange={e => {
                    const jenis = e.target.value;
                    setContractForm(prev => ({ ...prev, jenis, mata_uang: jenis === 'ekspor' ? 'USD' : 'IDR' }));
                  }} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white">
                    <option value="lokal">Lokal (Domestik)</option>
                    <option value="ekspor">Ekspor (International)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Mata Uang</label>
                  <select value={contractForm.mata_uang} onChange={e => setContractForm(prev => ({ ...prev, mata_uang: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white">
                    <option value="IDR">IDR (Rupiah)</option>
                    <option value="USD">USD (Dollar)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Pilih Produk</label>
                  <select value={contractForm.produk_id} onChange={e => setContractForm(prev => ({ ...prev, produk_id: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white">
                    {products.map(p => <option key={p.id} value={p.id}>{p.nama_produk} ({p.kode_produk})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nomor Kontrak</label>
                  <input type="text" required value={contractForm.nomor_kontrak} onChange={e => setContractForm(prev => ({ ...prev, nomor_kontrak: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Kuantitas (Qty)</label>
                  <input type="number" required placeholder="Kg / Box" value={contractForm.qty} onChange={e => setContractForm(prev => ({ ...prev, qty: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Harga Satuan ({contractForm.mata_uang === 'USD' ? 'USD' : 'Rp'})</label>
                  <input type="number" required placeholder={contractForm.mata_uang === 'USD' ? 'Contoh: 850' : 'Contoh: 16500'} value={contractForm.harga_satuan} onChange={e => setContractForm(prev => ({ ...prev, harga_satuan: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" />
                </div>
              </div>
              {/* INCOTERM — hanya untuk ekspor */}
              {contractForm.jenis === 'ekspor' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">INCOTERM</label>
                  <select value={contractForm.incoterm} onChange={e => setContractForm(prev => ({ ...prev, incoterm: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white">
                    <option value="">Pilih INCOTERM...</option>
                    <option value="FOB">FOB – Free On Board</option>
                    <option value="CIF">CIF – Cost Insurance & Freight</option>
                    <option value="CFR">CFR – Cost and Freight</option>
                    <option value="EXW">EXW – Ex Works</option>
                    <option value="DDP">DDP – Delivered Duty Paid</option>
                    <option value="DAP">DAP – Delivered At Place</option>
                  </select>
                </div>
              )}
              {contractForm.jenis === 'lokal' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">INCOTERM Lokal</label>
                  <select value={contractForm.incoterm} onChange={e => setContractForm(prev => ({ ...prev, incoterm: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white">
                    <option value="">Pilih INCOTERM...</option>
                    <option value="LOCO">LOCO (Pembeli Ambil Sendiri)</option>
                    <option value="FRANCO">FRANCO (Penjual Kirim ke Gudang)</option>
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tanggal Kontrak</label>
                  <input type="date" required value={contractForm.tgl_kontrak} onChange={e => setContractForm(prev => ({ ...prev, tgl_kontrak: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Jatuh Tempo</label>
                  <input type="date" required value={contractForm.tgl_jatuh_tempo} onChange={e => setContractForm(prev => ({ ...prev, tgl_jatuh_tempo: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Termin Pembayaran</label>
                  <select value={contractForm.termin_pembayaran} onChange={e => setContractForm(prev => ({ ...prev, termin_pembayaran: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white">
                    <option value="CAD">CAD (Cash Against Documents)</option>
                    <option value="CBD">CBD (Cash Before Delivery)</option>
                    <option value="Net 30">Net 30 Hari</option>
                  </select>
                </div>
                {selectedItem && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Status Kontrak</label>
                    <select value={contractForm.status} onChange={e => setContractForm(prev => ({ ...prev, status: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white">
                      <option value="aktif">aktif</option>
                      <option value="selesai">selesai</option>
                      <option value="batal">batal</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="submit" className="flex-1 py-3 rounded-xl glass-button-primary text-xs font-bold">Simpan Kontrak</button>
                <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-semibold hover:text-white transition-colors">Batal</button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* Modal: Pengiriman */}
      {(activeModal === 'add_shipment' || activeModal === 'edit_shipment') && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[9990]">
          <GlassCard className="w-full max-w-md border-teal-500/20" hover={false}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">{selectedItem ? 'Edit Pengiriman Penjualan' : 'Buat Pengiriman Baru'}</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleShipmentSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Pilih Kontrak Penjualan</label>
                <select value={shipmentForm.kontrak_penjualan_id} onChange={e => {
                  const contractId = e.target.value;
                  const activeContract = contracts.find(c => String(c.id) === contractId);
                  setShipmentForm(prev => ({
                    ...prev,
                    kontrak_penjualan_id: contractId,
                    qty_kirim: activeContract ? String(activeContract.outstanding_qty || activeContract.qty) : '',
                    termin: activeContract ? activeContract.termin_pembayaran : 'CAD'
                  }));
                }} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white">
                  <option value="">Pilih Kontrak</option>
                  {contracts.map(c => <option key={c.id} value={c.id}>{c.nomor_kontrak} - {c.buyer?.nama} ({c.produk?.kode_produk})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Kuantitas Kirim</label>
                  <input type="number" required placeholder="Contoh: 250000" value={shipmentForm.qty_kirim} onChange={e => setShipmentForm(prev => ({ ...prev, qty_kirim: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Kuantitas Diterima (Destinasi)</label>
                  <input type="number" placeholder="Sama dengan qty kirim jika kosong" value={shipmentForm.qty_terima} onChange={e => setShipmentForm(prev => ({ ...prev, qty_terima: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Pilih Tangki/Gudang Pengirim</label>
                  <select value={shipmentForm.storage_id} onChange={e => setShipmentForm(prev => ({ ...prev, storage_id: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white">
                    <option value="">Otomatis (Alokasi Otomatis)</option>
                    {storages.map(s => <option key={s.id} value={s.id}>{s.nama} ({s.jenis})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Ekspedisi (Via)</label>
                  <select value={shipmentForm.via} onChange={e => setShipmentForm(prev => ({ ...prev, via: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white">
                    <option value="Truck Fuso">Truck Fuso</option>
                    <option value="Kapal Tanker">Kapal Tanker</option>
                    <option value="Kereta Api Logistik">Kereta Api Logistik</option>
                  </select>
                </div>
              </div>
              <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tanggal Pengiriman</label>
                  <input type="date" required value={shipmentForm.tgl} onChange={e => setShipmentForm(prev => ({ ...prev, tgl: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Status Pengiriman</label>
                  <select value={shipmentForm.status} onChange={e => setShipmentForm(prev => ({ ...prev, status: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white">
                    <option value="Proses">Proses</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>
              </div>

              {!selectedItem && (
                <div className="bg-slate-950/40 p-3.5 border border-slate-900 rounded-xl space-y-3">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="create_invoice" checked={shipmentForm.create_invoice} onChange={e => setShipmentForm(prev => ({ ...prev, create_invoice: e.target.checked }))} className="rounded text-teal-500 focus:ring-teal-400 bg-slate-900 border-slate-800" />
                    <label htmlFor="create_invoice" className="text-[10px] font-bold text-teal-400 uppercase tracking-wider select-none">Hasilkan Invoice Penjualan Sekaligus?</label>
                  </div>
                  {shipmentForm.create_invoice && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nomor Invoice</label>
                        <input type="text" required placeholder="Contoh: INV-SALES-001" value={shipmentForm.nomor_invoice} onChange={e => setShipmentForm(prev => ({ ...prev, nomor_invoice: e.target.value }))} className="w-full px-3 py-2 rounded-lg glass-input text-xs bg-slate-900 text-white" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nilai Invoice (Opsional)</label>
                        <input type="number" placeholder="Otomatis Dihitung" value={shipmentForm.nilai_invoice} onChange={e => setShipmentForm(prev => ({ ...prev, nilai_invoice: e.target.value }))} className="w-full px-3 py-2 rounded-lg glass-input text-xs bg-slate-900 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Show INCOTERM read-only from contract */}
              {(() => {
                const activeContract = contracts.find(c => String(c.id) === String(shipmentForm.kontrak_penjualan_id));
                return activeContract?.incoterm ? (
                  <div className="bg-slate-950/40 px-3 py-2 rounded-xl border border-slate-900 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">INCOTERM dari Kontrak</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20">{activeContract.incoterm}</span>
                  </div>
                ) : null;
              })()}

              <div className="flex space-x-3 pt-4">
                <button type="submit" className="flex-1 py-3 rounded-xl glass-button-primary text-xs font-bold">Simpan Pengiriman</button>
                <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-semibold hover:text-white transition-colors">Batal</button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* Modal: Pembayaran */}
      {(activeModal === 'add_payment' || activeModal === 'edit_payment') && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[9990]">
          <GlassCard className="w-full max-w-md border-teal-500/20" hover={false}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Catat Penerimaan Pembayaran</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Pilih Invoice</label>
                <select value={paymentForm.invoice_id} onChange={e => {
                  const invoiceId = e.target.value;
                  const activeInvoice = availableInvoices.find(inv => String(inv.id) === String(invoiceId));
                  setPaymentForm(prev => ({
                    ...prev,
                    invoice_id: invoiceId,
                    kontrak_penjualan_id: activeInvoice ? activeInvoice.kontrak_penjualan_id : '',
                    nominal: activeInvoice ? String(activeInvoice.nilai) : ''
                  }));
                }} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white">
                  <option value="">Pilih Invoice</option>
                  {availableInvoices.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.nomor_invoice} (Kontrak: {inv.nomor_kontrak}) - {formatRupiah(inv.nilai)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nominal Diterima (Rp)</label>
                  <input type="number" required placeholder="Contoh: 5000000000" value={paymentForm.nominal} onChange={e => setPaymentForm(prev => ({ ...prev, nominal: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tanggal Pembayaran</label>
                  <input type="date" required value={paymentForm.tgl_bayar} onChange={e => setPaymentForm(prev => ({ ...prev, tgl_bayar: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Rekening Penerima</label>
                <select required value={paymentForm.bank_account_id} onChange={e => setPaymentForm(prev => ({ ...prev, bank_account_id: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white">
                  <option value="">Pilih Rekening</option>
                  {bankAccounts.map(b => (
                    <option key={b.id} value={b.id}>{b.bank} - {b.account_number}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Catatan / Keterangan</label>
                <input type="text" placeholder="Contoh: Pembayaran Uang Muka" value={paymentForm.catatan} onChange={e => setPaymentForm(prev => ({ ...prev, catatan: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" />
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="submit" className="flex-1 py-3 rounded-xl glass-button-primary text-xs font-bold">Simpan Pembayaran</button>
                <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-semibold hover:text-white transition-colors">Batal</button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* Target Modal */}
      {(activeModal === 'add_target' || activeModal === 'edit_target') && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[9990]">
          <GlassCard className="w-full max-w-md border-teal-500/20" hover={false}>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-3 text-teal-400">
                <Target className="h-5 w-5" />
                <h3 className="font-extrabold text-white text-base">
                  {activeModal === 'edit_target' ? 'Edit Target Penjualan' : 'Set Target Penjualan Harian'}
                </h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleTargetSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tanggal Target</label>
                <input type="date" required value={targetForm.tgl} onChange={e => setTargetForm(prev => ({ ...prev, tgl: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Target Qty Penjualan (Kg)</label>
                <input type="text" required placeholder="Contoh: 1.500.000" value={targetForm.target_qty ? Number(targetForm.target_qty).toLocaleString('id-ID') : ''} onChange={e => { const val = e.target.value.replace(/\D/g, ''); setTargetForm(prev => ({ ...prev, target_qty: val ? parseInt(val, 10) : '' })); }} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" />
              </div>
              <div className="flex space-x-3 pt-4">
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="flex-1 py-3 rounded-xl glass-button-primary text-xs font-bold flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{isLoading ? 'Menyimpan...' : 'Simpan Target'}</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => setActiveModal(null)}
                  disabled={isLoading}
                  className="flex-1 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-semibold hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Batal
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
      {/* Modal: Levy Duty */}
      {(activeModal === 'add_levyduty' || activeModal === 'edit_levyduty') && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[9990]">
          <GlassCard className="w-full max-w-md border-teal-500/20" hover={false}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                {activeModal === 'edit_levyduty' ? 'Edit Levy Duty' : 'Catat Levy Duty'}
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleLevyDutySubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Pilih Invoice</label>
                <select 
                  required 
                  value={levyDutyForm.invoice_id} 
                  onChange={e => setLevyDutyForm(prev => ({ ...prev, invoice_id: e.target.value }))} 
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white"
                >
                  <option value="">Pilih Invoice (Kontrak Ekspor)</option>
                  {eksplorInvoices.map(inv => (
                    <option key={inv.id} value={inv.id}>{inv.nomor_invoice} (Kontrak: {inv.nomor_kontrak})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Rekening Pembayar</label>
                <select required value={levyDutyForm.bank_account_id} onChange={e => setLevyDutyForm(prev => ({ ...prev, bank_account_id: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white">
                  <option value="">Pilih Rekening</option>
                  {bankAccounts.map(b => (
                    <option key={b.id} value={b.id}>{b.bank} - {b.account_number}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Kapal (Opsional)</label>
                <input type="text" placeholder="Contoh: MT. GLORY" value={levyDutyForm.kapal} onChange={e => setLevyDutyForm(prev => ({ ...prev, kapal: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tarif (USD/Ton)</label>
                  <input type="number" step="0.01" required value={levyDutyForm.tarif} onChange={e => {
                    const tarif = e.target.value;
                    const kurs = levyDutyForm.kurs || 0;
                    setLevyDutyForm(prev => ({ ...prev, tarif, nilai_akhir: (parseFloat(tarif || 0) * parseFloat(kurs || 0)) }));
                  }} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Kurs (Rp)</label>
                  <input type="number" step="0.01" required value={levyDutyForm.kurs} onChange={e => {
                    const kurs = e.target.value;
                    const tarif = levyDutyForm.tarif || 0;
                    setLevyDutyForm(prev => ({ ...prev, kurs, nilai_akhir: (parseFloat(tarif || 0) * parseFloat(kurs || 0)) }));
                  }} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nilai Akhir (Rp)</label>
                <input type="number" step="0.01" required value={levyDutyForm.nilai_akhir} onChange={e => setLevyDutyForm(prev => ({ ...prev, nilai_akhir: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl glass-input text-xs bg-slate-900 text-white" />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button type="submit" disabled={isLoading} className="flex-1 py-3 rounded-xl glass-button-primary text-xs font-bold flex items-center justify-center space-x-2 disabled:opacity-50">
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{isLoading ? 'Menyimpan...' : 'Simpan Levy Duty'}</span>
                </button>
                <button type="button" onClick={() => setActiveModal(null)} disabled={isLoading} className="flex-1 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-semibold hover:text-white transition-colors disabled:opacity-50">Batal</button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

    </div>
  );
}
