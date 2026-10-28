const MAX_IMAGE_LENGTH = 200000;

export async function prepareImage(file, browser = globalThis) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) && !(!file.type && /\.(jpe?g|jfif|png|webp)$/i.test(file.name))) throw new Error('Use imagens JPG, PNG ou WebP. Converta outros formatos antes de anexar.');
  if (file.size > 8 * 1024 * 1024) throw new Error('Cada imagem deve ter no máximo 8 MB.');
  const objectUrl = browser.URL.createObjectURL(file);
  const image = new browser.Image();
  let canvas;
  try {
    // Load each file separately; release its decoded pixels before the next one.
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('Não foi possível abrir esta foto. Ela pode estar danificada. Escolha outra imagem JPG, PNG ou WebP.'));
      image.src = objectUrl;
    });
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('Esta foto não contém uma imagem válida. Escolha outra foto.');
    let scale = Math.min(1, 900 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas = browser.document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('O navegador não conseguiu preparar a foto. Tente outra imagem ou reabra o site.');
    // Detailed camera photos may need a smaller size as well as compression.
    for (let attempt = 0; attempt < 5; attempt++) {
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.fillStyle = '#faf6e9';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.68, 0.5, 0.35]) {
        const prepared = canvas.toDataURL('image/jpeg', quality);
        if (prepared.startsWith('data:image/jpeg;base64,') && prepared.length <= MAX_IMAGE_LENGTH) return prepared;
      }
      scale *= 0.75;
    }
    throw new Error('Não foi possível reduzir esta foto. Escolha outra imagem ou uma versão menor.');
  } finally {
    image.onload = image.onerror = null;
    image.src = '';
    if (canvas) canvas.width = canvas.height = 1;
    browser.URL.revokeObjectURL(objectUrl);
  }
}

export async function prepareImageSelection(files, { prepare = prepareImage, onPrepared = () => {}, onProgress = () => {}, isActive = () => true } = {}) {
  const selected = Array.from(files);
  const failures = [];
  for (let index = 0; index < selected.length; index++) {
    if (!isActive()) break;
    const file = selected[index];
    onProgress(index + 1, selected.length);
    let prepared;
    try { prepared = await prepare(file); }
    catch (error) { failures.push({ name: file.name, message: error.message || 'Não foi possível ler esta foto.' }); continue; }
    if (!isActive()) break;
    onPrepared(prepared);
  }
  return failures;
}
