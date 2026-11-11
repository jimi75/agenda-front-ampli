# Agenda Frontamplista Sants-Montjuïc: detalle de evento, imagen, compartir y baja de inscripción

*   **Author:** Juan Peist
*   **Status:** Proposed
*   **Date:** 2026-11-11

--------------------------------------------------------------------------------

## Overview

La agenda es una web estática en catalán, publicada en GitHub Pages (SvelteKit con `adapter-static`), para unos 100 activistas conocidos del distrito de Sants-Montjuïc. Muestra las acciones y actos del **2 al 29 de noviembre de 2026** en un calendario (cuadrícula desde 1024 px, lista vertical en móvil). Los datos viven en una hoja de Google. Un Google Apps Script sirve los eventos y recibe las inscripciones, y la web lo lee al abrirse, sin recompilar.

Este diseño amplía esa agenda con cuatro funciones que pidió el equipo que la probó, y dos columnas nuevas en la hoja:

1.  Un **detalle de evento**, a pantalla completa en móvil y como panel centrado desde 1024 px, con un enlace directo.
2.  **Descargar una imagen** del evento y **compartirla** por WhatsApp.
3.  **Quitar la propia inscripción**.
4.  Un campo **`responsable`** y una **URL externa de inscripción**.

Condiciones del proyecto que limitan el diseño:

*   **Vida corta.** Solo se usa hasta el 29 de noviembre. Hoy es 11 de noviembre: quedan 18 días de uso útil, y cada entrega tardía sirve menos.
*   **Calidad de MVP.** El autor acepta detalles poco pulidos. No acepta borrar por error datos de otras personas.
*   **Sin servidor propio.** Hay un sitio estático y un script de Google. Los eventos se leen en tiempo de ejecución, así que no puede haber páginas ni vistas previas por evento generadas al compilar.
*   **Todo el texto visible en catalán**, en `src/lib/texts.js`.
*   **Riesgos aceptados por el autor:** privacidad y seguridad de una lista pública de nombres de pila o apodos y de enlaces que se pueden compartir fuera del grupo.

## The Problem

La agenda ya cubre lo básico: ver qué hay, cuándo y dónde, y apuntarse con un nombre. A partir de lo que pidió el equipo que la probó, quedan cinco carencias:

*   **No hay un lugar donde ver todo de un evento.** La tarjeta del calendario es pequeña. Un activista no puede abrir un evento concreto ni mandar a alguien un enlace que lo abra.
*   **No se puede difundir un evento.** Quien quiere invitar a otros por WhatsApp tiene que hacer una captura o escribir el texto a mano.
*   **Una inscripción hecha por error no se puede quitar.** Hoy el script solo añade filas. Solo el dueño de la hoja puede corregirlo, borrando la fila a mano.
*   **No se ve quién lleva cada evento.** La hoja no tiene ese dato.
*   **Algunos eventos se inscriben en otra web.** El botón «Participar» abre siempre el formulario interno y no deja redirigir.

**Solución propuesta.** Una vista de detalle (a pantalla completa en móvil y como panel centrado desde 1024 px) con la información completa, la imagen, el compartir y los datos nuevos. El modal de inscripción se reduce al formulario y a quitar la propia participación. El script gana una acción de baja. La hoja gana dos columnas opcionales. Se entrega en cinco pasos, R0 a R4, para no romper la web publicada: el script se actualiza siempre primero y la baja, que es lo único que borra datos de terceros, va la última.

## Goals

Cada objetivo se puede comprobar:

*   **G1. Detalle de evento.** Cada tarjeta tiene un enlace «detall», pequeño y en texto normal, arriba a la derecha y en la línea del tipo. Abre el detalle, a pantalla completa por debajo de 1024 px y como panel centrado desde 1024 px, con: tipo, nombre, fecha y hora, lugar con enlace a Google Maps, responsable, recuento, lista de apuntados y «Participar». Un enlace directo `…/?e=<id>` abre ese detalle al cargar. Tocar la tarjeta fuera de un enlace o botón no hace nada.
*   **G2. Imagen descargable.** «Descarrega la imatge» baja un PNG de **exactamente 2048 × 1346 px** con solo: título de la agenda (el de la cabecera, pequeño), tipo, nombre, día, inicio y fin, y lugar. Sin botones, enlaces, recuento ni responsable.
*   **G3. Compartir por WhatsApp.** «Comparteix» envía la imagen junto con un texto en catalán con el enlace al detalle, usando la Web Share API con archivos donde el navegador la admita (Chrome Android 76+, Safari iOS 14+, Samsung Internet 11+, Edge 81+). Donde no, ofrece un enlace `wa.me` solo con texto y un botón «Copia l’enllaç». Si el navegador rechaza el compartir porque la activación del usuario caducó mientras se generaba la imagen, la web conserva la imagen y pide un segundo toque. La descarga funciona siempre.
*   **G4. Quitar la propia inscripción.** Una persona puede quitar una inscripción suya solo desde el navegador donde se apuntó, y solo mientras el evento no haya pasado. El script archiva el nombre antes de borrar la fila, y nadie más puede quitarla.
*   **G5. Campos nuevos en la hoja.** `responsable` (solo un nombre) se ve en la tarjeta y en el detalle. `inscripcio_url`, si tiene valor, hace que «Participar» abra esa web y oculta el recuento y la lista de ese evento.
*   **G6. Modal de inscripción reducido.** Solo el formulario y «La teva participació / Desapuntar-me», sin la lista de apuntados, que se ve en el detalle.
*   **G7. Todo en catalán, sin romper lo publicado.** Los textos nuevos van en `src/lib/texts.js`. Las entregas siguen el orden R0 a R4, el script siempre primero y siempre aditivo, y antes de cada cambio del script se guarda en Git el código que está desplegado. `npm run check` y `npm test` pasan en cada entrega.

## Non-Goals

*   Teléfono o enlace directo de WhatsApp del responsable. Se descartó para no publicar su móvil.
*   Páginas o vistas previas por evento generadas al compilar. Los eventos se leen en tiempo de ejecución, así que no es posible.
*   Abrir el detalle tocando la tarjeta.
*   Enviar la imagen a un chat concreto, o limitar la hoja de compartir a WhatsApp. El navegador no lo permite.
*   Quitar una inscripción desde otro navegador o dispositivo, con PIN, cuenta, cookies, IndexedDB o una copia del registro en el servidor.
*   Un contacto en pantalla para pedir correcciones o borrados de nombres. Se elimina del modal la frase actual.
*   Seguimiento preciso de quién se apunta en los eventos con URL externa.
*   Vista previa de la imagen, plantillas, ajuste automático avanzado del tamaño del texto, `v:2` de la API, una pantalla propia de «evento no encontrado», comparaciones de la imagen píxel a píxel con una referencia y una caché de `doGet`.
*   Reforzar la privacidad o la seguridad más allá de lo ya aceptado.

## Open Questions

Las cinco decisiones de arquitectura que estaban abiertas las tomó el autor y figuran en «Decisiones de arquitectura» del Plan Técnico. Quedan estas preguntas.

Por verificar durante la implementación (se pueden comprobar en el entorno de desarrollo):

*   Si `html-to-image` 1.11.13 incluye la opción `stabilizationAttempts` (su README en la rama `master` la documenta para el pintado en blanco de WebKit; no se comprobó que venga en esa versión). Si no, el respaldo es pintar dos veces y quedarse con el segundo resultado.
*   Que `pixelRatio: 1` sobre un elemento de 2048 × 1346 px CSS da un PNG de exactamente 2048 × 1346, también en un móvil con pantalla de alta densidad (el valor por defecto de la librería usa la densidad del dispositivo y daría otro tamaño). Se comprueba leyendo la cabecera del PNG.
*   Que la librería incrusta las dos fuentes (`Special Gothic Condensed One` y `Special Gothic Variable`) leyendo sus `@font-face`, que se sirven desde `/agenda-front-ampli/_app/…` en producción.

Comprobaciones que solo puede hacer el autor en móvil real (no se pueden verificar desde el entorno de desarrollo):

*   Si WhatsApp en iPhone conserva el texto junto a la imagen adjunta.
*   Si el navegador integrado de WhatsApp permite descargar, compartir y guardar `localStorage` compartido con Safari o Chrome.
*   Si el render con `html-to-image` a 2048 × 1346 funciona en un iPhone antiguo y en Android de gama baja, y si Safari pinta bien las fuentes y no deja la imagen en blanco.
*   Qué hace el botón Atrás en Android con el detalle abierto. Con la decisión elegida sale de la agenda (vuelve a WhatsApp si venía de ahí). Confirmar que es aceptable.
*   La versión del script que está desplegada hoy. Hay que anotarla y copiar la hoja antes de R2.

## Critical User Journeys (CUJs)

### CUJ 1: Abrir el detalle desde el calendario

*   **Given**: la agenda está cargada y hay un evento futuro, no cancelado y sin URL externa.
*   **When**: la persona toca «detall» en la tarjeta.
*   **Then**: se abre el detalle (a pantalla completa por debajo de 1024 px, como panel centrado con el calendario visible detrás desde 1024 px) con tipo, nombre, fecha y hora, lugar con enlace a Google Maps, responsable (si lo hay), recuento, lista de apuntados y «Participar». La barra de direcciones no cambia. Se cierra con «Tanca» o con Esc. El botón Atrás sale de la agenda.

### CUJ 2: Abrir un enlace compartido

*   **Given**: alguien recibe por WhatsApp `…/agenda-front-ampli/?e=paradeta-1`.
*   **When**: lo abre.
*   **Then**: la agenda carga y, al terminar, abre el detalle de ese evento sin desplazarse al próximo día. Si el id no existe en una carga reciente, sale el aviso «Aquesta activitat ja no existeix» y el calendario. Si solo hay copia sin conexión y no contiene el id, sale «No s’ha pogut comprovar l’activitat». Un evento pasado o cancelado se abre en solo lectura.

### CUJ 3: Apuntarse y quitar la propia inscripción

*   **Given**: un evento futuro con inscripciones abiertas y un navegador sin registro de ese evento.
*   **When**: la persona pulsa «Participar», escribe un nombre y envía. Más tarde vuelve al mismo evento desde el mismo navegador.
*   **Then**: el nombre aparece en la lista y el navegador guarda un registro local (evento, `requestId`, nombre). Al reabrir el modal sale «La teva participació» con el nombre y «Desapuntar-me». Tras dos toques de confirmación, el script archiva el nombre en `Baixes`, borra la fila y el nombre desaparece de la lista. Desde otro navegador no aparece ese botón. En un evento pasado tampoco.

