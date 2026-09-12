/**
 * Grounded web search, surface-agnostic.
 *
 * Each surface wraps this in its own tool mechanism — `defineChannelTool` for
 * Channels, a server tool for the web app — so the implementation lives in one
 * place and the binding lives at the edge.
 */
import { Exa } from "exa-js";
import { defineTool } from "@copilotkit/runtime/v2";
import { searchWebParameters } from "../schemas";
import type { SearchHit, SearchWebArgs } from "../schemas";

/**
 * Exa search profiles are a latency dial, and the choice is not cosmetic:
 * `instant` ~250ms and `fast` ~450ms are the only sane options inside a chat
 * thread. `deep-reasoning` can take 40 seconds, which reads as a hung bot.
 */
const SEARCH_TYPE = (process.env.EXA_SEARCH_TYPE ?? "fast") as
  "instant" | "fast" | "auto" | "deep-lite" | "deep" | "deep-reasoning";

export function isSearchConfigured(): boolean {
  return Boolean(process.env.EXA_API_KEY);
}

export async function searchWeb({ query, results }: SearchWebArgs): Promise<SearchHit[] | string> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    return "Web search is not configured on this deployment (no EXA_API_KEY). Say so rather than guessing.";
  }

  const exa = new Exa(apiKey);
  const response = await exa.searchAndContents(query, {
    type: SEARCH_TYPE,
    numResults: results,
    highlights: { numSentences: 2, highlightsPerUrl: 1 },
  });

  return response.results.map((hit) => ({
    title: hit.title ?? hit.url,
    url: hit.url,
    published: hit.publishedDate ?? undefined,
    highlight: hit.highlights?.[0],
  }));
}

/**
 * The same capability, bound as a server-side tool for BuiltInAgent.
 *
 * The Slack surface wraps `searchWeb` with `defineChannelTool`; the web surface
 * had no binding at all until Trust Agent needed one — the kit registers Exa on
 * Slack and on the voice route, but never on ordinary web chat. This is that
 * missing edge binding, and it keeps the implementation above unduplicated.
 *
 * `execute` returning a string (rather than throwing) on a missing key is
 * deliberate: the agent is instructed to report the gap instead of guessing, and
 * it can only do that if the gap reaches it as a readable result.
 */
export function searchWebTool() {
  return defineTool({
    name: "search_web",
    description:
      "Busca evidencia pública para una afirmación concreta y devuelve fuentes con título, URL, fecha y una cita. Es la ÚNICA forma de obtener URLs: no cites ninguna que no haya salido de acá.",
    parameters: searchWebParameters,
    execute: async (args) => searchWeb(args),
  });
}
