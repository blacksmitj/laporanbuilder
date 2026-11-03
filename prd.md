# PRODUCT REQUIREMENT DOCUMENT (PRD)
# PDF Report Generator

**Versi:** 1.1  
**Status:** Final – Development Specification  
**Framework:** Next.js  
**UI:** shadcn/ui  
**State Management:** TanStack Query + Zustand  
**Database:** PostgreSQL  
**Storage:** S3-compatible / RustFS  
**Output:** PDF

---

# BAGIAN I — PRODUCT REQUIREMENT DOCUMENT

## 1. Ringkasan Produk

PDF Report Generator adalah aplikasi berbasis web untuk mengotomatisasi pembuatan laporan formal dalam format PDF berdasarkan data Excel dan template laporan yang dapat dikonfigurasi.

Fitur utama pertama adalah pembuatan Laporan Perjalanan Dinas (LPD) Monitoring dan Evaluasi Peserta TKM Lanjutan. LPD ini merupakan **salah satu jenis laporan**; aplikasi dirancang agar jenis laporan lain dapat ditambahkan di kemudian hari sehingga satu dashboard dapat digunakan untuk membuat banyak jenis laporan (lihat Bagian 5A).

Aplikasi memungkinkan operator mengunggah Excel, memvalidasi data, mengatur konfigurasi laporan, menyusun narasi otomatis dengan bantuan AI, melakukan penyuntingan, melihat preview, dan menghasilkan PDF.

## 2. Keputusan Produk

| Aspek | Keputusan |
|---|---|
| Template | Configurable melalui pengaturan |
| Sumber data | Satu file Excel untuk satu laporan |
| Narasi | Hybrid (Rules + AI) |
| Finalisasi | Operator langsung menghasilkan PDF final |
| Storage | S3-compatible / RustFS |
| Output | PDF saja |
| Approval workflow | Tidak ada pada MVP |
| Dataset | Terisolasi per laporan |

## 3. Tujuan Produk

1. Mengurangi waktu pembuatan laporan.
2. Menghilangkan penyalinan data Excel secara manual.
3. Menstandarkan format laporan.
4. Menghasilkan narasi berdasarkan data aktual.
5. Mempermudah penyuntingan sebelum PDF diterbitkan.
6. Menyediakan arsip laporan yang dapat diunduh kembali.

## 4. Target Pengguna

### Administrator
- Mengelola pengguna.
- Mengatur template laporan.
- Mengatur konfigurasi aplikasi.
- Mengelola master data petugas.

### Operator
- Membuat laporan.
- Mengunggah Excel.
- Memvalidasi data.
- Menyusun narasi.
- Mengedit isi laporan.
- Menghasilkan PDF final.
- Mengelola arsip laporan.

Tidak ada peran reviewer khusus pada MVP.

## 5. Ruang Lingkup Fitur

| Modul | Fitur | Prioritas |
|---|---|---|
| Dashboard | Statistik dan aktivitas laporan | MVP |
| Authentication | Login dan hak akses | MVP |
| Excel Import | Upload, parsing, validasi | MVP |
| Data Preview | Preview dan koreksi data | MVP |
| Report Workspace | Pengelolaan satu laporan | MVP |
| Template Configuration | Pengaturan format dokumen | MVP |
| Narrative Generator | Rules dan AI | MVP |
| Report Editor | Penyuntingan konten | MVP |
| PDF Preview | Preview dokumen | MVP |
| PDF Generator | Export PDF | MVP |
| Report Archive | Riwayat laporan | MVP |
| S3 Storage | Penyimpanan file | MVP |
| User Management | Pengelolaan pengguna | MVP |
| Audit Log | Riwayat perubahan | MVP |
| Report Type Registry | Registrasi jenis laporan (multi-jenis) | MVP (fondasi) |

## 5A. Arsitektur Multi-Jenis Laporan (Report Type)

### 5A.1 Prinsip

Laporan Perjalanan Dinas (LPD) Monev TKM Lanjutan **hanyalah jenis laporan pertama** yang diimplementasikan. Aplikasi dirancang sebagai **platform pembuat laporan multi-jenis**, sehingga dalam satu dashboard operator dapat membuat berbagai jenis laporan (misalnya: LPD Monev, Laporan Pelatihan, Laporan Penyaluran Bantuan, Laporan Kegiatan Bulanan, dll).

Penambahan jenis laporan baru **tidak boleh** memerlukan perubahan pada modul inti (auth, workspace, storage, PDF engine, arsip, audit log). Jenis laporan baru cukup didefinisikan sebagai modul/definisi baru yang didaftarkan ke registry.

