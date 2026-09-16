const categoryAliases: Record<string, string[]> = {
  "air-conditioner": ["dieu hoa", "may lanh", "air conditioner"],
  refrigerator: ["tu lanh", "refrigerator"],
  dryer: ["may say", "say quan ao"],
  "washing-machine": ["may giat", "washing machine"],
  television: ["tivi", "television"],
  "water-heater": ["binh nong lanh", "may nuoc nong", "water heater"],
  "air-purifier": ["may loc khong khi", "loc khong khi", "may loc", "loc bui min"],
  vacuum: ["robot hut bui", "may hut bui", "hut bui", "robot nao", "nha nhieu tham"],
  dishwasher: ["may rua bat", "may rua chen"],
  kitchen: ["bep tu", "lo vi song", "noi chien", "noi com"],
};

const slang: Array<[RegExp, string]> = [
  [/\bbn\b/g, "bao nhieu"],
  [/\bko\b|\bk\b/g, "khong"],
  [/\bdc\b/g, "duoc"],
  [/\bsp\b/g, "san pham"],
  [/\bmay lanh\b/g, "dieu hoa"],
  [/\btv\b/g, "tivi"],
];

/** Normalizes customer language while modelCandidates keeps SKU/model tokens intact. */
export function normalizeText(value: string) {
  let normalized = value
    .replace(/²/g, "2")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/[^a-z0-9.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  for (const [pattern, replacement] of slang)
    normalized = normalized.replace(pattern, replacement);
  return normalized.replace(/\s+/g, " ").trim();
}

export function compact(value: string) {
  return normalizeText(value).replace(/\s+/g, "");
}

export function normalizeCategory(value: string) {
  const text = normalizeText(value);
  return Object.entries(categoryAliases).find(([, aliases]) =>
    aliases.some((alias) => text.includes(alias)),
  )?.[0];
}

export function parseBTU(value: string) {
  const raw = value.toLowerCase().replace(/,/g, ".");
  const text = normalizeText(value);
  const short = text.match(/\b(9|12|18|24|30|36)\s*k(?:\s*btu)?\b/);
  if (short) return Number(short[1]) * 1000;
  const explicit = raw.match(/\b(\d[\d.,]{2,6})\s*btu\b/);
  if (explicit) return Number(explicit[1].replace(/[.,]/g, ""));
  const commercial = text.match(/\b(9000|12000|18000|24000|28000|30000|36000)\b/);
  if (commercial) return Number(commercial[1]);
  const hp = text.match(/\b(1(?:\.5)?|2(?:\.5)?|3|4)\s*(?:hp|ngua)\b/);
  if (!hp) return undefined;
  return ({
    1: 9000,
    1.5: 12000,
    2: 18000,
    2.5: 24000,
    3: 28000,
    4: 36000,
  } as Record<number, number>)[Number(hp[1])];
}

export function modelCandidates(value: string) {
  const ignored = new Set(["BTU", "HP", "M2", "INVERTER", "PM2", "120HZ"]);
  return (
    value
      .toUpperCase()
      .match(/\b(?=[A-Z0-9\/-]*[A-Z])(?=[A-Z0-9\/-]*\d)[A-Z0-9][A-Z0-9\/-]{3,}\b/g) || []
  ).filter((item) => !ignored.has(item));
}

export const knownBrands = [
  "Daikin",
  "Panasonic",
  "Midea",
  "Gree",
  "Funiki",
  "Nagakawa",
  "Sumikura",
  "LG",
  "Samsung",
  "Casper",
  "Toshiba",
  "Mitsubishi Electric",
  "Mitsubishi Heavy",
  "Aqua",
  "Sharp",
  "Sony",
  "TCL",
  "Philips",
  "Bosch",
  "Kangaroo",
  "Electrolux",
];
