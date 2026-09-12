/**
 * The web surface's runtime endpoint.
 *
 * A Hono app built at module scope; Next.js route handlers are fetch-based, so
 * `app.fetch` is the handler. The catch-all segment lets Hono route the
 * runtime's sub-paths itself.
 *
 * TWO THINGS TO NOT DO HERE:
 *
 * 1. Do NOT declare `channels` on this runtime, and never call
 *    `app.channels.ready()`. Next.js isolates freeze and recycle per request,
 *    so a cold start would mint a competing listener for the same Channel —
 *    and managed delivery is claim-based, so the loser silently gets nothing.
 *    The Channels listener is `apps/channel`, a long-running process.
 *
 * 2. Do NOT reuse one agent instance across requests. The factory form hands
 *    out a fresh agent per resolution.
 */
import { randomUUID } from "node:crypto";
import {
  CopilotRuntime,
  createCopilotHonoHandler,
} from "@copilotkit/runtime/v2";
import { makeAgent, searchWebTool, VERIFY_PROMPT } from "agent-core";

// Trust Agent's runtime. `searchWebTool()` is the Exa binding the kit never had
// on web chat (it registers Exa on Slack and on the voice route only), and it is
// what keeps EXA_API_KEY server-side: the browser never sees it.
//
// `workplace: false` stays — this surface has no Ambiguous credential and must
// not be handed MCP tools that would 401.
const runtime = new CopilotRuntime({
  agents: () => ({
    default: makeAgent(randomUUID(), {
      workplace: false,
      prompt: VERIFY_PROMPT,
      tools: [searchWebTool()],
    }),
  }),
});

const app = createCopilotHonoHandler({
  runtime,
  basePath: "/api/copilotkit",
});

export const GET = app.fetch;
export const POST = app.fetch;
export const OPTIONS = app.fetch;
