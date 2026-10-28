export const CATEGORIES = [
  "Alimentação",
  "Varejo",
  "Saúde e Bem-estar",
  "Serviços",
  "Tecnologia",
  "Educação",
  "Casa e Construção"
];

export const UNITS = [
  "ETEC Abdias do Nascimento — Paraisópolis",
  "ETEC Prof. Adhemar Batista Heméritas — Vila Formosa",
  "ETEC Albert Einstein — Casa Verde",
  "ETEC Prof. Aprígio Gonzaga — Penha",
  "ETEC de Artes — Santana",
  "ETEC Prof. Basílides de Godoy — Vila Leopoldina",
  "ETEC Prof. Camargo Aranha — Mooca",
  "ETEC Carlos de Campos — Brás",
  "ETEC Carolina Carinhato Sampaio — Jardim São Luís",
  "ETEC Cepam — Butantã",
  "ETEC de Cidade Tiradentes — Cidade Tiradentes",
  "ETEC Prof.ª Dr.ª Doroti Quiomi Kanashiro Toyohara — Pirituba",
  "ETEC de Esportes Curt Walter Otto Baumgart — Vila Maria",
  "ETEC Getúlio Vargas — Ipiranga",
  "ETEC Gildo Marçal Bezerra Brandão — Perus",
  "ETEC de Guaianazes — Guaianazes",
  "ETEC Guaracy Silveira — Pinheiros",
  "ETEC de Heliópolis Arquiteto Ruy Ohtake — Heliópolis",
  "ETEC Prof. Horácio Augusto da Silveira — Vila Guilherme",
  "ETEC Irmã Agostina — Capela do Socorro",
  "ETEC de Itaquera — Cohab 2",
  "ETEC Itaquera II — Itaquera",
  "ETEC Jaraguá — Jaraguá",
  "ETEC Jardim Ângela — Jardim Ângela",
  "ETEC Jornalista Roberto Marinho — Brooklin",
  "ETEC José Rocha Mendes — Vila Prudente",
  "ETEC Mandaqui — Mandaqui",
  "ETEC Dra. Maria Augusta Saraiva — Campos Elíseos",
  "ETEC Martin Luther King — Tatuapé",
  "ETEC Parque Belém — Parque Belém",
  "ETEC Parque da Juventude — Santana",
  "ETEC Paulistano — Freguesia do Ó",
  "ETEC Raposo Tavares — Raposo Tavares",
  "ETEC Santa Ifigênia — Santa Ifigênia",
  "ETEC São Mateus — São Mateus",
  "ETEC São Paulo — Bom Retiro",
  "ETEC de Sapopemba — Sapopemba",
  "ETEC Sebrae — Campos Elíseos",
  "ETEC Takashi Morita — Santo Amaro",
  "ETEC Tereza Aparecida Cardoso Nunes de Oliveira — Arthur Alvim",
  "ETEC de Tiquatira — Penha",
  "ETEC Uirapuru — Uirapuru",
  "ETEC de Vila Formosa — Vila Formosa",
  "ETEC da Zona Leste — Cidade A. E. Carvalho"
];

export const BUSINESS_KEY = "raizes:businesses:v1";
export const FAVORITES_KEY = "raizes:favorites:v1";

export function imageCandidates(business, product = null) {
  const result = [], seen = new Set();
  const add = (images, alt) => {
    for (const src of Array.isArray(images) ? images : []) {
      if (typeof src !== 'string' || seen.has(src) || !(/^(?:assets\/[a-z0-9-]+\.(?:png|jpe?g|webp)|api\/imagens\/[a-f0-9-]{36})$/i.test(src) || /^data:image\/(png|jpeg|webp);base64,/i.test(src))) continue;
      seen.add(src); result.push({src,alt});
    }
  };
  if (product) add(product.images, `Foto de ${product.name}, de ${business.name}`);
  add(business.images, business.imageAlt || `Foto de ${business.name}`);
  if (!product) for (const item of Array.isArray(business.products) ? business.products : []) if (item) add(item.images, `Foto de ${item.name}, de ${business.name}`);
  return result;
}

function browserStorage() {
  try { return globalThis.localStorage; }
  catch { return null; }
}