### 5A.2 Komponen generik (core)

| Komponen | Keterangan |
|---|---|
| Authentication & User | Sama untuk semua jenis laporan |
| Report Workspace | Status, metadata umum, riwayat |
| Import Pipeline | Upload, parsing, preview, konfirmasi |
| Template Engine | Konfigurasi dokumen (kop, font, margin, dsb) |
| Narrative Engine | Mekanisme Rules + AI (aturan spesifik per jenis) |
| Editor | Editor berbasis daftar section dinamis |
| PDF Generator | HTML rendering + Playwright |
| Storage, Arsip, Audit Log | Sama untuk semua jenis |

### 5A.3 Komponen spesifik per jenis laporan (Report Type Definition)

| Elemen | Keterangan |
|---|---|
| `key` | Identitas unik, mis. `lpd-monev-tkm` |
| `name` & `description` | Label UI (Bahasa Indonesia) |
| `metadataSchema` | Zod schema informasi laporan (nomor ST, periode, dsb) |
| `dataSource` | Sumber data: Excel, input manual, atau tanpa dataset |
| `columnMapping` & `rowSchema` | Mapping header Excel dan validasi per baris |
| `sections` | Daftar section laporan, urutan default, dan komponen editornya |
| `narrativeRules` | Rules engine khusus jenis tersebut |
| `aiPromptConfig` | Prompt & batasan AI khusus jenis tersebut |
| `defaultTemplate` | Template dokumen bawaan |
| `htmlRenderer` | Komponen render HTML/PDF per section |
| `dashboardMetrics` | (Opsional) statistik khusus jenis laporan |

Contoh kontrak:

```ts
export interface ReportTypeDefinition<TMeta, TRow> {
  key: string;
  name: string;
  description: string;
  version: number;
  metadataSchema: ZodType<TMeta>;
  dataSource: "excel" | "manual" | "none";
  rowSchema?: ZodType<TRow>;
  columnMapping?: Record<keyof TRow, string>;
  sections: ReportSectionDefinition[];
  narrativeRules?: NarrativeRule<TRow>[];
  aiPromptConfig?: AiPromptConfig;
  defaultTemplate: TemplateConfiguration;
}

export const reportTypeRegistry = {
  "lpd-monev-tkm": lpdMonevTkmDefinition,
  // jenis laporan berikutnya didaftarkan di sini
} satisfies Record<string, ReportTypeDefinition<any, any>>;
```

### 5A.4 Dampak pada fitur

- **Dashboard**: statistik total dan per jenis laporan, serta tombol "Buat Laporan" dengan pilihan jenis laporan.
- **Buat laporan baru**: operator memilih jenis laporan terlebih dahulu, lalu form metadata ditampilkan sesuai `metadataSchema` jenis tersebut.
- **Daftar & arsip**: dapat difilter berdasarkan jenis laporan.
- **Template**: setiap template terikat pada satu `report_type`; satu jenis dapat memiliki beberapa template.
- **Editor**: section berasal dari definisi jenis laporan, bukan hardcode.
- **Hak akses (pasca-MVP)**: administrator dapat mengaktifkan/menonaktifkan jenis laporan dan membatasi jenis per pengguna.

### 5A.5 Aturan pengembangan

1. Kode spesifik jenis laporan ditempatkan di `src/report-types/<report-type-key>/`.
2. Modul inti tidak boleh berisi percabangan seperti `if (reportType === "lpd-monev-tkm")`; gunakan definisi dari registry.
3. Data spesifik jenis laporan disimpan di kolom JSONB (`metadata`, `normalized_data`, `content`) dan divalidasi oleh schema jenis tersebut.
4. Definisi jenis laporan memiliki `version`; snapshot menyimpan versi definisi yang digunakan.
5. Jenis laporan yang dinonaktifkan tetap dapat dibuka dan arsipnya diunduh.

### 5A.6 Roadmap jenis laporan

| Tahap | Jenis Laporan | Status |
|---|---|---|
| 1 | LPD Monev Peserta TKM Lanjutan | MVP |
| 2 | (Contoh) Laporan Pelaksanaan Pelatihan | Kandidat |
| 3 | (Contoh) Laporan Penyaluran Bantuan | Kandidat |
| 4 | (Contoh) Laporan Kegiatan Bulanan | Kandidat |

## 6. Struktur Laporan LPD (Jenis Laporan #1: `lpd-monev-tkm`)

Mengikuti struktur dokumen Word referensi.

### Identitas dokumen
- Kop surat.
- Logo instansi.
- Nama kementerian.
- Direktorat jenderal.
- Nama balai.
- Alamat instansi.
- Judul laporan.

