import type {
  ReportSectionDefinition,
  TemplateConfiguration,
} from "../types";

export const lpdMonevTkmSections: ReportSectionDefinition[] = [
  {
    key: "section_a_general",
    title: "Hasil Penugasan",
    description:
      "Narasi latar belakang pembinaan ketenagakerjaan, peran BBPKK Bandung Barat, tahapan penyaluran TKM Lanjutan, dan kewajiban kepatuhan RAB.",
    defaultOrder: 1,
    required: true,
    defaultContent: {
      paragraphs: [
        "Dalam rangka upaya perluasan kesempatan kerja, Kementerian Ketenagakerjaan memiliki  program Pembinaan Ketenagakerjaan Bantuan Tenaga Kerja Mandiri. Program ini diarahkan untuk menciptakan wirausaha yang dapat menyerap tenaga kerja sebanyak mungkin secara berkelanjutan. Melalui program TKM ini, masyarakat dibekali kemampuan untuk bangkit dari keterpurukan ekonomi, bahkan dipersiapkan menjadi agen-agen pemberdayaan yang berpotensi menjadi penggerak pembukaan lapangan kerja baru bagi para penganggur atau pencari kerja di sekelilingnya.",
        "Balai Besar Perluasan Kesempatan Kerja (BBPKK) Bandung Barat sebagai Unit Pelaksana Teknis Pusat (UPTP) Direktorat Jenderal Binapenta dan PKK Kementerian Ketenagakerjaan mempunyai tugas melaksanakan penciptaan tenaga kerja mandiri lanjutan. Kegiatan Tenaga Kerja Mandiri Lanjutan ini diperuntukkan bagi individu-individu yang pernah mendapatkan program TKM Pemula, Layanan Kewirausahaan dan Talent Innovation Hub (TIH) dari kementerian ketenagakerjaan dan masih membutuhkan bantuan baik dari sisi manajerial, permodalan maupun akses pasar untuk perkembangan usahanya. Selain itu, diharapkan para tenaga kerja mandiri lanjutan tersebut nantinya dapat menghasilkan maupun mengembangkan suatu produk baru, serta dapat memulai kerjasama kemitraan dengan individu/perorangan untuk terus mengembangkan, usahanya agar dapat menjadi usaha yang mampu bersaing dalam dunia usaha dan berkelanjutan.",
        "Adapun dalam penyaluran bantuan TKM Lanjutan ada beberapa tahapan yaitu proses sosialisasi, pendaftaran melalui aplikasi Bizhub, seleksi Administrasi Substansi, seleksi wawancara. Selanjutnya penerima bantuan TKM Lanjutan yang lolos pada penetapan verifikasi mengikuti pembekalan bersamaan dengan penandatanganan MOU, pembekalan ini bertujuan untuk membekali para TKM Lanjutan yang akan mengembangkan usaha. Tahap selanjutnya penerima bantuan menyampaikan kelengkapan administrasi pencairan meliputi 1) Surat perjanjian kerjasama; 2) Surat pernyataan penerima dana bantuan ; 3) RAB yang telah disetujui oleh Tim seleksi ; 4) Surat pengajuan dana bantuan dan 5) surat permohonan pencairan dana bantuan. Penyaluran dana bantuan dilakukan melalui pembayaran langsung (LS) dari rekening Kas Umum Negara ke rekening penyaluran dana untuk kemudian disalurkan ke rekening penerima dana bantuan oleh bank penyalur sebagaimana ketentua peraturan perundang-undangan pelaksanaan anggaran.",
        "Penerima dana bantuan TKM Lanjutan wajib menggunakan seluruh dana bantuan sesuai dengan RAB yang telah disetujui Tim Balai Besar Perluasan Kesempatam Kerja (BBPKK) Bandung Barat dan nantinya harus membuat laporan pertanggungjawaban mengikuti aturan keuangan sesuai dengan peraturan yang berlaku.",
      ],
    },
  },
  {
    key: "section_b_summary",
    title: "Pelaksanaan Monitoring dan Evaluasi",
    description:
      "Pengantar monitoring wilayah tugas serta tabel rincian hasil monitoring peserta.",
    defaultOrder: 2,
    required: true,
    defaultContent: {
      monitoringRegionIntro:
        "Berkenaan dengan pelaksanaan kegiatan TKM Lanjutan, tim melakukan Monitoring di [Wilayah Monitoring];",
      introText:
        "Adapun Monitoring yang dilakukan dirinci dalam tabel  sebagai berikut :",
      showParticipantTable: true,
    },
  },
  {
    key: "section_c_conclusion",
    title: "Kesimpulan & Evaluasi",
    description:
      "Ringkasan realisasi bantuan sesuai RAB dan kondisi temuan peserta di lapangan.",
    defaultOrder: 3,
    required: true,
    defaultContent: {
      paragraphs: [
        "Berkenaan dengan pelaksanaan kegiatan Monitoring dan Evaluasi TKM Lanjutan, dana bantuan secara umum sudah direalisasikan sesuai dengan RAB yang sudah disepakati ketika pembekalan.",
      ],
    },
  },
  {
    key: "section_closing",
    title: "Penutup & Tanda Tangan",
    description:
      "Kalimat penutup laporan, tempat dan tanggal pembuatan laporan, serta blok tanda tangan petugas pelapor.",
    defaultOrder: 4,
    required: true,
    defaultContent: {
      closingParagraph:
        "Demikian laporan Perjalanan Dinas ini disampaikan, untuk dapat diketahui dan sekaligus sebagai bahan pertanggung jawaban dalam melaksanakan tugas.",
    },
  },
];

