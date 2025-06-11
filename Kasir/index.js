const readline = require('readline');
const axios = require('axios');

// Ganti sesuai IP Admin
const ADMIN_IP = '192.168.18.114';
const ADMIN_PORT = 3000;
const BASE_URL = `http://${ADMIN_IP}:${ADMIN_PORT}`;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function showMenu() {
  console.clear();
  console.log('\n=== PANEL KASIR ===');
  console.log('1. Lihat Daftar Pesanan');
  console.log('2. Update Status Pesanan');
  console.log('3. Lihat Menu Makanan');
  console.log('4. Tambah Pesanan Manual');
  console.log('5. Cari / Filter Transaksi');
  console.log('6. Keluar');
  rl.question('Pilih opsi (1-6): ', handleInput);
}

async function handleInput(opt) {
  switch (opt) {
    case '1':
      await tampilkanPesanan();
      break;
    case '2':
      await updateStatusPesanan();
      return;
    case '3':
      await tampilkanMenu();
      break;
    case '4':
      await tambahPesananManual();
      return;
    case '5':
      await cariAtauFilterTransaksi();
      return;
    case '6':
      console.log('Keluar dari aplikasi kasir.');
      rl.close();
      process.exit(0);
    default:
      console.log('Opsi tidak dikenali.');
  }
  promptLanjut();
}

function promptLanjut() {
  rl.question('\nTekan ENTER untuk kembali ke menu...', showMenu);
}

async function tampilkanPesanan() {
  try {
    const res = await axios.get(`${BASE_URL}/transaksi`);
    const data = res.data;
    console.log('\n--- Daftar Pesanan ---');
    if (data.length === 0) {
      console.log('Belum ada pesanan masuk.');
    } else {
      data.forEach(t => {
        console.log(`ID ${t.id}: ${t.nama} x${t.jumlah} = Rp${t.total} [${t.status}] (${t.waktu})`);
      });
    }
  } catch (err) {
    console.error('Gagal mengambil data dari server admin.');
  }
}

async function updateStatusPesanan() {
  rl.question('ID Pesanan yang ingin diubah: ', id => {
    rl.question('Status baru (menunggu/disiapkan/dibatalkan/selesai): ', async status => {
      try {
        const res = await axios.put(`${BASE_URL}/transaksi/${id}`, { status });
        if (res.data.success) {
          console.log(`Status pesanan ID ${id} diubah menjadi "${status}".`);
        } else {
          console.log('Gagal mengubah status.');
        }
      } catch (err) {
        console.error('Gagal menghubungi server.');
      }
      promptLanjut();
    });
  });
}

async function tampilkanMenu() {
  try {
    const res = await axios.get(`${BASE_URL}/menu`);
    const menu = res.data;
    console.log('\n--- Menu Makanan ---');
    if (menu.length === 0) {
      console.log('Menu kosong.');
    } else {
      menu.forEach(m => {
        console.log(`ID ${m.id}: ${m.nama} - Rp${m.harga}`);
      });
    }
  } catch (err) {
    console.error('Gagal mengambil menu dari server admin.');
  }
}

async function tambahPesananManual() {
  rl.question('Nama pembeli: ', nama => {
    rl.question('ID Menu: ', idMenu => {
      rl.question('Jumlah: ', async jumlah => {
        try {
          const payload = {
            nama,
            idMenu: parseInt(idMenu),
            jumlah: parseInt(jumlah),
            sumber: 'manual'
          };
          const res = await axios.post(`${BASE_URL}/transaksi`, payload);
          if (res.data.success) {
            console.log('Pesanan berhasil ditambahkan.');
          } else {
            console.log('Gagal menambahkan pesanan.');
          }
        } catch (err) {
          console.error('Gagal mengirim pesanan:', err.message);
        }
        promptLanjut();
      });
    });
  });
}

async function cariAtauFilterTransaksi() {
  rl.question('Masukkan kata kunci nama / status / tanggal (YYYY-MM-DD): ', async keyword => {
    try {
      const res = await axios.get(`${BASE_URL}/transaksi`);
      const data = res.data;
      const hasil = data.filter(t =>
        t.nama.toLowerCase().includes(keyword.toLowerCase()) ||
        t.status.toLowerCase().includes(keyword.toLowerCase()) ||
        (t.waktu && t.waktu.startsWith(keyword))
      );
      console.log('\n--- Hasil Pencarian/Filter ---');
      if (hasil.length === 0) {
        console.log('Tidak ada hasil yang cocok.');
      } else {
        hasil.forEach(t => {
          console.log(`ID ${t.id}: ${t.nama} x${t.jumlah} = Rp${t.total} [${t.status}] (${t.waktu})`);
        });
      }
    } catch (err) {
      console.error('Gagal mengambil data transaksi.');
    }
    promptLanjut();
  });
}

console.log(`Terhubung ke server admin di ${BASE_URL}`);
showMenu();
