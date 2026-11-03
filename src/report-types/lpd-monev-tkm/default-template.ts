import type {
  ReportSectionDefinition,
  TemplateConfiguration,
} from "../types";

export const lpdMonevTkmSections: ReportSectionDefinition[] = [
  {
    key: "section_a_general",
    title: "A. Umum",
    description:
      "Narasi latar belakang, dasar pelaksanaan surat tugas, dan tujuan kegiatan monitoring dan evaluasi.",
    defaultOrder: 1,
    required: true,
    defaultContent: {
      paragraphs: [
        "Program Tenaga Kerja Mandiri (TKM) Lanjutan merupakan upaya pemerintah melalui Kementerian Ketenagakerjaan untuk memperluas kesempatan kerja dan memperkuat keberlanjutan usaha para wirausaha yang telah berkembang.",
        "Kegiatan Monitoring dan Evaluasi (Monev) dilaksanakan guna memastikan pemanfaatan dana bantuan sesuai Rencana Anggaran Biaya (RAB), memantau perkembangan usaha peserta, serta mengidentifikasi kendala yang dihadapi di lapangan.",
      ],
    },
  },
  {
    key: "section_b_summary",
    title: "B. Ringkasan Kegiatan",
    description:
      "Pengantar pelaksanaan kegiatan, wilayah monitoring, jumlah peserta, serta tabel hasil kunjungan lapangan per peserta.",
    defaultOrder: 2,
    required: true,
    defaultContent: {
      introText:
        "Pelaksanaan kegiatan monitoring dan evaluasi dilakukan melalui kunjungan lapangan dan wawancara langsung terhadap penerima bantuan TKM Lanjutan dengan rincian hasil kunjungan sebagai berikut:",
      showParticipantTable: true,
    },
  },
  {
    key: "section_c_conclusion",
    title: "C. Kesimpulan",
    description:
      "Ringkasan hasil monitoring berdasarkan agregasi kondisi usaha, serapan bantuan, dan pendampingan peserta.",
    defaultOrder: 3,
    required: true,
    defaultContent: {
      paragraphs: [
        "Secara umum penerima bantuan TKM Lanjutan yang dikunjungi masih menjalankan usahanya dan telah memanfaatkan dana bantuan sesuai peruntukan.",
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
        "Demikian Laporan Perjalanan Dinas Monitoring dan Evaluasi Peserta TKM Lanjutan ini disusun sebagai bahan pertanggungjawaban dan tindak lanjut pelaksanaan program.",
    },
  },
];

export const defaultLpdMonevTkmTemplate: TemplateConfiguration = {
  header: {
    ministryName: "KEMENTERIAN KETENAGAKERJAAN REPUBLIK INDONESIA",
    directorateName:
      "DIREKTORAT JENDERAL PEMBINAAN PENEMPATAN TENAGA KERJA DAN PERLUASAN KESEMPATAN KERJA",
    institutionName:
      "BALAI BESAR PERLUASAN KESEMPATAN KERJA BANDUNG BARAT",
    institutionAddress:
      "Jl. Raya Lembang No. 222, Kabupaten Bandung Barat, Jawa Barat",
    logoStorageKey: null,
    reportTitle: "LAPORAN PERJALANAN DINAS",
  },
  page: {
    paperSize: "A4",
    orientation: "portrait",
    fontFamily: "Times New Roman, serif",
    fontSizePt: 12,
    lineHeight: 1.5,
    marginsMm: {
      top: 25,
      right: 25,
      bottom: 25,
      left: 30,
    },
    showPageNumbers: true,
  },
  enabledSections: lpdMonevTkmSections.map((s) => s.key),
  sectionOrder: lpdMonevTkmSections.map((s) => s.key),
  standardNarratives: {
    section_a_intro:
      "Program Tenaga Kerja Mandiri (TKM) Lanjutan merupakan upaya pemerintah untuk mendorong penciptaan lapangan kerja yang berkelanjutan.",
    closing_statement:
      "Demikian laporan perjalanan dinas ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.",
  },
  dateFormat: "dd MMMM yyyy",
  currencyPrefix: "Rp",
  signatureCityDefault: "Bandung Barat",
};

