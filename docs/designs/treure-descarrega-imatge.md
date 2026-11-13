# Quitar el botón «Descarrega la imatge» del detalle

*   **Author:** Juan Peist
*   **Status:** Approved
*   **Date:** 2026-11-13

--------------------------------------------------------------------------------

## Overview

El detalle de un evento que se puede compartir (abierto, con inscripciones
cerradas o con URL externa) muestra tres acciones:

*   **Descarrega la imatge** («descarga la imagen»): genera un PNG del evento y
    lo descarga.
*   **Comparteix** («comparte»): genera el mismo PNG y lo envía al panel de
    compartir del sistema junto con un texto del evento.
*   **Tria una imatge pròpia per compartir** («elige una imagen propia para
    compartir»): la persona elige una imagen suya; el mismo botón pasa a
    **Comparteix amb la imatge pròpia** y un segundo toque la envía con el
    mismo texto.

Este diseño quita la primera. El PNG (2048 × 1346, dibujado por
`PosterView.svelte` y convertido a archivo por `renderPoster` de `poster.js`)
se sigue generando, pero solo desde **Comparteix**. Cuando el navegador no
puede compartir archivos, **Comparteix** ya descarga el PNG como respaldo y
eso no cambia.

## The Problem

**Comparteix** ya cubre lo que hace **Descarrega la imatge**: genera el mismo
PNG y, en los navegadores que no pueden compartir archivos, lo descarga como
`agenda-<id>.png`. Tener dos botones que generan la misma imagen añade una
decisión más en el detalle y duplica estado en `EventDetail.svelte`: la función
`download()` y las variables `imageFailed` y `generatingFor` solo existen para
ese botón.

## Goals

*   El detalle deja de mostrar **Descarrega la imatge** en todos los estados.
*   **Comparteix**, su respaldo con descarga y la acción de imagen propia
    se comportan igual que antes: los tests de `e2e/share.spec.js` sobre esas
    acciones pasan sin cambiar lo que comprueban.
*   Se borra el código que solo servía a ese botón (función, estado y texto).
*   Las comprobaciones de la imagen (tamaño, color del tipo, recorte y escalado
    del texto, fallo de generación) siguen cubiertas por los tests de
    `e2e/image.spec.js`, ahora a través de **Comparteix**.
*   El README describe la interfaz nueva y la prueba manual S1 se hace con
    **Comparteix**.

## Non-Goals

*   No se cambia cómo se genera la imagen (`poster.js`, `PosterView.svelte`,
    `poster-scale.js`).
*   No se elimina `downloadFile` de `share.js`: el respaldo de **Comparteix** lo
    sigue usando.
*   No se cambian los textos de **Comparteix** ni el aviso de respaldo
    (`T.share.fallbackNote`: «Aquest navegador no pot compartir la imatge.
    S’ha descarregat: adjunta-la al missatge.»).
*   No se reescriben los diseños anteriores de `docs/designs/`: son registro
    histórico.

## Decisiones del autor

*   **Guardar la imagen en el móvil (13 de noviembre).** Se acepta que, en
    móviles que pueden compartir archivos, guardar el PNG dependa de la opción
    de guardar del panel de compartir del sistema. En iPhone suele existir
    («Guardar imagen»); algunos Android pueden no ofrecerla (sin comprobar
    todavía) y entonces la persona tiene que enviarse la imagen a sí misma. Queda como límite conocido en el README.
*   **Quitar el botón antes de S1 (13 de noviembre).** El botón se quita sin
    esperar a la prueba manual S1 en un móvil real (spike del README que mide
    si la imagen se genera en 5 s o menos, sin salir en blanco y con la fuente
    correcta). S1 pasa a hacerse con **Comparteix**, con la regla de medición
    de la sección *Riesgos y mitigaciones*.

## Critical User Journeys (CUJs)

### CUJ 1: Compartir la imagen en un móvil con soporte de archivos

*   **Given**: el detalle de un evento abierto, en un navegador donde
    `navigator.canShare({ files })` es verdadero.
*   **When**: la persona pulsa **Comparteix**.
*   **Then**: no hay botón **Descarrega la imatge**. **Comparteix** dice
    «Generant…» («generando») y después se abre el panel de compartir del
    sistema con `agenda-<id>.png` y el texto del evento. Para guardar la imagen
    usa la opción de guardar del panel, si existe.

