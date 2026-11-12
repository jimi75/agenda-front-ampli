# Imagen del evento: texto más grande cuando el contenido es corto

*   **Author:** Juan Peist
*   **Status:** Approved for implementation
*   **Date:** 2026-11-12

--------------------------------------------------------------------------------

## Overview

Este documento enmienda [detall-imatge-baixa.md](./detall-imatge-baixa.md) (sección «Imagen», componente `PosterView.svelte` y módulo `poster.js`). Ese diseño define la imagen que la persona descarga o comparte con «Descarrega la imatge». No cambia nada más de él.

Glosario mínimo:

*   **Banda**: franja naranja superior con el título del sitio (185,6 px de alto).
*   **Cuerpo**: la zona de color liso bajo la banda, donde va el texto del evento. Mide 1160,4 px de alto y, tras el `padding` de 72 px, quedan 1016,4 px de **alto útil** y 1856 px de **ancho útil**.
*   **Pila**: los bloques de texto del cuerpo apilados: tipo, nombre, día, hora y lugar.
*   **`k`**: factor por el que se multiplican los tamaños de la pila.

Hoy la imagen mide 2048 × 1346 px y usa tamaños fijos: 128 px el nombre, 76 px el día y la hora, 64 px el lugar y 56 px el tipo. Se eligieron para que el caso más largo permitido (nombre de 4 líneas, lugar de 3) quepa. Con poco texto, la imagen queda casi vacía.

Este diseño multiplica esos tamaños por `k` según la cantidad de texto, de modo que un evento corto ocupe la mayor parte del alto útil.

## The Problem

En el evento de ejemplo «PARADETA» (tipo Acció, «dimarts 24 de novembre», «9h-13h», «Plaça Olivareta»), el texto ocupa solo la esquina superior izquierda: llega a la mitad del alto del cuerpo y a un tercio del ancho. El resto es fondo liso. La imagen se ve vacía y se lee mal en la miniatura pequeña de un chat. La causa es que los tamaños están fijados para el caso más largo y los eventos cortos pagan ese coste.

## Goals

*   **G1. Texto que llena la imagen.** Para el evento de referencia («Paradeta», «Plaça Olivareta»), la pila ocupa al menos el 90 % del alto útil. Para cualquier otro evento con texto de ancho medio, la pila ocupa al menos el 55 % (ver «Relleno por escalón»).
*   **G2. Nada sale de la imagen.** Ningún texto visible sale de los 2048 × 1346 px. Si el texto es atípico (letras muy anchas), puede perder líneas por recorte, pero nunca se desborda.
*   **G3. El texto largo no empeora.** Un evento que hoy llena la imagen mantiene los tamaños actuales y el mismo recorte (`k = 1`).
*   **G4. Mismo resultado en cualquier dispositivo.** `k` depende solo del texto del evento, no del móvil ni del navegador. El PNG se genera con la fuente ya cargada, como hoy.
*   **G5. Verificable.** Una prueba unitaria fija la función `posterScale` y un caso de `e2e/image.spec.js` comprueba el PNG del evento de referencia. La imagen sigue midiendo 2048 × 1346 px.

## Non-Goals

*   Reducir el texto largo para que quepa. Se sigue recortando con `line-clamp`.
*   Cambiar el tamaño de la imagen, los colores, la fuente (`Special Gothic Condensed One`), la banda o el orden de los elementos.
*   Mostrar «…» al recortar.
*   Plantillas por tipo de evento, vista previa de la imagen, o cambios en el detalle, la tarjeta o el texto de compartir.
*   Ponderar letras anchas en el recuento (ver «Riesgos»).

**Efecto sobre el diseño original.** [detall-imatge-baixa.md](./detall-imatge-baixa.md) lista como Non-Goal «Ajuste automático del tamaño del texto de la imagen (el texto largo se recorta)». Este diseño no reduce el texto largo, así que ese Non-Goal sigue siendo cierto. Solo se añade en ese documento una nota que remite a este (ver fichero 6 del plan).

