export interface AirConditionerRequirement {
  area: number;
  ceilingHeight?: number;
  roomType?: string;
  direction?: string;
  topFloor?: boolean;
  connectedKitchen?: boolean;
  openSpace?: boolean;
  people?: number;
  largeGlassArea?: boolean;
  heatSources?: string[];
}

export interface AirConditionerSizingResult {
  estimatedBTU: number;
  recommendedRangeBTU: { min: number; max: number };
  primaryCommercialBTU: number;
  alternativeCommercialBTU?: number;
  recommendedCommercialBTU: number;
  recommendedHP: number;
  heatLoad: "LOW" | "NORMAL" | "ELEVATED" | "HIGH";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  assumptions: string[];
  heatLoadFactors: string[];
  explanation: string[];
  missingUsefulFactors: string[];
  missingImportantFactors: string[];
}

export const airConditionerRules = {
  baseBTUPerSquareMeter: 600,
  standardCeilingHeightM: 3,
  commercialCapacities: [9000, 12000, 18000, 24000, 28000, 36000],
  westFacingMultiplier: 1.1,
  topFloorMultiplier: 1.15,
  connectedKitchenMultiplier: 1.15,
  openSpaceMultiplier: 1.05,
  largeGlassMultiplier: 1.1,
  otherHeatSourceMultiplier: 1.08,
  extraPersonBTU: 600,
  rangeBelowRatio: 0.9,
  rangeAboveRatio: 1.1,
  lowerCapacityTolerance: 0.15,
} as const;

const hpFor = (capacity: number) => ({
  9000: 1, 12000: 1.5, 18000: 2, 24000: 2.5, 28000: 3, 36000: 4,
} as Record<number, number>)[capacity] || Math.round((capacity / 9000) * 10) / 10;

export function calculateAirConditionerCapacity(input: AirConditionerRequirement): AirConditionerSizingResult {
  if (!Number.isFinite(input.area) || input.area <= 0 || input.area > 500)
    throw new Error("Diện tích phòng phải từ trên 0 đến 500 m²");
  const factors: string[] = [];
  const explanation = [`Mức cơ sở ${airConditionerRules.baseBTUPerSquareMeter} BTU/m² cho ${input.area} m².`];
  const assumptions: string[] = [];
  let estimated = input.area * airConditionerRules.baseBTUPerSquareMeter;
  let severity = 0;
  if (input.ceilingHeight && input.ceilingHeight > 0) {
    estimated *= input.ceilingHeight / airConditionerRules.standardCeilingHeightM;
    if (input.ceilingHeight > airConditionerRules.standardCeilingHeightM) factors.push("HIGH_CEILING");
    explanation.push(`Đã điều chỉnh theo trần cao ${input.ceilingHeight} m.`);
  } else assumptions.push("Trần cao khoảng 3 m");
  if (String(input.direction).toUpperCase() === "WEST") {
    estimated *= airConditionerRules.westFacingMultiplier; severity += 1;
    factors.push("WEST"); explanation.push("Hướng Tây làm tăng tải nhiệt.");
  }
  if (input.topFloor) {
    estimated *= airConditionerRules.topFloorMultiplier; severity += 1;
    factors.push("TOP_FLOOR"); explanation.push("Tầng áp mái làm tăng tải nhiệt.");
  }
  if (input.connectedKitchen) {
    estimated *= airConditionerRules.connectedKitchenMultiplier; severity += 2;
    factors.push("CONNECTED_KITCHEN"); explanation.push("Không gian thông bếp có nguồn nhiệt đáng kể.");
  } else if (input.openSpace) {
    estimated *= airConditionerRules.openSpaceMultiplier; severity += 1;
    factors.push("OPEN_SPACE"); explanation.push("Không gian mở làm tăng tải lạnh.");
  }
  if (input.largeGlassArea) {
    estimated *= airConditionerRules.largeGlassMultiplier; severity += 1;
    factors.push("LARGE_GLASS"); explanation.push("Diện tích kính lớn làm tăng tải nhiệt.");
  }
  if (input.heatSources?.some((source) => source !== "KITCHEN")) {
    estimated *= airConditionerRules.otherHeatSourceMultiplier; severity += 1;
    factors.push("OTHER_HEAT_SOURCE"); explanation.push("Đã tính thêm nguồn tỏa nhiệt trong phòng.");
  }
  if ((input.people || 0) > 2) {
    estimated += ((input.people || 0) - 2) * airConditionerRules.extraPersonBTU;
    factors.push("EXTRA_PEOPLE"); explanation.push(`Đã tính thêm tải nhiệt cho ${input.people} người.`);
  } else if (!input.people) assumptions.push("Khoảng 1–2 người sử dụng thường xuyên");
  const rounded = Math.round(estimated / 100) * 100;
  const capacities = airConditionerRules.commercialCapacities;
  const lower = [...capacities].reverse().find((capacity) => capacity <= rounded) || capacities[0];
  const higher = capacities.find((capacity) => capacity >= rounded) || capacities.at(-1)!;
  const exceedRatio = rounded > lower ? (rounded - lower) / lower : 0;
  const keepLower = lower !== higher && exceedRatio <= airConditionerRules.lowerCapacityTolerance && severity < 2;
  const primary = keepLower ? lower : higher;
  const alternative = lower === higher ? undefined : (primary === lower ? higher : lower);
  const heatLoad = severity >= 2 ? "HIGH" : severity === 1 ? "ELEVATED" : "NORMAL";
  const missingUsefulFactors = [
    !input.roomType && "loại phòng", !input.direction && "hướng nắng",
    input.topFloor === undefined && "vị trí tầng áp mái",
    input.connectedKitchen === undefined && "không gian có thông bếp",
    input.largeGlassArea === undefined && "diện tích kính", !input.people && "số người thường dùng phòng",
  ].filter((value): value is string => Boolean(value));
  const confidence = missingUsefulFactors.length <= 1 ? "HIGH" : missingUsefulFactors.length <= 4 ? "MEDIUM" : "LOW";
  return {
    estimatedBTU: rounded,
    recommendedRangeBTU: {
      min: Math.round((rounded * airConditionerRules.rangeBelowRatio) / 100) * 100,
      max: Math.round((rounded * airConditionerRules.rangeAboveRatio) / 100) * 100,
    },
    primaryCommercialBTU: primary,
    alternativeCommercialBTU: alternative,
    recommendedCommercialBTU: primary,
    recommendedHP: hpFor(primary),
    heatLoad,
    confidence,
    assumptions,
    heatLoadFactors: factors,
    explanation,
    missingUsefulFactors,
    missingImportantFactors: missingUsefulFactors,
  };
}
