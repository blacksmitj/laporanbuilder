import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseExcelBuffer } from "@/lib/excel/parser";
import { lpdMonevTkmColumnSpecs } from "@/report-types/lpd-monev-tkm/column-mapping";
import { lpdMonevTkmRowSchema } from "@/report-types/lpd-monev-tkm/row-schema";

const SAMPLE_TSV = `No\tTanggal Wawancara\tTEAM\tTanggal Pencairan\tProsentase Pembelanjaan\tAlamat Wawancara\tDesa/Kelurahan tempat Wawancara\tKecamatan tempat Wawancara\tKabupaten/Kota tempat Wawancara\tProvinsi tempat Wawancara\tNama Responden\tNIK Responden\tID TKM Lanjutan Responden\tJenis Kelamin\tUsia\tPendidikan Terakhir\tNomor Telepon/WA\tSektor Usaha\tJenis Usaha\tProduk Utama\tJumlah Tenaga Kerja awal\tRata-rata Omset Usaha per Bulan/Periode saat ini (dalam Rupiah)\tRata-rata Laba Bersih usaha per Bulan/Periode saat ini (dalam Rupiah)\tSaluran Pemasaran Produk\tWilayah Pemasaran\tMedia Sosial Usaha\tNama Akun Media Sosial Usaha\tDarimana memperoleh informasi Program TKM Lanjutan\tKapan ANDA mendaftarkan diri untuk mengikuti Program TKM Lanjutan (Bulan dan Tahun)\tApakah ANDA pernah membaca Petunjuk Teknis penyaluran TKM Lanjutan \tJika 'Ya', bagaimana isi juknis. Apakah jelas dan membantu dalam mengikuti Program TKM Lanjutan?\tApakah ANDA pernah mengakses laman Bizhub\tSiapa yang mendaftarkan ANDA dalam Program TKM Lanjutan\tMenurut ANDA, Bagaimana proses Pendaftaran TKM Lanjutan\tMenurut ANDA, Bagaimana persyaratan untuk mengikuti Program TKM Lanjutan\tApa kendala yang dihadapi selama Pendaftaran TKM Lanjutan\tApakah ANDA mengetahui seluruh rangkaian proses Seleksi TKM Lanjutan\tDari semua tahapan Seleksi Program TKM Lanjutan, menurut ANDA mana yang paling sulit\tMenurut ANDA, Bagaimana keterbukaan alur proses dari Pendaftaran, Seleksi sampai dengan Penetapan Penerima Bantuan TKM Lanjutan\tDarimana ANDA mendapat informasi bahwa ANDA lolos seleksi penerima bantuan TKM Lanjutan\tApakah ANDA mengikuti pembekalan secara Offline/Online\tMenurut pendapat ANDA, bagaimana manfaat materi dalam pembekalan Program TKM Lanjutan bagi usaha ANDA?\tSelain modal, apa yang ANDA butuhkan bagi pengembangan usaha ANDA?\tMateri apa yang ANDA perlukan namun belum ada dalam pembekalan? Sebutkan!\tApakah usaha yang ANDA ikuti dalam Program TKM Lanjutan sudah mencairkan dana bantuan?\tBerapa jumlah DANA yang Anda terima? (dalam rupiah)\tApakah ANDA mengalami kendala pada saat pencairan bantuan di Bank yang ditunjuk?\tJika ‘Ya’ kendala apa yang ANDA hadapi pada saat pencairan dana bantuan?\tMenurut pendapat ANDA, apakah jumlah bantuan tersebut cukup untuk membantu kebutuhan usaha yang diajukan di proposal?\tSeberapa besar manfaat yang ANDA rasakan dari Program TKM Lanjutan?\tBagaimana tingkat kepuasan ANDA terhadap Program TKM Lanjutan\tBerikan alasan dari tingkat kepuasan ANDA!\tApakah ANDA mengetahui adanya kewajiban untuk menyusun dan mengirimkan Laporan Pertanggungjawaban (LPJ) Keuangan Bantuan TKM Lanjutan?\tApakah ANDA sudah membaca Mekanisme penggunaan dana dan Pertanggungjawaban Dana TKM Lanjutan?\tApakah terdapat kesulitan dalam menyusun LPJ keuangan Bantuan TKM Lanjutan?\tJika 'Ya', sebutkan kesulitan yang ANDA temui dalam menyusun LPJ keuangan?\tApakah terdapat kesulitan dalam mengunggah LPJ Keuangan Bantuan TKM Lanjutan di laman Bizhub?\tJika 'Ya', sebutkan kesulitan yang ANDA temui dalam mengunggah LPJ keuangan?\tApakah ANDA mengetahui adanya sanksi apabila ANDA tidak menggunakan dana bantuan sebagaimana mestinya dan tidak membuat LPJ sesuai dengan jangka waktu yang ditetapkan?\tKesesuaian nilai pembelanjaan dengan RAB\tKetersediaan bukti pembelanjaan (nota/kwitansi)\tKevalidan bukti pembelanjaan (nota/kwitansi)\tKetersediaan alat yang dibeli\tKetersediaan bahan yang dibeli\tDokumentasi kegiatan usaha\tDokumentasi barang atau bahan yang dibeli\tBerita Acara Serah Terima (BAST)\tLaporan Teknis (perkembangan usaha)\tPengecekan rekening atau rekening koran untuk memastikan dana yang diberikan telah digunakan dan dibelanjakan\tHasil pengecekan di lapangan terhadap keberadaan usaha\tBerapa prosentase pertambahan produksi atau penjualan setelah mendapatkan program TKM Lanjutan?\tBerapa prosentase pertambahan jumlah pelanggan setelah mendapatkan program TKM Lanjutan?\tApakah ada pertambahan wilayah pemasaran produk usaha setelah mendapatkan program TKM Lanjutan?\tBagaimana pertumbuhan omset yang diperoleh selama 3 bulan ke belakang?\tBagaimana pertumbuhan laba bersih yang diperoleh selama 3 bulan ke belakang?\tApakah ANDA memiliki catatan keuangan (pembukuan) usaha?\tBerapa jumlah tenaga kerja saat ini?\tJumlah Tenaga Kerja Tetap\tJumlah Tenaga Kerja Tidak Tetap\tApakah ANDA telah mendapatkan pendampingan usaha dari pendamping Perguruan Tinggi (PTN/PTS)?\tApabila 'Ya' sebutkan Nama Pendamping dan dari PTN/PTS apa?\tPendampingan seperti apa yang didapatkan oleh ANDA sebagai TKM Lanjutan?\tBerapa kali ANDA telah mendapatkan kunjungan pendampingan usaha dari pendamping?\tMenurut ANDA, bagaimana kemampuan Pendamping TKM Lanjutan dalam mendampingi ANDA selama menerima bantuan program TKM Lanjutan?\tApa manfaat yang paling ANDA rasakan dari pendampingan usaha TKM Lanjutan?\tDokumentasi tempat usaha/usaha dan TKM Lanjutan\tDokumentasi kegiatan (sedang menjalankan usaha)\tDokumentasi produk usaha\tTanda Tangan\tCATATAN\tURL Dokumentasi tempat usaha/usaha dan TKM Lanjutan\tURL Dokumentasi kegiatan (sedang menjalankan usaha)\tURL Dokumentasi produk usaha
3\t29/10/2026\tAceh 1\t18/09/2026\tSemua telah dibelanjakan\tJalan Garot, No. 19, RT 000/000\tGarot\tDarul Imarah\tKAB. ACEH BESAR\tAceh\tamalia\t1106075111970002\t957831\tPerempuan\t28\tSMA\t082163963521\tIndustri Kreatif\tDesain pakaian dan menjahit pakaian dengan mesin\tBaju, mukena, khimar\t1\t2500000\t700000\tLangsung ke pelanggan\tAntar provinsi\t\t\tMedia Sosial BBPKK\tMei\tYa\tIsi sudah jelas dan sudah membantu\tYa\tDaftar sendiri\tCukup mudah\tMudah\t\tYa\t\tCukup terbuka\tWhatsapp pemberitahuan dari BBPKK\tOffline\tBermanfaat\t\t\tSudah\t15000000\tTidak\t\tCukup\tBermanfaat\tPuas\t\tYa\tSudah\tTidak\t\tTidak\t\tYa\tSesuai\tAda\tValid\tAda\tAda\tTidak\tAda\tAda\tTidak\tSesuai\tMasih berjalan\t\t\tTidak ada\tTetap\tTetap\tAda\t1\t1\t\tSudah dapat\tYasmin dari Telkim university\tPemberian materi , Diskusi\t1 kali\tMampu\tBersemangat untuk menjalankan usaha\tInstrumen Monev_Images/4.Dokumentasi tempat usaha-usaha dan TKM Lanjutan.023343.jpg\tInstrumen Monev_Images/4.Dokumentasi kegiatan (sedang menjalankan usaha).023343.jpg\tInstrumen Monev_Images/4.Dokumentasi produk usaha.023343.jpg\tInstrumen Monev_Images/4.Tanda Tangan.023348.png\tLPJ belum beres baru mau di bikin\thttps://www.appsheet.com/template/gettablefileurl?appName=MASTERMonevTKMLTahun2026-720610337&tableName=Instrumen%20Monev&fileName=\thttps://www.appsheet.com/template/gettablefileurl?appName=MASTERMonevTKMLTahun2026-720610337&tableName=Instrumen%20Monev&fileName=\thttps://www.appsheet.com/template/gettablefileurl?appName=MASTERMonevTKMLTahun2026-720610337&tableName=Instrumen%20Monev&fileName=`;

