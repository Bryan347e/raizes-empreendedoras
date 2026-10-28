import { validateBusiness } from "../src/catalog.js";
import { approximateLocation, validLocation } from "../src/discovery.js";
import { SCHEMA } from "./schema.js";

const MAX_BODY = 20000000; // Up to 3 business photos + 3 per product (12 products).
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
    const productImages = [];
    for (let start = 0; start < ids.length; start += 40) {
      const chunk = ids.slice(start, start + 40);
      const result = await db.prepare(`SELECT id, business_id, product_index, position FROM product_images WHERE business_id IN (${chunk.map(() => '?').join(',')}) ORDER BY product_index, position`).bind(...chunk).all();
      productImages.push(...result.results);
    }
    return rows.map(row => {
      const business = JSON.parse(row.data);
      return { ...business, images: images.filter(image => image.business_id === row.id).map(image => `api/imagens/${image.id}`), products: business.products?.map((p, index) => ({ ...p, images: productImages.filter(image => image.business_id === row.id && image.product_index === index).map(image => `api/imagens/${image.id}`) })), shared: true };
    });
  }

  return {
    async fetch(request, env) {
      const url = new URL(request.url), route = url.pathname;
      if (!route.startsWith("/api/")) return env.ASSETS.fetch(request);
      try {
        const deletion = /^\/api\/businesses\/([a-f0-9-]{36})$/.exec(route);
        const access = /^\/api\/businesses\/([a-f0-9-]{36})\/access$/.exec(route);
        const editing = deletion && request.method === 'PUT';
        if (!["GET", "POST"].includes(request.method) && !(deletion && ['DELETE','PUT'].includes(request.method))) return json({ error: "Método não permitido." }, 405);
        if (request.method !== "GET" && (request.headers.get("origin") !== url.origin || request.headers.get("x-raizes-request") !== "1")) return json({ error: "A solicitação deve partir do próprio site." }, 403);
        if (route === "/api/session" && !env.DB) return json({ shared: false });
        if (!env.DB) return json({ error: "O armazenamento compartilhado ainda está em configuração.", code: "NOT_CONFIGURED" }, 503);
        await ensureDatabase(env.DB);

        if (route === "/api/session" && request.method === "GET") return json({ shared: true });
        if ((access && request.method === 'POST') || editing) {
          const id = access ? access[1] : deletion[1], token = request.headers.get('x-raizes-management') || '';
          if (!/^[a-f0-9]{64}$/.test(token)) return json({error:'Informe o código privado do anúncio para recuperar ou editar o acesso.'},403);
          const permitted = await env.DB.prepare('SELECT business_id FROM business_management WHERE business_id = ? AND token_hash = ?').bind(id,await hash(token)).first();
          if (!permitted) return json({error:'Código inválido, anúncio excluído ou acesso indisponível. Confira o código privado completo.'},403);
          if (access) {
            const row = await env.DB.prepare('SELECT id, data, created_at FROM public_businesses WHERE id = ?').bind(id).first();
            if (!row) return json({error:'Anúncio não encontrado.'},404);
            return json({business:(await withImages([row],env.DB))[0]});
          }
        }
        if (deletion && request.method === 'DELETE') {
          const token = request.headers.get('x-raizes-management') || '';
          if (!/^[a-f0-9]{64}$/.test(token)) return json({ error: 'A chave de exclusão não está disponível neste navegador.' }, 403);
          const tokenHash = await hash(token);
          const permitted = await env.DB.prepare('SELECT business_id FROM business_management WHERE business_id = ? AND token_hash = ?').bind(deletion[1], tokenHash).first();
          if (!permitted) return json({ error: 'Este navegador não tem a chave para excluir este anúncio.' }, 403);
          await env.DB.batch([
            env.DB.prepare('DELETE FROM product_images WHERE business_id = ?').bind(deletion[1]),
            env.DB.prepare('DELETE FROM public_business_images WHERE business_id = ?').bind(deletion[1]),
            env.DB.prepare('DELETE FROM business_management WHERE business_id = ? AND token_hash = ?').bind(deletion[1], tokenHash),
            env.DB.prepare('DELETE FROM public_businesses WHERE id = ?').bind(deletion[1])
          ]);
          return json({ deleted: true });
        }
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

        if ((route === "/api/businesses" && request.method === "POST") || editing) {
          const body = await readBody(request), values = body?.business;
          if (!body || typeof body !== 'object' || Array.isArray(body)) return json({error:'Revise as informações do anúncio.'},400);
          const editingRow = editing ? await env.DB.prepare('SELECT id, data, created_at FROM public_businesses WHERE id = ?').bind(deletion[1]).first() : null;
          if (editing && !editingRow) return json({error:'Anúncio não encontrado.'},404);
          if (!editing && body.businessId !== undefined) {
            if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(body.businessId) || !/^[a-f0-9]{64}$/.test(body.managementToken || '')) return json({error:'O comprovante de publicação é inválido.'},400);
            const existing = await env.DB.prepare('SELECT id, data, created_at FROM public_businesses WHERE id = ?').bind(body.businessId).first();
            if (existing) {
              const permitted = await env.DB.prepare('SELECT business_id FROM business_management WHERE business_id = ? AND token_hash = ?').bind(body.businessId,await hash(body.managementToken)).first();
              if (!permitted) return json({error:'Este identificador já pertence a outro anúncio.'},409);
              return json({business:(await withImages([existing],env.DB))[0]},200);
            }
          }
          if (!values || typeof values !== "object" || ["name", "category", "description", "student", "unit", "contact", "city", "neighborhood"].some(key => typeof values[key] !== "string")) return json({ error: "Revise as informações do negócio." }, 400);
          values.offerings = Array.isArray(values.products) ? values.products.map(p => p?.name || "").join("\n") : "";
          const errors = validateBusiness(values);
          if (values.name.length > 80 || values.description.length > 600 || values.student.length > 90 || values.contact.length > 140 || String(values.tags || "").length > 160) errors.form = "Algum campo ultrapassou o tamanho permitido.";
          if (values.location !== null && values.location !== undefined && !validLocation(values.location)) errors.location = "A localização é inválida. Informe novamente a região de atendimento.";
          const storedPhotos = editing ? (await env.DB.prepare('SELECT id, mime, data FROM public_business_images WHERE business_id = ? UNION ALL SELECT id, mime, data FROM product_images WHERE business_id = ?').bind(deletion[1],deletion[1]).all()).results : [];
          const parsePhotos = sources => {
            if (!Array.isArray(sources) || sources.length > 3) return null;
            const result = [];
            for (const source of sources) {
              const reference = typeof source === 'string' && /^api\/imagens\/([a-f0-9-]{36})$/.exec(source);
              const saved = reference && storedPhotos.find(photo => photo.id === reference[1]);
              if (saved) result.push({mime:saved.mime,data:saved.data});
              else { const photos = validateImages([source]); if (!photos) return null; result.push(photos[0]); }
            }
            return result;
          };
          const images = parsePhotos(body.images || []);
          if (!images) errors.images = "Use até 3 fotos JPG, PNG ou WebP menores que 375 KB cada.";
          const productImages = Array.isArray(values.products) ? values.products.map(p => parsePhotos(p?.images ?? [])) : [];
          if (productImages.some(images => !images)) errors.products = 'Cada produto pode ter até 3 fotos JPG, PNG ou WebP menores que 375 KB cada.';
          if (body.managementToken !== undefined && !/^[a-f0-9]{64}$/.test(body.managementToken)) errors.form = 'A chave de exclusão é inválida. Atualize a página e tente novamente.';
          if (Object.keys(errors).length) return json({ error: "Revise os campos indicados.", errors }, 400);
          // A declared name grants no identity or permissions; mutations require the private key.
          // A daily network hash limits abuse; no account, login email or session is created.
          const ip = request.headers.get("cf-connecting-ip");
          if (ip) {
            const bucket = await hash(`${Math.floor(now() / 86400)}:${ip}`);
            const allowed = await env.DB.prepare("INSERT INTO publication_limits (bucket, total, expires_at) VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET total = total + 1 WHERE total < 30 RETURNING total").bind(bucket, now() + 86400).first();
            if (!allowed) return json({ error: "Este acesso atingiu o limite diário de publicações. Tente novamente amanhã." }, 429);
          }
          const id = editing ? deletion[1] : body.businessId || crypto.randomUUID();
          const business = { id, name: values.name.trim(), category: values.category, description: values.description.trim(), shortDescription: values.description.trim().slice(0, 110), student: values.student.trim(), unit: values.unit, contact: values.contact.trim(), city: values.city.trim(), neighborhood: values.neighborhood.trim(), tags: String(values.tags || "").trim(), location: approximateLocation(values.location), products: values.products.map(p => ({ name: p.name.trim(), price: p.price })), offerings: values.products.map(p => p.name.trim()), demo: false, shared: true, featured: false, createdAt: new Date(clock()).toISOString() };
          if (editingRow) { business.createdAt=JSON.parse(editingRow.data).createdAt; business.updatedAt=new Date(clock()).toISOString(); }
          const statements = editing ? [
            env.DB.prepare('UPDATE public_businesses SET data = ? WHERE id = ?').bind(JSON.stringify(business),id),
            env.DB.prepare('DELETE FROM public_business_images WHERE business_id = ?').bind(id),
            env.DB.prepare('DELETE FROM product_images WHERE business_id = ?').bind(id)
          ] : [env.DB.prepare("INSERT INTO public_businesses (id, data, created_at) VALUES (?, ?, ?)").bind(id, JSON.stringify(business), now())];
          if (!editing && body.managementToken) statements.push(env.DB.prepare('INSERT INTO business_management (business_id, token_hash) VALUES (?, ?)').bind(id, await hash(body.managementToken)));
          const imageIds = images.map(() => crypto.randomUUID());
          images.forEach((image, i) => statements.push(env.DB.prepare("INSERT INTO public_business_images (id, business_id, position, mime, data) VALUES (?, ?, ?, ?, ?)").bind(imageIds[i], id, i, image.mime, image.data)));
          const productImageIds = productImages.map((photos, productIndex) => photos.map((image, position) => {
            const imageId = crypto.randomUUID();
            statements.push(env.DB.prepare('INSERT INTO product_images (id, business_id, product_index, position, mime, data) VALUES (?, ?, ?, ?, ?, ?)').bind(imageId, id, productIndex, position, image.mime, image.data));
            return `api/imagens/${imageId}`;
          }));
          statements.push(env.DB.prepare("DELETE FROM publication_limits WHERE expires_at < ?").bind(now()));
          await env.DB.batch(statements);
          return json({ business: { ...business, images: imageIds.map(image => `api/imagens/${image}`), products: business.products.map((product, index) => ({ ...product, images: productImageIds[index] })) } }, editing ? 200 : 201);
        }

        const imageMatch = /^\/api\/imagens\/([a-f0-9-]{36})$/.exec(route);
        if (imageMatch && request.method === "GET") {
          const image = await env.DB.prepare("SELECT mime, data FROM public_business_images WHERE id = ? UNION ALL SELECT mime, data FROM business_images WHERE id = ? UNION ALL SELECT mime, data FROM product_images WHERE id = ? LIMIT 1").bind(imageMatch[1], imageMatch[1], imageMatch[1]).first();
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

