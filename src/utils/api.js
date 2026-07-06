// API and Mock Data Helper
const API_BASE_URL = 'http://localhost:8000/api';

// Realistic Mock Data matching the new PostgreSQL database schema exactly
const MOCK_DATA = {
  dashboard: {
    start_date: "2026-06-06",
    end_date: "2026-07-06",
    kontrak_cpo_aktif: 2,
    total_kontrak_qty: 1500000.00, // Kg
    outstanding_qty: 802300.00, // Kg
    outstanding_nominal: 12515000000.00, // Rp
    incoming_total_qty: 697700.00, // Kg (398,500 + 299,200)
    incoming_total_loss: 2300.00, // Kg (1,500 + 800)
    saldo_terakhir: {
      saldo: 25000000000.00,
      no_rek: "102-00-112233-4",
      nama_bank: "Bank Mandiri",
      tgl: "2026-07-06"
    },
    storages: [
      { 
        id: 1, 
        nama: 'Tangki CPO 01', 
        lokasi: 'Zona Utara', 
        jenis: 'tangki', 
        kapasitas: 5000000.00, 
        terisi: 697700.00, 
        persentase: 14.0, 
        stok: [{ nama_produk: 'Crude Palm Oil', kode_produk: 'CPO', satuan: 'Kg', qty: 697700.00 }] 
      },
      { 
        id: 2, 
        nama: 'Tangki CPO 02', 
        lokasi: 'Zona Utara', 
        jenis: 'tangki', 
        kapasitas: 3000000.00, 
        terisi: 1200000.00, 
        persentase: 40.0, 
        stok: [{ nama_produk: 'Crude Palm Oil', kode_produk: 'CPO', satuan: 'Kg', qty: 1200000.00 }] 
      },
      { 
        id: 3, 
        nama: 'Tangki RBDPO 01', 
        lokasi: 'Zona Timur', 
        jenis: 'tangki', 
        kapasitas: 2000000.00, 
        terisi: 850000.00, 
        persentase: 42.5, 
        stok: [{ nama_produk: 'RBD Palm Oil', kode_produk: 'RBDPO', satuan: 'Kg', qty: 850000.00 }] 
      },
      { 
        id: 4, 
        nama: 'Tangki Olein IV56 01', 
        lokasi: 'Zona Barat', 
        jenis: 'tangki', 
        kapasitas: 4000000.00, 
        terisi: 1500000.00, 
        persentase: 37.5, 
        stok: [{ nama_produk: 'RBD Palm Olein IV56', kode_produk: 'OL-IV56', satuan: 'Kg', qty: 1500000.00 }] 
      },
      { 
        id: 5, 
        nama: 'Tangki Stearin 01', 
        lokasi: 'Zona Timur', 
        jenis: 'tangki', 
        kapasitas: 3000000.00, 
        terisi: 0.00, 
        persentase: 0.0, 
        stok: [] 
      },
      { 
        id: 6, 
        nama: 'Gudang Kemasan Retail', 
        lokasi: 'Blok B', 
        jenis: 'gudang', 
        kapasitas: 1500000.00, 
        terisi: 430000.00, 
        persentase: 28.7, 
        stok: [
          { nama_produk: 'Kemasan Minyakita', kode_produk: 'K-MINYAKITA', satuan: 'Kg', qty: 250000.00 },
          { nama_produk: 'Kemasan Salvaco', kode_produk: 'K-SALVACO', satuan: 'Kg', qty: 180000.00 }
        ] 
      },
      { 
        id: 7, 
        nama: 'Gudang Samping PFAD', 
        lokasi: 'Blok C', 
        jenis: 'gudang', 
        kapasitas: 1000000.00, 
        terisi: 420000.00, 
        persentase: 42.0, 
        stok: [{ nama_produk: 'Palm Fatty Acid Distillate', kode_produk: 'PFAD', satuan: 'Kg', qty: 420000.00 }] 
      },
    ],
    incoming_logs: [
      { id: 1, kontrak_cpo_id: 1, kontrak_cpo: { nomor_kontrak: 'CTR-CPO-001', supplier: { nama: 'PT Perkebunan Nusantara IV' } }, storage_id: 1, storage: { nama: 'Tangki CPO 01' }, qty_kirim: 400000.00, qty_terima: 398500.00, selisih_qty: 1500.00, tgl: '2026-06-25', no_surat_jalan: 'SJ-CPO-001A', supir: 'Toni Purwanto', no_kendaraan: 'BK 8912 XL', note: 'Pengiriman CPO perdana, susut normal' },
      { id: 2, kontrak_cpo_id: 1, kontrak_cpo: { nomor_kontrak: 'CTR-CPO-001', supplier: { nama: 'PT Perkebunan Nusantara IV' } }, storage_id: 1, storage: { nama: 'Tangki CPO 01' }, qty_kirim: 300000.00, qty_terima: 299200.00, selisih_qty: 800.00, tgl: '2026-06-29', no_surat_jalan: 'SJ-CPO-001B', supir: 'Rahmat Hidayat', no_kendaraan: 'BK 9021 AA', note: 'Kualitas CPO baik, kadar air 0.15%' }
    ],
    kpbn: {
      latest_price: 15485.00,
      chart: [
        { tanggal: '2026-06-28', harga: 15685.00 }, // June 28 is sunday, filled from June 26 or 29
        { tanggal: '2026-06-29', harga: 15685.00 },
        { tanggal: '2026-06-30', harga: 15550.00 },
        { tanggal: '2026-07-01', harga: 15675.00 },
        { tanggal: '2026-07-02', harga: 15545.00 },
        { tanggal: '2026-07-03', harga: 15485.00 },
        { tanggal: '2026-07-04', harga: 15485.00 }, // Saturday, filled from Friday
        { tanggal: '2026-07-05', harga: 15485.00 }, // Sunday, filled from Friday
        { tanggal: '2026-07-06', harga: 15485.00 },
      ]
    }
  },
  suppliers: [
    { id: 1, nama: 'PT Perkebunan Nusantara IV', kontrak_cpos_count: 1 },
    { id: 2, nama: 'PT Sawit Sumbermas Sarana', kontrak_cpos_count: 1 },
    { id: 3, nama: 'PT Astra Agro Lestari', kontrak_cpos_count: 0 },
    { id: 4, nama: 'PT Smart Tbk', kontrak_cpos_count: 0 },
    { id: 5, nama: 'PT Dharma Satya Nusantara', kontrak_cpos_count: 0 }
  ],
  buyers: [
    { id: 1, nama: 'PT Salim Ivomas Pratama', kontrak_penjualans_count: 0 }
  ],
  products: [
    { id: 1, nama_produk: 'Crude Palm Oil', kode_produk: 'CPO', satuan: 'Kg' },
    { id: 2, nama_produk: 'RBD Palm Oil', kode_produk: 'RBDPO', satuan: 'Kg' },
    { id: 3, nama_produk: 'Palm Fatty Acid Distillate', kode_produk: 'PFAD', satuan: 'Kg' },
    { id: 4, nama_produk: 'RBD Palm Stearin', kode_produk: 'Stearin', satuan: 'Kg' },
    { id: 5, nama_produk: 'RBD Palm Olein IV56', kode_produk: 'OL-IV56', satuan: 'Kg' },
    { id: 6, nama_produk: 'RBD Palm Olein IV57', kode_produk: 'OL-IV57', satuan: 'Kg' },
    { id: 7, nama_produk: 'RBD Palm Olein IV58', kode_produk: 'OL-IV58', satuan: 'Kg' },
    { id: 8, nama_produk: 'RBD Palm Olein IV60', kode_produk: 'OL-IV60', satuan: 'Kg' },
    { id: 9, nama_produk: 'Kemasan Minyakita', kode_produk: 'K-MINYAKITA', satuan: 'Kg' },
    { id: 10, nama_produk: 'Kemasan Salvaco', kode_produk: 'K-SALVACO', satuan: 'Kg' },
    { id: 11, nama_produk: 'Kemasan Nusakita', kode_produk: 'K-NUSAKITA', satuan: 'Kg' },
    { id: 12, nama_produk: 'Kemasan INL', kode_produk: 'K-INL', satuan: 'Kg' }
  ],
  kontrakCpos: [
    {
      id: 1,
      supplier_id: 1,
      supplier: { nama: 'PT Perkebunan Nusantara IV' },
      nomor_kontrak: 'CTR-CPO-001',
      qty: 1000000.00, // Kg
      harga_per_kg: 15500.00,
      cbd_cad: 'CAD',
      tgl_kontrak: '2026-06-15',
      tgl_jatuh_tempo: '2026-07-20',
      status: 'aktif',
      total_nilai_kontrak: 15500000000.00,
      total_terkirim: 697700.00, // Kg (398,500 + 299,200)
      outstanding_qty: 302300.00, // Kg
      total_terbayar: 8000000000.00,
      outstanding_nominal: 7500000000.00,
      incoming_cpos: [
        { id: 1, tgl: '2026-06-25', qty_kirim: 400000.00, qty_terima: 398500.00, selisih_qty: 1500.00, no_surat_jalan: 'SJ-CPO-001A', supir: 'Toni Purwanto', no_kendaraan: 'BK 8912 XL', note: 'Pengiriman CPO perdana, susut normal' },
        { id: 2, tgl: '2026-06-29', qty_kirim: 300000.00, qty_terima: 299200.00, selisih_qty: 800.00, no_surat_jalan: 'SJ-CPO-001B', supir: 'Rahmat Hidayat', no_kendaraan: 'BK 9021 AA', note: 'Kualitas CPO baik, kadar air 0.15%' }
      ],
      pembayaran_cpos: [
        { id: 1, tgl_bayar: '2026-06-18', nominal: 8000000000.00, metode_bayar: 'transfer', catatan: 'Uang muka pengadaan CPO' }
      ]
    },
    {
      id: 2,
      supplier_id: 2,
      supplier: { nama: 'PT Sawit Sumbermas Sarana' },
      nomor_kontrak: 'CTR-CPO-002',
      qty: 500000.00, // Kg
      harga_per_kg: 15600.00,
      cbd_cad: 'CBD',
      tgl_kontrak: '2026-07-01',
      tgl_jatuh_tempo: '2026-07-31',
      status: 'aktif',
      total_nilai_kontrak: 7800000000.00,
      total_terkirim: 0.00,
      outstanding_qty: 500000.00,
      total_terbayar: 0.00,
      outstanding_nominal: 7800000000.00,
      incoming_cpos: [],
      pembayaran_cpos: []
    }
  ]
};

