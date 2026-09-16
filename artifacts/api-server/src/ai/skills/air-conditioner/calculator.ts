export interface AirConditionerRequirement {
  area: number;
  ceilingHeight?: number;
  roomType?: string;
  direction?: string;
  topFloor?: boolean;
  people?: number;
  largeGlassArea?: boolean;
  heatSources?: boolean;
}

export interface AirConditionerSizingResult {
  estimatedBTU: number;
  recommendedCommercialBTU: number;
  recommendedHP: number;
  heatLoad: "LOW" | "NORMAL" | "HIGH";
  explanation: string[];
  missingImportantFactors: string[];
}

export const airConditionerRules = {
  btuPerSquareMeter: 600,
  standardCeilingHeight: 3,
  commercialCapacities: [9000, 12000, 18000, 24000, 28000, 36000],
  westFacingMultiplier: 1.1,
  topFloorMultiplier: 1.15,
  largeGlassMultiplier: 1.1,
  heatSourceMultiplier: 1.1,
  extraPersonBTU: 600,
};

export function calculateAirConditionerCapacity(
  input: AirConditionerRequirement,
): AirConditionerSizingResult {
  if (!Number.isFinite(input.area) || input.area <= 0 || input.area > 500)
    throw new Error("Diện tích phòng phải từ trên 0 đến 500 m²");
  const explanation = [
    `Mức cơ sở ${airConditionerRules.btuPerSquareMeter} BTU/m² cho ${input.area} m².`,
  ];
  let estimated = input.area * airConditionerRules.btuPerSquareMeter;
  if (input.ceilingHeight && input.ceilingHeight > 0) {
    estimated *=
      input.ceilingHeight / airConditionerRules.standardCeilingHeight;
    explanation.push(`Đã điều chỉnh theo trần cao ${input.ceilingHeight} m.`);
  }
  if (input.direction === "west") {
    estimated *= airConditionerRules.westFacingMultiplier;
    explanation.push("Phòng hướng Tây/nắng Tây làm tăng tải nhiệt.");
  }
  if (input.topFloor) {
    estimated *= airConditionerRules.topFloorMultiplier;
    explanation.push("Tầng áp mái/tầng trên cùng làm tăng tải nhiệt.");
  }
  if (input.largeGlassArea) {
    estimated *= airConditionerRules.largeGlassMultiplier;
    explanation.push("Diện tích kính lớn làm tăng tải nhiệt.");
  }
  if (input.heatSources) {
    estimated *= airConditionerRules.heatSourceMultiplier;
    explanation.push("Nguồn tỏa nhiệt trong phòng đã được tính thêm.");
  }
  if ((input.people || 0) > 2) {
    estimated += ((input.people || 0) - 2) * airConditionerRules.extraPersonBTU;
    explanation.push(`Đã tính thêm tải nhiệt cho ${input.people} người.`);
  }
  const rounded = Math.round(estimated / 100) * 100;
  const recommended =
    airConditionerRules.commercialCapacities.find(
      (value) => value >= rounded,
    ) || airConditionerRules.commercialCapacities.at(-1)!;
  const multiplier =
    estimated / (input.area * airConditionerRules.btuPerSquareMeter);
  return {
    estimatedBTU: rounded,
    recommendedCommercialBTU: recommended,
    recommendedHP:
      (
        {
          9000: 1,
          12000: 1.5,
          18000: 2,
          24000: 2.5,
          28000: 3,
          36000: 4,
        } as Record<number, number>
      )[recommended] || Math.round((recommended / 9000) * 10) / 10,
    heatLoad:
      multiplier >= 1.2 ? "HIGH" : multiplier <= 0.95 ? "LOW" : "NORMAL",
    explanation,
    missingImportantFactors: [
      !input.ceilingHeight && "độ cao trần",
      !input.direction && "hướng nắng",
      input.topFloor === undefined && "vị trí tầng áp mái",
      !input.people && "số người thường dùng phòng",
    ].filter((value): value is string => Boolean(value)),
  };
}
