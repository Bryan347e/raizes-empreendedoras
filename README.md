# Raízes Empreendedoras

Revista digital e vitrine de negócios estudantis das ETECs. HTML, CSS e JavaScript, com Cloudflare Pages e D1 para anúncios públicos.

## Abrir

Site público: https://raizes-empreendedoras.pages.dev/

O link anterior do GitHub Pages encaminha para esse site, preservando a página solicitada. Para consultar anúncios locais antigos no navegador de origem, use https://bryan347e.github.io/raizes-empreendedoras/?arquivo=1#/perfil . Os dados locais não são enviados automaticamente a outro domínio.

Para abrir a demonstração no computador, execute `iniciar-site.cmd` ou `node server.mjs`, e acesse http://127.0.0.1:4173/. Na demonstração sem banco, os anúncios ficam somente no navegador e essa limitação é exibida.

## Publicação sem login

- Não há conta Google, senha, sessão de usuário ou e-mail de login.
- Cada loja possui responsável obrigatório, unidade ETEC e contato profissional escolhido por quem publica.
- O nome do responsável aparece no cartão e nos detalhes. A busca também encontra responsáveis.
- **Meus anúncios** usa IDs e chaves de exclusão individuais guardados neste navegador e agrupa as lojas pelo nome e unidade informados. Outros navegadores não recebem essa lista automaticamente; apagar o armazenamento local remove a lembrança, sem excluir o anúncio público.
- Essa organização não autentica pessoas. Homônimos na mesma unidade podem aparecer no mesmo grupo visual quando publicados no mesmo navegador. Cada anúncio continua sendo um registro separado.
- A API oferece criação e leitura pública; edição e exclusão exigem a chave privada do anúncio e não permitem alterar lojas de outras pessoas. Campos de propriedade/identidade enviados por clientes são ignorados. Não são criadas contas ou sessões no banco.
- Há validação de campos, preços, até 12 produtos, até três fotos da marca e três fotos por produto, e limite de 30 publicações diárias por acesso de rede. O limite usa hash diário do IP, sem armazenar o endereço original na tabela do projeto.
- Anúncios de versões anteriores permanecem disponíveis. As tabelas antigas foram mantidas para não apagar trabalho existente, mas o código Google e seus endpoints foram removidos.

## Descoberta

Busca, sete categorias e 44 unidades ETEC da cidade de São Paulo. Na abertura, é possível informar cidade, bairro, gostos e orçamento. GPS opcional exige clique e permissão; coordenadas são arredondadas para duas casas decimais. Distâncias são aproximações em linha reta. Sem GPS, o bairro é priorizado. Produtos sem preço não entram nas recomendações quando existe limite de orçamento.

Preferências, localização do visitante e favoritos ficam apenas neste navegador. Nome, contato escolhido, produtos, preços, fotos e região de atendimento do anúncio ficam públicos. Não é solicitado endereço residencial completo. Dados e preços demonstrativos estão identificados.

## Hospedagem gratuita

1. Instale dependências com `pnpm install --frozen-lockfile`.
2. Execute `node scripts/build-cloudflare.mjs`.
3. Publique o conteúdo de `publicacao-cloudflare`, incluindo `_worker.js`, `_routes.json` e `_headers`, por Direct Upload.
4. Vincule o banco D1 gratuito como **DB** em Production e republique. Nenhuma credencial Google é necessária.
5. `/api/session` informa somente `shared: true` quando o banco está disponível. O esquema é inicializado pelo serviço; dados anteriores são preservados.

Somente `/api/*` usa Functions. Não ative plano pago, cobrança ou cartão. As cotas gratuitas podem interromper o serviço ao atingir limites.

## Verificação

```powershell
node --test
node --check src/app.js
node scripts/build-cloudflare.mjs
```

Testes cobrem publicação sem conta por responsáveis diferentes, ausência de contas/sessões, listagem pública, imagens, validações, limite diário, métodos de alteração bloqueados, preservação de anúncios anteriores, agrupamento e IDs de Meus anúncios, filtros, orçamento, geolocalização aproximada e favoritos.

## Limites

Os nomes e a seleção da ETEC não comprovam identidade ou vínculo estudantil. Publicação aberta exige acompanhamento do responsável pelo projeto; esta versão não inclui moderação automática ou recuperação de anúncios em outro aparelho. Não há delivery, pagamentos, carrinho ou chat.

As fotos dos exemplos foram geradas para a demonstração. A marca do cabeçalho usa um recorte da referência; recomenda-se o logotipo original separado para reprodução final.

## Fotos de produtos e exclusão

Cada produto tem até três fotos independentes das três fotos da marca. A primeira foto da marca é a capa; os detalhes mostram o catálogo de produtos com fotos e preços. As imagens são reduzidas antes do envio.

Cada anúncio novo recebe uma chave aleatória de 256 bits no navegador. O servidor guarda somente o hash SHA-256, separado do conteúdo público. DELETE exige essa chave e confirmação na interface; não há exclusão por nome, ID público ou seleção de responsável. Os anúncios antigos sem chave permanecem visíveis e não recebem permissão de exclusão retroativa. Anúncios locais podem ser removidos no navegador que os armazena.

## Edição e recuperação de acesso (28/10/2026)

Em Meus anúncios, quem possui a chave pode editar os dados, produtos e fotos, excluir o anúncio e guardar um código privado de recuperação. A edição mantém o ID e a data de criação. Imagens já salvas só podem ser reutilizadas dentro do próprio anúncio.

O acesso é salvo antes de enviar a publicação, com cópia em localStorage e IndexedDB quando disponíveis. Os IDs também são derivados das chaves, evitando perder a lista quando a gravação do índice falha. O cliente pré-reserva um UUID e o servidor trata reenvios com a mesma chave sem duplicar o anúncio. No domínio principal, uma falha de conexão não vira publicação local silenciosa.

O código privado pode ser usado em outro navegador. Quem tem o código pode editar e excluir; ele não deve ser compartilhado nem colocado em URLs. A API confere o hash da chave antes de recuperar ou alterar um registro. Sem chave ou código, não existe recuperação automática por nome, e-mail ou unidade. Não há conta nem verificação de identidade.

