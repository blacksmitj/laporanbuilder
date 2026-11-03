import type { TemplateConfiguration } from "@/report-types/types";
import { KEMNAKER_LOGO_BASE64 } from "./logo-base64";

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
    "Adapun Monitoring yang dilakukan dirinci dalam tabel sebagai berikut :";
  const sectionCParagraphs = sections.section_c_conclusion?.paragraphs || [];
  const closingText =
    sections.section_closing?.closingParagraph ||
    "Demikian laporan Perjalanan Dinas ini disampaikan, untuk dapat diketahui dan sekaligus sebagai bahan pertanggung jawaban dalam melaksanakan tugas.";

  const signOfficials = snapshot.officials.filter((o) => o.signingEnabled);

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>${snapshot.name}</title>
  <style>
    @page {
      size: ${page.paperSize} ${page.orientation};
      margin: 20mm 20mm 20mm 20mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #000;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .header-box {
      display: flex;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 6px;
    }
    .header-logo-container {
      width: 105px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding-right: 12px;
    }
    .header-logo-img {
      width: 88px;
      height: auto;
      display: block;
      object-fit: contain;
    }
    .header-divider {
      width: 2.5px;
      align-self: stretch;
      background-color: #295570;
      flex-shrink: 0;
      border-radius: 1px;
    }
    .header-content {
      flex: 1;
      padding-left: 14px;
      text-align: left;
    }
    .header-ministry {
      font-family: Arial, sans-serif;
      font-size: 10.5pt;
      font-weight: normal;
      color: #111;
      line-height: 1.15;
      margin-bottom: 2px;
    }
    .header-dirjen {
      font-family: Arial, sans-serif;
      font-size: 10pt;
      font-weight: bold;
      color: #050505;
      line-height: 1.18;
      margin-bottom: 2px;
    }
    .header-institution {
      font-family: Arial, sans-serif;
      font-size: 12.5pt;
      font-weight: bold;
      color: #1f4362;
      line-height: 1.2;
      letter-spacing: 0.3px;
      margin-bottom: 3px;
    }
    .header-address {
      font-family: Arial, sans-serif;
      font-size: 8pt;
      line-height: 1.25;
      color: #222;
      margin-bottom: 2px;
    }
    .header-contacts {
      font-family: Arial, sans-serif;
      font-size: 7.8pt;
      line-height: 1.2;
      color: #222;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .header-contact-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .header-icon {
      width: 12px;
      height: 12px;
      vertical-align: middle;
      color: #1f4362;
    }
    .report-title-box {
      text-align: center;
      margin: 0 0 16px 0;
    }
    .report-title {
      font-size: 11pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      line-height: 1.25;
      font-size: 11pt;
    }
    .meta-table td {
      padding: 2.5px 2px;
      vertical-align: top;
    }
    .meta-table td.label {
      width: 200px;
      font-weight: normal;
    }
    .meta-table td.colon {
      width: 24px;
      text-align: center;
    }
    .meta-table td.value {
      text-align: justify;
    }
    .section-heading {
      font-size: 11pt;
      font-weight: bold;
      margin-top: 14px;
      margin-bottom: 6px;
      page-break-after: avoid;
    }
    p {
      text-align: justify;
      text-indent: 10mm;
      margin-top: 0;
      margin-bottom: 8px;
      line-height: 1.5;
      font-size: 11pt;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 14px 0;
      font-size: 10pt;
      line-height: 1.15;
    }
    .data-table th, .data-table td {
      border: 1px solid #000;
      padding: 5px 6px;
      vertical-align: top;
    }
    .data-table th {
      background-color: transparent;
      font-weight: bold;
      text-align: center;
      font-size: 10pt;
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
    .signature-section {
      margin-top: 18px;
      page-break-inside: avoid;
      width: 100%;
      font-size: 11pt;
      line-height: 1.25;
    }
    .signature-date {
      margin-bottom: 2px;
    }
    .signature-title {
      margin-bottom: 8px;
    }
    .signature-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
    }
    .signature-table td {
      padding: 6px 4px;
      vertical-align: middle;
    }
    .signature-table td.name-col {
      width: 50%;
    }
    .signature-table td.colon-col {
      width: 4%;
      text-align: center;
    }
    .signature-table td.line-col {
      width: 46%;
      letter-spacing: 1px;
    }
  </style>