### CUJ 2: Obtener la imagen en un navegador sin soporte de archivos

*   **Given**: el detalle de un evento abierto, en un navegador sin
    `navigator.share` o con `canShare` falso para archivos (escritorio, algunos
    navegadores internos de apps).
*   **When**: la persona pulsa **Comparteix**.
*   **Then**: se descarga `agenda-<id>.png`, aparece el enlace «Obre WhatsApp
    amb el text» («abre WhatsApp con el texto») y el aviso
    `T.share.fallbackNote`.

### CUJ 3: La imagen no se puede generar

*   **Given**: el detalle de un evento abierto y la tipografía que usa
    `PosterView` no carga.
*   **When**: la persona pulsa **Comparteix**.
*   **Then**: sale «No s’ha pogut generar la imatge. Torna-ho a provar.», el
    enlace `wa.me` de solo texto, ninguna descarga, y **Comparteix** vuelve a
    estar activo para reintentar.

## Technical Plan (Architecture)

### Flujo después del cambio

La generación de la imagen pasa a tener un solo llamador:

```text
[Descarrega la imatge] --download()-->  (eliminado)

[Comparteix] --share()--> generate() --> renderPoster(PosterView) --> File
                              |                                        |
                              |              shareImage(file, text) (share.js)
                              |               | compartido / cancelado -> reposo
                              |               | NotAllowedError -> «Imatge preparada: prem de nou»
                              |               | sin soporte / otro error -> downloadFile(file) + enlace wa.me
                              |
                              +-- fallo de generación -> shareView = 'failed'
                                                         -> T.share.imageFailed + enlace wa.me
```

«Imatge preparada: prem de nou» («imagen preparada: pulsa de nuevo») aparece
cuando el navegador rechaza el compartir porque caducó el permiso del toque
mientras se generaba la imagen; el segundo toque comparte el mismo archivo.
Este flujo no cambia.

### Componente `EventDetail.svelte`

*   Se borran la función `download()` y su botón.
*   Se borra el estado `imageFailed`. Solo `download()` lo ponía a verdadero; el
    fallo de **Comparteix** ya usa `shareView === 'failed'`. La región
    `aria-live` pasa de `imageFailed || shareView === 'failed'` a
    `shareView === 'failed'` y sigue mostrando `T.share.imageFailed`.
*   Se borran `generatingFor` y el parámetro `purpose` de `generate()`. Con un
    solo llamador, `generatingFor === 'share'` equivale a `generating`.
    `customImage()` no pone `generating` a verdadero (usa `sharing`), así que la
    etiqueta de **Comparteix** no cambia durante el flujo de imagen propia.
*   Se mantienen `downloadFile` (respaldo), `PosterView`, `renderPoster`,
    `busy`, `epoch` y `resetShare`, sin las líneas de los estados borrados.

### Textos `texts.js`

Se borra `T.share.download`. `T.share.imageFailed` y `T.share.generating` se
mantienen porque **Comparteix** los usa.

### Tests e2e

`image.spec.js` obtiene el PNG pulsando **Comparteix** después de
`mockShare(page, ['ok'], { files: false })`. Con `files: false`, el
`navigator.canShare` simulado rechaza archivos y la app descarga
`agenda-<id>.png` por el respaldo. El archivo descargado es el mismo `File`
que genera `renderPoster`, así que las comprobaciones de tamaño y píxeles
siguen valiendo.

## Alternatives Considered

Las tres alternativas las descartó el autor; la razón técnica está en cada
una.

### Alternativa A: Ocultar el botón con CSS o con una bandera de configuración

*   **Pros**: se vuelve atrás sin tocar código; los tests actuales de
    `image.spec.js` seguirían usando el botón.
*   **Cons**: deja código sin uso (`download()`, `imageFailed`,
    `generatingFor`). Si se oculta solo visualmente (fuera de pantalla u
    `opacity`), el botón sigue accesible para lectores de pantalla y para
    `getByRole`. No hay ningún caso previsto en que se vuelva a activar.
*   **Reason for Rejection**: Rejected by author: el objetivo es simplificar el
    detalle y el componente; ocultar mantiene toda la complejidad. Volver atrás
    es un `git revert`.

### Alternativa B: Que los tests de imagen lean el `File` pasado al `navigator.share` simulado

*   **Pros**: prueba el camino principal (compartir con archivos) en lugar del
    respaldo.
