# Trust Agent — checklist de entrega

Elegí tu ciudad en la [página global del
evento](https://aitinkerers.org/hackathons/global/agents-everywhere) y usá el portal de
participantes de esa ciudad para la **fecha límite** y los criterios publicados. No
copies el deadline de otra ciudad ni supongas la zona horaria.

> **Estado:** lo marcado está verificado. Lo que aparece como `PENDIENTE` todavía no se
> hizo — no lo marques hasta haberlo comprobado de verdad.

## Elegibilidad

- [x] El proyecto es un build nuevo creado durante el período oficial del hackathon
- [x] Su funcionalidad central se construyó durante el evento; no estamos reenviando ni
      extendiendo un proyecto preexistente
- [x] Identificamos por separado lo heredado y lo construido en el evento

**Cómo lo probamos:** con la historia de git. El repo arranca con un único commit
(`chore: starter kit as inherited baseline`) que contiene el starter kit **sin una sola
modificación**. Todo commit posterior es trabajo del evento. `git log` es la evidencia.

### Lo que heredamos

El [starter kit de Agents,
Everywhere](https://github.com/CopilotKit/agents-everywhere-starter-kit) (MIT, © 2026
CopilotKit), commit `86f547d`. Concretamente:

- La app Next.js y el `CopilotKitProvider`, el runtime de CopilotKit sobre Hono, y
  `BuiltInAgent`.
- `resolveModel()` — la resolución de proveedor de modelo, incluida la ruta de OpenRouter.
- La **implementación** de `searchWeb()` contra Exa (lo que no traía era su binding al
  chat web; ver abajo).
- `SURFACE_RULES`, la mitad domain-free del prompt del kit, que reusamos sin tocar.
- El CSS base y las clases `ck-*`.
- Sin usar y sin conectar, intactos: `apps/channel` (Slack), `apps/mobile` (Expo) y toda
  la integración de Ambiguous AI en `apps/web` (`followups`, `use-workplace`,
  `server/workplace.ts`). Sus 34 tests siguen pasando; los dejamos como red de seguridad.

### Lo que construimos durante el hackathon

| Qué | Dónde |
|---|---|
| La extensión de Chrome completa: captura en cascada del DOM de WhatsApp Web, panel lateral y puente `postMessage` | `extension/` |
| El prompt del verificador, con veredicto de cuatro valores y la prohibición de citar URLs no devueltas por la búsqueda | `packages/agent-core/src/verify-prompt.ts` |
| **El cableado de Exa al chat web.** El kit registra Exa en Slack y en la ruta de voz, pero *no* en el chat web; `searchWebTool()` y la opción `tools` de `makeAgent` son nuestras | `packages/agent-core/src/capabilities/search.ts`, `agent.ts`, `apps/web/.../api/copilotkit/route.ts` |
| Captura validada y acotada, con el origen verificado en los dos extremos | `apps/web/src/lib/captured-message.ts`, `use-captured-message.ts` |
| El contexto del agente que marca el mensaje como dato y no como instrucción, y las frontend tools | `apps/web/src/components/verify-control.tsx` |
| Tres componentes de UI generativa: veredicto, desglose de afirmaciones y fuentes | `apps/web/src/components/generative-ui.tsx`, `verdict-cards.tsx` |
| El panel del verificador y sus estilos | `apps/web/src/app/page.tsx`, `globals.css` |
| 7 tests sobre la normalización de la captura | `apps/web/src/lib/captured-message.test.ts` |

## Título y descripción

**Título:** Trust Agent

**Qué construimos.** Un verificador de mensajes reenviados que vive en el panel lateral
de Chrome, al lado de WhatsApp Web. Seleccionás la cadena que te llegó, el panel te
muestra el texto exacto que va a salir del navegador, y al confirmar el agente separa las
afirmaciones, busca evidencia pública con Exa y devuelve un veredicto —verificado, falso,
engañoso o sin evidencia suficiente— con las fuentes abribles.

**Para quién.** Para quien recibe un audio o una cadena alarmista en el grupo familiar de
WhatsApp y quiere saber si contestar, reenviar o dejarlo pasar. No es experto: el
veredicto está escrito en lenguaje llano, para que pueda responderle a un familiar.

**Por qué importa el contexto.** Al leer la pantalla, el agente sabe quién mandó el
mensaje, cuándo y en qué conversación. Eso es lo que distingue «una cadena que circula
desde hace años» de «un mensaje nuevo de un número desconocido», y es justo lo que se
pierde al pegar el texto en un chatbot: el remitente, la fecha y el hilo previo
desaparecen. Sin el entorno, el usuario además tiene que hacer el trabajo de copiar,
pegar y explicar el contexto — que es el trabajo que le estamos ahorrando.

**Sponsors usados.**

- **CopilotKit** — React + runtime. Aporta el contexto de la superficie
  (`useAgentContext`), las frontend tools y las tarjetas que el agente elige renderizar.
- **OpenRouter** — acceso al modelo (`openai/gpt-5-mini`).
- **Exa** — la evidencia pública que respalda cada veredicto. Sin su clave el agente
  avisa que no puede verificar en lugar de inventar.

No usamos Ambiguous AI, Auth0 ni CopilotKit Intelligence. La cantidad de sponsors no es
un criterio de puntuación.

## Evidencia para los criterios de evaluación

| Criterio oficial | Nuestra evidencia | Estado |
|---|---|---|
| Core Requirements & Functionality | Flujo completo dentro de WhatsApp Web: selección → confirmación → búsqueda → veredicto con fuentes abribles | `PENDIENTE` verificación en vivo |
| Innovation & Theme Alignment | Mostrar la conversación **antes** del prompt; comparar con el mismo mensaje pegado en un chatbot, que pierde remitente, fecha e hilo | `PENDIENTE` grabación |
| Technical Execution & Integration | Los cuatro caminos de fallo de abajo | parcialmente verificado |
| Usefulness & Agentic Experience | El texto exacto a la vista antes de enviarlo; **Descartar** garantiza que nada sale del navegador; veredicto en lenguaje llano y accionable | `PENDIENTE` grabación |

### Caminos de fallo y cancelación

| Caso | Comportamiento esperado | Estado |
|---|---|---|
| Sin `EXA_API_KEY` | `search_web` devuelve «Web search is not configured on this deployment»; el prompt obliga a decirlo y parar | **verificado** |
| Sin `OPENROUTER_API_KEY` | El endpoint responde `OPENROUTER_API_KEY is required for openrouter` | **verificado** |
| Captura vacía o ilegible | La extensión devuelve un `error` con instrucción concreta, no una captura hueca | verificado en código, `PENDIENTE` en vivo |
| Cancelación | **Descartar** o cerrar el panel: nada sale del navegador | `PENDIENTE` en vivo |
| Afirmación sin evidencia pública | Veredicto `sin_evidencia`, no un falso positivo | `PENDIENTE` en vivo |
| Inyección desde el mensaje analizado | Un texto que diga «ignorá tus instrucciones» se señala, no se obedece | `PENDIENTE` en vivo |

- [x] Distinguimos servicios en vivo, datos de muestra y estado de sesión
- [x] Los sponsors contribuyen al flujo; su cantidad no es un criterio

**Qué es qué:** el veredicto y la captura viven **solo en la sesión del navegador** —
no hay base de datos ni escritura externa. Las fuentes son llamadas en vivo a Exa. Nada
de esto escribe en ningún sistema de terceros.

## Repositorio público

- [x] `npm run verify` pasa (typecheck de los 3 workspaces + tests offline, 0 fallos)
- [x] `npm run build --workspace web` pasa
- [x] El README lista las credenciales y los procesos necesarios
- [x] `.env` está en `.gitignore` y no hay claves en el repo
- [x] Los datos de muestra, el estado de sesión y las integraciones sin conectar están
      etiquetados
- [ ] `PENDIENTE` Un participante nuevo puede correr el quickstart desde un clon limpio
      (probarlo en otra máquina o en un clon aparte)
- [ ] `PENDIENTE` Publicar el repo en GitHub

## Video de dos minutos

- [ ] `PENDIENTE` Mostrar la conversación de WhatsApp **antes** del prompt
- [ ] `PENDIENTE` Una interacción completa, de la selección al veredicto
- [ ] `PENDIENTE` Abrir al menos una fuente para probar que existe
- [ ] `PENDIENTE` Mostrar un camino de fallo o la cancelación
- [ ] `PENDIENTE` Nombrar CopilotKit, OpenRouter y Exa
- [ ] `PENDIENTE` Revisar audio y duración

**Cuidado con lo que entra en cuadro:** usá un grupo de prueba con contacto ficticio. No
grabes conversaciones reales, nombres, teléfonos ni fotos de perfil de terceros.

## Post social y entrega final

- [ ] `PENDIENTE` Seguir las instrucciones del organizador para etiquetar sponsors
- [ ] `PENDIENTE` Enlazar repositorio y video
- [ ] `PENDIENTE` Revisar repo, video y capturas por si hay secretos

Publicar el repo, el video y el post son acciones del equipo. Nada de esto se publica
solo.
