import {
  CATEGORIES, UNITS, DEMO_BUSINESSES, getAllBusinesses,
  getCreatedBusinesses, getFavorites, toggleFavorite,
  filterBusinesses, validateBusiness, saveBusiness
} from "./catalog.js";

const app = document.querySelector("#app");
const toast = document.querySelector("#toast");
let formImages = [];
let toastTimer;
let publishDirty = false;
let previousHash = window.location.hash || "#/inicio";

const paths = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z"/><path d="M9 21v-7h6v7"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  utensils: '<path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M17 3c-2 3-3 7-3 11h5V3h-2Zm2 11v7"/>',
  bag: '<path d="M4 8h16l-1 13H5L4 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',
  wellness: '<path d="M20.8 5a5.4 5.4 0 0 0-7.6 0L12 6.2 10.8 5a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.4A5.4 5.4 0 0 0 20.8 5Z"/><path d="M4.6 12h4l2-3 2.5 6 1.7-3h4.6"/>',
  briefcase: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13a21 21 0 0 0 18 0"/>',
  laptop: '<rect x="4" y="4" width="16" height="12" rx="1"/><path d="M2 20h20l-2-4H4l-2 4Z"/>',
  cap: '<path d="m2 9 10-5 10 5-10 5L2 9Z"/><path d="M6 12v5c3.5 3 8.5 3 12 0v-5M22 9v7"/>',
  house: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z"/><path d="M9 21v-7h6v7"/>',
  filter: '<path d="M4 6h16M7 12h10m-7 6h4"/>',
  close: '<path d="M5 5l14 14M19 5 5 19"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 3-3 6 6"/>',
  sprout: '<path d="M12 21v-9m0 6c-5 0-8-3-8-8 5 0 8 3 8 8Zm0-6c0-5 3-8 8-8 0 5-3 8-8 8Z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>'
};

const categoryIcons = {
  "Alimentação": "utensils", "Varejo": "bag", "Saúde e Bem-estar": "wellness",
  "Serviços": "briefcase", "Tecnologia": "laptop", "Educação": "cap", "Casa e Construção": "house"
};

function icon(name, size = 20, fill = "none") {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.sprout}</svg>`;
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function safeImageSrc(value) {
  if (typeof value !== "string") return "";
  return /^assets\/[a-z0-9-]+\.(png|jpe?g|webp)$/i.test(value) || /^data:image\/(png|jpeg|webp);base64,/i.test(value) ? value : "";
}

function businessUrl(id) { return `#/negocio/${encodeURIComponent(id)}`; }

function contactMarkup(business) {
  const contact = String(business.contact || "").trim();
  if (business.demo) return `<p>${escapeHTML(contact)}</p>`;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) return `<a class="contact-link" href="mailto:${escapeHTML(contact)}">${escapeHTML(contact)} ${icon("arrow", 16)}</a>`;
  try {
    const url = new URL(contact);
    if (["https:", "http:"].includes(url.protocol)) return `<a class="contact-link" href="${escapeHTML(url.href)}" target="_blank" rel="noopener noreferrer">${escapeHTML(contact)} ${icon("arrow", 16)}</a>`;
  } catch {}
  return `<p>${escapeHTML(contact)}</p>`;
}

function imageMarkup(business, className = "") {
  const source = safeImageSrc(business.images?.[0]);
  const eager = className.includes("hero-photo");
  return `<span class="photo-frame ${className}">
    ${source ? `<img src="${escapeHTML(source)}" alt="${escapeHTML(business.imageAlt || `Foto enviada para ${business.name}`)}" width="640" height="450" loading="${eager ? "eager" : "lazy"}" ${eager ? 'fetchpriority="high"' : ""} data-business-image>` : ""}
    <span class="photo-fallback">${icon("image", 30)}<span>Imagem indisponível</span></span>
  </span>`;
}

function logoMarkup() {
  return `<span class="brand-symbol" aria-hidden="true"><img src="assets/identidade-referencia.jpeg" alt="" width="1024" height="1536"></span>
    <span class="brand-wordmark"><strong>raízes</strong><span>empreendedoras</span><small>ENTRE MARCAS</small></span>`;
}

