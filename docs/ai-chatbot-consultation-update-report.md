# AI chatbot consultation engine update

## Root causes

- Entity extraction treated a connected kitchen as a product category clue and had no explicit connected-kitchen/open-space fields.
- Short context stored loose constraints without a pending skill or required-slot state.
- The calculator always rounded upward to the next commercial capacity.
- Technical sizing and catalog lookup were expressed as one result, allowing inventory to appear to validate the selected capacity.
- Clarification checked only the current extraction, so follow-up values could be lost or requested again.

## Files changed

The main changes are in `entities.ts`, `intent.ts`, `types.ts`, `consultation-state.ts`, `skills/air-conditioner/calculator.ts`, `product-service.ts`, `chat-engine.ts`, `routes/ai-chat.ts`, frontend context typing, evaluation tooling, consultation tests and both training/evaluation dataset formats.

## Structured short context

`ChatContext` now carries `pendingSkill`, normalized `requirements`, `missingFields` and `candidateProductIds`. `mergeRequirements` keeps prior defined values and replaces them only with explicit new values. Corrections therefore update area/capacity without erasing room type, exclusions or heat factors. Guest storage remains browser memory; authenticated message persistence is unchanged.

## AC sizing

The deterministic output now separates estimated load, recommended range, primary commercial capacity, alternative capacity, heat-load level, confidence, assumptions, heat factors and missing useful factors. Coefficients live in `airConditionerRules`. The skill supports west exposure, top floor, connected kitchen, open space, large glass, high ceiling, extra people and other heat sources.

For a 20 m² west-facing room, the estimate is 13,200 BTU. Because this exceeds 12,000 BTU by only 10% with one elevated factor, 12,000 BTU remains primary and 18,000 BTU is an alternative. Combined or stronger factors can select the higher class.

## Catalog separation

The skill completes before catalog access. Product retrieval receives primary and alternative capacities and labels results as exact, higher alternative, lower alternative or outside recommendation. Lower-capacity alternatives and outside-range products are not presented as suitable. When exact inventory is absent, the technical recommendation remains unchanged and the response states the catalog limitation.

## Clarification

Area is the only required AC sizing slot. If absent, the bot asks one area question and stores the pending skill. Other fields refine confidence but do not create a questionnaire. A reply such as `30m²` fills the pending area and immediately runs sizing.

## Before and after

- `Phòng ngủ 20m² hướng Tây`: previously forced 18,000 BTU; now estimates 13,200 BTU with 12,000 primary and 18,000 conditional alternative.
- `Phòng khách thông với bếp 30m²`: previously could ask for area or treat it as an ordinary room; now extracts 30 m², living room, open space and connected kitchen, then applies the kitchen heat factor.
- `Phòng khách thông với bếp` followed by `30m²`: now preserves the first-turn requirements and executes the pending skill.
- `Phòng 20m²` followed by `Không, 25m² cơ`: now overrides only the area and recalculates.

## Tests and evaluation

- Consultation unit/regression suite: 11/11 passed.
- Required entity examples, follow-up filling, corrections, west/top-floor factors, connected kitchen, nuanced 13,200 mapping and catalog independence are covered.
- Dataset evaluation: 100% intent, 100% skill routing, 100% critical intent, 100% area extraction, 100% context merge and 100% consultation regressions; existing-value re-asking and catalog override violations are zero.
- Existing commerce, RAG, build and typecheck suites remain part of final verification.

## Limitations and next improvements

The business coefficients are configurable in code but not editable through an admin UI. Future work can add calibrated regional climate profiles, room insulation quality and sun-exposure strength after the store selects authoritative engineering rules. Catalog match labels are returned by the API; a future UI enhancement may display the exact/alternative badge on each product card.
