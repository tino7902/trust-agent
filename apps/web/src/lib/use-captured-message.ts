"use client";

/**
 * The bridge between the browser extension and this page.
 *
 * The page runs inside an iframe in the extension's side panel, so captures
 * arrive as postMessage from the panel document. Two rules hold this together:
 *
 * 1. ORIGIN IS CHECKED FIRST. Any page on the internet can postMessage into a
 *    frame it can reach. Only `chrome-extension://…` is accepted, so a random
 *    tab cannot inject a message and make the agent verify it.
 * 2. The payload is still untrusted after that, and goes through
 *    `normalizeCaptured` before it reaches state.
 *
 * `setManual` is the fallback path: paste the text into the page and the whole
 * flow works with no extension at all, which is also how this is developed and
 * tested.
 */
import { useCallback, useEffect, useState } from "react";
import {
  normalizeCaptured,
  type CapturedMessage,
} from "./captured-message";

/** Message types on the bridge. Kept in sync with extension/sidepanel/panel.js. */
export const CAPTURE_MESSAGE = "trust-agent:capture";
export const PANEL_READY = "trust-agent:ready";

function isExtensionOrigin(origin: string): boolean {
  return origin.startsWith("chrome-extension://");
}

function newConversationId(): string {
  // A new capture must never share the conversation that interpreted the old
  // one. CopilotKit clears messages and disconnects any in-flight run when its
  // threadId changes, so this id is the boundary between two captures.
  return `trust-agent-${crypto.randomUUID()}`;
}

export function useCapturedMessage() {
  const [captured, setCaptured] = useState<CapturedMessage | null>(null);
  const [rejected, setRejected] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState(newConversationId);

  const acceptCapture = useCallback((next: CapturedMessage) => {
    setRejected(null);
    setCaptured(next);
    // Rotate the chat before its context can be used for a different message.
    setConversationId(newConversationId());
  }, []);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (!isExtensionOrigin(event.origin)) return;

      const data = event.data as { type?: unknown; payload?: unknown } | null;
      if (!data || typeof data !== "object" || data.type !== CAPTURE_MESSAGE) return;

      const normalized = normalizeCaptured(data.payload);
      if (!normalized) {
        // A capture that arrives empty is worth surfacing: a surface DOM change
        // should direct the person to the selector-independent fallback.
        setRejected(
          "La extensión envió una captura vacía o ilegible. Seleccioná el texto del mensaje o mail y volvé a tocar Verificar.",
        );
        return;
      }
      acceptCapture(normalized);
    }

    window.addEventListener("message", onMessage);
    // Tell the panel we are mounted, so a capture made before this frame
    // finished loading is replayed instead of lost.
    window.parent?.postMessage({ type: PANEL_READY }, "*");
    return () => window.removeEventListener("message", onMessage);
  }, [acceptCapture]);

  const setManual = useCallback((text: string) => {
    const normalized = normalizeCaptured({
      text,
      source: "manual",
      capturedAt: new Date().toISOString(),
    });
    if (!normalized) {
      setRejected("Pegá el texto del mensaje que querés verificar.");
      return;
    }
    acceptCapture(normalized);
  }, [acceptCapture]);

  const clear = useCallback(() => {
    setCaptured(null);
    setRejected(null);
  }, []);

  return { captured, rejected, conversationId, setManual, clear };
}
