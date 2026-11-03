import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildLpdParticipantRulesNarrative } from "./narrative-rules";
import type { LpdMonevTkmNormalizedRow } from "./row-schema";

describe("LPD Monev TKM Rules Narrative Engine", () => {
  it("builds correct standard narrative according to PRD §10 example (Amalia)", () => {
    const amaliaSample: Partial<LpdMonevTkmNormalizedRow> = {
      respondentName: "Amalia",
      sector: "Industri Kreatif",
      businessType: "Desain pakaian dan menjahit pakaian dengan mesin",
      mainProduct: "Baju, mukena, khimar",
      currentWorkers: 1,
      fundReceivedAmount: 15000000,
      spendingPercentageLabel: "Semua telah dibelanjakan",
      rabCompliance: "Sesuai",
      receiptAvailability: "Ada",
      fieldBusinessStatus: "Masih berjalan",
      mentoringStatus: "Sudah dapat",
      mentorNameAndUniversity: "Yasmin dari Telkim university",
      mentoringBenefit: "Bersemangat untuk menjalankan usaha",
    };

    const narrative = buildLpdParticipantRulesNarrative(amaliaSample, 2026);

    assert.ok(narrative.includes("Amalia"));
    assert.ok(narrative.includes("Industri Kreatif"));
    assert.ok(narrative.includes("Desain pakaian dan menjahit"));
    assert.ok(narrative.includes("1 orang tenaga kerja"));
    assert.ok(narrative.includes("Rp"));
    assert.ok(narrative.includes("15.000.000"));
    assert.ok(narrative.includes("Yasmin dari Telkim university"));
  });

  it("skips missing fields without outputting 0 or null", () => {
    const emptyWorkerSample: Partial<LpdMonevTkmNormalizedRow> = {
      respondentName: "Budi",
      sector: "Perdagangan",
      businessType: "Kelontong",
      currentWorkers: null, // Empty must NOT become "0 orang tenaga kerja"
      fundReceivedAmount: null,
    };

    const narrative = buildLpdParticipantRulesNarrative(emptyWorkerSample, 2026);

    assert.ok(narrative.includes("Budi"));
    assert.ok(!narrative.includes("tenaga kerja"));
    assert.ok(!narrative.includes("dana bantuan"));
    assert.ok(!narrative.includes("null"));
  });
});

