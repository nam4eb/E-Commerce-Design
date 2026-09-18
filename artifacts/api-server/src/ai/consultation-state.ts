import type { ChatContext, ConsultationRequirements, ExtractedEntities } from "./types";

const defined = <T extends object>(value: T) => Object.fromEntries(
  Object.entries(value).filter(([, item]) => item !== undefined && item !== null),
) as Partial<T>;

export function entitiesToRequirements(entities: ExtractedEntities): Partial<ConsultationRequirements> {
  return defined({
    category: entities.category,
    areaM2: entities.areaM2,
    dimensions: entities.dimensions,
    roomType: entities.roomType,
    direction: entities.direction,
    topFloor: entities.topFloor,
    connectedKitchen: entities.connectedKitchen,
    openSpace: entities.openSpace,
    largeGlassArea: entities.largeGlassArea,
    ceilingHeightM: entities.ceilingHeight,
    people: entities.people,
    heatSources: entities.heatSources,
    minPrice: entities.minPrice,
    maxPrice: entities.maxPrice,
    brand: entities.brand,
    capacityBTU: entities.capacityBTU,
    inverter: entities.inverter,
    requiredFeatures: entities.requiredFeatures,
    excludedFeatures: entities.excludedFeatures,
    excludedBrands: entities.excludedBrands,
  });
}

export function mergeRequirements(
  previous: Partial<ConsultationRequirements> = {},
  entities: ExtractedEntities,
): Partial<ConsultationRequirements> {
  const next = entitiesToRequirements(entities);
  return defined({
    ...defined(previous),
    ...next,
    heatSources: next.heatSources ?? previous.heatSources,
    requiredFeatures: next.requiredFeatures ?? previous.requiredFeatures,
    excludedFeatures: next.excludedFeatures ?? previous.excludedFeatures,
    excludedBrands: next.excludedBrands ?? previous.excludedBrands,
  });
}

export function requirementsToEntities(requirements: Partial<ConsultationRequirements>): ExtractedEntities {
  return {
    ...requirements,
    area: requirements.areaM2,
    ceilingHeight: requirements.ceilingHeightM,
  };
}

export function getMissingFields(skill: string | undefined, requirements: Partial<ConsultationRequirements>) {
  if (skill === "AIR_CONDITIONER_SIZING") return requirements.areaM2 === undefined ? ["areaM2"] : [];
  return [];
}

export function consultationContext(
  previous: ChatContext,
  requirements: Partial<ConsultationRequirements>,
  pendingSkill: string | undefined,
  missingFields: string[],
  candidateProductIds?: string[],
): ChatContext {
  return {
    ...previous,
    pendingSkill,
    requirements,
    constraints: requirementsToEntities(requirements),
    missingFields,
    candidateProductIds,
  };
}