*   **Cons**: hay que pasar los bytes del `File` del navegador a Node
    (`arrayBuffer` → base64 en `page.evaluate`), con un helper nuevo. No
    comprueba el nombre del archivo descargado.
*   **Reason for Rejection**: Rejected by author: el respaldo con descarga
    entrega el mismo `File` con el mismo nombre, y `downloadImage` solo cambia
    el botón que pulsa. `share.spec.js` ya cubre que el camino principal pasa
    el archivo a `navigator.share`.

### Alternativa C: Mantener el botón solo en escritorio

*   **Pros**: en escritorio el nombre del botón describe el resultado (una
    descarga); **Comparteix** no.
*   **Cons**: hay que saber si el navegador comparte archivos antes de pintar
    el detalle, lo que contradice la decisión del README de no comprobarlo
    hasta tener el archivo hecho. Dos interfaces distintas que probar.
*   **Reason for Rejection**: Rejected by author: añade una rama de interfaz
    para un caso que **Comparteix** ya resuelve con su respaldo.

--------------------------------------------------------------------------------

## Risks & Mitigations

*   **Guardar en Android.** Algunos Android pueden no ofrecer guardar la imagen
    en el panel de compartir (sin comprobar todavía; se verá en S1). *Mitigación:* aceptado por el autor; se documenta como
    límite en *Decisiones y límites* del README.
*   **Escritorio.** En escritorio la imagen solo se obtiene con
    **Comparteix**, que descarga el PNG, muestra el enlace de WhatsApp y el
    aviso `T.share.fallbackNote`, que suena a error. *Mitigación:* aceptado; no
    se cambia el aviso (es un non-goal).
*   **Medición de S1.** S1 medía «toque → descarga». *Mitigación:* el
    cronómetro se para cuando aparece el panel de compartir o la descarga. Si
    aparece «Imatge preparada: prem de nou», esa medición no cuenta y se
    repite. El PNG para las comprobaciones (no en blanco, fuente, tamaño) se
    guarda desde el panel o se abre desde *Descargas* si el navegador
    descargó.
*   **Marcha atrás frente a S1.** El README dice que, si S1 o S2 fallan, R3b y
    R3a (este botón) se revierten con `git revert`. Después de este cambio, ese
    revert ya no se aplica limpio. *Mitigación:* si S1 o S2 fallan, se revierte
    primero el commit de este diseño y después R3b y R3a en el orden ya
    escrito. Se añade al README.
*   **Accesibilidad.** El orden de foco del detalle pierde un elemento. La
    región `aria-live` sigue anunciando el fallo de generación.

--------------------------------------------------------------------------------

## Additional Resources

*   [README.md](../../README.md): funciones, spike S1 y *Decisiones y límites*.
*   [detall-imatge-baixa.md](./detall-imatge-baixa.md): diseño original del
    botón de descarga.

--------------------------------------------------------------------------------

## Detailed Implementation Plan

Todo va en un solo commit, que incluye este documento
(`docs/designs/treure-descarrega-imatge.md`), porque el README nuevo lo
enlaza. Revertir el commit también lo quita; el diseño queda en el historial.
Antes del commit deben pasar `npm run build`, `npm run check`, `npm test` y
los tests e2e del apartado *Verification Plan*.

El plan está escrito sobre el commit `c356b75` («Better custom image on
share»), que ya incluye la imagen propia en dos toques (**Tria una imatge
pròpia per compartir** → **Comparteix amb la imatge pròpia**).

### Target Files to Create/Modify

#### 1. `src/lib/components/EventDetail.svelte` (Modify)

*   **Type / Scope**: Componente Svelte.
*   **Proposed Changes**:
    *   Borrar `let generatingFor = $state(null)` y su JSDoc
        (`'download' | 'share' | null`).
    *   Borrar `let imageFailed = $state(false)` y su JSDoc
        (`/** A «Descarrega la imatge» that failed to generate. */`).
    *   En `resetShare()`: borrar `generatingFor = null` e
        `imageFailed = false`.
    *   `generate(purpose)` pasa a `generate()`: borrar el parámetro, su línea
        `@param` y las dos asignaciones a `generatingFor` (al empezar y en el
        `finally`).
    *   Borrar la función `download()` y su comentario
        («The image is rendered again on every tap.»).
    *   En `shareFirst()`: cambiar `generate('share')` por `generate()` y
        borrar `imageFailed = false`.
    *   En `changePicker()`: borrar `imageFailed = false`.
    *   En el marcado: borrar el `<button>` con `onclick={download}`. En el
        botón **Comparteix**, cambiar la condición `generatingFor === 'share'`
        por `generating`.
    *   En la región `aria-live`: cambiar `imageFailed || shareView === 'failed'`
        por `shareView === 'failed'`.
    *   Mantener el import de `downloadFile` (lo usa `fallbackWithDownload`).
