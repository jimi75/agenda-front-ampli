# Agenda Frontamplista Sants-Montjuïc: detalle de evento, imagen, compartir y baja de inscripción

*   **Author:** Juan Peist
*   **Status:** Proposed
*   **Date:** 2026-11-11

--------------------------------------------------------------------------------

## Overview

La agenda es una web estática en catalán, publicada en GitHub Pages (SvelteKit con `adapter-static`), para unos 100 activistas conocidos del distrito de Sants-Montjuïc. Muestra las acciones y actos del **2 al 29 de noviembre de 2026** en un calendario (cuadrícula desde 1024 px, lista vertical en móvil). Los datos viven en una hoja de Google. Un Google Apps Script sirve los eventos y recibe las inscripciones, y la web lo lee al abrirse, sin recompilar.

Este diseño amplía esa agenda con cuatro cambios que pidió el equipo que la probó (un grupo de personas de la organización que la usó antes de publicarla):

1.  Un **detalle de evento**, a pantalla completa en móvil y como panel centrado desde 1024 px, con un enlace directo.
2.  **Descargar una imagen** del evento y **compartirla** (pensado para WhatsApp).
3.  **Quitar la propia inscripción**.
4.  Dos columnas nuevas en la hoja: **`responsable`** y una **URL externa de inscripción**.

Condiciones del proyecto que limitan el diseño:

*   **Vida corta.** Solo se usa hasta el 29 de noviembre. Este diseño es del 11 de noviembre de 2026: quedan 18 días de uso útil, y el valor de cada entrega baja con cada día de retraso.
*   **Calidad de producto mínimo viable.** El autor acepta detalles poco pulidos. No acepta borrar por error datos de otras personas.
*   **Roles.** El **autor** (Juan Peist) decide el diseño y lo implementa. El **dueño de la hoja** es quien edita la hoja de Google y despliega el script; se asume que es el propio autor, y si no lo fuera, los pasos manuales sobre la hoja y el script los hace el dueño. El **responsable** de un evento es la persona de la organización que lo lleva, y es un dato de la hoja (no un rol del sistema).
*   **Sin servidor propio.** Hay un sitio estático y un script de Google. Los eventos se leen en tiempo de ejecución, así que no puede haber páginas ni vistas previas por evento generadas al compilar.
*   **Todo el texto visible en catalán**, en `src/lib/texts.js`.
*   **Riesgos aceptados por el autor:** privacidad y seguridad de una lista pública de nombres de pila o apodos y de enlaces que se pueden compartir fuera del grupo.

## Current System

Cómo funciona hoy, antes de este diseño (verificado en `apps-script/Code.gs`, `src/` y el `README.md`):

*   **Vocabulario.** «Hoja» es la hoja de cálculo de Google (el libro completo); «pestaña» es cada hoja dentro del libro; «panel de compartir del sistema» es el panel nativo del móvil que se abre con `navigator.share`. `T` es el objeto de textos de `src/lib/texts.js`. `npm run check` ejecuta `svelte-check` (tipos y avisos de Svelte). Los dos tipos de evento son **Acció** (tarjeta lima) y **Acte** (tarjeta rojiza).
*   **La hoja** tiene tres pestañas:
    *   `Esdeveniments`, con las columnas A:I `id`, `data`, `inici`, `fi`, `tipus`, `nom`, `lloc`, `mapa` y `estat` (`estat` vacío, cancelado o modificado). El `id` lo escribe el dueño, es de hasta 20 caracteres `[a-z0-9-]` y debe ser único (una fila con un `id` repetido se ignora). La cabecera está en la fila 1 y protegida.
    *   `Inscripcions`, con las columnas `data_hora`, `event_id`, `nom` y `request_id`. El script solo añade filas.
    *   `Config`, donde la celda **B1** (`inscripcions_obertes`) cierra las inscripciones de toda la agenda cuando vale `NO`. Con cualquier otro valor están abiertas.
*   **El script** (`Code.gs`, pegado a mano en el editor de Apps Script y desplegado como aplicación web). `doGet ?action=agenda` devuelve `{ok, v:1, …}` con los eventos y los nombres apuntados. `doPost` solo acepta `signup`: valida el nombre, toma el lock del script (`LockService`, espera hasta 10 s; si no, `busy`), comprueba B1, que el evento exista y los topes (150 por evento, 3000 en total) y añade la fila. La web genera un `requestId` (UUID) en cada alta; el script lo guarda en `request_id` y en la caché del script (`CacheService`, 600 s) para que un reenvío no duplique la fila. Si la respuesta se pierde, la web «recupera» el resultado releyendo la agenda.
*   **La web** carga la agenda al abrirse, guarda una copia en `localStorage` (`STORAGE_KEY`) y la muestra si falla la red, con un aviso de «datos de hace X» (`staleSince`). Al terminar de cargar se desplaza al próximo día con eventos. La agenda se vuelve a pedir en silencio al abrir el modal de inscripción (para mostrar nombres actuales) y al volver a la pestaña después de un rato (`REFRESH_AFTER_MS`); una recarga en silencio nunca sustituye datos recientes por la copia sin conexión. Con `?admin` en la URL muestra un panel de diagnóstico, sin protección, con las filas ignoradas y las cabeceras que faltan.
*   **El modal de inscripción** es un `<dialog>` que «Participar» abre siempre. Tiene el formulario y la lista de nombres, y en eventos pasados, cancelados o cerrados la sustituye por una nota de solo lectura. La página guarda un único `selectedId`.

## The Problem

La agenda ya cubre lo básico: ver qué hay, cuándo y dónde, y apuntarse con un nombre. A partir de lo que pidió el equipo que la probó, quedan cinco carencias:

*   **No hay un lugar donde ver todo de un evento.** La tarjeta del calendario es pequeña. Un activista no puede abrir un evento concreto ni mandar a alguien un enlace que lo abra.
*   **No se puede difundir un evento.** Quien quiere invitar a otros por WhatsApp tiene que hacer una captura o escribir el texto a mano.
*   **Una inscripción hecha por error no se puede quitar.** Hoy el script solo añade filas. Solo el dueño de la hoja puede corregirlo, borrando la fila a mano.
*   **No se ve quién lleva cada evento.** La hoja no tiene ese dato.
*   **Algunos eventos se inscriben en otra web.** El botón «Participar» abre siempre el formulario interno y no deja redirigir.

**Solución propuesta.** Una vista de detalle (a pantalla completa en móvil y como panel centrado desde 1024 px) con la información completa, la imagen, el compartir y los datos nuevos. El modal de inscripción se reduce al formulario y a quitar la propia participación. El script incorpora una acción de baja y la hoja dos columnas opcionales. Se entrega en cinco entregas, R0 a R4, para no romper la web publicada: el script se actualiza siempre primero y la baja, que es lo único que borra datos de terceros, va la última.

## Goals

Cada objetivo se puede comprobar:

*   **G1. Detalle de evento.** Cada tarjeta tiene un enlace «detall», con el tamaño de letra del cuerpo de la tarjeta (sin mayúsculas ni espaciado de letras), arriba a la derecha y en la línea del tipo. Abre el detalle, a pantalla completa por debajo de 1024 px y como panel centrado desde 1024 px, con: tipo, nombre, fecha y hora, lugar con enlace a Google Maps, responsable, recuento, lista de apuntados (recuento y lista no salen en eventos con URL externa, G5) y «Participar». Un enlace directo `…/?e=<id>` abre ese detalle al cargar. Tocar la tarjeta fuera de un enlace o botón no hace nada.
*   **G2. Imagen descargable.** «Descarrega la imatge» baja un PNG de **exactamente 2048 × 1346 px** con solo: título de la agenda (el de la cabecera, en una banda superior), tipo, nombre, día, inicio y fin, y lugar. Sin botones, enlaces, recuento ni responsable. Un nombre o lugar largo se recorta (sin puntos suspensivos, ver el ítem de `PosterView.svelte`) y queda dentro de la imagen.
*   **G3. Compartir (pensado para WhatsApp).** «Comparteix» envía la imagen junto con un texto en catalán con el enlace al detalle, usando la Web Share API con archivos en los navegadores que la admitan (se detecta con `navigator.canShare`, sin lista de versiones). Donde no, ofrece un enlace `wa.me` solo con texto y un botón «Copia l’enllaç». Si el navegador rechaza el compartir con `NotAllowedError` (la causa habitual es que la activación del usuario caducó mientras se generaba la imagen), la web conserva la imagen y pide un segundo toque. La descarga de la imagen funciona en los navegadores que permiten descargar un archivo generado; en el navegador integrado de WhatsApp está por comprobar (ver Open Questions).
*   **G4. Quitar la propia inscripción.** Una persona puede quitar una inscripción suya solo desde el navegador donde se apuntó. La web solo ofrece la baja mientras el evento está abierto a inscripciones (no pasado, no cancelado, no cerrado y sin URL externa). El script acepta la baja con el `requestId` correcto y archiva el nombre antes de borrar la fila. Solo puede quitarla quien tenga el `requestId`: ese navegador y el dueño de la hoja.
*   **G5. Campos nuevos en la hoja.** `responsable` (solo un nombre) se ve en la tarjeta y en el detalle. `inscripcio_url`, si tiene valor, hace que «Participar» abra esa web y oculta el recuento y la lista de ese evento.
*   **G6. Modal de inscripción reducido.** Solo el formulario y «La teva participació / Desapuntar-me», sin la lista de apuntados, que se ve en el detalle. Solo se abre en eventos abiertos a inscripciones.
*   **G7. Todo en catalán, sin romper lo publicado.** Los textos nuevos van en `src/lib/texts.js`. Las entregas siguen el orden R0 a R4, el script siempre primero y siempre aditivo, y antes de cada cambio del script se guarda en Git (con un commit) el código que está desplegado. `npm run check`, `npm test` y `npm run test:e2e` pasan en cada entrega.

## Non-Goals

*   Teléfono o enlace directo de WhatsApp del responsable. Se descartó para no publicar su móvil.
*   Páginas o vistas previas por evento generadas al compilar. Los eventos se leen en tiempo de ejecución, así que no es posible.
*   Abrir el detalle tocando la tarjeta.
*   Enviar la imagen a un chat concreto, o limitar el panel de compartir del sistema a WhatsApp. El navegador no lo permite.
*   Quitar una inscripción desde otro navegador o dispositivo, con PIN, cuenta, cookies, IndexedDB o una copia del registro en el servidor.
*   Un contacto en pantalla para pedir correcciones o borrados de nombres (la frase actual del modal se elimina; ver «Textos»).
*   Seguimiento preciso de quién se apunta en los eventos con URL externa.
*   Vista previa de la imagen.
*   Plantillas de imagen.
*   Ajuste automático del tamaño del texto de la imagen (el texto largo se recorta).
*   `v:2` de la API.
*   Una pantalla propia de «evento no encontrado».
*   Comparaciones de la imagen píxel a píxel con una referencia.
*   Una caché de `doGet`.
*   Reforzar la privacidad o la seguridad más allá de lo ya aceptado: validación de nombres más estricta, autenticación y límite de peticiones.

## Open Questions

Las decisiones de arquitectura las tomó el autor y figuran en «Decisiones de arquitectura» del apartado Technical Plan (Architecture). Cada comprobación siguiente tiene una regla: qué se hace según el resultado. Las comprobaciones S1 a S3 se hacen en las primeras entregas (ver «Orden de entrega y compatibilidad de versiones») y deciden si R3 y R4 se construyen.

**Resuelto con el código de `html-to-image` 1.11.13 (ya no son preguntas):** la opción `stabilizationAttempts` no existe en esa versión (el README de la rama `master` documenta la rama v2, sin publicar), así que el respaldo es repintar si el resultado sale vacío. Con `pixelRatio: 1` y `width` y `height` explícitos, la librería crea un canvas de exactamente 2048 × 1346. La librería incrusta solo las familias de fuente que usa el elemento, y el póster usa una sola (`Special Gothic Condensed One`).

Comprobaciones que solo puede hacer el autor en móvil real (no se pueden verificar desde el entorno de desarrollo):

*   **S1. Render de la imagen** (antes de R3). Genera una imagen de 2048 × 1346 en un iPhone antiguo y en un Android de gama baja. Mide el tiempo y comprueba que no sale en blanco y que la fuente se aplica. *Regla:* si sale en blanco dos veces seguidas, tarda más de 5 s o la fuente cae a otra, R3 pasa a dibujar la imagen en un canvas (Alternativa G); si tampoco funciona, R3 se descarta y queda el compartir solo con texto de R1.
*   **S2. WhatsApp y el texto con la imagen** (antes de R3). Comprueba en iPhone y en Android si WhatsApp conserva el texto junto a la imagen adjunta. *Regla:* si no lo conserva, se documenta como límite en el README y la persona usa «Copia l’enllaç».
*   **S3. Navegador integrado de WhatsApp** (antes de R4). Comprueba si permite descargar un archivo, y si `localStorage` se conserva al cerrar y volver a abrir el enlace desde WhatsApp. *Regla:* si no conserva `localStorage`, R4 no se construye (la baja sigue haciéndola el dueño de la hoja a mano); si no permite descargar, se documenta en el README y se muestra «Copia l’enllaç».
*   **Botón Atrás** (con R1). Anota qué hace Atrás en Android con el detalle abierto. Atrás depende del navegador (en Chrome reciente cierra un `<dialog>` modal) y no es parte del contrato de este diseño. No hay regla: el resultado se anota en el README.

