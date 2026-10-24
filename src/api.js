import { getCreatedBusinesses, saveBusiness, removeLocalBusiness, getFavorites, toggleFavorite } from './catalog.js?v=20261024-2';
export const account = { loading: true, shared: false, businesses: [], error: '' };
const OWNED_KEY = 'raizes:published-ids:v1';
const MANAGEMENT_KEY = 'raizes:management-keys:v1';
export function managementKeys(storage) {
  try {
    const keys = JSON.parse((storage || globalThis.localStorage).getItem(MANAGEMENT_KEY) || '{}');
    return keys && typeof keys === 'object' && !Array.isArray(keys) ? keys : {};
  } catch { return {}; }
}
export function canDeleteBusiness(business, storage) {
  if (business.demo) return false;
  return business.shared ? /^[a-f0-9]{64}$/.test(managementKeys(storage)[business.id] || '') : getCreatedBusinesses(storage).some(b => b.id === business.id);
}
export function ownedBusinessIds(storage) {
  try {
    const values = JSON.parse((storage || globalThis.localStorage).getItem(OWNED_KEY) || '[]');
    return Array.isArray(values) ? values.filter(id => typeof id === 'string') : [];
  } catch { return []; }
}
function rememberBusiness(id) {
  try { localStorage.setItem(OWNED_KEY, JSON.stringify([...new Set([...ownedBusinessIds(), id])])); return true; }
  catch { return false; }
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const response = await fetch(`api/${path}`, { credentials: 'omit', ...options, signal: controller.signal, headers: { ...(options.body ? { "content-type": "application/json", "x-raizes-request": "1" } : {}), ...options.headers } });
    if (!(response.headers.get("content-type") || "").includes("application/json")) throw new Error("A vitrine compartilhada está disponível no novo endereço público.");
    const body = await response.json();
    if (!response.ok) throw Object.assign(new Error(body.error || "Não foi possível completar a solicitação."), { errors: body.errors, status: response.status });
    return body;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("A conexão demorou demais. Confira sua internet e tente novamente.");
    throw error;
  } finally { clearTimeout(timer); }
}

export async function loadAccount() {
  account.loading = true; account.error = "";
  try {
    const session = await request("session");
    account.shared = session.shared === true;
    account.businesses = account.shared ? (await request('businesses')).businesses : getCreatedBusinesses();
    if (account.shared) {
      const known = new Set(account.businesses.map(b => b.id));
      const missing = ownedBusinessIds().filter(id => /^[a-f0-9-]{36}$/i.test(id) && !known.has(id));
      for (let start = 0; start < missing.length; start += 40) {
        const extra = await request(`businesses?ids=${missing.slice(start, start + 40).join(',')}`);
        account.businesses.push(...extra.businesses);
      }
    }
  } catch (error) { account.error = error.message; }
  account.loading = false;
  return account;
}

export async function publishBusiness(business, images) {
  let result;
  let managementToken;
  if (account.shared) {
    managementToken = [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, '0')).join('');
    try { localStorage.setItem(MANAGEMENT_KEY, JSON.stringify(managementKeys())); }
    catch { throw new Error('Permita o armazenamento deste site no navegador para guardar a chave de exclusão do seu anúncio.'); }
    result = await request('businesses', { method:'POST', body:JSON.stringify({business, images, managementToken}) });
  }
  else {
    if (account.error && location.hostname.endsWith('.pages.dev')) throw new Error('A publicação compartilhada está indisponível. Tente novamente em instantes.');
    result = saveBusiness(business, images);
    if (!result.ok) throw Object.assign(new Error(result.errors.form || 'Revise os campos indicados.'), { errors:result.errors });
  }
  result.business.localTrackingFailed = !rememberBusiness(result.business.id);
  if (managementToken) {
    try { localStorage.setItem(MANAGEMENT_KEY, JSON.stringify({ ...managementKeys(), [result.business.id]: managementToken })); }
    catch { result.business.localTrackingFailed = true; }
  }
  account.businesses.unshift(result.business);
  return result.business;
}

export async function deleteBusiness(business) {
  if (!canDeleteBusiness(business)) throw new Error('Este navegador não tem a chave para excluir este anúncio.');
  if (business.shared) await request(`businesses/${encodeURIComponent(business.id)}`, { method:'DELETE', headers: { 'x-raizes-request':'1', 'x-raizes-management':managementKeys()[business.id] } });
  else removeLocalBusiness(business.id);
  account.businesses = account.businesses.filter(b => b.id !== business.id);
  try {
    localStorage.setItem(OWNED_KEY, JSON.stringify(ownedBusinessIds().filter(id => id !== business.id)));
    const keys = managementKeys(); delete keys[business.id];
    localStorage.setItem(MANAGEMENT_KEY, JSON.stringify(keys));
    if (getFavorites().includes(business.id)) toggleFavorite(business.id);
  } catch { /* The server deletion succeeded even if local cleanup is unavailable. */ }
}