## Decisiones tomadas

*   **Tolerancia de relleno (antes Q1).** Mínimo del 90 % para el evento de referencia y del 55 % para el resto. Un evento sin lugar usa los mismos escalones y no tiene escalón propio: con `k = 1,9` queda en el 77 %.
*   **Letras anchas (antes Q2).** Se acepta que un texto atípico, por ejemplo un nombre de 17 caracteres hecho de «M» y «W» (unos 81 px por carácter a 128 px, frente a 48 px de media), ocupe más líneas de las previstas y que el lugar quede recortado. Es el mismo recorte que ya se acepta para el texto largo.

## Critical User Journeys (CUJs)

### CUJ 1: Imagen de un evento con texto corto

*   **Given**: Un evento Acció con nombre «Paradeta», día «dimarts 24 de novembre», hora «9h-13h» y lugar «Plaça Olivareta». El detalle está abierto.
*   **When**: La persona pulsa «Descarrega la imatge».
*   **Then**: Se descarga un PNG de 2048 × 1346 px. El texto se ve a 1,9 veces el tamaño actual y la pila ocupa el 96 % del alto útil (G1).

### CUJ 2: Imagen de un evento con texto largo

*   **Given**: Un evento con un nombre de 120 caracteres y un lugar de 120 caracteres.
*   **When**: La persona descarga la imagen.
*   **Then**: La imagen es igual que la actual: mismos tamaños y mismo recorte (4 líneas de nombre, 3 de lugar), todo dentro de la imagen (G2, G3).

## Technical Plan (Architecture)

### Mecanismo

Una función pura, `posterScale(name, place)`, devuelve `k` según la longitud en caracteres del nombre y del lugar (los que entrega `events.js`, con un máximo de 120 cada uno). `PosterView` pone `k` en la variable CSS `--k` de la raíz y los tamaños de la pila pasan a `calc(<tamaño actual> * var(--k))`. Con `k = 1` el resultado es idéntico al actual.

Escala con `k`: tamaño de letra de tipo, nombre, día, hora y lugar, y los `margin-top` de nombre, día y lugar. No escala: la banda, el `padding` del cuerpo, `line-height`, la fuente, los límites `line-clamp` (4 y 3) y el tamaño de la imagen.

`html-to-image` copia el estilo calculado, así que debería recibir píxeles ya resueltos y no depender de `var()`. Es una suposición: se comprueba con el caso e2e del paso 2, que falla si `--k` no llega al PNG.

### Escalones

La tabla es la única fuente de los umbrales. Se evalúa de arriba abajo y gana la primera fila cuya condición se cumple.

| Escalón | `k` | Condición | Nombre máx. | Lugar máx. |
|---|---|---|---|---|
| 1 | 1.9 | nombre ≤ 17 y lugar ≤ 40 | 17 | 40 |
| 2 | 1.5 | nombre ≤ 40 y lugar ≤ 50 | 40 | 50 |
| 3 | 1.15 | nombre ≤ 70 y lugar ≤ 110 | 70 | 110 |
| 4 | 1 | el resto | — | — |

**Cómo se eligieron los umbrales.** Son un presupuesto de alto, no una fórmula de una línea. A cada escalón le corresponde un máximo de líneas de nombre `n` y de lugar `p` que hacen que la pila quepa en 1016,4 px; la longitud límite se obtiene dividiendo el ancho útil (1856 px) entre el ancho por carácter, escalado por `k`. Se usa un ancho medio de 56 px por carácter del nombre a 128 px de fuente y de 24 px por carácter del lugar a 64 px. Son las medias medidas con la fuente real (48,2 y 20,8) más un 16 % de margen.

