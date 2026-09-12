/**
 * Reads the message under verification from WhatsApp Web.
 *
 * WHY THE CASCADE MATTERS: WhatsApp ships obfuscated, generated class names that
 * can change without notice. So the primary path is the user's own selection,
 * which depends on no selector at all and cannot break. DOM reading is the
 * convenience path on top of it, and it is allowed to fail — when it does, we
 * say so and ask for a selection instead of returning a plausible-looking empty
 * capture.
 *
 * Nothing here sends anything anywhere. It reads the page and answers the panel
 * when asked; the panel shows the text and the user decides whether it leaves
 * the browser.
 */

const SELECTORS = {
  /** The open conversation's pane. Stable for years. */
  main: "#main",
  /** One message bubble row. */
  row: "div[role='row']",
  /**
   * Carries "[HH:MM, DD/MM/YYYY] Author:" as an attribute value. This is the
   * single most useful anchor in the whole DOM and has survived many redesigns.
   */
  meta: "span[data-pre-plain-text]",
  /** Text content of a bubble. */
  text: "span.selectable-text",
  /** Conversation title in the header. */
  header: "header",
};

/** "[11:04, 12/9/2026] Tía Susana: " → { timestamp, author } */
function parsePrePlainText(value) {
  if (typeof value !== "string") return {};
  const match = value.match(/^\[([^\]]+)\]\s*([^:]*):/);
  if (!match) return {};
  return { timestamp: match[1].trim(), author: match[2].trim() || undefined };
}

function rowToMessage(row) {
  if (!row) return null;
  const meta = row.querySelector(SELECTORS.meta);
  const { timestamp, author } = parsePrePlainText(meta?.getAttribute("data-pre-plain-text"));
  const textNode = row.querySelector(SELECTORS.text);
  const text = textNode?.innerText?.trim();
  if (!text) return null;
  return { text, author, timestamp };
}

function chatName() {
  const header = document.querySelector(`${SELECTORS.main} ${SELECTORS.header}`);
  const title = header?.querySelector("span[title]")?.getAttribute("title");
  return title || header?.innerText?.split("\n")[0]?.trim() || undefined;
}

/** The rows currently rendered in the open conversation, oldest first. */
function visibleRows() {
  const main = document.querySelector(SELECTORS.main);
  if (!main) return [];
  return Array.from(main.querySelectorAll(SELECTORS.row));
}

/**
 * Which row the user is pointing at.
 *
 * A selection can span part of a bubble, so we walk up from the anchor node to
 * find the row that contains it — that is how selected text keeps its author
 * and timestamp instead of arriving anonymous.
 */
function rowContaining(node) {
  let current = node instanceof Element ? node : node?.parentElement;
  while (current && current !== document.body) {
    if (current.matches?.(SELECTORS.row)) return current;
    current = current.parentElement;
  }
  return null;
}

function threadBefore(row, limit = 4) {
  const rows = visibleRows();
  const index = row ? rows.indexOf(row) : rows.length;
  const start = Math.max(0, (index === -1 ? rows.length : index) - limit);
  const end = index === -1 ? rows.length : index;
  return rows
    .slice(start, end)
    .map(rowToMessage)
    .filter(Boolean)
    .map(({ text, author, timestamp }) => ({ text, author, timestamp }));
}

/**
 * Build a capture. Returns { error } instead of a hollow object when the page
 * yields nothing, so the panel can tell the user exactly what to do.
 */
function capture() {
  if (!document.querySelector(SELECTORS.main)) {
    return {
      error:
        "No hay ninguna conversación abierta en WhatsApp Web. Abrí el chat con el mensaje y volvé a intentar.",
    };
  }

  const selection = window.getSelection();
  const selected = selection?.toString().trim();

  // Path 1 — the user's selection. No selector can break this.
  if (selected) {
    const row = rowContaining(selection.anchorNode);
    const meta = row?.querySelector(SELECTORS.meta);
    const { timestamp, author } = parsePrePlainText(
      meta?.getAttribute("data-pre-plain-text"),
    );
    return {
      platform: "whatsapp",
      text: selected,
      author,
      timestamp,
      chat: chatName(),
      thread: threadBefore(row),
      source: "selection",
      capturedAt: new Date().toISOString(),
    };
  }

  // Path 2 — the last message in the open conversation.
  const rows = visibleRows();
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const message = rowToMessage(rows[index]);
    if (!message) continue;
    return {
      platform: "whatsapp",
      text: message.text,
      author: message.author,
      timestamp: message.timestamp,
      chat: chatName(),
      thread: threadBefore(rows[index]),
      source: "dom",
      capturedAt: new Date().toISOString(),
    };
  }

  // Path 3 — we could not read it. Say so; do not invent a capture.
  return {
    error:
      "No pude leer ningún mensaje de esta conversación. Seleccioná con el mouse el texto que querés verificar y tocá Verificar de nuevo.",
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "trust-agent:capture-request") return undefined;
  try {
    sendResponse(capture());
  } catch (error) {
    sendResponse({
      error: `No pude leer la pantalla de WhatsApp (${error.message}). Probá seleccionando el texto del mensaje.`,
    });
  }
  return true;
});
