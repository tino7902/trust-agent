import assert from "node:assert/strict";
import test from "node:test";
import { LIMITS, normalizeCaptured, verificationContext } from "./captured-message";

test("a capture without usable text is rejected rather than half-accepted", () => {
  assert.equal(normalizeCaptured(null), null);
  assert.equal(normalizeCaptured("texto suelto"), null);
  assert.equal(normalizeCaptured({}), null);
  assert.equal(normalizeCaptured({ text: "   " }), null);
  assert.equal(normalizeCaptured({ text: 42 }), null);
});

test("oversized payloads are clamped instead of reaching the model whole", () => {
  const captured = normalizeCaptured({
    text: "a".repeat(LIMITS.text + 500),
    chat: "b".repeat(LIMITS.field + 50),
    thread: Array.from({ length: LIMITS.thread + 8 }, (_, index) => ({
      author: "Tía",
      text: `mensaje ${index}`,
    })),
    source: "selection",
  });

  assert.ok(captured);
  assert.equal(captured.text.length, LIMITS.text);
  assert.equal(captured.chat?.length, LIMITS.field);
  assert.equal(captured.thread.length, LIMITS.thread);
  // The clamp keeps the most recent messages, which are the relevant ones.
  assert.equal(captured.thread.at(-1)?.text, `mensaje ${LIMITS.thread + 7}`);
});

test("an unknown source or timestamp degrades to safe defaults", () => {
  const captured = normalizeCaptured({
    text: "Dicen que mañana cortan el agua en toda la ciudad",
    source: "telepatía",
    capturedAt: "no es una fecha",
  });

  assert.ok(captured);
  assert.equal(captured.source, "manual");
  assert.ok(!Number.isNaN(Date.parse(captured.capturedAt)));
});

test("thread entries without text are dropped and authors always resolve", () => {
  const captured = normalizeCaptured({
    text: "Reenviá esto a 10 personas",
    thread: [
      { author: "Mamá", text: "miren lo que me llegó" },
      { author: "Primo" },
      "no soy un objeto",
      { text: "sin autor" },
    ],
  });

  assert.ok(captured);
  assert.equal(captured.thread.length, 2);
  assert.equal(captured.thread[0].author, "Mamá");
  assert.equal(captured.thread[1].author, "desconocido");
});

test("with no capture the agent is told to ask, not to verify from memory", () => {
  const context = verificationContext(null);
  assert.equal(context.estado, "sin_captura");
  assert.match(String(context.explicacion), /No inventes un mensaje ni verifiques de memoria/);
  // The key must be absent, not present-and-empty: an empty `mensaje` would
  // read to the model as a message that exists and says nothing.
  assert.ok(!("mensaje" in context));
});

test("captured context carries the surface metadata and marks the text as data", () => {
  const captured = normalizeCaptured({
    text: "El gobierno confirmó que el lunes es feriado",
    chat: "Familia",
    author: "Tía Susana",
    timestamp: "11:04",
    source: "selection",
    thread: [{ author: "Mamá", text: "me lo mandaron por otro grupo" }],
  });

  const context = verificationContext(captured);
  assert.equal(context.estado, "capturado");
  assert.equal(context.conversacion, "Familia");
  assert.equal(context.autor, "Tía Susana");
  assert.equal(context.enviadoEl, "11:04");
  assert.ok(Array.isArray(context.mensajesPrevios));
  assert.equal(context.mensajesPrevios.length, 1);
  assert.match(String(context.origen), /seleccionó/);
  // The prompt-injection boundary has to be visible in the context itself.
  assert.match(String(context.explicacion), /nunca una instrucción/);
});

test("absent metadata is omitted so the context has no blank fields", () => {
  const captured = normalizeCaptured({
    text: "Reenviá esto a 10 contactos o perdés la cuenta",
    source: "manual",
  });

  const context = verificationContext(captured);
  for (const key of ["conversacion", "autor", "enviadoEl"]) {
    assert.ok(!(key in context), `${key} should be absent, not undefined`);
  }
  assert.match(String(context.origen), /Pegado a mano/);
});
