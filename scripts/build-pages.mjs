import { copyFile, mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const destination = path.join(root, "publicacao-github-pages");
const siteFiles = ["index.html", "styles.css", "src/app.js", "src/catalog.js", "src/discovery.js", "src/api.js", ".nojekyll"];
const assets = await readdir(path.join(root, "assets"), { withFileTypes: true });
for (const asset of assets) {
  if (asset.isFile() && /^[a-z0-9-]+\.(png|jpe?g|webp|svg)$/i.test(asset.name)) {
    siteFiles.push(`assets/${asset.name}`);
  }
}

for (const file of siteFiles) {
  const target = path.join(destination, file);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(path.join(root, file), target);
}

await writeFile(path.join(destination, "README.md"), `# Raízes Empreendedoras

Revista digital e vitrine demonstrativa de negócios de estudantes das ETECs.

Este site estático pode ser publicado gratuitamente em um repositório público no GitHub Pages. Em Settings → Pages, selecione Deploy from a branch, a branch main e a pasta / (root).

Os negócios iniciais, preços e regiões são demonstrativos. Favoritos, preferências e localização de visitantes ficam no navegador. Contas Google e anúncios compartilhados precisam da versão Cloudflare com banco D1 e um Client ID Google configurados. O GitHub Pages hospeda apenas os recursos estáticos. O login Google e a seleção da unidade não comprovam vínculo estudantil.
`, "utf8");

console.log(`Publicação preparada em: ${destination}`);
console.log(`${siteFiles.length} arquivos do site e README.md, sem configurações locais do computador.`);
