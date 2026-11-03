import { NineRouterProvider } from "./nine-router-provider";
import type { AiProvider } from "./types";

let currentAiProvider: AiProvider | null = null;

export function getAiProvider(): AiProvider {
  if (!currentAiProvider) {
    currentAiProvider = new NineRouterProvider();
  }
  return currentAiProvider;
}

export * from "./types";
export * from "./nine-router-provider";

