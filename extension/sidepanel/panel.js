/**
 * The panel: capture, show, confirm, send.
 *
 * The order is the point. The text is read from the page, shown to the user in
 * full, and only reaches the app — and from there OpenRouter and Exa — after an
 * explicit click. Closing the panel or pressing Descartar means nothing ever
 * left the browser.
 *
 * The app runs in an iframe pointing at the local Next.js runtime. Both sides
 * check origin: we only ever postMessage to APP_ORIGIN, and the page only
 * accepts messages from chrome-extension://.
 */

const APP_ORIGIN = "http://localhost:3100";
const CAPTURE_MESSAGE = "trust-agent:capture";
const PANEL_READY = "trust-agent:ready";

const els = {
  capture: document.getElementById("capture"),
  preview: document.getElementById("preview"),
  previewMeta: document.getElementById("preview-meta"),
  previewText: document.getElementById("preview-text"),
  send: document.getElementById("send"),
  discard: document.getElementById("discard"),
  status: document.getElementById("status"),
  app: document.getElementById("app"),
};

/** Held here, unsent, until the user confirms. */
let pending = null;
/** Set once the iframe tells us it is listening. */
let appReady = false;

function setStatus(message, kind = "info") {
  els.status.textContent = message ?? "";
  els.status.hidden = !message;
  els.status.className = `status status--${kind}`;
}

function showPreview(capture) {
  pending = capture;
  const platform = capture.platform === "gmail" ? "Gmail" : "WhatsApp";
  const meta = [
    platform,
    capture.author && `De: ${capture.author}`,
    capture.subject && `Asunto: ${capture.subject}`,
    capture.chat,
    capture.timestamp,
  ]
    .filter(Boolean)
    .join(" · ");
  els.previewMeta.textContent = meta;
  els.previewMeta.hidden = !meta;
  els.previewText.textContent = capture.text;
  els.preview.hidden = false;
}

function clearPreview() {
  pending = null;
  els.preview.hidden = true;
  els.previewText.textContent = "";
  els.previewMeta.textContent = "";
}

const SURFACES = [
  {
    id: "whatsapp",
    matches: (url) => url.startsWith("https://web.whatsapp.com/"),
    captureLabel: "Capturar mensaje",
    missingMessage:
      "Abrí web.whatsapp.com o mail.google.com en esta pestaña para capturar contenido. También podés pegarlo abajo.",
    unavailableMessage:
      "No pude hablar con la pestaña de WhatsApp. Recargá web.whatsapp.com y volvé a intentar.",
  },
  {
    id: "gmail",
    matches: (url) => url.startsWith("https://mail.google.com/"),
    captureLabel: "Capturar mail",
    missingMessage:
      "Abrí web.whatsapp.com o mail.google.com en esta pestaña para capturar contenido. También podés pegarlo abajo.",
    unavailableMessage:
      "No pude hablar con la pestaña de Gmail. Recargá mail.google.com y volvé a intentar.",
  },
];

function surfaceFor(url) {
  return SURFACES.find((surface) => surface.matches(url)) ?? null;
}

async function activeSupportedTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const surface = surfaceFor(tab?.url ?? "");
  return surface && tab ? { tab, surface } : null;
}

async function updateCaptureLabel() {
  const target = await activeSupportedTab();
  els.capture.textContent = target?.surface.captureLabel ?? "Capturar contenido";
}

void updateCaptureLabel();

els.capture.addEventListener("click", async () => {
  setStatus("");
  clearPreview();

  const target = await activeSupportedTab();
  if (!target) {
    setStatus(SURFACES[0].missingMessage, "warn");
    return;
  }
  els.capture.textContent = target.surface.captureLabel;

  let response;
  try {
    response = await chrome.tabs.sendMessage(target.tab.id, {
      type: "trust-agent:capture-request",
    });
  } catch {
    // Usually means the content script has not been injected yet, because the
    // tab was already open when the extension loaded.
    setStatus(target.surface.unavailableMessage, "warn");
    return;
  }

  if (!response || response.error) {
    setStatus(response?.error ?? "No se pudo capturar el mensaje.", "warn");
    return;
  }

  showPreview(response);
});

els.discard.addEventListener("click", () => {
  clearPreview();
  setStatus("Descartado. No se envió nada.", "info");
});

els.send.addEventListener("click", () => {
  if (!pending) return;
  if (!appReady) {
    setStatus(
      "La app todavía no responde. Comprobá que `npm run dev:web` esté corriendo en localhost:3100.",
      "warn",
    );
    return;
  }
  els.app.contentWindow?.postMessage(
    { type: CAPTURE_MESSAGE, payload: pending },
    APP_ORIGIN,
  );
  setStatus("Mensaje enviado al verificador.", "info");
  clearPreview();
});

// The page announces itself when it mounts. Until then we do not send, so a
// capture made while the iframe was still loading is not silently dropped.
window.addEventListener("message", (event) => {
  if (event.origin !== APP_ORIGIN) return;
  if (event.data?.type === PANEL_READY) appReady = true;
});

els.app.addEventListener("error", () => {
  setStatus(
    "No se pudo cargar la app en localhost:3100. Arrancá `npm run dev:web`.",
    "warn",
  );
});