</head>
<body>

  ${
    header.showKop !== false
      ? `
  <!-- KOP SURAT RESMI (SESUAI GAMBAR ACUAN) -->
  <div class="header-box">
    <div class="header-logo-container">
      <img src="${KEMNAKER_LOGO_BASE64}" alt="Logo Kemnaker" class="header-logo-img" />
    </div>
    <div class="header-divider"></div>
    <div class="header-content">
      <div class="header-ministry">${header.ministryName}</div>
      <div class="header-dirjen">${header.directorateName}</div>
      <div class="header-institution">${header.institutionName}</div>
      <div class="header-address">${header.institutionAddress}</div>
      <div class="header-contacts">
        <span class="header-contact-item">
          <svg class="header-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
          https://bbpkk.kemnaker.go.id/
        </span>
        <span class="header-contact-item">
          <svg class="header-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
          </svg>
          bbpkk@kemnaker.go.id
        </span>
        <span class="header-contact-item">
          <svg class="header-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
          </svg>
          (022) 2786053
        </span>
      </div>
    </div>
  </div>`
      : ""
  }

  <!-- JUDUL LAPORAN -->
  <div class="report-title-box">
    <div class="report-title">${header.reportTitle}</div>
  </div>

  <!-- INFORMASI SURAT TUGAS & PERJALANAN DINAS -->
  <table class="meta-table">
    <tr>
      <td class="label">Kepada Yth</td>
      <td class="colon">:</td>
      <td class="value">${meta.recipient || "Kepala Balai Besar Perluasan Kesempatan Kerja"}</td>
    </tr>
    <tr>
      <td class="label">Dari</td>
      <td class="colon">:</td>
      <td class="value">
        ${snapshot.officials
          .map((o, idx) => {
            const nipDisplay = o.nip && o.nip !== "-" ? `<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;NIP. ${o.nip}` : `<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;NIP. -`;
            return `${idx + 1}. ${o.name}${nipDisplay}`;
          })
          .join("<br/>")}
      </td>
    </tr>
    <tr>
      <td class="label">Dasar</td>
      <td class="colon">:</td>
      <td class="value">
        Nomor : ${meta.assignmentLetterNumber || "-"}<br/>
        Tanggal ${formatDateIndo(meta.assignmentLetterDate)}
      </td>
    </tr>
    <tr>
      <td class="label">Maksud Perjalanan Dinas</td>
      <td class="colon">:</td>
      <td class="value">${meta.subject || snapshot.name}</td>
    </tr>
    <tr>
      <td class="label">Tanggal Pelaksanaan</td>
      <td class="colon">:</td>
      <td class="value">
        ${formatDateIndo(meta.startDate)} s.d ${formatDateIndo(meta.endDate)}
      </td>
    </tr>
  </table>

  <!-- HASIL PENUGASAN -->
  <div class="section-heading">Hasil Penugasan</div>
  ${sectionAParagraphs.map((par) => `<p>${par}</p>`).join("")}

  <p style="text-indent: 0; margin-bottom: 6px;">${sectionBIntro}</p>

  <!-- TABEL RINCIAN HASIL MONITORING (PERSIS PEKALONGAN 2026) -->
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 5%;">NO</th>
        <th style="width: 17%;">NAMA TKML</th>
        <th style="width: 22%;">ALAMAT USAHA TKM LANJUTAN</th>
        <th style="width: 18%;">JENIS USAHA DAN NAMA USAHA</th>
        <th style="width: 38%;">HASIL MONITORING</th>
      </tr>
    </thead>
    <tbody>
      ${
        snapshot.participants.length === 0
          ? `<tr><td colspan="5" class="text-center" style="padding: 14px;">Tidak ada data peserta yang dipilih.</td></tr>`
          : snapshot.participants
              .map(
                (p, idx) => {
                  const visitFormatted = p.visitDate ? `<br/>(${formatDateIndo(p.visitDate)})` : "";
                  const tkmIdLabel = p.tkmId ? ` - ID TKML ${p.tkmId}` : "";
                  const col1Text = `${p.respondentName}${tkmIdLabel}${visitFormatted}`;
                  const col2Text = p.businessAddress || "-";
                  const col3Text = p.businessDescription || p.businessType || p.sector || "-";
                  const col4Text = p.narrative || "-";

                  return `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td>${col1Text}</td>
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

  <!-- KESIMPULAN / EVALUASI -->
  ${sectionCParagraphs.map((par) => `<p>${par}</p>`).join("")}

  <!-- PENUTUP -->
  <p>${closingText}</p>

  <!-- TANDA TANGAN PELAPOR -->
  <div class="signature-section">
    <div class="signature-date">${meta.signCity || "Lembang"}, ${formatDateIndo(meta.signDate || new Date().toISOString())}</div>
    <div class="signature-title">Yang melaksanakan Perjalanan Dinas</div>

    <table class="signature-table">
      ${signOfficials
        .map((o, idx) => {
          const nipText = o.nip && o.nip !== "-" ? `NIP. ${o.nip}` : "NIP. -";
          return `
      <tr>
        <td class="name-col">
          ${idx + 1}. ${o.name}<br/>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${nipText}
        </td>
        <td class="colon-col">:</td>
        <td class="line-col">...........................................</td>
      </tr>`;
        })
        .join("")}
    </table>
  </div>

</body>
</html>`;
}

