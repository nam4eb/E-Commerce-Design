import { calculateAirConditionerCapacity } from "./air-conditioner/calculator";

export interface AISkill<I = unknown, O = unknown> {
  name: string;
  implemented: boolean;
  execute(input: I): Promise<O> | O;
}

const unavailable = (name: string): AISkill => ({
  name,
  implemented: false,
  execute() {
    return { available: false, reason: "SKILL_NOT_IMPLEMENTED" };
  },
});

export const skillRegistry = new Map<string, AISkill>([
  [
    "AIR_CONDITIONER_SIZING",
    {
      name: "AIR_CONDITIONER_SIZING",
      implemented: true,
      execute: calculateAirConditionerCapacity,
    },
  ],
  ...[
    "AIR_CONDITIONER_ADVISOR",
    "WASHING_MACHINE_SIZING",
    "WASHING_MACHINE_ADVISOR",
    "REFRIGERATOR_SIZING",
    "REFRIGERATOR_ADVISOR",
    "TV_SIZE_ADVISOR",
    "TV_ADVISOR",
    "WATER_HEATER_SIZING",
    "WATER_HEATER_ADVISOR",
    "AIR_PURIFIER_SIZING",
    "AIR_PURIFIER_ADVISOR",
    "DISHWASHER_ADVISOR",
    "COOKING_APPLIANCE_ADVISOR",
    "DRYER_ADVISOR",
    "VACUUM_ADVISOR",
    "ENERGY_COST_ESTIMATOR",
  ].map((name) => [name, unavailable(name)] as [string, AISkill]),
]);

export function getSkill(name?: string) {
  return name ? skillRegistry.get(name) : undefined;
}
