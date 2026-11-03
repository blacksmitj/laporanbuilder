import type { TemplateConfiguration } from "@/report-types/types";

export interface ReportDocumentSnapshot {
  reportId: string;
  name: string;
  reportType: string;
  fiscalYear: number;
  metadata: {
    recipient?: string;
    sender?: string;
    subject?: string;
    assignmentLetterNumber?: string;
    assignmentLetterDate?: string;
    startDate?: string;
    endDate?: string;
    region?: string;
    signCity?: string;
    signDate?: string;
    [key: string]: unknown;
  };
  template: TemplateConfiguration;
  officials: Array<{
    name: string;
    nip: string;
    position: string;
    institution: string;
    signingEnabled: boolean;
  }>;
  sections: {
    section_a_general?: {
      paragraphs?: string[];
    };
    section_b_summary?: {
      introText?: string;
      showParticipantTable?: boolean;
    };
    section_c_conclusion?: {
      paragraphs?: string[];
    };
    section_closing?: {
      closingParagraph?: string;
    };
    [key: string]: unknown;
  };
  participants: Array<{
    sortOrder: number;
    respondentName: string;
    tkmId?: string | null;
    visitDate: string | null;
    businessAddress?: string | null;
    businessDescription?: string | null;
    sector: string | null;
    businessType: string | null;
    mainProduct: string | null;
    narrative: string;
  }>;
}