### CUJ 4: Descargar la imagen

*   **Given**: un evento futuro y no cancelado, con el detalle abierto.
*   **When**: pulsa «Descarrega la imatge».
*   **Then**: la web genera un PNG de 2048 × 1346 px con el título de la agenda, tipo, nombre, día, inicio y fin, y lugar, y lo descarga como `agenda-<id>.png`. Mientras genera, el botón muestra «Generant…» y no admite otro toque.

### CUJ 5: Compartir por WhatsApp

*   **Given**: un evento futuro y no cancelado, con el detalle abierto, en un navegador que admite compartir archivos.
*   **When**: pulsa «Comparteix».
*   **Then**: la web genera la imagen y abre la hoja del sistema con la imagen y el texto «Apunta’t a l’activitat aquí: <url>». Si el navegador rechaza por activación caducada, el botón pasa a «Imatge preparada: prem de nou» y el segundo toque abre la hoja. En un navegador sin soporte de archivos, descarga la imagen y muestra un enlace `wa.me` solo con el texto, con el aviso de adjuntar la imagen. «Copia l’enllaç» está siempre disponible.

### CUJ 6: Evento con inscripción en una web externa

*   **Given**: la hoja tiene una URL https en `inscripcio_url` de un evento futuro y no cancelado.
*   **When**: la persona pulsa «Participar», en la tarjeta o en el detalle.
*   **Then**: se abre esa web en una pestaña nueva y no se abre el modal. Ni la tarjeta ni el detalle muestran recuento ni lista de ese evento.

### CUJ 7: El autor publica una entrega sin romper la web

*   **Given**: la web está publicada y el script desplegado en una versión conocida.
*   **When**: el autor sigue el orden de la entrega: primero el script, después la web y, al final, los datos nuevos de la hoja.
*   **Then**: antes de tocar el script, el código desplegado queda guardado y etiquetado en Git. Cada paso se puede deshacer: la web con `git revert` y el script volviendo a su versión anterior (o, si esa versión ya no existe, pegando el archivo etiquetado en el editor y desplegando una versión nueva). Una caída momentánea de la web mientras se despliega es aceptable.

## Technical Plan (Architecture)

### Decisiones de arquitectura

Elegidas por el autor entre varias opciones, cada una con sus riesgos explicados:

| Decisión | Elección |
|---|---|
| Historial y botón Atrás del detalle | **A. Sin historial.** Abrir o cerrar el detalle no toca la URL ni el historial. `?e=<id>` solo se lee al cargar. |
| Cómo se dibuja la imagen | **Librería que convierte HTML en imagen: `html-to-image` 1.11.13** (MIT; se añade como dependencia). |
| Cuándo se renderiza la imagen | **Al pulsar el botón** (no antes). |
| Qué envía «Comparteix» y qué pasa si falla | **Un solo `navigator.share({files, text})` con segundo toque** si el navegador rechaza por activación caducada. Respaldo a descarga más `wa.me` si no hay soporte de archivos o hay otro error. |
| Cómo se carga la librería | **Importación estática**: va en el paquete principal (unos 7 KB comprimidos más). |
| Backup del script | **Git: el código desplegado se guarda y se etiqueta `script-vN`** antes y después de cada cambio del script (N = número de versión de Apps Script). |
| Detalle en pantallas grandes | **B.** Pantalla completa por debajo de 1024 px y panel centrado desde 1024 px. |
| Pruebas de los flujos de navegador | **A. Playwright dentro del repositorio** (`@playwright/test`, Chromium y WebKit en el CI; si fallan, no se despliega). |

Decididas antes: la baja usa `deleteRow` con archivo en `Baixes`; columnas nuevas al final de la hoja (J = `responsable`, K = `inscripcio_url`) con cabeceras escritas a mano; el script va primero, siempre aditivo; la contradicción entre «mensaje único con imagen y enlace» y los dos botones separados se resolvió manteniendo el mensaje único.

### Visión general

```text
Hoja de Google (la edita el autor)
  Esdeveniments (A:K)   Inscripcions   Baixes (nueva, archivo)   Config
        │                    ▲  │             ▲
        ▼                    │  │             │ archiva el nombre y borra la fila
 Apps Script (Code.gs)       │  └─────────────┘
   doGet ?action=agenda      │
   doPost {signup | unsignup}│  (text/plain, siempre HTTP 200 + JSON)
        │                    │
        ▼                    │
 Web estática (GitHub Pages)
   +page.svelte ── estado: detailId, signupId, agenda, registro local
     ├─ Calendar → EventCard   (enlace «detall», Participar, Maps, responsable)
     ├─ EventDetail (pantalla completa en móvil, panel desde 1024 px)  ── PosterView (oculto, para la imagen)
     │      └─ Participar → SignupDialog (formulario + «La teva participació»)
     ├─ api.js        (signup devuelve requestId · unsignup · features)
     ├─ my-signups.js (registro local en localStorage)
     ├─ poster.js     (html-to-image → PNG 2048 × 1346)
     └─ share.js      (navigator.share, wa.me, copiar enlace)
```

### Datos: hoja y script

*   **`Esdeveniments`.** Dos columnas opcionales nuevas: J `responsable` (texto, se muestra hasta 60 caracteres) y K `inscripcio_url` (solo `https://`, hasta 500 caracteres; si no es válida se trata como vacía y `?admin` la avisa). Las cabeceras se escriben a mano en J1 y K1, con formato de texto en J:K y la protección ampliada a J1:K1. `readTable_` ya lee por nombre de cabecera, así que `setup()` no cambia y los dos campos no son obligatorios.
*   **`Baixes` (nueva).** Archivo solo de añadir filas: `data_hora_baixa`, `event_id`, `nom`, `request_id`. Se crea al vuelo la primera vez que se da de baja a alguien.
*   **`doGet`.** La respuesta mantiene `v: 1` y añade `features: ['unsignup', 'responsable', 'inscripcio_url']`, `missingOptionalColumns` y, en cada evento, `responsable` e `inscripcio_url`. No devuelve nunca `request_id`.
*   **`doPost`.** Se ramifica por `action` justo después de leer el cuerpo y antes de validar el nombre:
    *   `signup` mantiene sus comprobaciones y añade una: si el `requestId` ya está en `Inscripcions` o en `Baixes`, responde `ok` con los nombres actuales sin escribir nada. Así un reenvío tardío, pasados los 600 s de la caché, no reinscribe a quien ya se dio de baja.
    *   `unsignup` recibe `{action, eventId, requestId}`, valida solo `eventId` (máximo 20 caracteres) y `requestId`, toma el mismo lock, y no mira B1 ni si el evento existe. Busca la fila por `event_id` más `request_id` (no vacío), la relee en ese índice y comprueba que siguen los mismos dos valores (si no, la busca otra vez), añade el nombre a `Baixes` y borra la fila. Responde `{ok:true, v:1, eventId, names, removed}`. Si no la encuentra, `removed:false` con la lista actual. Errores posibles: `bad_request`, `busy`, `server`.

### Web: estado, detalle y enlace directo

*   **Estado de la página.** `+page.svelte` sustituye `selectedId` por dos: `detailId` y `signupId`. Cerrar el modal pequeño no cierra el detalle. «Veure apuntats» (modo lectura) abre el detalle.
*   **Enlace directo.** `?e=<id>` se lee en `onMount` después de la primera carga correcta y abre el detalle. En ese caso no se ejecuta el desplazamiento al próximo día. La URL para compartir es `location.origin + location.pathname + '?e=' + encodeURIComponent(id)`. No arrastra `?admin` y no depende de ninguna API de SvelteKit. Con la decisión de no tocar el historial, el enlace se construye siempre así y la barra de direcciones no refleja el evento abierto.
*   **El evento desaparece con el detalle abierto.** El detalle conserva una copia del evento y muestra «Aquesta activitat ja no existeix» con las acciones desactivadas. No se vacía bajo el dedo.
*   **Enlace «detall».** Es un `<a href="?e=<id>">` pequeño, en texto normal, arriba a la derecha en la línea del tipo. Anula el tamaño, las mayúsculas y el espaciado heredados de la etiqueta de tipo. Tiene una zona táctil de al menos 24 × 24 px (mejor 44 px) con relleno invisible, y un `aria-label` con el nombre y la fecha del evento.
*   **Diálogos.** El detalle es un `<dialog>`: a pantalla completa por debajo de 1024 px y, desde 1024 px, un panel centrado de ancho limitado, con scroll interno y fondo atenuado en el que se ve el calendario. El de inscripción se abre encima. Esc cierra el de arriba. El bloqueo de scroll existente sirve para ambos.

### Estados y acciones

Una función pura `participationState(event, {today, signupsOpen})` decide el estado, con esta prioridad: pasado, cancelado, externo, cerrado, abierto. Sustituye la lógica duplicada de `EventCard` y `+page.svelte`. Un evento es pasado si su fecha es anterior a hoy en `Europe/Madrid`.

| Estado | «Participar» | «Desapuntar-me» | Descarrega, Comparteix, Copia l’enllaç | Recuento y lista |
|---|---|---|---|---|
| Pasado | No | No | No | Visibles, solo lectura |
| Cancelado | No | Sí | No | Visibles |
| Con URL externa | Abre la web externa y ignora B1 | No | Sí | Ocultos |
| Cerrado (B1 = NO) | No; muestra «Les inscripcions estan tancades» | Sí | Sí | Visibles |
| Abierto | Abre el modal | Sí, si hay registro local | Sí | Visibles |

«Desapuntar-me» solo se ofrece si hay registro local de ese evento en este navegador y `features` incluye `unsignup`.

### Imagen

