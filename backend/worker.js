import { createRemoteJWKSet, jwtVerify, customFetch } from "jose";
import { validateBusiness } from "../src/catalog.js";
import { approximateLocation, validLocation } from "../src/discovery.js";
import { SCHEMA } from "./schema.js";

const SESSION_COOKIE = "__Host-raizes_session";
const NONCE_COOKIE = "__Host-raizes_nonce";
const WEEK = 7 * 24 * 60 * 60;
const MAX_BODY = 1600000;
const encoder = new TextEncoder();
const hex = bytes => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, "0")).join("");
const token = () => hex(crypto.getRandomValues(new Uint8Array(32)));
const hash = async value => hex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));

function json(data, status = 200, headers = {}) {
  return Response.json(data, { status, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff", "vary": "Cookie", ...headers } });
}
function cookie(name, value, seconds) {
  return `${name}=${value}; Path=/; Max-Age=${seconds}; HttpOnly; Secure; SameSite=Lax`;
}
function getCookie(request, name) {
  return (request.headers.get("cookie") || "").split(";").map(s => s.trim()).find(s => s.startsWith(`${name}=`))?.slice(name.length + 1) || "";
}
async function readBody(request) {
  if (!(request.headers.get("content-type") || "").startsWith("application/json")) throw Object.assign(new Error("Envie os dados em JSON."), { status: 415 });
  const reader = request.body?.getReader();
  if (!reader) throw Object.assign(new Error("Dados ausentes."), { status: 400 });
  const chunks = []; let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_BODY) { await reader.cancel(); throw Object.assign(new Error("As fotos estão muito grandes. Escolha imagens menores."), { status: 413 }); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length); let position = 0;
  for (const part of chunks) { bytes.set(part, position); position += part.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw Object.assign(new Error("Os dados enviados não puderam ser lidos."), { status: 400 }); }
}

function validateImages(images) {
  if (!Array.isArray(images) || images.length > 3) return null;
  const parsed = [];
  for (const image of images) {
    if (typeof image !== "string" || image.length > 500000) return null;
    const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image);
    if (!match) return null;
    let data; try { data = atob(match[2]); } catch { return null; }
    const valid = match[1] === "jpeg" ? data.startsWith("\xff\xd8\xff") : match[1] === "png" ? data.startsWith("\x89PNG\r\n\x1a\n") : data.startsWith("RIFF") && data.slice(8, 12) === "WEBP";
    if (!valid) return null;
    parsed.push({ mime: `image/${match[1]}`, data: match[2] });
  }
  return parsed;
}

