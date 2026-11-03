import { chromium, type Browser } from "playwright-core";
import type { ReportDocumentSnapshot } from "./render-html";
import { renderReportDocumentHtml } from "./render-html";

let browserInstance: Browser | null = null;
let isLaunching = false;

async function getChromiumBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  while (isLaunching) {
    await new Promise((r) => setTimeout(r, 100));
    if (browserInstance && browserInstance.isConnected()) {
      return browserInstance;
    }
  }

  isLaunching = true;
  try {
    // Launch headless Chromium via playwright-core
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
    return browserInstance;
  } finally {
    isLaunching = false;
  }
}

export async function generatePdfBufferFromSnapshot(
  snapshot: ReportDocumentSnapshot,
): Promise<Buffer> {
  const browser = await getChromiumBrowser();
  const page = await browser.newPage();

  try {
    const htmlContent = renderReportDocumentHtml(snapshot);

    await page.setContent(htmlContent, {
      waitUntil: "networkidle",
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: snapshot.template.page.orientation === "landscape",
      printBackground: true,
      margin: {
        top: `${snapshot.template.page.marginsMm.top}mm`,
        right: `${snapshot.template.page.marginsMm.right}mm`,
        bottom: `${snapshot.template.page.marginsMm.bottom}mm`,
        left: `${snapshot.template.page.marginsMm.left}mm`,
      },
      displayHeaderFooter: snapshot.template.page.showPageNumbers,
      footerTemplate: `
        <div style="font-size: 8pt; font-family: ${snapshot.template.page.fontFamily}; text-align: right; width: 100%; padding-right: 20mm; color: #555;">
          Halaman <span class="pageNumber"></span> dari <span class="totalPages"></span>
        </div>
      `,
      headerTemplate: `<div></div>`,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}