## Critical User Journeys (CUJs)

### CUJ 1: Abrir el detalle desde el calendario

*   **Given**: la agenda está cargada y hay un evento futuro, no cancelado y sin URL externa.
*   **When**: la persona toca «detall» en la tarjeta.
*   **Then**: se abre el detalle (a pantalla completa por debajo de 1024 px, como panel centrado con el calendario visible detrás desde 1024 px) con tipo, nombre, fecha y hora, lugar con enlace a Google Maps, responsable (si lo hay), recuento, lista de apuntados y «Participar». La barra de direcciones no cambia. Se cierra con «Tanca» o con Esc. El botón Atrás depende del navegador y no es parte del contrato (ver Open Questions).

### CUJ 2: Abrir un enlace compartido

*   **Given**: alguien recibe por WhatsApp `…/agenda-front-ampli/?e=paradeta-1`.
*   **When**: lo abre.
*   **Then**: la agenda carga y, al terminar, abre el detalle de ese evento sin desplazarse al próximo día. Si el id no existe en la agenda cargada (sea la recibida del script o la copia sin conexión), sale el aviso «No s’ha trobat aquesta activitat» y el calendario. Un evento pasado o cancelado se abre en solo lectura, sin «Participar» ni «Desapuntar-me».

### CUJ 3: Apuntarse y quitar la propia inscripción

*   **Given**: un evento futuro con inscripciones abiertas y un navegador sin registro de ese evento.
*   **When**: la persona pulsa «Participar», escribe un nombre y envía. Más tarde vuelve al mismo evento desde el mismo navegador.
*   **Then**: el nombre aparece en la lista y el navegador guarda un registro local (evento, `requestId`, nombre). Al reabrir el modal con «Participar» sale «La teva participació» con el nombre y «Desapuntar-me». Tras pulsarlo y confirmar con un segundo toque, el script archiva el nombre en `Baixes`, borra la fila y el nombre desaparece de la lista. Desde otro navegador no aparece ese botón. En un evento pasado, cancelado, cerrado o con URL externa tampoco, porque en esos estados «Participar» no abre el modal.

### CUJ 4: Descargar la imagen

*   **Given**: un evento futuro y no cancelado, con el detalle abierto.
*   **When**: pulsa «Descarrega la imatge».
*   **Then**: la web genera un PNG de 2048 × 1346 px con el título de la agenda, tipo, nombre, día, inicio y fin, y lugar, y lo descarga como `agenda-<id>.png`. Mientras genera, el botón muestra «Generant…» y no admite otro toque.

### CUJ 5: Compartir (pensado para WhatsApp)

*   **Given**: un evento futuro y no cancelado, con el detalle abierto, en un navegador que admite compartir archivos.
*   **When**: pulsa «Comparteix».
*   **Then**: la web genera la imagen y abre el panel de compartir del sistema con la imagen y el texto `«Apunta’t a l’activitat aquí: <url>»`. Si el navegador rechaza con `NotAllowedError` (causa habitual: activación caducada), el botón pasa a «Imatge preparada: prem de nou» y el segundo toque abre el panel. Si el segundo toque también se rechaza, pasa al respaldo. En un navegador sin soporte de archivos, descarga la imagen y muestra un enlace `wa.me` solo con el texto, con el aviso de adjuntar la imagen. «Copia l’enllaç» está en el detalle en todos los estados con compartir; si el portapapeles falla, muestra la URL en un campo para copiarla a mano.

### CUJ 6: Evento con inscripción en una web externa

*   **Given**: la hoja tiene una URL https en `inscripcio_url` de un evento futuro y no cancelado.
*   **When**: la persona pulsa «Participar», en la tarjeta o en el detalle.
*   **Then**: se abre esa web en una pestaña nueva y no se abre el modal. Ni la tarjeta ni el detalle muestran recuento ni lista de ese evento.

### CUJ 7: El autor publica una entrega sin romper la web

*   **Given**: la web está publicada y el script desplegado en una versión conocida.
*   **When**: el autor sigue el orden de la entrega: primero el script, después la web y, al final, los datos nuevos de la hoja.
*   **Then**: antes de tocar el script, el código desplegado queda guardado en Git con un commit. Cada paso de código se puede revertir: la web con `git revert` (si el CI está en rojo, se despliega la reversión con la entrada `skip_e2e` del flujo, ver `.github/workflows/deploy.yml`) y el script volviendo a su versión anterior (o, si esa versión ya no existe, pegando en el editor el archivo del commit de backup y desplegando una versión nueva). Los nombres que ya se dieron de baja no se restauran solos: quedan en `Baixes`. Una caída momentánea de la web mientras se despliega es aceptable.

## Technical Plan (Architecture)

### Decisiones de arquitectura

Elegidas por el autor entre varias opciones (salvo las marcadas como decisión del plan), con sus riesgos en la alternativa descartada que se indica:

| Decisión | Elección | Alternativa descartada |
|---|---|---|
| Historial y botón Atrás del detalle | **Sin historial.** Abrir o cerrar el detalle no toca la URL ni el historial. `?e=<id>` solo se lee al cargar. | J |
| Cómo se dibuja la imagen | **Librería que convierte HTML en imagen: `html-to-image` 1.11.13** (MIT; se añade como dependencia). Plan B si falla el spike S1: canvas. | G, H |
| Cuándo se renderiza la imagen | **Al pulsar el botón** (no antes). | K |
| Qué envía «Comparteix» y qué pasa si falla | **Un solo `navigator.share({files, text})` con segundo toque** si el navegador rechaza con `NotAllowedError`. Respaldo a descarga más `wa.me` si no hay soporte de archivos, si el segundo toque también falla o si hay otro error. | L |
| Cómo se carga la librería | **Importación estática**: va en el paquete principal (unos 7 KB comprimidos más, estimación por medir en R3). | M |
| Backup del script | **Git: el código desplegado se guarda con un commit** antes y después de cada cambio del script. | N |
| Detalle en pantallas grandes | **Pantalla completa por debajo de 1024 px y panel centrado desde 1024 px.** | Q |
| Pruebas de los flujos de navegador | **Playwright dentro del repositorio** (`@playwright/test`). `chromium` y `mobile` bloquean el despliegue; `webkit` solo prueba la imagen y no bloquea. | R |
| Cuántos diálogos (decisión del plan) | **Un `<dialog>` de detalle y, encima, el modal de inscripción reducido**, que no se reescribe desde cero. | S |
| Cómo se quita una inscripción | **`localStorage` con `requestId`**, y solo si el spike S3 sale bien. | E, T |

Decididas antes: la baja usa `deleteRow` con archivo en `Baixes` (Alternativa F); columnas nuevas al final de la hoja (J = `responsable`, K = `inscripcio_url`) con cabeceras escritas a mano (Alternativa O); el script va primero, siempre aditivo; un solo mensaje con imagen y enlace, en vez de dos botones separados (Alternativa L).

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
     └─ share.js      (enlace del detalle, navigator.share, wa.me, copiar enlace)
```

### Datos: hoja y script

*   **`Esdeveniments`.** Dos columnas opcionales nuevas: J `responsable` (texto, se muestra hasta 60 caracteres) y K `inscripcio_url` (solo `https://`, sin espacios, con la misma validación que `mapa`; si no es válida se trata como vacía). Las cabeceras se escriben a mano en J1 y K1, con formato de texto en J:K y la protección ampliada a J1:K1. `readTable_` ya lee por nombre de cabecera. `EVENT_COLUMNS` y `setup()` no cambian (siguen en 9 columnas, A:I): las dos columnas nuevas se declaran aparte en `OPTIONAL_EVENT_COLUMNS` y `readAgenda_` lee `EVENT_COLUMNS.concat(OPTIONAL_EVENT_COLUMNS)`. Por eso una hoja nueva creada con `setup()` sigue teniendo 9 columnas y J1 y K1 se escriben a mano, como en la Alternativa O.
*   **`Baixes` (nueva).** Archivo solo de añadir filas: `data_hora_baixa`, `event_id`, `nom`, `request_id`, con formato de texto en toda la hoja. Se crea al vuelo la primera vez que se da de baja a alguien.
*   **`doGet`.** La respuesta mantiene `v: 1` y, en cada evento, añade `responsable` e `inscripcio_url` (R2). En R4 añade además `features: ['unsignup']`. No devuelve nunca `request_id`.
*   **`doPost`.** Se ramifica por `action` justo después de leer el cuerpo y antes de validar el nombre. El lock (`LockService`) y el `try/catch/finally` siguen en `doPost` y rodean a la rama elegida:
    *   `signup` no cambia: mantiene sus comprobaciones y su manera actual de evitar duplicados (la caché `req:` de 600 s). No se añade ninguna búsqueda de `requestId` en `Baixes`: la web crea un `requestId` nuevo en cada alta y `recover()` nunca reenvía el anterior, así que ningún camino de la web reenvía un `requestId` ya dado de baja.
    *   `unsignup` recibe `{action, eventId, requestId}`, valida solo `eventId` (máximo 20 caracteres) y `requestId`, toma el mismo lock, y no mira B1 ni si el evento existe. Busca la fila por `event_id` más `request_id` (no vacío), la relee justo antes de borrar usando los índices de columna por cabecera (`readTable_`), y si ya no coinciden responde `removed:false` sin buscar otra vez. Si coinciden, añade el nombre a `Baixes` y borra la fila. Responde `{ok:true, v:1, eventId, names, removed}`. Si no la encuentra, `removed:false` con la lista actual. Errores posibles: `bad_request`, `busy`, `server`.

### Web: estado, detalle y enlace directo

*   **Estado de la página.** `+page.svelte` sustituye `selectedId` por dos: `detailId` y `signupId`. Cerrar el modal pequeño no cierra el detalle. «Veure apuntats» (en los estados que no son «abierto») abre el detalle.
*   **Enlace directo.** `?e=<id>` se lee en `onMount` después de la primera carga correcta (también cuando esa carga entrega la copia sin conexión) y abre el detalle. Si la primera carga termina en error, `?e=` no se vuelve a leer al reintentar: la persona ve el error de carga habitual y puede abrir el evento desde el calendario. En ese caso no se ejecuta el desplazamiento al próximo día. La URL para compartir es `location.origin + location.pathname + '?e=' + encodeURIComponent(id)`. No arrastra `?admin` y no depende de ninguna API de SvelteKit. Con la decisión de no tocar el historial, el enlace se construye siempre así y la barra de direcciones no refleja el evento abierto.
*   **El evento desaparece con el detalle abierto.** Si tras una recarga el evento ya no está, el detalle muestra solo el aviso «No s’ha trobat aquesta activitat» y «Tanca», sin acciones. No se guarda ninguna copia del evento. Es el mismo aviso que sale con un `?e=` desconocido.
*   **Enlace «detall».** Es un `<a href="?e=<id>">` con el tamaño de letra del cuerpo de la tarjeta, arriba a la derecha en la línea del tipo. Anula el tamaño, las mayúsculas y el espaciado heredados de la etiqueta de tipo. Tiene una zona táctil de al menos 24 × 24 px con relleno invisible, y un `aria-label` con el nombre y la fecha del evento. Solo el clic normal abre el detalle en la página; el clic con Ctrl, Cmd o botón central conserva el comportamiento nativo del navegador (abrir `?e=<id>` en otra pestaña).
*   **Diálogos.** El detalle es un `<dialog>`: a pantalla completa por debajo de 1024 px y, desde 1024 px, un panel centrado de ancho limitado, con scroll interno y fondo atenuado en el que se ve el calendario. El de inscripción se abre encima, solo desde un evento abierto. Esc cierra el de arriba. El bloqueo de scroll existente sirve para ambos.

### Estados y acciones

Una función pura `participationState(event, {today, signupsOpen})` decide el estado, con esta prioridad: pasado, cancelado, externo, cerrado, abierto. Sustituye la lógica duplicada de `EventCard` y `+page.svelte`. Un evento es pasado si su fecha es anterior a hoy en `Europe/Madrid`. Los componentes comparan directamente con el valor (`state === 'open'`); no hay más funciones de predicado.

| Estado | «Participar» | «Desapuntar-me» | Descarrega, Comparteix, Copia l’enllaç | Recuento y lista |
|---|---|---|---|---|
| Pasado | No | No | No | Visibles, solo lectura |
| Cancelado | No | No | No | Visibles |
| Con URL externa | Abre la web externa y ignora B1 | No | Sí | Ocultos |
| Cerrado (B1 = NO) | No; muestra «Les inscripcions estan tancades» | No | Sí | Visibles |
| Abierto | Abre el modal | Sí, si hay registro local | Sí | Visibles |

«Desapuntar-me» solo se ofrece en estado `open`, dentro de «La teva participació» del modal, si hay registro local de ese evento en este navegador y `features` incluye `unsignup`. Es una decisión del autor: en los demás estados la persona no puede quitarse; si hace falta, lo hace el dueño de la hoja a mano. El script no aplica esta restricción (acepta la baja con el `requestId` correcto aunque B1 sea NO), así que la restricción es solo de la web.

### Imagen

