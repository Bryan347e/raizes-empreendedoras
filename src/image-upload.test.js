import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareImage, prepareImageSelection } from './image-upload.js';

const photo = name => ({ name, type: 'image/jpeg', size: 5000000 });

function imageBrowser({ corrupt = false, large = false } = {}) {
  const state = { active: 0, peak: 0, revoked: 0, draws: [], images: [], canvases: [] };
  const browser = {
    Image: class {
      naturalWidth = 6000;
      naturalHeight = 4000;
      constructor() { state.images.push(this); }
      set src(value) {
        if (!value) { state.active--; return; }
        state.active++; state.peak = Math.max(state.peak, state.active);
        queueMicrotask(() => corrupt ? this.onerror?.() : this.onload?.());
      }
    },
    URL: { createObjectURL: () => 'blob:photo', revokeObjectURL: () => state.revoked++ },
    document: { createElement: () => {
      const canvas = {
        width: 0, height: 0,
        getContext: () => ({ fillRect() {}, drawImage() { state.draws.push(canvas.width); } }),
        toDataURL: () => 'data:image/jpeg;base64,' + 'A'.repeat(large && canvas.width > 600 ? 210000 : 1000)
      };
      state.canvases.push(canvas); return canvas;
    } }
  };
  return { browser, state };
}

test('selecionar três fotos juntas mantém a ordem, libera a memória e informa o progresso', async () => {
  const { browser, state } = imageBrowser();
  const prepared = [], progress = [];
  const failures = await prepareImageSelection(['1.jpg', '2.jpg', '3.jpg'].map(photo), {
    prepare: file => prepareImage(file, browser),
    onPrepared: image => prepared.push(image),
    onProgress: (current, total) => progress.push([current, total])
  });
  assert.deepEqual(failures, []);
  assert.equal(prepared.length, 3);
  assert.deepEqual(progress, [[1, 3], [2, 3], [3, 3]]);
  assert.equal(state.peak, 1);
  assert.equal(state.active, 0);
  assert.equal(state.revoked, 3);
  assert.ok(state.canvases.every(canvas => canvas.width === 1 && canvas.height === 1));
});

test('uma foto com falha não descarta as outras nem impede a terceira de ser preparada', async () => {
  const prepared = [];
  const failures = await prepareImageSelection(['primeira.jpg', 'danificada.jpg', 'terceira.jpg'].map(photo), {
    prepare: async file => { if (file.name === 'danificada.jpg') throw new Error('Foto danificada'); return file.name; },
    onPrepared: image => prepared.push(image)
  });
  assert.deepEqual(prepared, ['primeira.jpg', 'terceira.jpg']);
  assert.deepEqual(failures, [{ name: 'danificada.jpg', message: 'Foto danificada' }]);
});

test('fotos detalhadas são reduzidas novamente até caber no limite do servidor', async () => {
  const { browser, state } = imageBrowser({ large: true });
  const prepared = await prepareImage(photo('camera.jpg'), browser);
  assert.ok(prepared.length <= 200000);
  assert.deepEqual(state.draws, [900, 675, 506]);
  assert.equal(state.revoked, 1);
});

test('falha de leitura libera o arquivo e os pixels antes de informar o erro', async () => {
  const { browser, state } = imageBrowser({ corrupt: true });
  await assert.rejects(prepareImage(photo('danificada.jpg'), browser), /Não foi possível abrir esta foto/);
  assert.equal(state.revoked, 1);
  assert.equal(state.active, 0);
  assert.equal(state.images[0].onload, null);
});

test('trocar de página durante o preparo impede atualizar o formulário abandonado', async () => {
  let active = true, calls = 0;
  const prepared = [];
  await prepareImageSelection(['1.jpg', '2.jpg', '3.jpg'].map(photo), {
    isActive: () => active,
    prepare: async () => { calls++; active = false; return 'foto'; },
    onPrepared: image => prepared.push(image)
  });
  assert.equal(calls, 1);
  assert.deepEqual(prepared, []);
});

test('arquivos incompatíveis ou maiores que 8 MB continuam sendo recusados', async () => {
  await assert.rejects(prepareImage({ name: 'foto.heic', type: 'image/heic', size: 10 }), /JPG, PNG ou WebP/);
  await assert.rejects(prepareImage({ ...photo('foto.jpg'), size: 8 * 1024 * 1024 + 1 }), /8 MB/);
});