function favoriteButton(business, extra = "") {
  const saved = getFavorites().includes(business.id);
  return `<button type="button" class="favorite-button ${extra} ${saved ? "is-saved" : ""}" data-favorite="${escapeHTML(business.id)}" aria-label="${saved ? "Remover" : "Adicionar"} ${escapeHTML(business.name)} ${saved ? "dos" : "aos"} favoritos" aria-pressed="${saved}">${icon("heart", 21, saved ? "currentColor" : "none")}</button>`;
}

function navLink(label, route, iconName, active) {
  return `<a href="#/${route}" class="nav-link ${active === route ? "is-active" : ""}" ${active === route ? 'aria-current="page"' : ""}>${icon(iconName, 19)}<span>${label}</span></a>`;
}

function shell(content, active = "") {
  return `<a class="skip-link" href="#main-content" data-skip>Pular para o conteúdo</a>
    <header class="site-header">
      <div class="header-inner page-width">
        <a href="#/inicio" class="brand" aria-label="Raízes Empreendedoras — início">${logoMarkup()}</a>
        <nav class="desktop-nav" aria-label="Navegação principal">
          ${navLink("Início", "inicio", "home", active)}
          ${navLink("Explorar", "explorar", "search", active)}
          ${navLink("Favoritos", "favoritos", "heart", active)}
          ${navLink("Meu perfil", "perfil", "user", active)}
        </nav>
        <a href="#/divulgar" class="header-cta">Divulgar minha marca ${icon("arrow", 17)}</a>
      </div>
    </header>
    <main id="main-content" tabindex="-1">${content}</main>
    <footer class="site-footer">
      <div class="page-width footer-grid">
        <div><p class="footer-name">Raízes Empreendedoras</p><p>Entre marcas, ideias e pessoas da comunidade ETEC.</p></div>
        <div><p class="footer-label">Nesta primeira versão</p><p>Os negócios de exemplo são demonstrativos. Cadastros e favoritos ficam somente neste navegador e não são compartilhados.</p></div>
      </div>
    </footer>
    <nav class="bottom-nav" aria-label="Navegação no celular">
      ${navLink("Início", "inicio", "home", active)}
      ${navLink("Explorar", "explorar", "search", active)}
      ${navLink("Favoritos", "favoritos", "heart", active)}
      ${navLink("Perfil", "perfil", "user", active)}
    </nav>`;
}

function businessCard(business) {
  return `<article class="business-card">
    <a class="card-photo-link" href="${businessUrl(business.id)}" aria-label="Ver detalhes de ${escapeHTML(business.name)}">${imageMarkup(business)}</a>
    <div class="card-body">
      <div class="card-topline"><span class="category-label">${escapeHTML(business.category)}</span>${favoriteButton(business)}</div>
      <h3><a href="${businessUrl(business.id)}">${escapeHTML(business.name)}</a></h3>
      <p class="card-description">${escapeHTML(business.shortDescription || business.description)}</p>
      <p class="card-unit">${icon("pin", 16)}<span>${escapeHTML(business.unit)}</span></p>
      <div class="card-footer"><span>${business.demo ? "Exemplo demonstrativo" : "Marca cadastrada aqui"}</span><a href="${businessUrl(business.id)}" aria-label="Conhecer ${escapeHTML(business.name)}">Conhecer ${icon("arrow", 16)}</a></div>
    </div>
  </article>`;
}