export const defaultLpdMonevTkmTemplate: TemplateConfiguration = {
  header: {
    showKop: true,
    ministryName: "KEMENTERIAN KETENAGAKERJAAN REPUBLIK INDONESIA",
    directorateName:
      "DIREKTORAT JENDERAL PEMBINAAN PENEMPATAN TENAGA KERJA DAN PERLUASAN KESEMPATAN KERJA",
    institutionName:
      "BALAI BESAR PERLUASAN KESEMPATAN KERJA",
    institutionAddress:
      "Jalan Raya Lembang No. 222, Desa Lembang, Kecamatan Lembang, Kabupaten Bandung Barat, Provinsi Jawa Barat 40391",
    institutionContact:
      "https://bbpkk.kemnaker.go.id/ | bbpkk@kemnaker.go.id | (022) 2786053",
    logoStorageKey: null,
    reportTitle: "LAPORAN PERJALANAN DINAS",
    titleFontFamily: "Arial, sans-serif",
    titleFontSizePt: 11,
    titleFontWeight: "bold",
    titleLetterSpacing: "0.5px",
    ministryFontFamily: "Arial, sans-serif",
    ministryFontSizePt: 10.5,
    ministryFontWeight: "normal",
    directorateFontFamily: "Arial, sans-serif",
    directorateFontSizePt: 10,
    directorateFontWeight: "bold",
    institutionFontFamily: "Arial, sans-serif",
    institutionFontSizePt: 12.5,
    institutionFontWeight: "bold",
    kopMarginsMm: {
      top: 15,
      left: 15,
      right: 15,
    },
  },
  page: {
    paperSize: "A4",
    orientation: "portrait",
    fontFamily: "Arial, sans-serif",
    fontSizePt: 11,
    lineHeight: 1.5,
    marginsMm: {
      top: 25.4,
      right: 20,
      bottom: 20,
      left: 20,
    },
    showPageNumbers: true,
  },
  enabledSections: lpdMonevTkmSections.map((s) => s.key),
  sectionOrder: lpdMonevTkmSections.map((s) => s.key),
  standardNarratives: {
    section_a_intro:
      "Program Tenaga Kerja Mandiri (TKM) Lanjutan merupakan upaya pemerintah untuk mendorong penciptaan lapangan kerja yang berkelanjutan.",
    closing_statement:
      "Demikian laporan Perjalanan Dinas ini disampaikan, untuk dapat diketahui dan sekaligus sebagai bahan pertanggung jawaban dalam melaksanakan tugas.",
  },
  dateFormat: "dd MMMM yyyy",
  currencyPrefix: "Rp",
  signatureCityDefault: "Lembang",
};