export function normalizeText(value = "") {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

function readArray(storage, key) {
  try {
    const value = JSON.parse(storage?.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function getCreatedBusinesses(storage = browserStorage()) {
  return readArray(storage, BUSINESS_KEY).filter((item) => item &&
    typeof item.id === "string" && typeof item.name === "string" &&
    typeof item.description === "string" && typeof item.student === "string" &&
    typeof item.unit === "string" && typeof item.contact === "string" &&
    CATEGORIES.includes(item.category) && Array.isArray(item.offerings) &&
    item.offerings.every((offering) => typeof offering === "string"));
}

export function getAllBusinesses(storage = browserStorage()) {
  return getCreatedBusinesses(storage).filter(business => !business.demo);
}

export function getFavorites(storage = browserStorage()) {
  return readArray(storage, FAVORITES_KEY).filter((id) => typeof id === "string");
}

export function toggleFavorite(id, storage = browserStorage()) {
  const favorites = new Set(getFavorites(storage));
  if (favorites.has(id)) favorites.delete(id);
  else favorites.add(id);
  storage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
  return favorites.has(id);
}

export function filterBusinesses(businesses, filters = {}) {
  const query = normalizeText(filters.query);
  return businesses.filter((business) => {
    const matchesCategory = !filters.category || business.category === filters.category;
    const matchesUnit = !filters.unit || business.unit === filters.unit;
    const haystack = normalizeText([business.name, business.category, business.description, business.shortDescription, business.student, ...business.offerings].join(" "));
    return matchesCategory && matchesUnit && (!query || haystack.includes(query));
  });
}

export function groupBusinessesByResponsible(businesses) {
  const groups = new Map();
  for (const business of businesses) {
    const key = `${normalizeText(business.student)}::${normalizeText(business.unit)}`;
    if (!groups.has(key)) groups.set(key, { student: business.student, unit: business.unit, businesses: [] });
    groups.get(key).businesses.push(business);
  }
  return [...groups.values()].sort((a, b) => a.student.localeCompare(b.student, 'pt-BR'));
}

export function validateBusiness(values) {
  const errors = {};
  if ((values.name || "").trim().length < 3) errors.name = "Informe o nome da marca com pelo menos 3 caracteres.";
  if (!CATEGORIES.includes(values.category)) errors.category = "Escolha uma categoria.";
  if ((values.description || "").trim().length < 30) errors.description = "Descreva o negócio em pelo menos 30 caracteres.";
  if ((values.offerings || "").trim().length < 3) errors.offerings = "Informe ao menos um produto ou serviço.";
  if ((values.student || "").trim().length < 3) errors.student = "Informe o nome do aluno responsável.";
  if (!UNITS.includes((values.unit || "").trim())) errors.unit = "Escolha uma unidade ETEC da lista.";
  if ((values.contact || "").trim().length < 5) errors.contact = "Informe um contato com pelo menos 5 caracteres.";
  if (values.city !== undefined && (!(values.city || "").trim() || values.city.length > 80)) errors.city = "Informe a cidade de atendimento (até 80 caracteres).";
  if (values.neighborhood !== undefined && (!(values.neighborhood || "").trim() || values.neighborhood.length > 80)) errors.neighborhood = "Informe o bairro de atendimento (até 80 caracteres).";
  if (values.products !== undefined && (!Array.isArray(values.products) || !values.products.length || values.products.length > 12 || values.products.some(p => !p || typeof p.name !== "string" || p.name.trim().length < 2 || p.name.length > 100 || (p.price !== null && (typeof p.price !== "number" || !Number.isFinite(p.price) || p.price < 0 || p.price > 1000000))))) errors.products = "Informe de 1 a 12 produtos com nome e preço válido, ou marque sob consulta.";
  return errors;
}

export function saveBusiness(values, images = [], storage = browserStorage(), existingId = null) {
  const errors = validateBusiness(values);
  if (Object.keys(errors).length) return { ok: false, errors };
  const created = getCreatedBusinesses(storage);
  const existing = existingId ? created.find(b => b.id === existingId) : null;
  if (existingId && !existing) return { ok:false, errors:{form:'Anúncio local não encontrado.'} };
  const business = {
    id: existing?.id || `marca-${globalThis.crypto?.randomUUID?.() || Date.now().toString(36)}`,
    name: values.name.trim(),
    category: values.category,
    description: values.description.trim(),
    shortDescription: values.description.trim().slice(0, 110),
    offerings: values.offerings.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean),
    student: values.student.trim(),
    unit: values.unit.trim(),
    contact: values.contact.trim(),
    city: String(values.city || '').trim(),
    neighborhood: String(values.neighborhood || '').trim(),
    location: values.location || null,
    products: values.products,
    tags: String(values.tags || '').trim(),
    images,
    demo: false,
    featured: false,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  try {
    storage.setItem(BUSINESS_KEY, JSON.stringify([business, ...created.filter(b => b.id !== business.id)]));
    return { ok: true, business };
  } catch {
    return { ok: false, errors: { form: "Não foi possível salvar neste navegador. Tente imagens menores ou libere espaço de armazenamento." } };
  }
}

export function removeLocalBusiness(id, storage = browserStorage()) {
  const businesses = getCreatedBusinesses(storage);
  if (!businesses.some(b => b.id === id)) throw new Error('Anúncio local não encontrado.');
  try { storage.setItem(BUSINESS_KEY, JSON.stringify(businesses.filter(b => b.id !== id))); }
  catch { throw new Error('Não foi possível excluir neste navegador. Tente novamente.'); }
}