*   **Por qué**: es el único componente que muestra el botón y el único que
    declara `generatingFor` e `imageFailed`.

#### 2. `src/lib/texts.js` (Modify)

*   **Type / Scope**: Textos de la interfaz.
*   **Proposed Changes**: borrar `share.download`. Mantener
    `share.imageFailed` y `share.generating`.
*   **Por qué**: ningún código lo lee después de borrar el botón.

#### 3. `e2e/image.spec.js` (Modify)

*   **Type / Scope**: Tests e2e de la imagen (corren en `chromium`, `mobile` y
    `webkit`).
*   **Proposed Changes**:
    *   Importar `mockShare` de `./helpers.js`.
    *   Helper `downloadImage(page, id)`: mantener el nombre y la forma de lo
        que devuelve (`{ name, png }`). Solo cambia el botón que pulsa:
        `getByRole('button', { name: T.share.share, exact: true })`. Actualizar
        su comentario por:
        `/** Opens the detail of an event, taps «Comparteix» (the browser cannot share files, so the image is downloaded) and returns the downloaded file. */`
    *   En los tests que obtienen el PNG o generan la imagen, añadir
        `await mockShare(page, ['ok'], { files: false });` como primera línea
        (antes de `page.route` y de `openAgenda`, porque `mockShare` usa
        `addInitScript`). En el test de fallo de generación no llega a
        usarse, pero se pone igual para que todos los tests de imagen
        preparen la página de la misma forma:
        *   `la imatge d’un ${type} baixa a 2048 × 1346, no és en blanc i té el color del tipus`
            (los dos casos del bucle): la última aserción (`T.share.download`
            habilitado) pasa a `T.share.share` (`exact: true`) habilitado.
        *   `un nom i un lloc llargs es retallen i queden dins la imatge`: sin
            más cambios.
        *   `un nom i un lloc curts s’escalen i omplen la imatge sense sortir-ne`:
            sin más cambios.
        *   `si no es pot generar la imatge, es diu i el botó queda a punt per tornar-ho a provar`:
            pulsar `T.share.share` (`exact: true`) en lugar de
            `T.share.download`, y comprobar que ese mismo botón queda
            habilitado. Las demás aserciones no cambian. Se mantiene aunque
            `share.spec.js` tiene un test parecido, porque `share.spec.js` no
            corre en `webkit`.
    *   `en els estats sense compartir no hi ha botó d’imatge` (evento
        `cancel-1`, cancelado, cuyo detalle se abre en solo lectura): sin
        `mockShare`. Cambiar la aserción a que los botones `T.share.share`
        (`exact: true`) y `T.share.customImage` (`exact: true`) tienen
        `toHaveCount(0)`. El título no cambia.
    *   Los demás títulos de test no cambian.
*   **Por qué**: el helper, un `.click()` y tres aserciones usan el botón
    borrado. Sin el cambio, el test de `cancel-1` pasaría siempre, porque el
    botón ya no existe en ningún estado.

#### 4. `e2e/share.spec.js` (Modify)