**Alto de la pila.** Con la hoja de estilos actual, la parte fija mide 282,4 px (tipo 56 × 1,05 = 58,8; margen del nombre 24; margen del día 40; día y hora 76 × 1,05 = 79,8 cada uno). Cada línea de nombre añade 130,6 px (128 × 1,02), y el lugar añade 32 px de margen más 70,4 px por línea (64 × 1,1). La pila mide `k × (282,4 + 130,6·n + (32 + 70,4·p si hay lugar))`.

### Relleno por escalón

Alto de la pila sobre 1016,4 px de alto útil, calculado con la fórmula anterior. El «mejor caso» es el límite superior del escalón; el «peor caso» es el primer valor que cae en él.

| Escalón | Mejor caso (líneas, altura) | Peor caso (líneas, altura) |
|---|---|---|
| 1 | 1 y 1: 979 px (96 %). Sin lugar: 785 px (77 %) | igual |
| 2 | 2 y 1: 969 px (95 %) | nombre de 18 caracteres, 1 línea: 773 px (76 %). Sin lugar: 620 px (61 %) |
| 3 | 3 y 2: 974 px (96 %) | lugar de 51 caracteres, nombre corto: 593 px (58 %) |
| 4 | como hoy | lugar de 111 caracteres y nombre corto, `k = 1`: 586 px (58 %) |

El mínimo es del 55 % y se acepta: con cuatro escalones discretos, un evento justo por encima de un umbral queda con menos relleno. Un nombre de 17 y otro de 18 caracteres difieren en un 21 % de tamaño.

Ancho: con `k = 1,9`, la línea más ancha es el día («dimecres 25 de novembre», unos 1216 px) y entra en los 1856 px. El tipo, la hora y el lugar de escalón 1 (40 caracteres × 24 px × 1,9 ≈ 1824 px) también entran.

### Flujo de datos

```text
AgendaEvent (name, place)
      │
      ▼
posterScale(name, place) ──► k ∈ {1.9, 1.5, 1.15, 1}   (src/lib/poster-scale.js)
      │
      ▼
PosterView.svelte: style:--k={k} ──► font-size/margin: calc(base * var(--k))
      │
      ▼
renderPoster(node, id)  (sin cambios)
      │
      ▼
PNG 2048 × 1346
```

### Qué no cambia

`poster.js`, `EventDetail.svelte`, `config.js` (`POSTER`), `texts.js` y la API. El recuento usa los valores que ya recorta `events.js` (`MAX_TEXT = 120`), así que no hay validación nueva.

### Riesgos

*   **Letras anchas**: el recuento no mide el ancho real (ver «Decisiones tomadas»).
*   **Umbrales calculados, no medidos en la imagen final.** El peor caso de cada escalón se comprueba a mano en la implementación (ver «Verificación»). Si un texto no cabe, se baja el umbral del escalón, no el límite de altura.
*   **`var()` y `html-to-image`**: suposición comprobada por el caso e2e.
*   **Saltos entre escalones**: aceptables para una imagen de uso corto.

## Alternatives Considered

### Alternativa A: Medir y ajustar en JavaScript (búsqueda binaria sobre `--scale`)

*   **Mecanismo**: tras montar el póster y cargar la fuente, prueba unas 8 escalas, lee el `scrollHeight` del cuerpo en cada una y conserva la mayor que cabe.
*   **Pros**: relleno preciso para cualquier texto, también de letras anchas.
*   **Cons**: unas 40 líneas y un paso más antes de capturar. Medir con la fuente sin cargar da una escala demasiado alta. Si `html-to-image` parte las líneas distinto que la página, el PNG sale recortado.
*   **Reason for Rejection**: más código y más riesgo de fallo silencioso que los escalones para un beneficio que solo se nota con texto atípico.

### Alternativa B: Escalones por recuento de caracteres (elegida)

Ver Technical Plan.

### Alternativa C: Escalar el bloque con `transform: scale(k)`

