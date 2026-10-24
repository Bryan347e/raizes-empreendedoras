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


