import { type NextRequest, NextResponse } from "next/server";
import { extractGoogleDriveFileId } from "@/lib/media/google-drive-url";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json({ error: "URL target diperlukan." }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return NextResponse.json({ error: "URL target tidak valid." }, { status: 400 });
  }

  // Security: only allow Google Drive / Google User Content hostnames
  const allowedHostnames = [
    "drive.google.com",
    "drive.usercontent.google.com",
    "lh3.googleusercontent.com",
    "lh4.googleusercontent.com",
    "lh5.googleusercontent.com",
    "lh6.googleusercontent.com",
  ];

  const hostname = parsed.hostname.toLowerCase();
  const isAllowedHost = allowedHostnames.some(
    (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`),
  );

  if (!isAllowedHost) {
    return NextResponse.json({ error: "Host domain tidak diizinkan." }, { status: 403 });
  }

  // Resolve direct download or thumbnail candidate
  const fileId = extractGoogleDriveFileId(targetUrl);
  const fetchUrls: string[] = [];

  if (fileId) {
    fetchUrls.push(`https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1600`);
    fetchUrls.push(`https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}=w1600`);
    fetchUrls.push(`https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download`);
  } else {
    fetchUrls.push(targetUrl);
  }

  for (const urlToFetch of fetchUrls) {
    try {
      const response = await fetch(urlToFetch, {
        signal: AbortSignal.timeout(8000),
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
      });

      if (!response.ok) continue;

      const contentType = (response.headers.get("content-type") ?? "")
        .split(";")[0]
        .trim()
        .toLowerCase();

      // Ensure response is actually an image (not HTML login/preview page)
      if (!contentType.startsWith("image/")) {
        continue;
      }

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength === 0 || buffer.byteLength > 15 * 1024 * 1024) {
        continue;
      }

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
        },
      });
    } catch {
      continue;
    }
  }

  return NextResponse.json(
    { error: "Gambar tidak dapat diakses (Pastikan link Google Drive diset publik/Siapa saja yang memiliki link)." },
    { status: 502 },
  );
}

