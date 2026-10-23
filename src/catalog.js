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

export const DEMO_BUSINESSES = [
  {
    id: "raiz-brownie",
    name: "Raiz Brownie",
    category: "Alimentação",
    description: "Brownies artesanais preparados em pequenos lotes, com sabores clássicos e receitas sazonais para encontros e comemorações.",
    shortDescription: "Brownies artesanais feitos em pequenos lotes.",
    offerings: ["Brownie tradicional", "Brownie com castanhas", "Caixas para presentear"],
    student: "Maria Clara Santos",
    unit: "ETEC Parque da Juventude — Santana",
    contact: "Contato demonstrativo, sem canal ativo",
    images: ["assets/brownies.png"],
    imageAlt: "Brownies artesanais em uma mesa de café",
    demo: true,
    featured: true
  },
  {
    id: "fio-novo",
    name: "Fio Novo",
    category: "Varejo",
    description: "Peças de roupa garimpadas e customizadas para quem gosta de vestir histórias novas com menos desperdício.",
    shortDescription: "Moda circular com peças garimpadas e customizadas.",
    offerings: ["Roupas selecionadas", "Customização de peças", "Acessórios"],
    student: "Júlia Alves",
    unit: "ETEC Guaracy Silveira — Pinheiros",
    contact: "Contato demonstrativo, sem canal ativo",
    images: ["assets/moda.png"],
    imageAlt: "Roupas selecionadas em uma arara de moda autoral",
    demo: true,
    featured: true
  },
  {
    id: "aurora-studio",
    name: "Aurora Studio",
    category: "Serviços",
    description: "Design para marcas que estão começando: identidade visual, peças digitais e apresentações feitas com atenção a cada projeto.",
    shortDescription: "Identidade visual e peças digitais para pequenos negócios.",
    offerings: ["Identidade visual", "Artes para divulgação", "Apresentações"],
    student: "Lucas Ferreira",
    unit: "ETEC de Artes — Santana",
    contact: "Contato demonstrativo, sem canal ativo",
    images: ["assets/design.png"],
    imageAlt: "Mesa de trabalho com materiais de criação visual",
    demo: true,
    featured: true
  },
  {
    id: "reparo-lab",
    name: "Reparo Lab",
    category: "Tecnologia",
    description: "Suporte básico para computadores, limpeza preventiva e orientação para deixar a tecnologia funcionando por mais tempo.",
    shortDescription: "Cuidados e suporte básico para computadores.",
    offerings: ["Limpeza preventiva", "Instalação de programas", "Orientação técnica"],
    student: "Rafael Costa",
    unit: "ETEC Prof. Camargo Aranha — Mooca",
    contact: "Contato demonstrativo, sem canal ativo",
    images: ["assets/tecnologia.png"],
    imageAlt: "Notebook aberto em uma bancada de manutenção",
    demo: true
  },
  {
    id: "casa-de-barro",
    name: "Casa de Barro",
    category: "Casa e Construção",
    description: "Objetos de cerâmica e pequenas peças decorativas feitas à mão para trazer mais aconchego aos espaços.",
    shortDescription: "Cerâmicas e decoração autoral para a casa.",
    offerings: ["Vasos", "Porta-objetos", "Peças decorativas"],
    student: "Bruna Martins",
    unit: "ETEC Prof. Basílides de Godoy — Vila Leopoldina",
    contact: "Contato demonstrativo, sem canal ativo",
    images: ["assets/decoracao.png"],
    imageAlt: "Peças de cerâmica artesanal para decoração",
    demo: true
  },
  {
    id: "brisa-botanica",
    name: "Brisa Botânica",
    category: "Saúde e Bem-estar",
    description: "Sabonetes artesanais e kits de autocuidado com aromas suaves, preparados em pequena escala e embalados à mão.",
    shortDescription: "Sabonetes artesanais e kits de autocuidado.",
    offerings: ["Sabonetes", "Kits para presente", "Aromas personalizados"],
    student: "Amanda Souza",
    unit: "ETEC São Paulo — Bom Retiro",
    contact: "Contato demonstrativo, sem canal ativo",
    images: ["assets/bem-estar.png"],
    imageAlt: "Sabonetes artesanais e produtos de autocuidado",
    demo: true
  },
  {
    id: "caderno-aberto",
    name: "Caderno Aberto",
    category: "Educação",
    description: "Aulas de apoio em matemática e materiais de estudo visuais para estudantes que querem aprender no próprio ritmo.",
    shortDescription: "Apoio em matemática e materiais de estudo.",
    offerings: ["Aulas de apoio", "Resumos visuais", "Planejamento de estudos"],
    student: "Pedro Henrique Lima",
    unit: "ETEC Parque da Juventude — Santana",
    contact: "Contato demonstrativo, sem canal ativo",
    images: ["assets/educacao.png"],
    imageAlt: "Materiais de estudo organizados sobre uma mesa",
    demo: true
  }
];

export const BUSINESS_KEY = "raizes:businesses:v1";
export const FAVORITES_KEY = "raizes:favorites:v1";

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
  return [...getCreatedBusinesses(storage), ...DEMO_BUSINESSES];
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

const demoDetails = [
  ["Santana", -23.50, -46.63, [8, 10, 35], "chocolate artesanal presente"],
  ["Pinheiros", -23.57, -46.69, [35, 25, 18], "moda sustentável vintage roupas"],
  ["Santana", -23.51, -46.62, [150, 35, 60], "design criatividade identidade visual"],
  ["Mooca", -23.56, -46.60, [65, 40, null], "computador tecnologia manutenção"],
  ["Vila Leopoldina", -23.53, -46.73, [28, 18, 45], "decoração cerâmica artesanal casa"],
  ["Bom Retiro", -23.53, -46.64, [12, 35, null], "natural aromas autocuidado presente"],
  ["Santana", -23.50, -46.62, [30, 12, 25], "matemática estudos aprender" ]
];
DEMO_BUSINESSES.forEach((business, index) => {
  const [neighborhood, latitude, longitude, prices, tags] = demoDetails[index];
  Object.assign(business, { city: "São Paulo", neighborhood, location: { latitude, longitude }, locationIsDemo: true, tags, products: business.offerings.map((name, i) => ({ name, price: prices[i] })) });
});

export function saveBusiness(values, images = [], storage = browserStorage()) {
  const errors = validateBusiness(values);
  if (Object.keys(errors).length) return { ok: false, errors };
  const created = getCreatedBusinesses(storage);
  const business = {
    id: `marca-${globalThis.crypto?.randomUUID?.() || Date.now().toString(36)}`,
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
    createdAt: new Date().toISOString()
  };
  try {
    storage.setItem(BUSINESS_KEY, JSON.stringify([business, ...created]));
    return { ok: true, business };
  } catch {
    return { ok: false, errors: { form: "Não foi possível salvar neste navegador. Tente imagens menores ou libere espaço de armazenamento." } };
  }
}

