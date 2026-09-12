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

export function useCapturedMessage() {
  const [captured, setCaptured] = useState<CapturedMessage | null>(null);
  const [rejected, setRejected] = useState<string | null>(null);

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
      setRejected(null);
      setCaptured(normalized);
    }

    window.addEventListener("message", onMessage);
    // Tell the panel we are mounted, so a capture made before this frame
    // finished loading is replayed instead of lost.
    window.parent?.postMessage({ type: PANEL_READY }, "*");
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const setManual = useCallback((text: string) => {
    const normalized = normalizeCaptured({
      text,
      source: "manual",
      capturedAt: new Date().toISOString(),
    });
    setRejected(
      normalized ? null : "Pegá el texto del mensaje que querés verificar.",
    );
    if (normalized) setCaptured(normalized);
  }, []);

  const clear = useCallback(() => {
    setCaptured(null);
    setRejected(null);
  }, []);

  return { captured, rejected, setManual, clear };
}