*   **Elemento.** Un componente `PosterView` con tamaño fijo de 2048 × 1346 px CSS, con título de la agenda (`T.siteTitle`, en una banda superior), tipo, nombre, día, inicio y fin, y lugar. Los colores por tipo salen de las variables CSS existentes, porque la librería copia los estilos calculados. Sin botones, enlaces, recuento ni responsable. Se monta fuera de pantalla pero dentro del DOM (no `display:none`) solo cuando se pulsa un botón, y se desmonta al terminar. Solo usa una fuente, `Special Gothic Condensed One`.
*   **Generación.** Según el código publicado de 1.11.13, `cloneCSSStyle` copia todo el estilo calculado del nodo raíz al clon, incluida la posición fuera de pantalla, y la imagen saldría vacía aunque tenga el tamaño correcto. Por eso la llamada a `toBlob` pasa `style: { position: 'static', left: '0', top: '0', transform: 'none', margin: '0' }`, además de `pixelRatio: 1`, `width: 2048` y `height: 1346` explícitos. Con esos valores el canvas mide exactamente 2048 × 1346 (sin `pixelRatio` fijado, un móvil 3x produciría 6144 × 4038). Antes de capturar, espera a la fuente con el texto real (`document.fonts.load`) y, si `document.fonts.check` sigue en falso, lanza `image_failed`: sin esa comprobación, un fallo de carga de la fuente se tragaría en silencio y saldría otra fuente.
*   **Comprobaciones del resultado.** Un resultado vacío es el riesgo conocido de WebKit. Después de generar, dibuja el PNG reducido en un canvas pequeño y comprueba que algún píxel no es transparente. Si es transparente, repinta una vez y vuelve a comprobar; si sigue vacío, lanza `image_failed`. Así el repintado solo cuesta tiempo cuando hace falta. Toda la generación va dentro de una carrera con un límite de 20 s, para que el botón no se quede en «Generant…» si la librería no responde. El tamaño exacto no se comprueba en producción (queda fijado por construcción); `image.spec.js` lo verifica leyendo la cabecera del PNG.
*   **Archivo.** El resultado es un `File` llamado `agenda-<id>.png`. Solo se conserva en memoria en el estado «preparada» (segundo toque de compartir) y se descarta al cerrar el detalle. La descarga siempre vuelve a generar la imagen.
*   **Descarga.** Un `<a download>` temporal sobre una URL de objeto.

### Compartir

*   **Texto.** `T.share.text(url)` devuelve `«Apunta’t a l’activitat aquí: <url>»`. Es un marcador de posición del autor y vive en `texts.js`.
*   **Flujo de «Comparteix»**, con la decisión de renderizar al pulsar y segundo toque. No se comprueba `canShare` antes de generar, porque el respaldo (descargar la imagen) también necesita la imagen:

```text
idle ──toque──► generando ──ok──► share({files, text}) ──ok──► idle
                   │                    ├─ AbortError ──────────► idle (la persona cerró el panel, o no
                   │                    │                          hay destinos; «Copia l’enllaç» sigue ahí)
                   │                    ├─ NotAllowedError ─────► preparada (archivo en memoria,
                   │                    │                          botón «Imatge preparada: prem de nou»)
                   │                    └─ otro error / sin
                   │                       soporte de archivos ──► respaldo: descarga la imagen +
                   │                                                enlace wa.me solo con texto + aviso
                   └─ error al generar ──► idle + mensaje «No s’ha pogut generar la imatge»

preparada ──toque──► share({files, text}) llamado sin await previo ──► idle / respaldo
                     (un segundo NotAllowedError va al respaldo; nunca vuelve a «preparada»)
```

*   **Respaldo.** `wa.me` se muestra como un `<a target="_blank" rel="noopener noreferrer">` real con `?text=` codificado, no con `window.open`. «Copia l’enllaç» copia la URL del detalle; si el portapapeles falla, muestra la URL en un campo seleccionable.
*   **Toques repetidos.** Mientras se genera, el botón está desactivado y los toques extra se ignoran.

### Baja de inscripción en el navegador

*   **Registro local.** `my-signups.js` guarda en `localStorage`, con una clave propia distinta de la copia de la agenda, `{v:1, items:[{eventId, requestId, name}]}`. Sin tope de registros ni caducidad (la web deja de usarse el 29 de noviembre). Tolera JSON corrupto y que `localStorage` no exista.
*   **Dueño del registro.** `createApi` es el único que escribe: añade el registro cuando `signup` termina en `ok` (con el `storage` que ya se le inyecta) y lo quita cuando `unsignup` termina en `ok`, también con `removed:false`. `+page.svelte` guarda una copia reactiva (`mine`, con `$state`) y la vuelve a leer con `readMine` después de cada `signup` o `unsignup`. Esto empieza a funcionar desde la primera entrega web, antes de que exista `unsignup`.
*   **Alta.** `api.signup` genera el UUID antes del `try` y lo devuelve en el resultado, también por la ruta de recuperación.
*   **Baja.** En «La teva participació», cada registro tiene «Desapuntar-me» con confirmación en dos toques. `api.unsignup(eventId, requestId)` envía el `POST` de texto plano. Con `ok` se quita el registro local y se actualiza la lista con los `names` de la respuesta. Con `removed:false` se quita el registro y se muestra «Ja no hi eres a la llista». Con error de red o `busy` se conserva el registro y se pide reintentar: como `unsignup` es idempotente, basta repetir con el mismo `requestId`, sin el mecanismo de recuperación de `signup`. Los errores usan los textos de `T.signupErrors` (`network`, `busy`, `server`, `bad_request`).

### Textos

Todos los textos nuevos, en catalán, van a `src/lib/texts.js`, en los grupos nuevos `card`, `detail`, `share` y `participation`. Se elimina la frase `dialog.correction` («Si t’has equivocat, escriu a qui organitza…»), y `dialog.listTitle` y `dialog.listEmpty` pasan a `detail`. La cabecera de la página no cambia; el póster usa `T.siteTitle`.

### Backup y restauración del script

El código del script existe en dos sitios que nada obliga a mantener iguales: `apps-script/Code.gs` y `apps-script/appsscript.json` en el repositorio, y el proyecto de Apps Script, donde se pega a mano. Además, el editor puede ir por delante de lo desplegado: una implementación apunta a una versión numerada (una instantánea), y lo que se guarda después en el editor no se publica hasta crear una versión nueva. Ya pasó en este proyecto (un cambio del 11 de noviembre estaba en el editor y en el repositorio y nunca se desplegó). Por eso «sin diferencias entre el editor y el repositorio» no prueba que el repositorio sea lo desplegado; lo prueba la respuesta real del script (paso 4). El backup es una etiqueta de Git, `script-vN` con N igual a la versión de Apps Script, sobre un commit que contiene el código exacto, antes y después de cada cambio.

**Procedimiento en cada entrega que toque el script (R2 y R4):**

1.  **Anotar la versión en uso.** En «Gestionar implementaciones», apuntar el número de versión N que usa la implementación de la web, y su ID (el de la URL `/exec` de `AGENDA_API_URL`).
2.  **Capturar el estado.** Copiar el contenido de `Code.gs` y de `appsscript.json` del editor (en el editor el archivo se llama `Código.gs`) sobre los archivos de `apps-script/` y ejecutar `git diff`. Si hay diferencias, hacer commit «script: estado del editor antes de R2». Crear la etiqueta `script-vN` sobre el commit que contiene ese código y subirla (`git push origin script-vN`; una etiqueta no dispara el CI).
3.  **Desplegar.** «Gestionar implementaciones → ✎» de la implementación **cuyo ID coincide con el de la web** → «Versión nueva», con la descripción de la entrega. La URL `/exec` no cambia. Nunca «Nueva implementación»: crea un ID y una URL distintos, y la web seguiría llamando al script antiguo. Si ocurre, se mueve la implementación de la web a la versión nueva y se archiva la extra.
4.  **Verificar la respuesta real**, no solo el editor: `curl -sL "$URL?action=agenda"` contra la URL de la web debe contener lo que cambia la entrega (R2: `responsable` e `inscripcio_url` en cada evento). Después, las comprobaciones del README y las propias de la entrega.
5.  **Guardar lo desplegado.** Anotar el número de versión nuevo N' que muestra el editor, pegar de nuevo el contenido del editor sobre `apps-script/` (`git diff` debe salir vacío) y crear y subir la etiqueta `script-vN'` sobre el commit con ese código.

**Restauración si una entrega falla:**

*   **Rápida, mientras el proyecto exista:** «Gestionar implementaciones → ✎ de la implementación de la web → elegir la versión N». Las versiones son instantáneas inmutables y la URL no cambia. Es la restauración fiable del estado desplegado.
*   **Si esa versión ya no existe o el proyecto se dañó:** `git checkout script-vN -- apps-script/Code.gs apps-script/appsscript.json` (con la etiqueta del estado anterior a la entrega que falló), pegar los dos archivos en el editor y desplegar una versión nueva en la misma implementación. La URL no cambia. Son unos minutos.
*   **Datos.** El backup cubre el código, no la hoja. Los nombres dados de baja con `unsignup` quedan en `Baixes`. Para otros daños en la hoja se usa el historial de versiones de Google Sheets y la copia de `Inscripcions` hecha antes de R4.

**Límites.** El backup solo protege lo que se copió al repositorio: un cambio hecho en el editor y nunca copiado no queda respaldado, y por eso los pasos 2 y 5 comparan con `git diff`. La copia del editor al repositorio se hace a mano, sin `clasp`, para no instalar herramientas ni activar la API de Apps Script. Esta elección es del plan y no del autor; `clasp pull` queda como mejora futura.

### Orden de entrega y compatibilidad de versiones

El script se actualiza siempre primero y siempre de forma aditiva. La web se despliega con `git push` y el script a mano («Gestionar implementaciones → Versión nueva», nunca «Nueva implementación», que cambia la URL `/exec`). La web tolera un script antiguo: lee `features` (vacío si no existe) y trata `responsable` e `inscripcio_url` como vacíos si faltan.

**Pasos previos (antes de R1).** Anotar la versión de Apps Script desplegada hoy (la N del backup de R2). R2 es aditivo y no necesita copia de la hoja; la copia de `Inscripcions` se hace antes de R4.

| Entrega | Fecha objetivo (propuesta del plan) | Contenido | Toca script u hoja | Cómo se deshace |
|---|---|---|---|---|
| **R0** (hecha) | | Punto de partida: la agenda ya publicada, tal como está hoy en `main`. | No | `git revert` |
| **R1** web | 15 de noviembre | Detalle, `?e=`, enlace «detall», modal reducido, «Veure apuntats», «Comparteix» y «Copia l’enllaç» solo con texto (`wa.me`), `requestId` devuelto y registro local, textos, y la infraestructura de pruebas de navegador. | No | `git revert` |
| **R2** script, luego web | 18 de noviembre | Antes: backup del script (ver «Backup y restauración del script»). Script: `responsable` e `inscripcio_url` en cada evento. Cabeceras J1 y K1 a mano. Después la web muestra el responsable y redirige «Participar». Al final se rellenan los datos. | Sí | Volver a la versión anterior en «Gestionar implementaciones» o, si no existe, restaurar el commit de backup |
| **R3** web (opcional) | 23 de noviembre | Imagen, descarga y «Comparteix» con archivo (`html-to-image`). Empieza con el spike S1. | No | `git revert` |
| **R4** script, luego web (opcional) | 26 de noviembre | Antes: backup del script. Script: rama `unsignup` y `Baixes`. Después la web muestra «Desapuntar-me» si `features` incluye `unsignup`. Se prueba antes en una copia del libro, con copia de seguridad de `Inscripcions`. Empieza con el spike S3. | Sí | Volver a la versión anterior o restaurar el commit de backup (los nombres borrados quedan en `Baixes`) |

**Corte.** El mínimo es R1 más R2. R3 y R4 son opcionales. Si el spike S1 falla o R3 no está lista el 23 de noviembre, R3 se descarta (queda el compartir con texto de R1). Si el spike S3 falla o R4 no está lista el 26 de noviembre, R4 se descarta. El orden de recorte es primero R4 y después R3. Las fechas son una propuesta del plan; el autor las ajusta. R1 lleva consigo el compartir con texto para que la petición principal de difusión llegue en la primera entrega.

No se despliegan juntos: lectura (R2) y escritura destructiva (R4) en la misma versión del script; datos con URL externa en la hoja antes de que la web de R2 esté publicada; quitar la lista del modal antes de que el detalle la muestre.

### Diagnóstico para el dueño

`?admin` pasa a mostrar además la versión de la API (`v`), `features` y el número de registros locales de este navegador (el número sirve para el spike S3), junto con las filas ignoradas y las cabeceras que faltan, que ya muestra. El script escribe un `console.log` por cada baja (evento y `removed`, tanto si borró la fila como si no), visible en el panel de ejecuciones de Apps Script. No hay forma de enterarse de un fallo de compartir o de baja en el móvil de otra persona; se acepta.

## Alternatives Considered

Las decisiones con más de una respuesta defendible las eligió el autor entre las opciones que se le presentaron, salvo las marcadas como decisión del plan. El motivo técnico de cada alternativa está en «Cons»; «Reason for Rejection» indica la decisión tomada. «Rejected by author» significa que el autor eligió otra opción.

### Alternativa A: Teléfono y enlace directo de WhatsApp del responsable

*   **Pros**: un toque para escribir a quien lleva el evento.
*   **Cons**: publica el móvil de esa persona en una web y en un repositorio públicos. En la hoja, Sheets suele quitar ceros y el `+` de los números.
*   **Reason for Rejection**: Rejected by author: se publicaría un teléfono personal. Se deja solo el nombre.

### Alternativa B: Adjuntar la imagen desde un enlace `wa.me` o `whatsapp://send`

