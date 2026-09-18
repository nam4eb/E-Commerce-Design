import assert from "node:assert/strict";

process.env.DATABASE_FILE = ":memory:";
delete process.env.DATABASE_URL;
delete process.env.AI_GATEWAY_API_KEY;

const { openCommerceDatabase } = await import("@workspace/db/commerce");
const { extractEntities } = await import("./ai/entities");
const { mergeRequirements } = await import("./ai/consultation-state");
const { calculateAirConditionerCapacity } = await import("./ai/skills/air-conditioner/calculator");
const { answerChat } = await import("./ai/chat-engine");

const db = await openCommerceDatabase();
let passed = 0;
const test = async (name: string, work: () => Promise<void> | void) => {
  await work(); passed++; console.log(`PASS ${name}`);
};

try {
  await db.query(
    "INSERT INTO shop_products (id,data,price,stock) VALUES ($1,$2,$3,$4)",
    ["only-18k", JSON.stringify({ name: "Điều hòa thử nghiệm 18.000 BTU", brand: "Test", category: "Điều hòa", categoryId: "air-conditioner", image: "", specs: [{ label: "Công suất", value: "18.000 BTU" }], tags: [] }), 15000000, 5],
  );

  await test("AC-CONTEXT-001 extracts connected living room", () => {
    const value = extractEntities("Phòng khách thông với bếp 30m²");
    assert.equal(value.areaM2, 30); assert.equal(value.roomType, "LIVING_ROOM");
    assert.equal(value.connectedKitchen, true); assert.equal(value.openSpace, true);
    assert.deepEqual(value.heatSources, ["KITCHEN"]);
  });
  await test("entity examples", () => {
    assert.deepEqual(
      (({ areaM2, roomType, direction }) => ({ areaM2, roomType, direction }))(extractEntities("phòng ngủ 20m2 hướng Tây")),
      { areaM2: 20, roomType: "BEDROOM", direction: "WEST" },
    );
    const dimensions = extractEntities("phòng 4x5m tầng trên cùng");
    assert.equal(dimensions.areaM2, 20); assert.equal(dimensions.topFloor, true);
    const people = extractEntities("phòng khách 25m2 4 người");
    assert.equal(people.people, 4); assert.equal(people.roomType, "LIVING_ROOM");
    assert.equal(extractEntities("20m2 nhiều kính").largeGlassArea, true);
    assert.equal(extractEntities("phòng 30m thông bếp").areaM2, 30);
  });
  await test("AC-CONTEXT-002 fills area and runs skill", async () => {
    const first = await answerChat(db, "Phòng khách thông với bếp", {});
    assert.equal(first.response.responseType, "clarification");
    assert.equal(first.response.context.pendingSkill, "AIR_CONDITIONER_SIZING");
    const second = await answerChat(db, "30m²", first.response.context);
    assert.equal(second.response.responseType, "advice");
    assert.equal(second.response.context.requirements?.areaM2, 30);
    assert.equal(second.response.context.requirements?.connectedKitchen, true);
  });
  await test("AC-WEST-001 keeps 12k primary for modest 13.2k estimate", async () => {
    const result = await answerChat(db, "Phòng ngủ 20m² hướng Tây thì sao?", {});
    assert.equal(result.response.recommendation?.estimatedBTU, 13200);
    assert.equal(result.response.recommendation?.primaryCommercialBTU, 12000);
    assert.equal(result.response.recommendation?.alternativeCommercialBTU, 18000);
    assert.ok(result.response.recommendation?.heatLoadFactors.includes("WEST"));
  });
  await test("AC-WEST-002 combines west and top-floor factors", async () => {
    const result = await answerChat(db, "Phòng ngủ 20m² hướng Tây tầng áp mái", {});
    assert.deepEqual(result.response.recommendation?.heatLoadFactors.slice(0, 2), ["WEST", "TOP_FLOOR"]);
    assert.equal(result.response.recommendation?.heatLoad, "HIGH");
  });
  await test("AC-KITCHEN-001 connected kitchen raises load", () => {
    const ordinary = calculateAirConditionerCapacity({ area: 30, roomType: "LIVING_ROOM" });
    const kitchen = calculateAirConditionerCapacity({ area: 30, roomType: "LIVING_ROOM", connectedKitchen: true, openSpace: true, heatSources: ["KITCHEN"] });
    assert.ok(kitchen.estimatedBTU > ordinary.estimatedBTU);
    assert.ok(kitchen.heatLoadFactors.includes("CONNECTED_KITCHEN"));
  });
  await test("AC-CATALOG-001 catalog cannot override technical result", async () => {
    const result = await answerChat(db, "Phòng ngủ 20m² dùng điều hòa bao nhiêu BTU?", {});
    assert.equal(result.response.recommendation?.primaryCommercialBTU, 12000);
    assert.equal(result.response.products?.length, 0);
    assert.match(result.response.message, /chưa có mẫu 12\.000 BTU/i);
  });
  await test("AC-CONTEXT follow-up direction recalculates", async () => {
    const first = await answerChat(db, "Phòng ngủ 20m²", {});
    const second = await answerChat(db, "Hướng Tây", first.response.context);
    assert.equal(second.response.context.requirements?.areaM2, 20);
    assert.equal(second.response.context.requirements?.direction, "WEST");
    assert.equal(second.response.recommendation?.estimatedBTU, 13200);
  });
  await test("AC-CONTEXT top-floor follow-up preserves earlier values", async () => {
    const first = await answerChat(db, "Phòng 20m2 hướng Tây", {});
    const second = await answerChat(db, "À tôi ở tầng áp mái nữa", first.response.context);
    assert.equal(second.response.context.requirements?.areaM2, 20);
    assert.equal(second.response.context.requirements?.direction, "WEST");
    assert.equal(second.response.context.requirements?.topFloor, true);
  });
  await test("AC-CORRECTION-001 explicit correction overrides area", async () => {
    const first = await answerChat(db, "Phòng 20m²", {});
    const second = await answerChat(db, "Không, 25m² cơ", first.response.context);
    assert.equal(second.response.context.requirements?.areaM2, 25);
    assert.equal(second.response.recommendation?.estimatedBTU, 15000);
  });
  await test("merge keeps negative requirements", () => {
    const merged = mergeRequirements({ areaM2: 20, excludedBrands: ["LG"] }, extractEntities("hướng Tây"));
    assert.equal(merged.areaM2, 20); assert.deepEqual(merged.excludedBrands, ["LG"]);
  });
  console.log(`Consultation tests: ${passed}/${passed} passed`);
} finally {
  await db.close();
}

