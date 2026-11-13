# Agenda multidistrito (Sants-Montjuïc + Eixample)

*   **Autor:** Juan Peist
*   **Estado:** Borrador revisado (EGM, 2026-11-14)
*   **Fecha:** 2026-11-14

Los títulos de sección de nivel 2 siguen la plantilla de diseño y están en inglés. El resto del documento está en castellano.

--------------------------------------------------------------------------------

## Overview

La agenda de Front Ampli ([README.md](../../README.md)) es hoy una web estática en GitHub Pages para un solo distrito de Barcelona: Sants-Montjuïc. Lee los eventos y las inscripciones de una única hoja de cálculo de Google a través de un Apps Script ([apps-script/Code.gs](../../apps-script/Code.gs)).

Este diseño permite que el mismo código, el mismo Apps Script y la misma hoja de cálculo sirvan a varios distritos con la misma funcionalidad. Solo cambia el nombre del distrito:

*   **Sants-Montjuïc** sigue en `https://jimi75.github.io/agenda-front-ampli/`, sin ningún cambio visible.
*   **Eixample** se publica en `https://jimi75.github.io/agenda-front-ampli/eixample`.
*   **Distritos siguientes.** Se añaden con los pasos de [Añadir un distrito](#añadir-un-distrito). No hace falta publicar otra versión del Apps Script.

Cómo se consigue:

*   Cada distrito tiene su propia pestaña de eventos, `Esdeveniments <slug>`. Las pestañas `Inscripcions`, `Baixes` y `Config` siguen siendo compartidas.
*   La web indica el distrito con un parámetro opcional `d`. Si falta, el script entiende que es Sants, así que las páginas antiguas siguen funcionando.
*   Cada distrito tiene su página generada al compilar, con su título y su vista previa.

El cambio se despliega durante la campaña en curso (del 2 al 29 de noviembre de 2026), mientras Sants recibe inscripciones.

### Términos

*   **Slug.** Nombre corto del distrito en minúsculas, sin acentos ni espacios: `eixample`. Es la ruta de la página, el valor de `d` y parte del nombre de la pestaña.
*   **Raíz.** El distrito que se publica en `/` y no envía `d`: Sants-Montjuïc.
*   **Prefijo.** Comienzo fijo de los ids de eventos de un distrito, por ejemplo `eix-`. Ver [Norma de prefijos](#norma-de-prefijos).
*   **Interruptor de inscripciones.** La celda `Config!B1`. Con `NO`, nadie se puede apuntar.
*   **Tope de 3000.** `MAX_SIGNUPS_TOTAL` ([Code.gs:41](../../apps-script/Code.gs)): número máximo de filas en `Inscripcions`. Al llegar, el script responde `closed`.
*   **`?admin`.** Añadido al final de la URL, muestra un bloque de diagnóstico para quien mantiene la hoja: las cabeceras que faltan, las *filas ignoradas* (filas de la hoja que la web no muestra por un error, con su número y su motivo) y las `features` del script.
*   **`T`.** El objeto con todos los textos de la web, en [src/lib/texts.js](../../src/lib/texts.js).
*   **Código de error.** El script responde `{ ok: false, v: 1, error: '<código>' }`. La web traduce cada código de inscripción con `T.signupErrors`.
*   **`<exec>`.** La URL pública del Apps Script desplegado, que termina en `/exec`. Es la de `VITE_AGENDA_API_URL`.
*   **`readCopy`.** La función de [src/lib/api.js](../../src/lib/api.js) que lee la copia de la agenda guardada en el navegador.

## The Problem

Otros distritos quieren la misma agenda que Sants-Montjuïc. Hoy solo se podría hacer con un fork del repositorio, otra hoja de cálculo, otro Apps Script y otro despliegue por distrito. Eso obliga a mantener varias copias del código, y el interruptor de inscripciones (`Config!B1`) y el tope de 3000 inscripciones dejarían de ser comunes a todos.

**Quién edita.** Cada distrito tendrá sus propios editores, todos en la misma hoja. Cada uno solo podrá editar la pestaña de eventos de su distrito, pero todos pueden ver todas las pestañas. Hoy el README da por hecho que hay un solo editor (líneas 165 y 179), y eso cambia.

El código actual está atado a un distrito en estos puntos:

*   **Script.** El Apps Script lee una sola pestaña de eventos, con el nombre fijo `Esdeveniments` ([Code.gs:20](../../apps-script/Code.gs)). La API no tiene ningún parámetro para indicar el distrito ([api.js:81](../../src/lib/api.js)).
*   **Título y vista previa.** El título, la descripción y la vista previa de WhatsApp están escritos para Sants en la plantilla común [src/app.html](../../src/app.html). También aparecen en [texts.js](../../src/lib/texts.js) (`siteTitle`) y [Header.svelte](../../src/lib/components/Header.svelte).
*   **Copia guardada en el navegador.** Usa una clave fija, `agenda-sants-montjuic-2026-11` ([config.js:20](../../src/lib/config.js)). Si dos distritos compartieran esa clave, uno podría mostrar la agenda guardada del otro.
*   **Rutas.** La web genera una sola página, `/` ([src/routes/README.md](../../src/routes/README.md)).

## Goals

*   **Sants sin cambios.**
    *   La raíz muestra Sants-Montjuïc con el mismo título y el mismo texto de vista previa.
    *   Los ids de los eventos de Sants no cambian, y los enlaces `/?e=<id>` ya compartidos siguen abriendo el mismo evento.
    *   Las claves del navegador (`STORAGE_KEY` y `MY_SIGNUPS_KEY`) no cambian.
    *   La petición GET y su respuesta son idénticas a las de hoy.
    *   `setup()` no cambia.
    *   Todos los tests actuales siguen pasando sin modificarse. Solo se añaden tests.
*   **Eixample.** `/eixample` muestra los eventos de la pestaña `Esdeveniments eixample` y permite inscribirse y darse de baja.
    *   Su HTML generado tiene su propio `<title>`, `description`, `og:title` y `og:description`, y cada uno aparece una sola vez.
*   **Un distrito más sin publicar otra versión del script.** Basta con los pasos de [Añadir un distrito](#añadir-un-distrito).
*   **Páginas antiguas.** Las páginas de Sants abiertas o en caché antes del despliegue y las copias guardadas en el navegador siguen funcionando con el script nuevo. Por eso `API_VERSION` sigue siendo 1.
*   **Eventos de su distrito.** Una página de distrito solo muestra los eventos de su pestaña. Si el script no devuelve el distrito pedido, la página muestra un error en lugar de eventos ajenos.
    *   Las listas de inscritos sí se mezclan si dos distritos repiten un id: ver [Risks & Mitigations](#risks--mitigations).
*   **Interruptor y tope globales.** `Config!B1` abre o cierra todos los distritos a la vez, y el tope de 3000 cuenta las inscripciones de todos.
*   **Aviso de prefijos.** `?admin` lista los ids de un distrito que no empiezan por su prefijo. Solo informa: no bloquea nada.
*   **Despliegue y vuelta atrás documentados**, sin perder inscripciones de Sants.

## Non-Goals

*   **Portada y ruta de Sants.** No hay portada con la lista de distritos ni ruta `/sants-montjuic`.
*   **Nada propio de un distrito** salvo el nombre: ni fechas, ni límites, ni textos, ni interruptor, ni funcionalidades.
*   **Privacidad entre editores.** Cada editor solo edita la pestaña de eventos de su distrito, pero puede ver todas las pestañas, incluidos los `request_id` de `Inscripcions`. Separar también la lectura obligaría a tener una hoja por distrito, y queda fuera. Ver [Seguridad y permisos](#seguridad-y-permisos).
*   **Ids.** No se generan ni se bloquean, y el código no obliga a usar el prefijo. Los editores los escriben a mano siguiendo la [Norma de prefijos](#norma-de-prefijos).
*   **Distrito en las inscripciones.** `Inscripcions` y `Baixes` no guardan el distrito. Se acepta que, si dos distritos repiten un id, sus listas de inscritos se mezclen.
*   **`setup()` para distritos.** `setup()` no cambia: no crea ni prepara pestañas de distrito, y sigue sin aplicar formato ni protección a J:K. La pestaña de un distrito se crea duplicando `Esdeveniments` (ver [Pestaña de un distrito nuevo](#pestaña-de-un-distrito-nuevo)).
*   **Eventos cancelados y tope.** No cambia cómo el servidor trata los eventos cancelados ni el mensaje al llegar al tope de 3000 (son problemas que ya existían).
*   **Caché de la agenda.** No se guarda la respuesta del GET en CacheService. El script ya usa CacheService solo para no escribir dos veces la misma inscripción (`req:<requestId>`, en `signup_`), y eso no cambia.
*   **Métricas, redirecciones y altas sin desplegar.** No hay métricas ni analítica, no hay redirecciones, y no se pueden dar de alta distritos sin un despliegue de la web.
*   **Fechas.** No cambia el mes de la agenda.

## Open Questions

Todas están **cerradas** con el autor (2026-11-14):

*   **Fecha de salida de Eixample.** *Decisión:* en cuanto se apruebe este diseño y pase el ensayo del paso 3 del despliegue, sin fecha fija. La campaña acaba el 29 de noviembre, y se espera un distrito más en los próximos días.
*   **Pestañas nuevas.** *Decisión:* se duplica `Esdeveniments` a mano y se vacía; `setup()` no cambia. Ver [Pestaña de un distrito nuevo](#pestaña-de-un-distrito-nuevo).
    *   *Motivo:* menos código en el script en plena campaña, y la copia ya trae formato, desplegables, la cabecera J:K y su protección.
    *   *Coste:* si no se vacía bien, los ids de Sants quedan en el distrito nuevo y las inscripciones se mezclan. Se cubre con la comprobación del paso 4 de [Añadir un distrito](#añadir-un-distrito).
*   **Título de Eixample.** *Decisión:* se sigue el patrón de Sants.
    *   Título: «Agenda Frontamplista Eixample».
    *   Descripción: «Accions i actes de novembre de 2026 al districte de l’Eixample.».
    *   Cada distrito tiene un campo `deName` con la preposición y el artículo («de Sants-Montjuïc», «de l’Eixample»), con el apóstrofo `’` que usa `texts.js`.
*   **Barra final.** *Decisión:* durante esta campaña se acepta que `/eixample/` (con barra final) dé el 404 de GitHub. Los enlaces se publican siempre sin barra, y no se añade `404.html`.
*   **Permisos.** *Decisión:* cada pestaña de eventos se protege para que solo la editen los editores de su distrito (y el dueño); `Config`, `Inscripcions`, `Baixes` y cualquier otra pestaña, solo el dueño. Se hace con las protecciones de Google Sheets, sin cambiar código. Se acepta que cualquier editor pueda leer todas las pestañas, incluidos los `request_id`, y editar el script. Ver [Seguridad y permisos](#seguridad-y-permisos).

## Critical User Journeys (CUJs)

### CUJ 1: Un vecino de Sants usa la agenda como siempre

*   **Given**: el script nuevo y la web nueva están desplegados. El vecino tiene en el móvil un enlace `/?e=<id>` compartido antes del cambio y una inscripción guardada en su navegador.
*   **When**: abre el enlace, se apunta a otro evento y después se da de baja del primero.
*   **Then**:
    *   Ve la misma página, con el mismo título, eventos e inscritos que antes del cambio.
    *   La inscripción va a `Inscripcions`, y la baja borra la fila correcta y la copia a `Baixes`.
    *   La petición GET no lleva `d`, igual que antes.

### CUJ 2: Un vecino del Eixample se apunta a un evento

*   **Given**: existe la pestaña `Esdeveniments eixample` con el evento `eix-paradeta-1`, y las inscripciones están abiertas.
*   **When**: abre un enlace `/eixample?e=eix-paradeta-1` que le han enviado por WhatsApp y se apunta.
*   **Then**:
    *   La vista previa de WhatsApp muestra el título del Eixample.
    *   La página muestra solo los eventos del Eixample.
    *   La inscripción se guarda en `Inscripcions` con `event_id = eix-paradeta-1`.
    *   El enlace para compartir que genera la página apunta a `/eixample?e=eix-paradeta-1` ([share.js](../../src/lib/share.js) ya conserva la ruta y no cambia).

### CUJ 3: La persona que mantiene la app añade un tercer distrito

*   **Given**: Sants y Eixample están en producción.
*   **When**: sigue los pasos de [Añadir un distrito](#añadir-un-distrito).
*   **Then**:
    *   `/<slug>` está disponible con su título, y `<exec>?action=agenda&d=<slug>` devuelve `district: '<slug>'`.
    *   No ha hecho falta publicar otra versión del Apps Script.
    *   Sants y Eixample siguen igual.

### CUJ 4: Un editor olvida el prefijo

*   **Given**: un editor del Eixample escribe el id `paradeta-1` (sin `eix-`) en `Esdeveniments eixample`. Otro distrito no usa ese id.
*   **When**: abre `/eixample?admin`.
*   **Then**:
    *   El bloque de administración avisa de que `paradeta-1` no empieza por `eix-`.
    *   El evento sigue visible y admite inscripciones, porque el aviso no bloquea nada.
    *   El editor cambia el id a `eix-paradeta-1`. Las inscripciones hechas antes del cambio se quedan en `Inscripcions` con el id antiguo y dejan de verse en el evento: el editor las copia a mano con el id nuevo.
*   **Si otro distrito ya usaba `paradeta-1`:** desde la primera inscripción, los dos eventos muestran los inscritos de ambos. Es el riesgo aceptado en Non-Goals.

### CUJ 5: El script nuevo falla y hay que volver atrás

*   **Given**: la web nueva y el script nuevo están desplegados, y aparece un error en el script.
*   **When**: se revierte primero la web y después el script.
*   **Then**:
    *   Mientras solo está revertida la web, `/eixample` da 404 y Sants funciona.
    *   Con el script revertido, Sants funciona igual que antes del cambio.
    *   Las filas `eix-` ya escritas en `Inscripcions` se quedan, no se ven y siguen contando para el tope de 3000.
    *   Si en algún momento la web nueva queda con el script antiguo, `/eixample` muestra el error de carga, o su propia copia guardada con el aviso de datos antiguos. Nunca muestra los eventos de Sants.

## Technical Plan (Architecture)

### Visión general

```text
   ┌──────────────────────────────────────────────────────────────────────────┐
   │ GitHub Pages: web estática, una sola compilación                         │
   │                                                                          │
   │ /          → build/index.html     (Sants-Montjuïc, raíz)                 │
   │ /eixample  → build/eixample.html  (Eixample)                             │
   │ /<slug>    → build/<slug>.html    (distritos siguientes)                 │
   │                                                                          │
   │ Las tres salen de src/routes/[[districte]]/+page.svelte.                 │
   │ La lista de distritos está solo en src/lib/districts.js.                 │
   └──────────────────────────────────────────────────────────────────────────┘
                  │ GET  ?action=agenda[&d=<slug>]
                  │ POST {action:"signup", eventId, name, requestId[, d]}
                  │ POST {action:"unsignup", eventId, requestId}   (sin d)
                  ▼
   ┌──────────────────────────────────────────────────────────────────────────┐
   │ Apps Script: una sola versión, la misma URL /exec                        │
   │                                                                          │
   │ d ausente       → pestaña "Esdeveniments"            (Sants, como hoy)   │
   │ d = "eixample"  → pestaña "Esdeveniments eixample"                       │
   │ d no válido     → { ok:false, error:"unknown_district" }                 │
   │ d válido y la pestaña no existe → "unknown_district"                     │
   │ Compartidas: Inscripcions, Baixes, Config (B1 y tope globales)           │
   └──────────────────────────────────────────────────────────────────────────┘
```

El script no tiene lista de distritos: deduce el nombre de la pestaña a partir de `d`. Solo la web sabe qué distritos existen.

### Slug y nombre de pestaña

Esta es la única regla de nombres. El resto del documento remite aquí.

*   Un slug cumple `/^[a-z0-9-]{1,30}$/`.
*   La pestaña de eventos de la raíz se llama `Esdeveniments`. La de cualquier otro distrito, `Esdeveniments <slug>`, con un espacio.
*   En el script, la regla vive en `eventsSheetName_(d)`. En la web, en `eventsTabName(district)`, que solo sirve para nombrar la pestaña en el aviso de cabeceras de `?admin`.

### Norma de prefijos

Es una norma de uso: el código no la impone, solo avisa.

*   **Quién lo asigna.** La persona que mantiene la app, al añadir el distrito. Se escribe en el campo `prefix` de `src/lib/districts.js`.
*   **Forma.** Letras minúsculas o números terminados en `-`: `eix-`. Cumple `/^[a-z0-9]+-$/`.
*   **Único.** Ningún prefijo es igual a otro ni el comienzo de otro (`eix-` y `eixa-` no pueden convivir). Lo comprueba `districts.test.js`.
*   **Ids del distrito.** Todos los ids de `Esdeveniments <slug>` empiezan por el prefijo. Un id solo puede tener `a-z`, `0-9` y `-`, y como máximo 20 caracteres contando el prefijo ([events.js:13](../../src/lib/events.js), `ID_RE`). Con `eix-` quedan 16.
*   **Ids de Sants.** No llevan prefijo y no deben empezar por el prefijo de otro distrito. Nada lo comprueba.
*   **Plantilla.** Los ids de ejemplo de [docs/plantilla-esdeveniments.csv](../../docs/plantilla-esdeveniments.csv) (`exemple-1`, `exemple-2`, `exemple-3`) se sustituyen antes de importar la plantilla en un distrito. El README lo dice.
*   **Aviso.** `/<slug>?admin` lista los ids que no empiezan por el prefijo del distrito.

### Añadir un distrito

Esta es la lista completa de pasos. El Overview, los Goals y el CUJ 3 remiten aquí.

1.  **Elegir slug y prefijo** según [Slug y nombre de pestaña](#slug-y-nombre-de-pestaña) y [Norma de prefijos](#norma-de-prefijos). Comprobar que ningún id de Sants empieza por el prefijo nuevo. Pedir los emails de las cuentas de Google de los editores del distrito.
2.  **Añadir la entrada** en `ROUTED_DISTRICTS` de `src/lib/districts.js` con `slug`, `name`, `deName` y `prefix`.
3.  **Crear la pestaña** `Esdeveniments <slug>` duplicando `Esdeveniments`, como se explica en [Pestaña de un distrito nuevo](#pestaña-de-un-distrito-nuevo).
4.  **Comprobar que está vacía:** solo queda la fila 1, y `<exec>?action=agenda&d=<slug>` devuelve `events: []` antes de que el distrito añada nada.
5.  **Dar acceso a los editores:** compartir la hoja con sus emails como editores, y añadirlos a la protección de su pestaña (paso 5 de [Pestaña de un distrito nuevo](#pestaña-de-un-distrito-nuevo)). Pedir a uno de ellos que compruebe que puede escribir en su pestaña y que no puede en `Esdeveniments`.
6.  **Desplegar la web** con un push a `main`.
7.  **Comprobar** `/<slug>` en el móvil, y `/<slug>?admin` sin avisos de cabeceras ni de prefijos.

### Modelo de distrito (web)

Cada distrito es un objeto inmutable que se define en `src/lib/districts.js`:

| Campo | Sants-Montjuïc | Eixample | Uso |
| --- | --- | --- | --- |
| `slug` | `sants-montjuic` | `eixample` | Ruta de la página (salvo en la raíz), valor de `d` y parte de las claves del navegador. |
| `name` | `Sants-Montjuïc` | `Eixample` | Cabecera, título y la franja de la imagen para compartir. |
| `deName` | `de Sants-Montjuïc` | `de l’Eixample` | Descripción: «…al districte {deName}.». |
| `prefix` | `null` | `eix-` | Aviso de prefijos en `?admin`. |

**Lo que exporta el fichero:**

*   `ROOT_DISTRICT`: Sants-Montjuïc. Un distrito es la raíz si y solo si `district === ROOT_DISTRICT`.
*   `ROUTED_DISTRICTS`: los distritos con ruta propia, es decir, todos menos la raíz.
*   `findDistrict(slug)`: busca en `ROUTED_DISTRICTS` y devuelve el distrito o `null`. Para `sants-montjuic` devuelve `null`, porque Sants no tiene ruta propia.
*   `storageKey(district)`: `agenda-${slug}-2026-11`. Para Sants es exactamente el `STORAGE_KEY` de hoy.
*   `mineKey(district)`: `${storageKey(district)}:mine`. Para Sants es exactamente el `MY_SIGNUPS_KEY` de hoy.
*   `eventsTabName(district)`: `Esdeveniments` o `Esdeveniments <slug>`.
*   `missingPrefix(events, district)`: los ids de `events` (eventos ya validados) que no empiezan por `district.prefix`. Devuelve `[]` para la raíz.

**Reglas que comprueba `districts.test.js`:**

*   Cada `slug` de `ROOT_DISTRICT` y `ROUTED_DISTRICTS` cumple la regla de slug y no se repite.
*   `ROOT_DISTRICT.slug` es `sants-montjuic` y su `prefix` es `null`.
*   Cada distrito de `ROUTED_DISTRICTS` tiene un `prefix` que cumple la [Norma de prefijos](#norma-de-prefijos), y ningún prefijo es el comienzo de otro.
*   `storageKey(ROOT_DISTRICT)` es igual a `STORAGE_KEY`, y `mineKey(ROOT_DISTRICT)` es igual a `MY_SIGNUPS_KEY`.

### Contrato de la API (cambios)

`API_VERSION` sigue siendo `1`. Solo se añaden campos y valores, y ningún campo existente cambia de significado. «`d` presente» significa `d !== undefined`.

| Petición | Hoy | Nuevo |
| --- | --- | --- |
| `GET ?action=agenda` | Lee `Esdeveniments` | Igual, también si falta la pestaña. La respuesta es idéntica a la de hoy y no incluye `district`. |
| `GET ?action=agenda&d=<slug>` | El script ignora `d` y lee `Esdeveniments` | Lee `Esdeveniments <slug>` y añade `district: '<slug>'` a la respuesta. |
| `POST signup` sin `d` | Busca el evento en `Esdeveniments` | Igual. Si falta la pestaña, responde `unknown_event`, como hoy. |
| `POST signup` con `d` | El script ignora `d` | Busca el evento solo en `Esdeveniments <d>`. |
| `POST unsignup` | Busca por `event_id` y `request_id` | Igual. La web no envía `d` y el script no lo lee. |

**`unknown_district`.** El script responde `{ ok: false, v: 1, error: 'unknown_district' }` solo si `d` está presente y:

*   no es de tipo `string` (por ejemplo `null`, `5` o `['eixample']` en el cuerpo del POST); o
*   no cumple la regla de slug (incluida la cadena vacía); o
*   su pestaña no existe.

**Orden de las comprobaciones.**

*   **GET:** `action` (`bad_request`, como hoy en [Code.gs:52](../../apps-script/Code.gs)) → formato de `d` → existencia de la pestaña.
*   **POST:** `action`, `eventId` y `requestId` (`bad_request`) → nombre (`invalid_name`) → formato de `d` (`unknown_district`), todo antes de bloquear el script → bloqueo (`busy`) → interruptor (`closed`) → existencia de la pestaña (`unknown_district`) → evento (`unknown_event`) → límites.

**En la web:**

*   **GET:** la web trata `unknown_district` como cualquier respuesta no válida: muestra el error de carga o su copia guardada.
*   **POST:** hoy, un código que no está en `T.signupErrors` muestra el texto de `server` («error al servidor»), que engaña. Se añade `unknown_district` a `T.signupErrors` con el mismo texto que `bad_request` («No s’ha pogut fer. Recarrega la pàgina i torna-ho a provar.»).

**Por qué `d` no da acceso a otras pestañas.** El prefijo fijo `Esdeveniments ` hace que `d` no pueda apuntar nunca a `Inscripcions` (donde están los `request_id`), a `Config` ni a `Baixes`.

**Script antiguo.** Un script antiguo ignora `d` y no devuelve `district`. Por eso la web exige `district` en las páginas de distrito.

### Comprobación del distrito en la web

`parseAgenda(json, district = ROOT_DISTRICT)` añade una regla a las que ya tiene:

*   **Página de distrito:** exige `json.district === district.slug`. Si no coincide, lanza `bad_response`.
*   **Raíz:** exige que `json.district` falte. Si llega, la respuesta es de otro distrito, y lanza `bad_response`.

`readCopy` usa la misma función, así que una copia guardada de otro distrito tampoco se acepta.

Resultado cuando una web nueva habla con un script antiguo:

*   Sants funciona.
*   Eixample muestra «No s’ha pogut carregar l’agenda», o su propia copia guardada si la tiene. Nunca muestra los eventos de Sants.

### Rutas y prerenderizado

*   **Una sola ruta.** `src/routes/+page.svelte` se mueve a `src/routes/[[districte]]/+page.svelte`. El parámetro opcional permite que la misma página sirva `/` y `/<slug>`.
*   **`src/routes/[[districte]]/+page.js`** (nuevo):
    *   `entries()` devuelve `{ districte: slug }` para cada distrito de `ROUTED_DISTRICTS`. SvelteKit sigue generando `/` porque el parámetro es opcional.
    *   `load({ params })` devuelve siempre `{ district }`:
        *   sin parámetro, `{ district: ROOT_DISTRICT }`;
        *   con parámetro, `{ district: findDistrict(params.districte) }`;
        *   si `findDistrict` devuelve `null`, `error(404)`.
*   **Salida de la compilación.** Con `prerender = true`, que ya está en [+layout.js](../../src/routes/+layout.js), se generan `build/index.html` y `build/eixample.html`. GitHub Pages sirve `/eixample` con `eixample.html`; se comprueba en el último paso del despliegue.

### Título y vista previa por página

*   **[src/app.html](../../src/app.html).** Pierde `<title>`, `description`, `og:title` y `og:description`. Conserva `charset`, `viewport`, `text-scale`, `robots`, `theme-color`, `og:type` y `og:locale`.
*   **`<svelte:head>` de la página.** Emite las cuatro etiquetas con `T.siteTitle(district)` y `T.siteDescription(district)`. Al prerenderizar quedan escritas en el HTML de cada página, que es lo que lee WhatsApp.
*   **Textos.**
    *   `T.siteTitle(district)` = `'Agenda Frontamplista ' + district.name`.
    *   `T.siteDescription(district)` = `` `Accions i actes de ${MONTH.name} de ${MONTH.year} al districte ${district.deName}.` ``, construido desde `MONTH` como `monthLabel`.
    *   Para Sants dan exactamente los textos de hoy: «Agenda Frontamplista Sants-Montjuïc» y «Accions i actes de novembre de 2026 al districte de Sants-Montjuïc.».

### Nombre del distrito en la interfaz

La página publica el distrito con `setContext('district', district)`. Los componentes lo leen con `getContext('district')`; ninguno recibe un prop nuevo.

*   **Cabecera.** [Header.svelte](../../src/lib/components/Header.svelte) muestra `district.name` en la segunda línea, donde hoy está escrito «Sants-Montjuïc».
*   **Imagen para compartir.** [PosterView.svelte](../../src/lib/components/PosterView.svelte) dibuja `T.siteTitle(district)` en la franja. [EventDetail.svelte](../../src/lib/components/EventDetail.svelte) no cambia.
*   **Aviso de cabeceras.** `T.missingColumns(names, tab = 'Esdeveniments')` nombra la pestaña real, por ejemplo «Esdeveniments eixample». La página le pasa `eventsTabName(district)`.

### Claves del navegador

*   **Copia guardada.** `createApi` usa `storageKey(district)`.
*   **«Les meves inscripcions».** Usa `mineKey(district)`, así que cada distrito guarda las suyas por separado. Las funciones de [my-signups.js](../../src/lib/my-signups.js) reciben la clave como último parámetro, con `MY_SIGNUPS_KEY` por defecto.
*   Para Sants, las dos claves son las de hoy.

### Aviso de prefijos en `?admin`

En una página de distrito, el bloque `?admin` muestra, debajo de las filas ignoradas, `T.prefixWarning(ids, district)` si `missingPrefix(events, district)` no está vacío:

*   Texto: «Aquests ids no comencen per {prefix}: {ids}. Es mostren igualment.»
*   No va en la lista de filas ignoradas porque esos eventos sí se muestran.
*   En la raíz no se muestra nada.

### Pestaña de un distrito nuevo

`setup()` no cambia: sigue preparando solo `Esdeveniments`, `Inscripcions` y `Config`. La pestaña de un distrito se crea a mano:

1.  Clic derecho en la pestaña `Esdeveniments` → **Duplicar**.
2.  Renombrar la copia («Copia de Esdeveniments») a `Esdeveniments <slug>`, según [Slug y nombre de pestaña](#slug-y-nombre-de-pestaña).
3.  Vaciarla: seleccionar desde `A2` hasta la última fila de la columna `K` y pulsar **Supr**. Se borra solo el contenido, así que se conservan el formato de texto y los desplegables. No usar *Eliminar filas*.
4.  En **Datos → Proteger hojas y rangos**, comprobar que la copia tiene la protección de la fila 1 con aviso. Si no la tiene, añadir una para `A1:K1` con *Mostrar una advertencia*.
5.  En el mismo panel, proteger la hoja `Esdeveniments <slug>` entera con **Restringir quién puede editar → Personalizado** y dejar solo los emails de los editores del distrito. Si la copia ha heredado la protección de hoja de `Esdeveniments`, editarla: tiene los editores de Sants y no los del distrito nuevo.

Qué trae la copia: la cabecera de 11 columnas (J1 y K1 incluidas), la fila 1 fija, el formato de texto en A:I y los desplegables de fechas, horas, tipo y estado, que siguen apuntando a `Config`.

Hay dos riesgos. El primero está en el paso 3: si quedan filas de Sants, sus ids aparecen en el distrito nuevo y las inscripciones se mezclan. Lo detectan el paso 4 de [Añadir un distrito](#añadir-un-distrito) (`events: []`) y el aviso de prefijos de `?admin`. El segundo, en el paso 5: una lista de emails equivocada deja a un distrito sin poder editar, o deja a otro editando su pestaña. Lo detecta la prueba con un editor del paso 5 de [Añadir un distrito](#añadir-un-distrito).

### Despliegue y vuelta atrás

**Orden de despliegue: script, datos, web.** La pestaña tiene que existir antes de publicar la web, para que `/eixample` no muestre un error al salir. Este orden sustituye, para este cambio, al de [README.md](../../README.md) («script, web, datos», sección *Cómo publicar una entrega*). El README se actualiza.

1.  **Backup del script.** Pasos 1 y 2 de *Backup y restauración del script* del README: anotar la versión N en uso y dejar `apps-script/` igual que lo desplegado, con su etiqueta `script-vK`.
2.  **Copia de `Inscripcions`.** *Archivo → Descargar → CSV* con esa pestaña activa, fuera de Drive (README, R4 paso 2). Anotar el número de filas (ver [Rendimiento y cuotas](#rendimiento-y-cuotas)).
3.  **Ensayo en una copia del libro** (README, R4 paso 3):
    *   pegar el `Code.gs` nuevo y crear una «Nueva implementación» solo en la copia;
    *   crear `Esdeveniments eixample` como en [Pestaña de un distrito nuevo](#pestaña-de-un-distrito-nuevo), aplicar las protecciones de [Seguridad y permisos](#seguridad-y-permisos) y añadir `eix-prova-1`;
    *   repetir allí los `curl` de los pasos 5 y 8, y una inscripción y su baja con `d`.

    Si algo falla, no se sigue: el libro real no se ha tocado.
4.  **Publicar el script en el libro real.** Pasos 3 a 5 de *Backup y restauración del script*: «Gestionar implementaciones» → editar → «Versión nueva». Nunca «Nueva implementación», que cambia la URL `/exec` y deja sin agenda a todos los distritos.
5.  **Comprobar Sants.** `curl -sL '<exec>?action=agenda'` devuelve los mismos eventos que antes y no incluye `district`.
6.  **Crear la pestaña.** `Esdeveniments eixample` como en [Pestaña de un distrito nuevo](#pestaña-de-un-distrito-nuevo), y añadir la fila `eix-prova-1`.
7.  **Proteger las pestañas.** Las compartidas y `Esdeveniments` (editores de Sants), como en [Seguridad y permisos](#seguridad-y-permisos); `Esdeveniments eixample` ya se protegió en el paso 6. Pedir a un editor de Sants y a uno de Eixample que comprueben que solo pueden escribir en su pestaña.
8.  **Comprobar Eixample.** `curl -sL '<exec>?action=agenda&d=eixample'` devuelve `district: 'eixample'` y la fila de prueba.
9.  **Desplegar la web.** Push a `main`. Después, las comprobaciones manuales del [Plan de verificación](#plan-de-verificación).

**Vuelta atrás.** Siempre en orden inverso: primero la web y después el script.

*   **Web.** `git revert` del cambio y push.
    *   Si fallan los tests e2e, `workflow_dispatch` con `skip_e2e` publica sin ellos. `npm run check` y `npm test` siguen bloqueando el despliegue ([deploy.yml](../../.github/workflows/deploy.yml), líneas 9 y 33–34).
    *   `/eixample` vuelve al 404, y Sants funciona con cualquiera de los dos scripts.
*   **Script.** Volver a la versión N con *Backup y restauración del script* del README.
    *   Si se hace con la web nueva todavía publicada, Eixample muestra el error de carga, porque la respuesta llega sin `district`.
*   **Datos.** La pestaña `Esdeveniments eixample` y las filas `eix-` de `Inscripcions` se pueden quedar.
    *   El script antiguo no lee la pestaña, y las filas no se muestran en Sants.
    *   Las filas siguen contando para el tope de 3000. Si eso importa, se borran a mano.
    *   Con el script antiguo, las inscripciones que se intenten desde una página de Eixample en caché fallan con `unknown_event`.

### Seguridad y permisos

*   **Entrada nueva.** `d` llega del cliente. Se valida su tipo y su formato antes de usarlo, y solo puede elegir pestañas cuyo nombre empiece por `Esdeveniments `.
*   **Lo que se expone de más.** Hoy solo `Esdeveniments` es pública. Con este cambio, cualquier pestaña llamada `Esdeveniments <x>`, con `x` que cumpla la regla de slug, se puede leer con `?action=agenda&d=x` y acepta inscripciones con `d: 'x'`. Se acepta: el README avisa de que no se usen esos nombres para pestañas privadas.
*   **Escrituras.** `doGet` y `doPost` no escriben en pestañas de eventos. `setup()` no cambia.
*   **Permisos.** Todo con **Datos → Proteger hojas y rangos → Hoja → Restringir quién puede editar**, sin cambiar código:
    *   `Esdeveniments`: *Personalizado*, con los editores de Sants.
    *   `Esdeveniments <slug>`: *Personalizado*, con los editores de ese distrito.
    *   `Config`, `Inscripcions`, `Baixes` y cualquier otra pestaña: *Solo tú*.
    *   El dueño siempre puede editar todas. Según la ayuda de Google, quien puede editar una pestaña protegida puede cambiar quién la edita, pero no quitar al dueño: un editor de Eixample puede añadir a otra persona a su pestaña, pero no tocar la de Sants.
    *   Una protección no impide crear pestañas nuevas. Una pestaña nueva no se ve en la web salvo que se llame `Esdeveniments <x>`.
    *   Si `Baixes` aún no existe, se crea vacía con ese nombre. El script le escribe la cabecera en la primera baja ([Code.gs](../../apps-script/Code.gs), `ensureSheet_`).
    *   El script sigue escribiendo en ellas porque la aplicación web se ejecuta como el dueño (*Ejecutar como: Yo*, [README.md:46](../../README.md)). Por eso **solo el dueño publica versiones del script**.
    *   Estas protecciones conviven con las de aviso que crea `setup()`: `lockRange_` solo borra las que tienen su misma descripción.
    *   Lo que no evita: cualquier editor puede leer todas las pestañas, incluidos los `request_id` de `Inscripcions`, y editar el script asociado a la hoja. Si alguien edita el script, el código se ejecuta como el dueño en la siguiente versión publicada; antes de publicar, el dueño compara el script con `apps-script/Code.gs` del repositorio. Se acepta.

### Rendimiento y cuotas

*   **Peticiones.** Cada visita sigue haciendo un GET, que lee una pestaña de eventos e `Inscripcions` entera, igual que hoy. El total crece con los vecinos y con las filas de `Inscripcions`, no con el número de distritos.
*   **Latencia.** Medida el 12 de noviembre: entre 2,6 y 3,6 s por GET ([README.md](../../README.md), *Decisiones y límites*). El README fija 3 s como el umbral para añadir caché y ya se alcanza a veces. Este cambio no añade lecturas por petición, pero sí filas. Se vuelve a medir en el paso 5 del despliegue y una semana después; si pasa de 3 s de forma sostenida, se reabre la caché (en [TODO.md](../../TODO.md)).
*   **Tope de 3000.** Es compartido. Estimación, sin medir: unas 100 personas por distrito ([README.md](../../README.md), sección *Inscripciones*), con unas 10 inscripciones cada una, dan unas 1000 filas por distrito; con tres distritos se llega al tope. En el paso 2 del despliegue se anota el número de filas. Si ya pasa de 1500, el autor decide antes de publicar si sube `MAX_SIGNUPS_TOTAL` ([Code.gs:41](../../apps-script/Code.gs)) en la misma versión del script.
*   **Bloqueo.** Hay uno solo para todos los distritos. Hoy, dos inscripciones simultáneas a cualquier evento ya esperan la una a la otra; con varios distritos pasa lo mismo. La espera crece con las inscripciones por minuto, no con el número de distritos. Si pasa de `LOCK_WAIT_MS` (10 s), la web recibe `busy`.

## Risks & Mitigations

| Riesgo | Probabilidad / impacto | Mitigación |
| --- | --- | --- |
| Dos distritos usan el mismo id y sus inscritos se mezclan. | Media (ids a mano, plantilla con ids sin prefijo) / medio: nombres visibles en el evento equivocado. | [Norma de prefijos](#norma-de-prefijos), aviso en `?admin` y README. Riesgo aceptado. |
| Un editor cierra todos los distritos con `Config!B1`, borra inscripciones o modifica eventos de otro distrito. | Muy baja / alto. | Cada pestaña de eventos protegida para sus editores; las compartidas, solo el dueño. |
| Una lista de emails equivocada deja a un distrito sin poder editar en plena campaña. | Media / medio. | Proteger primero en el ensayo y pedir a un editor de cada distrito que lo pruebe. El dueño lo corrige en el momento. |
| Un editor lee los `request_id` o edita el script. | Baja / alto. | README con el aviso; el dueño compara el script con el repositorio antes de publicar; historial de versiones y copia CSV de `Inscripcions`. Riesgo aceptado. |
| Al crear la pestaña de un distrito, quedan filas de Sants en la copia y sus inscripciones se mezclan. | Media / medio. | Pasos de [Pestaña de un distrito nuevo](#pestaña-de-un-distrito-nuevo), `events: []` antes de publicar y aviso de prefijos en `?admin`. |
| Una pestaña `Esdeveniments <x>` que no es de un distrito queda pública y acepta inscripciones. | Baja / bajo. | README: ese nombre se reserva para distritos. Riesgo aceptado. |
| `/eixample/` con barra final da 404. | Media / bajo. | Enlaces sin barra. `404.html` en [TODO.md](../../TODO.md). Riesgo aceptado. |
| El tope de 3000, compartido, se agota antes de fin de mes. | Media / alto: nadie se puede apuntar en ningún distrito. | Contar filas en el paso 2 del despliegue y decidir si se sube `MAX_SIGNUPS_TOTAL`. |
| La latencia del GET crece con las filas de `Inscripcions`. | Media / medio. | Medir en el despliegue y una semana después. Caché en [TODO.md](../../TODO.md). |
| El script nuevo rompe Sants en plena campaña. | Baja / alto. | Ensayo en una copia del libro, backup `script-vK`, `curl` de Sants antes de seguir y vuelta atrás documentada. |
| Tras volver atrás, las filas `eix-` siguen contando para el tope. | Baja / bajo. | Borrarlas a mano si hace falta. |
| El bloqueo único hace que una inscripción reciba `busy`. | Baja / bajo: el vecino lo vuelve a intentar. | Ninguna. Riesgo aceptado. |

## Alternatives Considered

Etiquetas: **Descartada** significa que no se hace, por el motivo que se indica. **Aplazada** significa que no se hace en esta campaña y queda en [TODO.md](../../TODO.md).

### Dónde viven los datos

*   **Una hoja de cálculo y un script por distrito.** Descartada: el interruptor y el tope no podrían ser globales, y habría varias copias del script que mantener.
*   **Cuatro pestañas por distrito** (eventos, inscripciones, bajas, config). Descartada: el interruptor y el tope globales obligarían a leer y sumar las pestañas de todos los distritos en cada inscripción.
*   **Una sola pestaña de eventos con columna `districte`.** Descartada: todos los editores compartirían la misma tabla, y un filtro u ordenación de uno afecta a los demás.
*   **Columna `districte` en `Inscripcions` y `Baixes`.** Descartada: cambia el esquema de dos pestañas compartidas en plena campaña (cabeceras, `setup()`, recuentos y bajas). La norma de prefijos evita la mezcla sin cambiar el esquema, con el riesgo aceptado en Non-Goals.
*   **Guardar `event_id` como `<d>:<id>` en `Inscripcions`.** Descartada: el id de `Inscripcions` dejaría de coincidir con el de la pestaña de eventos, y habría que cambiar inscripciones, bajas, recuentos y lectura en plena campaña para evitar un riesgo que la norma de prefijos ya cubre.

### Ids de los eventos

*   **Ids generados por `setup()` y columna bloqueada.** Descartada:
    *   el script trataría como eventos las filas que solo tienen id;
    *   los editores no podrían ordenar ni borrar filas;
    *   los prefijos de los ids generados podrían chocar.
*   **Rechazar en el código los ids sin prefijo.** Descartada: un error de un editor ocultaría un evento ya publicado y con inscritos. El aviso en `?admin` informa sin ese efecto.
*   **Exigir que cada id sea único en toda la hoja.** Descartada: cada lectura recorrería todas las pestañas, y un descuido en un distrito ocultaría eventos de otro.
*   **Id público `<prefijo>-<id>`, calculado al leer.** Descartada: el id del enlace no coincidiría con el de la hoja, y los editores no podrían buscarlo.
*   **Aviso de prefijos dentro de la lista de filas ignoradas.** Descartada: esa lista significa «no se muestra», y estos eventos sí se muestran.

### Web y URLs

*   **Un fork o un despliegue de Pages por distrito.** Descartada: habría varios repositorios y pipelines, que con el tiempo acabarían siendo distintos.
*   **Mover Sants a `/sants-montjuic`.** Descartada: rompe los enlaces ya compartidos, y GitHub Pages no redirige.
*   **Dos rutas: la raíz y `[districte]`.** Descartada:
    *   duplica la página;
    *   si `entries()` queda vacío, la compilación falla (`@sveltejs/kit` ^3.0.0 en [package.json](../../package.json), `handleUnseenRoutes: 'fail'` por defecto);
    *   `[[districte]]` sirve las dos URLs desde un único fichero.

### Contrato con el script

*   **La API devuelve todos los distritos de una vez.** Descartada: las respuestas y las copias guardadas serían mucho más grandes, y cada distrito descargaría los eventos de todos.
*   **Subir `API_VERSION` a 2.** Descartada: `parseAgenda` rechaza cualquier versión distinta de 1 ([api.js:23](../../src/lib/api.js)), también en la copia guardada ([api.js:95](../../src/lib/api.js)). Las páginas de Sants que estén en caché dejarían de funcionar.
*   **Aceptar la respuesta en la página de distrito sin comprobar `district`.** Descartada: con un script antiguo, `/eixample` mostraría los eventos de Sants.
*   **`signup_` elige la pestaña por el prefijo del id.** Descartada: un prefijo olvidado deja un evento visible en el que nadie se puede apuntar.
*   **`signup_` recorre todas las pestañas.** Descartada: añade una lectura por pestaña con el script bloqueado, y acepta inscripciones a eventos de otro distrito.
*   **Lista de distritos en `Code.gs` y un test que la compare con la de la web.** Descartada: cada distrito nuevo obligaría a publicar otra versión del script, que es el paso más arriesgado del despliegue.
*   **Guardar la agenda en CacheService durante la campaña.** Aplazada: como `Inscripcions` es compartida, cada inscripción tendría que borrar la caché de todos los distritos.

### Pestañas y `setup()`

*   **Que `setup()` prepare cualquier pestaña `Esdeveniments <slug>`** (cabecera de 11 columnas si está vacía, formato, desplegables y protección). Descartada: añade código y tests al script en plena campaña, cuando duplicar la pestaña ya da el mismo resultado. Su ventaja, que la pestaña nace vacía, se cubre con la comprobación `events: []`.
*   **Ampliar a A:K el formato y la protección en todas las pestañas.** Aplazada: cambiaría la pestaña de Sants en plena campaña y se solaparía con la protección de `J1:K1` que el autor ya puso a mano (README, R2).
*   **Que `setup()` prepare solo las pestañas de distritos conocidos.** Descartada: el script necesitaría la lista de distritos y una versión nueva por cada distrito.

## Detailed Implementation Plan

Se hace en un único PR con un commit por fase. Después de cada commit, `npm run check` y `npm test` pasan.

### Fase 1: Script (`apps-script/`)

| Fichero | Acción | Qué cambia | Por qué |
| --- | --- | --- | --- |
| [Code.gs](../../apps-script/Code.gs) | Modificar | Constante nueva `DISTRICT_RE = /^[a-z0-9-]{1,30}$/`. | Una sola definición de la [regla de nombres](#slug-y-nombre-de-pestaña). |
| | | Función nueva `eventsSheetName_(d)`: devuelve `SHEET_EVENTS` si `d === undefined`; `SHEET_EVENTS + ' ' + d` si `typeof d === 'string' && DISTRICT_RE.test(d)`; `null` en cualquier otro caso. | Un único punto convierte `d` en pestaña, sin conversión implícita de tipos. |
| | | `doGet`: después de la comprobación de `action` (línea 52), lee `d = e.parameter.d` y llama a `eventsSheetName_(d)`. Si da `null`, o si `d` está presente y la pestaña no existe, responde `fail_('unknown_district')`. Si no, llama a `readAgenda_(sheetName, d)`. | Sin `d`, el comportamiento es el de hoy, también si falta `Esdeveniments` (test de `Code.test.js:94-95`). |
| | | `readAgenda_(sheetName, d)`: lee la pestaña recibida en lugar de `SHEET_EVENTS` y añade `district: d` a la respuesta solo si `d !== undefined`. | Sants recibe exactamente la misma respuesta de hoy. |
| | | `doPost`: después de las comprobaciones actuales y antes de `lock.tryLock`, si `action === 'signup'` y `body.d !== undefined`, responde `fail_('unknown_district')` si `eventsSheetName_(body.d)` da `null`. `unsignup` ignora `d`. | Rechaza la entrada mala sin ocupar el bloqueo. |
| | | `signup_`: después de `isOpen_` (línea 94), calcula `sheetName = eventsSheetName_(body.d)`. Si `body.d !== undefined` y la pestaña no existe, responde `fail_('unknown_district')`. Lee los ids de esa pestaña. | Solo acepta eventos del propio distrito. Sin `d`, igual que hoy. |
| | | `setup()` no cambia. | |
| [fake-google.js](../../apps-script/fake-google.js) | Modificar | `createScript` acepta `extraSheets: Record<string, any[][]>` y crea esas pestañas con esos nombres. | Los tests de `d` necesitan varias pestañas de eventos. |
| [Code.test.js](../../apps-script/Code.test.js) | Modificar | Solo se añaden tests: ver [Plan de verificación](#plan-de-verificación). | |
| [apps-script/README.md](../../apps-script/README.md) | Modificar | El parámetro `d`, el campo `district`, el error `unknown_district` y el orden de comprobaciones; la [regla de nombres](#slug-y-nombre-de-pestaña); que se publica una «Versión nueva», nunca una «Nueva implementación»; y, en la sección de tests, `createScript({ …, extraSheets })`. | |

### Fase 2: Web (`src/`)

El núcleo y la página van en el mismo commit, para que `npm run check` pase.

| Fichero | Acción | Qué cambia | Por qué |
| --- | --- | --- | --- |
| `src/lib/districts.js` | Crear | Typedef `District` y lo descrito en [Modelo de distrito](#modelo-de-distrito-web). | La lista de distritos está en un único fichero que solo contiene distritos. |
| `src/lib/districts.test.js` | Crear | Las reglas de [Modelo de distrito](#modelo-de-distrito-web), y `missingPrefix` en un distrito, en la raíz y con una lista vacía. El glob de `npm test` (`src/lib/**/*.test.js`) ya lo incluye. | Detecta en CI un distrito mal escrito, o que Sants pierda sus claves. |
| [config.js](../../src/lib/config.js) | No cambia | `STORAGE_KEY` y `MY_SIGNUPS_KEY` se quedan con el mismo valor. | Son las claves de la raíz, y los tests actuales las importan. |
| [api.js](../../src/lib/api.js) | Modificar | `parseAgenda(json, district = ROOT_DISTRICT)` con la regla de [Comprobación del distrito](#comprobación-del-distrito-en-la-web). | |
| | | `createApi({ url, district = ROOT_DISTRICT, … })`: si `district !== ROOT_DISTRICT`, el GET añade `&d=${encodeURIComponent(district.slug)}` y el cuerpo del POST de signup añade `d: district.slug`. Unsignup no cambia. `fetchAgenda` y `readCopy` usan `storageKey(district)` y llaman a `parseAgenda(json, district)`. `addMine` y `removeMine` reciben `mineKey(district)`. | La petición de Sants es idéntica a la de hoy, byte a byte. |
| [my-signups.js](../../src/lib/my-signups.js) | Modificar | `readMine(storage, key = MY_SIGNUPS_KEY)` lee `key`. `write(storage, items, key)` escribe en `key`. `addMine`, `removeMine` y `mineForEvent` reciben `key = MY_SIGNUPS_KEY` como último parámetro y lo pasan tanto a `readMine` como a `write`. | «Les meves inscripcions» por distrito; los tests actuales no cambian. |
| [mock-api.js](../../src/lib/mock-api.js) | Modificar | `createMockApi({ delay, storage, district = ROOT_DISTRICT })` usa `mineKey(district)` en `addMine` y `removeMine`. Los eventos de ejemplo son los mismos en todos los distritos. | Con «Les meves inscripcions» por distrito, sin este cambio `npm run dev` no mostraría las inscripciones propias en `/eixample`. |
| [texts.js](../../src/lib/texts.js) | Modificar | `siteTitle(district)` y `siteDescription(district)` como en [Título y vista previa](#título-y-vista-previa-por-página); `missingColumns(names, tab = 'Esdeveniments')`; `prefixWarning(ids, district)` con el texto de [Aviso de prefijos](#aviso-de-prefijos-en-admin); `signupErrors.unknown_district` con el texto de `bad_request`. | Todos los textos con nombre de distrito salen del objeto distrito. |
| [Header.svelte](../../src/lib/components/Header.svelte) | Modificar | `const district = getContext('district')` y `{district.name}` en lugar de «Sants-Montjuïc». | |
| [PosterView.svelte](../../src/lib/components/PosterView.svelte) | Modificar | `const district = getContext('district')` y `T.siteTitle(district)` en la franja. | |
| [share.js](../../src/lib/share.js), [EventDetail.svelte](../../src/lib/components/EventDetail.svelte), [events.js](../../src/lib/events.js) | No cambian | `detailUrl(location, id)` ya conserva la ruta `/eixample`. | |
| [api.test.js](../../src/lib/api.test.js), [my-signups.test.js](../../src/lib/my-signups.test.js) | Modificar | Solo se añaden tests: ver [Plan de verificación](#plan-de-verificación). | |
| `src/routes/+page.svelte` → `src/routes/[[districte]]/+page.svelte` | Mover con `git mv` | Añade `let { data: page } = $props(); const district = page.district;` (la variable local `data` sigue siendo el estado de la agenda, [+page.svelte:37](../../src/routes/+page.svelte)); `setContext('district', district)`; `createApi({ url: API_URL, district })` y `createMockApi({ district })`; `readMine(browserStorage(), mineKey(district))`; `<svelte:head>` con las cuatro etiquetas; en `?admin`, `T.missingColumns(data.missingColumns, eventsTabName(district))` y el aviso de prefijos. | El historial del fichero se conserva. |
| `src/routes/[[districte]]/+page.js` | Crear | `entries()` y `load()` como en [Rutas y prerenderizado](#rutas-y-prerenderizado). | |
| [app.html](../../src/app.html) | Modificar | Quita las cuatro etiquetas que pasan a `<svelte:head>`. | Evita un título duplicado. |
| [src/lib/README.md](../../src/lib/README.md), [src/lib/components/README.md](../../src/lib/components/README.md), [src/routes/README.md](../../src/routes/README.md) | Modificar | `districts.js`, las firmas nuevas de `createApi`, `createMockApi` y `my-signups.js`, las claves por distrito, la ruta `[[districte]]` y el contexto `district`. En components: Header y PosterView leen `getContext('district')`, y el título de Header sale de `district.name`. | |

### Fase 3: Tests e2e (`e2e/`)

| Fichero | Acción | Qué cambia |
| --- | --- | --- |
| [script.js](../../e2e/script.js) | Modificar | `installScript` crea también `Esdeveniments eixample` con `extraSheets`, con dos eventos: `eix-paradeta` el 12 y `eix-xerrada` el 20. Opción nueva `noDistrict: boolean`: si es `true`, borra `district` de la respuesta del GET (simula un script antiguo). |
| [helpers.js](../../e2e/helpers.js) | Modificar | `openAgenda(page, { path = './', waitForCards = true, … })`: abre `path`, con `?${query}` si hay `query`; con `offline`, la primera visita también va a `path`. Con `waitForCards: false` no espera a la primera tarjeta (las dos esperas). `MINE_KEY` no cambia. |
| `e2e/district.spec.js` | Crear | Ver [Plan de verificación](#plan-de-verificación). |
| [e2e/README.md](../../e2e/README.md) | Modificar | La pestaña sembrada de Eixample, la opción `noDistrict` y los parámetros `path` y `waitForCards`. |

Los tests e2e que ya existen no cambian y siguen comprobando Sants en `/`.

### Fase 4: Documentación

| Fichero | Acción | Qué cambia |
| --- | --- | --- |
| [README.md](../../README.md) | Modificar | Sección nueva «Distritos»: la lista, las URLs (sin barra final), la [Norma de prefijos](#norma-de-prefijos), que los ids de la plantilla se sustituyen antes de importarla, que `Esdeveniments <x>` se reserva para distritos y el riesgo de mezclar inscripciones. |
| | | Sección «Añadir un distrito», con los pasos de [Añadir un distrito](#añadir-un-distrito) y [Pestaña de un distrito nuevo](#pestaña-de-un-distrito-nuevo). |
| | | *Cómo publicar una entrega*: el orden de [Despliegue y vuelta atrás](#despliegue-y-vuelta-atrás) para este cambio. |
| | | Línea 165: la protección de las cabeceras sigue siendo un aviso, pero ya no hay un solo editor: cada pestaña de eventos solo la editan sus editores. Un error se deshace con el historial de versiones. |
| | | Línea 175: `Config!B1 = NO` cierra las inscripciones de todos los distritos a la vez. |
| | | Línea 179: los `request_id` están en la hoja y los ven todos sus editores, no solo el dueño; y cerrar con `Config!B1` afecta a todos los distritos. |
| | | Permisos: cómo proteger cada pestaña de eventos para sus editores y las demás solo para el dueño; cómo dar acceso a un editor nuevo; que solo el dueño publica versiones del script y antes lo compara con el repositorio; y que cualquier editor puede leer todas las pestañas y editar el script. |
| [docs/plantilla-esdeveniments.csv](../../docs/plantilla-esdeveniments.csv) | No cambia | Si se importa en la pestaña de un distrito, sus ids de ejemplo se sustituyen antes (lo dice el README). |
| [TODO.md](../../TODO.md) | Modificar | Lo aplazado: formato y protección A:K en todas las pestañas de eventos, CacheService, código de error propio para el tope de 3000, eventos cancelados en `signup_` y `404.html` para la barra final. |

### Plan de verificación

**Tests unitarios** (`npm test`). Ningún test actual cambia.

*   **`Code.test.js`:**
    *   GET sin `d`: `assert.deepEqual` contra el objeto completo esperado (`ok`, `v`, `signupsOpen`, `missingColumns`, `events`, `signups`, `features`), escrito a mano en el test, y `assert.ok(!('district' in respuesta))`.
    *   GET con `d=eixample` lee solo `Esdeveniments eixample` y devuelve `district: 'eixample'`.
    *   GET con `d` igual a `''`, `'Inscripcions'`, `'../x'`, `'EIXAMPLE'`, 31 caracteres o `'notes'` (pestaña que no existe) devuelve `unknown_district`.
    *   GET con `action` incorrecta y `d` no válido devuelve `bad_request`.
    *   Signup con `d=eixample` acepta `eix-…` y rechaza un id de Sants con `unknown_event`.
    *   Signup sin `d` rechaza `eix-…` con `unknown_event`.
    *   Signup sin `d` y sin pestaña `Esdeveniments` devuelve `unknown_event`, como hoy.
    *   Signup con `d` igual a `null`, `5`, `['eixample']` o `''` devuelve `unknown_district` sin bloquear: `lockAttempts` sigue en 0.
    *   Signup con `d='notes'` (pestaña que no existe) devuelve `unknown_district`.
    *   Signup con `d=eixample` y `Config!B1 = NO` devuelve `closed`.
    *   El tope de 3000 cuenta las inscripciones de todos los distritos.
    *   Unsignup funciona igual con o sin `d`.
    *   `setup()` no cambia: lo cubren los tests actuales.
*   **`districts.test.js`:** las reglas de la lista y `missingPrefix`.
*   **`api.test.js`:**
    *   Eixample añade `&d=eixample` al GET, y la URL de Sants no cambia (la aserción actual de `api.test.js:59` lo cubre);
    *   el POST de signup de Eixample lleva `d: 'eixample'` y el de Sants no lleva `d`;
    *   Sants rechaza una respuesta con `district`;
    *   Eixample rechaza una respuesta sin `district` o con otro valor;
    *   la copia guardada de Eixample usa `agenda-eixample-2026-11`, y la de Sants sigue en `agenda-sants-montjuic-2026-11`;
    *   una copia guardada de Sants no se acepta en Eixample.
*   **`my-signups.test.js`:**
    *   con una entrada ya guardada en `MY_SIGNUPS_KEY`, `addMine(storage, item, 'k')` deja en `readMine(storage, 'k')` solo el elemento nuevo, y `MY_SIGNUPS_KEY` no cambia;
    *   `removeMine(…, 'k')` y `mineForEvent(…, 'k')` solo leen y escriben `'k'`.

**Tests e2e** (`npm run test:e2e -- --project=chromium --project=mobile`). `district.spec.js` comprueba:

*   `/eixample` muestra «Eixample» en la cabecera y solo los eventos `eix-…`.
*   `/eixample` permite apuntarse, el nombre aparece en el evento, y la inscripción se guarda en `agenda-eixample-2026-11:mine`.
*   `/` sigue mostrando solo los eventos de Sants. Después de apuntarse en `/eixample`, `readMine(page)` (clave `MINE_KEY` de Sants) no contiene `eix-paradeta`, y `/?admin` muestra `local signups: 0`.
*   El enlace de compartir de Eixample contiene `/eixample?e=`.
*   `/eixample?admin`, con `prepare` añadiendo la fila `paradeta-sin` a `Esdeveniments eixample`, muestra el aviso de prefijos con ese id.
*   Con `openAgenda(page, { path: './eixample', waitForCards: false, options: { noDistrict: true } })`, la página muestra «No s’ha pogut carregar l’agenda.» y `article.event` tiene 0 elementos.
*   **Compilación** (lee los ficheros de `build/`, que `e2e/serve.js` genera antes de los tests, con `BASE_PATH=/agenda-front-ampli`):
    *   existen `build/index.html` y `build/eixample.html`, y no existe `build/sants-montjuic.html`;
    *   cada uno contiene un único `<title>`, una única `name="description"`, un único `property="og:title"` y un único `property="og:description"`;
    *   el `<title>` de `index.html` es exactamente «Agenda Frontamplista Sants-Montjuïc» y el de `eixample.html`, «Agenda Frontamplista Eixample».

**Tipos:** `npm run check` sin errores.

**Manual, contra el script real, antes de desplegar la web** (pasos 5 y 8 del despliegue):

*   `curl -sL '<exec>?action=agenda'` devuelve los mismos eventos que antes del cambio y no incluye `district`.
*   `curl -sL '<exec>?action=agenda&d=eixample'` devuelve `district: 'eixample'` y la fila `eix-prova-1`.
*   `curl -sL '<exec>?action=agenda&d=inscripcions'` devuelve `unknown_district`.

**Manual, después de desplegar la web:**

*   Abrir `/agenda-front-ampli/` y `/agenda-front-ampli/eixample` en el móvil. La segunda confirma que GitHub Pages sirve `eixample.html`.
*   Apuntarse a `eix-prova-1` y darse de baja.
*   Compartir `/agenda-front-ampli/eixample` por WhatsApp y comprobar el título de la vista previa.
*   Borrar la fila `eix-prova-1`.

--------------------------------------------------------------------------------

*Drafted with EGM*
