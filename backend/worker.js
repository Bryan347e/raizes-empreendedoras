import { validateBusiness } from "../src/catalog.js";
import { approximateLocation, validLocation } from "../src/discovery.js";
import { SCHEMA } from "./schema.js";

const MAX_BODY = 1600000;
const encoder = new TextEncoder();
const hex = bytes => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, "0")).join("");
const hash = async value => hex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));

function json(data, status = 200, headers = {}) {
  return Response.json(data, { status, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff", "vary": "Cookie", ...headers } });
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

export function createWorker({ clock = () => Date.now() } = {}) {
  const readyDatabases = new WeakMap();
  const now = () => Math.floor(clock() / 1000);
  async function ensureDatabase(db) {
    if (!readyDatabases.has(db)) readyDatabases.set(db, db.exec(SCHEMA).catch(e => { readyDatabases.delete(db); throw e; }));
    await readyDatabases.get(db);
  }
  async function withImages(rows, db) {
    if (!rows.length) return [];
    const ids = rows.map(row => row.id);
    const images = [];
    for (let start = 0; start < ids.length; start += 40) {
      const chunk = ids.slice(start, start + 40);
      const result = await db.prepare(`SELECT id, business_id, position FROM public_business_images WHERE business_id IN (${chunk.map(() => "?").join(",")}) UNION ALL SELECT id, business_id, position FROM business_images WHERE business_id IN (${chunk.map(() => "?").join(",")}) ORDER BY position`).bind(...chunk, ...chunk).all();
      images.push(...result.results);
    }
    return rows.map(row => ({ ...JSON.parse(row.data), images: images.filter(image => image.business_id === row.id).map(image => `api/imagens/${image.id}`), shared: true }));
  }

  return {
    async fetch(request, env) {
      const url = new URL(request.url), route = url.pathname;
      if (!route.startsWith("/api/")) return env.ASSETS.fetch(request);
      try {
        if (!["GET", "POST"].includes(request.method)) return json({ error: "Método não permitido." }, 405);
        if (request.method !== "GET" && (request.headers.get("origin") !== url.origin || request.headers.get("x-raizes-request") !== "1")) return json({ error: "A solicitação deve partir do próprio site." }, 403);
        if (route === "/api/session" && !env.DB) return json({ shared: false });
        if (!env.DB) return json({ error: "O armazenamento compartilhado ainda está em configuração.", code: "NOT_CONFIGURED" }, 503);
        await ensureDatabase(env.DB);

        if (route === "/api/session" && request.method === "GET") return json({ shared: true });
        if (route === "/api/businesses" && request.method === "GET") {
          let result;
          if (url.searchParams.has('ids')) {
            const ids = [...new Set(url.searchParams.get('ids').split(','))];
            if (!ids.length || ids.length > 40 || ids.some(id => !/^[a-f0-9-]{36}$/i.test(id))) return json({ error: 'A lista de anúncios é inválida.' }, 400);
            const slots = ids.map(() => '?').join(',');
            result = await env.DB.prepare(`SELECT id, data, created_at FROM public_businesses WHERE id IN (${slots}) UNION ALL SELECT id, data, created_at FROM businesses WHERE id IN (${slots}) ORDER BY created_at DESC`).bind(...ids, ...ids).all();
          } else result = await env.DB.prepare("SELECT id, data, created_at FROM public_businesses UNION ALL SELECT id, data, created_at FROM businesses ORDER BY created_at DESC LIMIT 300").all();
          return json({ businesses: await withImages(result.results, env.DB), limit: 300 });
        }

        if (route === "/api/businesses" && request.method === "POST") {
          const body = await readBody(request), values = body?.business;
          if (!values || typeof values !== "object" || ["name", "category", "description", "student", "unit", "contact", "city", "neighborhood"].some(key => typeof values[key] !== "string")) return json({ error: "Revise as informações do negócio." }, 400);
          values.offerings = Array.isArray(values.products) ? values.products.map(p => p?.name || "").join("\n") : "";
          const errors = validateBusiness(values);
          if (values.name.length > 80 || values.description.length > 600 || values.student.length > 90 || values.contact.length > 140 || String(values.tags || "").length > 160) errors.form = "Algum campo ultrapassou o tamanho permitido.";
          if (values.location !== null && values.location !== undefined && !validLocation(values.location)) errors.location = "A localização é inválida. Informe novamente a região de atendimento.";
          const images = validateImages(body.images || []);
          if (!images) errors.images = "Use até 3 fotos JPG, PNG ou WebP menores que 375 KB cada.";
          if (Object.keys(errors).length) return json({ error: "Revise os campos indicados.", errors }, 400);
          // Public create-only submission: a declared name grants no identity or permissions.
          // A daily network hash limits abuse; no account, login email or session is created.
          const ip = request.headers.get("cf-connecting-ip");
          if (ip) {
            const bucket = await hash(`${Math.floor(now() / 86400)}:${ip}`);
            const allowed = await env.DB.prepare("INSERT INTO publication_limits (bucket, total, expires_at) VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET total = total + 1 WHERE total < 30 RETURNING total").bind(bucket, now() + 86400).first();
            if (!allowed) return json({ error: "Este acesso atingiu o limite diário de publicações. Tente novamente amanhã." }, 429);
          }
          const id = crypto.randomUUID();
          const business = { id, name: values.name.trim(), category: values.category, description: values.description.trim(), shortDescription: values.description.trim().slice(0, 110), student: values.student.trim(), unit: values.unit, contact: values.contact.trim(), city: values.city.trim(), neighborhood: values.neighborhood.trim(), tags: String(values.tags || "").trim(), location: approximateLocation(values.location), products: values.products.map(p => ({ name: p.name.trim(), price: p.price })), offerings: values.products.map(p => p.name.trim()), demo: false, shared: true, featured: false, createdAt: new Date(clock()).toISOString() };
          const statements = [env.DB.prepare("INSERT INTO public_businesses (id, data, created_at) VALUES (?, ?, ?)").bind(id, JSON.stringify(business), now())];
          const imageIds = images.map(() => crypto.randomUUID());
          images.forEach((image, i) => statements.push(env.DB.prepare("INSERT INTO public_business_images (id, business_id, position, mime, data) VALUES (?, ?, ?, ?, ?)").bind(imageIds[i], id, i, image.mime, image.data)));
          statements.push(env.DB.prepare("DELETE FROM publication_limits WHERE expires_at < ?").bind(now()));
          await env.DB.batch(statements);
          return json({ business: { ...business, images: imageIds.map(image => `api/imagens/${image}`) } }, 201);
        }

        const imageMatch = /^\/api\/imagens\/([a-f0-9-]{36})$/.exec(route);
        if (imageMatch && request.method === "GET") {
          const image = await env.DB.prepare("SELECT mime, data FROM public_business_images WHERE id = ? UNION ALL SELECT mime, data FROM business_images WHERE id = ? LIMIT 1").bind(imageMatch[1], imageMatch[1]).first();
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