*   **Pros**: un botón que abre WhatsApp directamente.
*   **Cons**: esos enlaces solo admiten texto y no pueden llevar archivos adjuntos. Es una afirmación que no se ha comprobado contra la documentación oficial de WhatsApp; si fuera falsa, el respaldo de texto de este diseño seguiría siendo válido y solo se perdería una vía más directa.
*   **Reason for Rejection**: Se adopta la Web Share API con archivos, y `wa.me` queda solo como respaldo de texto. La comprobación contra la documentación de WhatsApp queda como tarea del autor en la comprobación S2.

### Alternativa C: Páginas de detalle por evento, generadas al compilar

*   **Pros**: URLs limpias y una vista previa propia en WhatsApp.
*   **Cons**: los eventos se leen de la hoja en tiempo de ejecución, así que no se conocen al compilar. Cada cambio de la hoja exigiría recompilar y volver a publicar.
*   **Reason for Rejection**: No viable con un sitio estático y datos leídos en tiempo de ejecución. Se adopta un modal más el enlace `?e=<id>`.

### Alternativa D: Abrir el detalle tocando toda la tarjeta o el nombre

*   **Pros**: una zona táctil grande y fácil de descubrir.
*   **Cons**: la tarjeta ya contiene enlaces y botones, y un toque accidental abriría el detalle.
*   **Reason for Rejection**: Rejected by author: solo los enlaces y los botones disparan acciones. Convertir el nombre en enlace se propuso en una revisión y no se adopta.

### Alternativa E: Otras formas de quitar una inscripción (PIN, botón en todos los nombres, cuentas, cookies, IndexedDB o copia en el servidor)

*   **Pros**: el PIN funciona entre dispositivos; el botón en todos los nombres no tiene fricción.
*   **Cons**: el PIN añade un campo y puede olvidarse. Con un botón para todos, cualquiera con el enlace puede vaciar listas, y borrar datos es peor que el spam ya aceptado. Las cuentas cambian la arquitectura. Cookies, IndexedDB o una copia en el servidor suman complejidad por poca ganancia.
*   **Reason for Rejection**: Rejected by author: se aceptó `localStorage`, porque su fallo (otro navegador, datos borrados) lo cubre el borrado manual del dueño de la hoja. Esa cobertura depende de que el dueño pueda actuar a tiempo; por eso R4 solo se construye si el spike S3 confirma que `localStorage` se conserva en el navegador integrado de WhatsApp. Un enlace secreto de baja que funcione entre navegadores se recoge en la Alternativa T.

### Alternativa F: Vaciar solo la celda `nom` en lugar de borrar la fila

*   **Pros**: no cambia el esquema y el rollback del script no resucita a nadie.
*   **Cons**: deja filas vacías que hay que ignorar en cada lectura y excluir del tope por evento, y obliga a que `signup` trate filas sin nombre.
*   **Reason for Rejection**: Rejected by author: se eligió `deleteRow` con el nombre archivado en `Baixes`, que mantiene `Inscripcions` limpia y deja el nombre recuperable.

### Alternativa G: Dibujar la imagen a mano en un canvas

*   **Pros**: sin dependencia nueva, control total de fuentes y colores, y la maquetación de texto se puede probar con `node --test`.
*   **Cons**: más código propio (saltos de línea, mayúsculas en catalán, colores copiados desde CSS, porque el canvas no entiende `var()`) y más riesgo de que una fuente mal cargada caiga en silencio a otra.
*   **Reason for Rejection**: Rejected by author: se eligió una librería que convierte HTML en imagen, porque la maquetación la hace CSS y copia los estilos calculados, con menos código propio. Esta alternativa es el plan B: si el spike S1 falla (imagen en blanco, más de 5 s o fuente incorrecta), R3 pasa a dibujar en un canvas.

### Alternativa H: Otras librerías de HTML a imagen (`modern-screenshot` 4.7.0, `html2canvas` 1.4.1)

*   **Pros**: `modern-screenshot` tiene publicaciones más recientes (abril de 2026). `html2canvas` no usa SVG y evita los fallos de imagen en blanco propios del SVG en WebKit.
*   **Cons**: `modern-screenshot` no se pudo verificar en Safari. `html2canvas` admite solo parte del CSS y no publica versiones desde 2022. No se midió ni la velocidad ni el uso real de ninguna de las dos.
*   **Reason for Rejection**: Rejected by author: se eligió `html-to-image` 1.11.13 (MIT, la versión publicada más reciente), con su respaldo de repintar si el resultado sale vacío. La opción `stabilizationAttempts` que documenta el README de `master` no existe en 1.11.13, y no se cuenta con ella.

### Alternativa I: Imagen de 4096 × 2692 px

*   **Pros**: más detalle en pantallas grandes o al imprimir.
*   **Cons**: unos 11 millones de píxeles, con más riesgo de memoria en iPhone antiguos y Android de gama baja y más tiempo de generación. WhatsApp puede recomprimir las fotos (no comprobado en este diseño).
*   **Reason for Rejection**: Rejected by author: el riesgo de memoria y tiempo pesa más que el detalle extra. Se reduce a la mitad por lado, 2048 × 1346 px.

### Alternativa J: Historial con `replaceState` o con `pushState` por capa

*   **Pros**: `replaceState` mantiene la barra de direcciones como enlace del evento abierto. `pushState` hace que Atrás cierre el detalle.
*   **Cons**: con `replaceState`, Atrás sigue saliendo de la agenda, y su uso dentro de `onMount` en SvelteKit 3 no está verificado. Con `pushState`, cerrar con la X o con Esc sin `history.back()` deja entradas huérfanas, puede chocar con el cierre nativo del `<dialog>` en Chrome Android reciente y exige más código y más pruebas.
*   **Reason for Rejection**: Rejected by author: se eligió no tocar el historial. El enlace se construye con la URL de la página y `?e=<id>` solo se lee al cargar. El comportamiento de Atrás depende del navegador y no es parte del contrato.

### Alternativa K: Renderizar la imagen antes del clic, o en dos toques explícitos

*   **Pros**: renderizar antes permite compartir en el primer toque. Los dos toques son fiables.
*   **Cons**: renderizar antes gasta CPU y memoria cada vez que alguien abre un detalle, y un render en blanco en Safari se compartiría igualmente. Los dos toques añaden un paso para todos.
*   **Reason for Rejection**: Rejected by author: se eligió renderizar al pulsar. El rechazo por activación caducada se cubre con un segundo toque solo cuando ocurre.

### Alternativa L: Dos botones independientes para imagen y enlace, o un solo `share` sin segundo toque

*   **Pros**: los dos botones no dependen de cómo trate WhatsApp la combinación de imagen y texto. Un solo `share` sin segundo toque tiene menos estados.
*   **Cons**: con dos botones se mandan dos mensajes y el enlace no va pegado a la imagen, lo que contradice G3. Sin segundo toque, un rechazo por activación caducada (posible si el render tarda) empujaría a descargar y adjuntar a mano.
*   **Reason for Rejection**: Rejected by author: la opción de dos botones contradecía el objetivo del mensaje único, y se eligió un solo `share` con segundo toque.

### Alternativa M: Cargar la librería con importación dinámica (al pulsar o al abrir el detalle)

*   **Pros**: la carga inicial se queda como hoy; la librería pesa unos 7 KB comprimidos (estimación del autor, por medir con `vite build` en R3).
*   **Cons**: falla sin conexión, el archivo con el nombre antiguo da 404 si se despliega con la pestaña abierta, y al pulsar añade espera antes del render.
*   **Reason for Rejection**: Rejected by author: se eligió la importación estática, que evita los fallos de descarga y los 404 tras un despliegue.

### Alternativa N: Backup solo con versiones de Apps Script, o con una copia del libro completo

*   **Pros**: las versiones dan un retroceso inmediato con la misma URL. La copia del libro cubre datos y código.
*   **Cons**: las versiones no cubren código nunca desplegado y se pierden con el proyecto (las versiones sin usar se pueden borrar, según la documentación de Apps Script). Restaurar el script desde una copia del libro exige otra URL `/exec`, y cada copia duplica la lista de nombres en Drive.
*   **Reason for Rejection**: Rejected by author: se eligió guardar el código desplegado en Git con un commit antes y después de cada cambio, que no depende de Google. Las versiones de Apps Script siguen sirviendo como retroceso rápido.

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
*   **Cons**: en una pantalla grande queda mucho espacio vacío a los lados y se pierde el contexto del calendario, y el detalle se parece más a una página nueva que a un modal.
*   **Reason for Rejection**: Rejected by author: se eligió pantalla completa solo por debajo de 1024 px y un panel centrado desde 1024 px, que mantiene el calendario visible. Se asume el coste de dos maquetaciones.

### Alternativa R: Probar los flujos de navegador con Playwright en local sin guardarlo, o solo con una lista manual

*   **Pros**: sin guardar nada, no suma dependencias ni tiempo de CI. Con una lista manual no hay herramientas nuevas y se reutilizan las pruebas en móvil real que ya eran del autor.
*   **Cons**: lo que se prueba en local sin guardar no se puede repetir después ni protege de regresiones. Con la lista manual, los diálogos apilados, el enlace directo o el orden de foco se rompen sin que nadie lo vea hasta que alguien los pruebe a mano, y cada entrega cuesta más tiempo.
*   **Reason for Rejection**: Rejected by author: se eligió Playwright dentro del repositorio, ejecutado en el CI. Se asume el coste de una dependencia nueva, la descarga de navegadores en cada ejecución y escribir y mantener las pruebas en un proyecto de un mes. Para limitarlo: `chromium` y `mobile` bloquean el despliegue y `webkit` solo prueba la imagen y no bloquea, porque el WebKit de Playwright en Linux no es Safari de iPhone.

### Alternativa S: Un solo `<dialog>` para detalle e inscripción (decisión del plan)

*   **Pros**: un solo diálogo con un estado menos (`detailId`/`signupId`), sin pruebas de diálogos apilados, y el formulario dentro del detalle.
*   **Cons**: obliga a reescribir `SignupDialog.svelte`, que ya funciona y tiene el foco, el cierre y el bloqueo de scroll resueltos, y a cambiar el flujo de «Participar» que ya está publicado. El detalle ocuparía a pantalla completa un formulario de una sola línea.
*   **Reason for Rejection**: decisión del plan, no del autor: se mantiene el modal de inscripción existente (reducido) encima del detalle, para que R1 modifique poco código ya probado. Si las pruebas de diálogos apilados de `detail.spec.js` resultan costosas de mantener, esta alternativa es la que se reconsidera.

### Alternativa T: Enlace secreto de baja entre navegadores, o no construir la baja (decisión del plan)

*   **Pros**: tras apuntarse, la web podría mostrar un enlace «desfer» copiable que funcione desde cualquier navegador, porque el `requestId` ya es el secreto. No construir R4 evita el único código que borra datos y ahorra el tercer despliegue manual: con unos 100 usuarios y 18 días, el dueño borra la fila en segundos.
*   **Cons**: el enlace «desfer» obliga a mostrar y guardar un secreto en pantalla, y el que lo pierda no puede quitarse. No construir R4 deja a cada persona dependiendo de escribir al dueño, y el diseño elimina el contacto en pantalla (Non-Goals).
*   **Reason for Rejection**: decisión del plan, no del autor: se mantiene `localStorage` (Alternativa E) porque es lo que pidió el autor, con el corte de R4 si el spike S3 sale mal. «No construir R4» queda disponible como recorte (ver «Corte»).

--------------------------------------------------------------------------------

## Non-Functional Requirements

### Security & Privacy

*   La lista de nombres de pila o apodos sigue siendo pública, y el enlace de detalle se puede compartir fuera del grupo. Es un riesgo aceptado por el autor. El campo `responsable` también es público y no se limita a nombres de pila: el dueño de la hoja es quien decide qué escribe.
*   El secreto de la baja es el `requestId`: el script nunca lo devuelve en `doGet`. Lo guardan el navegador que se apuntó, la pestaña `Inscripcions` y el archivo `Baixes`; el dueño de la hoja los ve. El script acepta cualquier `requestId` de 8 a 64 caracteres `[A-Za-z0-9-]`, y es la web la que lo genera con `crypto.randomUUID()`.
*   `unsignup` es otra llamada sin autenticación que toma el lock global del script y recorre la hoja. Las llamadas de personas ajenas al grupo (el enlace se comparte fuera) pueden ocuparlo hasta 10 s, igual que ya pasa con `signup`. Es un riesgo aceptado por el autor.
*   `inscripcio_url` solo admite `https://`, con la misma validación que `mapa`, y se abre con `rel="noopener noreferrer"`. Los textos del responsable y de la hoja se escapan siempre; no se usa `{@html}`.
*   `Code.gs` mantiene `@OnlyCurrentDoc` y el mismo permiso limitado a la hoja. La baja archiva el nombre en `Baixes`, dentro de la hoja del dueño.

### Performance & Latency

