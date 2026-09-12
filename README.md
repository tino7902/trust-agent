# Trust Agent

**¿Esto es verdad?** Un verificador de mensajes reenviados que vive en el panel lateral
de Chrome, al lado de WhatsApp Web.

Seleccionás la cadena que te llegó al grupo familiar, tocás **Verificar**, y el agente
separa las afirmaciones, las contrasta con evidencia pública y te devuelve un veredicto
con fuentes que podés abrir. Sin salir de la conversación y sin copiar y pegar nada.

Construido para el hackathon [Agents,
Everywhere](https://aitinkerers.org/hackathons/global/agents-everywhere) (12–13 de
septiembre de 2026).

## Por qué vive dentro de WhatsApp

Porque el contexto es la mitad de la respuesta. Al leer la pantalla, el agente sabe
**quién** mandó el mensaje, **cuándo** y en qué conversación. Eso es lo que separa «una
cadena que circula desde 2019» de «un mensaje nuevo de un número desconocido» — y es
exactamente lo que se pierde al pegar el texto en un chatbot cualquiera.

## Correlo

Necesitás Node.js 22+ y Chrome.

```bash
npm ci
cp .env.example .env
```

Completá las dos claves en `.env`:

| Variable | Dónde sacarla | Para qué |
|---|---|---|
| `OPENROUTER_API_KEY` | [openrouter.ai/keys](https://openrouter.ai/keys) | El modelo. Tiene que soportar tool calling. |
| `EXA_API_KEY` | [dashboard.exa.ai/api-keys](https://dashboard.exa.ai/api-keys) | La búsqueda que respalda el veredicto. |

Arrancá el runtime:

```bash
npm run dev:web     # http://localhost:3100
```

Podés usarlo ya mismo pegando un mensaje en la caja del panel. Para la experiencia
completa sobre WhatsApp Web, cargá la extensión siguiendo
[`extension/README.md`](extension/README.md).

## El flujo

1. Abrís WhatsApp Web y seleccionás el mensaje que te reenviaron.
2. En el panel, **Capturar mensaje**.
3. El panel te muestra **el texto exacto que va a salir del navegador**. Todavía no se
   envió nada.
4. **Verificar** lo manda; **Descartar** hace que nunca salga.
5. El agente busca evidencia y responde con tres tarjetas: el veredicto, el desglose de
   afirmaciones y las fuentes.

El veredicto es uno de cuatro: **verificado**, **falso**, **engañoso** o **sin evidencia
suficiente**. El último es una respuesta legítima y muchas veces la correcta — el agente
tiene prohibido estirar una fuente débil para parecer útil, y tiene prohibido citar
cualquier URL que no haya devuelto la búsqueda.

## Cómo está armado

```
web.whatsapp.com → content script → panel lateral (confirmación) → iframe
                                                                      ↓
                                          localhost:3100 · CopilotKit React
                                                                      ↓
                                        /api/copilotkit · agente + Exa
```

El panel es una página de extensión, no DOM inyectado en WhatsApp: su CSP bloquearía un
iframe propio. La clave de Exa vive solo en el servidor; el navegador nunca la ve.

Detalles de implementación y reglas del repo en [`AGENTS.md`](AGENTS.md). Contexto
completo para sumarse al proyecto en [`HANDOFF.md`](HANDOFF.md).

## Tecnologías de sponsors

| Sponsor | Qué aporta |
|---|---|
| **CopilotKit** | React + runtime: contexto de la superficie, frontend tools y las tarjetas que el agente decide renderizar. |
| **OpenRouter** | Acceso al modelo (`openai/gpt-5-mini`). |
| **Exa** | La evidencia pública. Sin esto el agente avisa que no puede verificar, en lugar de inventar. |

## Verificar

```bash
npm run verify                  # typecheck + tests offline, sin cuentas reales
npm run build --workspace web
```

Los tests offline no hacen llamadas a proveedores. La verificación en vivo está
documentada en [`SUBMISSION.md`](SUBMISSION.md).

## Qué se hereda

Este repo arranca como copia del [starter kit de Agents,
Everywhere](https://github.com/CopilotKit/agents-everywhere-starter-kit) (MIT,
© 2026 CopilotKit). **El primer commit es el kit sin modificar; todo lo posterior es
trabajo del hackathon.**

Del kit quedan sin usar, intactos y con sus tests en verde: `apps/channel` (plantilla de
Slack), `apps/mobile` (Expo) y la integración de Ambiguous AI en `apps/web`. No los
borramos porque `npm run verify` los recorre y son nuestra red de seguridad.

## Límites

- Solo WhatsApp Web y solo Chrome.
- No lee audios: llegan como `blob:` y haría falta transcripción.
- No envía mensajes ni automatiza tu cuenta de WhatsApp. Lee la pantalla de tu propia
  sesión cuando se lo pedís, y solo el fragmento que elegís.
