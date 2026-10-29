# PDFtoPic

Kumpulan alat PDF yang berjalan **sepenuhnya di browser**: konversi PDF ke gambar, gambar ke PDF, gabung PDF, dan pisah PDF. Tidak ada upload, tidak ada server, tidak ada akun — file Anda tidak pernah meninggalkan perangkat.

**Demo langsung:** <https://hendrazulpiadi.github.io/pdftopic/>

## Fitur

Aplikasi memiliki empat alat yang bisa dipilih lewat tab di halaman utama.

### 1. PDF → Gambar (PNG / JPG)

- Render halaman dengan [PDF.js](https://mozilla.github.io/pdf.js/) ke `<canvas>`, lalu diekspor menjadi gambar.
- Pratinjau thumbnail semua halaman, pilih semua / kosongkan / per halaman.
- Format PNG (kualitas terbaik) atau JPG (ukuran lebih kecil, kualitas 0.92).
- Kualitas 72 DPI (standar) atau 300 DPI (siap cetak).
- Satu halaman menghasilkan satu file gambar; banyak halaman digabung menjadi `.zip`.

### 2. Gambar → PDF (PNG / JPG)

- Tambah satu atau banyak gambar PNG/JPG; setiap gambar menjadi satu halaman PDF.
- Urutkan gambar (naik/turun) dan hapus sebelum dikonversi.
- Ukuran halaman: **A4** (gambar dipasang dengan margin, orientasi mengikuti gambar) atau **Sesuai gambar** (halaman mengikuti ukuran gambar).
- Gambar PNG dengan transparansi tetap didukung; jika encoder gagal, gambar dinormalisasi lewat canvas.

### 3. Gabung PDF

- Tambahkan dua file PDF atau lebih, atur urutannya, lalu gabungkan.
- **Lossless**: halaman disalin apa adanya dengan [pdf-lib](https://pdf-lib.js.org/), bukan dirasterisasi, sehingga teks dan vektor tetap utuh.
- Ringkasan jumlah file dan total halaman ditampilkan sebelum proses.

### 4. Pisah PDF

- Pratinjau semua halaman dan pilih halaman yang ingin dipisah.
- Dua mode output:
  - **Satu PDF** — halaman terpilih digabung menjadi satu PDF baru.
  - **Satu PDF per halaman** — setiap halaman menjadi PDF terpisah, diunduh sebagai `.zip`.
- Hasil juga lossless karena halaman disalin dengan pdf-lib.

### Fitur umum

- **100% client-side** — semua aset (termasuk font Inter) dilayani dari origin sendiri; tidak ada upload dan tidak ada request ke domain pihak ketiga.
- **Drag & drop** atau pemilih file, validasi tipe file, dan batas 50 MB per file.
- **Indikator progres** dengan persentase dan tombol **Batalkan**.
- **Unduhan otomatis** setelah proses selesai.
- **ZIP di Web Worker** (`js/zip-worker.js`) agar UI tetap responsif.
- **Aksesibel & responsif** — navigasi keyboard, `aria-live`, skip link, dan tata letak mobile-friendly.
- **Proteksi memori** — resolusi render halaman dibatasi maksimum 50 juta piksel (`MAX_PAGE_PIXELS`).

## Struktur Proyek

```
.
├── index.html              # Markup UI (tab alat + view upload/workspace/progress/success)
├── favicon.svg
├── .nojekyll               # Agar GitHub Pages menyajikan file apa adanya
├── prd.md                  # Product Requirements Document
├── README.md
├── THIRD-PARTY-NOTICES.md  # Lisensi pustaka & font pihak ketiga
├── css/
│   └── styles.css          # Design system + styling responsif
├── js/
│   ├── app.js              # Logika semua alat: render PDF, gambar→PDF, gabung, pisah
│   └── zip-worker.js       # Web Worker pembuat ZIP (JSZip)
└── vendor/
    ├── pdf.min.js          # PDF.js core (render PDF)
    ├── pdf.worker.min.js   # PDF.js worker
    ├── pdf-lib.min.js      # pdf-lib (tulis PDF, gabung, pisah)
    ├── jszip.min.js        # JSZip (bundling ZIP)
    └── fonts/
        ├── InterVariable.woff2
        └── LICENSE.txt     # SIL Open Font License 1.1
```

## Cara Menjalankan

Aplikasi ini statis, tanpa proses build. Karena memakai Web Worker, buka lewat HTTP server lokal (bukan `file://`):

```powershell
# Python
python -m http.server 8080

# atau Node.js
npx serve .
```

Lalu buka <http://localhost:8080>.

Untuk produksi, cukup unggah seluruh folder ke hosting statis seperti GitHub Pages, Netlify, atau Vercel.

## Deploy ke GitHub Pages

Aplikasi ini tidak butuh proses build. Langkahnya:

1. Push seluruh isi folder ini ke repository GitHub (branch `main`).
2. Buka **Settings → Pages** di repository.
3. Pada **Build and deployment**, pilih **Deploy from a branch** → branch `main` → folder `/ (root)` → **Save**.
4. Tunggu beberapa saat, lalu buka `https://<username>.github.io/<repo>/`.

Catatan:

- Semua path bersifat relatif, jadi aplikasi tetap berjalan di subpath `/<repo>/`.
- `.nojekyll` disertakan agar GitHub Pages tidak memproses file lewat Jekyll.
- Tidak ada backend, variabel lingkungan, atau secret yang perlu diatur.
- Setelah halaman dimuat, aplikasi berjalan sepenuhnya offline (font, pustaka, dan aset dilayani dari origin yang sama).
- Halaman mengirim header CSP melalui `<meta>` (tidak ada skrip atau koneksi ke domain eksternal) serta `referrer: no-referrer`.

## Alur Penggunaan

1. Pilih alat lewat tab: **PDF → Gambar**, **Gambar → PDF**, **Gabung PDF**, atau **Pisah PDF**.
2. Seret file ke area unggah atau klik tombol pilih file.
3. Atur opsi pada panel pengaturan (format, kualitas, ukuran halaman, atau mode pemisahan).
4. Klik tombol aksi (mis. **Konversi**, **Buat PDF**, **Gabungkan**, **Ekstrak**).
5. Unduhan dimulai otomatis; klik **Unduh file** jika tidak.

## Detail Teknis

| Aspek | Implementasi |
| --- | --- |
| Render PDF | `pdfjsLib.getDocument()` → `page.render()` ke canvas `alpha: false` dengan latar putih |
| Skala output gambar | `quality / 72` (72 DPI = 1×, 300 DPI ≈ 4.17×) |
| Batas piksel | `MAX_PAGE_PIXELS = 50_000_000`; skala diturunkan otomatis jika melebihi |
| Thumbnail | Target 300 px sisi terpanjang, JPEG kualitas 0.8, dibuat berurutan agar hemat memori |
| Gambar → PDF | `PDFDocument.create()` + `embedPng`/`embedJpg` + `addPage`/`drawImage` |
| Gabung PDF | `copyPages()` dari setiap sumber ke dokumen baru (mempertahankan konten asli) |
| Pisah PDF | `copyPages()` untuk halaman terpilih; mode per halaman dibungkus ZIP |
| Nama file | Berbasis nama file asal, mis. `dokumen-hal-01.png`, `dokumen-PNG.zip`, `dokumen.pdf`, `dokumen-3-gambar.pdf`, `dokumen-gabungan.pdf`, `dokumen-halaman.pdf`, `dokumen-halaman.zip` |
| Pembatalan | `renderTask.cancel()` + terminasi worker ZIP + penanda sesi (`session`) |
| Pembersihan | Object URL di-`revoke`, canvas di-reset, dokumen PDF di-`destroy()` |

## Kelayakan Fitur Gabung & Pisah PDF

Kedua fitur **memungkinkan dan sudah diimplementasikan** tanpa backend, menggunakan `pdf-lib` (525 KB, dimuat lokal dari `vendor/`). Pendekatan ini dipilih karena:

- **Lossless** — halaman disalin sebagai objek PDF asli, bukan dirender ulang menjadi gambar, sehingga teks tetap bisa dicari dan kualitas tidak turun.
- **Ringan & offline** — tidak butuh server; semua proses di perangkat pengguna.
- **Tidak mengganggu alur lama** — PDF.js tetap dipakai untuk pratinjau, pdf-lib hanya untuk menulis file output.

Batasan yang perlu diketahui:

- PDF **terenkripsi/kata sandi** tidak dapat digabung atau dipisah; aplikasi menampilkan pesan kesalahan. PDF tersebut perlu dibuka proteksinya terlebih dahulu.
- Semua file diproses di memori browser, sehingga dokumen berukuran sangat besar (ratusan MB total) dapat terasa berat tergantung perangkat.
- Bentuk interaktif (form field, anotasi) dan penanda buku tidak dijamin ikut tersalin saat penggabungan/pemisahan.

## Kompatibilitas

Membutuhkan browser modern yang mendukung Web Worker, Canvas `toBlob`, dan `pdfjsLib` — Chrome, Edge, Firefox, atau Safari versi terbaru. Browser tidak didukung akan menampilkan notifikasi.

## Kredit

- [PDF.js](https://github.com/mozilla/pdf.js) — Mozilla
- [pdf-lib](https://pdf-lib.js.org/)
- [JSZip](https://stuk.github.io/jszip/)
- Font [Inter](https://rsms.me/inter/) (self-hosted, SIL Open Font License 1.1)
