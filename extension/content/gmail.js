/**
 * Reads an email under verification from Gmail.
 *
 * Gmail changes its generated class names often, so the capture cascade is the
 * same as WhatsApp's: an explicit selection is the primary path; semantic ARIA
 * and data attributes are a convenience fallback. The script never sends an
 * email or contacts a server. It only returns a capture to the side panel,
 * which previews it before the person can choose to verify it.
 */

const SELECTORS = {
  main: "div[role='main']",
  // Gmail has used each of these anchors across UI variants. `role=listitem`
  // is the stable wrapper for an expanded message; the data attributes make
  // selection capture work when Gmail nests the header inside that wrapper.
  message: "[role='listitem'], [data-message-id], [data-legacy-message-id]",
  body: "div[dir='ltr']",
  subject: "h2[data-thread-perm-id], h2[role='heading']",
  sender: "span[email]",
};

function text(value) {
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

function visible(element) {
  return Boolean(element && element.getClientRects().length);
}

function main() {
  return document.querySelector(SELECTORS.main);
}

/** Find the message wrapper containing a selected node, without CSS classes. */
function messageContaining(node) {
  let current = node instanceof Element ? node : node?.parentElement;
  while (current && current !== document.body) {
    if (current.matches?.(SELECTORS.message)) return current;
    current = current.parentElement;
  }
  return null;
}

function messageBody(message) {
  const candidates = Array.from(message.querySelectorAll(SELECTORS.body))
    .filter(visible)
    .map((element) => text(element.innerText))
    .filter(Boolean);

  // Gmail's body is normally the longest visible ltr block inside its message
  // wrapper. Choosing it avoids accidentally returning only the sender chip.
  return candidates.sort((left, right) => right.length - left.length)[0];
}

function messageMetadata(message) {
  const sender = message.querySelector(SELECTORS.sender);
  const timestamp = Array.from(message.querySelectorAll("[title], [data-tooltip]"))
    .filter(visible)
    .map((element) => text(element.getAttribute("title") ?? element.getAttribute("data-tooltip")))
    .find(Boolean);

  return {
    author: text(sender?.getAttribute("email")) ?? text(sender?.innerText),
    timestamp,
  };
}

function subject() {
  const heading = Array.from(document.querySelectorAll(SELECTORS.subject)).find(visible);
  return text(heading?.innerText);
}

function openMessages() {
  const mailMain = main();
  if (!mailMain) return [];
  return Array.from(mailMain.querySelectorAll(SELECTORS.message)).filter(visible);
}

/**
 * Build a capture from the current Gmail message. Never return a hollow
 * payload: a DOM change must ask the person to select the body explicitly.
 */
function capture() {
  if (!main()) {
    return {
      error:
        "No hay ningún mail abierto en Gmail. Abrí el mail que querés verificar y volvé a intentar.",
    };
  }

  const selection = window.getSelection();
  const selected = text(selection?.toString());

  // Path 1 — selection. It must belong to an opened message, so selecting the
  // Gmail sidebar or search results cannot be presented as email content.
  if (selected) {
    const message = messageContaining(selection.anchorNode);
    if (!message) {
      return {
        error:
          "Seleccioná texto dentro del mail abierto, no de la bandeja o la barra lateral de Gmail.",
      };
    }
    return {
      platform: "gmail",
      text: selected,
      subject: subject(),
      ...messageMetadata(message),
      thread: [],
      source: "selection",
      capturedAt: new Date().toISOString(),
    };
  }

  // Path 2 — the latest expanded email in the open thread.
  const messages = openMessages();
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const body = messageBody(messages[index]);
    if (!body) continue;
    return {
      platform: "gmail",
      text: body,
      subject: subject(),
      ...messageMetadata(messages[index]),
      thread: [],
      source: "dom",
      capturedAt: new Date().toISOString(),
    };
  }

  return {
    error:
      "No pude leer el contenido de este mail. Seleccioná con el mouse el texto que querés verificar y tocá Verificar de nuevo.",
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "trust-agent:capture-request") return undefined;
  try {
    sendResponse(capture());
  } catch (error) {
    sendResponse({
      error: `No pude leer el mail (${error.message}). Probá seleccionando el texto del cuerpo.`,
    });
  }
  return true;
});