function renderHome() {
  const featured = DEMO_BUSINESSES.filter((business) => business.featured);
  return `<section class="hero">
    <div class="page-width hero-grid">
      <div class="hero-content">
        <span class="hero-kicker">Uma vitrine de ideias da comunidade ETEC</span>
        <h1>Conexões que fazem negócios crescerem.</h1>
        <p>Descubra marcas, produtos e serviços criados por estudantes de diferentes ETECs. Conheça quem está transformando uma ideia em empreendimento.</p>
        <form class="hero-search" id="home-search" role="search">
          <label for="home-query" class="sr-only">Buscar negócios, categorias ou serviços</label>
          ${icon("search", 22)}
          <input id="home-query" name="query" type="search" placeholder="Busque por marca, produto ou serviço" autocomplete="off">
          <button type="submit">Buscar</button>
        </form>
        <div class="hero-actions"><a class="button button-gold" href="#/divulgar">Divulgar minha marca ${icon("arrow", 18)}</a><a class="text-link hero-explore" href="#/explorar">Explorar negócios ${icon("arrow", 18)}</a></div>
      </div>
      <div class="hero-feature" aria-label="Destaque da comunidade">
        <div class="hero-feature-photo">${imageMarkup(featured[0], "hero-photo")}</div>
        <div class="hero-feature-label"><span>Feito por estudantes</span><strong>Ideias que criam raízes.</strong></div>
        <div class="hero-leaf hero-leaf-one"></div><div class="hero-leaf hero-leaf-two"></div>
      </div>
    </div>
  </section>
  <section class="categories-section page-width" aria-labelledby="categories-title">
    <div class="section-heading"><div><p class="section-intro">Explore do seu jeito</p><h2 id="categories-title">O que você procura hoje?</h2></div><a class="text-link" href="#/explorar">Ver todos os negócios ${icon("arrow", 18)}</a></div>
    <div class="category-grid">${CATEGORIES.map((category, index) => `<a class="category-tile category-${index + 1}" href="#/explorar?categoria=${encodeURIComponent(category)}"><span class="category-icon">${icon(categoryIcons[category], 29)}</span><span>${escapeHTML(category)}</span>${icon("arrow", 17)}</a>`).join("")}</div>
  </section>
  <section class="featured-section page-width" aria-labelledby="featured-title">
    <div class="section-heading"><div><p class="section-intro">Da comunidade para a comunidade</p><h2 id="featured-title">Marcas em destaque</h2></div><a class="text-link" href="#/explorar">Explorar a vitrine ${icon("arrow", 18)}</a></div>
    <p class="demo-context">Conheça alguns exemplos de como negócios estudantis podem aparecer na plataforma.</p>
    <div class="business-grid">${featured.map(businessCard).join("")}</div>
  </section>
  <section class="story-section page-width" aria-labelledby="story-title">
    <div class="story-photo">${imageMarkup(featured[2])}</div>
    <div class="story-copy"><p class="section-intro">Na revista · história demonstrativa</p><h2 id="story-title">Uma identidade para cada começo</h2><p>No Aurora Studio, a experiência de aprender design encontra os sonhos de quem está tirando uma marca do papel. Cada projeto começa com uma conversa e ganha forma para circular na comunidade.</p><a class="text-link" href="${businessUrl(featured[2].id)}">Conhecer o Aurora Studio ${icon("arrow", 18)}</a></div>
  </section>
  <section class="editorial-section">
    <div class="page-width editorial-grid"><div class="editorial-mark">${icon("sprout", 58)}<span>entre<br>marcas</span></div><div><p class="section-intro">Revista digital e vitrine</p><h2>Cada marca tem uma história para contar.</h2><p>Um espaço para descobrir talentos, conhecer trajetórias e criar pontes entre estudantes de diferentes unidades.</p></div><a class="button button-light" href="#/divulgar">Conte a história da sua marca ${icon("arrow", 18)}</a></div>
  </section>`;
}

function parseRoute() {
  const hash = window.location.hash.slice(1) || "/inicio";
  const [path, query = ""] = hash.split("?");
  return { path, params: new URLSearchParams(query) };
}

function exploreUrl(filters) {
  const query = new URLSearchParams();
  if (filters.query) query.set("busca", filters.query);
  if (filters.category) query.set("categoria", filters.category);
  if (filters.unit) query.set("unidade", filters.unit);
  return `#/explorar${query.toString() ? `?${query}` : ""}`;
}

