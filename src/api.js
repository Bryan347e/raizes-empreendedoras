import { getCreatedBusinesses, saveBusiness, removeLocalBusiness, getFavorites, toggleFavorite } from './catalog.js?v=20261029-1';
export const account = { loading: true, shared: false, businesses: [], error: '' };
const OWNED_KEY = 'raizes:published-ids:v1';
const MANAGEMENT_KEY = 'raizes:management-keys:v1';
const activeKeys = new Map();
const validId = id => /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id);
const validToken = token => typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);
export function managementKeys(storage) {
  let keys = {};
  try { const saved = JSON.parse((storage || globalThis.localStorage).getItem(MANAGEMENT_KEY) || '{}'); if (saved && typeof saved === 'object' && !Array.isArray(saved)) keys = saved; } catch {}
  if (!storage) keys = { ...keys, ...Object.fromEntries(activeKeys) };
  return Object.fromEntries(Object.entries(keys).filter(([id, token]) => validId(id) && validToken(token)));
}
export function canDeleteBusiness(business, storage) {
  if (business.demo) return false;
  return business.shared ? validToken(managementKeys(storage)[business.id]) : getCreatedBusinesses(storage).some(b => b.id === business.id);
}
export function ownedBusinessIds(storage) {
  let ids = [];
  try { const saved = JSON.parse((storage || globalThis.localStorage).getItem(OWNED_KEY) || '[]'); if (Array.isArray(saved)) ids = saved.filter(id => typeof id === 'string'); } catch {}
  return [...new Set([...ids, ...Object.keys(managementKeys(storage))])];
}
// A second browser store keeps individual access keys if the ID list or localStorage fails.
function backupAction(mode, operation) {
  return new Promise(resolve => {
    let db, done = false;
    const finish = value => { if (done) return; done = true; clearTimeout(timer); db?.close(); resolve(value); };
    const timer = setTimeout(() => finish(null), 2500);
    try {
      if (!globalThis.indexedDB) { finish(null); return; }
      const open = indexedDB.open('raizes-access-v1', 1);
      open.onupgradeneeded = () => { if (!open.result.objectStoreNames.contains('keys')) open.result.createObjectStore('keys', { keyPath:'id' }); };
      open.onerror = () => finish(null);
      open.onsuccess = () => {
        db = open.result; if (done) { db.close(); return; }
        const tx = db.transaction('keys', mode), store = tx.objectStore('keys');
        let result = true;
        const request = operation(store);
        if (request) request.onsuccess = () => { result = request.result; };
        tx.oncomplete = () => finish(result);
        tx.onerror = tx.onabort = () => finish(null);
      };
    } catch { finish(null); }
  });
}
async function saveAccess(id, token) {
  activeKeys.set(id, token);
  let local = false;
  try {
    localStorage.setItem(MANAGEMENT_KEY, JSON.stringify(managementKeys()));
    local = JSON.parse(localStorage.getItem(MANAGEMENT_KEY) || '{}')[id] === token;
    localStorage.setItem(OWNED_KEY, JSON.stringify(ownedBusinessIds()));
  } catch {}
  const backup = await backupAction('readwrite', store => { store.put({id,token}); });
  return local || backup === true;
}
export function recoveryCode(business) {
  const token = managementKeys()[business.id];
  return business.shared && validToken(token) ? `raizes1.${business.id}.${token}` : '';
}
async function request(path, options = {}) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 60000);
  try {
    const response = await fetch(`api/${path}`, { credentials:'omit', ...options, signal:controller.signal, headers:{ ...(options.body ? {'content-type':'application/json','x-raizes-request':'1'} : {}), ...options.headers } });
    if (!(response.headers.get('content-type') || '').includes('application/json')) throw new Error('A vitrine compartilhada está disponível no novo endereço público.');
    const body = await response.json();
    if (!response.ok) throw Object.assign(new Error(body.error || 'Não foi possível completar a solicitação.'), { errors:body.errors, status:response.status });
    return body;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('A conexão demorou demais. Confira sua internet e tente novamente. Se enviou uma publicação, confira Minhas lojas antes de tentar de novo.');
    throw error;
  } finally { clearTimeout(timer); }
}
function upsert(business) {
  account.businesses = [business, ...account.businesses.filter(b => b.id !== business.id)];
  return business;
}
export async function restoreAccess(code) {
  const match = /^raizes1\.([a-f0-9-]{36})\.([a-f0-9]{64})$/.exec(String(code).trim());
  if (!match || !validId(match[1])) throw new Error('Cole o código privado completo, começando por raizes1.');
  const result = await request(`businesses/${match[1]}/access`, { method:'POST', headers:{'x-raizes-request':'1','x-raizes-management':match[2]} });
  if (!await saveAccess(match[1], match[2])) throw new Error('O código é válido, mas este navegador não conseguiu guardar o acesso. Libere o armazenamento do site e tente novamente.');
  return upsert(result.business);
}
export async function loadAccount() {
  account.loading = true; account.error = '';
  try {
    const backups = await backupAction('readonly', store => store.getAll());
    for (const record of Array.isArray(backups) ? backups : []) if (validId(record.id) && validToken(record.token) && !managementKeys()[record.id]) activeKeys.set(record.id, record.token);
    const localKeys = managementKeys();
    if (Object.keys(localKeys).length) await backupAction('readwrite', store => { for (const [id,token] of Object.entries(localKeys)) store.put({id,token}); });
    const session = await request('session');
    account.shared = session.shared === true;
    account.businesses = account.shared ? (await request('businesses')).businesses : getCreatedBusinesses();
    if (account.shared) {
      const known = new Set(account.businesses.map(b => b.id));
      const missing = ownedBusinessIds().filter(id => validId(id) && !known.has(id));
      for (let start=0; start<missing.length; start+=40) {
        const extra = await request(`businesses?ids=${missing.slice(start,start+40).join(',')}`);
        account.businesses.push(...extra.businesses);
      }
    }
  } catch (error) { account.error = error.message; }
  account.loading = false;
  return account;
}
export async function publishBusiness(business, images, editingId = null) {
  if (account.loading) throw new Error('Aguarde a conexão com a vitrine antes de salvar. Seus dados continuam no formulário.');
  const requiresShared = globalThis.location?.hostname === 'raizes-empreendedoras.pages.dev';
  if (!account.shared && requiresShared) throw new Error('A vitrine pública está indisponível. Seus dados continuam no formulário; tente novamente em instantes.');
  if (editingId && !canDeleteBusiness({id:editingId,shared:account.shared})) throw new Error('Este navegador não tem o acesso para editar este anúncio. Recupere-o com seu código privado.');
  let result;
  if (account.shared) {
    const id = editingId || crypto.randomUUID();
    const token = editingId ? managementKeys()[id] : [...crypto.getRandomValues(new Uint8Array(32))].map(b=>b.toString(16).padStart(2,'0')).join('');
    if (!await saveAccess(id, token)) { activeKeys.delete(id); throw new Error('Permita o armazenamento do site neste navegador para guardar o acesso ao seu anúncio antes de publicar.'); }
    result = await request(editingId ? `businesses/${id}` : 'businesses', { method:editingId?'PUT':'POST', headers:editingId?{'x-raizes-management':token}:{}, body:JSON.stringify({business,images,businessId:id,managementToken:token}) });
    result.business.localTrackingFailed = !await saveAccess(result.business.id, token);
  } else {
    result = saveBusiness(business, images, undefined, editingId);
    if (!result.ok) throw Object.assign(new Error(result.errors.form || 'Revise os campos indicados.'), {errors:result.errors});
    try { localStorage.setItem(OWNED_KEY,JSON.stringify([...new Set([...ownedBusinessIds(),result.business.id])])); } catch { result.business.localTrackingFailed=true; }
  }
  return upsert(result.business);
}
export async function deleteBusiness(business) {
  if (!canDeleteBusiness(business)) throw new Error('Este navegador não tem o acesso para excluir este anúncio.');
  if (business.shared) await request(`businesses/${business.id}`, { method:'DELETE', headers:{'x-raizes-request':'1','x-raizes-management':managementKeys()[business.id]} });
  else removeLocalBusiness(business.id);
  account.businesses = account.businesses.filter(b=>b.id!==business.id);
  activeKeys.delete(business.id);
  try {
    const keys=managementKeys(); delete keys[business.id]; localStorage.setItem(MANAGEMENT_KEY,JSON.stringify(keys));
    localStorage.setItem(OWNED_KEY,JSON.stringify(ownedBusinessIds().filter(id=>id!==business.id)));
    if (getFavorites().includes(business.id)) toggleFavorite(business.id);
  } catch {}
  await backupAction('readwrite',store=>{store.delete(business.id);});
}
