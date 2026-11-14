# Lista de eventos con layout de móvil en todos los anchos

*   **Author:** Juan Peist
*   **Status:** Accepted
*   **Date:** 2026-11-14

--------------------------------------------------------------------------------

## Overview

La lista de eventos ([Calendar.svelte](../../src/lib/components/Calendar.svelte)) pasa a mostrarse siempre como la lista vertical de móvil, dentro de una columna centrada de 720px como máximo. Se elimina la cuadrícula mensual de 7 columnas que hoy aparece desde 1024px y todo el código, los datos y los textos que solo existían para ella.

## The Problem

Desde 1024px la lista se convierte en una cuadrícula de 7 columnas de unos 140px cada una. No se ve bien y obliga a mantener un bloque de CSS adicional en [EventCard.svelte](../../src/lib/components/EventCard.svelte) (1024–1279px) para que las tarjetas quepan. La agenda se usa sobre todo en móvil, hay pocos usuarios de escritorio y, según el autor, nadie depende de la cuadrícula.

La solución es borrar la cuadrícula y limitar la anchura de la lista. Es un cambio que elimina código: queda un único layout de lista y el único breakpoint de 1024px que queda es el del diálogo de detalle (`EventDetail`).

## Goals

*   La lista de eventos usa el layout de móvil en todos los anchos.
*   `.calendar` mide 720px como máximo, incluyendo el padding, y va centrado. Las tarjetas miden unos 688px.
*   El salto al próximo día con eventos se aplica también en escritorio. No se ejecuta si el usuario ya ha hecho scroll (`scrollY > 0`) ni si la cabecera del día de destino ya está dentro de la ventana (`top >= 0 && top < innerHeight`). Estas dos guardas valen también en móvil, donde hoy el salto es incondicional.
*   Se borra todo lo que la cuadrícula deja sin uso: CSS, el `<ul class="weekdays">`, `--first`, `rows`, textos, comentarios y documentación.
*   Los tests e2e y unitarios reflejan el nuevo comportamiento.

## Non-Goals

*   Cabecera, leyenda, avisos (`.notice`, 640px) y modales (`EventDetail`, `SignupDialog`, `PosterView`) no cambian. `EventDetail` conserva su `@media (min-width: 1024px)`.
*   No hay vista alternativa de mes en escritorio.
*   No se mueve el foco del teclado tras el salto. Es un comportamiento que ya existe en móvil.
*   No se cambia el rango de fechas de [config.js](../../src/lib/config.js).
*   No se reescribe el diseño histórico [detall-imatge-baixa.md](./detall-imatge-baixa.md); solo se le añade una nota.

## Open Questions

*   **Avisos a 640px frente a tarjetas de 688px**: se acepta una diferencia de unos 24px por lado. Se puede alinear después con un ancho compartido si molesta.

## Critical User Journeys (CUJs)

### CUJ 1: Ver la agenda en escritorio

*   **Given**: ventana de 1280×900 y un mes con eventos.
*   **When**: el usuario abre la agenda.
*   **Then**: ve una lista vertical centrada de 720px como máximo, con cabecera de día, tarjetas y etiqueta «avui» (sin cuadrícula, sin fila de días de la semana). Los días sin eventos no aparecen. Cabecera, leyenda y avisos siguen a ancho completo.

### CUJ 2: Aterrizar en el próximo día con eventos

*   **Given**: escritorio, hoy es 10 de noviembre, el primer día con eventos es el 2, el próximo día con eventos es el 12 y el usuario no ha hecho scroll.
*   **When**: terminan de cargar los datos.
*   **Then**: la lista se desplaza hasta `#dia-2026-11-12`. Si el usuario ya hizo scroll, o la cabecera del día ya estaba dentro de la ventana, no se mueve nada. Lo mismo vale en móvil. Con `?e=` (detalle abierto) no hay salto.

### CUJ 3: Abrir un detalle desde la lista

*   **Given**: escritorio ≥1024px y la lista visible.
*   **When**: el usuario pulsa «detall».
*   **Then**: se abre el panel centrado de 640px sobre la lista, con el fondo oscurecido. Por debajo de 1024px se abre a pantalla completa, como hoy.