function renderExplore(params) {
  const all = getAllBusinesses();
  const filters = { query: params.get("busca") || "", category: params.get("categoria") || "", unit: params.get("unidade") || "" };
  const units = [...new Set([...UNITS, ...all.map((business) => business.unit)])];
  return `<section class="page-heading page-width"><p class="section-intro">Conheça quem empreende</p><h1>Explore negócios</h1><p>Encontre produtos, marcas e serviços criados por estudantes da comunidade ETEC.</p></section>
    <section class="explore-layout page-width" aria-label="Busca e filtros de negócios">
      <div class="filter-panel">
        <div class="filter-panel-title">${icon("filter", 20)}<h2>Encontre uma marca</h2></div>
        <label for="explore-query">Buscar por nome, categoria ou descrição</label>
        <div class="field-with-icon">${icon("search", 20)}<input id="explore-query" type="search" value="${escapeHTML(filters.query)}" placeholder="Ex.: brownie, design, tecnologia" autocomplete="off"></div>
        <label for="unit-filter">Unidade ETEC</label>
        <select id="unit-filter"><option value="">Todas as unidades</option>${units.map((unit) => `<option value="${escapeHTML(unit)}" ${filters.unit === unit ? "selected" : ""}>${escapeHTML(unit)}</option>`).join("")}</select>
        <div class="filter-category-heading"><span>Categoria</span><button id="clear-filters" type="button" class="clear-button">Limpar filtros</button></div>
        <div class="filter-chips" role="group" aria-label="Filtrar por categoria"><button type="button" data-category="" class="filter-chip ${!filters.category ? "is-active" : ""}" aria-pressed="${!filters.category}">Todas</button>${CATEGORIES.map((category) => `<button type="button" data-category="${escapeHTML(category)}" class="filter-chip ${filters.category === category ? "is-active" : ""}" aria-pressed="${filters.category === category}">${escapeHTML(category)}</button>`).join("")}</div>
      </div>
      <div class="explore-content"><div class="results-heading"><div><h2>Negócios da comunidade</h2><p id="results-count" aria-live="polite"></p></div><span class="demo-pill">Exemplos demonstrativos e seus cadastros</span></div><div id="results-grid" class="business-grid"></div></div>
    </section>`;
}

function emptyState(kind) {
  const copy = kind === "favorites"
    ? { title: "Sua lista ainda está vazia", body: "Salve marcas que chamarem sua atenção para encontrá-las aqui depois.", action: "Explorar negócios", url: "#/explorar" }
    : kind === "profile"
      ? { title: "Sua primeira marca começa aqui", body: "Cadastre seu empreendimento para montar sua vitrine neste navegador.", action: "Divulgar minha marca", url: "#/divulgar" }
      : { title: "Nenhum negócio encontrado", body: "Tente outro termo, categoria ou unidade ETEC. Você também pode limpar todos os filtros.", action: "Limpar filtros", url: "" };
  const heading = kind === "favorites" ? "h2" : "h3";
  return `<div class="empty-state">${icon(kind === "favorites" ? "heart" : kind === "profile" ? "sprout" : "search", 42)}<${heading}>${copy.title}</${heading}><p>${copy.body}</p>${kind === "results" ? '<button type="button" id="empty-clear" class="button button-dark">Limpar filtros</button>' : `<a class="button button-dark" href="${copy.url}">${copy.action}</a>`}</div>`;
}

function renderFavorites() {
  const ids = getFavorites();
  const items = getAllBusinesses().filter((business) => ids.includes(business.id));
  return `<section class="page-heading page-width"><p class="section-intro">Suas descobertas</p><h1>Favoritos</h1><p>Guarde as marcas que você quer visitar novamente neste navegador.</p></section><section class="page-width listing-section">${items.length ? `<h2 class="sr-only">Marcas favoritas</h2><div class="business-grid">${items.map(businessCard).join("")}</div>` : emptyState("favorites")}</section>`;
}

function renderProfile() {
  const items = getCreatedBusinesses();
  return `<section class="page-heading page-width"><p class="section-intro">Seu espaço</p><h1>Perfil empreendedor</h1><p>Acompanhe as marcas que você cadastrou neste navegador.</p></section>
    <section class="page-width profile-layout"><aside class="profile-panel"><div class="profile-avatar">${icon("user", 36)}</div><h2>Seu espaço de empreendedor(a)</h2><p>Os cadastros desta demonstração ficam salvos apenas neste navegador. Sem autenticação, este perfil não comprova vínculo com uma ETEC.</p><a class="button button-gold" href="#/divulgar">Divulgar outra marca ${icon("arrow", 18)}</a></aside><div class="profile-content"><div class="section-heading"><h2>Meus negócios <span class="count-badge">${items.length}</span></h2></div>${items.length ? `<div class="business-grid">${items.map(businessCard).join("")}</div>` : emptyState("profile")}</div></section>`;
}

