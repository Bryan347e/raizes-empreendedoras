import { getCreatedBusinesses, saveBusiness } from './catalog.js?v=20261023-4';
export const account = { loading: true, shared: false, businesses: [], error: '' };
const OWNED_KEY = 'raizes:published-ids:v1';
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
  const timer = setTimeout(() => controller.abort(), 12000);
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
  if (account.shared) result = await request('businesses', { method:'POST', body:JSON.stringify({business, images}) });
  else {
    if (account.error && location.hostname.endsWith('.pages.dev')) throw new Error('A publicação compartilhada está indisponível. Tente novamente em instantes.');
    result = saveBusiness(business, images);
    if (!result.ok) throw Object.assign(new Error(result.errors.form || 'Revise os campos indicados.'), { errors:result.errors });
  }
  result.business.localTrackingFailed = !rememberBusiness(result.business.id);
  account.businesses.unshift(result.business);
  return result.business;
}