### CUJ 4: Cargar la agenda en móvil con el día de destino ya visible

*   **Given**: móvil de 390×844 con la página sin scroll y la cabecera del próximo día con eventos ya dentro de la ventana.
*   **When**: terminan de cargar los datos.
*   **Then**: no se mueve nada. Si el día de destino queda fuera de la ventana, se desplaza hasta él, como hoy.

## Technical Plan (Architecture)

No hay componentes nuevos ni cambios de datos, rutas, URLs ni almacenamiento. Todo es borrado y un ajuste de un valor.

1.  **Anchura.** En `Calendar.svelte`, `.calendar` ya está centrado (`margin: 0 auto`) con `max-width: 90rem`. Pasa a `45rem`. `box-sizing: border-box` es global (en [+layout.svelte](../../src/routes/+layout.svelte)), así que 45rem incluye el `padding: 1rem` y las tarjetas miden unos 688px. No se añade ningún contenedor: uno en `<main>` estrecharía también leyenda y avisos.
2.  **Cuadrícula.** Se borran el `@media (min-width: 1024px)` de `Calendar.svelte` (cuadrícula, fila de días de la semana, outline de hoy, regla `.wd, .of` que esconde el texto) y el `@media (min-width: 1024px) and (max-width: 1279px)` de `EventCard.svelte`. Las reglas base de móvil pasan a ser las únicas.
3.  **Restos de la cuadrícula.** Se borran el `<ul class="weekdays">` y su regla `display:none`, `style:--first` en `<ol class="days">`, `rows` en `month.js` y sus aserciones en `month.test.js`, y `T.weekdaysShort` en `texts.js` (nadie lo usa). Se mantienen `firstWeekday` (calcula `weekday`; se decide mantenerlo en el valor devuelto, como en el brief) y `T.weekdays` (las cabeceras de día y `T.dateLabel` lo usan).
4.  **Salto protegido.** En `anchorToUpcoming` de [+page.svelte](../../src/routes/[[districte]]/+page.svelte) se elimina la línea de `matchMedia('(min-width: 1024px)')` y se añaden dos guardas:

    ```text
    anchorToUpcoming():
      await tick()
      if window.scrollY > 0: return          # el usuario o el navegador ya han movido la página
      target = primer día con eventos con date >= today
      if no target or target es el primer día con eventos: return
      el = #dia-<target.date>
      top = el.getBoundingClientRect().top
      if top >= 0 and top < window.innerHeight: return   # ya visible
      el.scrollIntoView({ block: 'start' })
    ```

    La guarda de `scrollY` evita pelear con un usuario que ya ha empezado a bajar mientras llegaban los datos y, previsiblemente, con la restauración de scroll del navegador al recargar. El momento exacto de esa restauración respecto a `tick()` no está comprobado: se verifica a mano (ver Verification Plan). La guarda de visibilidad evita un movimiento innecesario cuando el día de destino ya se ve; solo mira la cabecera del día (`top`), no las tarjetas. Ambas guardas se aplican en todos los anchos, también en móvil.
5.  **Diálogo.** `EventDetail.svelte` mantiene su media query de 1024px. Se añade un comentario sobre el `@media`: «From 1024px the detail is a centred panel, so it does not stretch across a wide screen.».

```text
Antes (>=1024px):  [Cabecera] [Leyenda]
                   [ L  M  X  J  V  S  D ]   cuadrícula de 7 columnas
                   [ .. .. .. .. .. .. .. ]

Después (todos):   [Cabecera] [Leyenda]  (ancho completo)
                       +--------------+
                       | JUEVES 12    |   columna <= 720px, centrada
                       |  tarjeta     |
                       | SÁBADO 21    |
                       +--------------+
```

## Alternatives Considered

### Alternative A: Contenedor de 1024px

*   **Pros**: se aprovecha más pantalla.
*   **Cons**: las tarjetas de móvil estiradas a 1024px dejan líneas de nombre y hora demasiado largas.
*   **Reason for Rejection**: Rejected by author: líneas demasiado largas en las tarjetas; se elige 720px.