### Informasi perjalanan dinas
- Kepada Yth.
- Dari.
- Nama petugas.
- NIP.
- Perihal.
- Nomor surat tugas.
- Tanggal pelaksanaan.

### A. Umum
Narasi latar belakang, dasar pelaksanaan, dan tujuan kegiatan.

### B. Ringkasan Kegiatan
- Pengantar kegiatan.
- Wilayah monitoring.
- Jumlah peserta.
- Tabel hasil kunjungan.

Kolom tabel:
1. Nomor.
2. Nama TKM Lanjutan.
3. Tanggal Monev.
4. Sektor Usaha/Produk Utama.
5. Hasil Kunjungan.

### C. Kesimpulan
Ringkasan hasil monitoring berdasarkan agregasi data peserta.

### Penutup
- Kalimat penutup.
- Tempat dan tanggal laporan.
- Nama pelapor.
- NIP.
- Ruang tanda tangan.

Sumber format: dokumen LPD Monev Kabupaten/Kota Bogor yang diberikan.

## 7. Modul Import Excel

### 7.1 Ketentuan

- Mendukung `.xlsx` dan `.xls` sesuai dukungan parser.
- Satu file Excel digunakan untuk satu laporan.
- Satu baris merepresentasikan satu responden.
- Header Excel digunakan sebagai identifikasi kolom.
- Semua kolom sumber dipertahankan.
- Baris kosong diabaikan dengan pencatatan.
- Data tidak otomatis digabungkan dengan laporan lain.

### 7.2 Alur

1. Operator membuat laporan.
2. Operator mengunggah Excel.
3. Sistem membaca header dan data.
4. Sistem melakukan validasi.
5. Sistem menampilkan preview.
6. Operator memperbaiki data jika diperlukan.
7. Operator mengonfirmasi import.
8. Dataset disimpan sebagai bagian laporan.

### 7.3 Validasi

| Field | Aturan |
|---|---|
| Nama Responden | Wajib |
| NIK | Validasi panjang dan format |
| ID TKM | Validasi format |
| Tanggal Wawancara | Validasi tanggal |
| TEAM | Dapat digunakan untuk filter |
| Wilayah | Validasi struktur wilayah |
| Nominal | Numerik |
| Persentase | Normalisasi |
| Dokumentasi | Validasi referensi file |
| Duplikasi | Peringatan berdasarkan NIK/ID TKM |

Data kosong tidak boleh dianggap sebagai nilai nol.

### 7.4 Isolasi dataset

Setiap laporan memiliki:
- File Excel sumber.
- Dataset hasil parsing.
- Data peserta.
- Data dokumentasi.
- Narasi.
- Konfigurasi laporan.
- Snapshot final.

Dataset satu laporan tidak dapat digunakan atau diubah oleh laporan lainnya.

## 8. Modul Report Workspace

Setiap laporan mempunyai workspace sendiri.

Informasi laporan:
- Nama laporan.
- Jenis laporan.
- Tahun anggaran.
- Nomor surat tugas.
- Periode pelaksanaan.
- Wilayah.
- Petugas.
- File Excel.
- Jumlah peserta.
- Status laporan.

Status laporan:

| Status | Keterangan |
|---|---|
| Draft | Laporan sedang dikerjakan |
| Generated | PDF final telah berhasil dibuat |
| Archived | Laporan telah diarsipkan |

Tidak ada status menunggu persetujuan.

## 9. Modul Template Configuration

Template tidak menggunakan visual drag-and-drop builder.

Administrator mengatur template melalui halaman konfigurasi.

### Pengaturan dokumen

- Logo.
- Kop surat.
- Identitas instansi.
- Judul.
- Font.
- Ukuran font.
- Margin.
- Ukuran kertas.
- Orientasi.
- Header.
- Footer.
- Nomor halaman.
- Jarak paragraf.
- Format tabel.
- Page break.
- Tata letak tanda tangan.

### Pengaturan konten

- Mengaktifkan/menonaktifkan bagian laporan.
- Mengatur urutan bagian.
- Mengatur narasi standar.
- Mengatur format tanggal.
- Mengatur format mata uang.
- Mengatur format tabel peserta.
- Mengatur variabel dinamis.

Template memiliki versioning agar perubahan template tidak mengubah dokumen yang sudah dihasilkan.

## 10. Modul Narrative Generator

Menggunakan dua metode.

### Rules Engine

Menghasilkan narasi berdasarkan data terstruktur.

Contoh:

Data:
- Nama: Amalia.
- Usaha: Desain dan menjahit pakaian.
- Tenaga kerja: 1 orang.
- Bantuan: Rp15.000.000.
- Pendampingan: Sudah mendapatkan pendampingan.

