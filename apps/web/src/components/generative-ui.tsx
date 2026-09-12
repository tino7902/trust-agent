"use client";

/**
 * Generative UI, controlled tier.
 *
 * `useComponent` gives the agent a catalog of *your* React components and lets
 * it choose one and fill in the props. The interface stays on-brand because you
 * wrote it — the agent only decides what to show.
 *
 * Trust Agent registers three: the verdict, the per-claim breakdown, and the
 * sources. The verdict enum here is the contract with the prompt in
 * packages/agent-core/src/verify-prompt.ts — change one and you must change the
 * other, or the card falls back to "Analizando…" forever.
 *
 * Renderers receive streamed partial arguments before schema defaults apply.
 */
import { useComponent, useHumanInTheLoop } from "@copilotkit/react-core/v2";
import { z } from "zod";

import { ClaimCheck, SourcesList, VerdictCard } from "./verdict-cards";

export function GenerativeUI() {
  useComponent({
    name: "verdict_card",
    description:
      "Muestra el veredicto sobre el mensaje analizado. Llamalo apenas tengas una conclusión respaldada por búsquedas: es lo primero que lee la persona.",
    parameters: z.object({
      verdict: z
        .enum(["verificado", "falso", "engañoso", "sin_evidencia"])
        .describe("El veredicto. Usá sin_evidencia si la búsqueda no alcanzó; es una respuesta legítima."),
      headline: z
        .string()
        .describe("La conclusión en una frase, en lenguaje llano, sin jerga."),
      reasoning: z
        .string()
        .describe("Por qué llegaste a eso: qué dijo la evidencia y qué no."),
      claimedBy: z
        .string()
        .optional()
        .describe("Quién lo mandó y cuándo, si consta en el contexto de la pantalla."),
    }),
    render: VerdictCard,
  });

  useComponent({
    name: "claim_check",
    description:
      "Desglosa las afirmaciones del mensaje con su estado individual. Llamalo cuando el mensaje mezcla más de una afirmación, que es lo habitual en una cadena.",
    parameters: z.object({
      title: z.string().optional(),
      claims: z
        .array(
          z.object({
            claim: z.string().describe("La afirmación, con las palabras del mensaje."),
            status: z
              .enum(["verificado", "falso", "engañoso", "sin_evidencia", "opinion"])
              .describe("Usá 'opinion' para lo que no es verificable, como un juicio de valor."),
            note: z.string().optional().describe("Un dato breve que lo sustente."),
          }),
        )
        .max(6)
        .default([]),
    }),
    render: ClaimCheck,
  });

  useComponent({
    name: "sources_list",
    description:
      "Muestra las fuentes que respaldan el veredicto para que se puedan abrir. CRÍTICO: solo URLs devueltas por search_web. Nunca escribas acá una dirección de memoria.",
    parameters: z.object({
      title: z.string().optional(),
      sources: z
        .array(
          z.object({
            title: z.string(),
            url: z.string().describe("Exactamente la URL que devolvió search_web."),
            published: z.string().optional().describe("Fecha de publicación, si la hay."),
            quote: z.string().optional().describe("La cita de la fuente que sostiene el punto."),
          }),
        )
        .max(6)
        .default([]),
    }),
    render: SourcesList,
  });

  /**
   * Inherited approval gate, kept for any action added later.
   *
   * Trust Agent's real control boundary sits earlier and outside this app: the
   * extension shows the exact text and sends nothing until the user clicks
   * Verificar. Nothing in this flow writes anywhere, so this gate is currently
   * unused — it stays because the moment someone adds "report this to the
   * group" it is the right shape for it.
   *
   * `respond` is a function ONLY while the tool call is executing — narrowing on
   * its presence is safer than importing the ToolCallStatus enum from
   * @copilotkit/core, which is only a transitive dependency here.
   */
  useHumanInTheLoop({
    name: "propose_action",
    description:
      "Pedí autorización antes de cualquier acción irreversible. Llamalo PRIMERO y seguí solo si devuelve aprobación.",
    parameters: z.object({
      action: z.string().describe("Qué vas a hacer, en una frase."),
      blastRadius: z.string().describe("A qué afecta si sale mal."),
    }),
    render: ({ args, respond, result }) => {
      if (!respond) {
        return (
          <article className="ck-card ck-card--gate">
            <p className="ck-gate-done">{result ? String(result) : "Esperando…"}</p>
          </article>
        );
      }
      return (
        <article className="ck-card ck-card--gate">
          <h3>{args.action ?? "Confirmá esta acción"}</h3>
          <p>{args.blastRadius}</p>
          <div className="ck-actions">
            <button
              type="button"
              className="ck-btn ck-btn--primary"
              onClick={() =>
                respond("La persona aprobó. Seguí y contá exactamente qué hiciste.")
              }
            >
              Aprobar
            </button>
            <button
              type="button"
              className="ck-btn"
              onClick={() =>
                respond(
                  "La persona rechazó. No hagas la acción, no ofrezcas un rodeo, y decí claramente que no se cambió nada.",
                )
              }
            >
              Cancelar
            </button>
          </div>
        </article>
      );
    },
  });

  // Hooks register into the chat stream, so this component renders nothing.
  return null;
}
