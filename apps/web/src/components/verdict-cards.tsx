import React from "react";

/**
 * Renderers for the agent's generative UI.
 *
 * Every prop is optional on purpose: tool arguments stream in token by token and
 * these components render before the schema defaults are applied. Same contract
 * as the inherited streamed-cards.tsx — if you make a prop required, the card
 * throws halfway through the first render.
 */

export type VerdictValue = "verificado" | "falso" | "engañoso" | "sin_evidencia";

export interface VerdictCardProps {
  verdict?: string;
  headline?: string;
  reasoning?: string;
  claimedBy?: string;
}

export interface ClaimCheckProps {
  title?: string;
  claims?: Array<{ claim?: string; status?: string; note?: string } | null> | null;
}

export interface SourcesListProps {
  title?: string;
  sources?: Array<{
    title?: string;
    url?: string;
    published?: string;
    quote?: string;
  } | null> | null;
}

/**
 * What the badge says. This is the display text only — the verdict ENUM
 * (`verificado` | `falso` | `engañoso` | `sin_evidencia`) is the contract with
 * the prompt and must not change here. Renaming a label is safe; renaming a
 * value breaks the card.
 */
const VERDICT_LABEL: Record<VerdictValue, string> = {
  verificado: "Info verdadera",
  falso: "Fake news",
  engañoso: "Engañoso",
  sin_evidencia: "Sin evidencia suficiente",
};

/** Compact labels for the per-claim rows, where space is tighter. */
const CLAIM_LABEL: Record<VerdictValue, string> = {
  verificado: "Verdadero",
  falso: "Falso",
  engañoso: "Engañoso",
  sin_evidencia: "Sin evidencia",
};

const VERDICT_HINT: Record<VerdictValue, string> = {
  verificado: "Las afirmaciones centrales se sostienen con fuentes.",
  falso: "Hay evidencia de que esto es incorrecto.",
  engañoso: "Los datos son ciertos, pero el marco o la fecha distorsionan lo que significan.",
  sin_evidencia: "No se encontró evidencia pública suficiente para dictaminar.",
};

function isVerdict(value?: string): value is VerdictValue {
  return (
    value === "verificado" ||
    value === "falso" ||
    value === "engañoso" ||
    value === "sin_evidencia"
  );
}

export function VerdictCard({ verdict, headline, reasoning, claimedBy }: VerdictCardProps) {
  const known = isVerdict(verdict);
  return (
    <article
      className={`ck-card ta-verdict${known ? ` ta-verdict--${verdict}` : ""}`}
    >
      <p className="ta-verdict-label">
        {known ? VERDICT_LABEL[verdict] : "Analizando…"}
      </p>
      <h3>{headline || "Revisando el mensaje…"}</h3>
      {known && <p className="ta-verdict-hint">{VERDICT_HINT[verdict]}</p>}
      {reasoning && <p>{reasoning}</p>}
      {claimedBy && (
        <p className="ta-verdict-claimed">
          <strong>Lo afirma el mensaje:</strong> {claimedBy}
        </p>
      )}
    </article>
  );
}

const CLAIM_MARK: Record<string, string> = {
  verificado: "✓",
  falso: "✗",
  engañoso: "!",
  sin_evidencia: "?",
  opinion: "—",
};

export function ClaimCheck({ title, claims }: ClaimCheckProps) {
  return (
    <article className="ck-card">
      <h3>{title || "Afirmaciones del mensaje"}</h3>
      {!claims?.length ? (
        <p>Separando las afirmaciones…</p>
      ) : (
        <ul className="ta-claims">
          {claims.map((claim, index) => {
            const status = claim?.status ?? "";
            return (
              <li key={index} className={status ? `ta-claim--${status}` : undefined}>
                <span className="ta-claim-mark" aria-hidden="true">
                  {CLAIM_MARK[status] ?? "·"}
                </span>
                <div>
                  <p className="ta-claim-text">{claim?.claim || "Cargando…"}</p>
                  {status && (
                    <span className="ta-claim-status">
                      {isVerdict(status)
                        ? CLAIM_LABEL[status]
                        : status === "opinion"
                          ? "Opinión, no verificable"
                          : status}
                    </span>
                  )}
                  {claim?.note && <p className="ta-claim-note">{claim.note}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

export function SourcesList({ title, sources }: SourcesListProps) {
  return (
    <article className="ck-card">
      <h3>{title || "Fuentes"}</h3>
      {!sources?.length ? (
        <p>Buscando evidencia…</p>
      ) : (
        <ol className="ta-sources">
          {sources.map((source, index) => (
            <li key={index}>
              {source?.url ? (
                <a href={source.url} target="_blank" rel="noreferrer noopener">
                  {source.title || source.url}
                </a>
              ) : (
                <span>{source?.title || "Cargando…"}</span>
              )}
              {source?.published && (
                <span className="ta-source-date"> · {source.published}</span>
              )}
              {source?.quote && <p className="ta-source-quote">“{source.quote}”</p>}
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}