function renderDetail(id, params) {
  const business = getAllBusinesses().find((item) => item.id === id);
  if (!business) return `<section class="page-width not-found"><div class="empty-state">${icon("search", 42)}<h1>Negócio não encontrado</h1><p>O endereço pode estar incorreto ou a marca pode ter sido removida deste navegador.</p><a class="button button-dark" href="#/explorar">Explorar negócios</a></div></section>`;
  const otherImages = business.images?.slice(1).filter(safeImageSrc) || [];
  return `<div class="page-width detail-page"><a href="#/explorar" class="back-link">${icon("back", 18)} Voltar para explorar</a>
    ${params.get("criado") === "1" ? `<div class="success-banner" role="status">${icon("check", 22)}<span><strong>Marca salva com sucesso.</strong> Ela já aparece na vitrine e pode ser encontrada pela busca.</span></div>` : ""}
    <h1 class="sr-only">${escapeHTML(business.name)}</h1>
    <div class="detail-grid"><div class="detail-main">
      <div class="detail-photo">${imageMarkup(business)}</div>
      ${otherImages.length ? `<div class="detail-gallery">${otherImages.map((source, index) => `<span class="photo-frame"><img src="${escapeHTML(source)}" alt="Outra imagem de ${escapeHTML(business.name)}, foto ${index + 2}" width="360" height="260" loading="lazy" data-business-image><span class="photo-fallback">Imagem indisponível</span></span>`).join("")}</div>` : ""}
      <div class="detail-description"><h2>Sobre o negócio</h2><p>${escapeHTML(business.description)}</p><h2>Produtos e serviços</h2><ul class="offering-list">${business.offerings.map((offering) => `<li>${icon("check", 16)}${escapeHTML(offering)}</li>`).join("")}</ul></div>
    </div><aside class="detail-sidebar"><div class="detail-heading"><span class="category-label">${escapeHTML(business.category)}</span>${favoriteButton(business)}<p class="detail-title">${escapeHTML(business.name)}</p><p>${escapeHTML(business.shortDescription || business.description)}</p></div><div class="detail-facts"><div>${icon("user", 20)}<span><small>Aluno responsável</small><strong>${escapeHTML(business.student)}</strong></span></div><div>${icon("pin", 20)}<span><small>Unidade ETEC</small><strong>${escapeHTML(business.unit)}</strong></span></div></div><div class="contact-box"><h2>Entre em contato</h2>${contactMarkup(business)}${business.demo ? '<small>Este é um exemplo demonstrativo. O contato não direciona a uma pessoa real.</small>' : '<small>Contato informado por quem cadastrou esta marca neste navegador.</small>'}</div>${business.demo ? '<span class="detail-demo">Exemplo demonstrativo</span>' : '<span class="detail-demo">Cadastro salvo localmente</span>'}</aside></div>
  </div>`;
}