*   **Type / Scope**: Tests e2e de compartir (corren en `chromium` y `mobile`).
*   **Proposed Changes**:
    *   Test `mentre genera, el botó diu «Generant…» i està desactivat`
        (comprueba que los botones quedan desactivados mientras se genera):
        borrar la aserción de que `T.share.download` está desactivado.
    *   Bucle `for (const primaryAction of ['share', 'download'])` (comprueba
        que usar la acción principal descarta una imagen propia preparada):
        sustituir el bucle por un único test:
        *   Título: `usar «Comparteix» descarta la preparació pròpia`.
        *   Inicio y preparación sin cambios:
            `const { detail, custom, customShare, share, downloads } = await openDetail(page);`,
            `selectFile` con `selected.png` y la espera de `customShare`
            visible.
        *   Cuerpo: la rama `share` actual, sin `if/else`:
            `await share.click(); await sharedTimes(page, 1);`.
        *   Aserciones finales, en este orden: el botón `T.share.customImage`
            (`exact: true`) es visible; `customShare` tiene `toHaveCount(0)`;
            los nombres de archivo de `shareCalls(page)` son
            ``[`agenda-${ID}.png`]``; `postersRendered(page)` es `1`;
            `downloads` es `[]`. Son las aserciones actuales con los dos
            ternarios resueltos a su valor de `share`.
    *   Test `les tres accions d’imatge es desactiven mentre el compartir propi està pendent`
        (comprueba que, con un compartir propio pendiente, los botones de
        imagen están desactivados): borrar la aserción de `T.share.download` y
        cambiar el título a `les dues accions d’imatge es desactiven mentre el compartir propi està pendent`,
        porque quedan dos botones de imagen. Quitar `detail` de la
        desestructuración (`const { custom, downloads, share } = …`), porque
        esa aserción era su único uso. Si no se borra esa aserción,
        `T.share.download` vale `undefined`, `name: undefined` coincide con
        todos los botones del detalle y el test falla.
*   **Por qué**: son los tres usos de `T.share.download` en el archivo.

#### 5. `README.md` (Modify)

*   **Type / Scope**: Documentación de usuario y de pruebas.
*   **Proposed Changes**:
    *   Borrar el punto que empieza por `- **Descarrega la imatge** (en el detalle…`.
    *   En el punto siguiente, sustituir
        `- **Comparteix** (R3b; mismos eventos que la descarga) genera la imagen al pulsar y la envía`
        por
        `- **Comparteix** (R3b; en el detalle de los eventos que se pueden compartir: abiertos, con inscripciones cerradas o con URL externa) genera cada vez un PNG de 2048 × 1346 px con el título de la agenda, tipo, nombre, día, hora y lugar (el texto crece cuando el nombre y el lugar son cortos) y lo envía`.
        El resto del punto y sus subpuntos (que ya cubren «Generant…» y el
        fallo de generación) no cambian.
    *   En el punto **Imatge pròpia**, cambiar
        `al usar **Comparteix** o **Descarrega la imatge**,` por
        `al usar **Comparteix**,`.
    *   En la línea `- Construido antes de comprobar S1 y S2…`, añadir al final:
        `Después se quitó el botón «Descarrega la imatge» (ver [docs/designs/treure-descarrega-imatge.md](docs/designs/treure-descarrega-imatge.md)); si hay que revertir, se revierte primero ese commit.`
    *   En *Entrega de la imagen (R3a)*, cambiar el paso 1 por:
        `` 1. **Generación y tiempo.** Abre el detalle de un evento con inscripciones abiertas y pulsa *Comparteix*. Para medir el tiempo graba la pantalla del móvil (o usa un cronómetro en otro aparato): cuenta desde el toque hasta que aparece el panel de compartir o la descarga; mientras tanto el botón dice «Generant…». Si sale «Imatge preparada: prem de nou», esa medición no vale. Haz **tres mediciones válidas** y apunta la peor. Debe tardar **5 s o menos**. Repítelo con un nombre y un lugar largos (rellena una fila de prueba con unos 120 caracteres en `nom` y `lloc`). Después ábrelo desde el navegador interno de WhatsApp (el enlace `?e=ID_DE_UN_EVENTO` enviado a un chat) y anota qué pasa: anótalo en la línea *Resultado* de *Navegador interno de WhatsApp (S3)*, en *Decisiones y límites*: «descarga de archivos: funciona» si descarga el PNG, o «descarga de archivos: no probada (abre el panel de compartir)» si abre el panel. ``
    *   En el paso 3 de *Comprobaciones después de publicar* (Spike S3),
        cambiar
        `La parte de S3 sobre descargar un archivo se prueba con el paso 1 de la entrega de la imagen (R3a), de abajo.`
        por
        `La parte de S3 sobre descargar un archivo se prueba con el paso 1 de la entrega de la imagen (R3a), de abajo, solo si en el navegador interno *Comparteix* descarga el PNG; si abre el panel, queda sin probar.`
    *   Cambiar el inicio del paso 2 de
        `2. **No sale en blanco.** Abre el PNG descargado (en iPhone, desde *Archivos*; en Android, desde *Descargas*).`
        a
        `2. **No sale en blanco.** Guarda el PNG desde el panel de compartir y ábrelo (en iPhone, desde *Fotos* o *Archivos*). Si el navegador lo descargó, ábrelo desde *Descargas*. Si el panel no permite guardar, envíatelo a ti mismo por WhatsApp y ábrelo desde el chat.`
    *   En el paso 4, cambiar
        `En iPhone, *Archivos → Obtener información* debe dar 2048 × 1346.` por
        `En iPhone, la información de la imagen (*Fotos → ⓘ* o *Archivos → Obtener información*) debe dar 2048 × 1346.`
    *   En el párrafo `*Regla (del diseño):*` de S1, cambiar
        `` R3b y R3a se revierten con `git revert` `` por
        `` se revierte primero el commit que quitó «Descarrega la imatge» y después R3b y R3a con `git revert` ``.
    *   En *Entrega de imagen propia*, paso 1: cambiar
        `el compartir generado y la descarga siguen` por
        `el compartir generado y su respaldo con descarga siguen`.
    *   En *Decisiones y límites*, después del punto **Imagen (S1)**, añadir:
        `- **Sin botón de descarga** (decisión del autor del 13 de noviembre): la imagen solo se obtiene con *Comparteix*. En móviles que comparten archivos, guardarla depende de la opción de guardar del panel del sistema, que algunos Android pueden no ofrecer (pendiente de comprobar en S1); entonces hay que enviársela a uno mismo. En escritorio, *Comparteix* la descarga y muestra el aviso de respaldo.`
    *   En el punto **WhatsApp y el texto con la imagen (S2)** de
        *Decisiones y límites*, cambiar
        `` se revierten R3b y R3a con `git revert` `` por
        `` se revierte primero el commit que quitó «Descarrega la imatge» y después R3b y R3a con `git revert` ``.
    *   El punto **Imagen (S1)** de *Decisiones y límites* no cambia (su texto
        «el botón vuelve a reposo» sigue siendo cierto para **Comparteix**).
