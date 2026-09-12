# Extensión de Chrome

La superficie de Trust Agent: lee el mensaje que tenés en pantalla en WhatsApp Web o el
mail abierto en Gmail y lo manda al verificador que corre en `localhost:3100`.

## Instalar

1. Arrancá el runtime primero, desde la raíz del repo:
   ```bash
   npm run dev:web
   ```
   El panel carga `http://localhost:3100` dentro de un iframe; sin eso solo ves
   el error de carga.
2. Abrí `chrome://extensions`.
3. Activá **Modo de desarrollador** (arriba a la derecha).
4. **Cargar descomprimida** → elegí esta carpeta (`extension/`).
5. Abrí `https://web.whatsapp.com` o `https://mail.google.com` y **recargá la pestaña**
   si ya estaba abierta:
   el content script solo se inyecta al cargar la página.
6. Clic en el icono de la extensión para abrir el panel lateral.

## Usar

1. Seleccioná con el mouse el texto del mensaje o mail que querés verificar.
2. En el panel, tocá **Capturar mensaje** o **Capturar mail**.
3. El panel te muestra **el texto exacto que va a salir del navegador**. Nada se
   envió todavía.
4. Tocá **Verificar** para mandarlo, o **Descartar** para que no salga nada.

## Cómo está armado

```
content/whatsapp.js   lee el DOM de WhatsApp · responde cuando el panel pregunta
content/gmail.js      lee el mail abierto en Gmail · responde cuando el panel pregunta
background.js         abre el panel al clic en el icono
sidepanel/panel.js    captura → muestra → confirma → postMessage al iframe
sidepanel/panel.html  el iframe a localhost:3100
```

El panel es una **página de extensión**, no DOM inyectado en WhatsApp o Gmail. Eso es
deliberado: sus CSP bloquearían un iframe o un bundle inyectado en la página. Al vivir
en `chrome-extension://`, la CSP la controlamos nosotros y la app de Next.js queda
intacta adentro.

## Dos reglas al tocar este código

**`getSelection()` es el cimiento, los selectores son el atajo.** WhatsApp y Gmail usan
clases generadas que pueden cambiar sin aviso. La ruta de selección no depende de ningún
selector y por eso es la primaria. Si la lectura del DOM falla, `capture()` devuelve
`{ error }` con una instrucción concreta — nunca un objeto vacío que parezca una captura
buena.

**El origen se valida en los dos extremos.** El panel solo hace `postMessage` a
`http://localhost:3100`, y la página solo acepta mensajes de
`chrome-extension://`. Cualquier pestaña puede mandar mensajes a un frame que
alcance; sin esa comprobación, una página cualquiera podría inyectar texto y
hacer que el agente lo verifique como si viniera de WhatsApp o Gmail.

## Límites

- Solo WhatsApp Web, Gmail y Chrome (usa `chrome.sidePanel`).
- No lee audios ni adjuntos: los primeros llegan como `blob:` y los adjuntos requerirían
  una confirmación y procesamiento extra.
- No envía mensajes, mails ni automatiza ninguna cuenta. Lee la pantalla de tu propia
  sesión cuando se lo pedís, y solo el fragmento que elegís.