describe("LPD Monev TKM Excel Parser & Normalizer", () => {
  it("maps all 93 instrument headers and normalizes the Amalia sample row without errors", async () => {
    const buffer = Buffer.from(SAMPLE_TSV, "utf-8");
    const summary = await parseExcelBuffer(buffer, {
      rowSchema: lpdMonevTkmRowSchema,
      filename: "instrumen.tsv",
    });

    assert.deepEqual(summary.unmappedHeaders, []);
    assert.equal(summary.mappedHeaders.length, lpdMonevTkmColumnSpecs.length);
    assert.deepEqual(summary.missingRequiredHeaders, []);
    assert.equal(summary.totalRowsRead, 1);
    assert.equal(summary.validRowsCount, 1);
    assert.equal(summary.invalidRowsCount, 0);

    const row = summary.rows[0];
    assert.equal(row.isValid, true);
    assert.deepEqual(row.errors, []);

    const norm = row.normalizedData;
    assert.equal(norm.sourceNo, 3);
    assert.equal(norm.interviewDate, "2026-10-29");
    assert.equal(norm.disbursementDate, "2026-09-18");
    assert.equal(norm.team, "Aceh 1");
    assert.equal(norm.interviewRegency, "KAB. ACEH BESAR");
    assert.equal(norm.interviewProvince, "Aceh");
    assert.equal(norm.respondentName, "Amalia");
    assert.equal(norm.nik, "1106075111970002");
    assert.equal(norm.tkmId, "957831");
    assert.equal(norm.phone, "082163963521");
    assert.equal(norm.monthlyRevenue, 2500000);
    assert.equal(norm.monthlyNetProfit, 700000);
    assert.equal(norm.fundReceivedAmount, 15000000);
    assert.equal(norm.currentWorkers, 1);
    assert.equal(norm.fixedWorkers, 1);
    assert.equal(norm.temporaryWorkers, null);
    assert.equal(norm.productionGrowthPercentage, null);
    assert.equal(norm.mentoringVisitCount, 1);
    assert.equal(norm.notes, "LPJ belum beres baru mau di bikin");
  });
});