Hasil:

"Amalia merupakan peserta TKM Lanjutan Tahun 2026 dengan usaha di bidang industri kreatif, yaitu desain dan menjahit pakaian. Usaha saat ini masih berjalan dengan didukung satu orang tenaga kerja. Peserta telah menerima bantuan sebesar Rp15.000.000 dan telah mendapatkan pendampingan usaha."

### AI Narrative Enhancement

AI hanya digunakan untuk:
- Memperbaiki struktur kalimat.
- Menyusun paragraf agar lebih formal.
- Menggabungkan informasi yang saling berkaitan.
- Memperbaiki keterbacaan.
- Membantu menyusun kesimpulan.

AI tidak boleh:
- Menambahkan fakta yang tidak tersedia.
- Mengarang kondisi usaha.
- Mengubah nilai keuangan.
- Mengasumsikan data kosong.
- Mengubah status pencairan.
- Membuat klaim peningkatan usaha tanpa bukti.

Hasil AI harus diperiksa operator sebelum digunakan.

## 11. Modul Report Editor

Editor dibagi menjadi beberapa bagian:

1. Informasi laporan.
2. Petugas perjalanan dinas.
3. Bagian A – Umum.
4. Bagian B – Ringkasan Kegiatan.
5. Hasil kunjungan peserta.
6. Bagian C – Kesimpulan.
7. Penutup dan tanda tangan.

Fitur:
- Edit teks.
- Generate ulang narasi.
- AI enhancement.
- Tambah dan hapus paragraf.
- Mengatur urutan peserta.
- Menyunting hasil kunjungan setiap peserta.
- Menyimpan draft otomatis.
- Melihat status perubahan.

Data asli Excel tidak berubah ketika narasi diedit.

## 12. PDF Generator

Ketentuan:
- Format PDF.
- Kertas A4.
- Orientasi portrait.
- Font sesuai template.
- Kop surat.
- Tabel multi-halaman.
- Nomor halaman.
- Dukungan tanda tangan.
- Dukungan foto apabila diaktifkan.
- Layout konsisten dengan preview.

PDF final disimpan di S3-compatible storage.

Setiap generate menghasilkan versi dokumen baru, bukan menimpa dokumen lama tanpa riwayat.

## 13. Dashboard dan Arsip

Dashboard:
- Total laporan.
- Draft laporan.
- PDF berhasil dibuat.
- Import terakhir.
- Aktivitas terakhir.

Arsip:
- Nama laporan.
- Nomor ST.
- Tahun anggaran.
- Periode.
- Jumlah peserta.
- Pembuat.
- Tanggal pembuatan.
- Status.
- Unduh PDF.

## 14. Batasan MVP

Tidak termasuk:
- Generate Word.
- Tanda tangan elektronik tersertifikasi.
- Approval berjenjang.
- Integrasi Bizhub.
- Integrasi API pemerintah.
- Template drag-and-drop.
- Database peserta global lintas laporan.
- AI autonomous report generation.
- Pengiriman email otomatis.

---

# BAGIAN II — TECHNICAL SPECIFICATION

## 15. Technology Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js App Router |
| Language | TypeScript |
| UI | shadcn/ui |
| Styling | Tailwind CSS |
| Server State | TanStack Query |
| Client State | Zustand |
| Form | React Hook Form |
| Validation | Zod |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| Excel Parser | ExcelJS |
| PDF Rendering | Playwright |
| Storage | S3-compatible / RustFS |
| Authentication | Better Auth |
| Rich Text | Tiptap |
| AI Integration | Provider-agnostic LLM adapter |
| Testing | Vitest + Playwright |
| Deployment | Docker |

## 16. Arsitektur Sistem

```text
Browser
  |
  v
Next.js App Router
  |
  +-- shadcn/ui
  |
  +-- TanStack Query
  |
  +-- Zustand
  |
  v
Next.js Route Handlers
  |
  +-- Authentication
  +-- Zod Validation
  +-- Business Services
  |
  +-- Excel Processing
  |     |
  |     +-- ExcelJS
  |     +-- Header Mapping
  |     +-- Data Validation
  |
  +-- Narrative Engine
  |     |
  |     +-- Rules Engine
  |     +-- AI Adapter
  |
  +-- Report Engine
  |     |
  |     +-- Template Configuration
  |     +-- HTML Rendering
  |     +-- Playwright PDF
  |
  +-- PostgreSQL
  |
  +-- S3 Storage / RustFS
```

## 17. Struktur Folder