*   La imagen se genera en el navegador al pulsar el botón, a 2048 × 1346 px (unos 2,8 millones de píxeles). Objetivo: menos de 5 s en un iPhone antiguo y en un Android de gama baja, que se mide en el spike S1; no hay tiempo medido todavía. Si se supera, R3 pasa a la alternativa del canvas o se descarta.
*   `html-to-image` suma al paquete principal una cantidad por medir con `vite build` en R3 (estimación: unos 7 KB comprimidos).
*   El CI suma la descarga de Chromium y la ejecución de las pruebas de navegador; el job de WebKit es aparte y no bloquea.
*   `doGet` lee las hojas completas en cada carga de la página, y un mensaje de WhatsApp puede producir una ráfaga de cargas. Apps Script limita las ejecuciones simultáneas (el límite no se ha verificado) y una respuesta fallida no lleva cabeceras CORS, así que la página no distingue qué falló. En R2 se midió la latencia de `doGet` con `curl -w '%{time_total}'` sobre la URL de la web (12 de noviembre, con el script de R2): entre 2,6 y 3,6 s (media cercana a 3,0 s), frente a 1,0–1,3 s de una petición que no lee la hoja (`?action=x`), que es la base de la plataforma. La lectura de las pestañas pesa unos 1,8 s y es lo único que una caché recortaría. Decisión: de momento no hay caché (ver Non-Goals). Una caché exigiría invalidarla en cada alta, para que la lista no se quede desfasada, y una versión más del script; si se hace, se hace junto con el despliegue del script de R4. Se reconsidera si tras difundir el enlace aparecen errores de carga.
*   Cada baja añade una lectura y una escritura bajo el mismo lock de 10 s del script. Con unos 100 usuarios no se espera contención.

### Rollout & Rollback

*   Cinco entregas, R0 a R4, con el script primero y siempre aditivo. El código desplegado del script se guarda en Git con un commit antes y después de cada cambio, y la restauración tiene dos niveles (ver «Backup y restauración del script»).
*   Las pruebas de `chromium` y `mobile` bloquean el despliegue. Para que una reversión no dependa de un CI en rojo, `deploy.yml` tiene una entrada manual `skip_e2e` en `workflow_dispatch` que omite las pruebas de navegador, y solo se usa para desplegar una reversión.
*   No hay interruptores de funcionalidad. R3 y R4 son entregas separadas y se revierten con un `git revert`. `features` en `doGet` solo informa de lo que el script admite: la web muestra «Desapuntar-me» únicamente si `features` incluye `unsignup`.

--------------------------------------------------------------------------------

## Risks & Mitigations

| Riesgo | Probabilidad (estimación del plan) | Impacto | Mitigación | Riesgo residual |
|---|---|---|---|---|
| La imagen sale en blanco o con otra fuente (WebKit) | Media | Alto en R3 | Estilo explícito al capturar, comprobación de que no está vacía con un repintado, comprobación de la fuente y spike S1 | Si S1 falla, R3 pasa al canvas o se descarta |
| La generación se cuelga o tarda demasiado | Media | Medio | Límite de 20 s, botón «Generant…» que vuelve a reposo con el mensaje de error, objetivo de 5 s en S1 | Dispositivos más lentos que los probados |
| El navegador rechaza el compartir tras generar (activación caducada o `NotAllowedError` por otra causa) | Desconocida; se mide en S1 | Bajo | Segundo toque con el archivo en memoria; un segundo rechazo va al respaldo; «Copia l’enllaç» siempre visible | Un toque más para algunas personas |
| WhatsApp en iPhone descarta el texto junto a la imagen | Desconocida | Medio | Comprobación S2; si ocurre, se documenta y la persona usa «Copia l’enllaç» | El mensaje único no se cumple en ese caso |
| El navegador integrado de WhatsApp no permite descargar o no conserva `localStorage` | Desconocida | Alto para R4 | Comprobación S3; R4 no se construye si no se conserva `localStorage` | La baja la sigue haciendo el dueño a mano |
| Se pierde `localStorage` (otro navegador, datos borrados) | Media | Bajo | El dueño de la hoja borra la fila a mano | Depende de que el dueño reciba el aviso |
| `unsignup` borra una fila de otra persona | Baja | Alto | Búsqueda por `event_id` más `request_id` no vacío, relectura de la fila justo antes de borrar por índice de cabecera, nombre archivado en `Baixes` | Un `requestId` conocido por otra persona |
| El CI en rojo impide desplegar una reversión | Media | Alto | Entrada `skip_e2e` de `workflow_dispatch`; `webkit` no bloquea | Uso incorrecto de `skip_e2e` |
| El código del script desplegado se desvía del repositorio | Media | Medio | Backup con commit antes y después, comparado con `git diff` | Cambios hechos en el editor y no copiados |
| Ráfaga de cargas de `doGet` tras un mensaje de WhatsApp | Media | Bajo | Latencia medida en R2 (2,6–3,6 s, de los que 1,0–1,3 s son plataforma); sin caché por ahora, se reconsidera con R4 o si aparecen errores de carga | Límite de ejecuciones simultáneas de Apps Script sin verificar |
| Las personas ajenas al grupo ocupan el lock con `signup` o `unsignup` | Baja | Bajo | `busy` con reintento; riesgo aceptado por el autor | Spam ya aceptado |

--------------------------------------------------------------------------------

## Additional Resources

