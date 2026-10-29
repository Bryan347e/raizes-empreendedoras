import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const photos = JSON.parse(await readFile(path.join(root, 'scripts/fotos-apresentacao.json'), 'utf8'));
let next = 0, completed = 0;
const failures = [];
await Promise.all(Array.from({ length: 4 }, async () => {
  while (next < photos.length) {
    const photo = photos[next++];
    if (!/^https:\/\/images\.pexels\.com\/photos\/\d+\//.test(photo.download) || !/^assets\/apresentacao-[a-z0-9-]+\.jpg$/.test(photo.file)) throw new Error('Invalid image entry');
    let bytes;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        let response = await fetch(photo.download, { signal: AbortSignal.timeout(30000) });
        if (response.status === 404) response = await fetch(photo.download.replace('.jpeg?', '.png?') + '&fm=jpg', { signal: AbortSignal.timeout(30000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        bytes = Buffer.from(await response.arrayBuffer());
        if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.length < 1000) throw new Error('Invalid JPEG');
        break;
      } catch (error) { bytes = undefined; if (attempt === 2) failures.push(`${photo.file}: ${error.message}`); }
    }
    if (!bytes) continue;
    await writeFile(path.join(root, photo.file), bytes);
    completed++;
    if (completed % 14 === 0) console.log(`${completed}/${photos.length} fotografias baixadas.`);
  }
}));
if (failures.length) throw new Error(failures.join('\n'));

const mapping = {};
for (const photo of photos) {
  mapping[photo.slug] ||= [];
  mapping[photo.slug][photo.position] = { src: photo.file, alt: photo.alt, source: photo.source };
}
await writeFile(path.join(root, 'src/presentation-photos.js'), `// Real stock photographs used only as illustrations for fictional listings.\nexport const PRESENTATION_PHOTOS = ${JSON.stringify(mapping, null, 2)};\n`);
const credits = ['# Fontes das fotografias de apresentação', '', '56 fotografias distintas, obtidas no Pexels e usadas como ilustrações de marcas fictícias. Os fotógrafos e as pessoas retratadas não representam os responsáveis declarados nos anúncios.', '', '[Licença Pexels](https://www.pexels.com/license/): uso gratuito em sites e apresentações; fotos não são revendidas nem apresentadas como trabalhos reais das marcas fictícias.', ''];
for (const [slug, items] of Object.entries(mapping)) {
  credits.push(`## ${slug}`, '');
  items.forEach((photo, index) => credits.push(`- ${index === 0 ? 'Capa' : `Produto ${index}`}: [${photo.alt}](${photo.source}) — ${photo.src}`));
  credits.push('');
}
await writeFile(path.join(root, 'fontes-fotografias.md'), credits.join('\n'));
console.log('Mapa de imagens e fontes salvos.');