```text
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── reports/
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   └── [reportId]/
│   │   │       ├── page.tsx
│   │   │       ├── import/
│   │   │       ├── participants/
│   │   │       ├── editor/
│   │   │       └── preview/
│   │   ├── templates/
│   │   ├── users/
│   │   └── settings/
│   │
│   └── api/
│       ├── reports/
│       ├── imports/
│       ├── participants/
│       ├── narratives/
│       ├── templates/
│       └── pdf/
│
├── components/
│   ├── ui/
│   ├── dashboard/
│   ├── reports/
│   ├── imports/
│   ├── participants/
│   ├── editor/
│   └── pdf/
│
├── features/
│   ├── reports/
│   ├── imports/
│   ├── participants/
│   ├── narratives/
│   ├── templates/
│   └── pdf/
│
├── lib/
│   ├── auth/
│   ├── db/
│   ├── storage/
│   ├── excel/
│   ├── pdf/
│   ├── ai/
│   └── validations/
│
├── server/
│   ├── services/
│   ├── repositories/
│   └── permissions/
│
├── stores/
│   └── report-editor.store.ts
│
├── report-types/
│   ├── registry.ts
│   ├── types.ts
│   └── lpd-monev-tkm/
│       ├── definition.ts
│       ├── metadata-schema.ts
│       ├── column-mapping.ts
│       ├── narrative-rules.ts
│       ├── sections/
│       └── default-template.ts
│
└── types/
```

## 18. Database Schema

Gunakan PostgreSQL dengan Drizzle ORM.

### 18.1 Tabel utama

**users**
- id
- name
- email
- password/auth reference
- role
- created_at
- updated_at

**reports**
- id
- name
- report_type
- fiscal_year
- status
- metadata (JSONB)
- template_version_id
- created_by
- created_at
- updated_at

**import_batches**
- id
- report_id
- original_filename
- storage_key
- status
- total_rows
- successful_rows
- failed_rows
- imported_at

**participants**
- id
- report_id
- import_batch_id
- row_number
- raw_data (JSONB)
- normalized_data (JSONB)
- created_at
- updated_at

**participant_documents**
- id
- participant_id
- document_type
- original_filename
- storage_key
- mime_type
- created_at

**officials**
- id
- name
- nip
- position
- institution
- created_at
- updated_at

**report_officials**
- id
- report_id
- official_id
- sort_order
- signing_enabled

**report_contents**
- id
- report_id
- section_key
- content (JSONB)
- updated_at

**report_participants**
- id
- report_id
- participant_id
- sort_order
- visit_date
- narrative
- created_at
- updated_at

**report_templates**
- id
- name
- report_type
- description
- is_active
- created_at

**report_template_versions**
- id
- template_id
- version
- configuration (JSONB)
- created_at

**report_snapshots**
- id
- report_id
- version
- payload (JSONB)
- created_at
- created_by

**report_files**
- id
- report_id
- snapshot_id
- storage_key
- filename
- file_size
- status
- generated_at

**audit_logs**
- id
- user_id
- report_id
- action
- metadata (JSONB)
- created_at

### 18.2 Relasi penting

- Report memiliki banyak peserta.
- Report memiliki satu atau beberapa batch import, dengan satu batch aktif sebagai sumber dataset laporan.
- Participant terikat pada satu report.
- Report memiliki banyak petugas.
- Report menggunakan satu versi template untuk setiap snapshot final.
- Report dapat memiliki banyak versi PDF.
- ReportSnapshot menyimpan data final yang independen dari data sumber.

### 18.3 Database rules

1. Gunakan UUID sebagai primary key.
2. Setiap tabel yang menyimpan data laporan memiliki `report_id` jika relevan.
3. Gunakan foreign key.
4. Gunakan index pada `report_id`, `status`, dan `created_at`.
5. NIK tidak dijadikan primary key.
6. Simpan raw Excel data untuk menjaga data sumber.
7. Simpan normalized data untuk kebutuhan aplikasi.
8. Terapkan transaction untuk import dan finalisasi.
9. Gunakan soft delete untuk laporan yang sudah memiliki dokumen final.
10. Jangan menyimpan signed URL S3 sebagai referensi permanen.

## 19. Excel Processing Specification

### Processing pipeline

```text
Upload File
    |
    v
Temporary Storage
    |
    v
ExcelJS Parser
    |
    v
Read Workbook
    |
    v
Detect Header
    |
    v
Map Columns
    |
    v
Normalize Values
    |
    v
Zod Validation
    |
    v
Import Preview
    |
    v
User Confirmation
    |
    v
Database Transaction
    |
    v
Import Complete
```

### Mapping

