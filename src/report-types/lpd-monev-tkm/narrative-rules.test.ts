import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildLpdBusinessAddress,
  buildLpdBusinessDescription,
  buildLpdParticipantRulesNarrative,
} from "./narrative-rules";
import type { LpdMonevTkmNormalizedRow } from "./row-schema";

describe("LPD Monev TKM Rules Narrative Engine (Pekalongan 2026 Style)", () => {
  it("builds concise Pekalongan style narrative with revenue and tools progression", () => {
    const sampleRow: Partial<LpdMonevTkmNormalizedRow> = {
      respondentName: "Mukhtar Efendi",
      tkmId: "1041809",
      fieldBusinessStatus: "Masih berjalan",
      purchasedEquipmentAvailability: "Ada sesuai",
      rabCompliance: "Sesuai",
      marketingArea: "antar Kecamatan",
      monthlyRevenue: 20000000,
      productionGrowthPercentage: 10,
      currentWorkers: 2,
    };

    const narrative = buildLpdParticipantRulesNarrative(sampleRow, 2026);

    assert.ok(narrative.includes("menguasai usaha dengan baik"));
    assert.ok(narrative.includes("berkembang dari segi bahan dan alat"));
    assert.ok(narrative.includes("antar Kecamatan"));
    assert.ok(narrative.includes("20.000.000"));
    assert.ok(narrative.includes("10%"));
    assert.ok(narrative.includes("2 orang tenaga kerja"));
  });

  it("skips missing fields cleanly without null or 0", () => {
    const emptySample: Partial<LpdMonevTkmNormalizedRow> = {
      respondentName: "Budi",
      fieldBusinessStatus: "Masih berjalan",
      currentWorkers: null,
      monthlyRevenue: null,
    };

    const narrative = buildLpdParticipantRulesNarrative(emptySample, 2026);

    assert.ok(narrative.includes("menguasai usaha dengan baik"));
    assert.ok(!narrative.includes("tenaga kerja"));
    assert.ok(!narrative.includes("omset"));
    assert.ok(!narrative.includes("null"));
  });

  it("builds business address properly from location parts", () => {
    const sample: Partial<LpdMonevTkmNormalizedRow> = {
      interviewAddress: "Dk. Gondangsari RT. 001 RW. 005",
      interviewVillage: "Randu",
      interviewDistrict: "Pecalungan",
      interviewRegency: "Kab. Batang",
      interviewProvince: "Jawa Tengah",
    };

    const address = buildLpdBusinessAddress(sample);
    assert.equal(
      address,
      "Dk. Gondangsari RT. 001 RW. 005, Randu, Pecalungan, Kab. Batang, Jawa Tengah",
    );
  });

  it("builds business description properly", () => {
    const sample: Partial<LpdMonevTkmNormalizedRow> = {
      businessType: "Jasa Service dan Jual Beli Komputer",
      mainProduct: "Perbaikan PC dan Laptop",
    };

    const desc = buildLpdBusinessDescription(sample);
    assert.equal(
      desc,
      "Jasa Service dan Jual Beli Komputer dengan produk Perbaikan PC dan Laptop",
    );
  });
});