*   **Elemento.** Un componente `PosterView` con tamaño fijo de 2048 × 1346 px CSS, fuera de pantalla pero dentro del DOM (no `display:none`), con título de la agenda (`T.siteTitle`, pequeño), tipo, nombre, día, inicio y fin, y lugar. Los colores por tipo salen de las variables CSS existentes, porque la librería copia los estilos calculados. Sin botones, enlaces, recuento ni responsable. Se monta solo cuando se pulsa un botón y se desmonta al terminar.
*   **Generación.** Antes de capturar, espera a que carguen las dos fuentes con el texto real (`document.fonts.load`). Pide a `html-to-image` un PNG con `pixelRatio: 1` fijado explícitamente, de modo que el tamaño del PNG es el del elemento: 2048 × 1346. Sin fijarlo, la librería usa la densidad de píxeles del dispositivo y un móvil con pantalla 3x produciría una imagen de 6144 × 4038. Después comprueba el tamaño leyendo la cabecera del PNG y, si no es 2048 × 1346, lo trata como error. La librería se importa de forma estática.
*   **Archivo.** El resultado es un `File` llamado `agenda-<id>.png`. Se guarda en memoria mientras el detalle está abierto, asociado a los datos del evento, y se descarta si un refresco cambia el evento. Lo usan la descarga y el segundo toque de compartir.
*   **Descarga.** Un `<a download>` temporal sobre una URL de objeto.

### Compartir

*   **Texto.** `T.share.text(url)` devuelve «Apunta’t a l’activitat aquí: <url>». Es un marcador de posición del autor y vive en `texts.js`.
*   **Flujo de «Comparteix»**, con la decisión de renderizar al pulsar y segundo toque:

```text
idle ──toque──► generando ──ok──► share({files, text}) ──ok──► idle
                   │                    ├─ AbortError ──────────► idle (no hace nada)
                   │                    ├─ NotAllowedError ─────► preparada (archivo en memoria,
                   │                    │                          botón «Imatge preparada: prem de nou»)
                   │                    └─ otro error / sin
                   │                       soporte de archivos ──► respaldo: descarga la imagen +
                   │                                                enlace wa.me solo con texto + aviso
                   └─ error al generar ──► idle + mensaje «No s’ha pogut generar la imatge»

preparada ──toque──► share({files, text}) llamado sin await previo ──► idle / respaldo
```

*   **Respaldo.** `wa.me` se muestra como un `<a target="_blank" rel="noopener noreferrer">` real con `?text=` codificado, no con `window.open`. «Copia l’enllaç» copia la URL del detalle y funciona en todos los navegadores.
*   **Doble toque.** Mientras se genera, el botón está desactivado.

### Baja de inscripción en el navegador

*   **Registro local.** `my-signups.js` guarda en `localStorage`, con una clave propia distinta de la copia de la agenda, `{v:1, items:[{eventId, requestId, name, at}]}`. Máximo 50 registros y caducidad de 45 días. Tolera JSON corrupto y que `localStorage` no exista.
*   **Alta.** `api.signup` genera el UUID antes del `try` y lo devuelve en el resultado, también por la ruta de recuperación. Cuando el resultado es `ok`, `createApi` guarda el registro con el `storage` que ya se le inyecta. Esto empieza a funcionar desde la primera entrega web, antes de que exista `unsignup`.
*   **Baja.** En «La teva participació», cada registro tiene «Desapuntar-me» con confirmación en dos toques. `api.unsignup(eventId, requestId)` envía el `POST` de texto plano. Con `ok` se quita el registro local y se actualiza la lista con los `names` de la respuesta. Con `removed:false` se quita el registro y se muestra «Ja no hi eres a la llista». Con error de red o `busy` se conserva el registro y se pide reintentar: como `unsignup` es idempotente, basta repetir con el mismo `requestId`, sin el mecanismo de recuperación de `signup`.

### Textos

Todos los textos nuevos, en catalán, van a `src/lib/texts.js`, agrupados en detalle, participación, compartir e imagen. Se elimina la frase «Si t’has equivocat, escriu a qui organitza…», y `dialog.listTitle` pasa al detalle. `Header.svelte` pasa a usar `T.siteTitle` en lugar de repetir el título a mano.

### Backup y restauración del script

El código del script existe en dos sitios que nada obliga a mantener iguales: `apps-script/Code.gs` y `apps-script/appsscript.json` en el repositorio, y el proyecto de Apps Script, donde se pega a mano. El backup consiste en guardar en Git, con una etiqueta, el código exacto que está desplegado, antes de cada cambio.

**Procedimiento antes y después de cada entrega que toque el script (R2 y R4):**

1.  **Anotar la versión en uso.** En «Gestionar implementaciones», apuntar el número de versión N que usa la implementación de la web.
2.  **Capturar el estado real.** Copiar el contenido de `Código.gs` y de `appsscript.json` del editor sobre los archivos de `apps-script/` y ejecutar `git diff`. Si hay diferencias, el repositorio estaba desviado: hacer commit de ese estado como «script: estado real desplegado (versión N)» antes de cambiar nada.
3.  **Etiquetar el estado anterior.** `git tag -a script-vN -m "Apps Script versión N, antes de R2"` sobre ese commit y `git push --tags`.
4.  **Desplegar.** «Gestionar implementaciones → ✎ → Versión nueva», con la descripción de la entrega. La URL `/exec` no cambia. Será la versión N+1.
5.  **Verificar** con las comprobaciones del README (la lectura y los `POST` que no escriben) y las propias de la entrega.
6.  **Etiquetar lo desplegado.** Pegar de nuevo el contenido del editor sobre `apps-script/`: `git diff` debe salir vacío. Entonces `git tag -a script-v(N+1) -m "Apps Script versión N+1: R2"` y `git push --tags`.
7.  **Registrar** en el README la correspondencia entre versión de Apps Script, etiqueta y entrega.

**Restauración si una entrega falla:**

*   **Rápida, mientras el proyecto exista:** «Gestionar implementaciones → ✎ → elegir la versión N». Las versiones son instantáneas inmutables y la URL no cambia. Es más rápida que restaurar desde Git.
*   **Si esa versión ya no existe o el proyecto se dañó:** `git checkout script-vN -- apps-script/Code.gs apps-script/appsscript.json`, pegar los dos archivos en el editor y desplegar una versión nueva en la misma implementación. La URL no cambia. Son unos minutos.
*   **Datos.** El backup cubre el código, no la hoja. Los nombres dados de baja con `unsignup` quedan en `Baixes`. Para otros daños en la hoja se usa el historial de versiones de Google Sheets y la copia de `Inscripcions` hecha antes de R4.

**Límites.** El backup solo protege lo que se copió al repositorio: un cambio hecho en el editor y nunca copiado no queda respaldado, y por eso los pasos 2 y 6 comparan con `git diff`. La copia del editor al repositorio se hace a mano, sin `clasp`, para no instalar herramientas ni activar la API de Apps Script. Esta elección es del plan y no del autor; `clasp pull` queda como mejora futura.

### Orden de entrega y compatibilidad de versiones

El script se actualiza siempre primero y siempre de forma aditiva. La web se despliega con `git push` y el script a mano («Gestionar implementaciones → Versión nueva», nunca «Nueva implementación», que cambia la URL `/exec`). La web tolera un script antiguo: lee `features` (vacío si no existe) y trata `responsable` e `inscripcio_url` como vacíos si faltan.

| Entrega | Contenido | Toca script u hoja | Cómo se deshace |
|---|---|---|---|
| **R0** (hecha) | Commit y push. | No | `git revert` |
| **R1** web | Detalle, `?e=`, enlace «detall», modal reducido, «Veure apuntats», «Comparteix» y «Copia l’enllaç» solo con texto (`wa.me`), `requestId` devuelto y registro local, textos. | No | `git revert` |
| **R2** script, luego web | Antes: backup del script (ver «Backup y restauración del script»). Script: `responsable`, `inscripcio_url`, `features`, `missingOptionalColumns`. Cabeceras J1 y K1 a mano. Después la web muestra el responsable y redirige «Participar». Al final se rellenan los datos. | Sí | Volver a la versión anterior en «Gestionar implementaciones» o, si no existe, restaurar la etiqueta `script-vN` |
| **R3** web | Imagen, descarga y «Comparteix» con archivo (`html-to-image`). | No | `git revert` |
| **R4** script, luego web | Antes: backup del script. Script: rama `unsignup`, `Baixes`, comprobación de `requestId` en `signup`. Después la web muestra «Desapuntar-me» si `features` incluye `unsignup`. Se prueba antes en una copia del libro, con copia de seguridad de `Inscripcions`. | Sí | Volver a la versión anterior o restaurar la etiqueta `script-vN` (los nombres borrados quedan en `Baixes`) |

No se despliegan juntos: lectura (R2) y escritura destructiva (R4) en la misma versión del script; datos con URL externa en la hoja antes de que la web de R2 esté publicada; quitar la lista del modal antes de que el detalle la muestre.

### Diagnóstico para el dueño

`?admin` pasa a mostrar la versión, `features`, las cabeceras obligatorias u opcionales que faltan, las filas ignoradas (ya existente), los avisos de URL externa inválida y el número de registros locales. El script escribe un `console.log` por cada baja (evento y `removed`), visible en el panel de ejecuciones de Apps Script. No hay forma de enterarse de un fallo de compartir o de baja en el móvil de otra persona; se acepta.

## Alternatives Considered

Las decisiones con más de una respuesta defendible las eligió el autor entre las opciones que se le presentaron, con sus riesgos. Cada alternativa descartada lleva el motivo técnico. «Rejected by author» significa que el autor eligió otra opción; no es una cita de ninguna otra persona.

### Alternativa A: Teléfono y enlace directo de WhatsApp del responsable

*   **Pros**: un toque para escribir a quien lleva el evento.
*   **Cons**: publica el móvil de esa persona en una web y en un repositorio públicos. En la hoja, Sheets suele quitar ceros y el `+` de los números.
*   **Reason for Rejection**: Rejected by author: se publicaría un teléfono personal. Se deja solo el nombre.

### Alternativa B: Adjuntar la imagen desde un enlace `wa.me` o `whatsapp://send`

*   **Pros**: un botón que abre WhatsApp directamente.
*   **Cons**: esos enlaces solo admiten texto y no pueden llevar archivos adjuntos (no se volvió a comprobar contra la documentación de WhatsApp en esta sesión).
*   **Reason for Rejection**: No viable. Se adopta la Web Share API con archivos, y `wa.me` queda solo como respaldo de texto.

### Alternativa C: Páginas de detalle por evento, generadas al compilar

*   **Pros**: URLs limpias y una vista previa propia en WhatsApp.
*   **Cons**: los eventos se leen de la hoja en tiempo de ejecución, así que no se conocen al compilar. Cada cambio de la hoja exigiría recompilar y volver a publicar.
*   **Reason for Rejection**: No viable con un sitio estático y datos leídos en tiempo de ejecución. Se adopta un modal más el enlace `?e=<id>`.

### Alternativa D: Abrir el detalle tocando toda la tarjeta o el nombre