*   [README del proyecto](../../README.md), con el procedimiento de puesta en marcha y las comprobaciones tras publicar.
*   [Web Share API: `navigator.share`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share) en MDN.
*   [Implementaciones y versiones de Apps Script](https://developers.google.com/apps-script/concepts/deployments).
*   [`html-to-image`](https://github.com/bubkoo/html-to-image) en GitHub (el README de `master` documenta la rama v2, no la 1.11.13 publicada).

## Future Improvements

*   **`clasp pull`.** Copiar el código del editor de Apps Script al repositorio sin pasos manuales.
*   **Nombre del evento como enlace al detalle.** Se propuso en una revisión como forma más descubrible de abrir el detalle. No se adopta ahora.
*   **Medir la generación de la imagen.** Tiempo y memoria en móviles reales, para decidir si el segundo toque sigue haciendo falta.
*   **Validar `inscripcio_url` también en el script**, si aparece otro consumidor además de la web.

--------------------------------------------------------------------------------

## Detailed Implementation Plan

Este plan está ordenado para implementarse entrega a entrega. Cada archivo indica en qué entrega (R1 a R4) se toca. No contiene código de producción: solo firmas, formas de datos y pseudocódigo.

### Secuencia de implementación

| Entrega | Archivos que se tocan (rutas desde la raíz del repositorio) | Antes de publicar |
|---|---|---|
| **R1** web | `package.json`, `package-lock.json`, `.gitignore`, `.github/workflows/deploy.yml`, `playwright.config.js`, `e2e/serve.js`, `e2e/script.js`, `e2e/helpers.js`, `e2e/detail.spec.js`, `e2e/signup.spec.js` (parte de alta), `src/lib/config.js`, `src/lib/state.js`, `src/lib/state.test.js`, `src/lib/my-signups.js`, `src/lib/my-signups.test.js`, `src/lib/share.js`, `src/lib/share.test.js`, `src/lib/events.js`, `src/lib/events.test.js`, `src/lib/api.js`, `src/lib/api.test.js`, `src/lib/mock-api.js`, `src/lib/texts.js`, `src/lib/components/EventCard.svelte`, `src/lib/components/Calendar.svelte`, `src/lib/components/EventDetail.svelte`, `src/lib/components/SignupDialog.svelte`, `src/routes/+page.svelte`, `README.md` | `npm run check`, `npm test`, `npm run test:e2e` en verde |
| **R2** script, luego web | Backup del script. `apps-script/Code.gs`, `apps-script/Code.test.js`, `apps-script/fake-google.js`. Después `src/lib/events.js`, `src/lib/events.test.js`, `src/lib/mock-api.js`, `src/lib/texts.js`, `src/lib/components/EventCard.svelte`, `src/lib/components/EventDetail.svelte`, `src/routes/+page.svelte`, `e2e/script.js`, `e2e/external.spec.js`, `docs/plantilla-esdeveniments.csv`, `README.md`. Al final, J1 y K1 y los datos en la hoja | `npm run check`, `npm test`, `npm run test:e2e` en verde; después del script, `curl` de lectura contra `/exec` |
| **R3** web (opcional) | `package.json`, `package-lock.json`, `src/lib/config.js`, `src/lib/poster.js`, `src/lib/share.js`, `src/lib/share.test.js`, `src/lib/components/PosterView.svelte`, `src/lib/components/EventDetail.svelte`, `src/lib/texts.js`, `e2e/helpers.js`, `e2e/image.spec.js`, `e2e/share.spec.js`, `.github/workflows/deploy.yml`, `README.md` | `npm run check`, `npm test`, `npm run test:e2e` (`chromium` y `mobile`) en verde; `image.spec.js` en `webkit` es un aviso; el autor prueba S1 y S2 en móvil real |
| **R4** script, luego web (opcional) | Backup del script. `apps-script/Code.gs`, `apps-script/Code.test.js`, `apps-script/fake-google.js`. Después `src/lib/api.js`, `src/lib/api.test.js`, `src/lib/mock-api.js`, `src/lib/components/SignupDialog.svelte`, `src/routes/+page.svelte`, `src/lib/texts.js`, `e2e/script.js`, `e2e/signup.spec.js`, `README.md`. Probar antes en una copia del libro | `npm run check`, `npm test`, `npm run test:e2e` en verde; el script, probado en la copia con copia de seguridad de `Inscripcions`; spike S3 hecho antes de empezar |

Las versiones de las dependencias se fijan en `package.json` con el mismo estilo que el resto (rango con `^`), salvo `html-to-image`, que se fija exacta en `1.11.13` porque el comportamiento descrito en este diseño es el de esa versión.

### Target Files to Create/Modify

#### 1. `package.json` (Modify)

*   **Entrega**: R1 y R3.
*   **Type / Scope**: Configuración de npm.
*   **Proposed Changes**: R1: añadir `@playwright/test` (versión actual al implementar, con `^`; hace falta una que incluya `page.clock` y los perfiles de dispositivo, como `devices['Pixel 7']`) a `devDependencies` y el script `"test:e2e": "playwright test"`. R3: añadir `html-to-image` `1.11.13` (exacta, sin `^`) a `devDependencies`, junto a las demás dependencias del proyecto, que ya van todas ahí. `check` y `test` no cambian.

#### 2. `package-lock.json` (Modify)

*   **Entrega**: R1 y R3.
*   **Type / Scope**: Archivo generado.
*   **Proposed Changes**: Se regenera con `npm install`. El flujo de CI usa `npm ci`, así que debe subirse con cada cambio de dependencias.

#### 3. `playwright.config.js` (Create)

*   **Entrega**: R1.
*   **Type / Scope**: Configuración de pruebas de navegador.
*   **Proposed Changes**: `testDir: 'e2e'`, `baseURL: http://localhost:5300/agenda-front-ampli/`, `locale: 'ca-ES'`, `timezoneId: 'Europe/Madrid'`. Sin `globalSetup`. `webServer` con `command: 'node e2e/serve.js'`, `url` igual a la `baseURL`, `timeout: 180000` (incluye la compilación) y `reuseExistingServer` fuera del CI. `retries: 2` en el CI y 0 en local. Proyectos: `chromium` (escritorio, `viewport` 1280 × 900), `mobile` (perfil `Pixel 7` de Playwright, con `viewport` fijado a 390 × 844 para que las comprobaciones de ancho sean deterministas) y `webkit` (escritorio de WebKit, solo para `e2e/image.spec.js`). Informe `list` en local y `github` en el CI.

#### 4. `e2e/serve.js` (Create)

*   **Entrega**: R1.
*   **Type / Scope**: Arranque de la web para las pruebas, sin dependencias nuevas.
*   **Proposed Changes**: Es el único comando de `webServer`, así que Playwright solo da la web por lista cuando `vite preview` ya responde, y no existe el problema de que el servidor espere a una compilación que aún no ha empezado. Hace dos cosas, en este orden: (1) ejecuta `vite build` como proceso hijo con `BASE_PATH=/agenda-front-ampli` y `VITE_AGENDA_API_URL=http://localhost:5301/exec`, y sale con código distinto de cero (y la salida de error de `vite build`) si falla; (2) arranca `vite preview --port 5300 --strictPort`, que sirve la compilación bajo `/agenda-front-ampli/` como GitHub Pages. La URL `http://localhost:5301/exec` no se sirve nunca: `e2e/script.js` intercepta esas peticiones dentro del navegador.

#### 5. `e2e/script.js` (Create)

*   **Entrega**: R1 (se amplía en R2 y R4).
*   **Type / Scope**: Script de Google simulado dentro del navegador, sin segundo servidor, sin puerto y sin endpoints de control.
*   **Proposed Changes**: Exporta `installScript(page, options)`, que importa `createScript` de `apps-script/fake-google.js` (ejecuta el `Code.gs` real contra una hoja simulada, en el mismo proceso de Node que la prueba) y registra `page.route('http://localhost:5301/exec*', …)`. El manejador llama a `script.get({action:'agenda'})` o a `script.post(body)` y responde con `route.fulfill` con `content-type: application/json` y `access-control-allow-origin: *` (un GET y un POST `text/plain` son peticiones simples y no hacen preflight). Las opciones son variables de JavaScript que la prueba cambia directamente: `closed` cambia la celda B1 de la hoja `Config` simulada a `NO`; `busy` hace que el manejador responda `{ok:false, v:1, error:'busy'}` sin llamar al script; `down` responde con `route.abort()`; `loseAnswer` ejecuta `script.post` y después responde con `route.abort()` (respuesta perdida); `features` sustituye `features` en la respuesta de `doGet` (por ejemplo `[]` para simular un script antiguo). Devuelve `{script, signups(), baixes()}`, donde las dos funciones leen las filas de las hojas simuladas (`script.sheets`).
    *   **Datos sembrados** (con el formato de `eventRow` de `apps-script/Code.test.js`, y el «hoy» fijado en el 10 de noviembre): `accio-1` (Acció, 2026-11-12, abierto), `acte-1` (Acte, 2026-11-14, abierto), `cancel-1` (2026-11-16, `estat` cancelado) y `pasat-1` (2026-11-05, pasado). R2 añade `resp-1` (2026-11-18, `responsable` «Marta») y `ext-1` (2026-11-19, `inscripcio_url` `https://example.org/inscripcio`). En R1 las filas tienen 9 columnas, como la hoja real; R2 las amplía a 11 cuando `EVENT_HEADER` de `fake-google.js` crece.

#### 6. `e2e/helpers.js` (Create)

*   **Entrega**: R1 (R3 añade las utilidades de imagen).
*   **Type / Scope**: Utilidades de las pruebas.
*   **Proposed Changes**: `openAgenda(page, {today, query, offline, options})`: llama a `installScript` con una hoja recién sembrada, instala el reloj fijo con `page.clock` (`2026-11-10T09:00:00+01:00` por defecto), navega con la `query` y espera a que haya tarjetas. `mockShare(page, behaviour)` (R3) sustituye `navigator.share` y `navigator.canShare` con una lista de comportamientos por llamada, por ejemplo `['NotAllowedError', 'ok']` para «rechaza una vez y después acierta», y expone las llamadas capturadas (`{files, text}`) en `window.__shareCalls`. `readPngSize(buffer)` (R3) lee la firma de 8 bytes y el bloque IHDR de un PNG y devuelve `{width, height}`; es una utilidad de prueba, no código de producción. `pixelAt(page, pngBuffer, x, y)` (R3) carga el PNG en un canvas dentro de la página y devuelve el color RGB de ese píxel.

#### 7. `e2e/detail.spec.js` (Create)

*   **Entrega**: R1 (CUJ 1 y 2).
*   **Type / Scope**: Prueba de navegador (`chromium` y `mobile`).
*   **Proposed Changes**: Abrir el detalle con «detall» y comprobar los campos mostrados. `?e=<id>` válido abre el detalle sin desplazarse; un id desconocido, tanto con la agenda recibida del script como con la copia sin conexión, muestra «No s’ha trobat aquesta activitat» y el calendario; si el evento desaparece tras una recarga con el detalle abierto, queda solo el aviso y «Tanca». Un evento pasado y uno cancelado se abren en solo lectura, sin «Participar» ni «Desapuntar-me». Esc cierra solo el diálogo de arriba cuando hay dos apilados, y el foco vuelve al elemento que abrió el diálogo. La barra de direcciones no cambia al abrir o cerrar. A 390 px el detalle ocupa toda la pantalla; a 1024 y 1280 px es un panel centrado con la cuadrícula visible detrás. No hay desbordamiento horizontal a 390, 1024, 1100 y 1280 px, y el enlace «detall» mide al menos 24 × 24 px de zona táctil. No se prueba el botón Atrás (depende del navegador).

#### 8. `e2e/external.spec.js` (Create)

*   **Entrega**: R2 (CUJ 6).
*   **Type / Scope**: Prueba de navegador.
*   **Proposed Changes**: «Participar» de un evento con `inscripcio_url` (`ext-1`) es un enlace con `target="_blank"` y `rel="noopener noreferrer"` a la URL, en tarjeta y detalle, y no abre el modal. No aparecen recuento ni lista. Una URL que no empieza por `https://` se trata como vacía. El responsable (`resp-1`) se ve en tarjeta y detalle. Con B1 = NO el enlace externo sigue funcionando.

#### 9. `e2e/signup.spec.js` (Create)

*   **Entrega**: R1 (alta) y R4 (CUJ 3, baja).
*   **Type / Scope**: Prueba de navegador.
*   **Proposed Changes**: R1: alta desde la tarjeta y desde el detalle, y comprobar que el registro local se guarda; en un evento no abierto, «Veure apuntats» abre el detalle y no el modal. R4, con `features` que incluya `unsignup`: «La teva participació» aparece solo en el navegador que se apuntó, y «Desapuntar-me» exige dos toques. La baja archiva el nombre en `Baixes`, borra la fila y actualiza la lista. Un contexto de navegador nuevo no ve el botón. `removed:false` muestra «Ja no hi eres a la llista». No se ofrece en eventos pasados, cancelados, cerrados (B1 = NO) ni con URL externa, porque en esos estados «Participar» no abre el modal. Con registros duplicados del mismo evento, cada uno se quita por separado.

#### 10. `e2e/share.spec.js` (Create)

*   **Entrega**: R3 (CUJ 5), `chromium` y `mobile`.
*   **Type / Scope**: Prueba de navegador con `navigator.share` simulado (`mockShare`).
*   **Proposed Changes**: Éxito: se llama con un archivo `agenda-<id>.png` y el texto con el enlace. `AbortError`: no pasa nada y no hay respaldo. `NotAllowedError`: el botón pasa a «Imatge preparada: prem de nou» y el segundo toque llama a `share` con el mismo archivo sin volver a generar. Dos `NotAllowedError` seguidos: el segundo va al respaldo y el botón no vuelve a «preparada». Sin soporte de archivos: descarga la imagen y muestra el enlace `wa.me` con el texto codificado. «Copia l’enllaç» copia la URL del detalle sin `?admin`, y si el portapapeles falla muestra la URL en un campo seleccionable. Doble toque mientras genera no lanza una segunda generación.

#### 11. `e2e/image.spec.js` (Create)

*   **Entrega**: R3 (CUJ 4), `chromium` y `mobile` (bloquean) y `webkit` (aviso, no bloquea).
*   **Type / Scope**: Prueba de navegador, con `test.use({ deviceScaleFactor: 3 })`.
*   **Proposed Changes**: Pulsar «Descarrega la imatge» baja `agenda-<id>.png`. `readPngSize` da 2048 × 1346; con `deviceScaleFactor: 3`, un `pixelRatio` sin fijar daría otro tamaño y la prueba lo detecta. La imagen no está en blanco: `pixelAt` en el punto (20, 1300), dentro del fondo y fuera del texto, devuelve el color del tipo de evento (`--lime` para Acció y `--rust` para Acte, leídos de las variables CSS de la página). Se repite para un Acció y un Acte. En `webkit`, esta prueba avisa del riesgo de imagen en blanco en el WebKit de Playwright; no sustituye la comprobación S1 en un iPhone real.

#### 12. `src/lib/config.js` (Modify)

*   **Entrega**: R1 (`MY_SIGNUPS_KEY`), R2 (`MAX_MANAGER_LENGTH`) y R3 (`POSTER`).
*   **Type / Scope**: Constantes.
*   **Proposed Changes**: R1: `MY_SIGNUPS_KEY = 'agenda-sants-montjuic-2026-11:mine'`. R2: `MAX_MANAGER_LENGTH = 60`. R3: `POSTER = { width: 2048, height: 1346 }`. Nada de esto cambia `STORAGE_KEY`.

#### 13. `src/lib/state.js` (Create)

*   **Entrega**: R1.
*   **Type / Scope**: Módulo puro.
*   **Proposed Changes**:
```text
participationState(event, {today, signupsOpen}):
  si event.date < today          → 'past'
  si event.status == 'cancelled' → 'cancelled'
  si Boolean(event.externalUrl)  → 'external'      (en R1 el campo no existe: undefined → falso)
  si !signupsOpen                → 'closed'
  en otro caso                   → 'open'
```
    Es la única función del módulo. Los componentes comparan con el valor (`state === 'open'`; compartir se ofrece en `open`, `closed` y `external`; recuento y lista se ocultan solo en `external`). Sustituye `canSignup` de `EventCard.svelte` y `readOnlyReason` de `+page.svelte`.

#### 14. `src/lib/state.test.js` (Create)

*   **Entrega**: R1.
*   **Type / Scope**: Prueba unitaria.
*   **Proposed Changes**: La tabla completa de prioridad (pasado gana a todo, cancelado gana a externo, externo ignora `signupsOpen`), un evento de hoy que no es pasado, y un evento sin el campo `externalUrl` (R1) que no es `external`.

#### 15. `src/lib/my-signups.js` (Create)

*   **Entrega**: R1.
*   **Type / Scope**: Módulo puro, con el almacenamiento inyectado.
*   **Proposed Changes**:
```text
formato en MY_SIGNUPS_KEY:  { v:1, items:[ {eventId, requestId, name} ] }
readMine(storage)               → lista; JSON corrupto, storage nulo o elementos mal formados → ignorar
addMine(storage, item)          → lee, añade, escribe (try/catch)
removeMine(storage, eventId, requestId)
mineForEvent(storage, eventId)
```

#### 16. `src/lib/my-signups.test.js` (Create)

*   **Entrega**: R1.
*   **Type / Scope**: Prueba unitaria.
*   **Proposed Changes**: Alta y lectura, JSON corrupto, `storage` nulo o que lanza al escribir, elementos de otro tipo, varios registros para un mismo evento y baja por `requestId`.

#### 17. `src/lib/events.js` (Modify)

*   **Entrega**: R1 (typedef y `parseEventParam`) y R2 (`manager` y `externalUrl`).
*   **Type / Scope**: Normalización de filas.
*   **Proposed Changes**: R1: se exporta la constante `ID_RE` que ya existe en el módulo (`/^[a-z0-9-]{1,20}$/`), y se añade `parseEventParam(search)`, que devuelve el id de `?e=` solo si cumple `ID_RE` y si no `null`. El typedef `AgendaEvent` gana `manager?: string` y `externalUrl?: string` (opcionales hasta R2), para que `npm run check` pase en R1. R2: `normalizeEvents` rellena `manager` (de `responsable`, recortado a `MAX_MANAGER_LENGTH`, con el helper `plain` ya existente) y `externalUrl` (de `inscripcio_url`, validada con `httpsUrl(value)`, una función extraída de `mapsUrl` con exactamente la misma expresión, `/^https:\/\/\S+$/i`, y vacía si no es válida). Los dos campos pasan a ser siempre cadenas (vacías si faltan). El resultado de `mapsUrl` no cambia: no se añaden límites de longitud, comprobación de credenciales ni avisos para las URL. `normalizeEvents` sigue devolviendo `{events, skipped}`.

#### 18. `src/lib/events.test.js` (Modify)

*   **Entrega**: R1 y R2.
*   **Type / Scope**: Prueba unitaria.
*   **Proposed Changes**: R1: `parseEventParam` con un id válido, con caracteres no válidos, con más de 20 caracteres y sin parámetro. R2: `responsable` normalizado y recortado; `inscripcio_url` válida, con `http://`, con `javascript:` y con espacios; un evento sin las columnas nuevas se comporta como hoy y tiene `manager` y `externalUrl` vacíos. Las aserciones existentes de `normalizeEvents` no cambian, porque el resultado sigue siendo `{events, skipped}`.

#### 19. `src/lib/api.js` (Modify)

*   **Entrega**: R1 (`requestId`, registro local, `features`) y R4 (`unsignup`).
*   **Type / Scope**: Cliente del script.
*   **Proposed Changes**:
```text
parseAgenda(json)    → añade features: string[] (vacío si falta)
createApi({url, fetchFn, storage, now, timeoutMs, uuid})
  signup(eventId, name, knownCount):
     requestId = uuid()                                  // antes del try
     ... igual que hoy ...
     resultado ok (también por recover) → {ok:true, names, requestId, recovered?}
     si ok → addMine(storage, {eventId, requestId, name})
  unsignup(eventId, requestId):                          // R4
     POST text/plain {action:'unsignup', eventId, requestId}, mismo timeout
     ok → removeMine(storage, eventId, requestId) y {ok:true, names, removed}   (también con removed:false)
     {ok:false, error} del servidor → tal cual, sin quitar el registro
     error de red o timeout → {ok:false, error:'network'}, sin quitar el registro   (sin recover: es idempotente)
```
    `recover(eventId, name, knownCount)` también recibe el `requestId` para devolverlo. Los typedefs se actualizan en la entrega que los necesita: R1 `SignupResult` (con `requestId: string` obligatorio, porque el mock lo devuelve desde R1) y `Agenda` (con `features`); R4 `UnsignResult` y el miembro `unsignup` de `AgendaApi` (hasta R4 no existe, así que `npm run check` pasa).

#### 20. `src/lib/api.test.js` (Modify)

*   **Entrega**: R1 y R4.
*   **Type / Scope**: Prueba unitaria.
*   **Proposed Changes**: R1: `signup` devuelve `requestId` en `ok` y en `recovered`, guarda el registro local solo cuando hay éxito y no lo guarda en errores del servidor; `parseAgenda` con y sin `features`. Se actualizan las aserciones existentes que comparan el resultado de `signup` con `{ok:true, names}` (`api.test.js` ~L129 y ~L165), que ahora incluye `requestId`. R4: `unsignup` envía `text/plain` con el cuerpo esperado, devuelve `removed` true y false y quita el registro local en ambos casos, propaga errores del servidor y devuelve `network` con red caída o timeout, conservando el registro.

#### 21. `src/lib/mock-api.js` (Modify)

*   **Entrega**: R1, R2 y R4.
*   **Type / Scope**: Datos de desarrollo (solo `DEV`).
*   **Proposed Changes**: R1: `features: []` y que `signup` devuelva `requestId`. R2: un evento con `responsable` y otro con `inscripcio_url`. R4: `unsignup` y `features: ['unsignup']`, para que `npm run check` y `npm run dev` sigan funcionando.

#### 22. `src/lib/texts.js` (Modify)

*   **Entrega**: R1, R2, R3 y R4.
*   **Type / Scope**: Textos en catalán.
*   **Proposed Changes**: Ver la lista completa en «Textos nuevos» más abajo. Se añaden los grupos `card`, `detail`, `share` y `participation`. Se elimina `dialog.correction`, y `dialog.listTitle` y `dialog.listEmpty` pasan a `detail`. `siteTitle` no cambia y `Header.svelte` tampoco.

#### 23. `src/lib/components/EventCard.svelte` (Modify)

*   **Entrega**: R1 y R2.
*   **Type / Scope**: Componente.
*   **Proposed Changes**:
    *   **Props finales**: `event`, `count`, `dateLabel`, `state` (de `participationState`), `ondetail(id)` y `onparticipate(id)`. Sustituyen a `past`, `signupsOpen` y `onselect`.
    *   R1: un `<a href="?e=<id>">` con el texto `T.card.detail` («detall») dentro de la línea `.tags`, alineado a la derecha, con el tamaño de letra del cuerpo de la tarjeta (sin negrita, sin mayúsculas, sin espaciado de letras). Zona táctil de al menos 24 × 24 px con relleno invisible y `aria-label` con nombre y fecha. Solo el clic normal (sin Ctrl, Cmd, Mayús ni botón central) llama a `ondetail` con `preventDefault`. El botón usa `state`: en `open` abre el modal de inscripción con `onparticipate`; en el resto (`past`, `cancelled`, `closed`) muestra «Veure apuntats» y abre el detalle con `ondetail`.
    *   R2: línea `T.card.manager(nombre)` bajo el lugar si hay `manager`. En estado `external`, «Participar» es un `<a target="_blank" rel="noopener noreferrer">` con aspecto de botón y se ocultan recuento y lista.
    *   Ajuste de maquetación: el enlace «detall» no debe hacer que la línea del tipo desborde entre 1024 y 1279 px; se comprueba con `e2e/detail.spec.js`.

#### 24. `src/lib/components/Calendar.svelte` (Modify)

*   **Entrega**: R1.
*   **Type / Scope**: Componente.
*   **Proposed Changes**: Mantiene sus props actuales (`today`, `signupsOpen`) y sustituye `onselect` por `ondetail` y `onparticipate`, que reenvía a cada `EventCard`. Calcula `participationState(event, {today, signupsOpen})` para cada tarjeta y se lo pasa como `state`. No pasa `externalUrl` por separado: ya viaja dentro de `event`. No cambia la maquetación del calendario.

#### 25. `src/lib/components/EventDetail.svelte` (Create)

*   **Entrega**: R1, R2 y R3.
*   **Type / Scope**: Componente, un único `<dialog>` abierto con `showModal()`.
*   **Proposed Changes**:
    *   **Props finales**: `event` (o `null`), `names`, `state` (de `participationState`), `dateLabel`, `url` (detalle), `notFound` (`true` cuando `detailId` no corresponde a ningún evento; lo calcula la página), `onclose`, `onparticipate`.
    *   **Maquetación**: por debajo de 1024 px ocupa toda la pantalla (100 dvw × 100 dvh, sin borde redondeado, con scroll interno). Desde 1024 px es un panel centrado de ancho limitado, con alto limitado, scroll interno y fondo atenuado en el que se ve el calendario. Los valores concretos se eligen al implementarlo y los comprueba `e2e/detail.spec.js`.
    *   **Contenido, de arriba abajo**: fila con etiqueta de tipo, insignia de estado y botón «Tanca»; nombre; fecha (`dateLabel`) y hora; lugar con enlace a Maps; `T.card.manager` si hay responsable; zona de participación (según estado, ver más abajo); lista de apuntados (con scroll si es larga); zona de compartir.
    *   **Participación según estado**: `open` muestra recuento y «Participar» (llama a `onparticipate`); `closed` muestra `T.dialog.closed`; `past` muestra `T.dialog.pastNote`; `cancelled` muestra `T.dialog.cancelledNote`; `external` muestra el enlace «Participar» con la nota `T.detail.externalNote` y oculta recuento y lista. No hay «Desapuntar-me» en el detalle.
    *   **Compartir** (solo en `open`, `closed` y `external`): R1: «Comparteix» abre el enlace `wa.me` con solo el texto y «Copia l’enllaç». R3: «Descarrega la imatge» y el flujo completo de «Comparteix» con la máquina de estados de «Compartir». Mensajes en una región `aria-live="polite"`.
    *   **Evento no encontrado** (`notFound`): muestra solo `T.detail.notFound` y «Tanca». No se guarda ninguna copia del evento.
    *   **Imagen** (R3): `EventDetail` monta `PosterView` solo cuando se pulsa un botón de imagen, con `{#if}` y `bind:node`; tras `await tick()` llama a `renderPoster(node, event.id)` y desmonta `PosterView` al terminar. El `File` generado solo se conserva en el estado «preparada» y se descarta al cerrar el detalle.
    *   **Accesibilidad**: `aria-labelledby` con el nombre, foco inicial en el botón «Tanca», retorno del foco al elemento que lo abrió (o al título si se abrió por enlace directo).

#### 26. `src/lib/components/SignupDialog.svelte` (Modify)

*   **Entrega**: R1 (reducción) y R4 («La teva participació»).
*   **Type / Scope**: Componente.
*   **Proposed Changes**:
    *   **Props finales**: `event`, `dateLabel`, `mine` (los registros locales de ese evento, R4), `features`, `onsubmit`, `onunsign` (R4) y `onclose`. Desaparecen `names` y `readOnlyReason`: el modal solo se abre en estado `open`, así que ya no necesita notas de solo lectura ni la lista.
    *   R1: quita la lista de apuntados, `dialog.correction`, el título de lista y las notas de solo lectura. Mantiene la cabecera con tipo, nombre, fecha y hora, la frase de propósito, el formulario, el aviso de privacidad y el mensaje de éxito. Tras un alta correcta añade `T.participation.hint` solo si `features` incluye `unsignup`, para no prometer una baja que el script aún no admite (R1 a R3). Se abre por encima del detalle sin cerrarlo.
    *   R4: sección «La teva participació» con un elemento por registro de `mine`, cada uno con el nombre y «Desapuntar-me» con confirmación en dos toques (el primer toque cambia el texto a `T.participation.unsignConfirm` durante 5 segundos). Solo se muestra si hay registros y `features` incluye `unsignup`. Estados del botón: confirmar, «Desapuntant…» y los mensajes de resultado.

#### 27. `src/routes/+page.svelte` (Modify)

*   **Entrega**: R1 a R4.
*   **Type / Scope**: Página principal.
*   **Proposed Changes**: R1: `selectedId` se sustituye por `detailId` y `signupId`; cerrar el modal de inscripción no cierra el detalle. Guarda `features` de la agenda (`AgendaData` y `apply()`) y se lo pasa al modal. Tiene `mine` como `$state`, leído con `readMine(storage)` al montar y después de cada `signup` o `unsignup`, y pasa al modal solo los registros del evento. `notFound` se calcula aquí: `detailId` definido y sin evento con ese id. En `onMount`, después de la primera carga correcta, lee `?e=` con `parseEventParam(location.search)` y abre el detalle; en ese caso no ejecuta `anchorToUpcoming`. Con un id desconocido muestra el detalle con `notFound` (aviso más calendario detrás). Evento pasado o cancelado → solo lectura. Calcula la URL del detalle con `detailUrl(location, id)`. «Participar» (`onparticipate`) abre el modal y mantiene la recarga silenciosa que hace hoy `open(id)` (`load({silent:true})`); `ondetail` abre el detalle y no recarga. El historial no se toca. R2: pasa `manager` y `externalUrl` ya presentes en `event`. R4: pasa `onunsign` al modal, que llama a `api.unsignup` y actualiza `signups` con los `names` de la respuesta. `?admin` muestra, además de lo que ya muestra, `features` y el número de registros locales.

#### 28. `src/lib/components/PosterView.svelte` (Create)

*   **Entrega**: R3.
*   **Type / Scope**: Componente, solo para generar la imagen.
*   **Proposed Changes**: Props: `event`, `dateLabel` (la misma cadena que recibe `EventDetail`, sin función nueva) y `node` (enlazable con `bind:node`, el elemento raíz para `renderPoster`). Un elemento de 2048 × 1346 px CSS, posicionado fuera de pantalla con `position: fixed` y un desplazamiento (no `display: none`, para que se pinte); `renderPoster` anula esa posición al capturar. Se monta solo al pulsar un botón y se desmonta al terminar. Estructura: una banda superior con `T.siteTitle` en `--orange` y texto `--lime-light`; debajo, el cuerpo con fondo `--lime` para Acció y `--rust` para Acte, y texto `--rust` y `--lime` respectivamente. Del cuerpo salen, en este orden: tipo, nombre en mayúsculas del catalán (`toLocaleUpperCase('ca')`) con `line-clamp` de 4 líneas, día (`dateLabel`), hora (`formatRange`) y lugar como texto sin enlace con `line-clamp` de 3 líneas. **Desviación decidida al implementar R3a:** `line-clamp` pierde los puntos suspensivos cuando `html-to-image` 1.11.13 copia el elemento (reproducido con una página mínima en el Chromium de Playwright 158), así que el texto que no cabe se corta en seco, sin «…», aunque queda dentro de la imagen. Si se quiere «…», el recorte se haría en JavaScript antes de pintar, y cabe en R3b. Los tamaños concretos de letra y los márgenes se eligen al implementarlo con dos criterios: que un nombre de 4 líneas más un lugar de 3 líneas quepan en 1346 px de alto, y que lo compruebe `e2e/image.spec.js` con un evento de nombre y lugar largos. Fuente: solo `Special Gothic Condensed One`. Sin botones, enlaces, recuento ni responsable.

#### 29. `src/lib/poster.js` (Create)

*   **Entrega**: R3.
*   **Type / Scope**: Módulo con la librería `html-to-image`, importada de forma estática.
*   **Proposed Changes**: `renderPoster(node, id)`:
```text
dentro de una carrera con un límite de 20 s (si vence → lanzar 'image_failed'):
1. await document.fonts.load('150px "Special Gothic Condensed One"', texto real del nodo)
   si !document.fonts.check(la misma fuente) → lanzar 'image_failed'
2. opciones = { pixelRatio: 1, width: 2048, height: 1346, cacheBust: false,
                style: { position: 'static', left: '0', top: '0', transform: 'none', margin: '0' } }
3. blob = await toBlob(node, opciones)
4. si blob es null o la imagen está vacía (todos los píxeles transparentes en una copia reducida) →
   repintar una vez: blob = await toBlob(node, opciones); si sigue vacío o null → lanzar 'image_failed'
5. devolver new File([blob], 'agenda-' + id + '.png', {type:'image/png'})
```
    `pixelRatio`, `width` y `height` se fijan explícitamente: sin `pixelRatio`, la librería usa la densidad del dispositivo. La comprobación de «imagen vacía» (`isBlank(blob)`) dibuja el PNG en un canvas de unos 16 × 10 px y mira el canal alfa. No hay módulo de producción para leer la cabecera del PNG: el tamaño exacto lo fija la construcción y lo verifica `e2e/image.spec.js`.

#### 30. `src/lib/share.js` (Create)

*   **Entrega**: R1 (enlace, `wa.me` y copiar) y R3 (imagen, descarga y `shareImage`).
*   **Type / Scope**: Módulo con `navigator` inyectado.
*   **Proposed Changes**:
```text
R1:
  detailUrl(location, id)  → location.origin + location.pathname + '?e=' + encodeURIComponent(id); descarta cualquier otro parámetro (también ?admin)
  shareText(url)           → T.share.text(url)
  waLink(text)             → 'https://wa.me/?text=' + encodeURIComponent(text)
  copyText(text, nav)      → usa nav.clipboard.writeText; devuelve false si falla o no existe
R3:
  shareImage(file, text, {nav = navigator, second = false}):
     si !nav.share o !nav.canShare?.({files:[file]})  → 'unsupported'
     try { await nav.share({files:[file], text}); return 'shared' }
     catch e:  AbortError → 'aborted'
               NotAllowedError → second ? 'error' : 'needs-second-tap'
               otro → 'error'
  downloadFile(file)       → <a download> temporal sobre una URL de objeto, revocada después;
                             si el navegador no admite download, abre la URL en una pestaña nueva
```
    En el camino del segundo toque no hay ningún `await` antes de llamar a `nav.share`. Quien llama pasa `second: true` en el segundo toque, de modo que un segundo `NotAllowedError` devuelve `'error'` y va al respaldo.

#### 31. `src/lib/share.test.js` (Create)

*   **Entrega**: R1 y R3.
*   **Type / Scope**: Prueba unitaria con un `navigator` simulado.
*   **Proposed Changes**: R1: `detailUrl` no arrastra `?admin` ni otros parámetros y funciona con un `pathname` sin barra final; `waLink` codifica acentos y el apóstrofo tipográfico; `copyText` con éxito, con error y sin portapapeles. R3: cada salida de `shareImage` (`shared`, `aborted`, `needs-second-tap`, `unsupported` por falta de `share` y por `canShare` falso, y `error`); con `second: true`, un `NotAllowedError` devuelve `error`; `nav.share` se llama de forma síncrona en la primera parte de la llamada.

#### 32. `apps-script/Code.gs` (Modify)

*   **Entrega**: R2 y R4.
*   **Type / Scope**: Google Apps Script.
*   **Proposed Changes**:
    *   **R2**: se define `OPTIONAL_EVENT_COLUMNS = ['responsable', 'inscripcio_url']` y `readAgenda_` lee los eventos con `EVENT_COLUMNS.concat(OPTIONAL_EVENT_COLUMNS)` (`readTable_` resuelve por cabecera y devuelve cadena vacía si una columna no existe, así que una hoja de 9 columnas sigue funcionando). Cada evento de la respuesta incluye `responsable` e `inscripcio_url`. `EVENT_COLUMNS`, `REQUIRED_EVENT_COLUMNS` y `setup()` no cambian. Se actualiza el comentario de cabecera del archivo. No se añade `features` en R2.
    *   **R4**: nueva constante `SHEET_ARCHIVE = 'Baixes'` y `ARCHIVE_COLUMNS = ['data_hora_baixa', 'event_id', 'nom', 'request_id']`. `doGet` añade `features: ['unsignup']`. `doPost` sigue siendo quien toma el lock (`LockService`, `tryLock` de 10 s), mantiene el `try/catch/finally` con `fail_('server')` y libera el lock en el `finally`. Lo único que cambia es el reparto del trabajo: tras `parseBody_`, `doPost` elige por `action` (cualquier otra → `bad_request`), valida lo propio de cada acción, toma el lock y llama a `signup_(body, ss, tz)` (el cuerpo actual, sin cambios, extraído tal cual) o a `unsignup_(body, ss, tz)`.
```text
unsignup_(body, ss, tz):      // ya con el lock tomado; eventId (≤ 20) y requestId (REQUEST_ID_RE) ya validados → si no, bad_request
   filas = readTable_(Inscripcions, SIGNUP_COLUMNS, tz)             // cada fila trae su número en `row`
   f = fila con event_id == eventId y request_id == requestId (no vacío)
   si no hay f → devolver {ok:true, v:1, eventId, names: namesFor_(filas, eventId), removed:false}
   filas2 = readTable_(...) otra vez, justo antes de borrar      // el dueño pudo mover filas entre las dos lecturas
   f2 = fila de filas2 con row == f.row y los mismos event_id y request_id
   si no hay f2 → devolver removed:false con los nombres de filas2 (no se busca otra vez)
   archivo = ensureSheet_(ss, SHEET_ARCHIVE, ARCHIVE_COLUMNS)       // se crea al vuelo
   fila nueva de archivo: setNumberFormat('@') antes de setValues([[ahora, eventId, f2.nom, requestId]]), como appendSignup_
   Inscripcions.deleteRow(f2.row); SpreadsheetApp.flush()
   console.log('unsignup', eventId, 'removed=' + true)
   devolver {ok:true, v:1, eventId, names: nombres de las filas que quedan, removed:true}
   (no mira isOpen_ ni si el evento existe; con removed:false también escribe console.log con removed=false)
```
    `signup` no cambia: no hay `requestSeen_` ni búsqueda en `Baixes`.

#### 33. `apps-script/Code.test.js` (Modify)

*   **Entrega**: R2 y R4.
*   **Type / Scope**: Prueba unitaria del script.
*   **Proposed Changes**: R2: `doGet` devuelve `responsable` e `inscripcio_url` de cada evento con una hoja de 11 columnas (cabecera `EVENT_HEADER_OPTIONAL` de `fake-google.js`), y una hoja de 9 columnas sigue funcionando con esos campos vacíos. La aserción de `setup()` (~L284) no cambia, porque `EVENT_HEADER` sigue en 9 columnas. R4: `doGet` devuelve `features: ['unsignup']`; `unsignup` borra la fila correcta, archiva el nombre en `Baixes` (se crea al vuelo), devuelve `names` y `removed:true`; con `request_id` vacío o de otro evento no borra; es idempotente; funciona con B1 = NO y con un evento inexistente; `busy` con el lock tomado (y el lock se libera siempre); si el dueño cambia el orden de las filas entre la lectura y el borrado, no borra otra fila y devuelve `removed:false`; `doGet` nunca devuelve `request_id`; `doPost` rechaza una acción desconocida con `bad_request`; el `signup` actual (incluido el reenvío con el mismo `requestId` en el tope de 150) sigue dando el mismo resultado.

#### 34. `apps-script/fake-google.js` (Modify)

*   **Entrega**: R2 y R4.
*   **Type / Scope**: Hoja y servicios de Google simulados.
*   **Proposed Changes**: R2: se exporta `EVENT_HEADER_OPTIONAL = [...EVENT_HEADER, 'responsable', 'inscripcio_url']`; `EVENT_HEADER` sigue en 9 columnas, porque lo usa la aserción de `setup()` de `Code.test.js`. R4: `FakeSheet.deleteRow(n)` (quita la fila `n` y las siguientes suben una posición) y una opción nueva de `createScript`, `beforeRead(sheetName, readNumber)`, que se llama al empezar la lectura número N (por `getDataRange()`) de una hoja. Un test la usa para reordenar `sheet.rows` entre la primera y la segunda lectura de `Inscripcions` dentro de `unsignup_` y comprobar que no se borra otra fila. La hoja creada con `insertSheet` ya se puede leer desde el test (`createScript` devuelve `sheets`). `unsignup_` usa `readTable_`, que ya funciona con `getDataRange().getValues()` y `getDisplayValues()`; no hace falta `getRange(...).getValues()`.

#### 35. `.gitignore` (Modify)

*   **Entrega**: R1.
*   **Type / Scope**: Configuración de Git.
*   **Proposed Changes**: Ignorar `/test-results/`, `/playwright-report/`, `/blob-report/` y `/playwright/.cache/`.

#### 36. `.github/workflows/deploy.yml` (Modify)

*   **Entrega**: R1 y R3.
*   **Type / Scope**: Flujo de CI.
*   **Proposed Changes**: R1: en `on.workflow_dispatch` (que ya existe) se añade la entrada `skip_e2e` (booleana, por defecto `false`). Después de `npm test` y antes de comprobar la URL del script se añaden `npx playwright install --with-deps chromium` y `npm run test:e2e -- --project=chromium --project=mobile`, ambos con `if: ${{ !inputs.skip_e2e }}`; sirve para desplegar una reversión cuando el CI está en rojo. Las pruebas compilan por su cuenta con la URL del script simulado (`e2e/serve.js`); la compilación de producción posterior vuelve a escribir `build/` con la URL real. Si las pruebas de `chromium` o `mobile` fallan, no se despliega. El reintento de Playwright (2 en el CI) reduce los fallos por intermitencia. R3: un paso aparte con `continue-on-error: true` ejecuta `npx playwright install --with-deps webkit` y `npx playwright test --project=webkit`; su fallo avisa pero no bloquea el despliegue. El tiempo añadido por la descarga de los navegadores se mide en la primera ejecución del CI; no se fija un límite.

#### 37. `README.md` (Modify)

*   **Entrega**: R1 a R4.
*   **Type / Scope**: Documentación.
*   **Proposed Changes**: Líneas que dejan de ser ciertas y se reescriben: l.8 («Participar abre un modal con la lista de apuntados…»: ahora la lista está en el detalle y «Participar» abre el formulario), l.95 («Nunca la edita ni la borra»: ahora la baja la borra y la archiva en `Baixes`, R4), l.96 («No hay otra vía; el modal lo dice»: el contacto en pantalla se elimina; la persona puede quitarse desde el mismo navegador, R4, o el dueño borra la fila) y l.125 («el modal se abre en solo lectura»: ahora se abre el detalle en solo lectura). La l.126 sobre Atrás en Android se mantiene y se extiende al detalle. Añadidos: lista inicial de funciones (detalle, imagen y compartir, baja, responsable, URL externa); diagrama «Cómo funciona» con `Baixes`; «Editar los eventos»: columnas J `responsable` y K `inscripcio_url`, con la nota de escribir J1 y K1 a mano, con formato de texto y la protección ampliada a J1:K1; «Desarrollo en local»: `npm run test:e2e` y qué hace; nueva sección «Backup y restauración del script» con el procedimiento de cinco pasos; nueva sección «Cómo publicar una entrega» con el orden script, web, datos y la entrada `skip_e2e`. En «Comprobaciones después de publicar» (§3) se añaden las comprobaciones en móvil real (no hay archivo nuevo): R1, el botón Atrás con el detalle abierto en Android y el spike S3 (descarga y `localStorage` en el navegador integrado de WhatsApp, usando el número de registros locales de `?admin`); R3, la imagen se descarga y no sale en blanco (S1), «Comparteix» en Android y en iPhone, y si WhatsApp en iPhone conserva el texto junto a la imagen (S2). Cada paso lleva el resultado esperado y dónde se anota.

#### 38. `docs/plantilla-esdeveniments.csv` (Modify)

*   **Entrega**: R2.
*   **Type / Scope**: Plantilla de datos.
*   **Proposed Changes**: Añadir las columnas `responsable` e `inscripcio_url` con valores de ejemplo, uno con responsable y otro con una URL externa.

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
| `detail.notFound` | «No s’ha trobat aquesta activitat.» |
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
| `participation.hint` | «Si vols desapuntar-te, torna a obrir aquesta activitat des d’aquest mateix navegador.» |
| `signupErrors.bad_request` | «No s’ha pogut fer. Recarrega la pàgina i torna-ho a provar.» |

Se reutilizan sin cambios `dialog.closed`, `dialog.pastNote`, `dialog.cancelledNote` (notas del detalle en estado cerrado, pasado y cancelado) y los textos existentes de `signupErrors` (`network`, `busy`, `server`) para los errores de la baja. Las cadenas de `?admin` para `features` y el número de registros locales son texto de diagnóstico y no se traducen.

### Verification Plan

*   **Compilation/Build**: `npm run build` con `BASE_PATH=/agenda-front-ampli` y `VITE_AGENDA_API_URL` apuntando a una URL de prueba, como hace `e2e/serve.js`. La compilación de producción real la hace el flujo de CI con la variable del repositorio.
*   **Unit Tests**: `npm test` (`node --test`) cubre los módulos puros nuevos y modificados (`state`, `my-signups`, `share`, `events`, `api`) y el script con la hoja simulada. Cada módulo nuevo tiene al menos las pruebas listadas arriba.
*   **Static Analysis & Linting**: `npm run check` (`svelte-check`) sin errores ni avisos en cada entrega. Los mocks de desarrollo deben cumplir los tipos actualizados.
*   **Test Coverage Requirement**: sin umbral numérico, porque el proyecto no mide cobertura. Tienen pruebas automáticas G1 a G6 y CUJ 1 a CUJ 6: CUJ 1 y 2 en `detail.spec.js`; CUJ 3 en `signup.spec.js`; CUJ 4 en `image.spec.js`; CUJ 5 en `share.spec.js`; CUJ 6 en `external.spec.js`; la matriz de estados en `state.test.js`; el script en `Code.test.js`. G7 (orden de entrega, backup del script, textos en catalán) y CUJ 7 son manuales: se comprueban siguiendo el procedimiento del README.
*   **E2E/Integration**: `npm run test:e2e` con Playwright. `chromium` y `mobile` ejecutan todos los flujos y bloquean el despliegue si fallan; `webkit` ejecuta solo `image.spec.js` y no bloquea. Todo se prueba contra la compilación de producción bajo `/agenda-front-ampli/`, con el `Code.gs` real ejecutándose contra la hoja simulada.
*   **Comprobaciones manuales del autor** (lo que Playwright no puede probar): las comprobaciones en móvil real de la sección «Comprobaciones después de publicar» del README (spikes S1, S2 y S3 y el botón Atrás), antes de dar por buenas R1 y R3.
*   **Tras desplegar el script** (R2 y R4): lectura con `curl` contra `/exec` y, en R4, una baja real sobre una copia del libro. La comprobación de escritura del README (`signup` de prueba con el nombre `Prova`) escribe una fila: se borra a mano después, como ya indica el README. Para R4 se añade una comprobación que no escribe: un `unsignup` con un `requestId` que no existe, que debe devolver `removed:false`.

### Decisiones de esta sección que toma el plan, no el autor

Se pueden cambiar:

*   Las pruebas de `chromium` y `mobile` bloquean el despliegue y se reintentan hasta 2 veces en el CI; `webkit` no bloquea.
*   `webkit` se ejecuta solo en la prueba de imagen, porque es donde está el riesgo conocido de Safari.
*   Los tamaños de letra y los márgenes de la imagen se eligen al implementarla, con la primera imagen real.
*   «Copia l’enllaç» cae a un campo seleccionable si el portapapeles falla.
*   `features` aparece en R4 con `['unsignup']`; en R2 no se añade.
*   `Baixes` se crea al vuelo al primer `unsignup`, sin tocar `setup()`.
*   Las fechas objetivo y el orden de recorte (R4 antes que R3) de «Orden de entrega y compatibilidad de versiones».
*   Un solo diálogo de detalle más el modal reducido (Alternativa S) y mantener `localStorage` (Alternativa T).

--------------------------------------------------------------------------------

<!-- Provenance: Indicates initial structural drafting via EGM. -->

*Drafted with EGM*
