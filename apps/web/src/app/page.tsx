"use client";

import { useState } from "react";
import {
  CopilotChat,
  useConfigureSuggestions,
} from "@copilotkit/react-core/v2";
import { GenerativeUI } from "@/components/generative-ui";
import { VerifyControl } from "@/components/verify-control";
import { useCapturedMessage } from "@/lib/use-captured-message";

/**
 * Trust Agent's panel.
 *
 * This page runs inside the extension's side panel, next to WhatsApp Web or
 * Gmail. It also works standalone at localhost:3100 with the paste box, which
 * is the fallback when either surface's DOM changes.
 */
export default function Home() {
  const { captured, rejected, setManual, clear } = useCapturedMessage();
  const [draft, setDraft] = useState("");

  useConfigureSuggestions(
    {
      suggestions: [
        {
          title: "¿Es verdad?",
          message:
            "Verificá el mensaje que tengo capturado en el panel. Separá las afirmaciones y mostrame las fuentes.",
        },
        {
          title: "¿Parece una estafa?",
          message:
            "¿Parece una estafa o intento de phishing? Decime qué señales ves y qué conviene hacer, sin abrir enlaces ni dar datos.",
        },
      ],
      available: "before-first-message",
    },
    [],
  );

  return (
    <>
      <GenerativeUI />
      <VerifyControl captured={captured} clear={clear} />
      <main className="ck-workspace ta-panel">
        <header className="ck-workspace-header">
          <div>
            <p className="ck-eyebrow">Trust Agent</p>
            <h1>¿Esto es verdad?</h1>
            <p className="ck-intro">
              Verificá un mensaje o mail sospechoso, sin salir de donde lo recibiste.
            </p>
          </div>
        </header>

        <section className="ck-panel" aria-labelledby="captured-title">
          <h2 id="captured-title" className="ck-sr-only">
            Mensaje capturado
          </h2>

          {captured ? (
            <div className="ck-detail ta-captured">
              <div className="ta-captured-meta">
                <strong>
                  {captured.platform === "gmail" ? "Mail de Gmail" :
                    captured.platform === "whatsapp" ? "Mensaje de WhatsApp" : "Texto pegado"}
                </strong>
                {captured.author && <span> · {captured.author}</span>}
                {captured.subject && (
                  <span className="ck-muted"> · Asunto: {captured.subject}</span>
                )}
                {captured.chat && <span className="ck-muted"> · {captured.chat}</span>}
                {captured.timestamp && (
                  <span className="ck-muted"> · {captured.timestamp}</span>
                )}
              </div>
              <p className="ck-preserve-lines ta-captured-text">{captured.text}</p>
              {captured.thread.length > 0 && (
                <details className="ck-more">
                  <summary>
                    {captured.thread.length} mensaje
                    {captured.thread.length === 1 ? "" : "s"} anterior
                    {captured.thread.length === 1 ? "" : "es"} del hilo
                  </summary>
                  <ol className="ck-timeline">
                    {captured.thread.map((message, index) => (
                      <li key={index}>
                        <time>{message.timestamp ?? ""}</time>
                        <div>
                          <strong>{message.author}</strong>
                          <p className="ck-preserve-lines">{message.text}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </details>
              )}
              <div className="ck-actions">
                <span className="ck-tag">
                  {captured.source === "manual" ? "Pegado a mano" : "Leído de la pantalla"}
                </span>
                <button type="button" className="ck-btn ck-btn--tiny" onClick={clear}>
                  Descartar
                </button>
              </div>
            </div>
          ) : (
            <div className="ck-empty ta-empty">
              <p>
                Seleccioná el mensaje en WhatsApp Web o el mail en Gmail y tocá
                <strong> Verificar</strong> en la extensión, o pegalo acá abajo.
              </p>
              <textarea
                className="ta-paste"
                rows={4}
                value={draft}
                placeholder="Pegá el mensaje o mail que querés verificar…"
                onChange={(event) => setDraft(event.target.value)}
              />
              <button
                type="button"
                className="ck-btn ck-btn--primary"
                onClick={() => {
                  setManual(draft);
                  setDraft("");
                }}
              >
                Usar este mensaje
              </button>
            </div>
          )}

          {rejected && <p className="ck-error">{rejected}</p>}
        </section>

        <section className="ck-panel ck-assistant" aria-labelledby="assistant-title">
          <h2 id="assistant-title" className="ck-sr-only">
            Verificación
          </h2>
          <CopilotChat
            className="ck-chat"
            labels={{
              welcomeMessageText: captured
                ? "Tengo el contenido. ¿Lo verifico?"
                : "Capturá un mensaje o mail para empezar.",
              chatInputPlaceholder: "Preguntá sobre este contenido…",
            }}
          />
        </section>
      </main>
    </>
  );
}