*   **Pros**: una zona táctil grande y fácil de descubrir.
*   **Cons**: la tarjeta ya contiene enlaces y botones, y un toque accidental abriría el detalle.
*   **Reason for Rejection**: Rejected by author: solo los enlaces y los botones disparan acciones. Un revisor propuso convertir el nombre en enlace; no se adopta.

### Alternativa E: Otras formas de quitar una inscripción (PIN, botón en todos los nombres, cuentas, cookies, IndexedDB o copia en el servidor)

*   **Pros**: el PIN funciona entre dispositivos; el botón en todos los nombres no tiene fricción.
*   **Cons**: el PIN añade un campo y la mayoría de los casos serían «lo olvidé». Con un botón para todos, cualquiera con el enlace puede vaciar listas, y borrar datos es peor que el spam ya aceptado. Las cuentas cambian la arquitectura. Cookies, IndexedDB o una copia en el servidor suman complejidad por poca ganancia.
*   **Reason for Rejection**: Rejected by author: se aceptó la recomendación de usar `localStorage`, porque su fallo (otro navegador, datos borrados) lo cubre el borrado manual del dueño.

### Alternativa F: Vaciar solo la celda `nom` en lugar de borrar la fila

*   **Pros**: no cambia el esquema y el rollback del script no resucita a nadie.
*   **Cons**: deja filas vacías que hay que ignorar en cada lectura y excluir del tope por evento, y obliga a que `signup` trate filas sin nombre.
*   **Reason for Rejection**: Rejected by author: se eligió `deleteRow` con el nombre archivado en `Baixes`, que mantiene `Inscripcions` limpia y deja el nombre recuperable.

### Alternativa G: Dibujar la imagen a mano en un canvas

*   **Pros**: sin dependencia nueva, control total de fuentes y colores, y la maquetación de texto se puede probar con `node --test`.
*   **Cons**: más código propio (saltos de línea, mayúsculas en catalán, colores copiados desde CSS, porque el canvas no entiende `var()`) y más riesgo de que una fuente mal cargada caiga en silencio a otra.
*   **Reason for Rejection**: Rejected by author: se eligió una librería que convierte HTML en imagen, porque la maquetación la hace CSS y copia los estilos calculados, con menos código propio.

### Alternativa H: Otras librerías de HTML a imagen (`modern-screenshot` 4.7.0, `html2canvas` 1.4.1)

*   **Pros**: `modern-screenshot` tiene publicaciones más recientes (abril de 2026). `html2canvas` evita los fallos de imagen en blanco propios del SVG en WebKit.
*   **Cons**: `modern-screenshot` tiene menos uso real y su comportamiento en Safari no se pudo verificar. `html2canvas` admite solo parte del CSS, es más lenta y no publica versiones desde 2022.
*   **Reason for Rejection**: Rejected by author: se eligió `html-to-image` 1.11.13, la más usada de la técnica SVG, cuyo README documenta un respaldo para el pintado en blanco de Safari.

### Alternativa I: Imagen de 4096 × 2692 px

*   **Pros**: más detalle en pantallas grandes o al imprimir.
*   **Cons**: unos 11 millones de píxeles, con más riesgo de memoria en iPhone antiguos y Android de gama baja y más tiempo de generación. WhatsApp suele recomprimir las fotos de todas formas.
*   **Reason for Rejection**: Rejected by author: el tamaño era demasiado grande. Se reduce a la mitad por lado, 2048 × 1346 px.

### Alternativa J: Historial con `replaceState` o con `pushState` por capa

*   **Pros**: `replaceState` mantiene la barra de direcciones como enlace del evento abierto. `pushState` hace que Atrás cierre el detalle, como espera la gente.
*   **Cons**: con `replaceState`, Atrás sigue saliendo de la agenda, y su uso dentro de `onMount` en SvelteKit 3 no está verificado. Con `pushState`, cerrar con la X o con Esc sin `history.back()` deja entradas huérfanas, puede chocar con el cierre nativo del `<dialog>` en Chrome Android 120+ y exige más código y más pruebas.
*   **Reason for Rejection**: Rejected by author: se eligió no tocar el historial. El enlace se construye con la URL de la página y `?e=<id>` solo se lee al cargar. Atrás sale de la agenda.

### Alternativa K: Renderizar la imagen antes del clic, o en dos toques explícitos

*   **Pros**: renderizar antes permite compartir en el primer toque. Los dos toques son fiables.
*   **Cons**: renderizar antes gasta CPU y memoria cada vez que alguien abre un detalle, y un render en blanco en Safari se compartiría igualmente. Los dos toques añaden un paso para todos, con un público de 30 a 70 años.
*   **Reason for Rejection**: Rejected by author: se eligió renderizar al pulsar. El rechazo por activación caducada se cubre con un segundo toque solo cuando ocurre.

### Alternativa L: Dos botones independientes para imagen y enlace, o un solo `share` sin segundo toque

*   **Pros**: los dos botones no dependen de cómo trate WhatsApp la combinación de imagen y texto. Un solo `share` sin segundo toque tiene menos estados.
*   **Cons**: con dos botones se mandan dos mensajes y el enlace no va pegado a la imagen, lo que contradice G3. Sin segundo toque, el rechazo por activación caducada, probable al renderizar al pulsar, empujaría a descargar y adjuntar a mano.
*   **Reason for Rejection**: Rejected by author: la opción de dos botones contradecía el objetivo del mensaje único, y se eligió un solo `share` con segundo toque.

### Alternativa M: Cargar la librería con importación dinámica (al pulsar o al abrir el detalle)

*   **Pros**: la carga inicial se queda como hoy; la librería pesa unos 7 KB comprimidos.
*   **Cons**: falla sin conexión, el archivo con el nombre antiguo da 404 si se despliega con la pestaña abierta, y al pulsar añade espera antes del render.
*   **Reason for Rejection**: Rejected by author: se eligió la importación estática, que evita los fallos de descarga y los 404 tras un despliegue.

### Alternativa N: Backup solo con versiones de Apps Script, o con una copia del libro completo

*   **Pros**: las versiones dan un retroceso inmediato con la misma URL. La copia del libro cubre datos y código.
*   **Cons**: las versiones no cubren código nunca desplegado y se pierden con el proyecto (borrar un proyecto es permanente). Restaurar el script desde una copia del libro exige otra URL `/exec`, y cada copia duplica la lista de nombres en Drive.
*   **Reason for Rejection**: Rejected by author: se eligió guardar el código desplegado en Git con etiquetas `script-vN`, que no depende de Google. Las versiones de Apps Script siguen sirviendo como retroceso rápido.

### Alternativa O: Migrar las columnas nuevas con una función `ensureColumns_()` en `setup()`

*   **Pros**: automático, con formato y protección derivados del número de columnas.
*   **Cons**: re-ejecutar `setup()` aplicaría de golpe todo el endurecimiento anterior sobre una hoja viva, y es más código en un script que se despliega a mano.
*   **Reason for Rejection**: Rejected by author: se aceptó escribir las cabeceras J1 y K1 a mano, con una línea en el README.

### Alternativa P: Validar la URL externa también en el script, y no añadir `features` a `doGet`

*   **Pros**: validar en el script cubre un consumidor distinto de la web. Sin `features` hay menos código.
*   **Cons**: la web es el único consumidor, así que validar en el script duplica código. Sin `features`, un rollback del script o una copia sin conexión antigua dejarían visible un «Desapuntar-me» que el script no entiende.
*   **Reason for Rejection**: la validación en el script se recortó por simplicidad. Mantener `features` es una decisión del plan, no del autor: el autor aceptó respetar el orden de despliegue, y `features` es una línea que cubre los casos en los que ese orden no basta.

### Alternativa Q: Detalle a pantalla completa en todos los tamaños

*   **Pros**: una sola maquetación que mantener y probar, y el mismo comportamiento en cualquier dispositivo.
*   **Cons**: en una pantalla grande queda mucho espacio vacío a los lados y se pierde el contexto del calendario, así que se siente como una página nueva y no como un modal.
*   **Reason for Rejection**: Rejected by author: se eligió pantalla completa solo por debajo de 1024 px y un panel centrado desde 1024 px, que mantiene el calendario visible. Se asume el coste de dos maquetaciones.

### Alternativa R: Probar los flujos de navegador con Playwright en local sin guardarlo, o solo con una lista manual

*   **Pros**: sin guardar nada, no suma dependencias ni tiempo de CI. Con una lista manual no hay herramientas nuevas y se reutilizan las pruebas en móvil real que ya eran del autor.
*   **Cons**: lo que se prueba en local sin guardar no se puede repetir después ni protege de regresiones. Con la lista manual, los diálogos apilados, el enlace directo o el orden de foco se rompen sin que nadie lo vea hasta que alguien los pruebe a mano, y cada entrega cuesta más tiempo.
*   **Reason for Rejection**: Rejected by author: se eligió Playwright dentro del repositorio, ejecutado en el CI. Se asume el coste de una dependencia nueva, la descarga de navegadores en cada ejecución y escribir y mantener las pruebas en un proyecto de un mes.

--------------------------------------------------------------------------------

## Non-Functional Requirements

### Security & Privacy

*   La lista de nombres de pila o apodos sigue siendo pública, y el enlace de detalle se puede compartir fuera del grupo. Es un riesgo aceptado por el autor.
*   El secreto de la baja es el `requestId`: el script nunca lo devuelve en `doGet` y solo lo guarda el navegador que se apuntó. El dueño de la hoja lo ve en `Inscripcions`.
*   `inscripcio_url` solo admite `https://` sin credenciales y se abre con `rel="noopener noreferrer"`. Los textos del responsable y de la hoja se escapan siempre; no se usa `{@html}`.
*   `Code.gs` mantiene `@OnlyCurrentDoc` y el mismo permiso limitado a la hoja. La baja archiva el nombre en `Baixes`, dentro de la hoja del dueño.

### Performance & Latency

*   La imagen se genera en el navegador al pulsar el botón, a 2048 × 1346 px (unos 2,8 millones de píxeles). No hay tiempo medido: queda pendiente de medir en un móvil real.
*   `html-to-image` suma unos 7 KB comprimidos al paquete principal.
*   El CI suma la descarga de Chromium y WebKit y la ejecución de las pruebas de navegador.
*   Cada baja añade una lectura y una escritura bajo el mismo lock de 10 s del script. Con unos 100 usuarios no se espera contención, aunque no se ha medido.

### Rollout & Rollback

