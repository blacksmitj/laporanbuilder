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
      monitoringRegionIntro?: string;
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
    photos?: Array<{
      dataUrl?: string;
      filename: string;
      label?: string;
      unavailable?: boolean;
    }>;
  }>;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
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
  const sectionBRegionIntro =
    sections.section_b_summary?.monitoringRegionIntro?.trim();
  const sectionBIntro =
    sections.section_b_summary?.introText ||
    "Adapun Monitoring yang dilakukan dirinci dalam tabel sebagai berikut :";
  const sectionCParagraphs = sections.section_c_conclusion?.paragraphs || [];
  const closingText =
    sections.section_closing?.closingParagraph ||
    "Demikian laporan Perjalanan Dinas ini disampaikan, untuk dapat diketahui dan sekaligus sebagai bahan pertanggung jawaban dalam melaksanakan tugas.";

  const contactIcons = {
    web: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
    mail: "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z",
    phone: "M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z",
  };
  const contactItemsHtml = (header.institutionContact ?? "")
    .split("|")
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => {
      const icon = /^(https?:\/\/|www\.)/i.test(c)
        ? contactIcons.web
        : c.includes("@")
          ? contactIcons.mail
          : contactIcons.phone;
      return `<span class="header-contact-item"><svg class="header-icon" viewBox="0 0 24 24" fill="currentColor"><path d="${icon}"/></svg>${c}</span>`;
    })
    .join("");

  const signOfficials = snapshot.officials.filter((o) => o.signingEnabled);

  const pageMarginTop = page.marginsMm.top;
  const pageMarginLeft = page.marginsMm.left;
  const pageMarginRight = page.marginsMm.right;

  // Margin Kop Surat (memungkinkan kop lebih wide dan rapat ke atas dibanding isi body)
  const kopMarginTop = header.kopMarginsMm?.top ?? 15;
  const kopMarginLeft = header.kopMarginsMm?.left ?? 15;
  const kopMarginRight = header.kopMarginsMm?.right ?? 15;

  const kopOffsetTop = Math.max(0, pageMarginTop - kopMarginTop);
  const kopOffsetLeft = Math.max(0, pageMarginLeft - kopMarginLeft);
  const kopOffsetRight = Math.max(0, pageMarginRight - kopMarginRight);

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>${snapshot.name}</title>
  <style>
    /* Margin utama kertas diatur mengikuti kop surat (kopMarginLeft & kopMarginRight) */
    @page {
      size: ${page.paperSize} ${page.orientation};
      margin-top: ${pageMarginTop}mm;
      margin-bottom: ${page.marginsMm.bottom}mm;
      margin-left: ${header.showKop !== false ? kopMarginLeft : pageMarginLeft}mm;
      margin-right: ${header.showKop !== false ? kopMarginRight : pageMarginRight}mm;
    }
    @page :first {
      margin-top: ${header.showKop !== false ? kopMarginTop : pageMarginTop}mm;
      margin-left: ${header.showKop !== false ? kopMarginLeft : pageMarginLeft}mm;
      margin-right: ${header.showKop !== false ? kopMarginRight : pageMarginRight}mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    html {
      background-color: #f1f3f5;
    }
    body {
      font-family: ${page.fontFamily || 'Arial, "Helvetica Neue", Helvetica, sans-serif'};
      font-size: ${page.fontSizePt || 11}pt;
      line-height: ${page.lineHeight || 1.5};
      color: #000;
      margin: 0;
      padding: 0;
      background: #f1f3f5;
    }

    /* Tampilan di Layar (Live Preview) dibuat persis menyerupai Kertas A4 Nyata */
    @media screen {
      body {
        padding: 40px 16px;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        background-color: #525659; /* Nuansa PDF viewer profesional */
      }
      /* Sumber asli disembunyikan; script memecahnya menjadi lembar A4 terpisah */
      .page-container {
        position: absolute;
        visibility: hidden;
        left: -9999px;
      }
      #pages {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 28px;
      }
      .sheet {
        width: 210mm;
        height: 297mm;
        flex-shrink: 0;
        padding-top: ${pageMarginTop}mm;
        padding-bottom: ${page.marginsMm.bottom}mm;
        padding-left: ${header.showKop !== false ? kopMarginLeft : pageMarginLeft}mm;
        padding-right: ${header.showKop !== false ? kopMarginRight : pageMarginRight}mm;
        background: #ffffff;
        box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35), 0 1px 4px rgba(0, 0, 0, 0.2);
        position: relative;
        overflow: hidden;
      }
      .sheet.first-sheet {
        padding-top: ${header.showKop !== false ? kopMarginTop : pageMarginTop}mm;
      }
      .sheet-content {
        height: 100%;
        overflow: hidden;
      }
      /* Pada screen preview, body-wrap mewarisi padding sisa yang sama */
      .sheet-content .body-wrap {
        padding-left: ${kopOffsetLeft}mm;
        padding-right: ${kopOffsetRight}mm;
      }
      .sheet-content .body-wrap.first {
        margin-top: ${kopOffsetTop}mm;
      }
      .sheet::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: ${pageMarginTop}mm;
        background: repeating-linear-gradient(
          -45deg,
          rgba(59, 130, 246, 0.04),
          rgba(59, 130, 246, 0.04) 4px,
          transparent 4px,
          transparent 8px
        );
        border-bottom: 1px dashed rgba(59, 130, 246, 0.35);
        pointer-events: none;
      }
      .sheet::after {
        content: "";
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: ${page.marginsMm.bottom}mm;
        background: repeating-linear-gradient(
          -45deg,
          rgba(59, 130, 246, 0.04),
          rgba(59, 130, 246, 0.04) 4px,
          transparent 4px,
          transparent 8px
        );
        border-top: 1px dashed rgba(59, 130, 246, 0.35);
        pointer-events: none;
      }
      .sheet-footer-info {
        position: absolute;
        bottom: 6mm;
        right: 15mm;
        font-size: 8pt;
        color: #64748b;
        font-family: Arial, sans-serif;
        pointer-events: none;
        z-index: 5;
      }
    }

    /* Tampilan Cetak / Render Playwright PDF (Kertas Asli) */
    @media print {
      html, body {
        background: #fff !important;
        padding: 0 !important;
        margin: 0 !important;
        display: block !important;
      }
      .page-container {
        width: 100% !important;
        min-height: auto !important;
        padding: 0 !important;
        margin: 0 !important;
        box-shadow: none !important;
        border: none !important;
        background: transparent !important;
      }
      #pages {
        display: none !important;
      }
    }
    .header-box {
      display: flex;
      align-items: center;
      margin-bottom: ${kopOffsetTop > 0 ? 12 : 16}px;
      padding-bottom: 6px;
      width: 100%;
    }
    /* Di print media, hanya judul dan meta awal halaman 1 yang perlu offset bila kopMargins berbeda */
    .document-body-content {
      margin-top: 0;
      padding-left: ${kopOffsetLeft}mm;
      padding-right: ${kopOffsetRight}mm;
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
      font-family: ${header.ministryFontFamily || 'Arial, "Helvetica Neue", Helvetica, sans-serif'};
      font-size: ${header.ministryFontSizePt ?? 10.5}pt;
      font-weight: ${header.ministryFontWeight || "normal"};
      color: #111;
      line-height: 1.15;
      margin-bottom: 2px;
    }
    .header-dirjen {
      font-family: ${header.directorateFontFamily || 'Arial, "Helvetica Neue", Helvetica, sans-serif'};
      font-size: ${header.directorateFontSizePt ?? 10}pt;
      font-weight: ${header.directorateFontWeight || "bold"};
      color: #050505;
      line-height: 1.18;
      margin-bottom: 2px;
    }
    .header-institution {
      font-family: ${header.institutionFontFamily || 'Arial, "Helvetica Neue", Helvetica, sans-serif'};
      font-size: ${header.institutionFontSizePt ?? 12.5}pt;
      font-weight: ${header.institutionFontWeight || "bold"};
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
      font-family: ${header.titleFontFamily || 'Arial, "Helvetica Neue", Helvetica, sans-serif'};
      font-size: ${header.titleFontSizePt ?? 11}pt;
      font-weight: ${header.titleFontWeight || "bold"};
      font-style: ${header.titleItalic ? "italic" : "normal"};
      text-decoration: ${header.titleUnderline ? "underline" : "none"};
      text-transform: uppercase;
      letter-spacing: ${header.titleLetterSpacing || "0.5px"};
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      line-height: 1.35;
      font-size: ${page.fontSizePt || 11}pt;
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
      font-size: ${page.fontSizePt || 11}pt;
      font-weight: bold;
      margin-top: 14px;
      margin-bottom: 6px;
      page-break-after: avoid;
    }
    p {
      text-align: justify;
      text-indent: 0;
      margin-top: 0;
      margin-bottom: 8px;
      line-height: ${page.lineHeight || 1.5};
      font-size: ${page.fontSizePt || 11}pt;
    }
    .ordered-clause {
      display: flex;
      align-items: baseline;
      text-align: justify;
      margin-top: 0;
      margin-bottom: 8px;
      line-height: ${page.lineHeight || 1.5};
      font-size: ${page.fontSizePt || 11}pt;
    }
    .ordered-clause-num {
      width: 24px;
      flex-shrink: 0;
    }
    .ordered-clause-text {
      flex: 1;
      text-align: justify;
    }
    .data-table {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
      margin: 10px 0 14px 0;
      font-size: 10pt;
      line-height: 1.15;
    }
    .data-table th, .data-table td {
      border: 1px solid #000;
      padding: 5px 6px;
      vertical-align: top;
      overflow-wrap: break-word;
      word-break: break-word;
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
      font-size: ${page.fontSizePt || 11}pt;
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
    .photo-appendix {
      break-before: page;
      page-break-before: always;
      margin-top: 24px;
    }
    .photo-appendix-title {
      text-align: center;
      font-size: 12pt;
      font-weight: bold;
      margin: 0 0 16px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .participant-photo-group {
      margin: 0 0 16px;
    }
    .participant-photo-heading {
      font-size: 11pt;
      font-weight: bold;
      margin: 14px 0 8px;
      page-break-after: avoid;
      break-after: avoid;
    }
    .photo-table {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    .photo-table tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .photo-table td {
      width: 50%;
      border: 1px solid #cbd5e1;
      padding: 8px;
      text-align: center;
      vertical-align: middle;
      background: #ffffff;
    }
    .photo-table img {
      display: block;
      max-width: 100%;
      height: 78mm;
      object-fit: contain;
      margin: 0 auto;
    }
    .photo-fetch-error {
      height: 78mm;
      border: 1px dashed #f87171;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 6px;
      color: #991b1b;
      background: #fef2f2;
      text-align: center;
      padding: 8px;
      font-size: 9pt;
      box-sizing: border-box;
    }
    @media screen {
      .photo-appendix { margin-top: 0; }
    }
    @media print {
      .photo-appendix { display: block; }
    }

  </style>
</head>
<body>
  <div class="page-container">

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
      <div class="header-contacts">${contactItemsHtml}</div>
    </div>
  </div>`
      : ""
  }

  <div class="document-body-content">

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
  ${
    sectionAParagraphs
      .map((par, idx) => {
        const letter = String.fromCharCode(97 + idx); // a, b, c, d, ...
        // If the paragraph already begins with a), b), etc., display as is
        const cleanPar = par.trim();
        const matchLetter = cleanPar.match(/^[a-z]\)\s*(.*)/i);
        const prefix = matchLetter ? cleanPar.slice(0, 2) : `${letter})`;
        const content = matchLetter ? matchLetter[1] : cleanPar;

        return `
    <div class="ordered-clause">
      <div class="ordered-clause-num">${prefix}</div>
      <div class="ordered-clause-text">${content}</div>
    </div>`;
      })
      .join("")
  }

  ${
    sectionBRegionIntro
      ? `
    <div class="ordered-clause">
      <div class="ordered-clause-num">${String.fromCharCode(97 + sectionAParagraphs.length)})</div>
      <div class="ordered-clause-text">${sectionBRegionIntro}</div>
    </div>`
      : ""
  }

  <p style="text-indent: 0; margin-top: 6px; margin-bottom: 6px;">${sectionBIntro}</p>

  <!-- TABEL RINCIAN HASIL MONITORING (PERSIS PEKALONGAN 2026) -->
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 7%;">NO</th>
        <th style="width: 17%;">NAMA TKML</th>
        <th style="width: 22%;">ALAMAT USAHA TKM LANJUTAN</th>
        <th style="width: 18%;">JENIS USAHA DAN NAMA USAHA</th>
        <th style="width: 36%;">HASIL MONITORING</th>
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

  ${
    snapshot.participants.some((participant) => participant.photos?.length)
      ? `<section class="photo-appendix">
          <h1 class="photo-appendix-title">Lampiran Foto Kegiatan</h1>
          ${snapshot.participants
            .filter((participant) => participant.photos?.length)
            .map(
              (participant, participantIndex) => {
                const photoRows = chunkArray(participant.photos || [], 2);
                return `
                <section class="participant-photo-group">
                  <h2 class="participant-photo-heading">${participantIndex + 1}. ${escapeHtml(participant.respondentName)}</h2>
                  <table class="photo-table">
                    <tbody>
                      ${photoRows
                        .map(
                          (row) => `
                        <tr>
                          ${row
                            .map(
                              (photo, photoIndex) => `
                            <td>
                              ${
                                photo.dataUrl
                                  ? `<img src="${photo.dataUrl}" alt="Foto Dokumentasi" />`
                                  : `<div class="photo-fetch-error">Gambar tidak bisa diambil</div>`
                              }
                            </td>`,
                            )
                            .join("")}
                          ${row.length === 1 ? `<td></td>` : ""}
                        </tr>`,
                        )
                        .join("")}
                    </tbody>
                  </table>
                </section>`;
              },
            )
            .join("")}
        </section>`
      : ""
  }

  </div> <!-- /.document-body-content -->
  </div> <!-- /.page-container -->
  <script>
  (function () {
    if (!window.matchMedia("screen").matches) return;
    var src = document.querySelector(".page-container");
    var body = src.querySelector(".document-body-content");
    var pages = document.createElement("div");
    pages.id = "pages";
    document.body.appendChild(pages);

    var photoAppendix = src.querySelector(".photo-appendix");
    if (photoAppendix) {
      photoAppendix.parentNode.removeChild(photoAppendix);
    }

    var units = [];
    var header = src.querySelector(".header-box");
    if (header) units.push({ node: header, kop: true });
    Array.prototype.slice.call(body.children).forEach(function (el) {
      if (el.classList.contains("data-table")) {
        el.querySelectorAll("tbody tr").forEach(function (tr) {
          units.push({ table: el, node: tr });
        });
      } else {
        units.push({ node: el });
      }
    });

    if (photoAppendix) {
      Array.prototype.slice.call(photoAppendix.children).forEach(function (el) {
        if (el.classList.contains("participant-photo-group")) {
          Array.prototype.slice.call(el.children).forEach(function (child) {
            if (child.classList.contains("photo-table")) {
              child.querySelectorAll("tbody tr").forEach(function (tr) {
                units.push({ table: child, node: tr });
              });
            } else {
              units.push({ node: child });
            }
          });
        } else {
          units.push({ node: el, appendixStart: el.classList.contains("photo-appendix-title") });
        }
      });
    }

    var content, wrap, curTable, curTableSrc, pageIndex = -1;
    var allSheets = [];
    function newPage() {
      pageIndex++;
      var sheet = document.createElement("div");
      sheet.className = "sheet" + (pageIndex === 0 ? " first-sheet" : "");
      content = document.createElement("div");
      content.className = "sheet-content";
      sheet.appendChild(content);
      pages.appendChild(sheet);
      allSheets.push(sheet);
      wrap = null;
      curTable = null;
      curTableSrc = null;
    }
    function ensureWrap() {
      if (!wrap) {
        wrap = document.createElement("div");
        wrap.className = "body-wrap document-body-content" + (pageIndex === 0 ? " first" : "");
        content.appendChild(wrap);
      }
      return wrap;
    }
    function overflows() {
      return content.scrollHeight > content.clientHeight + 1;
    }
    function place(u) {
      if (u.appendixStart && pageIndex > 0 && content.children.length > 0) {
        newPage();
      }
      if (u.kop) {
        content.appendChild(u.node);
        return;
      }
      var w = ensureWrap();
      if (u.table) {
        if (curTableSrc !== u.table) {
          curTable = u.table.cloneNode(false);
          var thead = u.table.querySelector("thead");
          if (thead) curTable.appendChild(thead.cloneNode(true));
          curTable.appendChild(document.createElement("tbody"));
          curTableSrc = u.table;
          w.appendChild(curTable);
        }
        curTable.querySelector("tbody").appendChild(u.node);
      } else {
        curTable = null;
        curTableSrc = null;
        w.appendChild(u.node);
      }
    }
    function unplace(u) {
      if (u.node.parentNode) u.node.parentNode.removeChild(u.node);
    }

    newPage();
    units.forEach(function (u) {
      place(u);
      if (overflows() && content.children.length > 0) {
        var onlyUnit = content.querySelectorAll("*").length <= 1;
        unplace(u);
        if (curTable && curTable.querySelector("tbody").children.length === 0 && curTable.parentNode) {
          curTable.parentNode.removeChild(curTable);
        }
        if (wrap && wrap.children.length === 0 && wrap.parentNode) {
          wrap.parentNode.removeChild(wrap);
        }
        if (!onlyUnit) {
          newPage();
          place(u);
        } else {
          place(u);
        }
      }
    });

    // Berikan label nomor halaman di kanan bawah setiap lembar preview
    var totalPages = allSheets.length;
    allSheets.forEach(function (sh, idx) {
      var footer = document.createElement("div");
      footer.className = "sheet-footer-info";
      footer.textContent = "Halaman " + (idx + 1) + " dari " + totalPages;
      sh.appendChild(footer);
    });
  })();
  </script>
</body>
</html>`;
}