### Alternative B: Contenedor en toda la página (`<main>`)

*   **Pros**: un solo ancho para todo.
*   **Cons**: estrecharía también cabecera, leyenda y avisos.
*   **Reason for Rejection**: Rejected by author: estrecharía cabecera, leyenda y avisos, que no deben cambiar.

### Alternative C: Subir el breakpoint de la cuadrícula (por ejemplo a 1440px)

*   **Pros**: cambio mínimo; los desktop muy anchos conservan la vista del mes.
*   **Cons**: mantiene todo el código, los tests y la documentación de la cuadrícula, y solo esconde el problema.
*   **Reason for Rejection**: Rejected by author: mantiene todo el código, los tests y la documentación de la cuadrícula; el objetivo es borrarla, no moverla.

### Alternative D: Mantener el inicio en el día 1 en escritorio

*   **Pros**: conserva el contexto (título y leyenda visibles al cargar).
*   **Cons**: el usuario tiene que bajar hasta el próximo evento; es distinto del móvil.
*   **Reason for Rejection**: Rejected by author: el usuario tendría que bajar hasta el próximo evento; se quiere el mismo comportamiento que en móvil, con protección.

### Alternative E: Quitar también el `@media` de `EventDetail`

*   **Pros**: un breakpoint menos.
*   **Cons**: el detalle sería una hoja a pantalla completa de hasta 1920px de ancho.
*   **Reason for Rejection**: Rejected by author: los modales no cambian y una hoja de 1920px de ancho sería peor.

--------------------------------------------------------------------------------

## Non-Functional Requirements

*   **Rendimiento**: despreciable. Como mucho 31 `<li>` y los días vacíos no crean tarjetas. El coste real es la longitud del scroll (unos 8.000–12.000px en un mes completo).
*   **Rollout y rollback**: sin migración. Volver atrás es un `git revert`. La salida de servidor es la misma en todos los anchos (la página se renderiza en el servidor y `matchMedia` solo se ejecutaba en `onMount`), así que no hay riesgo de hidratación.
*   **Accesibilidad**: se pierde la vista del mes. El `<ul class="weekdays">` que desaparece ya estaba oculto a las tecnologías de asistencia (`aria-hidden`); el día de la semana y «de novembre» pasan a ser visibles en la cabecera de día. El DOM no cambia de orden, así que el orden de tabulación tampoco.
*   **Pantallas intermedias (721–1023px)**: pasan de lista a ancho completo a una columna centrada de 720px como máximo; el detalle sigue abriéndose a pantalla completa en ese rango.
*   **Cambios visibles en escritorio**: desaparece el contorno naranja del día de hoy; queda la etiqueta «avui».

--------------------------------------------------------------------------------

## Additional Resources

*   [concepts_brief.md](../../concepts_brief.md)
*   [detall-imatge-baixa.md](./detall-imatge-baixa.md): diseño histórico que describía la cuadrícula.

## Future Improvements

*   **Separadores de semana**: la lista oculta los días vacíos y no se distingue un fin de semana de un día libre.
*   **Mover el foco** a la cabecera del día tras el salto (`tabindex="-1"` y `focus({ preventScroll: true })`, como ya hace `closeDetail`).
*   **Ancho compartido** para `.calendar` y `.notice`.
*   `{#if events.length}` en vez de renderizar los 28 `<li>` vacíos y ocultarlos con CSS.

--------------------------------------------------------------------------------

## Detailed Implementation Plan

### Target Files to Create/Modify

#### 1. `src/lib/components/Calendar.svelte` (Modify)

*   **Type / Scope**: componente Svelte.
*   **Proposed Changes**: `.calendar { max-width: 45rem }`. Borrar el bloque `@media (min-width: 1024px)`, el `<ul class="weekdays" aria-hidden>` con su `{#each T.weekdays}`, la regla `.weekdays { display: none }` y `style:--first` en `<ol class="days">`. Mantener `.day.empty { display: none }`, `scroll-margin-top` y el resto de reglas base.

#### 2. `src/lib/components/EventCard.svelte` (Modify)

