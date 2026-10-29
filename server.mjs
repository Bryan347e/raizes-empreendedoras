import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".jpeg": "image/jpeg", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon" };

function isPrivateIPv4(address) {
  const parts = address.split(".").map(Number);
  return parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255) && (
    parts[0] === 10 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168)
  );
}

const localAddresses = [...new Set(Object.values(networkInterfaces())
  .flatMap((interfaces) => interfaces || [])
  .filter((item) => item.family === "IPv4" && !item.internal && isPrivateIPv4(item.address))
  .map((item) => item.address))];

async function serve(request, response) {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname === "/api/session") {
      response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
      response.end(JSON.stringify({ shared: false }));
      return;
    }
    const requested = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
    const allowed = requested === "/index.html" || requested === "/styles.css" ||
      ["/src/app.js", "/src/catalog.js", "/src/discovery.js", "/src/api.js", "/src/image-upload.js", "/src/presentation-businesses.js", "/src/presentation-photos.js"].includes(requested) ||
      /^\/assets\/[a-z0-9-]+\.(png|jpe?g|webp|svg)$/i.test(requested);
    if (!allowed) throw new Error("Arquivo não publicado");
    const file = path.resolve(root, `.${requested}`);
    if (!file.startsWith(root + path.sep)) throw new Error("Caminho inválido");
    const details = await stat(file);
    if (!details.isFile()) throw new Error("Arquivo inválido");
    const content = await readFile(file);
    response.writeHead(200, { "content-type": `${types[path.extname(file)] || "application/octet-stream"}; charset=utf-8`, "cache-control": "no-cache" });
    response.end(content);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Arquivo não encontrado.");
  }
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT deve ser um número entre 1 e 65535.");
}

for (const address of ["127.0.0.1", ...localAddresses]) {
  const server = createServer(serve);
  server.on("error", (error) => {
    console.error(`Não foi possível abrir http://${address}:${port}: ${error.message}`);
    if (address === "127.0.0.1") process.exitCode = 1;
  });
  server.listen(port, address, () => {
    console.log(address === "127.0.0.1"
      ? `No computador: http://${address}:${port}/`
      : `No celular (mesma rede): http://${address}:${port}/`);
  });
}

if (localAddresses.length === 0) {
  console.log("Nenhum endereço de rede local foi encontrado. Conecte o computador à rede e reinicie o servidor para obter o link do celular.");
}