*   Cinco entregas, R0 a R4, con el script primero y siempre aditivo. El código desplegado del script se guarda en Git con etiquetas `script-vN` antes y después de cada cambio, y la restauración tiene dos niveles (ver «Backup y restauración del script»).
*   No hay interruptores de funcionalidad. `features` en `doGet` hace de interruptor del cliente para «Desapuntar-me», `responsable` e `inscripcio_url`.

--------------------------------------------------------------------------------

### Additional Resources

*   [README del proyecto](../../README.md), con el procedimiento de puesta en marcha y las comprobaciones tras publicar.
*   `concepts_brief.md`, el brief de partida (fuera del repositorio, en la carpeta de la sesión). Quedó como registro histórico y difiere de este diseño en el tamaño de la imagen, el detalle en pantallas grandes y el uso de una librería de renderizado.
*   [Web Share API: `navigator.share`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share) en MDN.
*   [Implementaciones y versiones de Apps Script](https://developers.google.com/apps-script/concepts/deployments).
*   [`html-to-image`](https://github.com/bubkoo/html-to-image) en GitHub.

### Future Improvements

*   **`clasp pull`.** Copiar el código del editor de Apps Script al repositorio sin pasos manuales.
*   **Nombre del evento como enlace al detalle.** Lo propuso un revisor como forma más descubrible de abrir el detalle. No se adopta ahora.
*   **Medir la generación de la imagen.** Tiempo y memoria en móviles reales, para decidir si el segundo toque sigue haciendo falta.
*   **Validar `inscripcio_url` también en el script**, si aparece otro consumidor además de la web.

--------------------------------------------------------------------------------

## Detailed Implementation Plan

Este plan está ordenado para implementarse entrega a entrega. Cada archivo indica en qué entrega (R1 a R4) se toca. No contiene código de producción: solo firmas, formas de datos y pseudocódigo.

### Secuencia de implementación

| Entrega | Archivos que se tocan | Antes de publicar |
|---|---|---|
| **R1** web | `package.json`, `package-lock.json`, `playwright.config.js`, `e2e/*` (infraestructura y pruebas de detalle y enlace), `src/lib/config.js`, `month.js`, `state.js`, `my-signups.js`, `share-link.js`, `api.js`, `mock-api.js`, `texts.js`, `EventCard.svelte`, `Calendar.svelte`, `EventDetail.svelte`, `SignupDialog.svelte`, `Header.svelte`, `+page.svelte`, sus pruebas, `.gitignore`, `deploy.yml`, `README.md`, `docs/comprovacions-mobil.md` | `npm run check`, `npm test`, `npm run test:e2e` en verde |
| **R2** script, luego web | Backup del script. `Code.gs`, `Code.test.js`, `fake-google.js`. Después `events.js`, `events.test.js`, `EventCard.svelte`, `EventDetail.svelte`, `mock-api.js`, `texts.js`, `+page.svelte`, `e2e/external.spec.js`, `docs/plantilla-esdeveniments.csv`, `README.md`. Al final, J1 y K1 y los datos en la hoja | Pruebas en verde; después del script, `curl` de lectura contra `/exec` |
| **R3** web | `package.json`, `package-lock.json`, `poster.js`, `png.js`, `share.js`, `PosterView.svelte`, `EventDetail.svelte`, `texts.js`, `config.js`, pruebas, `e2e/image.spec.js`, `e2e/share.spec.js`, `docs/comprovacions-mobil.md`, `README.md` | Pruebas en verde, incluida `image.spec.js` en WebKit; el autor prueba en móvil real |
| **R4** script, luego web | Backup del script. `Code.gs`, `Code.test.js`, `fake-google.js`. Después `api.js`, `api.test.js`, `mock-api.js`, `SignupDialog.svelte`, `+page.svelte`, `texts.js`, `e2e/signup.spec.js`, `README.md`. Probar antes en una copia del libro | Pruebas en verde; el script, probado en la copia con copia de seguridad de `Inscripcions` |

### Target Files to Create/Modify

#### 1. `package.json` (Modify)

*   **Entrega**: R1 y R3.
*   **Type / Scope**: Configuración de npm.
*   **Proposed Changes**: R1: añadir `@playwright/test` a `devDependencies` y el script `"test:e2e": "playwright test"`. R3: añadir `html-to-image` 1.11.13 a `devDependencies`, junto a las demás dependencias del proyecto, que ya van todas ahí. `check` y `test` no cambian.

#### 2. `package-lock.json` (Modify)

*   **Entrega**: R1 y R3.
*   **Type / Scope**: Archivo generado.
*   **Proposed Changes**: Se regenera con `npm install`. El flujo de CI usa `npm ci`, así que debe subirse con cada cambio de dependencias.

#### 3. `playwright.config.js` (Create)

*   **Entrega**: R1.
*   **Type / Scope**: Configuración de pruebas de navegador.
*   **Proposed Changes**: `testDir: 'e2e'`, `baseURL: http://localhost:5300/agenda-front-ampli/`, `locale: 'ca-ES'`, `timezoneId: 'Europe/Madrid'`. `globalSetup: e2e/global-setup.js`. `webServer` que arranca `node e2e/server.js` y espera a la `baseURL`, con `reuseExistingServer` fuera del CI. `retries: 2` en el CI y 0 en local. Proyectos: `chromium` (escritorio, 1280 × 900), `mobile` (Chromium con el perfil de Pixel 7, ancho de unos 390 px) y `webkit`, este último solo para `e2e/image.spec.js`. Informe `list` en local y `github` en el CI.

#### 4. `e2e/global-setup.js` (Create)

*   **Entrega**: R1.
*   **Type / Scope**: Preparación de las pruebas.
*   **Proposed Changes**: Ejecuta `vite build` como proceso hijo con `BASE_PATH=/agenda-front-ampli` y `VITE_AGENDA_API_URL=http://localhost:5301/exec`, para probar la compilación de producción bajo el prefijo real de GitHub Pages. Falla con un mensaje claro si la compilación falla.

#### 5. `e2e/server.js` (Create)

*   **Entrega**: R1 (se amplía en R2 y R4).
*   **Type / Scope**: Servidor de pruebas en Node, sin dependencias nuevas.
*   **Proposed Changes**: Dos puertos. En 5300 sirve `build/` bajo `/agenda-front-ampli/`, con 404 fuera del prefijo, como GitHub Pages. En 5301 simula el script con `createScript` de `apps-script/fake-google.js`, que ejecuta el `Code.gs` real contra una hoja simulada, y responde con las cabeceras CORS. Endpoints de control: `/__reset` (vuelve a sembrar los datos), `/__flags?down=1&closed=1&loseAnswer=1&features=...` y `/__state` (devuelve las filas de `Inscripcions` y `Baixes`). Datos sembrados: eventos de los dos tipos, uno cancelado, uno con `responsable`, uno con `inscripcio_url`, un día con cuatro eventos, uno pasado respecto al «hoy» fijado y uno futuro con inscripciones.

#### 6. `e2e/helpers.js` (Create)

*   **Entrega**: R1.
*   **Type / Scope**: Utilidades de las pruebas.
*   **Proposed Changes**: `openAgenda(page, {today, query, offline})`: llama a `/__reset`, instala el reloj fijo (`2026-11-10T09:00:00+01:00` por defecto), navega y espera a que haya tarjetas. `setFlags`, `readState`, `mockShare(page, behaviour)` (sustituye `navigator.share` y `navigator.canShare` con un comportamiento configurable: éxito, `AbortError`, `NotAllowedError` o sin soporte), y `readDownloadedPng(download)`.

#### 7. `e2e/detail.spec.js` (Create)

*   **Entrega**: R1 (CUJ 1 y 2).
*   **Type / Scope**: Prueba de navegador.
*   **Proposed Changes**: Abrir el detalle con «detall» y comprobar los campos mostrados. `?e=<id>` válido abre el detalle sin desplazarse; id desconocido y copia sin conexión sin ese id muestran los avisos correspondientes; evento pasado y evento cancelado se abren en solo lectura. Esc cierra solo el diálogo de arriba cuando hay dos apilados, y el foco vuelve al elemento que abrió el diálogo. Atrás sale de la agenda y la barra de direcciones no cambia al abrir o cerrar. En 390 px el detalle ocupa toda la pantalla, y desde 1024 px es un panel centrado con la cuadrícula visible detrás.

#### 8. `e2e/layout.spec.js` (Create)

*   **Entrega**: R1.
*   **Type / Scope**: Prueba de navegador.
*   **Proposed Changes**: A 390, 1024, 1100 y 1280 px no hay desbordamiento horizontal y ningún elemento de la tarjeta sale de ella. El enlace «detall» mide al menos 24 × 24 px de zona táctil. Con cuatro eventos en un día, la celda crece y los cuatro caben.

#### 9. `e2e/external.spec.js` (Create)

*   **Entrega**: R2 (CUJ 6).
*   **Type / Scope**: Prueba de navegador.
*   **Proposed Changes**: «Participar» de un evento con `inscripcio_url` es un enlace con `target="_blank"` y `rel="noopener noreferrer"` a la URL, en tarjeta y detalle, y no abre el modal. No aparecen recuento ni lista. Una URL que no empieza por `https://` se trata como vacía. El responsable se ve en tarjeta y detalle. Con B1 = NO el enlace externo sigue funcionando.

#### 10. `e2e/signup.spec.js` (Create)

*   **Entrega**: R4 (CUJ 3). Antes, en R1, solo la parte de alta.
*   **Type / Scope**: Prueba de navegador.
*   **Proposed Changes**: Alta desde la tarjeta y desde el detalle, y comprobar que el registro local se guarda. Con `features` que incluya `unsignup`: «La teva participació» aparece solo en el navegador que se apuntó, y «Desapuntar-me» exige dos toques. La baja archiva el nombre en `Baixes`, borra la fila y actualiza la lista. Un contexto de navegador nuevo no ve el botón. `removed:false` muestra «Ja no hi eres a la llista». No se ofrece en eventos pasados y sí con B1 = NO. Con duplicados, cada registro se quita por separado.

#### 11. `e2e/share.spec.js` (Create)

*   **Entrega**: R3 (CUJ 5), solo Chromium.
*   **Type / Scope**: Prueba de navegador con `navigator.share` simulado.
*   **Proposed Changes**: Éxito: se llama con un archivo `agenda-<id>.png` y el texto con el enlace. `AbortError`: no pasa nada y no hay respaldo. `NotAllowedError`: el botón pasa a «Imatge preparada: prem de nou» y el segundo toque llama a `share` con el mismo archivo sin volver a generar. Sin soporte de archivos: descarga la imagen y muestra el enlace `wa.me` con el texto codificado. «Copia l’enllaç» copia la URL del detalle sin `?admin`, y si el portapapeles falla muestra la URL en un campo seleccionable. Doble toque mientras genera no lanza una segunda generación.

#### 12. `e2e/image.spec.js` (Create)

*   **Entrega**: R3 (CUJ 4), proyectos Chromium y WebKit.
*   **Type / Scope**: Prueba de navegador.
*   **Proposed Changes**: Pulsar «Descarrega la imatge» baja `agenda-<id>.png`. La cabecera del PNG dice 2048 × 1346. La imagen no está en blanco: se carga en un canvas dentro de la página y se comprueba que un píxel de fondo tiene el color del tipo de evento. Se repite para un Acció y un Acte. En WebKit esta prueba es la señal de aviso del riesgo de imagen en blanco de Safari.

#### 13. `src/lib/config.js` (Modify)

*   **Entrega**: R1 y R3.
*   **Type / Scope**: Constantes.
*   **Proposed Changes**: R1: `MY_SIGNUPS_KEY = 'agenda-sants-montjuic-2026-11:mine'`, `MY_SIGNUPS_MAX = 50`, `MY_SIGNUPS_MAX_AGE_DAYS = 45`, `MAX_MANAGER_LENGTH = 60`, `MAX_URL_LENGTH = 500`. R3: `POSTER = { width: 2048, height: 1346 }`. Nada de esto cambia `STORAGE_KEY`.

#### 14. `src/lib/month.js` (Modify)

*   **Entrega**: R1.
*   **Type / Scope**: Fechas.
*   **Proposed Changes**: Nueva `dateLabelFromIso(iso)` que devuelve «dissabte 7 de novembre» a partir de `YYYY-MM-DD`, calculando el día de la semana sin depender de la zona horaria del dispositivo. Reutiliza `T.weekdays` y `MONTH.name`. La usan el detalle y la imagen.

#### 15. `src/lib/month.test.js` (Modify)

*   **Entrega**: R1.
*   **Type / Scope**: Prueba unitaria.
*   **Proposed Changes**: Casos de `dateLabelFromIso`: 2026-11-02 (dilluns), 2026-11-29 (diumenge), y una fecha cualquiera con un dispositivo en otra zona horaria.

#### 16. `src/lib/state.js` (Create)

*   **Entrega**: R1.
*   **Type / Scope**: Módulo puro.
*   **Proposed Changes**:
```text
participationState(event, {today, signupsOpen}):
  si event.date < today          → 'past'
  si event.status == 'cancelled' → 'cancelled'
  si event.externalUrl != ''     → 'external'      (R2; hasta entonces el campo está vacío)
  si !signupsOpen                → 'closed'
  en otro caso                   → 'open'
canShare(state)    = state en {'external','closed','open'}
canUnsign(state)   = state != 'past'
showSignups(state) = state != 'external'
canParticipate(state) = state == 'open'
```
    Sustituye `canSignup` de `EventCard.svelte` y `readOnlyReason` de `+page.svelte`.

#### 17. `src/lib/state.test.js` (Create)

*   **Entrega**: R1.
*   **Type / Scope**: Prueba unitaria.
*   **Proposed Changes**: La tabla completa de prioridad (pasado gana a todo, cancelado gana a externo, externo ignora `signupsOpen`) y los cuatro predicados por cada estado. Un evento de hoy no es pasado.

#### 18. `src/lib/my-signups.js` (Create)

*   **Entrega**: R1.
*   **Type / Scope**: Módulo puro, con el almacenamiento inyectado.
*   **Proposed Changes**:
```text
formato en MY_SIGNUPS_KEY:  { v:1, items:[ {eventId, requestId, name, at} ] }
readMine(storage, nowMs)            → lista; JSON corrupto, storage nulo o elementos mal formados → ignorar;
                                      descarta los de más de MY_SIGNUPS_MAX_AGE_DAYS
addMine(storage, item, nowMs)       → lee, añade, recorta a MY_SIGNUPS_MAX quitando los más antiguos, escribe (try/catch)
removeMine(storage, eventId, requestId)
mineForEvent(storage, eventId, nowMs)
```

#### 19. `src/lib/my-signups.test.js` (Create)

*   **Entrega**: R1.
*   **Type / Scope**: Prueba unitaria.
*   **Proposed Changes**: Alta y lectura, tope de 50, caducidad a los 45 días, JSON corrupto, `storage` nulo o que lanza al escribir, elementos de otro tipo, varios registros para un mismo evento y baja por `requestId`.

#### 20. `src/lib/share-link.js` (Create)

*   **Entrega**: R1.
*   **Type / Scope**: Módulo puro.
*   **Proposed Changes**: `detailUrl(location, id)` devuelve `origin + pathname + '?e=' + encodeURIComponent(id)` y descarta cualquier otro parámetro. `parseEventParam(search)` devuelve el id de `?e=` solo si cumple `[a-z0-9-]{1,20}`, y si no `null`. `shareText(url)` usa `T.share.text`. `waLink(text)` devuelve `https://wa.me/?text=` más el texto codificado.

#### 21. `src/lib/share-link.test.js` (Create)

*   **Entrega**: R1.
*   **Type / Scope**: Prueba unitaria.
*   **Proposed Changes**: La URL no arrastra `?admin`. El id con caracteres no válidos se ignora. Codificación del texto en `wa.me` con acentos y apóstrofo tipográfico. Un `pathname` sin barra final.

#### 22. `src/lib/events.js` (Modify)

*   **Entrega**: R2.
*   **Type / Scope**: Normalización de filas.
*   **Proposed Changes**: Extraer `httpsUrl(value)` de `mapsUrl`: solo `https://`, sin credenciales (`user:pass@`), longitud máxima `MAX_URL_LENGTH`, validada con `new URL()`. `AgendaEvent` gana `manager` (de `responsable`, recortado a `MAX_MANAGER_LENGTH`) y `externalUrl` (de `inscripcio_url`, vacío si no es válida). `normalizeEvents` devuelve además `warnings: [{row, reason}]` para una URL inválida o un responsable recortado, sin descartar el evento. `mapsUrl` sigue usando `httpsUrl` para `mapa`.

#### 23. `src/lib/events.test.js` (Modify)

*   **Entrega**: R2.
*   **Type / Scope**: Prueba unitaria.
*   **Proposed Changes**: `responsable` normalizado y recortado. `inscripcio_url` válida, con `http://`, con credenciales, con `javascript:` y demasiado larga. Los avisos de `warnings` con su número de fila. Un evento sin las columnas nuevas se comporta como hoy.

#### 24. `src/lib/api.js` (Modify)

*   **Entrega**: R1 (requestId, registro local, `features`) y R4 (`unsignup`).
*   **Type / Scope**: Cliente del script.
*   **Proposed Changes**:
```text
parseAgenda(json)    → añade features: string[] (vacío si falta) y missingOptionalColumns: string[]
createApi({url, fetchFn, storage, now, timeoutMs, uuid})
  signup(eventId, name, knownCount):
     requestId = uuid()                                  // antes del try
     ... igual que hoy ...
     resultado ok (también por recover) → {ok:true, names, requestId, recovered?}
     si ok → addMine(storage, {eventId, requestId, name, at: now()})
  unsignup(eventId, requestId):                          // R4
     POST text/plain {action:'unsignup', eventId, requestId}, mismo timeout
     ok → {ok:true, names, removed}
     {ok:false, error} del servidor → tal cual
     error de red o timeout → {ok:false, error:'network'}   (sin recover: es idempotente)
```
    Los typedefs `SignupResult`, `UnsignResult`, `Agenda` y `AgendaApi` se actualizan.

#### 25. `src/lib/api.test.js` (Modify)

*   **Entrega**: R1 y R4.
*   **Type / Scope**: Prueba unitaria.
*   **Proposed Changes**: R1: `signup` devuelve `requestId` en `ok` y en `recovered`, guarda el registro local solo cuando hay éxito, y no lo guarda en errores del servidor; `parseAgenda` con y sin `features`. R4: `unsignup` envía `text/plain` con el cuerpo esperado, devuelve `removed` true y false, propaga errores del servidor, y devuelve `network` en red caída o timeout.

#### 26. `src/lib/mock-api.js` (Modify)

*   **Entrega**: R1, R2 y R4.
*   **Type / Scope**: Datos de desarrollo (solo `DEV`).
*   **Proposed Changes**: R1: `features: []`, `missingOptionalColumns: []`. R2: un evento con `responsable` y otro con `inscripcio_url`. R4: `unsignup`, y que `signup` devuelva `requestId`, para que `npm run check` y `npm run dev` sigan funcionando.

#### 27. `src/lib/texts.js` (Modify)

*   **Entrega**: R1, R2, R3 y R4.
*   **Type / Scope**: Textos en catalán.
*   **Proposed Changes**: Ver la lista completa en «Textos nuevos» más abajo. Se añaden los grupos `card`, `detail`, `share` y `participation`. `siteTitle` pasa a derivarse de `siteTitleLines: ['Agenda Frontamplista', 'Sants-Montjuïc']`. Se elimina `dialog.correction` y `dialog.listTitle` y `dialog.listEmpty` pasan a `detail`.

#### 28. `src/lib/components/Header.svelte` (Modify)

*   **Entrega**: R1.
*   **Type / Scope**: Componente.
*   **Proposed Changes**: Usa `T.siteTitleLines` en vez de repetir el título a mano en dos líneas. El aspecto no cambia.

#### 29. `src/lib/components/EventCard.svelte` (Modify)

*   **Entrega**: R1 y R2.
*   **Type / Scope**: Componente.
*   **Proposed Changes**: R1: nuevo prop `ondetail(id)` y `onparticipate(id)`, que sustituyen a `onselect`. Un `<a href="?e=<id>">` con el texto `T.card.detail` («detall») dentro de la línea `.tags`, alineado a la derecha con `margin-left: auto`, en texto normal (sin negrita, sin mayúsculas, sin espaciado de letras, 0,85 rem). Zona táctil de al menos 24 × 24 px con relleno invisible (mejor 44 px de alto) y `aria-label` con nombre y fecha. El clic normal llama a `ondetail` con `preventDefault`. El botón usa `participationState` en vez de la lógica propia: en `open` abre el modal de inscripción, en el resto (`past`, `cancelled`, `closed`) muestra «Veure apuntats» y abre el detalle. R2: línea `T.card.manager(nombre)` bajo el lugar si hay `manager`. En estado `external`, «Participar» es un `<a target="_blank" rel="noopener noreferrer">` con aspecto de botón y se ocultan recuento y lista. Se ajusta la zona 1024–1279 px para que la línea del tipo no desborde.

#### 30. `src/lib/components/Calendar.svelte` (Modify)

*   **Entrega**: R1.
*   **Type / Scope**: Componente.
*   **Proposed Changes**: Los props `onselect` pasan a `ondetail` y `onparticipate`, que se reenvían a cada `EventCard`. Pasa `externalUrl` y el estado calculado con `participationState` desde la página. No cambia la maquetación del calendario.

#### 31. `src/lib/components/EventDetail.svelte` (Create)

*   **Entrega**: R1, R2 y R3.
*   **Type / Scope**: Componente, un único `<dialog>` abierto con `showModal()`.
*   **Proposed Changes**:
    *   **Props**: `event` (o `null`), `names`, `state` (de `participationState`), `dateLabel`, `url` (detalle), `notFound`, `canUnsignHint`, `onclose`, `onparticipate`.
    *   **Maquetación**: por debajo de 1024 px ocupa toda la pantalla (100 dvw × 100 dvh, sin borde redondeado, con scroll interno). Desde 1024 px es un panel centrado de ancho máximo de 40 rem, con alto máximo de `100dvh - 4rem`, scroll interno y fondo atenuado en el que se ve el calendario.
    *   **Contenido, de arriba abajo**: fila con etiqueta de tipo, insignia de estado y botón «Tanca» (44 px); nombre; fecha (`dateLabel`) y hora; lugar con enlace a Maps; `T.card.manager` si hay responsable; zona de participación (según estado, ver más abajo); lista de apuntados (con scroll si es larga); zona de compartir.
    *   **Participación según estado**: `open` muestra recuento y «Participar» (llama a `onparticipate`); `closed` muestra `T.dialog.closed`; `past` y `cancelled` muestran la nota correspondiente; `external` muestra el enlace «Participar» con la nota `T.detail.externalNote` y oculta recuento y lista.
    *   **Compartir** (solo si `canShare(state)`): R1: «Comparteix» abre el enlace `wa.me` con solo el texto y «Copia l’enllaç». R3: «Descarrega la imatge» y el flujo completo de «Comparteix» con la máquina de estados del Plan Técnico. Mensajes en una región `aria-live="polite"`.
    *   **Copia del evento**: guarda una copia del evento al abrirse. Si desaparece de la agenda mientras está abierto, muestra `T.detail.notFound` y desactiva todas las acciones.
    *   **Archivo en memoria** (R3): mantiene el `File` generado, ligado a una huella del evento (nombre, fecha, hora, lugar, tipo), y lo descarta si la huella cambia o el detalle se cierra.
    *   **Accesibilidad**: `aria-labelledby` con el nombre, foco inicial en el botón «Tanca», retorno del foco al elemento que lo abrió (o al título si se abrió por enlace directo).

#### 32. `src/lib/components/SignupDialog.svelte` (Modify)

*   **Entrega**: R1 (reducción) y R4 («La teva participació»).
*   **Type / Scope**: Componente.
*   **Proposed Changes**: R1: quita la lista de apuntados, `dialog.correction` y el título de lista. Mantiene la cabecera con tipo, nombre, fecha y hora, la frase de propósito, el formulario, el aviso de privacidad y el mensaje de éxito. Tras un alta correcta añade `T.participation.hint` solo si `features` incluye `unsignup`, para no prometer una baja que el script aún no admite (R1 a R3). Se abre por encima del detalle sin cerrarlo. R4: sección «La teva participació» con un elemento por registro local de ese evento (`mineForEvent`), cada uno con el nombre y «Desapuntar-me» con confirmación en dos toques (el primer toque cambia el texto a `T.participation.unsignConfirm` durante 5 segundos). Solo se muestra si hay registros y `features` incluye `unsignup`, y no se ofrece en eventos pasados. Estados del botón: confirmar, «Desapuntant…» y los mensajes de resultado.

#### 33. `src/routes/+page.svelte` (Modify)

*   **Entrega**: R1 a R4.
*   **Type / Scope**: Página principal.
*   **Proposed Changes**: R1: `selectedId` se sustituye por `detailId` y `signupId`; cerrar el modal de inscripción no cierra el detalle. En `onMount`, después de la primera carga correcta, lee `?e=` con `parseEventParam(location.search)` y abre el detalle; en ese caso no ejecuta `anchorToUpcoming`. Estados del enlace directo: id desconocido en carga reciente → aviso `T.detail.notFound` más calendario; copia sin conexión sin el id → `T.detail.cannotCheck`; evento pasado o cancelado → solo lectura. Calcula la URL del detalle con `detailUrl(location, id)`. El historial no se toca. R2: pasa `manager` y `externalUrl`, y muestra los avisos de `?admin`. R4: pasa `features` al modal y gestiona `unsignup` (actualiza `signups` con los `names` de la respuesta y quita el registro local). `?admin` muestra `v`, `features`, columnas obligatorias y opcionales ausentes, filas ignoradas, `warnings` y el número de registros locales.

#### 34. `src/lib/components/PosterView.svelte` (Create)

*   **Entrega**: R3.
*   **Type / Scope**: Componente, solo para generar la imagen.
*   **Proposed Changes**: Un elemento de 2048 × 1346 px CSS, posicionado fuera de pantalla (`position: fixed` y desplazado, no `display: none`, para que se pinte). Se monta solo al pulsar un botón y se desmonta al terminar. Valores de partida, que se ajustan al revisar la primera imagen: banda superior de 120 px en `--orange` con `T.siteTitleLines` unidas, en `--lime-light`, a 52 px; fondo del cuerpo `--lime` para Acció y `--rust` para Acte, con texto `--rust` y `--lime` respectivamente; margen de 80 px; tipo a 64 px; nombre a 150 px en mayúsculas con `line-clamp` de 4 líneas y puntos suspensivos; día a 80 px (`dateLabelFromIso`); hora a 120 px (`formatRange`); lugar a 72 px, como texto sin enlace. Fuentes: `Special Gothic Condensed One` para todo. Sin botones, enlaces, recuento ni responsable.

#### 35. `src/lib/png.js` (Create)

*   **Entrega**: R3.
*   **Type / Scope**: Módulo puro.
*   **Proposed Changes**: `pngSize(bytes)` lee la cabecera de un PNG (firma de 8 bytes y el bloque IHDR) y devuelve `{width, height}`, o `null` si no es un PNG válido.

#### 36. `src/lib/png.test.js` (Create)

*   **Entrega**: R3.
*   **Type / Scope**: Prueba unitaria.
*   **Proposed Changes**: Un PNG de cabecera conocida (2048 × 1346), bytes truncados, firma incorrecta y entrada vacía.

#### 37. `src/lib/poster.js` (Create)

*   **Entrega**: R3.
*   **Type / Scope**: Módulo con la librería `html-to-image`, importada de forma estática.
*   **Proposed Changes**: `renderPoster(node)`:
```text
1. await document.fonts.load para las dos fuentes con el texto real del nodo
2. blob = await toBlob(node, { pixelRatio: 1, width: 2048, height: 1346, cacheBust: false })
   - si 1.11.13 admite stabilizationAttempts: usar 3
   - si no: pintar dos veces y usar el segundo resultado
3. si blob es null o pngSize(bytes) != 2048×1346 → lanzar error 'image_failed'
4. devolver new File([blob], 'agenda-<id>.png', {type:'image/png'})
```
    `pixelRatio` se fija explícitamente, porque el valor por defecto usa la densidad del dispositivo.

#### 38. `src/lib/share.js` (Create)

*   **Entrega**: R3.
*   **Type / Scope**: Módulo con `navigator` inyectado.
*   **Proposed Changes**:
```text
shareImage(file, text, nav = navigator):
  si !nav.share o !nav.canShare?.({files:[file]})  → 'unsupported'
  try { await nav.share({files:[file], text}); return 'shared' }
  catch e:  AbortError → 'aborted' | NotAllowedError → 'needs-second-tap' | otro → 'error'
```
    En el camino del segundo toque no hay ningún `await` antes de llamar a `nav.share`. También `downloadFile(file)` (enlace `<a download>` temporal sobre una URL de objeto, revocada después; si el navegador no admite `download`, abre la URL en una pestaña nueva) y `copyText(text, nav)` (usa el portapapeles y devuelve `false` si falla).

#### 39. `src/lib/share.test.js` (Create)

*   **Entrega**: R3.
*   **Type / Scope**: Prueba unitaria con un `navigator` simulado.
*   **Proposed Changes**: Cada salida de `shareImage` (`shared`, `aborted`, `needs-second-tap`, `unsupported` por falta de `share` y por `canShare` falso, y `error`). Comprueba que `nav.share` se llama de forma síncrona en la primera parte de la llamada. `copyText` con éxito y con error.

#### 40. `apps-script/Code.gs` (Modify)

*   **Entrega**: R2 y R4.
*   **Type / Scope**: Google Apps Script.
*   **Proposed Changes**:
    *   **R2**: `EVENT_COLUMNS` suma `responsable` e `inscripcio_url` al final, y se define `OPTIONAL_EVENT_COLUMNS`. `readAgenda_` añade `features: ['responsable', 'inscripcio_url']` y `missingOptionalColumns` (cabeceras opcionales no encontradas), y cada evento incluye los dos campos nuevos. `REQUIRED_EVENT_COLUMNS` y `setup()` no cambian. Se actualiza el comentario de cabecera del archivo.
    *   **R4**: nueva constante `SHEET_ARCHIVE = 'Baixes'` y `ARCHIVE_COLUMNS = ['data_hora_baixa', 'event_id', 'nom', 'request_id']`. `doPost` pasa a ramificar por `action` justo después de leer el cuerpo y antes de validar el nombre, hacia `signup_` (el cuerpo actual extraído) y `unsignup_`. `features` suma `'unsignup'`.
```text
signup_(body):   // igual que hoy, más:
   tras el lock y las comprobaciones de B1, evento y tope:
   si requestSeen_(requestId) → devolver ok con los nombres actuales, sin escribir
requestSeen_(requestId):  true si el request_id está en Inscripcions, en Baixes o en la caché de 600 s

unsignup_(body):
   validar eventId (≤ 20) y requestId (REQUEST_ID_RE)  → si no, bad_request
   lock.tryLock(10 s)                                  → si no, busy
   r = buscar fila en Inscripcions con event_id == eventId y request_id == requestId (no vacío)
   si no hay fila → ok {removed:false, names}
   releer la fila r; si event_id o request_id ya no coinciden → buscar una vez más; si no, removed:false
   ensureSheet_(Baixes) con formato de texto; añadir [ahora, eventId, nom, requestId]
   sheet.deleteRow(r); flush
   console.log('unsignup', eventId, 'removed=true')
   devolver {ok:true, v:1, eventId, names (de las filas que quedan), removed:true}
   no mira isOpen_ ni si el evento existe
```

#### 41. `apps-script/Code.test.js` (Modify)

*   **Entrega**: R2 y R4.
*   **Type / Scope**: Prueba unitaria del script.
*   **Proposed Changes**: R2: `doGet` devuelve `features`, `missingOptionalColumns` y los campos nuevos; una hoja de 9 columnas sigue funcionando. R4: `unsignup` borra la fila correcta, archiva el nombre en `Baixes` (se crea al vuelo), devuelve `names` y `removed:true`; con `request_id` vacío o de otro evento no borra; es idempotente; funciona con B1 = NO y con un evento inexistente; `busy` con el lock tomado; si el dueño cambia el orden de las filas entre la lectura y el borrado, no borra otra fila; `signup` repetido con un `requestId` ya dado de baja no reinscribe y responde `ok`; `request_id` repetido en `Inscripcions` no se escribe dos veces; `doGet` nunca devuelve `request_id`; `doPost` rechaza una acción desconocida con `bad_request`.

#### 42. `apps-script/fake-google.js` (Modify)

*   **Entrega**: R2 y R4.
*   **Type / Scope**: Hoja y servicios de Google simulados.
*   **Proposed Changes**: R2: `EVENT_HEADER` pasa a 11 columnas (añade `responsable` e `inscripcio_url`). R4: `FakeSheet.deleteRow(n)` y `getRange(row, col, 1, n).getValues()` para releer una fila; la hoja nueva creada con `insertSheet` se puede leer desde el test; un modo para simular que el dueño reordena filas entre dos llamadas.

#### 43. `.gitignore` (Modify)

*   **Entrega**: R1.
*   **Type / Scope**: Configuración de Git.
*   **Proposed Changes**: Ignorar `/test-results/`, `/playwright-report/`, `/blob-report/` y `/playwright/.cache/`.

#### 44. `.github/workflows/deploy.yml` (Modify)

*   **Entrega**: R1.
*   **Type / Scope**: Flujo de CI.
*   **Proposed Changes**: Después de `npm test` y antes de comprobar la URL del script, añadir `npx playwright install --with-deps chromium webkit` y `npm run test:e2e`. Las pruebas compilan por su cuenta con la URL del servidor simulado. La compilación de producción posterior vuelve a escribir `build/` con la URL real. Si las pruebas de navegador fallan, no se despliega. El reintento de Playwright (2 en el CI) limita los falsos fallos. Se espera que el flujo tarde unos minutos más por la descarga de los navegadores.

#### 45. `README.md` (Modify)

*   **Entrega**: R1 a R4.
*   **Type / Scope**: Documentación.
*   **Proposed Changes**: Lista inicial de funciones (detalle, imagen y compartir, baja, responsable, URL externa). Diagrama «Cómo funciona» con `Baixes`. «Editar los eventos»: columnas J `responsable` y K `inscripcio_url`, con la nota de escribir J1 y K1 a mano, con formato de texto y la protección ampliada a J1:K1. «Inscripciones»: sustituir «Nunca la edita ni la borra» por el comportamiento de la baja, el archivo `Baixes` y que se quita la frase de contacto. «Desarrollo en local»: `npm run test:e2e` y qué hace. «Decisiones y límites»: Atrás en el detalle sale de la agenda, el tamaño de la imagen, el compartir con segundo toque. Nueva sección «Backup y restauración del script» con el procedimiento de siete pasos y una tabla corta versión de Apps Script, etiqueta y entrega. Nueva sección «Cómo publicar una entrega» con el orden script, web, datos.

#### 46. `docs/plantilla-esdeveniments.csv` (Modify)

*   **Entrega**: R2.
*   **Type / Scope**: Plantilla de datos.
*   **Proposed Changes**: Añadir las columnas `responsable` e `inscripcio_url` con valores de ejemplo, uno con responsable y otro con una URL externa.

#### 47. `docs/comprovacions-mobil.md` (Create)

*   **Entrega**: R1 (estructura) y R3 (comprobaciones de imagen y compartir).
*   **Type / Scope**: Lista de comprobación para el autor.
*   **Proposed Changes**: Pasos cortos para ejecutar en móvil real. R1: botón Atrás con el detalle abierto en Android, el navegador integrado de WhatsApp y `localStorage` compartido con Safari o Chrome. R3: la imagen se descarga y no sale en blanco, «Comparteix» en Android y en iPhone, y si WhatsApp en iPhone conserva el texto junto a la imagen. Cada paso tiene el resultado esperado y dónde anotar el resultado.

### Textos nuevos (catalán, propuesta de redacción para revisar)

Van en `src/lib/texts.js`. Se pueden cambiar sin tocar la lógica.

| Clave | Texto |
|---|---|
| `card.detail` | «detall» |
| `card.detailLabel(nom, data)` | «Veure el detall de {nom}, {data}» |
| `card.manager(nom)` | «Responsable: {nom}» |
| `detail.close` | «Tanca» |
| `detail.participation` | «Participació» |
| `detail.listTitle` / `detail.listEmpty` | «Persones apuntades» / «Encara no s’ha apuntat ningú.» |
| `detail.externalNote` | «La inscripció es fa en una web externa.» |
| `detail.notFound` | «Aquesta activitat ja no existeix.» |
| `detail.cannotCheck` | «No s’ha pogut comprovar l’activitat. Torna-ho a provar d’aquí a una estona.» |
| `share.download` / `share.share` / `share.copyLink` | «Descarrega la imatge» / «Comparteix» / «Copia l’enllaç» |
| `share.generating` / `share.ready` | «Generant…» / «Imatge preparada: prem de nou» |
| `share.copied` / `share.copyFailed` | «Enllaç copiat» / «No s’ha pogut copiar. Copia’l a mà:» |
| `share.imageFailed` | «No s’ha pogut generar la imatge. Torna-ho a provar.» |
| `share.fallbackNote` | «Aquest navegador no pot compartir la imatge. S’ha descarregat: adjunta-la al missatge.» |
| `share.waLink` | «Obre WhatsApp amb el text» |
| `share.text(url)` | «Apunta’t a l’activitat aquí: {url}» (marcador de posición del autor) |
| `participation.mine` | «La teva participació» |
| `participation.unsign` / `unsignConfirm` / `unsigning` | «Desapuntar-me» / «Segur? Prem de nou» / «Desapuntant…» |
| `participation.unsignDone` / `alreadyGone` | «T’has desapuntat.» / «Ja no hi eres a la llista.» |
| `participation.hint` | «Per desapuntar-te, obre aquest enllaç des del mateix navegador.» |
| `signupErrors.bad_request` | «No s’ha pogut fer. Recarrega la pàgina i torna-ho a provar.» |

### Verification Plan

*   **Compilation/Build**: `npm run build` con `BASE_PATH=/agenda-front-ampli` y `VITE_AGENDA_API_URL` apuntando a un servidor de pruebas, como hace `e2e/global-setup.js`. La compilación de producción real la hace el flujo de CI con la variable del repositorio.
*   **Unit Tests**: `npm test` (`node --test`) cubre los módulos puros nuevos y modificados (`state`, `my-signups`, `share-link`, `png`, `share`, `events`, `api`, `month`) y el script con la hoja simulada. Cada módulo nuevo tiene al menos las pruebas listadas arriba.
*   **Static Analysis & Linting**: `npm run check` (`svelte-check`) sin errores ni avisos. Los mocks de desarrollo deben cumplir los tipos actualizados.
*   **Test Coverage Requirement**: sin umbral numérico, porque el proyecto no mide cobertura. El criterio es que cada requisito G1 a G7 y cada CUJ tenga al menos una prueba, de la siguiente forma: CUJ 1 y 2 en `detail.spec.js`; CUJ 3 en `signup.spec.js`; CUJ 4 en `image.spec.js`; CUJ 5 en `share.spec.js`; CUJ 6 en `external.spec.js`; la matriz de estados en `state.test.js`; el script en `Code.test.js`. CUJ 7 se comprueba siguiendo el procedimiento del README.
*   **E2E/Integration**: `npm run test:e2e` con Playwright. Chromium escritorio y móvil para todos los flujos, y WebKit para la imagen. Se ejecuta en el CI y bloquea el despliegue si falla. Todo se prueba contra la compilación de producción bajo `/agenda-front-ampli/`, con el `Code.gs` real ejecutándose contra la hoja simulada.
*   **Comprobaciones manuales del autor** (lo que Playwright no puede probar): `docs/comprovacions-mobil.md`, en un móvil real, antes de dar por buenas R1 y R3.
*   **Tras desplegar el script** (R2 y R4): lectura con `curl` contra `/exec`, el `POST` de prueba que no escribe y, en R4, una baja real sobre una copia del libro.

### Decisiones de esta sección que toma el plan, no el autor

Son elecciones mecánicas con una respuesta razonable. Se pueden cambiar:

*   Las pruebas de navegador bloquean el despliegue y se reintentan hasta 2 veces en el CI.
*   WebKit se ejecuta solo en la prueba de imagen, porque es donde está el riesgo conocido de Safari.
*   Los valores de maquetación de la imagen (tamaños y colores) son un punto de partida a ajustar con la primera imagen real.
*   «Copia l’enllaç» cae a un campo seleccionable si el portapapeles falla.
*   El `features` del script se amplía por entrega: R2 declara `responsable` e `inscripcio_url`, y R4 añade `unsignup`.
*   `Baixes` se crea al vuelo al primer `unsignup`, sin tocar `setup()`.
*   Los textos en catalán de la tabla son una propuesta de redacción.

--------------------------------------------------------------------------------

<!-- Provenance: Indicates initial structural drafting via EGM. -->

*Drafted with EGM*
