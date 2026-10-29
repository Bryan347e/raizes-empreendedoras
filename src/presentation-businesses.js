// Fictional catalogue for the school presentation. No inboxes or accounts exist.
// Kept outside the public database so real community listings stay untouched.
const examples = [
  {
    slug: 'doce-intervalo', name: 'Doce Intervalo', category: 'Alimentação',
    description: 'Brownies de casquinha crocante e recheio cremoso, preparados em pequenos lotes. Uma ideia que começou nos intervalos da escola e virou uma marca de doces para presentear e compartilhar.',
    shortDescription: 'Brownies artesanais para adoçar o intervalo e os encontros.',
    student: 'Camila Nogueira', unit: 'ETEC Itaquera II — Itaquera', neighborhood: 'Santana',
    contact: 'mila.doces29@example.com',
    tags: 'artesanal, chocolate, presentes, brownies', image: 'brownies', featured: true,
    products: [{ name: 'Brownie de chocolate — unidade', price: 8 }, { name: 'Brownie com brigadeiro — unidade', price: 9.5 }, { name: 'Caixa presente com 4 brownies', price: 32 }]
  },
  {
    slug: 'linha-leve-brecho', name: 'Linha Leve Brechó', category: 'Varejo',
    description: 'Roupas selecionadas uma a uma, com medidas e estado de conservação descritos em cada peça. Moda circular para montar combinações com personalidade e dar uma nova história ao que já existe.',
    shortDescription: 'Garimpos de moda circular, com estilo e preço acessível.',
    student: 'Júlia Azevedo', unit: 'ETEC Itaquera II — Itaquera', neighborhood: 'Pinheiros',
    contact: '(11) 1608-4821',
    tags: 'brechó, moda circular, vintage, sustentável', image: 'moda', featured: true,
    products: [{ name: 'Camisa de algodão garimpada', price: 29.9 }, { name: 'Jaqueta jeans selecionada', price: 65 }, { name: 'Ecobag de tecido reaproveitado', price: 22 }]
  },
  {
    slug: 'traco-jovem-design', name: 'Traço Jovem Design', category: 'Serviços',
    description: 'Identidades visuais e materiais de divulgação para quem está abrindo seu primeiro negócio. Cada projeto começa com uma conversa sobre a marca e ganha cores, formas e peças prontas para usar.',
    shortDescription: 'Design com personalidade para marcas que estão começando.',
    student: 'Luísa Brandão', unit: 'ETEC Itaquera II — Itaquera', neighborhood: 'Santana',
    contact: 'lu.brandao.art@example.net',
    tags: 'design, identidade visual, marcas, criativo', image: 'design', featured: true,
    products: [{ name: 'Arte para divulgação digital', price: 35 }, { name: 'Apresentação de até 10 slides', price: 90 }, { name: 'Identidade visual inicial', price: 180 }]
  },
  {
    slug: 'nexo-pc', name: 'Nexo PC', category: 'Tecnologia',
    description: 'Cuidados preventivos e orientação para computadores de estudo e trabalho. O atendimento explica cada etapa do serviço, apresenta um orçamento e só realiza mudanças depois da aprovação do cliente.',
    shortDescription: 'Manutenção preventiva e suporte para o computador do dia a dia.',
    student: 'Caio Moreira', unit: 'ETEC Itaquera II — Itaquera', neighborhood: 'Tatuapé',
    contact: '(11) 1427-6304',
    tags: 'computador, manutenção, suporte, notebook', image: 'tecnologia',
    products: [{ name: 'Diagnóstico inicial', price: 35 }, { name: 'Configuração de programas livres', price: 75 }, { name: 'Limpeza preventiva de computador', price: 90 }]
  },
  {
    slug: 'barro-e-afeto', name: 'Barro e Afeto', category: 'Casa e Construção',
    description: 'Pequenas peças de cerâmica modeladas à mão, com texturas e cores inspiradas na natureza. Vasos e porta-objetos pensados para deixar a mesa de estudos e os cantinhos da casa mais acolhedores.',
    shortDescription: 'Cerâmica artesanal para dar vida aos pequenos cantinhos.',
    student: 'Marina Duarte', unit: 'ETEC Itaquera II — Itaquera', neighborhood: 'Vila Leopoldina',
    contact: 'atelie.mariduarte@example.com',
    tags: 'cerâmica, decoração, artesanal, casa', image: 'decoracao',
    products: [{ name: 'Porta-joias de cerâmica', price: 22 }, { name: 'Vaso pequeno artesanal', price: 30 }, { name: 'Cachepô texturizado', price: 45 }]
  },
  {
    slug: 'mimo-botanico', name: 'Mimo Botânico', category: 'Saúde e Bem-estar',
    description: 'Sabonetes artesanais e conjuntos de presente com aromas suaves e embalagens cuidadosas. Uma proposta de autocuidado para pequenos momentos de pausa, sem promessas de tratamento ou resultados médicos.',
    shortDescription: 'Sabonetes e presentes delicados para uma pausa no dia.',
    student: 'Beatriz Valença', unit: 'ETEC Itaquera II — Itaquera', neighborhood: 'Bom Retiro',
    contact: 'beavalenca@example.org',
    tags: 'sabonetes, aromas, autocuidado, presentes', image: 'bem-estar',
    products: [{ name: 'Sabonete artesanal — unidade', price: 12 }, { name: 'Dupla de sabonetes para presente', price: 22 }, { name: 'Kit de autocuidado com 3 itens', price: 38 }]
  },
  {
    slug: 'descomplica-exatas', name: 'Descomplica Exatas', category: 'Educação',
    description: 'Apoio entre estudantes para revisar matemática, tirar dúvidas e praticar exercícios com calma. As aulas são organizadas a partir das dificuldades de cada aluno, com exemplos e um plano de revisão.',
    shortDescription: 'Matemática explicada com calma, exemplos e prática.',
    student: 'André Tavares', unit: 'ETEC Itaquera II — Itaquera', neighborhood: 'Ipiranga',
    contact: 'andre.tav23@example.com',
    tags: 'matemática, reforço, estudos, exercícios', image: 'educacao',
    products: [{ name: 'Resumo visual de matemática', price: 12 }, { name: 'Aula de apoio — 1 hora', price: 30 }, { name: 'Pacote de 4 aulas de apoio', price: 100 }]
  },
  {
    slug: 'cacau-de-quintal', name: 'Cacau de Quintal', category: 'Alimentação',
    description: 'Doces de chocolate feitos sob encomenda em porções individuais e caixas para compartilhar. O cardápio combina receitas de família e novas ideias testadas em pequenos lotes, com informações sobre ingredientes.',
    shortDescription: 'Doces de chocolate em porções e caixas para compartilhar.',
    student: 'Gabriel Lemos', unit: 'ETEC Itaquera II — Itaquera', neighborhood: 'Mooca',
    contact: '(11) 1835-7816',
    tags: 'chocolate, doces, encomendas, brownie', image: 'brownies',
    products: [{ name: 'Brownie clássico — unidade', price: 6.5 }, { name: 'Brownie com castanhas — unidade', price: 7.5 }, { name: 'Caixa de degustação com 4 unidades', price: 28 }]
  },
  {
    slug: 'reveste-atelie', name: 'Reveste Ateliê', category: 'Varejo',
    description: 'Peças garimpadas e customizações para renovar o guarda-roupa com criatividade. O ateliê trabalha com bordados simples, ajustes e detalhes autorais, combinando a ideia do cliente com os materiais disponíveis.',
    shortDescription: 'Roupas customizadas e ajustes que dão outra vida às peças.',
    student: 'Lara Figueiredo', unit: 'ETEC Itaquera II — Itaquera', neighborhood: 'Vila Formosa',
    contact: 'laraf.custom@example.net',
    tags: 'customização, roupas, bordado, reaproveitamento', image: 'moda',
    products: [{ name: 'Ajuste simples de barra', price: 15 }, { name: 'Bordado pequeno personalizado', price: 20 }, { name: 'Camiseta customizada', price: 38 }]
  },
  {
    slug: 'ponto-criativo', name: 'Ponto Criativo', category: 'Serviços',
    description: 'Artes digitais para divulgar produtos, eventos escolares e pequenos negócios. Os arquivos são preparados nos formatos combinados, com atenção à leitura, às cores da marca e ao objetivo de cada peça.',
    shortDescription: 'Artes digitais e apresentações para fazer sua ideia aparecer.',
    student: 'Diego Amaral', unit: 'ETEC Itaquera II — Itaquera', neighborhood: 'Penha',
    contact: 'dg.amaral07@example.com',
    tags: 'artes digitais, apresentação, divulgação, design', image: 'design',
    products: [{ name: 'Conjunto de 3 artes digitais', price: 45 }, { name: 'Cartão de visita digital', price: 30 }, { name: 'Apresentação de até 8 slides', price: 70 }]
  },
  {
    slug: 'byte-amigo', name: 'Byte Amigo', category: 'Tecnologia',
    description: 'Ajuda prática para organizar arquivos, configurar ferramentas de estudo e usar o computador com mais autonomia. Atendimentos agendados, com explicações simples para quem está começando ou precisa de apoio.',
    shortDescription: 'Tecnologia sem complicação para estudar e se organizar.',
    student: 'Vitor Paiva', unit: 'ETEC Itaquera II — Itaquera', neighborhood: 'Itaquera',
    contact: '+55 (11) 1276-1958',
    tags: 'informática, organização, tecnologia, suporte', image: 'tecnologia',
    products: [{ name: 'Orientação de informática — 1 hora', price: 45 }, { name: 'Organização de arquivos digitais', price: 60 }, { name: 'Revisão de configurações do computador', price: 80 }]
  },
  {
    slug: 'canto-em-ceramica', name: 'Canto em Cerâmica', category: 'Casa e Construção',
    description: 'Objetos decorativos de cerâmica para mesas, prateleiras e pequenos jardins internos. As peças são produzidas em quantidades limitadas e podem ganhar cores personalizadas conforme a disponibilidade de materiais.',
    shortDescription: 'Vasos e objetos de cerâmica para uma casa com personalidade.',
    student: 'Helena Campos', unit: 'ETEC Itaquera II — Itaquera', neighborhood: 'Butantã',
    contact: 'helenac.art@example.org',
    tags: 'vasos, decoração, cerâmica, plantas', image: 'decoracao',
    products: [{ name: 'Vaso para suculenta', price: 25 }, { name: 'Porta-objetos de cerâmica', price: 28 }, { name: 'Conjunto decorativo com 3 peças', price: 65 }]
  },
  {
    slug: 'pausa-aromas', name: 'Pausa Aromas', category: 'Saúde e Bem-estar',
    description: 'Sabonetes, sachês e kits aromáticos montados artesanalmente para presentear ou perfumar pequenos espaços. O catálogo valoriza combinações suaves e informa os materiais para ajudar na escolha de cada produto.',
    shortDescription: 'Aromas suaves e kits artesanais feitos para presentear.',
    student: 'Amanda Reis', unit: 'ETEC Itaquera II — Itaquera', neighborhood: 'Jardim São Luís',
    contact: '(11) 1549-2640',
    tags: 'aromas, sabonetes, artesanal, presentes', image: 'bem-estar',
    products: [{ name: 'Sabonete perfumado artesanal', price: 10 }, { name: 'Dupla de sachês aromáticos', price: 12 }, { name: 'Kit presente com 3 itens', price: 32 }]
  },
  {
    slug: 'caderno-vivo', name: 'Caderno Vivo', category: 'Educação',
    description: 'Materiais de estudo visuais e apoio na organização da rotina escolar. Resumos e planejadores ajudam a dividir conteúdos, acompanhar tarefas e montar uma revisão que caiba no tempo de cada estudante.',
    shortDescription: 'Resumos, planejadores e apoio para organizar os estudos.',
    student: 'Sofia Menezes', unit: 'ETEC Itaquera II — Itaquera', neighborhood: 'Cidade Tiradentes',
    contact: 'sofi.menezes@example.com',
    tags: 'resumos, organização, planejamento, estudos', image: 'educacao',
    products: [{ name: 'Planejador semanal digital', price: 15 }, { name: 'Resumo visual personalizado', price: 20 }, { name: 'Encontro de organização dos estudos', price: 35 }]
  }
];

export const PRESENTATION_BUSINESSES = examples.map(({ slug, image, ...business }) => ({
  ...business,
  id: `apresentacao-${slug}`,
  city: 'São Paulo',
  images: [`assets/${image}.png`],
  imageAlt: `Imagem ilustrativa de ${business.name}, marca fictícia para apresentação`,
  products: business.products.map(product => ({ ...product, images: [`assets/${image}.png`] })),
  offerings: business.products.map(product => product.name),
  demo: true,
  featured: business.featured === true
}));