Gunakan nama header Excel sebagai key mapping.

Contoh:

```ts
const columnMapping = {
  respondentName: "Nama Responden",
  nik: "NIK Responden",
  tkmId: "ID TKM Lanjutan Responden",
  interviewDate: "Tanggal Wawancara",
  team: "TEAM",
  sector: "Sektor Usaha",
  businessType: "Jenis Usaha",
  mainProduct: "Produk Utama",
  revenue: "Rata-rata Omset Usaha per Bulan/Periode saat ini (dalam Rupiah)",
  netProfit: "Rata-rata Laba Bersih usaha per Bulan/Periode saat ini (dalam Rupiah)"
};
```

Implementasi sebenarnya harus memetakan seluruh kolom Excel yang diberikan, bukan hanya contoh di atas.

### Normalisasi

- Tanggal disimpan dalam format ISO.
- Rupiah disimpan sebagai integer.
- Persentase disimpan dalam format numerik yang konsisten.
- Nilai Ya/Tidak dinormalisasi.
- String kosong diubah menjadi null.
- Nilai sumber tetap dipertahankan dalam raw_data.

## 20. Narrative Engine Specification

Gunakan tiga lapisan.

### Layer 1 — Data Extraction

Mengambil data dari normalized_data.

### Layer 2 — Rules Engine

Menghasilkan narasi berdasarkan kondisi.

Contoh:

```ts
function buildEmploymentNarrative(data: ParticipantData) {
  const fixed = data.fixedWorkers ?? 0;
  const temporary = data.temporaryWorkers ?? 0;

  const total = fixed + temporary;

  if (total === 0) {
    return null;
  }

  return `Usaha saat ini didukung oleh ${total} orang tenaga kerja.`;
}
```

Aturan harus disesuaikan dengan definisi tenaga kerja pada instrumen. Jangan menjumlahkan kolom yang memiliki kemungkinan tumpang tindih.

### Layer 3 — AI Enhancement

AI menerima data terstruktur dan narasi hasil rules engine.

Contoh input:

```json
{
  "task": "improve_narrative",
  "language": "id",
  "style": "formal_official_report",
  "facts": {
    "name": "Amalia",
    "business": "Desain dan menjahit pakaian",
    "workers": 1,
    "fund_received": 15000000
  },
  "draft": "Narasi hasil rules engine",
  "constraints": [
    "Do not invent facts",
    "Preserve all numbers",
    "Do not infer missing values",
    "Do not change the factual meaning"
  ]
}
```

### AI output rules

- Output harus berupa teks.
- Operator harus dapat menerima atau menolak hasil.
- Simpan narasi asli dan narasi AI secara terpisah.
- AI tidak boleh langsung menimpa data sumber.
- Simpan model, waktu pemrosesan, dan versi prompt untuk audit.

Jika AI tidak tersedia, sistem tetap harus dapat membuat laporan melalui Rules Engine.

## 21. Report Editor Specification

Zustand mengelola state lokal editor.

Contoh state:

```ts
interface ReportEditorState {
  reportId: string | null;
  selectedParticipantIds: string[];
  sectionContents: Record<string, unknown>;
  narratives: Record<string, string>;
  isDirty: boolean;

  setSectionContent: (
    key: string,
    content: unknown
  ) => void;

  updateNarrative: (
    participantId: string,
    narrative: string
  ) => void;

  reorderParticipants: (
    ids: string[]
  ) => void;

  reset: () => void;
}
```

Ketentuan:
- Zustand hanya untuk state editor lokal.
- TanStack Query menjadi sumber data server.
- Autosave menggunakan debounce.
- Autosave harus menampilkan status penyimpanan.
- Konflik perubahan harus ditangani menggunakan optimistic concurrency atau version check.
- Jangan menyimpan seluruh dataset Excel ke Zustand.

## 22. PDF Generation Specification

### Teknologi

Playwright + Chromium.

### Pipeline

```text
Report Editor
    |
    v
Save Draft
    |
    v
Create Snapshot Payload
    |
    v
Resolve Template Version
    |
    v
Render HTML
    |
    v
Load Fonts and Assets
    |
    v
Playwright PDF
    |
    v
Validate PDF
    |
    v
Upload to S3
    |
    v
Save Report File Metadata
    |
    v
Report Generated
```

### Ketentuan rendering

- Gunakan HTML/CSS khusus untuk dokumen.
- Jangan menggunakan screenshot halaman dashboard sebagai PDF.
- Gunakan print CSS.
- Gunakan `break-inside: avoid` pada komponen yang perlu dijaga agar tidak terpotong.
- Tabel harus mendukung header berulang.
- Pastikan font dan gambar sudah dimuat sebelum PDF dibuat.
- Gunakan A4 dan margin yang mengikuti template.
- Nomor halaman dihasilkan oleh PDF renderer.

