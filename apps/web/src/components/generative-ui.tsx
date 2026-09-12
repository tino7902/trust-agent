"use client";

/**
 * Generative UI, controlled tier.
 *
 * The agent gets a catalog of *your* React components and picks one, filling in
 * the props. The interface stays on-brand because you wrote it — the agent only
 * decides what to show.
 *
 * WHY `useFrontendTool` AND NOT `useComponent`:
 *
 * `useComponent` only takes `render` — it has no `handler`, so the tool call it
 * creates never produces a result. The first message looks fine. On the SECOND
 * message the client replays the thread history, that orphaned call comes back
 * with it, and the run dies before it starts with
 * "Tool result is missing for tool call …". Reproduced by replaying a history
 * containing a card call with no result.
 *
 * `useFrontendTool` takes both: `render` draws the card and `handler` closes
 * the call. The handler's return value is what the model reads next, so it
 * doubles as the instruction not to repeat the card's content in prose.
 *
 * The verdict enum here is the contract with the prompt in
 * packages/agent-core/src/verify-prompt.ts — change one and you must change the
 * other, or the card falls back to "Analizando…" forever.
 *
 * Renderers receive streamed partial arguments before schema defaults apply.
 */
import { useFrontendTool } from "@copilotkit/react-core/v2";
import { z } from "zod";

import { ClaimCheck, SourcesList, VerdictCard } from "./verdict-cards";

export function GenerativeUI() {
  useFrontendTool({
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
    handler: async () =>
      "La tarjeta del veredicto ya quedó en pantalla. No repitas su contenido en texto.",
    render: ({ args }) => <VerdictCard {...args} />,
  });

  useFrontendTool({
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
    handler: async () =>
      "El desglose de afirmaciones ya quedó en pantalla. No lo repitas en texto.",
    render: ({ args }) => <ClaimCheck {...args} />,
  });

  useFrontendTool({
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
    handler: async () =>
      "Las fuentes ya quedaron en pantalla con sus enlaces. No las repitas en texto; cerrá con una o dos frases sobre qué hacer.",
    render: ({ args }) => <SourcesList {...args} />,
  });

  /**
   * The inherited `propose_action` approval gate was REMOVED, deliberately.
   *
   * It is a human-in-the-loop tool: it returns no result until someone clicks.
   * With `maxSteps: 10` the agent's loop continues past a client tool call it
   * has no result for, the run finishes, and the browser reports
   * "Tool result is missing for tool call …". The runtime's own types say as
   * much — interrupt tools "require the default maxSteps: 1".
   *
   * Nothing here needs it. Trust Agent performs no irreversible action: it
   * reads, searches and reports. Its real control boundary sits earlier and
   * outside this app — the extension shows the exact text and sends nothing
   * until the person clicks Verificar. Worse, the inherited description
   * ("Llamalo PRIMERO") actively invited the model to call a gate that guards
   * nothing.
   *
   * If a future version adds a real write — "publicá el desmentido en el
   * grupo" — bring it back together with the maxSteps constraint above.
   */

  // Hooks register into the chat stream, so this component renders nothing.
  return null;
}
