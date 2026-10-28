import { CATEGORIES, normalizeText } from "./catalog.js?v=20261028-2";

export const PREFERENCES_KEY = "raizes:preferences:v1";
export const DEFAULT_PREFERENCES = { city: "São Paulo", neighborhood: "", categories: [], tastes: "", minPrice: "", maxPrice: "", location: null };

export function validLocation(location) {
  return Boolean(location && typeof location.latitude === "number" && typeof location.longitude === "number" && Number.isFinite(location.latitude) && Number.isFinite(location.longitude) && Math.abs(location.latitude) <= 90 && Math.abs(location.longitude) <= 180);
}

export function approximateLocation(location) {
  if (!validLocation(location)) return null;
  return { latitude: Math.round(location.latitude * 100) / 100, longitude: Math.round(location.longitude * 100) / 100 };
}

export function parsePrice(value) {
  if (value === undefined || value === null || typeof value === "string" && !value.trim()) return null;
  const number = typeof value === "number" ? value : Number(String(value).trim().replace(/\s|R\$/g, "").replace(",", "."));
  return Number.isFinite(number) && number >= 0 && number <= 1000000 ? Math.round(number * 100) / 100 : NaN;
}

export function money(value) {
  return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Sob consulta";
}

export function validatePreferences(values) {
  const errors = {};
  const min = parsePrice(values.minPrice), max = parsePrice(values.maxPrice);
  if (Number.isNaN(min) || Number.isNaN(max)) errors.budget = "Use valores de 0 a 1.000.000, sem pontos de milhar.";
  else if (min !== null && max !== null && min > max) errors.budget = "O valor máximo deve ser maior ou igual ao mínimo.";
  return errors;
}

function browserStorage() { try { return globalThis.localStorage; } catch { return null; } }

export function getPreferences(storage = browserStorage()) {
  try {
    const value = JSON.parse(storage?.getItem(PREFERENCES_KEY) || "null");
    if (!value || typeof value !== "object" || Object.keys(validatePreferences(value)).length) return { ...DEFAULT_PREFERENCES, categories: [] };
    return { city: String(value.city || "São Paulo").slice(0, 80), neighborhood: String(value.neighborhood || "").slice(0, 80), categories: Array.isArray(value.categories) ? value.categories.filter(c => CATEGORIES.includes(c)) : [], tastes: String(value.tastes || "").slice(0, 160), minPrice: value.minPrice ?? "", maxPrice: value.maxPrice ?? "", location: approximateLocation(value.location) };
  } catch { return { ...DEFAULT_PREFERENCES, categories: [] }; }
}

export function savePreferences(values, storage = browserStorage()) {
  const errors = validatePreferences(values);
  if (Object.keys(errors).length) return { ok: false, errors };
  try {
    storage.setItem(PREFERENCES_KEY, JSON.stringify({ ...values, location: approximateLocation(values.location) }));
    return { ok: true, preferences: getPreferences(storage) };
  } catch { return { ok: false, errors: { form: "Não foi possível guardar suas preferências neste navegador." } }; }
}

export function distanceKm(from, to) {
  if (!validLocation(from) || !validLocation(to)) return null;
  const rad = n => n * Math.PI / 180;
  const a = Math.sin(rad(to.latitude - from.latitude) / 2) ** 2 + Math.cos(rad(from.latitude)) * Math.cos(rad(to.latitude)) * Math.sin(rad(to.longitude - from.longitude) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(Math.min(1, a)), Math.sqrt(Math.max(0, 1 - a)));
}

export function productsOf(business) {
  if (Array.isArray(business.products)) return business.products.filter(p => p && typeof p.name === "string").map(p => ({ name: p.name, price: typeof p.price === "number" && Number.isFinite(p.price) && p.price >= 0 ? p.price : null, images: Array.isArray(p.images) ? p.images.slice(0, 3) : [] }));
  return (business.offerings || []).map(name => ({ name, price: null }));
}

export function withinBudget(product, preferences) {
  const min = parsePrice(preferences.minPrice), max = parsePrice(preferences.maxPrice);
  if (Number.isNaN(min) || Number.isNaN(max)) return false;
  if (min === null && max === null) return true;
  return typeof product.price === "number" && (min === null || product.price >= min) && (max === null || product.price <= max);
}

function tasteScore(business, product, preferences) {
  const words = normalizeText(preferences.tastes).split(/[\s,;]+/).filter(w => w.length > 1);
  const text = normalizeText([business.name, business.description, business.category, business.tags || "", product?.name || ""].join(" "));
  return words.reduce((sum, word) => sum + Number(text.includes(word)), 0);
}

function proximityOrder(a, b, preferences) {
  const da = distanceKm(preferences.location, a.location), db = distanceKm(preferences.location, b.location);
  if (da !== null || db !== null) return (da ?? Infinity) - (db ?? Infinity);
  const bairro = normalizeText(preferences.neighborhood), city = normalizeText(preferences.city);
  const match = item => Boolean(bairro && normalizeText(item.neighborhood) === bairro && (!city || normalizeText(item.city) === city));
  return Number(match(b)) - Number(match(a));
}

export function rankBusinesses(businesses, preferences = DEFAULT_PREFERENCES) {
  return businesses.filter(b => productsOf(b).some(p => withinBudget(p, preferences))).slice().sort((a, b) => proximityOrder(a, b, preferences) || tasteScore(b, null, preferences) - tasteScore(a, null, preferences) || a.name.localeCompare(b.name, "pt-BR"));
}

export function recommendProducts(businesses, preferences = DEFAULT_PREFERENCES, limit = 6) {
  const candidates = businesses.filter(b => !preferences.categories?.length || preferences.categories.includes(b.category))
    .flatMap(business => productsOf(business).filter(p => withinBudget(p, preferences)).map(product => ({ business, product, matchesTaste: tasteScore(business, product, preferences) > 0 })));
  return candidates.sort((a, b) => Number(b.matchesTaste) - Number(a.matchesTaste) || proximityOrder(a.business, b.business, preferences) || (a.product.price ?? Infinity) - (b.product.price ?? Infinity)).slice(0, limit);
}

