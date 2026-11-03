export interface AiEnhanceOptions {
  task: "improve_narrative" | "summarize_conclusion";
  language?: "id";
  style?: string;
  facts: Record<string, unknown>;
  draft: string;
  constraints?: string[];
}

export interface AiEnhanceResult {
  text: string;
  model: string;
  durationMs: number;
  promptVersion: string;
}

export interface AiProvider {
  enhance(options: AiEnhanceOptions): Promise<AiEnhanceResult>;
}