### Snapshot

Sebelum generate:
1. Ambil seluruh data laporan.
2. Ambil narasi yang sudah disetujui operator.
3. Ambil konfigurasi template.
4. Buat snapshot immutable.
5. Generate PDF berdasarkan snapshot tersebut.

Jika generate ulang, buat snapshot dan file versi baru.

## 23. S3 Storage Specification

Gunakan S3 SDK dengan endpoint yang configurable.

Struktur object key:

```text
reports/
  {reportId}/
    source/
      original.xlsx
    participants/
      {participantId}/
        business.jpg
        activity.jpg
        product.jpg
        signature.png
    pdf/
      v1.pdf
      v2.pdf
```

### Security

- Bucket private.
- Tidak menggunakan public object URL untuk dokumen laporan.
- Akses file melalui backend authorization.
- Gunakan signed URL dengan masa berlaku terbatas jika diperlukan.
- Validasi MIME type dan ukuran file.
- Simpan storage key, bukan signed URL.
- Gunakan credentials khusus aplikasi.
- Terapkan lifecycle dan backup sesuai kebijakan penyimpanan.

## 24. API Specification

Gunakan Next.js Route Handlers.

### Reports

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/reports` | Daftar laporan |
| POST | `/api/reports` | Membuat laporan |
| GET | `/api/reports/:id` | Detail laporan |
| PATCH | `/api/reports/:id` | Update laporan |
| DELETE | `/api/reports/:id` | Hapus draft |

### Excel Import

| Method | Endpoint | Fungsi |
|---|---|---|
| POST | `/api/reports/:id/imports` | Upload Excel |
| GET | `/api/reports/:id/imports/:batchId` | Status import |
| GET | `/api/reports/:id/imports/:batchId/preview` | Preview data |
| POST | `/api/reports/:id/imports/:batchId/confirm` | Konfirmasi import |

### Participants

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/reports/:id/participants` | Daftar peserta |
| GET | `/api/reports/:id/participants/:pid` | Detail peserta |
| PATCH | `/api/reports/:id/participants/:pid` | Update data |
| DELETE | `/api/reports/:id/participants/:pid` | Hapus peserta |

### Narratives

| Method | Endpoint | Fungsi |
|---|---|---|
| POST | `/api/reports/:id/narratives/generate` | Rules generation |
| POST | `/api/reports/:id/narratives/enhance` | AI enhancement |
| PATCH | `/api/reports/:id/narratives/:pid` | Update narasi |

### Report Content

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/reports/:id/content` | Ambil isi laporan |
| PUT | `/api/reports/:id/content` | Simpan isi laporan |

### PDF

| Method | Endpoint | Fungsi |
|---|---|---|
| POST | `/api/reports/:id/pdf` | Generate PDF |
| GET | `/api/reports/:id/pdf` | Riwayat PDF |
| GET | `/api/reports/:id/pdf/:fileId` | Download PDF |

### Templates

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/templates` | Daftar template |
| POST | `/api/templates` | Membuat template |
| GET | `/api/templates/:id` | Detail template |
| PATCH | `/api/templates/:id` | Update template |
| POST | `/api/templates/:id/versions` | Membuat versi baru |

Semua endpoint wajib melakukan autentikasi, otorisasi, dan validasi input.

## 25. Frontend Specification

### Halaman utama

```text
/dashboard
/reports
/reports/new
/reports/[reportId]
/reports/[reportId]/import
/reports/[reportId]/participants
/reports/[reportId]/editor
/reports/[reportId]/preview
/templates
/templates/[templateId]
/users
/settings
```

### Report Wizard

Pembuatan laporan menggunakan tahapan:

**Step 1 — Informasi Laporan**
- Nama laporan.
- Tahun anggaran.
- Nomor ST.
- Periode.
- Wilayah.
- Petugas.

**Step 2 — Import Excel**
- Upload.
- Mapping.
- Validasi.
- Preview.
- Konfirmasi.

**Step 3 — Pilih Peserta**
- Daftar peserta.
- Search.
- Filter.
- Pilih semua.
- Pilih sebagian.
- Urutkan peserta.

**Step 4 — Generate Narasi**
- Rules generation.
- AI enhancement.
- Edit hasil.

**Step 5 — Report Editor**
- Bagian A.
- Bagian B.
- Bagian C.
- Penutup.
- Tanda tangan.

**Step 6 — Preview dan Export**
- Preview halaman.
- Generate PDF.
- Simpan arsip.
- Download.