*   **Type / Scope**: componente Svelte.
*   **Proposed Changes**: borrar el bloque `@media (min-width: 1024px) and (max-width: 1279px)` y su comentario («The grid starts at 1024px…»). Verificar que no queda ninguna otra referencia a la cuadrícula.

#### 3. `src/routes/[[districte]]/+page.svelte` (Modify)

*   **Type / Scope**: página SvelteKit.
*   **Proposed Changes**: en `anchorToUpcoming`, quitar `matchMedia`, añadir la guarda `window.scrollY > 0` y la comprobación `top >= 0 && top < window.innerHeight` sobre `getBoundingClientRect()` del día de destino (ver Technical Plan, punto 4). Ambas valen en todos los anchos. Reescribir el comentario «On a phone the list starts…» a «The list starts at the next day with events, unless the page was already scrolled». `.notice` (40rem) no cambia.

#### 4. `src/lib/components/EventDetail.svelte` (Modify)

*   **Type / Scope**: componente Svelte.
*   **Proposed Changes**: añadir sobre el `@media (min-width: 1024px)` el comentario «From 1024px the detail is a centred panel, so it does not stretch across a wide screen.». El comentario existente «Below 1024px the detail is the whole screen.» sigue siendo cierto y se mantiene. No se toca ningún estilo.

#### 5. `src/lib/month.js` (Modify)

*   **Type / Scope**: módulo JS.
*   **Proposed Changes**: quitar `rows` del objeto devuelto y de su typedef/JSDoc. Mantener `firstWeekday`.

#### 6. `src/lib/month.test.js` (Modify)

*   **Type / Scope**: test unitario.
*   **Proposed Changes**: borrar las aserciones de `month.rows` (líneas 13, 26 y 32) y la de `month.firstWeekday + 1` (línea 22), que solo servía a `--first`. Mantener la aserción `days.length % 7` (línea 14), cambiando su mensaje de «cap casella buida a la graella» a «quatre setmanes completes». Renombrar «…28 dies i 4 files completes» a «…28 dies i 4 setmanes completes». El test «…ocupa 4 files» y el de «…el dia 1 és diumenge i hi ha 6 files» pasan a comprobar solo `firstWeekday` y se renombran sin «files». Confirmar los nombres exactos leyendo el archivo antes de editar. Mantener las aserciones de `weekday` y `firstWeekday`.

#### 7. `src/lib/config.js` (Modify)

*   **Type / Scope**: configuración.
*   **Proposed Changes**: reescribir el comentario de las líneas 1–2 (en inglés, como el resto del archivo): «The agenda shows the 2nd to the 29th: four full weeks.». La línea 3 (`apps-script/Code.gs (validDates_)` usa el mismo rango) se mantiene. No cambiar valores.

#### 8. `src/lib/texts.js` (Modify)

*   **Type / Scope**: textos.
*   **Proposed Changes**: borrar `weekdaysShort` (`texts.js:9`; nadie lo usa en `src`, `e2e` ni `apps-script`). Mantener `weekdays`.

#### 9. `e2e/detail.spec.js` (Modify)