*   **Mecanismo**: mide la altura a tamaño base, `k` es la altura del cuerpo dividida por la medida (con tope) y el ancho de línea se fija en el ancho base dividido por `k`.
*   **Pros**: una sola medición; los saltos de línea quedan como a tamaño base.
*   **Cons**: `html-to-image` puede copiar mal una transformación en un hijo (texto borroso o desplazado) y el código ya anula la transformación de la raíz.
*   **Reason for Rejection**: depende de la copia de `transform` por `html-to-image`, un riesgo que el diseño original ya esquivó en la raíz.

### Alternativa D: Subir los tamaños fijos de todas las imágenes

*   **Mecanismo**: cambiar los tamaños actuales por otros mayores, iguales para todos.
*   **Cons**: no existe un tamaño único que sirva a la vez para el texto corto y para el caso de 4 + 3 líneas.
*   **Reason for Rejection**: o el texto largo se recorta antes (contradice G3), o el corto sigue sin llenar la imagen (contradice G1).

### Alternativa E: Tamaño relativo con unidades CSS de contenedor (`cqh`, `clamp()`)

*   **Mecanismo**: tamaños en función del alto del cuerpo, sin escalones.
*   **Cons**: el tamaño dependería del alto y no de la cantidad de texto, así que el texto largo no mantendría los tamaños actuales (G3). No hay forma de leer el contenido desde CSS.
*   **Reason for Rejection**: no cumple G3 y su soporte dentro del clon de `html-to-image` no está comprobado.

## Detailed Implementation Plan

### Secuencia de implementación

Una sola entrega, en este orden. Tras cada paso, `npm test` y `npm run check` quedan en verde, salvo el caso e2e del paso 2, que debe fallar hasta el paso 3.

1.  `src/lib/poster-scale.js` y su prueba unitaria.
2.  Caso nuevo en `e2e/image.spec.js` (falla: la imagen aún no cambia).
3.  `PosterView.svelte` usa la función; el caso del paso 2 pasa.
4.  README raíz.
5.  `src/lib/README.md` y `src/lib/components/README.md`.
6.  Comprobación visual y de peores casos (ver «Verificación»).
7.  Nota en `detall-imatge-baixa.md`.

No hay cambios en la hoja, el script de Google, la API ni el orden de despliegue. **Rollback:** revertir el commit; los eventos no guardan nada de la imagen.

### Ficheros

#### 1. `src/lib/poster-scale.js` (Create)

*   **Rationale**: la regla vive en una función pura, fuera de Svelte, para probarla con `node --test` como el resto de `src/lib` (por ejemplo `share.test.js`).
*   **Proposed Changes**: exporta `posterScale(name, place)`, con `name: string`, `place: string` (cadena vacía si no hay lugar; `event.place` ya es una cadena) y retorno `number`. Los escalones son una constante `Object.freeze` con las filas 1 a 3 de la tabla («Escalones»), en ese orden, con `k`, `maxName` y `maxPlace`. Para cada escalón, si `name.length <= maxName` y `place.length <= maxPlace`, devuelve `k`; si ninguno se cumple, devuelve `1`. Se usa la longitud de la cadena original, no la de la versión en mayúsculas. Un comentario breve remite a este diseño para el origen de los umbrales y avisa de que los escalones 2 y 3 dependen de que el texto ocupe varias líneas. JSDoc con tipos, como `src/lib`. `config.js` no cambia.

#### 2. `src/lib/poster-scale.test.js` y `e2e/image.spec.js` (Create / Modify)

