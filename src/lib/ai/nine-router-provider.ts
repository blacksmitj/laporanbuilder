import type { AiEnhanceOptions, AiEnhanceResult, AiProvider } from "./types";

export class NineRouterProvider implements AiProvider {
  private baseUrl: string;
  private apiKey: string;
  private model: string;

  constructor(options?: { baseUrl?: string; apiKey?: string; model?: string }) {
    this.baseUrl =
      options?.baseUrl ||
      process.env.AI_BASE_URL?.trim() ||
      "https://api.9router.com/v1";
    this.apiKey = options?.apiKey || process.env.AI_API_KEY?.trim() || "";
    this.model = options?.model || process.env.AI_MODEL?.trim() || "gpt-4o-mini";
  }

  async enhance(options: AiEnhanceOptions): Promise<AiEnhanceResult> {
    if (!this.apiKey) {
      throw new Error(
        "Kunci API (AI_API_KEY) untuk 9router belum dikonfigurasikan di .env.",
      );
    }

    const startTime = Date.now();
    const promptVersion = "v1.0-9router";

    const systemPrompt = `Anda adalah editor laporan dinas resmi Kementerian Ketenagakerjaan RI.
Tugas Anda adalah memperhalus draf narasi pemantauan peserta agar berbunyi formal, ringkas, dan mengalir rapi.
BATASAN KETAT:
1. JANGAN menambahkan fakta yang tidak tercantum dalam data.
2. JANGAN mengubah nominal Rupiah, tanggal, atau jumlah tenaga kerja.
3. HANYA kembalikan teks hasil perbaikan narasi (tanpa awalan sambutan, kutipan markdown, atau penjelasan tambahan).`;

    const userPrompt = `Data Fakta Peserta:
${JSON.stringify(options.facts, null, 2)}

Draf Narasi Awal:
"${options.draft}"

Instruksi: Susun kembali draf narasi di atas menjadi 1-2 paragraf resmi kedinasan yang baku dan mudah dibaca.`;

    const cleanBaseUrl = this.baseUrl.replace(/\/+$/, "");
    const endpoint = `${cleanBaseUrl}/chat/completions`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `AI API Error (${response.status}): ${errText || response.statusText}`,
      );
    }

    const data = await response.json();
    const outputText = data.choices?.[0]?.message?.content?.trim();

    if (!outputText) {
      throw new Error("AI tidak memberikan respon teks perbaikan narasi.");
    }

    const durationMs = Date.now() - startTime;

    return {
      text: outputText.replace(/^["']|["']$/g, ""),
      model: this.model,
      durationMs,
      promptVersion,
    };
  }
}