const getHeaders = () => {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('cpo_token');
  const headers = { 
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const apiCall = async (endpoint, options = {}) => {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...getHeaders(),
        ...options.headers,
      },
    });
    if (res.status === 401) {
      // Token is invalid/expired - clear it so user can log in with a fresh real token
      localStorage.removeItem('cpo_token');
      localStorage.removeItem('cpo_user');
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
      throw new Error('Unauthenticated');
    }
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.warn(`API error on ${endpoint}, falling back to mock:`, error);
    
    // Extract endpoint path to resolve mock data
    const cleanEndpoint = endpoint.split('?')[0];
    
    if (cleanEndpoint === '/login') {
      const { email, password } = JSON.parse(options.body || '{}');
      if (email === 'admin@cpo.com' && password === 'admin123') {
        return { user: { name: 'Administrator CPO', email: 'admin@cpo.com' }, token: 'mock-token-12345' };
      }
      throw new Error('Kredensial salah');
    }
    
    if (cleanEndpoint === '/dashboard') return MOCK_DATA.dashboard;
    if (cleanEndpoint === '/suppliers') return MOCK_DATA.suppliers;
    if (cleanEndpoint === '/buyers') return MOCK_DATA.buyers;
    if (cleanEndpoint === '/master-produks') return MOCK_DATA.products;
    if (cleanEndpoint === '/kontrak-cpos') return MOCK_DATA.kontrakCpos;
    if (cleanEndpoint.startsWith('/kontrak-cpos/')) {
      const id = parseInt(cleanEndpoint.split('/').pop());
      return MOCK_DATA.kontrakCpos.find(c => c.id === id) || MOCK_DATA.kontrakCpos[0];
    }
    if (cleanEndpoint === '/incoming-cpos') return MOCK_DATA.dashboard.incoming_logs;
    if (cleanEndpoint === '/storages') return MOCK_DATA.dashboard.storages;
    if (cleanEndpoint === '/daily-targets') return [{ id: 1, tgl: new Date().toISOString().split('T')[0], target_qty: 1000000 }];
    if (cleanEndpoint.startsWith('/daily-targets/')) return { id: 1, tgl: new Date().toISOString().split('T')[0], target_qty: 1000000 };
    
    return { data: [] };
  }
};
