/** Resolve the selected chat provider. Voice uses OpenAI Realtime separately. */
import { createOpenAI } from "@ai-sdk/openai";
import { DEFAULT_MODEL } from "./model-meta";

const REASONING_EFFORTS = ["minimal", "low", "medium", "high"] as const;
type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

function canonicalProvider(provider: string) {
  const normalized = provider.trim().toLowerCase();
  return normalized === "gemini" || normalized === "google-gemini" ? "google" : normalized;
}

/**
 * GPT-5 defaults to medium reasoning effort. The verifier benefits from a
 * lower setting because search and source checks still happen through tools.
 * Keep this environment-controlled so deployments can trade speed for depth
 * without changing the selected model.
 */
export function resolveModelProviderOptions() {
  const effort = (process.env.MODEL_REASONING_EFFORT ?? "low").trim().toLowerCase();
  if (!REASONING_EFFORTS.includes(effort as ReasoningEffort)) {
    throw new Error(
      `MODEL_REASONING_EFFORT must be one of: ${REASONING_EFFORTS.join(", ")}.`,
    );
  }

  return { openai: { reasoningEffort: effort as ReasoningEffort } };
}

export function resolveModel() {
  const model = (process.env.MODEL || DEFAULT_MODEL).trim();
  const firstSeparator = model.search(/[:/]/);
  const candidatePrefix = firstSeparator >= 0 ? canonicalProvider(model.slice(0, firstSeparator)) : undefined;
  // A colon in a bare model name can introduce a variant, such as ':free'.
  // Only supported provider prefixes use colon syntax; publishers use '/'.
  const separator = firstSeparator >= 0 && (model[firstSeparator] === "/" ||
    ["openai", "openrouter", "anthropic", "google"].includes(candidatePrefix || ""))
    ? firstSeparator : -1;
  const prefix = separator >= 0 ? candidatePrefix : undefined;
  const modelId = separator >= 0 ? model.slice(separator + 1).trim() : model;
  if (!modelId) {
    throw new Error("MODEL must include a non-empty model identifier.");
  }
  // Preserve the original automatic router switch for existing .env files.
  const provider = canonicalProvider(process.env.MODEL_PROVIDER || "") ||
    (process.env.OPENROUTER_API_KEY ? "openrouter" : prefix || "openai");
  const keyNames: { [provider: string]: string | undefined } = {
    openai: "OPENAI_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    google: "GOOGLE_API_KEY",
  };
  const keyName = Object.hasOwn(keyNames, provider) ? keyNames[provider] : undefined;
  if (!keyName) {
    throw new Error(`Unsupported model provider '${provider}'. Set MODEL_PROVIDER to openai, openrouter, anthropic, or google.`);
  }
  if (provider !== "openrouter" && prefix && prefix !== provider) {
    throw new Error(`MODEL provider '${prefix}' does not match MODEL_PROVIDER '${provider}'.`);
  }
  const apiKey = process.env[keyName];
  if (!apiKey || apiKey === "stub-replace-me") {
    throw new Error(`${keyName} is required for ${provider}.`);
  }

  if (provider === "openrouter") {
    const openRouter = createOpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
      headers: {
        "HTTP-Referer": process.env.PUBLIC_APP_URL ?? "https://aitinkerers.org",
        "X-OpenRouter-Title": process.env.APP_TITLE ?? "Agents, Everywhere",
      },
    });
    // Change only a provider separator; keep suffixes such as ':free' intact.
    const slug = `${prefix || "openai"}/${modelId}`;
    // AI SDK OpenAI v3 defaults to /responses. OpenRouter uses /chat/completions.
    return openRouter.chat(slug);
  }

  return `${provider}:${modelId}`;
}