function renderPublish() {
  return `<section class="page-heading page-width"><p class="section-intro">Faça parte da vitrine</p><h1>Divulgar minha marca</h1><p>Conte o que você criou. Seus dados serão salvos neste navegador para esta demonstração.</p></section>
    <section class="page-width publish-layout"><form id="publish-form" class="publish-form" novalidate>
      <div class="form-intro"><h2>Informações do negócio</h2><p>Campos com <span aria-hidden="true">*</span> são obrigatórios.</p></div>
      <div id="form-error-summary" class="form-error-summary" role="alert" tabindex="-1" hidden></div>
      <div class="form-grid">
        <div class="form-field"><label for="business-name">Nome do negócio <span aria-hidden="true">*</span></label><input id="business-name" name="name" type="text" maxlength="80" autocomplete="organization" required placeholder="Ex.: Ateliê Girassol"><p id="error-name" class="field-error" data-error-for="name"></p></div>
        <div class="form-field"><label for="business-category">Categoria <span aria-hidden="true">*</span></label><select id="business-category" name="category" required><option value="">Selecione uma categoria</option>${CATEGORIES.map((category) => `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`).join("")}</select><p id="error-category" class="field-error" data-error-for="category"></p></div>
        <div class="form-field full"><label for="business-description">Descrição do empreendimento <span aria-hidden="true">*</span></label><textarea id="business-description" name="description" rows="5" maxlength="600" required placeholder="Conte como seu negócio começou e o que torna sua marca especial."></textarea><p class="field-hint">Mínimo de 30 caracteres.</p><p id="error-description" class="field-error" data-error-for="description"></p></div>
        <div class="form-field full"><label for="business-offerings">Produtos ou serviços oferecidos <span aria-hidden="true">*</span></label><textarea id="business-offerings" name="offerings" rows="3" required placeholder="Escreva um item por linha. Ex.: brownies tradicionais"></textarea><p class="field-hint">Separe os itens por linha ou vírgula.</p><p id="error-offerings" class="field-error" data-error-for="offerings"></p></div>
        <div class="form-field full"><label for="business-student">Aluno responsável <span aria-hidden="true">*</span></label><input id="business-student" name="student" type="text" maxlength="90" autocomplete="name" required placeholder="Seu nome"><p id="error-student" class="field-error" data-error-for="student"></p></div>
        <div class="form-field full"><label for="business-unit">Unidade ETEC <span aria-hidden="true">*</span></label><select id="business-unit" name="unit" required><option value="">Selecione sua unidade</option>${UNITS.map((unit) => `<option value="${escapeHTML(unit)}">${escapeHTML(unit)}</option>`).join("")}</select><p class="field-hint">Unidades da cidade de São Paulo. A seleção não verifica vínculo estudantil.</p><p id="error-unit" class="field-error" data-error-for="unit"></p></div>
        <div class="form-field full"><label for="business-contact">Contato <span aria-hidden="true">*</span></label><input id="business-contact" name="contact" type="text" maxlength="140" required placeholder="E-mail, perfil profissional ou outro contato"><p class="field-hint">Será exibido na página da marca. Confira antes de salvar.</p><p id="error-contact" class="field-error" data-error-for="contact"></p></div>
        <div class="form-field full"><label for="business-images">Imagens do negócio</label><label class="upload-box" for="business-images">${icon("image", 28)}<strong>Adicione até 3 fotos</strong><span>JPG, PNG ou WebP. As imagens são reduzidas antes de salvar.</span><input id="business-images" name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple></label><p id="error-images" class="field-error" data-error-for="images"></p><div id="uploaded-images" class="uploaded-images"></div></div>
      </div><div class="form-actions"><button type="submit" class="button button-dark">Salvar minha marca ${icon("arrow", 18)}</button><p>Ao salvar, a marca aparece em Explorar e em seu perfil local.</p></div>
    </form><aside class="preview-panel"><div class="preview-heading"><span>Pré-visualização</span><p>Veja como sua marca pode aparecer na vitrine.</p></div><div id="form-preview"></div><p class="preview-note">Esta versão é demonstrativa. Os dados não são compartilhados entre usuários.</p></aside></section>`;
}

function updateExplore() {
  const search = document.querySelector("#explore-query");
  if (!search) return;
  const category = document.querySelector(".filter-chip.is-active")?.dataset.category || "";
  const filters = { query: search.value.trim(), category, unit: document.querySelector("#unit-filter").value };
  const results = filterBusinesses(getAllBusinesses(), filters);
  document.querySelector("#results-count").textContent = `${results.length} ${results.length === 1 ? "negócio encontrado" : "negócios encontrados"}`;
  document.querySelector("#results-grid").innerHTML = results.length ? results.map(businessCard).join("") : emptyState("results");
  history.replaceState(null, "", exploreUrl(filters));
}

function setupExplore() {
  document.querySelector("#explore-query")?.addEventListener("input", updateExplore);
  document.querySelector("#unit-filter")?.addEventListener("change", updateExplore);
  document.querySelectorAll(".filter-chip").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll(".filter-chip").forEach((chip) => { chip.classList.toggle("is-active", chip === button); chip.setAttribute("aria-pressed", String(chip === button)); });
    updateExplore();
  }));
  document.querySelector("#clear-filters")?.addEventListener("click", clearFilters);
  document.querySelector("#results-grid")?.addEventListener("click", (event) => {
    if (event.target.closest("#empty-clear")) clearFilters();
  });
  updateExplore();
}

function clearFilters() {
  document.querySelector("#explore-query").value = "";
  document.querySelector("#unit-filter").value = "";
  document.querySelectorAll(".filter-chip").forEach((chip) => { const active = chip.dataset.category === ""; chip.classList.toggle("is-active", active); chip.setAttribute("aria-pressed", String(active)); });
  updateExplore();
  document.querySelector("#explore-query").focus();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3500);
}

