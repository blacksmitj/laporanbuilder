import test from "node:test";
import assert from "node:assert/strict";
import { renderReportDocumentHtml, type ReportDocumentSnapshot } from "./render-html";

test("renderReportDocumentHtml generates photo appendix table layout correctly", () => {
  const snapshot: ReportDocumentSnapshot = {
    reportId: "rep-1",
    name: "Laporan Perjalanan Dinas",
    reportType: "lpd-monev-tkm",
    fiscalYear: 2026,
    metadata: {
      recipient: "Kepala Balai",
      subject: "Monitoring TKM Lanjutan",
      startDate: "2026-03-01",
      endDate: "2026-03-03",
    },
    template: {
      header: {
        ministryName: "KEMENTERIAN KETENAGAKERJAAN R.I.",
        directorateName: "DIREKTORAT JENDERAL PEMBINAAN PENEMPATAN TENAGA KERJA",
        institutionName: "BALAI BESAR PERLUASAN KESEMPATAN KERJA",
        institutionAddress: "Jl. Raya Lembang No. 222 Bandung Barat",
        institutionContact: "www.kemnaker.go.id | bbpkk@kemnaker.go.id",
        reportTitle: "LAPORAN PERJALANAN DINAS",
        showKop: true,
      },
      page: {
        paperSize: "A4",
        orientation: "portrait",
        marginsMm: { top: 20, right: 20, bottom: 20, left: 25 },
        fontSizePt: 11,
        fontFamily: "Arial, sans-serif",
        lineHeight: 1.5,
      },
    },
    officials: [
      {
        name: "Petugas Monev",
        nip: "198001012005011001",
        position: "Pengantar Kerja",
        institution: "BBPKK",
        signingEnabled: true,
      },
    ],
    sections: {},
    participants: [
      {
        sortOrder: 1,
        respondentName: "Budi Santoso",
        visitDate: "2026-03-02",
        sector: "Kuliner",
        narrative: "Usaha berjalan lancar",
        photos: [
          { filename: "foto1.jpg", dataUrl: "data:image/jpeg;base64,abc", label: "Foto Lapangan 1" },
          { filename: "foto2.jpg", dataUrl: "data:image/jpeg;base64,def", label: "Foto Lapangan 2" },
          { filename: "foto3.jpg", dataUrl: "data:image/jpeg;base64,ghi", label: "Foto Lapangan 3" },
        ],
      },
      {
        sortOrder: 2,
        respondentName: "Siti Aminah",
        visitDate: "2026-03-02",
        sector: "Pertanian",
        narrative: "Panen melimpah",
        photos: [
          { filename: "foto4.jpg", unavailable: true, label: "Foto Produk" },
        ],
      },
    ],
  };

  const html = renderReportDocumentHtml(snapshot);

  // Requirement 1: Photo appendix is inside document-body-content (matching body margin)
  assert.ok(html.includes('<section class="photo-appendix">'));
  const bodyContentEndIdx = html.indexOf('</div> <!-- /.document-body-content -->');
  const appendixIdx = html.indexOf('<section class="photo-appendix">');
  assert.ok(appendixIdx < bodyContentEndIdx, "photo-appendix should be inside document-body-content");

  // Requirement 2: Photos are rendered in full-width table with soft line styling
  assert.ok(html.includes('<table class="photo-table">'));
  assert.ok(html.includes(".photo-table"));
  assert.ok(html.includes("border: 1px solid #cbd5e1"));

  // Requirement 3: Participant numbering format: "1. Budi Santoso", "2. Siti Aminah"
  assert.ok(html.includes('<h2 class="participant-photo-heading">1. Budi Santoso</h2>'));
  assert.ok(html.includes('<h2 class="participant-photo-heading">2. Siti Aminah</h2>'));
  assert.ok(!html.includes("Peserta 1:"));
  assert.ok(!html.includes("Peserta 2:"));

  // Requirement 4: Caption (<figcaption>) is completely removed
  assert.ok(!html.includes("<figcaption>"));
  assert.ok(!html.includes("Foto Lapangan 1"));
  assert.ok(!html.includes("Foto Lapangan 2"));
  assert.ok(!html.includes("Foto Lapangan 3"));
  assert.ok(!html.includes("Foto Produk"));

  // Check 2 columns per row with empty cell padding for odd number of photos
  // Participant 1 has 3 photos -> 2 rows, second row has 1 empty <td></td>
  assert.ok(html.includes("<td></td>"));
});

