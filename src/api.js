export const account = { loading: true, user: null, authReady: false, clientId: null, shared: false, businesses: [], error: "" };

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`api/${path}`, { credentials: "same-origin", ...options, signal: controller.signal, headers: { ...(options.body ? { "content-type": "application/json", "x-raizes-request": "1" } : {}), ...options.headers } });
    if (!(response.headers.get("content-type") || "").includes("application/json")) throw new Error("As contas e os anúncios compartilhados ainda não estão disponíveis neste endereço.");
    const body = await response.json();
    if (!response.ok) throw Object.assign(new Error(body.error || "Não foi possível completar a solicitação."), { errors: body.errors, status: response.status });
    return body;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("A conexão demorou demais. Confira sua internet e tente novamente.");
    throw error;
  } finally { clearTimeout(timer); }
}

export async function loadAccount() {
  account.loading = true; account.error = "";
  try {
    const session = await request("session");
    Object.assign(account, session);
    if (session.shared) {
      account.businesses = (await request("businesses")).businesses;
      if (session.user) {
        const own = (await request("my-businesses")).businesses;
        const combined = new Map(account.businesses.map(b => [b.id, b]));
        own.forEach(b => combined.set(b.id, b));
        account.businesses = [...combined.values()];
      }
    }
  } catch (error) { account.error = error.message; }
  account.loading = false;
  return account;
}

export async function publishBusiness(business, images) {
  const result = await request("businesses", { method: "POST", body: JSON.stringify({ business, images }) });
  account.businesses.unshift(result.business);
  return result.business;
}

export async function signOut() {
  await request("auth/logout", { method: "POST", body: "{}" });
  account.user = null;
  globalThis.google?.accounts?.id?.disableAutoSelect();
}

let googleScript;
function loadGoogle() {
  if (globalThis.google?.accounts?.id) return Promise.resolve();
  if (!googleScript) googleScript = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client?hl=pt-BR";
    script.async = true;
    const timer = setTimeout(() => { script.remove(); googleScript = null; reject(new Error("O serviço do Google demorou a responder. Tente novamente.")); }, 12000);
    script.onload = () => { clearTimeout(timer); resolve(); };
    script.onerror = () => { clearTimeout(timer); script.remove(); googleScript = null; reject(new Error("Não foi possível abrir o login do Google. Confira sua conexão.")); };
    document.head.append(script);
  });
  return googleScript;
}

export async function setupGoogleLogin(element, onSuccess, onError) {
  if (!account.authReady || !element) return;
  try {
    const [challenge] = await Promise.all([request("auth/challenge"), loadGoogle()]);
    if (!element.isConnected) return;
    globalThis.google.accounts.id.initialize({ client_id: account.clientId, nonce: challenge.nonce, auto_select: false, cancel_on_tap_outside: true, callback: async ({ credential }) => {
      try {
        const result = await request("auth/google", { method: "POST", body: JSON.stringify({ credential }) });
        account.user = result.user;
        await onSuccess(result.user);
      } catch (error) { onError(error.message); }
    } });
    element.replaceChildren();
    globalThis.google.accounts.id.renderButton(element, { theme: "outline", size: "large", text: "continue_with", shape: "pill", locale: "pt-BR", width: Math.min(320, element.clientWidth || 280) });
  } catch (error) { onError(error.message); }
}
