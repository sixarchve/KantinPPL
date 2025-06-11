const axios = require('axios');
const readline = require('readline');
const os = require('os');

const BASE_URL = 'http://192.168.18.114:3000'; // Ganti dengan IP server admin
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

let namaPengguna = '';

function cls() {
  process.stdout.write('\x1Bc');
}

function promptEnter(callback) {
  rl.question('\nTekan ENTER untuk kembali...', () => {
    cls();
    callback();
  });
}

async function lihatMenu() {
  try {
    const res = await axios.get(`${BASE_URL}/menu`);
    console.log('📋 Daftar Menu:\n');
    res.data.forEach(m => console.log(`- ${m.id}. ${m.nama} - Rp${m.harga}`));
  } catch (err) {
    console.log('❌ Gagal mengambil menu.');
  }
  promptEnter(showMenu);
}

async function buatPesanan() {
  try {
    const { data: menu } = await axios.get(`${BASE_URL}/menu`);
    console.log('📋 Pilih Menu:\n');
    menu.forEach(m => console.log(`- ${m.id}. ${m.nama} - Rp${m.harga}`));

    rl.question('\nID menu: ', idMenu => {
      const menuItem = menu.find(m => m.id == idMenu);
      if (!menuItem) {
        console.log('❌ Menu tidak ditemukan.');
        return promptEnter(showMenu);
      }
      rl.question('Jumlah: ', jumlah => {
        axios.post(`${BASE_URL}/transaksi`, {
          idMenu: parseInt(idMenu),
          jumlah: parseInt(jumlah),
          nama: namaPengguna
        }).then(() => {
          console.log('✔ Pesanan dikirim.');
          promptEnter(showMenu);
        }).catch(() => {
          console.log('❌ Gagal mengirim pesanan.');
          promptEnter(showMenu);
        });
      });
    });
  } catch (err) {
    console.log('❌ Gagal mengambil menu.');
    promptEnter(showMenu);
  }
}

async function lihatStatus() {
  try {
    const { data: transaksi } = await axios.get(`${BASE_URL}/transaksi`);
    const milikSaya = transaksi.filter(t => t.nama === namaPengguna);
    if (!milikSaya.length) {
      console.log('❌ Belum ada pesanan.');
    } else {
      console.log('📦 Status Pesanan:\n');
      milikSaya.forEach(t => {
        console.log(`- ID ${t.id}: ${t.jumlah} x Menu ${t.idMenu} = Rp${t.total} [${t.status}]`);
      });
    }
  } catch (err) {
    console.log('❌ Gagal mengambil status.');
  }
  promptEnter(showMenu);
}

async function batalkanPesanan() {
  try {
    const { data: transaksi } = await axios.get(`${BASE_URL}/transaksi`);
    const milikSaya = transaksi.filter(t => t.nama === namaPengguna && t.status === 'menunggu');
    if (!milikSaya.length) {
      console.log('❌ Tidak ada pesanan yang bisa dibatalkan.');
      return promptEnter(showMenu);
    }
    console.log('📛 Pesanan yang bisa dibatalkan:\n');
    milikSaya.forEach(t => {
      console.log(`- ID ${t.id}: ${t.jumlah} x Menu ${t.idMenu} = Rp${t.total}`);
    });
    rl.question('\nID pesanan yang akan dibatalkan: ', id => {
      axios.put(`${BASE_URL}/transaksi/${id}`, { status: 'dibatalkan' })
        .then(() => {
          console.log('✔ Pesanan dibatalkan.');
          promptEnter(showMenu);
        })
        .catch(() => {
          console.log('❌ Gagal membatalkan pesanan.');
          promptEnter(showMenu);
        });
    });
  } catch (err) {
    console.log('❌ Gagal memuat data.');
    promptEnter(showMenu);
  }
}

function showMenu() {
  console.log('╔════════════════════════════╗');
  console.log('║      APLIKASI PELANGGAN    ║');
  console.log('╚════════════════════════════╝');
  console.log('1. Lihat Menu');
  console.log('2. Buat Pesanan');
  console.log('3. Lihat Status Pesanan');
  console.log('4. Batalkan Pesanan');
  console.log('5. Keluar');
  rl.question('\nPilih opsi (1-5): ', handleInput);
}

function handleInput(opt) {
  cls();
  switch (opt) {
    case '1': return lihatMenu();
    case '2': return buatPesanan();
    case '3': return lihatStatus();
    case '4': return batalkanPesanan();
    case '5': rl.close(); process.exit(0);
    default:
      console.log('❌ Opsi tidak valid.');
      return promptEnter(showMenu);
  }
}

function start() {
  cls();
  rl.question('Masukkan nama Anda: ', nama => {
    namaPengguna = nama;
    cls();
    showMenu();
  });
}

start();
