const express = require('express');
const fs = require('fs');
const cors = require('cors');
const os = require('os');
const path = require('path');
const readline = require('readline');
const { spawn } = require('child_process');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const MENU_FILE = path.join(__dirname, 'database/menu.json');
const TRANSAKSI_FILE = path.join(__dirname, 'database/transaksi.json');

let menu = fs.existsSync(MENU_FILE) ? JSON.parse(fs.readFileSync(MENU_FILE)) : [];
let transaksi = fs.existsSync(TRANSAKSI_FILE) ? JSON.parse(fs.readFileSync(TRANSAKSI_FILE)) : [];

function saveMenu() {
  fs.writeFileSync(MENU_FILE, JSON.stringify(menu, null, 2));
}

function saveTransaksi() {
  fs.writeFileSync(TRANSAKSI_FILE, JSON.stringify(transaksi, null, 2));
}

app.get('/menu', (req, res) => res.json(menu));

app.post('/menu', (req, res) => {
  const data = req.body;
  data.id = menu.length ? Math.max(...menu.map(m => m.id)) + 1 : 1;
  menu.push(data);
  saveMenu();
  res.json({ success: true, id: data.id });
});

app.put('/menu/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = menu.findIndex(m => m.id === id);
  if (index !== -1) {
    menu[index] = { ...menu[index], ...req.body };
    saveMenu();
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, message: 'Menu tidak ditemukan' });
  }
});

app.delete('/menu/:id', (req, res) => {
  const id = parseInt(req.params.id);
  menu = menu.filter(m => m.id !== id);
  saveMenu();
  res.json({ success: true });
});

app.get('/transaksi', (req, res) => res.json(transaksi));

app.post('/transaksi', (req, res) => {
  const data = req.body;
  data.id = transaksi.length ? Math.max(...transaksi.map(t => t.id)) + 1 : 1;
  data.status = 'menunggu';
  const menuItem = menu.find(m => m.id === data.idMenu);
  data.total = menuItem ? data.jumlah * menuItem.harga : 0;
  data.waktu = new Date().toISOString().split('T')[0];
  transaksi.push(data);
  saveTransaksi();
  res.json({ success: true, id: data.id });
});

app.put('/transaksi/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = transaksi.findIndex(t => t.id === id);
  if (index !== -1) {
    transaksi[index] = { ...transaksi[index], ...req.body };
    saveTransaksi();
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
  }
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function cls() {
  process.stdout.write('\x1Bc');
}

function promptLanjut(callback) {
  rl.question('\nTekan ENTER untuk kembali ke menu...', () => {
    cls();
    callback();
  });
}

function showCLI() {
  console.log('╔════════════════════════════╗');
  console.log('║     PANEL ADMIN KANTIN     ║');
  console.log('╚════════════════════════════╝');
  console.log('1. Lihat Menu');
  console.log('2. Tambah Menu');
  console.log('3. Edit Menu');
  console.log('4. Hapus Menu');
  console.log('5. Lihat Transaksi');
  console.log('6. Cari Transaksi');
  console.log('7. Simpan Manual');
  console.log('8. Keluar');
  rl.question('\nPilih opsi (1-8): ', handleInput);
}

function handleInput(opt) {
  cls();
  switch (opt) {
    case '1':
      console.log('📋 Daftar Menu:\n');
      menu.forEach(m => console.log(`- ${m.id}. ${m.nama} - Rp${m.harga}`));
      return promptLanjut(showCLI);

    case '2':
      rl.question('Nama makanan: ', nama => {
        rl.question('Harga: ', harga => {
          const id = menu.length ? Math.max(...menu.map(m => m.id)) + 1 : 1;
          menu.push({ id, nama, harga: parseInt(harga) });
          saveMenu();
          console.log('\n✔ Menu ditambahkan.');
          promptLanjut(showCLI);
        });
      });
      return;

    case '3':
      rl.question('ID menu yang ingin diedit: ', id => {
        const m = menu.find(m => m.id === parseInt(id));
        if (!m) {
          console.log('❌ Menu tidak ditemukan.');
          return promptLanjut(showCLI);
        }
        rl.question(`Nama baru (${m.nama}): `, nama => {
          rl.question(`Harga baru (${m.harga}): `, harga => {
            m.nama = nama || m.nama;
            m.harga = harga ? parseInt(harga) : m.harga;
            saveMenu();
            console.log('\n✔ Menu diperbarui.');
            promptLanjut(showCLI);
          });
        });
      });
      return;

    case '4':
      rl.question('ID menu yang akan dihapus: ', id => {
        const before = menu.length;
        menu = menu.filter(m => m.id !== parseInt(id));
        if (menu.length < before) {
          saveMenu();
          console.log('✔ Menu dihapus.');
        } else {
          console.log('❌ Menu tidak ditemukan.');
        }
        promptLanjut(showCLI);
      });
      return;

    case '5':
      transaksi = fs.existsSync(TRANSAKSI_FILE) ? JSON.parse(fs.readFileSync(TRANSAKSI_FILE)) : [];
      console.log('📦 Riwayat Transaksi:\n');
      if (!transaksi.length) {
        console.log('Belum ada transaksi.');
      } else {
        transaksi.forEach(t => {
          console.log(`- ID ${t.id}: ${t.nama} x${t.jumlah} = Rp${t.total} [${t.status}]`);
        });
      }
      return promptLanjut(showCLI);

    case '6':
      transaksi = fs.existsSync(TRANSAKSI_FILE) ? JSON.parse(fs.readFileSync(TRANSAKSI_FILE)) : [];
      rl.question('Cari berdasarkan nama atau status: ', keyword => {
        const hasil = transaksi.filter(t =>
          t.nama.toLowerCase().includes(keyword.toLowerCase()) ||
          t.status.toLowerCase().includes(keyword.toLowerCase())
        );
        if (hasil.length === 0) {
          console.log('❌ Tidak ditemukan transaksi yang cocok.');
        } else {
          hasil.forEach(t => {
            console.log(`- ID ${t.id}: ${t.nama} x${t.jumlah} = Rp${t.total} [${t.status}]`);
          });
        }
        promptLanjut(showCLI);
      });
      return;

    case '7':
      saveMenu();
      saveTransaksi();
      console.log('✔ Data disimpan manual.');
      return promptLanjut(showCLI);

    case '8':
      console.log('👋 Keluar...');
      rl.close();
      process.exit(0);

    default:
      console.log('❌ Opsi tidak valid.');
      return promptLanjut(showCLI);
  }
}

function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const iface of Object.values(nets)) {
    for (const config of iface) {
      if (config.family === 'IPv4' && !config.internal) {
        return config.address;
      }
    }
  }
  return 'localhost';
}

function bukaCLI() {
  const isWin = process.platform === 'win32';
  const command = isWin
    ? `start cmd /k node ${__filename} cli`
    : `gnome-terminal -- node ${__filename} cli`;
  spawn(command, { shell: true });
}

if (process.argv[2] === 'cli') {
  cls();
  showCLI();
} else {
  app.listen(PORT, () => {
    const ip = getLocalIP();
    console.log(`🚀 Server admin berjalan di http://${ip}:${PORT}`);
    bukaCLI();
  });
}