*   **Por qué**: el README describe y hace probar un botón que ya no existe, y
    su regla de marcha atrás no tiene en cuenta este commit.

#### 6. `src/lib/components/README.md` (Modify)

*   **Type / Scope**: Documentación de carpeta.
*   **Proposed Changes**: en la línea de `EventDetail.svelte` (la lista de
    componentes), borrar `«Descarrega la imatge», `. La línea de efectos
    secundarios que menciona `downloadFile` no cambia.
*   **Por qué**: la línea nombra una acción que el componente ya no tiene.

#### 7. `docs/designs/treure-descarrega-imatge.md` (Create)

*   **Type / Scope**: Este documento de diseño.
*   **Proposed Changes**: añadirlo al mismo commit, sin cambios.
*   **Por qué**: el README nuevo lo enlaza.

### Verification Plan

*   **Compilation/Build**: `npm run build`.
*   **Static Analysis**: `npm run check` (no hay script de lint).
*   **Unit Tests**: `npm test` (no se modifican tests unitarios; deben pasar).
*   **E2E**: `npx playwright test e2e/image.spec.js e2e/share.spec.js`. Corre
    los tres proyectos; si WebKit no está instalado, antes
    `npx playwright install webkit`. Deben pasar `chromium` y `mobile`. En CI,
    `webkit` corre aparte con `continue-on-error: true`, así que un fallo ahí
    no bloquea el despliegue, pero el test de fallo de generación de
    `image.spec.js` existe para verlo: un fallo en `webkit` se revisa antes
    del commit.
*   **Búsqueda de restos**: estos tres comandos no deben devolver nada:
    *   `grep -nF -e share.download -e generatingFor -e "imageFailed =" -e "imageFailed ||" src/lib/components/EventDetail.svelte`
        (`poster.js` tiene su propio `imageFailed`, que no se toca).
    *   `grep -rnF share.download src e2e`.
    *   `grep -rnF "Descarrega la imatge" src e2e` (cubre la clave de
        `texts.js` y `src/lib/components/README.md`). El README raíz se
        excluye: su texto nuevo nombra el botón quitado.
*   **Manual**: en un móvil, abrir el detalle de un evento con inscripciones
    abiertas y comprobar que no aparece **Descarrega la imatge** y que las
    únicas acciones de imagen son **Comparteix** y **Tria una imatge pròpia
    per compartir**.

--------------------------------------------------------------------------------

<!-- Provenance: Indicates initial structural drafting via EGM. -->

*Drafted with EGM*