*   **Type / Scope**: tests Playwright.
*   **Proposed Changes**:
    *   Borrar el helper `isNarrow` (línea 10) y el `test.skip` de la línea 66. Renombrar el test «sense ?e=, al mòbil la llista s’obre al proper dia…» a «sense ?e=, la llista s’obre al proper dia amb esdeveniments». Antes de `openAgenda`, fijar la ventana a 1280×600 con `page.setViewportSize` para que `#dia-2026-11-12` empiece por debajo del borde inferior y la guarda «ya visible» no lo impida. Comprobar con `expect.poll` que su borde superior queda a ≤16px del borde superior de la ventana. Verificar antes que `#dia-2026-11-12` empieza fuera de la ventana (`top >= innerHeight`) y que la página es lo bastante alta para llegar hasta ahí; si no lo es, bajar la altura.
    *   Añadir un test «ya visible»: con una ventana lo bastante alta para que `#dia-2026-11-12` quede dentro (por ejemplo 1280×1600), `scrollY` sigue en 0 tras cargar.
    *   Añadir un test: si la página ya tiene `scrollY > 0` cuando llegan los datos, no se produce el salto. Abrir con `waitForCards: false` (opción de `openAgenda` en `e2e/helpers.js`); mientras se muestra el aviso de carga, llamar a `page.evaluate(() => window.scrollTo(0, 50))`, esperar a las tarjetas y comprobar que `scrollY` sigue en 50 (ni 0 ni la posición del día 12). Si la página es demasiado corta para hacer scroll durante la carga, retener la respuesta con un `page.route` y liberarla después del `scrollTo`.
    *   Añadir un test en el proyecto `mobile` (CUJ 4): con una ventana lo bastante alta para que la cabecera del día de destino quede dentro, `scrollY` sigue en 0.
    *   El test de `?e=` (líneas 57–63, `scrollY === 0`) pasa a ser una comprobación real en escritorio.
    *   Bucle de anchos (línea 211): `[390, 1024, 1100, 1280]` pasa a `[390, 1024, 1280, 1920]`; 1100 existía solo para el bloque de `EventCard` que se borra.
    *   Sustituir la aserción «The grid stays visible behind the dimmed panel» (líneas 257–259) por: `ul.weekdays` no existe, `.calendar` mide ≤ 720px y está centrado (misma fórmula que la comprobación del panel, tolerancia 1px).

#### 10. `README.md` (Modify)

*   **Type / Scope**: documentación.
*   **Proposed Changes**: líneas 5–6, fusionar «cuadrícula de 1024px» y «lista en móvil» en una sola descripción (lista vertical, columna de 720px). Línea 331: eliminar «la cuadrícula no tiene casillas vacías».

#### 11. `src/lib/components/README.md` y `src/routes/README.md` (Modify)

*   **Type / Scope**: documentación.
*   **Proposed Changes**: en el primero (línea 7), quitar «renders weekday header». En el segundo (línea 15), quitar la referencia a `min-width: 1024px` y al comportamiento solo en móvil.

#### 12. `docs/designs/detall-imatge-baixa.md` (Modify)

*   **Type / Scope**: diseño histórico.
*   **Proposed Changes**: añadir bajo el título un blockquote: «Nota (2026-11-14): la lista ya no es una cuadrícula y el panel de ≥1024px ya no deja el calendario visible detrás; ver [lista-movil-todos-anchos.md](./lista-movil-todos-anchos.md).». No reescribir el resto.

#### 13. `docs/designs/lista-movil-todos-anchos.md` (este documento)

*   **Type / Scope**: este diseño.
*   **Proposed Changes**: se confirma junto al cambio, con el estado Proposed → Approved. `docs/designs/` no tiene `SITEMAP.md`, así que no hay nada que registrar.

### Verification Plan

*   **Compilation/Build**: `npm run build` termina con código 0. `build/` está desactualizado y contiene el CSS de la cuadrícula; `e2e/serve.js` lo reconstruye antes de lanzar el preview.
*   **Type check**: `npm run check` termina sin errores.
*   **Unit Tests**: `npm test` pasa entero.
*   **E2E/Integration**: `npm run test:e2e` pasa entero (proyectos `chromium` y `mobile`; `webkit` solo ejecuta `image.spec.js`).
*   **Manual**: en cada ancho, comprobar:
    *   390px: columna a ancho completo, salto al cargar y sin salto si el día ya se ve.
    *   768px: columna centrada de 720px como máximo y detalle a pantalla completa.
    *   1024px y 1280px: columna centrada y panel de detalle de 640px centrado.
    *   1920px: columna centrada, sin desbordamiento horizontal.
    *   En cualquier ancho: no hay salto con `?e=`, ni con scroll previo, y al recargar a media lista la página se queda donde estaba (comprueba el momento de la restauración de scroll).
*   **Búsqueda de restos**: `grep -rnE "ul\.weekdays|class=\"weekdays\"|--first|month\.rows|weekdaysShort|1279|cuadr|graella|casella|\bgrid\b" src e2e README.md` no devuelve coincidencias, salvo los usos de `T.weekdays` (que se mantienen).

--------------------------------------------------------------------------------

*Drafted with EGM*
