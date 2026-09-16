import {
  knownBrands,
  modelCandidates,
  normalizeCategory,
  normalizeText,
  parseBTU,
} from "./normalization";
import type { ChatContext, ExtractedEntities } from "./types";

const includesAny = (text: string, terms: string[]) =>
  terms.some((term) => text.includes(term));
const decimal = (value?: string) =>
  value ? Number(value.replace(",", ".")) : undefined;
const price = (value?: string) =>
  value ? Math.round(Number(value.replace(",", ".")) * 1_000_000) : undefined;

export function extractEntities(
  message: string,
  context: ChatContext = {},
): ExtractedEntities {
  const text = normalizeText(message);
  const models = modelCandidates(message);
  const area = text.match(/(\d+(?:[.,]\d+)?)\s*(?:m2|m vuong|met vuong)/);
  const dimensions = text.match(
    /(\d+(?:[.,]\d+)?)\s*(?:m)?\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(?:m)?(?:\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*m)?/,
  );
  const ceiling = text.match(/tran(?: cao)?\s*(\d+(?:[.,]\d+)?)\s*m/);
  const people = text.match(/(\d+)\s*(?:nguoi|thanh vien)/);
  const wordPeople = text.match(
    /\b(mot|hai|ba|bon|nam|sau|bay|tam|chin|muoi)\s*nguoi\b/,
  );
  const rangeMillion = text.match(
    /(?:tu|tam)\s*(\d+(?:[.,]\d+)?)\s*(?:den|toi)\s*(\d+(?:[.,]\d+)?)\s*(?:trieu|tr)\b/,
  );
  const maxMillion = text.match(
    /(?:duoi|toi da|tam|khoang)\s*(\d+(?:[.,]\d+)?)\s*(?:trieu|tr)\b/,
  );
  const minMillion = text.match(/(?:tu|tren)\s*(\d+(?:[.,]\d+)?)\s*(?:trieu|tr)\b/);
  const directPrice = text.match(/\b(\d{6,10})\s*(?:d|dong)?\b/);
  const horsepower = text.match(/\b(1(?:[.,]5)?|2(?:[.,]5)?|3|4)\s*(?:hp|ngua)\b/);
  const viewing = text.match(/(?:cach|khoang cach)\s*(\d+(?:[.,]\d+)?)\s*(?:m|met)\b/);
  const quantity = text.match(
    /(?:mua|bao gia|can|khoang)\s*(\d+)\s*(?:cai|chiec|bo|dieu hoa|tivi|tu lanh|may giat)?/,
  );
  const brand = knownBrands.find((item) => text.includes(normalizeText(item)));
  const features = [
    "wifi",
    "inverter",
    "120hz",
    "oled",
    "qled",
    "say",
    "tu dong cap nuoc giat",
    "lam da tu dong",
    "chay em",
    "tiet kiem dien",
  ].filter((feature) => text.includes(feature));
  const negative = includesAny(text, [
    "khong can",
    "khong lay",
    "loai tru",
    "khong muon",
  ]);
  const extractedArea = area
    ? decimal(area[1])
    : dimensions
      ? decimal(dimensions[1])! * decimal(dimensions[2])!
      : undefined;
  const current: ExtractedEntities = {
    model: models[0],
    sku: models[0],
    brand,
    category: normalizeCategory(message),
    area: extractedArea,
    areaM2: extractedArea,
    dimensions: dimensions
      ? {
          width: decimal(dimensions[1]),
          length: decimal(dimensions[2]),
          height: decimal(dimensions[3]),
        }
      : undefined,
    ceilingHeight: ceiling
      ? decimal(ceiling[1])
      : dimensions?.[3]
        ? decimal(dimensions[3])
        : undefined,
    roomType: text.includes("phong ngu")
      ? "bedroom"
      : text.includes("phong khach")
        ? "living-room"
        : text.includes("van phong")
          ? "office"
          : undefined,
    capacityBTU: parseBTU(message),
    horsepower: horsepower ? decimal(horsepower[1]) : undefined,
    inverter: text.includes("inverter") ? !negative : undefined,
    people: people
      ? Number(people[1])
      : wordPeople
        ? ({
            mot: 1,
            hai: 2,
            ba: 3,
            bon: 4,
            nam: 5,
            sau: 6,
            bay: 7,
            tam: 8,
            chin: 9,
            muoi: 10,
          } as Record<string, number>)[wordPeople[1]]
        : undefined,
    direction: includesAny(text, ["huong tay", "nang tay"]) ? "west" : undefined,
    topFloor: includesAny(text, [
      "tang ap mai",
      "tang tren cung",
      "tang thuong",
    ])
      ? true
      : undefined,
    largeGlassArea: includesAny(text, ["nhieu kinh", "cua kinh lon"])
      ? true
      : undefined,
    heatSources: includesAny(text, ["nguon nhiet", "nhieu may", "phong bep"])
      ? true
      : undefined,
    viewingDistanceM: viewing ? decimal(viewing[1]) : undefined,
    minPrice: rangeMillion
      ? price(rangeMillion[1])
      : minMillion
        ? price(minMillion[1])
        : undefined,
    maxPrice: rangeMillion
      ? price(rangeMillion[2])
      : maxMillion
        ? price(maxMillion[1])
        : directPrice
          ? Number(directPrice[1])
          : undefined,
    requiredFeatures: negative ? undefined : features.length ? features : undefined,
    excludedFeatures: negative && features.length ? features : undefined,
    excludedBrands: negative && brand ? [brand] : undefined,
    quantity: quantity ? Number(quantity[1]) : undefined,
    timeWindow: includesAny(text, ["gan day", "tuan nay", "hom nay", "dang hot"])
      ? "recent"
      : undefined,
    inStock: includesAny(text, ["con hang", "ton kho"]) ? true : undefined,
    keywords: text.split(" ").filter((word) => word.length >= 3).slice(0, 16),
  };
  return {
    ...(context.constraints || {}),
    ...Object.fromEntries(
      Object.entries(current).filter(([, value]) => value !== undefined),
    ),
  };
}
