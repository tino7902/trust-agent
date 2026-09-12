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
 * This page runs inside the extension's side panel, next to WhatsApp Web. It
 * also works standalone at localhost:3100 with the paste box, which is how the
 * flow is developed and the fallback when the WhatsApp DOM changes.
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
          title: "¿Le contesto?",
          message:
            "¿Qué le puedo contestar a quien me mandó esto, sin pelearme? Dame una respuesta corta para el grupo.",
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
              Verificá el mensaje que te reenviaron, sin salir de la conversación.
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
                {captured.author && <strong>{captured.author}</strong>}
                {captured.chat && <span> · {captured.chat}</span>}
                {captured.timestamp && <span> · {captured.timestamp}</span>}
              </div>
              <p className="ck-preserve-lines ta-captured-text">{captured.text}</p>
              {captured.thread.length > 0 && (
                <details className="ck-more">
                  <summary>
                    {captured.thread.length} mensaje
                    {captured.thread.length === 1 ? "" : "s"} anterior
                    {captured.thread.length === 1 ? "" : "es"} del chat
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
                Seleccioná el mensaje en WhatsApp Web y tocá <strong>Verificar</strong> en
                la extensión, o pegalo acá abajo.
              </p>
              <textarea
                className="ta-paste"
                rows={4}
                value={draft}
                placeholder="Pegá el mensaje que te reenviaron…"
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
                ? "Tengo el mensaje. ¿Lo verifico?"
                : "Capturá un mensaje para empezar.",
              chatInputPlaceholder: "Preguntá sobre este mensaje…",
              chatDisclaimerText:
                "Puede equivocarse. Abrí las fuentes y leelas antes de decidir.",
              assistantMessageToolbarCopyMessageLabel: "Copiar",
              assistantMessageToolbarRegenerateLabel: "Volver a verificar",
              assistantMessageToolbarThumbsUpLabel: "Buena respuesta",
              assistantMessageToolbarThumbsDownLabel: "Mala respuesta",
              userMessageToolbarCopyMessageLabel: "Copiar",
              userMessageToolbarEditMessageLabel: "Editar",
            }}
          />
        </section>
      </main>
    </>
  );
}