*   **Rationale**: los umbrales se fijan sin navegador; el PNG se comprueba una vez.
*   **Unit tests** (`node:test` y `node:assert/strict`, como `share.test.js`): los límites de cada escalón (nombre 17 y 18, 40 y 41, 70 y 71; lugar 40 y 41, 50 y 51, 110 y 111), un nombre corto con un lugar largo que cae al escalón que admite ese lugar, lugar vacío, 120 y 120 caracteres → `1`, y que ningún valor devuelto es menor que `1`.
*   **e2e**: un caso nuevo en `e2e/image.spec.js`, en catalán como el resto, con `nom` «Paradeta» y `lloc` «Plaça Olivareta» sobre `accio-1`, usando la técnica de `prepare` del caso del texto largo. Comprueba con `hasInk`, sobre el color `--lime`: hay tinta en `{ x: 0, y: 1050, width: 2048, height: 230 }` (G1), no hay tinta en `y ≥ 1290` ni en los 80 px del margen derecho (G2), y el PNG mide 2048 × 1346 (G5). Antes del paso 3 falla, porque con `k = 1` el texto termina cerca de y = 770. El caso del texto largo existente no se modifica y cubre G3. El proyecto `webkit` ejecuta todo `image.spec.js`; el caso nuevo se ejecuta también allí, sin tolerancia especial: los márgenes de la zona de tinta son amplios (el texto termina en torno a y = 1190).

#### 3. `src/lib/components/PosterView.svelte` (Modify)

*   **Rationale**: es donde viven los tamaños de letra.
*   **Proposed Changes**: importa `posterScale` y calcula `const k = $derived(posterScale(event.name, event.place))`. Pone `style:--k={k}` en `.poster`. En el CSS, pasan a `calc(<valor> * var(--k))`: `.type` `font-size` (56 px), `.name` `font-size` (128 px) y `margin-top` (24 px), `.day`/`.time` `font-size` (76 px), `.day` `margin-top` (40 px), `.place` `font-size` (64 px) y `margin-top` (32 px). No cambian `.band`, el `padding` de `.body`, `line-height`, `line-clamp`, colores, fuente ni tamaño. Actualiza el comentario de cabecera si hace falta.

#### 4. `README.md` (Modify)

*   **Proposed Changes**: en el punto «Descarrega la imatge», añade una frase: el texto de la imagen crece cuando el nombre y el lugar son cortos. En la sección «Imagen (S1)» (S1 es la primera entrega del proyecto, la de este diseño original), añade que el tamaño sale de `posterScale` por recuento de caracteres en tres escalones, que el texto largo mantiene los tamaños anteriores y que los nombres con letras muy anchas pueden perder líneas. Busca ambos puntos por su texto, no por número de línea.

#### 5. `src/lib/README.md` y `src/lib/components/README.md` (Modify)

*   **Proposed Changes**: en `src/lib/README.md`, junto a la entrada de `poster.js`, añade `poster-scale.js`: `posterScale(name, place)` → factor de escala (`1.9`, `1.5`, `1.15` o `1`). En `src/lib/components/README.md`, en la entrada de `PosterView`, añade que el tamaño de letra y los márgenes del cuerpo se multiplican por `posterScale(event.name, event.place)` mediante `--k`.

#### 6. `docs/designs/detall-imatge-baixa.md` (Modify)

*   **Rationale**: el diseño original fija tamaños que ahora son los del escalón `k = 1`.
*   **Proposed Changes**: en la sección «Imagen» y en el apartado del fichero `PosterView.svelte`, donde dice que los tamaños de letra se eligen al implementar, añade una nota: «Ampliado por [imatge-text-gran.md](./imatge-text-gran.md): los tamaños citados son los del escalón `k = 1`». El Non-Goal sobre el ajuste automático no se modifica.

### Verificación

*   `npm test` (incluye `poster-scale.test.js`), `npm run check` y `npm run test:e2e`.
*   Comprobación visual, una vez, de los peores casos de cada escalón: nombre de 17 y lugar de 40, nombre de 40 y lugar de 50, nombre de 70 y lugar de 110 (textos catalanes normales, de ancho medio), y el caso «PARADETA». En cada uno, el texto no toca el borde inferior ni el derecho. Si alguno no cabe, se baja el umbral de ese escalón en la tabla y en `poster-scale.js`.
