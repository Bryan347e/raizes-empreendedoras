# Raízes Empreendedoras

Revista digital e vitrine de negócios estudantis das ETECs. HTML, CSS e JavaScript, com backend Cloudflare Pages e banco D1 para contas Google e anúncios compartilhados.

## Conta Google e publicação no Cloudflare

1. Instale dependências com `pnpm install --frozen-lockfile` e execute `node scripts/build-cloudflare.mjs`.
2. Publique **o conteúdo** de `publicacao-cloudflare`, incluindo `_worker.js`, `_routes.json` e `_headers`, por Direct Upload ou Wrangler.
3. Crie um banco **D1 Free**, sem ativar cobrança, e vincule à versão Production de Pages com o nome **DB**. O esquema de `backend/schema.js` é inicializado pelo serviço.
4. No Google Auth Platform, configure nome, e-mail de suporte, público externo e escopos básicos de identidade. Crie **OAuth Client ID → Web application**. Adicione a origem HTTPS exata do site em **Authorized JavaScript origins**, sem caminho nem `#`. O fluxo de popup usado não precisa de redirect URI.
5. Defina em Production **GOOGLE_CLIENT_ID** com o identificador público que termina em `.apps.googleusercontent.com`. Não é necessário Client Secret. Não publique segredos.
6. Republique para aplicar variável e binding. Confirme `/api/session` com `authReady: true` e `shared: true`, e teste entrada e divulgação reais com Google em dois navegadores.

Em modo de consentimento de teste, somente usuários de teste adicionados no Google podem entrar. O proprietário precisa concluir os requisitos de público para produção. Não ative plano pago, cartão ou upgrade. As cotas gratuitas podem interromper o serviço ao atingir limites; não há promessa de capacidade ilimitada.

O servidor valida assinatura, emissor, audiência, validade, nonce de uso único e e-mail confirmado do ID token Google. A conta é identificada pelo `sub` Google. O e-mail fica privado. A sessão usa token aleatório armazenado por hash e cookie Secure/HttpOnly/SameSite, com duração de sete dias. Nenhuma senha Google é recebida pelo projeto.

## Local, preferências e orçamento

A página inicial permite informar cidade, bairro, categorias, gostos e faixa de preços por produto ou serviço. GPS é opcional e só é solicitado ao clicar. Coordenadas são arredondadas para duas casas decimais; distâncias são aproximações em linha reta, sem cálculo de trajetos. Sem GPS, é priorizado o bairro informado.

As recomendações filtram categorias e orçamento; itens sem preço são excluídos quando há limite. Gostos priorizam palavras nos produtos, nomes e descrições. Preços e regiões dos exemplos são fictícios e identificados. Preferências, localização do visitante e favoritos permanecem apenas no navegador. A localização aproximada de atendimento de um anúncio só é publicada se seu responsável a adicionar.

## Publicar no GitHub Pages

Site: https://bryan347e.github.io/raizes-empreendedoras/

Repositório: https://github.com/Bryan347e/raizes-empreendedoras

Execute `node scripts/build-pages.mjs` para preparar a pasta `publicacao-github-pages` com somente os arquivos públicos do site. Os caminhos relativos e a navegação com `#` permitem hospedar o site dentro de um repositório, sem configuração de redirecionamento.

Envie o conteúdo dessa pasta para um repositório público. Em **Settings → Pages**, escolha **Deploy from a branch**, a branch **main** e a pasta **/ (root)**. O GitHub Pages serve a interface estática, recomendações e favoritos, mas não executa o backend de contas. Novos anúncios compartilhados exigem a hospedagem com backend configurado.

## Abrir no computador e no celular

No Windows, clique duas vezes em `iniciar-site.cmd` e mantenha a janela aberta. Ela mostra automaticamente um link para o computador e outro para o celular. Conecte o celular à mesma rede local do computador e digite nele o endereço mostrado após **No celular**. Se o Windows perguntar sobre acesso à rede, permita o acesso em **redes privadas**. Dependendo das regras do firewall, o acesso do celular pode exigir uma permissão de entrada específica para a porta 4173.

Também é possível iniciar pelo terminal, na pasta do projeto:

```powershell
node server.mjs
```

No computador, abra `http://127.0.0.1:4173/`. O endereço do celular é detectado a cada inicialização, mesmo se o IP local mudar. Para encerrar o servidor, pressione `Ctrl+C` no terminal ou feche a janela do iniciador. O computador precisa permanecer ligado e com o servidor em execução para o celular acessar o site.

A prévia local não simula login Google. Conta e divulgação ficam indisponíveis até a configuração do backend real.

## Funcionalidades

- Página inicial com busca, categorias, negócios em destaque e conteúdo editorial.
- Exploração com busca por nome, categoria e descrição, filtros combináveis por categoria e unidade ETEC, limpeza de filtros e estado vazio.
- Páginas de detalhes com fotos, responsável, unidade, produtos/serviços e contato.
- Cadastro vinculado à conta Google, com validação, preços, cidade/bairro, localização opcional, até três fotos, pré-visualização e confirmação. O novo negócio aparece na busca e em **Meu perfil** quando o backend está configurado. Limites: 20 marcas por conta e 12 produtos por marca.
- Favoritos com inclusão, remoção e persistência local.
- Navegação por URLs com `#`, que funcionam também ao recarregar a página.

Os negócios iniciais e seus contatos são **exemplos demonstrativos**. Anúncios locais da versão anterior são preservados e identificados, sem vínculo automático com e-mail. Novos anúncios autenticados ficam no D1, compartilhados com visitantes.

Login Google e seleção da ETEC **não comprovam vínculo estudantil**. Verificação real, moderação e rotinas de exclusão/atendimento de titulares precisam ser definidas pelo responsável antes de uma operação ampla. Não existem delivery, pagamentos, carrinho ou chat. Nenhum endereço residencial completo é solicitado.

## Verificação

```powershell
node --test
node --check src/app.js
```

Os testes de backend usam SQLite em memória como adaptador D1 e JWTs assinados com chaves exclusivas do teste. Verificam assinatura inválida, audiência, nonce/repetição, e-mail confirmado, sessão expirada, CSRF, validação de publicação, identidade do proprietário, fotos e privacidade do e-mail. Não substituem o teste de login real nem a configuração de produção.

As fotos dos exemplos foram geradas para esta demonstração. A pequena marca do cabeçalho usa um recorte visual da imagem de referência fornecida; o arquivo original do logotipo é recomendado para obter a reprodução final em alta qualidade.