## 26. Security Specification

1. Authentication wajib.
2. Authorization berbasis role.
3. Setiap query laporan wajib memeriksa akses pengguna.
4. Isolasi data berdasarkan report_id.
5. NIK dan nomor telepon termasuk data sensitif.
6. File Excel dan PDF menggunakan private storage.
7. File upload divalidasi.
8. API dibatasi ukuran request.
9. Audit log mencatat aktivitas penting.
10. AI hanya menerima data yang diperlukan untuk penyusunan narasi.
11. Jangan memasukkan NIK, nomor telepon, atau informasi pribadi yang tidak diperlukan ke prompt AI.
12. Database dan storage harus memiliki backup.

## 27. Acceptance Criteria

### Import
- [ ] Excel dapat diunggah.
- [ ] Header dapat dibaca.
- [ ] Seluruh kolom instrumen dapat dipetakan.
- [ ] Data dapat divalidasi.
- [ ] Preview tersedia.
- [ ] Operator dapat mengonfirmasi import.
- [ ] Dataset terisolasi pada satu laporan.

### Report
- [ ] Laporan dapat dibuat.
- [ ] Metadata dapat diedit.
- [ ] Peserta dapat dipilih.
- [ ] Petugas dapat dipilih.
- [ ] Narasi otomatis dapat dihasilkan.
- [ ] AI enhancement opsional.
- [ ] Narasi dapat diedit.
- [ ] Draft dapat disimpan.

### PDF
- [ ] Preview tersedia.
- [ ] PDF A4 dapat dihasilkan.
- [ ] Tabel dapat berlanjut lintas halaman.
- [ ] Kop surat tampil dengan benar.
- [ ] Tanda tangan tersedia.
- [ ] PDF tersimpan di S3.
- [ ] PDF dapat diunduh kembali.
- [ ] Generate ulang menghasilkan versi baru.

### Template
- [ ] Konfigurasi template dapat diubah.
- [ ] Perubahan template memiliki versi.
- [ ] Laporan lama tetap konsisten.

---

# BAGIAN III — DEVELOPMENT ROADMAP

## 28. Urutan Implementasi

| Tahap | Pekerjaan | Output |
|---|---|---|
| 1 | Project setup dan authentication | Fondasi aplikasi |
| 2 | Database dan schema | Struktur data |
| 3 | Report CRUD | Pengelolaan laporan |
| 4 | Excel parser | Import data |
| 5 | Validation dan preview | Validasi Excel |
| 6 | Participant management | Pengelolaan peserta |
| 7 | Template configuration | Pengaturan dokumen |
| 8 | Rules narrative engine | Narasi otomatis |
| 9 | AI integration | Penyempurnaan narasi |
| 10 | Report editor | Penyuntingan laporan |
| 11 | HTML report renderer | Layout dokumen |
| 12 | PDF generator | Export PDF |
| 13 | S3 integration | Penyimpanan dokumen |
| 14 | Archive dan audit log | Arsip dan histori |
| 15 | Testing dan deployment | Aplikasi siap produksi |

## 29. Prioritas Teknis

Urutan yang disarankan adalah:

1. Selesaikan import Excel dan validasi terlebih dahulu.
2. Pastikan struktur data peserta benar.
3. Bangun rules engine sebelum integrasi AI.
4. Pastikan narasi dapat disunting dan disimpan.
5. Bangun HTML template sesuai Word referensi.
6. Pastikan PDF identik secara struktur dan konsisten dengan preview.
7. Integrasikan storage dan arsip.
8. Lakukan pengujian dengan file Excel dan Word referensi yang sebenarnya.

## 30. Definition of Done

Development MVP dinyatakan selesai apabila operator dapat melakukan proses berikut tanpa pekerjaan manual di luar aplikasi:

1. Login.
2. Membuat laporan baru.
3. Mengisi metadata perjalanan dinas.
4. Mengunggah file Excel.
5. Memvalidasi data.
6. Mengonfirmasi import.
7. Memilih peserta.
8. Menghasilkan narasi otomatis.
9. Memanfaatkan AI untuk penyempurnaan narasi.
10. Mengedit seluruh isi laporan.
11. Melihat preview.
12. Menghasilkan PDF.
13. Menyimpan PDF ke S3.
14. Mengunduh kembali PDF dari arsip.

**Hasil akhir yang diharapkan:** Satu aplikasi yang mampu mengubah satu file Excel instrumen Monev menjadi satu laporan perjalanan dinas PDF yang formal, terstruktur, dapat dikonfigurasi, dan siap dipertanggungjawabkan.