function updatePreview() {
  const form = document.querySelector("#publish-form");
  if (!form) return;
  const values = Object.fromEntries(new FormData(form).entries());
  const example = {
    id: "preview", name: values.name?.trim() || "Sua marca aparece aqui", category: values.category || "Categoria",
    description: values.description?.trim() || "Conte sobre seu negócio para visualizar uma descrição.",
    shortDescription: values.description?.trim() || "Conte sobre seu negócio para visualizar uma descrição.",
    unit: values.unit?.trim() || "Sua unidade ETEC", images: formImages
  };
  document.querySelector("#form-preview").innerHTML = `<div class="preview-card">${imageMarkup(example)}<div><span class="category-label">${escapeHTML(example.category)}</span><h3>${escapeHTML(example.name)}</h3><p>${escapeHTML(example.shortDescription)}</p><small>${icon("pin", 15)} ${escapeHTML(example.unit)}</small></div></div>`;
  document.querySelector("#uploaded-images").innerHTML = formImages.map((source, index) => `<div class="uploaded-thumb"><img src="${escapeHTML(source)}" alt="Foto selecionada ${index + 1}" width="80" height="80"><button type="button" data-remove-image="${index}" aria-label="Remover foto ${index + 1}">${icon("close", 15)}</button></div>`).join("");
}

async function prepareImage(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Use imagens JPG, PNG ou WebP.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Cada imagem deve ter no máximo 8 MB.");
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    context.fillStyle = "#faf6e9";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.76);
  } finally { URL.revokeObjectURL(objectUrl); }
}

function showFormErrors(errors) {
  const form = document.querySelector("#publish-form");
  form.querySelectorAll(".field-error").forEach((element) => { element.textContent = ""; });
  form.querySelectorAll("[aria-invalid]").forEach((element) => element.removeAttribute("aria-invalid"));
  for (const [name, message] of Object.entries(errors)) {
    const field = form.elements.namedItem(name);
    const target = form.querySelector(`[data-error-for="${name}"]`);
    if (target) target.textContent = message;
    if (field?.setAttribute) { field.setAttribute("aria-invalid", "true"); field.setAttribute("aria-describedby", target?.id || "form-error-summary"); }
  }
  const summary = document.querySelector("#form-error-summary");
  summary.hidden = false;
  summary.innerHTML = errors.form ? escapeHTML(errors.form) : `<strong>Revise os campos indicados antes de salvar sua marca.</strong><ul>${Object.values(errors).map((message) => `<li>${escapeHTML(message)}</li>`).join("")}</ul>`;
  summary.focus();
}

function setupPublish() {
  formImages = [];
  publishDirty = false;
  const form = document.querySelector("#publish-form");
  const handleEdit = (event) => {
    publishDirty = true;
    updatePreview();
    const field = event.target;
    if (field?.name && field.getAttribute?.("aria-invalid") === "true") {
      const message = validateBusiness(Object.fromEntries(new FormData(form).entries()))[field.name];
      const error = form.querySelector(`[data-error-for="${field.name}"]`);
      if (error) error.textContent = message || "";
      if (!message) { field.removeAttribute("aria-invalid"); field.removeAttribute("aria-describedby"); }
      if (!form.querySelector('[aria-invalid="true"]')) document.querySelector("#form-error-summary").hidden = true;
    }
  };
  form.addEventListener("input", handleEdit);
  form.addEventListener("change", (event) => { if (event.target.name !== "images") handleEdit(event); });
  form.querySelector("#uploaded-images").addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-image]");
    if (!button) return;
    formImages.splice(Number(button.dataset.removeImage), 1);
    publishDirty = true;
    updatePreview();
  });
  form.querySelector("#business-images").addEventListener("change", async (event) => {
    const error = form.querySelector('[data-error-for="images"]');
    error.textContent = "";
    const selected = [...event.target.files];
    if (selected.length + formImages.length > 3) { error.textContent = "Você pode adicionar até 3 imagens."; event.target.value = ""; return; }
    try {
      for (const file of selected) formImages.push(await prepareImage(file));
      if (selected.length) publishDirty = true;
      updatePreview();
    } catch (failure) { error.textContent = failure.message || "Não foi possível ler esta imagem."; }
    event.target.value = "";
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form).entries());
    const errors = validateBusiness(values);
    if (Object.keys(errors).length) { showFormErrors(errors); return; }
    const result = saveBusiness(values, formImages);
    if (!result.ok) { showFormErrors(result.errors); return; }
    publishDirty = false;
    location.hash = `${businessUrl(result.business.id)}?criado=1`;
  });
  updatePreview();
}