function formatDateIndo(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function renderReportDocumentHtml(snapshot: ReportDocumentSnapshot): string {
  const { header, page } = snapshot.template;
  const meta = snapshot.metadata;
  const sections = snapshot.sections;

  const sectionAParagraphs = sections.section_a_general?.paragraphs || [];
  const sectionBIntro =
    sections.section_b_summary?.introText ||
    "Pelaksanaan kegiatan monitoring dan evaluasi dilakukan melalui kunjungan lapangan dan wawancara langsung terhadap penerima bantuan TKM Lanjutan dengan rincian hasil kunjungan sebagai berikut:";
  const sectionCParagraphs = sections.section_c_conclusion?.paragraphs || [];
  const closingText =
    sections.section_closing?.closingParagraph ||
    "Demikian Laporan Perjalanan Dinas Monitoring dan Evaluasi Peserta TKM Lanjutan ini disusun sebagai bahan pertanggungjawaban dan tindak lanjut pelaksanaan program.";

  const signOfficials = snapshot.officials.filter((o) => o.signingEnabled);

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>${snapshot.name}</title>
  <style>
    @page {
      size: ${page.paperSize} ${page.orientation};
      margin: ${page.marginsMm.top}mm ${page.marginsMm.right}mm ${page.marginsMm.bottom}mm ${page.marginsMm.left}mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      font-family: ${page.fontFamily};
      font-size: ${page.fontSizePt}pt;
      line-height: ${page.lineHeight};
      color: #000;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .header-box {
      text-align: center;
      border-bottom: 2.5px solid #000;
      padding-bottom: 8px;
      margin-bottom: 16px;
    }
    .header-ministry {
      font-size: 13pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .header-dirjen {
      font-size: 11pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .header-institution {
      font-size: 12pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .header-address {
      font-size: 9pt;
      font-weight: normal;
    }
    .report-title-box {
      text-align: center;
      margin: 16px 0;
    }
    .report-title {
      font-size: 14pt;
      font-weight: bold;
      text-decoration: underline;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .report-subtitle {
      font-size: 11pt;
      font-weight: bold;
    }
    .meta-table {
      width: 100%;
      margin-bottom: 16px;
      border-collapse: collapse;
    }
    .meta-table td {
      padding: 2px 4px;
      vertical-align: top;
    }
    .meta-table td.label {
      width: 180px;
      font-weight: 500;
    }
    .meta-table td.colon {
      width: 15px;
    }
    .section-title {
      font-weight: bold;
      margin-top: 14px;
      margin-bottom: 6px;
      page-break-after: avoid;
    }
    p {
      text-align: justify;
      text-indent: 28px;
      margin-top: 0;
      margin-bottom: 8px;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 16px 0;
      font-size: 10.5pt;
    }
    .data-table th, .data-table td {
      border: 1px solid #000;
      padding: 6px 8px;
      vertical-align: top;
    }
    .data-table th {
      background-color: #f2f2f2;
      font-weight: bold;
      text-align: center;
    }
    .data-table thead {
      display: table-header-group;
    }
    .data-table tr {
      page-break-inside: avoid;
    }
    .text-center {
      text-align: center;
    }
    .signature-container {
      margin-top: 24px;
      page-break-inside: avoid;
      width: 100%;
    }
    .signature-row {
      display: flex;
      justify-content: flex-end;
      width: 100%;
    }
    .signature-box {
      width: 250px;
      text-align: left;
    }
    .signature-space {
      height: 70px;
    }
    .signature-name {
      font-weight: bold;
      text-decoration: underline;
    }
    .signature-multi-grid {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      margin-top: 16px;
      page-break-inside: avoid;
    }
  </style>
</head>
<body>

  <!-- KOP SURAT RESMI -->
  <div class="header-box">
    <div class="header-ministry">${header.ministryName}</div>
    <div class="header-dirjen">${header.directorateName}</div>
    <div class="header-institution">${header.institutionName}</div>
    <div class="header-address">${header.institutionAddress}</div>
  </div>

  <!-- JUDUL LAPORAN -->
  <div class="report-title-box">
    <div class="report-title">${header.reportTitle}</div>
    <div class="report-subtitle">${meta.subject || snapshot.name}</div>
  </div>

  <!-- INFORMASI SURAT TUGAS & PERJALANAN DINAS -->
  <table class="meta-table">
    <tr>
      <td class="label">Kepada Yth.</td>
      <td class="colon">:</td>
      <td>${meta.recipient || "-"}</td>
    </tr>
    <tr>
      <td class="label">Dari</td>
      <td class="colon">:</td>
      <td>${meta.sender || "-"}</td>
    </tr>
    <tr>
      <td class="label">Nomor Surat Tugas</td>
      <td class="colon">:</td>
      <td>${meta.assignmentLetterNumber || "-"}</td>
    </tr>
    <tr>
      <td class="label">Tanggal Surat Tugas</td>
      <td class="colon">:</td>
      <td>${formatDateIndo(meta.assignmentLetterDate)}</td>
    </tr>
    <tr>
      <td class="label">Tanggal Pelaksanaan</td>
      <td class="colon">:</td>
      <td>${formatDateIndo(meta.startDate)} s.d. ${formatDateIndo(meta.endDate)}</td>
    </tr>
    <tr>
      <td class="label">Wilayah Monitoring</td>
      <td class="colon">:</td>
      <td>${meta.region || "-"}</td>
    </tr>
    <tr>
      <td class="label">Petugas Pelaksana</td>
      <td class="colon">:</td>
      <td>
        ${snapshot.officials
          .map((o, idx) => `${idx + 1}. ${o.name} (NIP. ${o.nip})`)
          .join("<br/>")}
      </td>
    </tr>
  </table>

  <!-- BAGIAN A: UMUM -->
  <div class="section-title">A. UMUM</div>
  ${sectionAParagraphs.map((par) => `<p>${par}</p>`).join("")}

  <!-- BAGIAN B: RINGKASAN KEGIATAN -->
  <div class="section-title">B. RINGKASAN KEGIATAN</div>
  <p>${sectionBIntro}</p>

  <!-- TABEL RINCIAN HASIL KUNJUNGAN PESERTA (Template Pekalongan 2026) -->
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 35px;">NO</th>
        <th style="width: 170px;">NAMA TKML</th>
        <th style="width: 200px;">ALAMAT USAHA TKM LANJUTAN</th>
        <th style="width: 170px;">JENIS USAHA DAN NAMA USAHA</th>
        <th>HASIL MONITORING</th>
      </tr>
    </thead>
    <tbody>
      ${
        snapshot.participants.length === 0
          ? `<tr><td colspan="5" class="text-center" style="padding: 16px;">Tidak ada data peserta yang dipilih.</td></tr>`
          : snapshot.participants
              .map(
                (p, idx) => {
                  const visitFormatted = p.visitDate ? ` (${formatDateIndo(p.visitDate)})` : "";
                  const tkmIdLabel = p.tkmId ? ` - ID TKML ${p.tkmId}` : "";
                  const col1Text = `${p.respondentName}${tkmIdLabel}${visitFormatted}`;
                  const col2Text = p.businessAddress || "-";
                  const col3Text = p.businessDescription || p.businessType || p.sector || "-";
                  const col4Text = p.narrative || "-";

                  return `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td><strong>${col1Text}</strong></td>
          <td>${col2Text}</td>
          <td>${col3Text}</td>
          <td style="text-align: justify;">${col4Text}</td>
        </tr>`;
                },
              )
              .join("")
      }
    </tbody>
  </table>

  <!-- BAGIAN C: KESIMPULAN -->
  <div class="section-title">C. KESIMPULAN</div>
  ${sectionCParagraphs.map((par) => `<p>${par}</p>`).join("")}

  <!-- PENUTUP -->
  <div class="section-title">PENUTUP</div>
  <p>${closingText}</p>

  <!-- TANDA TANGAN PETUGAS -->
  <div class="signature-container">
    <div class="signature-row">
      <div class="signature-box">
        <div>${meta.signCity || header.institutionName.split(" ").slice(-2).join(" ")}, ${formatDateIndo(meta.signDate)}</div>
        <div style="margin-top: 4px;">Pelapor,</div>
      </div>
    </div>

    <div class="signature-multi-grid">
      ${signOfficials
        .map(
          (o) => `
        <div class="signature-box" style="margin-top: 12px; margin-bottom: 12px;">
          <div style="font-size: 9.5pt; color: #444;">${o.position}</div>
          <div class="signature-space"></div>
          <div class="signature-name">${o.name}</div>
          <div style="font-size: 9pt;">NIP. ${o.nip}</div>
        </div>`,
        )
        .join("")}
    </div>
  </div>

</body>
</html>`;
}

