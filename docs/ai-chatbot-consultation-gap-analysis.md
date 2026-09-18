# AI chatbot consultation gap analysis

## Reproduced behavior and root causes

The four reported failures were traced against the current deterministic pipeline before implementation.

1. A 20 m² west-facing bedroom produces an estimated 13,200 BTU. The calculator selects the first commercial capacity greater than the estimate, so it declares 18,000 BTU as the recommendation. The catalog query then searches only 18,000 BTU and reinforces that choice.
2. `Phòng khách thông với bếp 30m²` yields the area but does not extract connected/open kitchen state. Intent resolution can also interpret `bếp` as a kitchen-product category instead of an air-conditioner room condition.
3. Context only stores generic `constraints`. There is no pending skill, required-slot list or deterministic continuation rule, so a reply containing only `30m²` can be classified as incomplete and the bot asks for area again.
4. The sizing calculator has only a boolean generic heat source. It cannot distinguish a connected kitchen/open plan and its severity from an ordinary room.

## Related modules

- `entities.ts`: incomplete room, direction, open-space and kitchen extraction.
- `intent.ts`: no continuation rule for a pending consultation skill.
- `types.ts` and `routes/ai-chat.ts`: insufficient structured short context.
- `skills/air-conditioner/calculator.ts`: unconditional ceiling to the next commercial class and scattered response assumptions.
- `chat-engine.ts`: clarification and context merge are interleaved; the catalog is queried with one forced capacity.
- `product-service.ts`: product results have no technical match classification.

## Current pipeline

Normalize → intent/entities (partly merged with `constraints`) → check area → calculate one capacity → query that exact capacity → compose one combined recommendation/catalog statement.

## Expected pipeline

Normalize → intent/entities → deterministic requirement merge → missing required slots → deterministic skill → technical recommendation/range/alternatives → product lookup and match classification → response. RAG remains outside numeric sizing.

## Required changes

- Add lightweight `requirements`, `pendingSkill`, `missingFields` and candidate IDs to chat context.
- Normalize consultation enums and merge only explicit new values over previous state.
- Extract dimensions, all directions, connected kitchens, open spaces and named heat sources.
- Centralize AC coefficients and return range, primary/alternative capacity, heat factors, confidence and assumptions.
- Search catalog only after sizing and label exact/higher/lower/outside matches.
- Ask one question only when a required slot is absent.
- Add multi-turn, correction, catalog-independence and heat-load regression tests and metrics.

## Regression risks

Price, stock, bestseller and RAG routing must retain their authoritative sources. Guest context remains browser memory and authenticated persistence remains unchanged. Existing lowercase values may be received from older browser context, so the merge layer must normalize them rather than reject or erase them.