function render({ focusMain = false, scrollTop = true } = {}) {
  const { path, params } = parseRoute();
  let content, active;
  if (path === "/inicio" || path === "/") { content = renderHome(); active = "inicio"; }
  else if (path === "/explorar") { content = renderExplore(params); active = "explorar"; }
  else if (path === "/favoritos") { content = renderFavorites(); active = "favoritos"; }
  else if (path === "/perfil") { content = renderProfile(); active = "perfil"; }
  else if (path === "/divulgar") { content = renderPublish(); active = ""; }
  else if (path.startsWith("/negocio/")) { let id = ""; try { id = decodeURIComponent(path.slice(9)); } catch {} content = renderDetail(id, params); active = "explorar"; }
  else { content = `<section class="page-width not-found"><h1>Página não encontrada</h1><a class="button button-dark" href="#/inicio">Voltar ao início</a></section>`; active = ""; }
  app.innerHTML = shell(content, active);
  document.title = `${path === "/inicio" || path === "/" ? "Raízes Empreendedoras" : path === "/explorar" ? "Explorar negócios" : path === "/favoritos" ? "Favoritos" : path === "/perfil" ? "Perfil empreendedor" : path === "/divulgar" ? "Divulgar minha marca" : "Negócio"} — Raízes Empreendedoras`;
  if (path === "/explorar") setupExplore();
  if (path === "/divulgar") setupPublish();
  document.querySelector("#home-search")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = document.querySelector("#home-query").value.trim();
    location.hash = exploreUrl({ query });
  });
  if (scrollTop) window.scrollTo({ top: 0, behavior: "auto" });
  if (focusMain) {
    const heading = document.querySelector("main h1");
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    else document.querySelector("#main-content")?.focus({ preventScroll: true });
  }
}

document.addEventListener("click", (event) => {
  const skip = event.target.closest("[data-skip]");
  if (skip) { event.preventDefault(); document.querySelector("#main-content")?.focus(); return; }
  const button = event.target.closest("[data-favorite]");
  if (!button) return;
  try {
    const saved = toggleFavorite(button.dataset.favorite);
    showToast(saved ? "Marca adicionada aos favoritos." : "Marca removida dos favoritos.");
    if (parseRoute().path === "/favoritos") {
      const next = button.closest("article")?.nextElementSibling?.querySelector("[data-favorite]") || button.closest("article")?.previousElementSibling?.querySelector("[data-favorite]");
      const nextId = next?.dataset.favorite;
      render({ scrollTop: false });
      if (nextId) document.querySelector(`[data-favorite="${CSS.escape(nextId)}"]`)?.focus();
      else { const heading = document.querySelector("main h1"); if (heading) { heading.tabIndex = -1; heading.focus(); } }
    }
    else document.querySelectorAll(`[data-favorite="${CSS.escape(button.dataset.favorite)}"]`).forEach((item) => {
      item.classList.toggle("is-saved", saved);
      item.setAttribute("aria-pressed", String(saved));
      const business = getAllBusinesses().find((entry) => entry.id === button.dataset.favorite);
      item.setAttribute("aria-label", `${saved ? "Remover" : "Adicionar"} ${business?.name || "marca"} ${saved ? "dos" : "aos"} favoritos`);
      item.innerHTML = icon("heart", 21, saved ? "currentColor" : "none");
    });
  } catch { showToast("Não foi possível salvar o favorito neste navegador."); }
});

document.addEventListener("error", (event) => {
  if (event.target.matches?.("[data-business-image]")) event.target.closest(".photo-frame")?.classList.add("is-missing");
}, true);

window.addEventListener("hashchange", () => {
  if (publishDirty && previousHash.startsWith("#/divulgar") && location.hash !== previousHash) {
    if (!window.confirm("Você ainda não salvou sua marca. Sair desta página e perder as alterações?")) {
      history.replaceState(null, "", previousHash);
      return;
    }
    publishDirty = false;
  }
  previousHash = location.hash;
  render({ focusMain: true });
});
window.addEventListener("beforeunload", (event) => {
  if (publishDirty) { event.preventDefault(); event.returnValue = ""; }
});
if (!location.hash) history.replaceState(null, "", "#/inicio");
previousHash = location.hash;
render();