export function createWorker({ fetcher = globalThis.fetch, clock = () => Date.now() } = {}) {
  const readyDatabases = new WeakMap();
  const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"), { [customFetch]: fetcher, timeoutDuration: 8000 });
  const now = () => Math.floor(clock() / 1000);
  async function ensureDatabase(db) {
    if (!readyDatabases.has(db)) readyDatabases.set(db, db.exec(SCHEMA).catch(e => { readyDatabases.delete(db); throw e; }));
    await readyDatabases.get(db);
  }
  async function currentUser(request, db) {
    const value = getCookie(request, SESSION_COOKIE);
    if (!/^[a-f0-9]{64}$/.test(value)) return null;
    return db.prepare("SELECT users.id, users.email, users.name FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?").bind(await hash(value), now()).first();
  }
  function authConfigured(env) { return Boolean(env.DB && /^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(env.GOOGLE_CLIENT_ID || "")); }
  async function withImages(rows, db) {
    if (!rows.length) return [];
    const ids = rows.map(row => row.id);
    const images = [];
    for (let start = 0; start < ids.length; start += 80) {
      const chunk = ids.slice(start, start + 80);
      const result = await db.prepare(`SELECT id, business_id FROM business_images WHERE business_id IN (${chunk.map(() => "?").join(",")}) ORDER BY position`).bind(...chunk).all();
      images.push(...result.results);
    }
    return rows.map(row => ({ ...JSON.parse(row.data), ownerId: row.owner_id, images: images.filter(image => image.business_id === row.id).map(image => `api/imagens/${image.id}`), shared: true }));
  }

  return {
    async fetch(request, env) {
      const url = new URL(request.url), route = url.pathname;
      if (!route.startsWith("/api/")) return env.ASSETS.fetch(request);
      try {
        if (!["GET", "POST", "DELETE"].includes(request.method)) return json({ error: "Método não permitido." }, 405);
        if (request.method !== "GET" && (request.headers.get("origin") !== url.origin || request.headers.get("x-raizes-request") !== "1")) return json({ error: "A solicitação deve partir do próprio site." }, 403);
        if (route === "/api/session" && !env.DB) return json({ user: null, authReady: false, clientId: null, shared: false });
        if (!env.DB) return json({ error: "O armazenamento compartilhado ainda está em configuração.", code: "NOT_CONFIGURED" }, 503);
        await ensureDatabase(env.DB);

        if (route === "/api/session" && request.method === "GET") return json({ user: await currentUser(request, env.DB), authReady: authConfigured(env), clientId: authConfigured(env) ? env.GOOGLE_CLIENT_ID : null, shared: true });

        if (route === "/api/auth/challenge" && request.method === "GET") {
          if (!authConfigured(env)) return json({ error: "O login com Google ainda está em configuração." }, 503);
          const nonce = token();
          await env.DB.batch([
            env.DB.prepare("DELETE FROM login_nonces WHERE expires_at < ?").bind(now()),
            env.DB.prepare("INSERT INTO login_nonces (nonce_hash, expires_at) VALUES (?, ?)").bind(await hash(nonce), now() + 600)
          ]);
          return json({ nonce }, 200, { "set-cookie": cookie(NONCE_COOKIE, nonce, 600) });
        }

        if (route === "/api/auth/google" && request.method === "POST") {
          if (!authConfigured(env)) return json({ error: "O login com Google ainda está em configuração." }, 503);
          const body = await readBody(request), nonce = getCookie(request, NONCE_COOKIE);
          if (typeof body?.credential !== "string" || body.credential.length > 16000 || !/^[a-f0-9]{64}$/.test(nonce)) return json({ error: "Reabra o login e tente novamente." }, 401);
          let payload;
          try {
            ({ payload } = await jwtVerify(body.credential, googleKeys, { algorithms: ["RS256"], issuer: ["accounts.google.com", "https://accounts.google.com"], audience: env.GOOGLE_CLIENT_ID, requiredClaims: ["sub", "exp", "iat", "email", "email_verified", "nonce"], maxTokenAge: "1h", currentDate: new Date(clock()) }));
          } catch { return json({ error: "O Google não confirmou este login. Tente novamente." }, 401); }
          if (payload.nonce !== nonce || payload.email_verified !== true || typeof payload.sub !== "string" || payload.sub.length > 255 || typeof payload.email !== "string" || payload.email.length > 254) return json({ error: "Não foi possível confirmar sua conta Google." }, 401);
          const challenge = await env.DB.prepare("DELETE FROM login_nonces WHERE nonce_hash = ? AND expires_at > ? RETURNING nonce_hash").bind(await hash(nonce), now()).first();
          if (!challenge) return json({ error: "O login expirou. Reabra a tela e tente novamente." }, 401);
          const userId = crypto.randomUUID();
          await env.DB.prepare("INSERT INTO users (id, google_sub, email, name, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(google_sub) DO UPDATE SET email = excluded.email, name = excluded.name").bind(userId, payload.sub, payload.email, String(payload.name || payload.email.split("@")[0]).slice(0, 100), now()).run();
          const user = await env.DB.prepare("SELECT id, email, name FROM users WHERE google_sub = ?").bind(payload.sub).first();
          const session = token();
          await env.DB.batch([
            env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(now()),
            env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").bind(await hash(session), user.id, now() + WEEK)
          ]);
          const response = json({ user });
          response.headers.append("set-cookie", cookie(SESSION_COOKIE, session, WEEK));
          response.headers.append("set-cookie", cookie(NONCE_COOKIE, "", 0));
          return response;
        }

        if (route === "/api/auth/logout" && request.method === "POST") {
          const session = getCookie(request, SESSION_COOKIE);
          if (session) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await hash(session)).run();
          return json({ ok: true }, 200, { "set-cookie": cookie(SESSION_COOKIE, "", 0) });
        }

        if ((route === "/api/businesses" || route === "/api/my-businesses") && request.method === "GET") {
          let result;
          if (route === "/api/my-businesses") {
            const user = await currentUser(request, env.DB);
            if (!user) return json({ error: "Entre com sua conta Google." }, 401);
            result = await env.DB.prepare("SELECT id, owner_id, data FROM businesses WHERE owner_id = ? ORDER BY created_at DESC LIMIT 100").bind(user.id).all();
          } else result = await env.DB.prepare("SELECT id, owner_id, data FROM businesses ORDER BY created_at DESC LIMIT 300").all();
          return json({ businesses: await withImages(result.results, env.DB), limit: route === "/api/my-businesses" ? 100 : 300 });
        }

        if (route === "/api/businesses" && request.method === "POST") {
          const user = await currentUser(request, env.DB);
          if (!user) return json({ error: "Entre com sua conta Google para divulgar sua marca." }, 401);
          const body = await readBody(request), values = body?.business;
          if (!values || typeof values !== "object" || ["name", "category", "description", "student", "unit", "contact", "city", "neighborhood"].some(key => typeof values[key] !== "string")) return json({ error: "Revise as informações do negócio." }, 400);
          values.offerings = Array.isArray(values.products) ? values.products.map(p => p?.name || "").join("\n") : "";
          const errors = validateBusiness(values);
          if (values.name.length > 80 || values.description.length > 600 || values.student.length > 90 || values.contact.length > 140 || String(values.tags || "").length > 160) errors.form = "Algum campo ultrapassou o tamanho permitido.";
          if (values.location !== null && values.location !== undefined && !validLocation(values.location)) errors.location = "A localização é inválida. Informe novamente a região de atendimento.";
          const images = validateImages(body.images || []);
          if (!images) errors.images = "Use até 3 fotos JPG, PNG ou WebP menores que 375 KB cada.";
          if (Object.keys(errors).length) return json({ error: "Revise os campos indicados.", errors }, 400);
          const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM businesses WHERE owner_id = ?").bind(user.id).first();
          if (count.total >= 20) return json({ error: "Esta conta atingiu o limite de 20 marcas." }, 409);
          const id = crypto.randomUUID();
          const business = { id, name: values.name.trim(), category: values.category, description: values.description.trim(), shortDescription: values.description.trim().slice(0, 110), student: values.student.trim(), unit: values.unit, contact: values.contact.trim(), city: values.city.trim(), neighborhood: values.neighborhood.trim(), tags: String(values.tags || "").trim(), location: approximateLocation(values.location), products: values.products.map(p => ({ name: p.name.trim(), price: p.price })), offerings: values.products.map(p => p.name.trim()), demo: false, shared: true, featured: false, createdAt: new Date(clock()).toISOString() };
          const statements = [env.DB.prepare("INSERT INTO businesses (id, owner_id, data, created_at) VALUES (?, ?, ?, ?)").bind(id, user.id, JSON.stringify(business), now())];
          const imageIds = images.map(() => crypto.randomUUID());
          images.forEach((image, i) => statements.push(env.DB.prepare("INSERT INTO business_images (id, business_id, position, mime, data) VALUES (?, ?, ?, ?, ?)").bind(imageIds[i], id, i, image.mime, image.data)));
          await env.DB.batch(statements);
          return json({ business: { ...business, ownerId: user.id, images: imageIds.map(image => `api/imagens/${image}`) } }, 201);
        }

        const imageMatch = /^\/api\/imagens\/([a-f0-9-]{36})$/.exec(route);
        if (imageMatch && request.method === "GET") {
          const image = await env.DB.prepare("SELECT mime, data FROM business_images WHERE id = ?").bind(imageMatch[1]).first();
          if (!image) return json({ error: "Imagem não encontrada." }, 404);
          return new Response(Uint8Array.from(atob(image.data), char => char.charCodeAt(0)), { headers: { "content-type": image.mime, "cache-control": "public, max-age=86400", "x-content-type-options": "nosniff" } });
        }
        return json({ error: "Página não encontrada." }, 404);
      } catch (error) {
        return json({ error: error.status ? error.message : "O serviço está temporariamente indisponível. Tente novamente em instantes." }, error.status || 503);
      }
    }
  };
}

export default createWorker();
