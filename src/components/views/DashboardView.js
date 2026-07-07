import React, { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import * as XLSX from 'xlsx';
import GlassCard from '../GlassCard';
import CustomDateInput from '../ui/CustomDateInput';
import { 
  FileText, 
  ArrowDownLeft, 
  TrendingUp, 
  AlertTriangle, 
  PlusCircle, 
  Calendar, 
  Edit, 
  Trash2, 
  Plus, 
  Activity,
  HardDrive,
  Info,
  DollarSign,
  Search,
  Lock,
  Unlock,
  CreditCard,
  X,
  Upload,
  Download,
  CheckCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// Dynamically import react-apexcharts to prevent Next.js SSR hydration errors
const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

export default function DashboardView({ 
  data, 
  startDate, 
  endDate, 
  onDateChange,
  suppliers,
  storages,
  contracts,
  onAddContract,
  onUpdateContract,
  onDeleteContract,
  onAddIncoming,
  onUpdateIncoming,
  onDeleteIncoming,
  onAddPayment,
  onUpdatePayment,
  onDeletePayment,
  dailyTargets,
  onAddDailyTarget,
  onUpdateDailyTarget,
  onDeleteDailyTarget
}) {
  const getLocalDateString = (offsetDays = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  // Local filter states for Contracts
  const [contractSearch, setContractSearch] = useState('');
  const [contractStatusFilter, setContractStatusFilter] = useState('live'); // 'live', 'closed', 'all'
  const [contractStartDate, setContractStartDate] = useState(() => getLocalDateString(-30));
  const [contractEndDate, setContractEndDate] = useState(() => getLocalDateString(0));

  // Pagination states
  const [contractPage, setContractPage] = useState(1);
  const [incomingPage, setIncomingPage] = useState(1);
  const itemsPerPage = 5;

  const todayStr = getLocalDateString(0);

  // Chart Scale State: 'harian' (Daily), 'mingguan' (Weekly), 'bulanan' (Monthly)
  const [chartScale, setChartScale] = useState('harian');
  const [targetDate, setTargetDate] = useState(todayStr);
  const [targetQty, setTargetQty] = useState('');

  // Custom alert & confirmation states (replaces browser defaults)
  const [toast, setToast] = useState(null); // { message: '', type: 'success' | 'error' }
  const [confirmDialog, setConfirmDialog] = useState(null); // { message: '', onConfirm: () => void }

  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'contract', 'edit_contract', 'incoming', 'edit_incoming', 'payments'
  const [selectedContract, setSelectedContract] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null); 

  // Form states
  const [contractForm, setContractForm] = useState({ supplier_id: '', nomor_kontrak: '', qty: '', harga_per_kg: '', cbd_cad: 'CAD', tgl_kontrak: '', tgl_jatuh_tempo: '', is_closed: false });
  const [incomingForm, setIncomingForm] = useState({ kontrak_cpo_id: '', storage_id: '', qty_kirim: '', qty_terima: '', tgl: '', note: '' });
  
  // Payment Form inside Log Pembayaran Modal
  const [editingPayment, setEditingPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ nominal: '', tgl_bayar: '', metode_bayar: 'transfer', catatan: '' });

  useEffect(() => {
    const existingTarget = (dailyTargets || []).find((item) => item.tgl === targetDate);
    setTargetQty(existingTarget ? String(existingTarget.target_qty ?? '') : '');
  }, [targetDate, dailyTargets]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const formatRupiah = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatNumberInput = (value) => {
    if (value === undefined || value === null || value === '') return '';
    const raw = String(value).replace(/[^\d.]/g, '');
    if (!raw) return '';
    const parts = raw.split('.');
    parts[0] = parseInt(parts[0], 10).toLocaleString('id-ID');
    return parts.join(',');
  };

  const parseNumberInput = (value) => {
    return value.replace(/\./g, '').replace(/,/g, '.').replace(/[^\d.]/g, '');
  };

  // Helper to format Date string to Indonesian Full Format (e.g. "25 Juni 2026")
  const formatDateIndo = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    
    const day = date.getDate();
    const monthIndex = date.getMonth();
    const year = date.getFullYear();
    
    return `${day} ${months[monthIndex]} ${year}`;
  };

  // Process data based on active scale (Harian, Mingguan, Bulanan)
  const processedChartData = useMemo(() => {
    if (!data.kpbn || !data.kpbn.chart || data.kpbn.chart.length === 0) {
      return { categories: [], series: [] };
    }

    const rawChart = data.kpbn.chart;

    if (chartScale === 'bulanan') {
      const groups = {};
      rawChart.forEach(point => {
        const month = point.tanggal.substring(0, 7);
        if (!groups[month]) groups[month] = [];
        groups[month].push(point.harga);
      });

      const categories = [];
      const seriesData = [];
      const monthNames = {
        '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'Mei', '06': 'Jun',
        '07': 'Jul', '08': 'Agt', '09': 'Sep', '10': 'Okt', '11': 'Nov', '12': 'Des'
      };

      Object.keys(groups).sort().forEach(m => {
        const avg = groups[m].reduce((sum, v) => sum + v, 0) / groups[m].length;
        const [yr, mn] = m.split('-');
        categories.push(`${monthNames[mn]} ${yr}`);
        seriesData.push(Math.round(avg));
      });

      return { categories, series: seriesData };
    } 
    
    if (chartScale === 'mingguan') {
      const categories = [];
      const seriesData = [];
      const chunkSize = 7;

      for (let i = 0; i < rawChart.length; i += chunkSize) {
        const chunk = rawChart.slice(i, i + chunkSize);
        const avg = chunk.reduce((sum, p) => sum + p.harga, 0) / chunk.length;
        const dateStr = chunk[0].tanggal;
        categories.push(dateStr);
        seriesData.push(Math.round(avg));
      }

      return { categories, series: seriesData };
    }

    return {
      categories: rawChart.map(p => p.tanggal),
      series: rawChart.map(p => p.harga)
    };
  }, [data.kpbn, chartScale]);
  const rawChart = data.kpbn?.chart || [];
  const hargaTerakhir = rawChart.length > 0 ? rawChart[rawChart.length - 1].harga : 0;
  const hargaRerata = rawChart.length > 0 ? rawChart.reduce((sum, p) => sum + p.harga, 0) / rawChart.length : 0;

  // ApexCharts Configs - KPBN Line Color changed to Orange matching CPO Tanks
  const apexChartOptions = {
    chart: {
      id: 'kpbn-cpo-chart',
      toolbar: {
        show: true,
        tools: {
          download: false,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        },
        autoSelected: 'zoom'
      },
      zoom: {
        enabled: true,
        type: 'x',
        autoScaleYaxis: true
      },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800
      },
      foreColor: '#64748b'
    },
    colors: ['#f97316'], // Orange Line matching CPO Tanks
    stroke: {
      curve: 'smooth',
      width: 3
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [0, 90, 100]
      }
    },
    dataLabels: {
      enabled: false
    },
    grid: {
      borderColor: '#1e293b',
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } }
    },
    xaxis: {
      type: 'category',
      categories: processedChartData.categories,
      labels: {
        formatter: (val) => {
          if (!val) return '';
          if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const date = new Date(val);
            if (isNaN(date.getTime())) return val;
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
            return `${date.getDate()} ${months[date.getMonth()]}`;
          }
          return val;
        },
        style: { colors: '#64748b', fontSize: '9px', fontWeight: 'bold' }
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        formatter: (val) => formatRupiah(val),
        style: { colors: '#64748b', fontSize: '9px', fontWeight: 'bold' }
      }
    },
    tooltip: {
      theme: 'dark',
      x: { 
        show: true,
        formatter: (val, opts) => {
          const categoryIndex = opts?.dataPointIndex;
          const categories = opts?.w?.config?.xaxis?.categories || opts?.w?.globals?.labels;
          const dateValue = categories?.[categoryIndex] ?? val;

          if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return formatDateIndo(dateValue);
          }

          return dateValue;
        }
      },
      y: {
        formatter: (val) => `${formatRupiah(val)} / Kg`
      }
    }
  };

  const apexChartSeries = [
    {
      name: 'Harga CPO KPBN',
      data: processedChartData.series
    }
  ];

  // Form Submissions
  const handleContractSubmit = (e) => {
    e.preventDefault();
    if (activeModal === 'contract') {
      onAddContract(contractForm);
      showToast('Kontrak CPO baru berhasil ditambahkan', 'success');
    } else {
      onUpdateContract(selectedItem.id, contractForm);
      showToast('Kontrak CPO berhasil diperbarui', 'success');
    }
    setActiveModal(null);
  };

  const handleIncomingSubmit = (e) => {
    e.preventDefault();
    const contract = contracts.find(c => c.id === parseInt(incomingForm.kontrak_cpo_id));
    if (contract) {
      const qtyKontrak = parseFloat(contract.qty || 0);
      const otherLogsSum = (contract.incoming_cpos || contract.incomingCpos || [])
        .filter(log => log.id !== selectedItem?.id)
        .reduce((sum, log) => sum + parseFloat(log.qty_terima || 0), 0);
      const newQty = parseFloat(incomingForm.qty_terima || 0);
      if (otherLogsSum + newQty > qtyKontrak) {
        showToast('Peringatan: Total penerimaan melebihi volume kontrak (Outstanding menjadi minus)!', 'error');
      }
    }

    if (activeModal === 'incoming') {
      onAddIncoming(incomingForm);
      showToast('Logistik penerimaan berhasil disimpan', 'success');
    } else {
      onUpdateIncoming(selectedItem.id, incomingForm);
      showToast('Logistik penerimaan berhasil diperbarui', 'success');
    }
    setActiveModal(null);
  };

  // Payment Form Submit inside modal
  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    if (editingPayment) {
      onUpdatePayment(editingPayment.id, { ...paymentForm, kontrak_cpo_id: selectedContract.id });
      setEditingPayment(null);
      showToast('Data pembayaran berhasil diperbarui', 'success');
    } else {
      onAddPayment(selectedContract.id, paymentForm);
      showToast('Data pembayaran baru berhasil dicatat', 'success');
    }
    setPaymentForm({ nominal: '', tgl_bayar: todayStr, metode_bayar: 'transfer', catatan: '' });
  };

  const openEditContract = (c) => {
    setSelectedItem(c);
    setContractForm({
      supplier_id: c.supplier_id,
      nomor_kontrak: c.nomor_kontrak,
      qty: c.qty,
      harga_per_kg: c.harga_per_kg,
      cbd_cad: c.cbd_cad,
      tgl_kontrak: c.tgl_kontrak.split('T')[0],
      tgl_jatuh_tempo: c.tgl_jatuh_tempo.split('T')[0],
      status: c.status,
      is_closed: c.is_closed
    });
    setActiveModal('edit_contract');
  };

  const openEditIncoming = (log) => {
    setSelectedItem(log);
    setIncomingForm({
      kontrak_cpo_id: log.kontrak_cpo_id,
      storage_id: log.storage_id,
      qty_kirim: log.qty_kirim,
      qty_terima: log.qty_terima,
      tgl: log.tgl.split('T')[0],
      note: log.note || ''
    });
    setActiveModal('edit_incoming');
  };

  const handleTargetSubmit = (e) => {
    e.preventDefault();
    if (!targetDate || targetQty === '') {
      showToast('Tanggal dan target wajib diisi', 'error');
      return;
    }

    const payload = { tgl: targetDate, target_qty: parseFloat(targetQty) };
    if (existingTarget) {
      onUpdateDailyTarget(existingTarget.id, payload);
      showToast('Target harian berhasil diperbarui', 'success');
    } else {
      onAddDailyTarget(payload);
      showToast('Target harian berhasil disimpan', 'success');
    }
  };

  const handleTargetDelete = () => {
    if (!existingTarget) return;
    onDeleteDailyTarget(existingTarget.id);
    showToast('Target harian berhasil dihapus', 'success');
  };

  const openPaymentsModal = (c) => {
    setSelectedContract(c);
    setEditingPayment(null);
    setPaymentForm({ nominal: '', tgl_bayar: todayStr, metode_bayar: 'transfer', catatan: '' });
    setActiveModal('payments');
  };

  // Toggle contract close state directly
  const handleToggleClose = (c) => {
    onUpdateContract(c.id, {
      supplier_id: c.supplier_id,
      nomor_kontrak: c.nomor_kontrak,
      qty: c.qty,
      harga_per_kg: c.harga_per_kg,
      cbd_cad: c.cbd_cad,
      tgl_kontrak: c.tgl_kontrak.split('T')[0],
      tgl_jatuh_tempo: c.tgl_jatuh_tempo.split('T')[0],
      status: c.status,
      is_closed: !c.is_closed
    });
    showToast(c.is_closed ? 'Kontrak diaktifkan kembali' : 'Kontrak berhasil ditutup', 'success');
  };

  // Wrapped delete actions to use custom confirm modal
  const triggerDeleteContract = (id) => {
    setConfirmDialog({
      message: 'Hapus kontrak CPO ini? Semua log penerimaan terkait kontrak ini juga akan dihapus.',
      onConfirm: () => {
        onDeleteContract(id);
        setConfirmDialog(null);
        showToast('Kontrak CPO berhasil dihapus', 'success');
      }
    });
  };

  const triggerDeleteIncoming = (id) => {
    setConfirmDialog({
      message: 'Hapus logistik penerimaan CPO harian ini? Tindakan ini akan mengembalikan level stok tangki penerima.',
      onConfirm: () => {
        onDeleteIncoming(id);
        setConfirmDialog(null);
        showToast('Logistik penerimaan berhasil dihapus', 'success');
      }
    });
  };

  const triggerDeletePayment = (id) => {
    setConfirmDialog({
      message: 'Hapus data riwayat pembayaran ini? Outstanding kontrak akan bertambah kembali.',
      onConfirm: () => {
        onDeletePayment(id);
        setConfirmDialog(null);
        if (selectedContract) {
          const updatedPayments = (selectedContract.pembayaran_cpos || []).filter(p => p.id !== id);
          const totalPaid = updatedPayments.reduce((sum, p) => sum + parseFloat(p.nominal), 0);
          const totalVal = parseFloat(selectedContract.qty) * parseFloat(selectedContract.harga_per_kg);
          setSelectedContract(prev => ({
            ...prev,
            pembayaran_cpos: updatedPayments,
            total_terbayar: totalPaid,
            outstanding_nominal: totalVal - totalPaid
          }));
        }
        showToast('Pembayaran berhasil dihapus', 'success');
      }
    });
  };

  // Filter Contracts based on Status and Search query
  const filteredContracts = useMemo(() => {
    return contracts.filter(c => {
      // For live contracts, show all (don't filter by date)
      // For closed contracts and "all" view, apply date filter
      const isLive = contractStatusFilter === 'live';
      const shouldShow = contractStatusFilter === 'all' || 
                        (contractStatusFilter === 'live' && !c.is_closed) ||
                        (contractStatusFilter === 'closed' && c.is_closed);
      
      if (!shouldShow) return false;

      // Apply date filter for 'all' and 'closed' views
      if (!isLive) {
        const cDate = c.tgl_kontrak?.split('T')[0] || '';
        if (cDate < contractStartDate || cDate > contractEndDate) return false;
      }

      const query = contractSearch.toLowerCase();
      const contractNo = c.nomor_kontrak ? c.nomor_kontrak.toLowerCase() : '';
      const supplierName = c.supplier?.nama ? c.supplier.nama.toLowerCase() : '';
      
      return contractNo.includes(query) || supplierName.includes(query);
    });
  }, [contracts, contractSearch, contractStatusFilter, contractStartDate, contractEndDate]);

  // CPO Contracts Pagination
  const totalContractPages = Math.ceil(filteredContracts.length / itemsPerPage) || 1;
  const paginatedContracts = useMemo(() => {
    const startIndex = (contractPage - 1) * itemsPerPage;
    return filteredContracts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredContracts, contractPage]);

  // Daily CPO Logs Pagination
  const totalIncomingPages = Math.ceil((data.incoming_logs || []).length / itemsPerPage) || 1;
  const paginatedIncoming = useMemo(() => {
    const startIndex = (incomingPage - 1) * itemsPerPage;
    return (data.incoming_logs || []).slice(startIndex, startIndex + itemsPerPage);
  }, [data.incoming_logs, incomingPage]);

  const cpoTanks = storages.filter(s => s.jenis === 'tangki' && (s.stok || []).some(st => st.kode_produk === 'CPO' || (st.produk && st.produk.kode_produk === 'CPO')));

  // Calculate Weighted Average Price and total valuation for each CPO Tank based on its contracts
  const cpoTanksValuation = useMemo(() => {
    return cpoTanks.map(tank => {
      let totalQtyIn = 0;
      let totalValueIn = 0;

      contracts.forEach(c => {
        const logs = c.incoming_cpos || c.incomingCpos || [];
        logs.forEach(log => {
          if (log.storage_id === tank.id) {
            const qty = parseFloat(log.qty_terima || 0);
            const price = parseFloat(c.harga_per_kg || 0);
            totalQtyIn += qty;
            totalValueIn += qty * price;
          }
        });
      });

      const avgPrice = totalQtyIn > 0 ? totalValueIn / totalQtyIn : 15500;
      const cpoStokItem = tank.stok.find(st => st.kode_produk === 'CPO');
      const qty = cpoStokItem ? cpoStokItem.qty : 0;
      const inventoryValue = qty * avgPrice;

      return {
        ...tank,
        qty,
        avgPrice,
        inventoryValue
      };
    });
  }, [cpoTanks, contracts]);

  const totalCpoStock = useMemo(() => {
    return cpoTanksValuation.reduce((sum, tank) => sum + tank.qty, 0);
  }, [cpoTanksValuation]);

  const totalCpoValue = useMemo(() => {
    return cpoTanksValuation.reduce((sum, tank) => sum + tank.inventoryValue, 0);
  }, [cpoTanksValuation]);

  // Excel templates triggers - removed plat, surat jalan, and supir columns
  const downloadContractTemplate = () => {
    const wsData = [
      ['nomor_kontrak', 'supplier_name', 'volume_kg', 'harga_per_kg', 'cbd_cad', 'tgl_kontrak', 'tgl_jatuh_tempo'],
      ['CTR-CPO-901', 'PT Perkebunan Nusantara IV', 500000, 15500, 'CAD', todayStr, todayStr],
      ['CTR-CPO-902', 'PT Sawit Sumbermas Sarana', 1000000, 15600, 'CBD', todayStr, todayStr]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Kontrak');
    XLSX.writeFile(wb, 'template_kontrak_cpo.xlsx');
    showToast('Template Kontrak CPO diunduh', 'success');
  };

  const downloadIncomingTemplate = () => {
    const wsData = [
      ['nomor_kontrak', 'nama_tangki', 'qty_kirim', 'qty_terima', 'tgl_terima', 'note'],
      ['CTR-CPO-001', 'Tangki CPO 01', 300000, 299000, todayStr, 'Pengiriman wajar'],
      ['CTR-CPO-001', 'Tangki CPO 02', 400000, 398000, todayStr, 'Susut wajar']
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Penerimaan');
    XLSX.writeFile(wb, 'template_penerimaan_cpo.xlsx');
    showToast('Template Penerimaan CPO diunduh', 'success');
  };

  // Excel Imports
  const handleContractImport = (e) => {
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
        sheetData.forEach(row => {
          const supplierName = row.supplier_name || '';
          const foundSupplier = suppliers.find(s => s.nama.toLowerCase().trim() === supplierName.toLowerCase().trim());
          const supplierId = foundSupplier ? foundSupplier.id : (suppliers[0]?.id || '');

          const payload = {
            supplier_id: supplierId,
            nomor_kontrak: row.nomor_kontrak || `CTR-IMP-${Date.now()}-${successCount}`,
            qty: parseFloat(row.volume_kg || 0),
            harga_per_kg: parseFloat(row.harga_per_kg || 0),
            cbd_cad: row.cbd_cad || 'CAD',
            tgl_kontrak: row.tgl_kontrak || todayStr,
            tgl_jatuh_tempo: row.tgl_jatuh_tempo || todayStr,
            is_closed: false
          };

          onAddContract(payload);
          successCount++;
        });

        showToast(`Berhasil mengimpor ${successCount} kontrak CPO dari Excel!`, 'success');
      } catch (err) {
        console.error(err);
        showToast('Gagal mengimpor file: Format kolom salah.', 'error');
      }
      e.target.value = null; 
    };
    reader.readAsBinaryString(file);
  };

  const handleIncomingImport = (e) => {
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
        let errorCount = 0;

        let runSumMap = {};

        sheetData.forEach(row => {
          const contractNo = row.nomor_kontrak || '';
          const foundContract = contracts.find(c => c.nomor_kontrak.toLowerCase().trim() === contractNo.toLowerCase().trim());

          const tankName = row.nama_tangki || '';
          const foundTank = storages.find(s => s.nama.toLowerCase().trim() === tankName.toLowerCase().trim());

          if (foundContract && foundTank) {
            const qtyTerima = parseFloat(row.qty_terima || 0);

            if (!runSumMap[foundContract.id]) {
              runSumMap[foundContract.id] = (foundContract.incoming_cpos || foundContract.incomingCpos || []).reduce((sum, log) => sum + parseFloat(log.qty_terima || 0), 0);
            }
            runSumMap[foundContract.id] += qtyTerima;

            if (runSumMap[foundContract.id] > parseFloat(foundContract.qty)) {
              showToast(`Peringatan: Impor CPO untuk kontrak ${foundContract.nomor_kontrak} melebihi volume kontrak (Outstanding menjadi minus)!`, 'error');
            }

            const payload = {
              kontrak_cpo_id: foundContract.id,
              storage_id: foundTank.id,
              qty_kirim: parseFloat(row.qty_kirim || 0),
              qty_terima: qtyTerima,
              tgl: row.tgl_terima || todayStr,
              note: row.note || 'Imported via Excel'
            };
            onAddIncoming(payload);
            successCount++;
          } else {
            errorCount++;
          }
        });

        if (errorCount > 0) {
          showToast(`Impor selesai: ${successCount} sukses, ${errorCount} gagal`, 'error');
        } else {
          showToast(`Berhasil mengimpor ${successCount} log penerimaan CPO!`, 'success');
        }
      } catch (err) {
        console.error(err);
        showToast('Gagal mengimpor file: Format kolom salah.', 'error');
      }
      e.target.value = null; 
    };
    reader.readAsBinaryString(file);
  };

  const existingTarget = (dailyTargets || []).find((item) => item.tgl === targetDate);
  const selectedRangeTargets = useMemo(() => {
    return (dailyTargets || []).filter((item) => item.tgl >= startDate && item.tgl <= endDate);
  }, [dailyTargets, startDate, endDate]);

  const totalTargetRange = selectedRangeTargets.reduce((sum, item) => sum + parseFloat(item.target_qty || 0), 0);
  const qtyKirimRange = (data?.incoming_logs || []).reduce((sum, log) => sum + parseFloat(log.qty_kirim || 0), 0);
  const qtyTerimaRange = (data?.incoming_logs || []).reduce((sum, log) => sum + parseFloat(log.qty_terima || 0), 0);
  const pctKirim = totalTargetRange > 0 ? Math.round((qtyKirimRange / totalTargetRange) * 100) : 0;
  const pctTerima = totalTargetRange > 0 ? Math.round((qtyTerimaRange / totalTargetRange) * 100) : 0;

  return (
    <div className="space-y-6 relative">
      {/* Custom Toast Notification - fixed on top of everything using z-[9999] */}
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

      {/* Custom Confirmation Modal Dialog - z-[9990] */}
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

      {/* 2. Top Metric Cards (Live stats and Today stats) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI: CPO Contracts Live */}
        <GlassCard className="flex flex-col justify-between h-32" hover={false}>
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Kontrak CPO Sedang Berjalan (Live)</span>
            <div className="p-2 rounded-lg bg-teal-500/10"><FileText className="h-5 w-5 text-teal-400" /></div>
          </div>
          <div>
            <p className="text-xl font-black text-white tracking-tight">{data.kontrak_cpo_aktif} Kontrak</p>
            <p className="text-[10px] text-slate-500 font-semibold">Berdasarkan data aktual saat ini</p>
          </div>
        </GlassCard>

        {/* KPI: Live Outstanding Kirim */}
        <GlassCard className="flex flex-col justify-between h-32" hover={false}>
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Outstanding Kirim (Live)</span>
            <div className="p-2 rounded-lg bg-sky-500/10"><ArrowDownLeft className="h-5 w-5 text-sky-400" /></div>
          </div>
          <div>
            <p className="text-xl font-black text-white tracking-tight">{data.outstanding_qty.toLocaleString('id-ID')} Kg</p>
            <p className="text-[10px] text-slate-500 font-semibold">Total sisa volume demand kontrak live</p>
          </div>
        </GlassCard>

        {/* KPI: Live Outstanding Bayar */}
        <GlassCard className="flex flex-col justify-between h-32" hover={false}>
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Outstanding Bayar (Live)</span>
            <div className="p-2 rounded-lg bg-amber-500/10"><AlertTriangle className="h-5 w-5 text-amber-400" /></div>
          </div>
          <div>
            <p className="text-xl font-black text-white tracking-tight">{formatRupiah(data.outstanding_nominal)}</p>
            <p className="text-[10px] text-slate-500 font-semibold">Sisa tagihan kontrak live terutang</p>
          </div>
        </GlassCard>

        {/* KPI: Today's CPO Reception */}
        <GlassCard className="flex flex-col justify-between h-32" hover={false}>
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Penerimaan Hari Ini</span>
            <div className="p-2 rounded-lg bg-purple-500/10"><Activity className="h-5 w-5 text-purple-400" /></div>
          </div>
          <div className="space-y-0.5 text-[10px] text-slate-450">
            <div className="flex justify-between"><span className="text-slate-400 font-medium">Kirim:</span> <strong className="text-white">{(data.penerimaan_hari_ini?.qty_kirim || 0).toLocaleString('id-ID')} Kg</strong></div>
            <div className="flex justify-between"><span className="text-slate-400 font-medium">Terima:</span> <strong className="text-teal-400">{(data.penerimaan_hari_ini?.qty_terima || 0).toLocaleString('id-ID')} Kg</strong></div>
            <div className="flex justify-between border-t border-slate-900 pt-0.5"><span className="text-slate-400 font-medium">Susut:</span> <strong className="text-red-400">{(data.penerimaan_hari_ini?.susut || 0).toLocaleString('id-ID')} Kg</strong></div>
          </div>
        </GlassCard>
      </div>

      {/* 3. KPBN Price Zoomable Chart (Last 5 Months) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GlassCard className="border-teal-500/20 h-full flex flex-col justify-between" hover={false}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b border-slate-900 pb-3 gap-3">
              <div>
                <h4 className="font-extrabold text-white text-sm">Tren Harga CPO KPBN (5 Bulan Terakhir)</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Penetapan harga harian dengan kontrol zoom & skala waktu</p>
              </div>
              <div className="flex items-center space-x-2 bg-slate-950/80 p-1 rounded-xl border border-slate-850 self-start sm:self-auto">
                <button
                  onClick={() => setChartScale('bulanan')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                    chartScale === 'bulanan' ? 'bg-teal-500/20 text-teal-300' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Bulanan
                </button>
                <button
                  onClick={() => setChartScale('mingguan')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                    chartScale === 'mingguan' ? 'bg-teal-500/20 text-teal-300' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Mingguan
                </button>
                <button
                  onClick={() => setChartScale('harian')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                    chartScale === 'harian' ? 'bg-teal-500/20 text-teal-300' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Harian
                </button>
              </div>
            </div>
            
            <div className="w-full bg-slate-950/20 p-2 rounded-xl border border-slate-900/60">
              {typeof window !== 'undefined' && (
                <ReactApexChart
                  options={apexChartOptions}
                  series={apexChartSeries}
                  type="area"
                  height={220}
                />
              )}
            </div>

            {/* Last Price and Period Average Price Info badges */}
            <div className="flex items-center space-x-6 mt-4 pt-3 border-t border-slate-900/60 text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Harga Terakhir:</span>
                <strong className="text-amber-500 font-black text-sm">{formatRupiah(hargaTerakhir)} / Kg</strong>
              </div>
              <div className="h-4 w-px bg-slate-900" />
              <div className="flex items-center space-x-2">
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Rerata Periode Ini:</span>
                <strong className="text-teal-400 font-black text-sm">{formatRupiah(Math.round(hargaRerata))} / Kg</strong>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* 4. CPO Stock tanks visualizer with SLIDE and Proportional Inventory Valuation */}
        <div>
          <GlassCard hover={false} className="h-full flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-sm font-extrabold text-white tracking-wider uppercase">Level Stok & Valuasi CPO</h3>
                  <p className="text-[10px] text-slate-400">Geser untuk melihat tangki CPO beserta harga inventory proporsional</p>
                </div>
                <HardDrive className="h-4.5 w-4.5 text-teal-400" />
              </div>

              {/* Horizontal Slider Layout */}
              <div className="flex flex-row space-x-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-teal-500/20 scrollbar-track-transparent">
                {cpoTanksValuation.map((tank) => {
                  const percentage = tank.kapasitas > 0 ? Math.round((tank.qty / tank.kapasitas) * 100) : 0;

                  return (
                    <div key={tank.id} className="flex-shrink-0 w-44 flex flex-col items-center bg-slate-950/40 border border-slate-900 rounded-2xl p-3.5 space-y-3 justify-between">
                      <div className="text-center w-full">
                        <h4 className="font-bold text-white text-[11px] truncate max-w-full" title={tank.nama}>{tank.nama}</h4>
                        <p className="text-[9px] text-slate-500 font-semibold">{tank.lokasi}</p>
                      </div>
                      
                      {/* Visual Cylinder */}
                      <div className="relative w-14 h-20 bg-slate-900 rounded-t-xl rounded-b-md border border-slate-800 flex flex-col justify-end overflow-hidden">
                        <div 
                          className="w-full bg-gradient-to-t from-yellow-600/80 to-amber-500/80 rounded-b transition-all duration-1000 flex items-center justify-center"
                          style={{ height: `${Math.min(percentage, 100)}%` }}
                        >
                          {percentage > 30 && (
                            <span className="text-[8px] font-black text-white">{percentage}%</span>
                          )}
                        </div>
                      </div>

                      <div className="w-full text-center space-y-1 text-[9px] border-t border-slate-900 pt-2 text-slate-400">
                        <div className="flex justify-between">
                          <span>Stok:</span>
                          <strong className="text-slate-200">{tank.qty.toLocaleString('id-ID')} Kg</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Rerata:</span>
                          <strong className="text-teal-400">Rp {Math.round(tank.avgPrice).toLocaleString('id-ID')}/Kg</strong>
                        </div>
                        <div className="flex justify-between border-t border-slate-900/60 pt-1">
                          <span>Valuasi:</span>
                          <strong className="text-amber-400">{formatRupiah(tank.inventoryValue)}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {cpoTanksValuation.length === 0 && (
                  <div className="w-full py-12 text-center text-slate-500 italic text-xs">Tidak ada tangki berisi CPO</div>
                )}
              </div>
            </div>

            {/* Footer: Aggregated CPO Stocks & Inventory Value */}
            <div className="border-t border-slate-900 pt-4 mt-4 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Total Volume CPO:</span>
                <strong className="text-teal-400 text-sm font-black">{totalCpoStock.toLocaleString('id-ID')} Kg</strong>
              </div>
              <div className="flex justify-between items-center border-t border-slate-900/40 pt-1.5">
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Total Nilai Inventori:</span>
                <strong className="text-amber-400 text-sm font-black">{formatRupiah(totalCpoValue)}</strong>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* 5. CPO Contracts list with CRUD, specific Search, status Closed/Live filter & EXCEL IMPORT */}
      <GlassCard hover={false}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b border-slate-900 gap-4">
          <div>
            <h3 className="text-base font-extrabold text-white uppercase tracking-wider">Manajemen Kontrak CPO</h3>
            <p className="text-xs text-slate-400">Kelola dokumen kontrak supply chain CPO (Live)</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-40">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Cari kontrak..."
                value={contractSearch}
                onChange={(e) => { setContractSearch(e.target.value); setContractPage(1); }}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg glass-input text-xs"
              />
            </div>

            {/* Status */}
            <select
              value={contractStatusFilter}
              onChange={(e) => { setContractStatusFilter(e.target.value); setContractPage(1); }}
              className="px-3 py-1.5 rounded-lg glass-input text-xs bg-slate-900"
            >
              <option value="live">Status: Berjalan (Live)</option>
              <option value="closed">Status: Ditutup (Closed)</option>
              <option value="all">Status: Semua Kontrak</option>
            </select>

            {/* Date Filters (Only for Closed or All) */}
            {contractStatusFilter !== 'live' && (
              <div className="flex items-center space-x-2 animate-fade-in bg-slate-900/50 p-1 rounded-lg border border-slate-800">
                <CustomDateInput value={contractStartDate} onChange={setContractStartDate} className="w-28" />
                <span className="text-[10px] text-slate-500 font-bold">-</span>
                <CustomDateInput value={contractEndDate} onChange={setContractEndDate} className="w-28" />
              </div>
            )}

            {/* Excel Template & Import buttons */}
            <div className="flex items-center space-x-1.5">
              <button 
                onClick={downloadContractTemplate}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white"
                title="Unduh Template Excel Kontrak CPO"
              >
                <Download className="h-4 w-4" />
              </button>
              <input 
                type="file" 
                id="import-contract-excel" 
                className="hidden" 
                accept=".xlsx,.xls,.csv" 
                onChange={handleContractImport} 
              />
              <button 
                onClick={() => document.getElementById('import-contract-excel').click()}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-450 hover:text-teal-400 flex items-center space-x-1.5 text-xs font-bold"
                title="Import Excel Kontrak CPO"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden md:inline">Import</span>
              </button>
            </div>

            <button 
              onClick={() => {
                setContractForm({ supplier_id: '', nomor_kontrak: '', qty: '', harga_per_kg: '', cbd_cad: 'CAD', tgl_kontrak: todayStr, tgl_jatuh_tempo: todayStr, is_closed: false });
                setActiveModal('contract');
              }}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg glass-button-primary text-xs font-bold w-full sm:w-auto justify-center"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Tambah Kontrak</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto animate-fade-in">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">No. Kontrak</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4 text-right">Volume (Kg)</th>
                <th className="py-3 px-4 text-right">Harga / Kg</th>
                <th className="py-3 px-4 text-right">Total Nilai</th>
                <th className="py-3 px-4 text-right">Outstanding Bayar</th>
                <th className="py-3 px-4 text-center">CAD/CBD</th>
                <th className="py-3 px-4 text-right">Outstanding Kirim (Kg)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-350">
              {paginatedContracts.map((c) => (
                <tr key={c.id} className="hover:bg-slate-900/40 transition-colors font-semibold">
                  <td className="py-3.5 px-4 font-mono font-bold text-teal-400">{c.nomor_kontrak}</td>
                  <td className="py-3.5 px-4 font-semibold text-white">{c.supplier?.nama}</td>
                  {/* Format quantity Indonesian style, no decimal, no suffix unit "Kg" */}
                  <td className="py-3.5 px-4 text-right font-extrabold text-white">
                    {Math.round(c.qty).toLocaleString('id-ID')}
                  </td>
                  <td className="py-3.5 px-4 text-right">{formatRupiah(c.harga_per_kg)}</td>
                  <td className="py-3.5 px-4 text-right font-extrabold text-emerald-400">
                    {formatRupiah(c.qty * c.harga_per_kg)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-extrabold">
                    <span className={c.outstanding_nominal < 0 ? 'text-teal-400' : 'text-amber-400'}>
                      {formatRupiah(c.outstanding_nominal)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="bg-slate-900 px-2 py-0.5 rounded text-[10px] text-slate-400 border border-slate-800 uppercase font-black">
                      {c.cbd_cad}
                    </span>
                  </td>
                  {/* Outstanding kirim Indonesian style, no decimal, no suffix unit "Kg" */}
                  <td className="py-3.5 px-4 text-right font-extrabold text-red-500">
                    {Math.round(c.outstanding_qty).toLocaleString('id-ID')}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => handleToggleClose(c)}
                      className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded text-[10px] font-extrabold uppercase border transition-colors ${
                        c.is_closed
                          ? 'bg-slate-950 text-slate-500 border-slate-850 hover:bg-slate-900'
                          : 'bg-teal-950 text-teal-300 border-teal-800/60 hover:bg-teal-900'
                      }`}
                      title={c.is_closed ? "Klik untuk mengaktifkan kembali" : "Klik untuk menutup kontrak"}
                    >
                      {c.is_closed ? <Lock className="h-3 w-3 shrink-0" /> : <Unlock className="h-3 w-3 shrink-0" />}
                      <span>{c.is_closed ? 'Closed' : 'Live'}</span>
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center space-x-1.5">
                      <button 
                        onClick={() => openPaymentsModal(c)}
                        className="p-1 rounded bg-slate-900 hover:bg-amber-500/10 text-amber-400 border border-slate-800 transition-colors"
                        title="Log & CRUD Pembayaran"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => openEditContract(c)}
                        className="p-1 rounded bg-slate-900 text-slate-400 hover:text-teal-400 border border-slate-800 transition-colors"
                        title="Edit Kontrak"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => triggerDeleteContract(c.id)}
                        className="p-1 rounded bg-slate-900 text-slate-400 hover:text-red-400 border border-slate-800 transition-colors"
                        title="Hapus Kontrak"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredContracts.length === 0 && (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-500 font-semibold">
                    Tidak ada kontrak CPO ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Contracts Pagination Controls */}
        {filteredContracts.length > 0 && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-900/60 text-xs">
            <span className="text-slate-500 font-bold uppercase tracking-wider">
              Menampilkan {Math.min(filteredContracts.length, (contractPage - 1) * itemsPerPage + 1)}-{Math.min(filteredContracts.length, contractPage * itemsPerPage)} dari {filteredContracts.length} kontrak
            </span>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setContractPage(prev => Math.max(1, prev - 1))}
                disabled={contractPage === 1}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-white font-bold px-3">Halaman {contractPage} / {totalContractPages}</span>
              <button 
                onClick={() => setContractPage(prev => Math.min(totalContractPages, prev + 1))}
                disabled={contractPage === totalContractPages}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* 6. Target Penerimaan Card */}
      <GlassCard hover={false} className="mb-6">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between mb-6 border-b border-slate-900 pb-4 gap-4">
          <div>
            <h3 className="text-base font-extrabold text-white uppercase tracking-wider">Target Penerimaan CPO</h3>
            <p className="text-xs text-slate-400">Atur target harian yang disimpan ke database dan pakai untuk memfilter realisasi penerimaan.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            <div className="flex items-center space-x-2 bg-slate-950/80 border border-slate-850 rounded-lg px-2.5 py-1 w-full md:w-auto">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Dari</span>
              <input 
                type="date" 
                value={startDate} 
                max={todayStr}
                onChange={(e) => { onDateChange(e.target.value, endDate); setIncomingPage(1); }}
                className="bg-transparent border-0 text-xs text-white focus:ring-0 outline-none w-full md:w-auto font-sans" 
              />
            </div>
            <div className="flex items-center space-x-2 bg-slate-950/80 border border-slate-850 rounded-lg px-2.5 py-1 w-full md:w-auto">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Sampai</span>
              <input 
                type="date" 
                value={endDate} 
                max={todayStr}
                onChange={(e) => { onDateChange(startDate, e.target.value); setIncomingPage(1); }}
                className="bg-transparent border-0 text-xs text-white focus:ring-0 outline-none w-full md:w-auto font-sans" 
              />
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <form onSubmit={handleTargetSubmit} className="rounded-2xl border border-slate-900 bg-slate-950/40 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">Target Harian</h4>
                <p className="text-[10px] text-slate-500">Satu target untuk satu hari, data akan disimpan ke database.</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tanggal</label>
                <input
                  type="date"
                  value={targetDate}
                  max={todayStr}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input text-sm font-sans"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Target (Kg)</label>
                <input
                  type="text"
                  min="0"
                  value={formatNumberInput(targetQty)}
                  onChange={(e) => setTargetQty(parseNumberInput(e.target.value))}
                  placeholder="1.000.000"
                  className="w-full px-3 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="px-3 py-2 rounded-lg glass-button-primary text-xs font-bold">
                {existingTarget ? 'Update Target' : 'Simpan Target'}
              </button>
              {existingTarget && (
                <button type="button" onClick={handleTargetDelete} className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors">
                  Hapus Target
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-500">Target yang tersimpan untuk tanggal terpilih akan dipakai untuk menghitung progres pada rentang tanggal di bawah ini.</p>
          </form>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-900 bg-slate-950/40 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Target Periode</p>
                <p className="mt-2 text-xl font-black text-white">{totalTargetRange.toLocaleString('id-ID')} Kg</p>
              </div>
              <div className="rounded-2xl border border-slate-900 bg-slate-950/40 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Realisasi Periode</p>
                <p className="mt-2 text-xl font-black text-teal-400">{qtyTerimaRange.toLocaleString('id-ID')} Kg</p>
              </div>
            </div>
            <div className="space-y-2 rounded-2xl border border-slate-900 bg-slate-950/40 p-4">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-400">Realisasi Kirim</span>
                <strong className="text-white">{qtyKirimRange.toLocaleString('id-ID')} Kg / {totalTargetRange.toLocaleString('id-ID')} Kg ({pctKirim}%)</strong>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-550" style={{ width: `${Math.min(pctKirim, 100)}%` }} />
              </div>
            </div>
            <div className="space-y-2 rounded-2xl border border-slate-900 bg-slate-950/40 p-4">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-400">Realisasi Terima</span>
                <strong className="text-teal-400">{qtyTerimaRange.toLocaleString('id-ID')} Kg / {totalTargetRange.toLocaleString('id-ID')} Kg ({pctTerima}%)</strong>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-550" style={{ width: `${Math.min(pctTerima, 100)}%` }} />
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* 7. Log Penerimaan Card */}
      <GlassCard hover={false}>
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between mb-6 border-b border-slate-900 pb-4 gap-4">
          <div>
            <h3 className="text-base font-extrabold text-white uppercase tracking-wider">Log Penerimaan CPO Harian</h3>
            <p className="text-xs text-slate-400">Daftar logistik masuk armada CPO harian</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            {/* Excel Template & Import buttons */}
            <div className="flex items-center space-x-1.5 w-full md:w-auto justify-end">
              <button 
                onClick={downloadIncomingTemplate}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white"
                title="Unduh Template Excel Penerimaan CPO"
              >
                <Download className="h-4 w-4" />
              </button>
              <input 
                type="file" 
                id="import-incoming-excel" 
                className="hidden" 
                accept=".xlsx,.xls,.csv" 
                onChange={handleIncomingImport} 
              />
              <button 
                onClick={() => document.getElementById('import-incoming-excel').click()}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-450 hover:text-teal-400 flex items-center space-x-1.5 text-xs font-bold"
                title="Import Excel Penerimaan CPO"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden md:inline">Import</span>
              </button>
            </div>

            <button 
              onClick={() => {
                setIncomingForm({ kontrak_cpo_id: '', storage_id: '', qty_kirim: '', qty_terima: '', tgl: todayStr, note: '' });
                setActiveModal('incoming');
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-bold hover:bg-teal-500/20 transition-all justify-center w-full md:w-auto"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Catat Terima CPO</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto animate-fade-in">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">No. Kontrak</th>
                <th className="py-3 px-4 text-right">Qty Kirim (Kg)</th>
                <th className="py-3 px-4 text-right">Qty Terima (Kg)</th>
                <th className="py-3 px-4 text-right">Susut (Kg)</th>
                <th className="py-3 px-4">Storage (Tangki)</th>
                <th className="py-3 px-4">Catatan</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-350">
              {paginatedIncoming.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/40 transition-colors font-semibold">
                  <td className="py-3.5 px-4 text-slate-400">{formatDateIndo(log.tgl)}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-teal-400">{log.kontrak_cpo?.nomor_kontrak}</td>
                  {/* Clean volume format, no suffix "Kg" */}
                  <td className="py-3.5 px-4 text-right">{Math.round(log.qty_kirim).toLocaleString('id-ID')}</td>
                  <td className="py-3.5 px-4 text-right font-extrabold text-white">{Math.round(log.qty_terima).toLocaleString('id-ID')}</td>
                  <td className="py-3.5 px-4 text-right font-extrabold text-red-400">
                    {Math.round(log.selisih_qty).toLocaleString('id-ID')}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-white">{log.storage?.nama || 'Tangki Utama'}</td>
                  <td className="py-3.5 px-4 max-w-xs truncate text-slate-400 font-medium">{log.note || '-'}</td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center space-x-1.5">
                      <button 
                        onClick={() => openEditIncoming(log)}
                        className="p-1 rounded bg-slate-900 text-slate-400 hover:text-teal-400 border border-slate-800 transition-colors"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => triggerDeleteIncoming(log.id)}
                        className="p-1 rounded bg-slate-900 text-slate-400 hover:text-red-400 border border-slate-800 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!data.incoming_logs || data.incoming_logs.length === 0) && (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500 font-semibold">
                    Belum ada armada CPO masuk yang tercatat pada periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Incoming Logs Pagination Controls */}
        {data.incoming_logs && data.incoming_logs.length > 0 && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-900/60 text-xs">
            <span className="text-slate-500 font-bold uppercase tracking-wider">
              Menampilkan {Math.min(data.incoming_logs.length, (incomingPage - 1) * itemsPerPage + 1)}-{Math.min(data.incoming_logs.length, incomingPage * itemsPerPage)} dari {data.incoming_logs.length} data
            </span>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setIncomingPage(prev => Math.max(1, prev - 1))}
                disabled={incomingPage === 1}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-white font-bold px-3">Halaman {incomingPage} / {totalIncomingPages}</span>
              <button 
                onClick={() => setIncomingPage(prev => Math.min(totalIncomingPages, prev + 1))}
                disabled={incomingPage === totalIncomingPages}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* ── MODALS ── */}
      
      {/* 1. Contract Modal */}
      {(activeModal === 'contract' || activeModal === 'edit_contract') && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <GlassCard className="w-full max-w-lg" hover={false}>
            <h3 className="text-lg font-bold text-white mb-6">
              {activeModal === 'contract' ? 'Buat Kontrak CPO Baru' : 'Edit Kontrak CPO'}
            </h3>
            <form onSubmit={handleContractSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Supplier</label>
                <select
                  required
                  value={contractForm.supplier_id}
                  onChange={(e) => setContractForm({ ...contractForm, supplier_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm bg-slate-900 animate-fade-in"
                >
                  <option value="">Pilih Supplier</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">No. Kontrak</label>
                  <input
                    type="text" required placeholder="CTR-CPO-..."
                    value={contractForm.nomor_kontrak}
                    onChange={(e) => setContractForm({ ...contractForm, nomor_kontrak: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">CAD/CBD</label>
                  <select
                    value={contractForm.cbd_cad}
                    onChange={(e) => setContractForm({ ...contractForm, cbd_cad: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm bg-slate-900"
                  >
                    <option value="CAD">CAD</option>
                    <option value="CBD">CBD</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Volume (Kg)</label>
                  <input
                    type="text" required placeholder="1.000.000"
                    value={formatNumberInput(contractForm.qty)}
                    onChange={(e) => setContractForm({ ...contractForm, qty: parseNumberInput(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Harga (Rp/Kg)</label>
                  <input
                    type="text" required placeholder="15.500"
                    value={formatNumberInput(contractForm.harga_per_kg)}
                    onChange={(e) => setContractForm({ ...contractForm, harga_per_kg: parseNumberInput(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tgl Kontrak</label>
                  <input
                    type="date" required max={todayStr}
                    value={contractForm.tgl_kontrak}
                    onChange={(e) => setContractForm({ ...contractForm, tgl_kontrak: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm font-sans"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Jatuh Tempo</label>
                  <input
                    type="date" required
                    value={contractForm.tgl_jatuh_tempo}
                    onChange={(e) => setContractForm({ ...contractForm, tgl_jatuh_tempo: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm font-sans"
                  />
                </div>
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="submit" className="flex-1 py-2.5 rounded-xl glass-button-primary text-sm font-semibold">Simpan Kontrak</button>
                <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-sm font-semibold">Batal</button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* 2. Incoming Modal - removed plat, surat jalan, and supir inputs */}
      {(activeModal === 'incoming' || activeModal === 'edit_incoming') && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <GlassCard className="w-full max-w-lg" hover={false}>
            <h3 className="text-lg font-bold text-white mb-6">
              {activeModal === 'incoming' ? 'Catat Penerimaan CPO Harian' : 'Edit Penerimaan CPO'}
            </h3>
            <form onSubmit={handleIncomingSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Kontrak CPO</label>
                  <select
                    required
                    value={incomingForm.kontrak_cpo_id}
                    onChange={(e) => setIncomingForm({ ...incomingForm, kontrak_cpo_id: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm bg-slate-900"
                  >
                    <option value="">Pilih Kontrak</option>
                    {contracts.map(c => <option key={c.id} value={c.id}>{c.nomor_kontrak} ({c.supplier?.nama})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tangki Penerima (CPO)</label>
                  <select
                    required
                    value={incomingForm.storage_id}
                    onChange={(e) => setIncomingForm({ ...incomingForm, storage_id: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm bg-slate-900"
                  >
                    <option value="">Pilih Tangki</option>
                    {storages.filter(s => s.jenis === 'tangki').map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Volume Kirim (Kg)</label>
                  <input
                    type="text" required placeholder="300.000"
                    value={formatNumberInput(incomingForm.qty_kirim)}
                    onChange={(e) => setIncomingForm({ ...incomingForm, qty_kirim: parseNumberInput(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Volume Terima (Kg)</label>
                  <input
                    type="text" required placeholder="299.000"
                    value={formatNumberInput(incomingForm.qty_terima)}
                    onChange={(e) => setIncomingForm({ ...incomingForm, qty_terima: parseNumberInput(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tanggal Terima</label>
                <input
                  type="date" required max={todayStr}
                  value={incomingForm.tgl}
                  onChange={(e) => setIncomingForm({ ...incomingForm, tgl: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm font-sans"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Catatan</label>
                <textarea
                  placeholder="Keterangan tambahan..."
                  value={incomingForm.note}
                  onChange={(e) => setIncomingForm({ ...incomingForm, note: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm h-16"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="submit" className="flex-1 py-2.5 rounded-xl glass-button-primary text-sm font-semibold">Simpan Penerimaan</button>
                <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-sm font-semibold">Batal</button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* 3. Log Pembayaran (Payment CRUD) Modal */}
      {activeModal === 'payments' && selectedContract && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <GlassCard className="w-full max-w-2xl max-h-[90vh] flex flex-col justify-between overflow-hidden" hover={false}>
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">Log Pembayaran Kontrak</h3>
                <p className="text-xs text-slate-400">No. Kontrak: <strong className="text-teal-400">{selectedContract.nomor_kontrak}</strong> ({selectedContract.supplier?.nama})</p>
              </div>
              <button 
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg bg-slate-950 hover:bg-slate-900 text-slate-500 hover:text-white border border-slate-800 transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {/* Add / Edit Form Block */}
              <GlassCard className="p-4 bg-slate-950/40 border border-slate-900" hover={false}>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
                  {editingPayment ? 'Edit Record Pembayaran' : 'Catat Pembayaran Baru'}
                </h4>
                <form onSubmit={handlePaymentSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tanggal</label>
                    <input
                      type="date" required
                      value={paymentForm.tgl_bayar}
                      onChange={(e) => setPaymentForm({ ...paymentForm, tgl_bayar: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg glass-input text-xs font-sans"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Nominal (Rp)</label>
                    <input
                      type="text" required placeholder="50.000.000"
                      value={formatNumberInput(paymentForm.nominal)}
                      onChange={(e) => setPaymentForm({ ...paymentForm, nominal: parseNumberInput(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg glass-input text-xs"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Catatan</label>
                    <input
                      type="text" placeholder="Catatan pembayaran"
                      value={paymentForm.catatan}
                      onChange={(e) => setPaymentForm({ ...paymentForm, catatan: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg glass-input text-xs"
                    />
                  </div>
                  <div className="md:col-span-1 flex space-x-2">
                    <button 
                      type="submit" 
                      className="flex-1 py-2 rounded-lg glass-button-primary text-xs font-bold"
                    >
                      {editingPayment ? 'Update' : 'Simpan'}
                    </button>
                    {editingPayment && (
                      <button 
                        type="button"
                        onClick={() => {
                          setEditingPayment(null);
                          setPaymentForm({ nominal: '', tgl_bayar: todayStr, metode_bayar: 'transfer', catatan: '' });
                        }}
                        className="px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold hover:text-white"
                      >
                        Batal
                      </button>
                    )}
                  </div>
                </form>
              </GlassCard>

              {/* Payments History List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Riwayat Pembayaran</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-900 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="py-2 px-2">Tanggal</th>
                        <th className="py-2 px-2 text-right">Nominal</th>
                        <th className="py-2 px-2">Keterangan</th>
                        <th className="py-2 px-2 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 text-slate-300">
                      {selectedContract.pembayaran_cpos && selectedContract.pembayaran_cpos.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="py-2.5 px-2 font-semibold text-slate-400">
                            {formatDateIndo(p.tgl_bayar)}
                          </td>
                          <td className="py-2.5 px-2 text-right font-bold text-white">
                            {formatRupiah(p.nominal)}
                          </td>
                          <td className="py-2.5 px-2 text-slate-400">{p.catatan || '-'}</td>
                          <td className="py-2.5 px-2 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button 
                                onClick={() => {
                                  setEditingPayment(p);
                                  setPaymentForm({
                                    nominal: p.nominal,
                                    tgl_bayar: p.tgl_bayar ? p.tgl_bayar.split('T')[0] : todayStr,
                                    metode_bayar: p.metode_bayar || 'transfer',
                                    catatan: p.catatan || ''
                                  });
                                }}
                                className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-teal-400 border border-slate-850 transition-colors"
                              >
                                <Edit className="h-3 w-3" />
                              </button>
                              <button 
                                onClick={() => triggerDeletePayment(p.id)}
                                className="p-1 rounded bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-850 transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {(!selectedContract.pembayaran_cpos || selectedContract.pembayaran_cpos.length === 0) && (
                        <tr>
                          <td colSpan="4" className="py-6 text-center text-slate-500 italic">
                            Belum ada riwayat pembayaran yang tercatat.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
              <div>
                <span>Total Terbayar: <strong className="text-emerald-400">{formatRupiah(selectedContract.total_terbayar || 0)}</strong></span>
              </div>
              <div>
                <span>Outstanding: <strong className="text-amber-400">{formatRupiah(selectedContract.outstanding_nominal || 0)}</strong></span>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
