# Medició amb Google Analytics 4 i consentiment de galetes

*   **Author:** Juan Peist
*   **Status:** Approved
*   **Date:** 2026-11-15

--------------------------------------------------------------------------------

## Overview

La agenda tiene tres distritos: Sants-Montjuïc en `/`, Eixample en `/eixample` y Sant Martí en `/sant-marti`. Hoy no mide ninguna interacción. Este diseño añade Google Analytics 4 (propiedad `G-XX3RJ48NN2`) con estas reglas:

*   Se carga `gtag.js` directamente, sin Google Tag Manager.
*   No se carga nada hasta que la persona pulsa **Acceptar** en una franja inferior en catalán. Antes de eso no se descarga el script, no se crean cookies y no se envía nada a Google.
*   Cada evento enviado lleva el parámetro `districte` con el slug del distrito.
*   Un pie de página nuevo permite cambiar la decisión. Una página `/galetes` explica qué se recoge y quién es el responsable.

### Contexto

*   La web es estática (SvelteKit con `adapter-static`) y se publica en GitHub Pages en `https://jimi75.github.io/agenda-front-ampli/`.
*   Cada distrito es un HTML prerenderizado distinto. Cambiar de distrito recarga la página, porque la app no navega entre distritos.
*   Abrir el detalle de un evento no cambia la URL. El enlace `?e=<id>` abre el detalle al cargar.
*   El detalle (`EventDetail`) y el formulario de inscripción (`SignupDialog`) son diálogos abiertos con `showModal()`. Mientras están abiertos, el resto de la página no responde.
*   El dominio `jimi75.github.io` lo comparten todos los proyectos de Pages de esa cuenta: comparten cookies y `localStorage`.
*   **Inscripción.** **Participar** abre el diálogo `SignupDialog`. La página guarda la actividad en `signupId`/`signupEvent` y, al enviar el nombre, llama a `signup()`, que habla con el Apps Script. Si la respuesta tiene éxito, el diálogo pasa a `signupDone` y muestra el resultado. En una actividad con URL externa, el mismo envío guarda la inscripción en la hoja, cierra el diálogo y abre la web externa en otra pestaña.
*   **Compartir.** El botón **Comparteix** del detalle genera una imagen de la actividad y la entrega al panel del sistema con `shareImage` (Web Share API) junto a un texto con el enlace `?e=`. Si el navegador no puede, descarga la imagen y ofrece el enlace «Obre WhatsApp amb el text» (`wa.me`). **Imatge pròpia** hace lo mismo con una imagen que elige la persona.

### Términos

| Término | Significado |
| --- | --- |
| Actividad | Un evento de la agenda (acción o acto). Se usa esta palabra para no confundirlo con un evento de GA4. |
| Consent Mode básico | `gtag.js` no se carga hasta que la persona acepta. En el modo avanzado se envían pings sin cookies aunque la persona rechace. |
| Dimensión personalizada de evento | Un parámetro propio, como `districte`, registrado en GA4 para poder usarlo en informes. Sin registrar, solo se ve en DebugView. |
| Evento clave | Un evento que GA4 cuenta como conversión. |
| Medición mejorada | Eventos que GA4 recoge por su cuenta: clics salientes, descargas, interacciones con formularios… |
| DebugView | Vista de GA4 que muestra en tiempo real los eventos de un navegador en modo depuración. |
| `T` | El objeto de `src/lib/texts.js` con todos los textos en catalán de la interfaz. `T.signupErrors` contiene un texto por cada código de error de inscripción. |
| Enlace de la inscripción externa | En una actividad externa, después de inscribirse, el diálogo muestra «Ves a la inscripció externa ↗» para quien vuelve a la agenda sin haber completado la web externa. |
| 13 meses y 14 meses | 13 meses es lo que dura la decisión guardada y la cookie `_ga` en el navegador. 14 meses es lo que GA4 conserva los datos de los eventos en sus servidores. Son plazos independientes. |

## The Problem

El equipo de los tres distritos no sabe:

*   cuántas personas abren la agenda;
*   qué actividades miran;
*   cuántas empiezan una inscripción y no la terminan, ni por qué;
*   si **Comparteix** funciona en móviles reales. Las comprobaciones S1 y S2 del README siguen pendientes;
*   si compartir trae visitas;
*   si la gente usa el mapa para llegar a las actividades;
*   cuántas personas se desapuntan, y si quien se apunta a una actividad externa vuelve a la agenda para ir a la web externa.

La hoja de Google guarda las inscripciones terminadas, pero no los intentos, los errores ni lo que pasa antes. Sin estos datos no se puede decidir qué actividades promocionar ni qué parte de la app arreglar.

Medir sin consentimiento no es una opción. GA4 usa cookies de analítica, y en España la guía de la AEPD de 2023 exige consentimiento previo, con aceptar y rechazar igual de visibles. Además, apuntarse a un acto de Barcelona en Comú puede revelar una opinión política, que el artículo 9 del RGPD trata como categoría especial. Por eso el diseño:

*   no envía nombres ni texto libre;
*   no carga nada antes de **Acceptar**;
*   permite retirar el consentimiento de forma real: se borran las cookies y se deja de enviar.

**Coste aceptado.** Solo se mide a quien acepta. Con **Rebutjar** igual de visible, una parte de las visitas no aparecerá en GA4, y como quien rechaza no se cuenta, esa parte no se puede conocer. Los porcentajes del embudo solo describen a quien acepta, y con decenas de inscripciones por distrito los datos tendrán ruido.

**Plazo.** La campaña acaba el 29 de noviembre de 2026. Las dimensiones personalizadas no se aplican a datos anteriores a su creación y tardan hasta 24-48 horas en aparecer en los informes ([dimensiones personalizadas](https://support.google.com/analytics/answer/14240153)). Todo se publica el 15 de noviembre en un solo PR.

## Goals

*   **Consentimiento previo.** Antes de **Acceptar** no se carga ningún recurso de `googletagmanager.com` ni de `google-analytics.com` y no se crea ninguna cookie `_ga`. Lo comprueba una prueba e2e.
*   **Franja de consentimiento** en catalán, en la parte inferior de la página, no modal.
    *   Botones **Acceptar** y **Rebutjar** (el vocabulario de barcelonaencomu.cat), con el mismo tamaño y color.
    *   No aparece mientras hay un diálogo abierto.
*   **Una sola decisión** para los tres distritos. Se guarda 13 meses. Pasado ese plazo, o si el valor guardado no es válido, la franja vuelve a aparecer.
*   **Retirar el consentimiento de forma real.** Un enlace **Galetes** en el pie de página vuelve a abrir la franja. **Rebutjar** después de haber aceptado:
    *   desactiva GA;
    *   borra `_ga` y `_ga_XX3RJ48NN2`;
    *   recarga la página, y también las demás pestañas de la agenda abiertas en ese navegador.

    Después no sale ninguna petición a Google.
*   **Página `/galetes`** en catalán. Indica:
    *   las cookies que se usan, su finalidad y su duración;
    *   que el tercero es Google y que hay transferencia a EE. UU.;
    *   el responsable: la coordinación de l'Agenda Frontamplista de Barcelona en Comú Sants-Montjuïc, que gestiona la cuenta de GA4 en nombre de los tres distritos, con el contacto `santsmontjuic@bcnencomu.cat`;
    *   la conservación de 14 meses;
    *   cómo retirar el consentimiento.

    Enlaza a la [política de privacitat de Barcelona en Comú](https://barcelonaencomu.cat/politica-de-privacitat/) para el resto de tratamientos (las inscripciones) y aclara que esa política no cubre esta analítica.
*   **`districte` en todos los eventos**, incluidos los que GA4 recoge solo (`page_view`, `session_start`, `first_visit`, `user_engagement`).
*   **Catálogo cerrado de 9 eventos**, que el plan técnico detalla:
    *   `page_view`;
    *   detalle visto;
    *   clic en el mapa;
    *   inicio, éxito y error de inscripción;
    *   clic en el enlace de la inscripción externa;
    *   desapuntarse;
    *   compartir, con su resultado.
*   **Embudo de inscripción único** para actividades con y sin URL externa, desde que se abre el formulario hasta el éxito, desglosable por distrito y por `externa`.
*   **Resultado de compartir:** con imagen por defecto o propia, y el resultado tal como lo devuelve el navegador (compartido, cancelado, no admitido, error o imagen no generada).
*   **UTMs en los enlaces que se comparten,** para saber si compartir trae visitas.
*   **Entrada por enlace directo `?e=`**, visible en `page_location` y en el parámetro `origen=link` de la vista de detalle.
*   **Sin datos de Google en las pruebas.** Las pruebas e2e y unitarias no envían nada a Google. Si aparece una petición real, la prueba falla.
*   **Interruptor de apagado.** Si `VITE_GA_ID` está vacío, no hay franja ni script.
*   **Comprobación manual.** Los eventos que recorre la lista de *Verification Plan* aparecen en DebugView de GA4 con sus parámetros y `districte`.
*   **Configuración de GA4 documentada**, para hacerla antes de publicar:
    *   dimensiones personalizadas;
    *   medición mejorada;
    *   conservación de datos;
    *   evento clave;
    *   exploraciones.

## Non-Goals

*   Google Tag Manager, librerías de gestión del consentimiento e interruptores por finalidad.
*   El modo avanzado de Consent Mode.
*   User-ID, Google signals y personalización de anuncios.
*   Registrar el consentimiento en el servidor.
*   Guardar eventos anteriores al consentimiento para enviarlos después.
*   Enviar nombres, texto libre, mensajes de error del servidor, el texto compartido o URLs externas.
*   Medir los fallos de validación del nombre en el cliente (nombre vacío o no válido).
*   Comprobar que la persona completa el formulario de la web externa. En una actividad externa, «éxito» significa que la hoja guardó la inscripción.
*   Medir la vista `?admin`. Con `?admin` en la URL no se envía nada, aunque la persona haya aceptado.
*   Contar a quien rechaza, ni siquiera de forma agregada.
*   Revisión de los textos por el delegado de protección de datos de Barcelona en Comú. Es un riesgo aceptado por el autor.
*   Cambiar el backend (`apps-script/Code.gs`).

## Open Questions

Ninguna. El autor confirmó el 2026-11-15 que la coordinación de Sants-Montjuïc (`santsmontjuic@bcnencomu.cat`) figura como responsable y aprobó los textos del apéndice. Las seis objeciones de la revisión de ideas están resueltas en `concepts_brief.md`.

## Critical User Journeys (CUJs)

### CUJ 1: Primera visita y aceptar

*   **Given**: Un navegador sin decisión guardada abre `/eixample`.
*   **When**: La persona pulsa **Acceptar** en la franja.
*   **Then**:
    *   Se carga `gtag.js` una sola vez.
    *   Se envía un `page_view` con `districte=eixample`.
    *   La franja desaparece y el foco pasa a `<main>`.
    *   La decisión queda guardada.

### CUJ 2: Primera visita y rechazar

*   **Given**: Un navegador sin decisión guardada abre `/`.
*   **When**: La persona pulsa **Rebutjar**.
*   **Then**:
    *   La franja desaparece.
    *   No se carga nada de Google, ni en esta visita ni en las siguientes de cualquier distrito, hasta que la persona cambie la decisión.

### CUJ 3: Llegada por un enlace compartido

*   **Given**: Un navegador sin decisión guardada abre `/sant-marti?e=sm-12&utm_source=compartir&utm_medium=share`.
*   **When**: El detalle se abre al cargar. La persona lo cierra, pulsa **Acceptar** y después abre otra actividad.
*   **Then**:
    *   Mientras el detalle está abierto, la franja no se muestra.
    *   Al aceptar se envía un único `page_view` cuya `page_location` conserva `?e=sm-12` y los UTMs.
    *   La vista del detalle anterior al consentimiento no se envía.
    *   La vista de la segunda actividad sí se envía, con `origen=card`.

### CUJ 4: Inscripción con embudo

*   **Given**: Consentimiento aceptado, en `/`.
*   **When**: La persona pulsa **Participar**, escribe un nombre válido y lo envía.
*   **Then**:
    *   Se envía `signup_start`.
    *   Cuando el servidor responde, se envía `signup_success`, o `signup_error` con `error_type`.
    *   En una actividad externa, el resultado llega con el formulario ya cerrado y se envía igualmente.
    *   Ningún evento contiene el nombre.

### CUJ 5: Compartir

*   **Given**: Consentimiento aceptado y el detalle de una actividad abierto.
*   **When**: La persona pulsa **Comparteix**, o usa **Imatge pròpia**.
*   **Then**:
    *   Cuando termina el intento, se envía un único `share` con `method`, `imatge` (`default` o `custom`) y `resultat` (por ejemplo `shared` o `aborted`).
    *   El enlace compartido lleva `utm_source=compartir` y `utm_medium=share`.

### CUJ 6: Retirar el consentimiento

*   **Given**: Consentimiento aceptado y las cookies `_ga` creadas.
*   **When**: La persona pulsa **Galetes** en el pie de página y luego **Rebutjar**.
*   **Then**:
    *   Las cookies `_ga` y `_ga_XX3RJ48NN2` desaparecen.
    *   La página se recarga. Las demás pestañas de la agenda también se recargan cuando vuelven a estar activas o al detectar el cambio.
    *   No sale ninguna petición a Google.

### CUJ 7: Pruebas y publicación

*   **Given**: El flujo de despliegue (`deploy.yml`).
*   **When**: Se ejecutan las pruebas unitarias y e2e.
*   **Then**:
    *   Las pruebas existentes pasan sin cambios en su lógica: un helper marca **Rebutjar** de antemano. Solo cambian las URLs esperadas de `e2e/share.spec.js`, que ahora llevan los UTMs.
    *   Las pruebas nuevas comprueban los CUJ 1 a 6 sin enviar nada a Google.
    *   Solo el sitio publicado recibe el ID real.

## Technical Plan (Architecture)

### Piezas y flujo

```text
 deploy.yml ── VITE_GA_ID (variable del repo, validada ^G-[A-Z0-9]+$) ──► build
                                                                          │
 +layout.svelte (todas las páginas)                                       ▼
   ├─ analytics = createAnalytics(browser ? { id, storage, doc, win, href, … } : { id: '' })   src/lib/analytics.js
   │     estado del consentimiento: unknown | granted | denied
   ├─ al iniciar, en el navegador, si granted ──► analytics.load(districte) ──► gtag.js + page_view
   ├─ <ConsentBanner>  visible si unknown, o si la persona pulsa «Galetes»
   │     Acceptar ──► guarda granted ──► analytics.load(districte)
   │     Rebutjar ──► guarda denied, borra _ga ──► si había cargado: desactiva GA y recarga
   ├─ {@render children()}  ── páginas: [[districte]] y /galetes
   │     componentes ──► track(nombre, parámetros) ──► gtag('event', …) o nada
   └─ <Footer>  «Galetes» · «Política de galetes» · «Privacitat (Barcelona en Comú) ↗»
```

*   **Un solo punto de contacto con Google: `src/lib/analytics.js`.** Los componentes llaman a `track()` y nunca a `gtag` directamente. Si no hay consentimiento, si el ID está vacío o si la URL lleva `?admin`, `track()` no hace nada.
*   **El módulo no importa nada de `$app/*`.** Recibe sus dependencias al crearse: almacenamiento, `document`, `window`, la URL de llegada, reloj y `reload`. Así se prueba con `node --test`, como el resto de `src/lib`.
*   **Solo existe en el navegador.** El layout se prerenderiza en Node, donde no hay `document` ni `window`. Fuera del navegador el layout crea la instancia con `{ id: '' }`, que no lee ninguna otra dependencia y no hace nada.
*   **Una instancia por página cargada.** El layout la crea y la publica con `setContext('analytics', …)`. Los componentes la leen con `getContext`. Las funciones de `src/lib` que no son componentes no la usan.

### Estados del consentimiento

| Estado | Cuándo | Qué se carga | Franja |
| --- | --- | --- | --- |
| `unknown` | No hay valor guardado, el valor no es válido o ha caducado | Nada | Visible, salvo que haya un diálogo abierto |
| `granted` | La persona pulsó **Acceptar** hace menos de 13 meses | `gtag.js` y `page_view` al iniciar el layout | Oculta |
| `denied` | La persona pulsó **Rebutjar** hace menos de 13 meses | Nada | Oculta |

*   **Clave:** `agenda-front-ampli:consent`. No lleva el mes, porque la decisión vale para varias campañas.
*   **Valor:** `{"v":1,"analytics":"granted"|"denied","at":<ms>}`.
*   **El valor es válido solo si:**
    *   el JSON se puede leer;
    *   `v === 1`;
    *   `analytics` es uno de los dos valores;
    *   `at` es un número que no está en el futuro y tiene menos de 13 meses (395 días).

    En cualquier otro caso el estado es `unknown`.
*   **Se usa `browserStorage()`** de `api.js`, que ya devuelve `null` si `localStorage` lanza una excepción. Sin almacenamiento el estado es `unknown`. La franja aparece en cada carga y, si la persona acepta, la decisión solo vale para esa página.
*   **Cerrar la página sin decidir** deja el estado en `unknown`. No hay botón de cerrar la franja: solo **Acceptar** y **Rebutjar**.
*   **Guardar la decisión** está exento de consentimiento, porque es técnicamente necesario. La página `/galetes` lo explica.

### Carga de GA4 (`analytics.load`)

Se ejecuta una sola vez por carga de página: al iniciar el layout en el navegador si el estado es `granted`, o al pulsar **Acceptar**. El layout se inicia antes que la página hija, así que cuando la página llama a `track()` en su `onMount` (por ejemplo, la vista de detalle de `?e=`), `load()` ya se ha ejecutado y no hace falta ninguna cola. Pasos en este orden:

1.  `win.dataLayer = win.dataLayer || []` y `win.gtag = function gtag(){ win.dataLayer.push(arguments) }`, como en el fragmento oficial. Tiene que usar `arguments` y no `...args`: gtag.js solo reconoce los objetos `arguments`.
2.  `gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' })`.
3.  `gtag('js', new Date())`.
4.  `gtag('set', { districte })`. Así lo llevan también los eventos que GA4 crea solo (`session_start`, `first_visit`, `user_engagement`).
5.  `gtag('config', ID, {...})` con estas opciones ([referencia de gtag.js](https://developers.google.com/tag-platform/gtagjs/reference)):
    *   `send_page_view: false`;
    *   `cookie_domain: 'none'`: cookies solo del host, sin atributo `domain`;
    *   `cookie_path`: la ruta base sin la barra final (`/agenda-front-ampli` en producción, `/` en desarrollo);
    *   `cookie_expires: 34128000` (395 días);
    *   `allow_google_signals: false`;
    *   `allow_ad_personalization_signals: false`;
    *   `debug_mode: true` solo si la URL de llegada lleva `ga_debug` o en `import.meta.env.DEV`.
6.  Insertar `<script async src="https://www.googletagmanager.com/gtag/js?id=ID">` en `<head>`.
7.  Enviar `page_view` (ver la siguiente sección).
8.  Escuchar `storage` y `pageshow` en `win` (ver *Retirar el consentimiento*).

`load()` guarda que ya se ha ejecutado. Una segunda llamada no hace nada, así que nunca hay dos scripts ni dos `page_view`.

**Cookies y otros proyectos.** Con `cookie_domain: 'none'` y `cookie_path` en la ruta base, las cookies `_ga` de la agenda solo existen en `jimi75.github.io/agenda-front-ampli`. No se mezclan con las de otros proyectos del mismo dominio, y borrarlas no afecta a esos proyectos.

**`debug_mode` en producción.** Cualquiera puede añadir `?ga_debug` a la URL y sus eventos saldrán en DebugView. No da acceso a ningún dato y solo afecta a ese navegador. Se acepta.

### `page_view` y `districte`

*   **No hay navegación dentro de la app.**
    *   Cada distrito es una página completa: `+page.svelte` dice «never navigates to another».
    *   Abrir el detalle no cambia la URL.
    *   Los enlaces del pie de página hacia `/galetes` y de vuelta llevan `data-sveltekit-reload`, para que también recarguen.

    Por eso hay **un solo `page_view` por carga de página**, enviado a mano.
*   **Parámetros:**
    *   `page_location`: la URL de llegada, capturada al crear el módulo. Conserva `?e=` y los `utm_*`. Si lleva `ga_debug`, se quita ese parámetro con una expresión regular sobre la query original, sin volver a serializarla, para que el resto quede igual.
    *   `page_title`: `document.title`.
    *   `districte`.

    `page_view` no pasa por el filtro del catálogo: `page_location` puede tener más de 100 caracteres y se envía entera.
*   **Valor de `districte`:** lo calcula el layout a partir de `page.data.district?.slug` (`$app/state`). En `/galetes` no hay distrito y vale `cap`.
*   **Vista `?admin`:** se detecta igual que en `+page.svelte`, con `new URLSearchParams(search).has('admin')`, así que `?e=admin-1` no cuenta. Con `?admin`, `load()` y `track()` no hacen nada. La franja y el botón «Galetes» funcionan igual y la decisión se guarda: vale para las visitas sin `?admin`.

### Catálogo de eventos

Todos los eventos llevan `districte`, que añade `track()`. Los valores de la tabla son una lista cerrada. `track()` cambia cualquier otro valor de `error_type` o `resultat` por `other`. En desarrollo, avisa con `console.warn` si el nombre de un evento o de un parámetro no está en el catálogo.

| Evento | Parámetros | Dónde se emite | Pregunta que responde |
| --- | --- | --- | --- |
| `page_view` | `page_location`, `page_title` | `analytics.load()` | Cuántas personas abren la agenda; si compartir trae visitas (UTMs). |
| `event_detail_view` | `activitat_id`, `activitat_tipus` (`accio`\|`acte`), `origen` (`card`\|`link`) | Página: en `openDetail` (`origen=card`) y en la rama `?e=` de `onMount` (`origen=link`), solo si la actividad existe. Nunca en `signupDone`. | Qué actividades miran. |
| `map_click` | `activitat_id`, `origen` (`card`\|`detail`) | `onclick` del enlace del mapa en `EventCard` y en `EventDetail`. | Si usan el mapa. |
| `signup_start` | `activitat_id`, `activitat_tipus`, `externa` (`si`\|`no`) | Página: en `openSignup`. | Embudo: inicio. |
| `signup_success` | `activitat_id`, `activitat_tipus`, `externa` | Página: en `signup()`, tras el `await`, si `result.ok`. | Embudo: éxito. |
| `signup_error` | `activitat_id`, `activitat_tipus`, `externa`, `error_type` | Página: en `signup()`, si `!result.ok` o si `api.signup` lanza una excepción (`exception`). | Por qué no terminan. |
| `external_link_click` | `activitat_id` | `onclick` del enlace «Ves a la inscripció externa ↗» en `SignupDialog`. | Si quien se apunta a una externa vuelve para ir a la web externa. |
| `unsignup` | `activitat_id`, `resultat` (`ok`\|`error`) | Página: en `unsignup()`, tras el `await`. | Cuántas personas se desapuntan. |
| `share` | `method` (`web_share`\|`whatsapp_link`), `content_type` = `activitat`, `item_id`, `imatge` (`default`\|`custom`), `resultat` | `EventDetail`, una vez por intento terminado (ver *Compartir*). | Si **Comparteix** funciona en móviles reales. |

**Valores de `error_type`:** las claves de `T.signupErrors` salvo `empty` (hoy: `unknown_event`, `event_full`, `closed`, `busy`, `network`, `unconfirmed`, `server`, `bad_request`, `unknown_district`, `invalid_name`), más `exception` y `other`. El código las obtiene con `Object.keys(T.signupErrors)`, así que un error nuevo en `texts.js` entra en la lista sin tocar `analytics.js`. `empty` nunca se envía, porque la validación en el cliente no llega a `signup()`.

**Valores de `resultat`:** `ok` y `error` para `unsignup`; `shared`, `aborted`, `unsupported`, `error`, `generation_failed` y `opened` para `share`; más `other`.

**Reglas de nombres:**

*   snake_case;
*   como mucho 40 caracteres;
*   sin los prefijos `ga_`, `google_` ni `firebase_`;
*   valores de como mucho 100 caracteres.

`activitat_id` es el `id` de la hoja (por ejemplo `eix-3`) y no contiene datos personales.

**Qué filtra el catálogo.** `CATALOG` y `cleanParams` solo filtran las llamadas a `track()` escritas en este repositorio. No protegen de nada externo: sirven para que un error al añadir un parámetro (por ejemplo, el nombre) no llegue a Google, y para documentar en un solo sitio lo que se envía.

**Datos tomados antes del `await`.** En `signup()`, `id`, `activitat_tipus` y `externa` se leen al principio, junto a `signupId`. En el flujo externo, cuando llega la respuesta, el modal ya está cerrado y `signupEvent` vale `null`. gtag envía los eventos en segundo plano, así que el evento sale aunque la pestaña quede detrás de la que abre `window.open`. Si la persona cierra la pestaña de la agenda antes de la respuesta, el evento se pierde. Es un límite aceptado.

### Compartir

Se mide en `EventDetail` con **un solo evento `share` por intento terminado**. `resultat` es el resultado tal como lo devuelve `shareImage`, sin interpretarlo, más dos valores propios. `item_id` e `imatge` se guardan al empezar el intento, antes de cualquier `await`, y el evento se envía **antes** de las comprobaciones de `epoch` y `token`, para que un detalle cerrado durante el envío no se pierda.

| Situación | `method` | `resultat` |
| --- | --- | --- |
| `shareImage` devuelve `shared` | `web_share` | `shared` |
| Devuelve `aborted` | `web_share` | `aborted`. Es aproximado: algunos navegadores devuelven `AbortError` aunque se haya compartido. |
| Devuelve `needs-second-tap` | — | Nada todavía. El segundo toque envía el resultado final. |
| Devuelve `unsupported` o `error` | `web_share` | `unsupported` o `error`. Con la imagen por defecto, la app descarga la imagen y muestra el enlace `wa.me`; el clic en ese enlace es otro evento. |
| La imagen por defecto no se genera (`shareView='failed'`) | `web_share` | `generation_failed` |
| Clic en «Obre WhatsApp amb el text» | `whatsapp_link` | `opened`, con `imatge=default` (solo el flujo por defecto muestra el enlace) |

**Límite conocido.** Las comprobaciones S1 y S2 del README existen porque algunos navegadores devuelven `shared` sin haber entregado la imagen. GA verá esos casos como `shared`. El informe sirve para comparar navegadores y para ver cuántos `unsupported` y `error` hay, no para confirmar la entrega.

### UTMs

*   **Función nueva en `share.js`:** `shareUrl(location, id)`. Devuelve `` `${detailUrl(location, id)}&utm_source=compartir&utm_medium=share` ``.
*   **`detailUrl` no cambia**, porque también genera los `href` de las tarjetas y tiene un test con su salida exacta.
*   **Un solo `utm_source`.** El texto que acompaña a la imagen y el del enlace `wa.me` son el mismo texto, con la misma URL. No hace falta distinguirlos: el informe de compartir ya separa `web_share` y `whatsapp_link`.
*   **La página** pasa a `EventDetail` la prop `url` calculada con `shareUrl` en lugar de `detailUrl`. `EventDetail` no cambia su forma de construir el texto.
*   **Comprobación:** `parseEventParam` ya ignora los demás parámetros. Un test nuevo lo confirma con los UTMs.
*   **Sin `utm_campaign`:** el distrito ya está en la ruta.

### Franja de consentimiento (`ConsentBanner.svelte`)

*   `<section role="region" aria-label="Galetes">`, último elemento del layout. No es un `<dialog>` y no atrapa el foco.
*   **Posición:** `position: sticky; bottom: 0`, al final del flujo de la página. Mientras se desplaza la página, queda pegada abajo y tapa la parte inferior de la pantalla, como cualquier franja. Al llegar al final del documento ocupa su propio espacio, así que no tapa ni la última tarjeta ni el pie.
*   **Ocultar con un diálogo abierto:** con CSS, `body:has(dialog[open]) .consent { display: none }`. Es la misma técnica que el layout ya usa para bloquear el desplazamiento. Cuando el diálogo se cierra, la franja vuelve a aparecer sin código adicional.
*   **Texto** en `T.consent` (`texts.js`): «Fem servir galetes de Google Analytics per saber, sense el teu nom, com es fa servir l'agenda. Google (EUA) rebrà aquestes dades. Només les activarem si acceptes. Pots canviar d'opinió a «Galetes», al peu de la pàgina.», seguido del enlace «Més informació» a `/galetes`. No dice «de manera agregada», porque GA4 guarda un registro por dispositivo.
*   **Botones** «Acceptar» y «Rebutjar» con la misma clase, tamaño y colores: fondo `--ink` y texto `--page`. Ninguno está preseleccionado.
*   **Al decidir,** la franja se oculta y el foco pasa a `<main>` (`tabindex="-1"`) con `focus({ preventScroll: true })`, para que la página no salte.
*   **Escape** no cuenta como rechazo.
*   **Alto máximo** del 30 % de la pantalla, con desplazamiento interno, y `padding-bottom: env(safe-area-inset-bottom)`.
*   **Al reabrirla desde «Galetes»,** muestra la decisión actual («Ara: acceptades» o «Ara: rebutjades») y los mismos dos botones.

### Retirar el consentimiento (`analytics.reject`)

**Rebutjar** siempre hace esto, sea cual sea el estado anterior:

1.  Borrar `_ga` y `_ga_<ID sin "G-">` con `max-age=0` en la ruta base, sin dominio. Con `cookie_domain: 'none'` es la única combinación en la que GA las crea. Se borran también si el estado era `unknown`, porque puede quedar una cookie de una aceptación anterior que ya caducó en `localStorage`.
2.  Guardar `denied`.

Si `load()` ya se ejecutó en esta página, además:

3.  `win['ga-disable-' + ID] = true`.
4.  `gtag('consent', 'update', { analytics_storage: 'denied' })`.
5.  `reload()`. La página nueva no carga `gtag.js`.

**Otras pestañas.** `ga-disable` solo afecta a la pestaña actual. Por eso `load()` registra dos escuchas:

*   `storage`: si cambia la clave `agenda-front-ampli:consent` y el estado ya no es `granted`, recarga la pestaña.
*   `pageshow` con `event.persisted`: si la página vuelve de la caché del navegador (botón Atrás) y el estado ya no es `granted`, recarga.

### Pie de página y `/galetes`

*   **`Footer.svelte` en el layout.** Contiene:
    *   el botón «Galetes», que reabre la franja; solo aparece si hay ID;
    *   el enlace «Política de galetes» a `resolve('/galetes')`, con `data-sveltekit-reload`;
    *   el enlace «Privacitat (Barcelona en Comú) ↗» a `https://barcelonaencomu.cat/politica-de-privacitat/`, en una pestaña nueva.
*   **Ruta `src/routes/galetes/+page.svelte`.** Un segmento estático tiene prioridad sobre `[[districte]]`. Se prerenderiza porque el layout ya declara `prerender = true` y el pie de página la enlaza. La build genera `build/galetes.html`, igual que `build/eixample.html`.
*   **Contenido** en catalán, con los textos finales en el apéndice *Textos de `/galetes`*. La tabla de cookies tiene el nombre fijo `_ga_XX3RJ48NN2`: si algún día cambia la propiedad, se cambia el texto.
*   **Responsable.** La cuenta de GA4 es del autor, que la gestiona para la coordinación de la agenda; no es de Barcelona en Comú. Por eso la página nombra como responsable a la coordinación de l'Agenda Frontamplista de Barcelona en Comú Sants-Montjuïc y aclara que la política de Barcelona en Comú (responsable con CIF G66476136) cubre las inscripciones pero no esta analítica.
*   **Enlace de vuelta** a la agenda de Sants-Montjuïc (`resolve('/')`), con `data-sveltekit-reload`.
*   **`districts.js`** declara `RESERVED_SLUGS = ['galetes']`. Un test comprueba que ningún distrito usa ese slug.

### Configuración del ID y de las pruebas

*   **`VITE_GA_ID`:**
    *   Solo lo define `deploy.yml`, a partir de la variable del repositorio `GA_ID`.
    *   Se valida con `^G-[A-Z0-9]+$`. Si la variable falta, el despliegue sigue sin analítica y escribe un aviso `::warning::`. Si está mal formada, falla con `::error::`.
    *   Con el ID vacío no hay franja, no hay botón «Galetes» y `track()` no hace nada. Es el interruptor de apagado.
*   **`e2e/serve.js`** define `VITE_GA_ID=G-TEST000000`.
*   **`installScript` (`e2e/script.js`)**, que ya usan todos los specs:
    *   añade la opción `consent` (`'denied'` por defecto, `'granted'` o `null`), que se escribe con `page.addInitScript` solo si la clave todavía no existe, para no pisar una decisión tomada durante la prueba;
    *   intercepta las peticiones a `*.googletagmanager.com` y `*.google-analytics.com`, incluidos los hosts regionales como `region1.google-analytics.com`. `gtag/js` se responde con un script vacío, y cualquier otra petición se aborta y se anota.

    Con el valor por defecto, los specs existentes no ven la franja. Solo `e2e/share.spec.js` cambia, porque las URLs compartidas llevan UTMs.
*   **Nuevo `e2e/analytics.spec.js`** con los CUJ 1 a 6. Lee los eventos de `window.dataLayer`, convirtiendo cada entrada con `Array.from`.
*   **Lo que el e2e no prueba.** El `gtag/js` de las pruebas es un script vacío: no crea cookies ni envía nada. Las pruebas comprueban lo que la app pone en `dataLayer` y que borra las cookies que la propia prueba crea, no el comportamiento real de Google. Eso se comprueba a mano con DebugView.

### Configuración de GA4 (antes de publicar)

1.  **Admin › Configuración de la cuenta:** aceptar las condiciones de tratamiento de datos.
2.  **Flujo de datos web:** URL `https://jimi75.github.io`, nombre «Agenda Frontamplista». Comprobar que el ID de medición es `G-XX3RJ48NN2`.
3.  **Configuración de la etiqueta de Google** (Flujo de datos › Configurar los ajustes de la etiqueta): comprobar que no hay nada activado que añada eventos o datos por su cuenta: sin datos proporcionados por los usuarios, sin dominios cruzados, sin reglas para crear o modificar eventos. Todo lo que se mide sale del código.
4.  **Medición mejorada:**
    *   *Vistas de página* activadas, con *Cambios de página basados en eventos del historial del navegador* desactivado. La app no navega dentro de la página. Con la opción desactivada, GA4 no envía `page_view` propios aunque algo cambie el historial, así que el único `page_view` es el que envía `load()`.
    *   Desactivados: desplazamientos, clics salientes, búsqueda en el sitio, interacciones con formularios, vídeo y descargas de archivos. Los clics en el mapa y en enlaces externos ya los mide el catálogo, y los demás no responden a ninguna pregunta de *The Problem*.
5.  **Recogida de datos:** Google signals desactivado, datos detallados de ubicación y dispositivo desactivados, personalización de anuncios desactivada en todas las regiones.
6.  **Conservación de datos:** 14 meses, con «Restablecer los datos de usuario con nueva actividad» desactivado.
7.  **Dimensiones personalizadas** (Admin › Visualización de datos › Definiciones personalizadas). Todas con ámbito **Evento**:

    | Nombre | Parámetro |
    | --- | --- |
    | Districte | `districte` |
    | ID de l'activitat | `activitat_id` |
    | Tipus d'activitat | `activitat_tipus` |
    | Inscripció externa | `externa` |
    | Origen | `origen` |
    | Tipus d'error | `error_type` |
    | Imatge compartida | `imatge` |
    | Resultat | `resultat` |

    Son 8 de las 50 permitidas. `method` e `item_id` ya existen como dimensiones predefinidas.
8.  **Evento clave:** `signup_success`.
9.  **Explorar:**
    *   **Embudo cerrado:** paso 1 `signup_start`, paso 2 `signup_success`, «seguido indirectamente de», sin ventana de tiempo. Desglose por Districte, con Inscripció externa como segundo desglose. Se crea antes de publicar y se revisa al cabo de una semana, cuando haya datos para comprobar los pasos.
    *   **Exploración libre «Errors d'inscripció»:** filas Tipus d'error, columnas Districte, métrica Recuento de eventos, filtro `signup_error`.
    *   **Exploración libre «Compartir»:** filtro `share`; filas Método, Imatge compartida y Resultat.
10. **Comprobación:** abrir la web publicada con `?ga_debug`, aceptar y seguir los pasos manuales de *Verification Plan*. DebugView debe mostrar cada evento recorrido con `districte`.

## Alternatives Considered

### Herramienta y cuenta

#### Google Tag Manager (`GTM-T8NTRD99`)

*   **Pros:** permite cambiar etiquetas y activadores desde la web de GTM sin desplegar. Era el código que el autor tenía a mano.
*   **Cons:** añade una herramienta, un contenedor que mantener y una capa más donde se puede romper la medición. El fragmento que el autor tenía cargaba `gtm.js` con el ID del contenedor y a la vez definía `gtag`, así que no medía nada por sí solo sin configurar el contenedor.
*   **Reason for Rejection:** Rechazado por el autor: solo una persona publica la web, y cada cambio de medición ya pasa por un PR con tests. GTM no aporta nada que gtag no cubra aquí.

#### Herramienta sin cookies alojada en la UE (GoatCounter o Plausible)

*   **Pros:** no necesita franja de consentimiento ni página de galetes, y no hay transferencia de datos a EE. UU. Se medirían todas las visitas, no solo las que aceptan.
*   **Cons:** no tiene embudos cerrados ni dimensiones personalizadas al nivel de GA4. Plausible es de pago. Barcelona en Comú no la usa.
*   **Reason for Rejection:** Rechazado por el autor: se usa la misma herramienta que Barcelona en Comú, que tiene GA4 en barcelonaencomu.cat (comprobado el 15 de noviembre de 2026), y el embudo y las dimensiones por distrito son el motivo de medir. A cambio se pierde a quien rechaza, en una proporción que no se puede conocer.

#### Propiedad dentro de la cuenta de GA de Barcelona en Comú

*   **Pros:** encaja con que Barcelona en Comú figure como responsable del tratamiento, y los datos quedarían junto a los de la web principal.
*   **Cons:** hace falta que alguien de Barcelona en Comú dé acceso y mantenga los permisos. El autor perdería el control de la configuración.
*   **Reason for Rejection:** Rechazado por el autor: mantiene una cuenta propia para no depender de terceros a dos semanas del final de la campaña. A cambio, el responsable que figura en `/galetes` es la coordinación de la agenda de Sants-Montjuïc y no Barcelona en Comú, y la página aclara que la política de Barcelona en Comú no cubre esta analítica.

#### Modo avanzado de Consent Mode

*   **Pros:** cuando alguien rechaza, Google envía pings sin cookies y modela las conversiones perdidas.
*   **Cons:** los pings salen antes del consentimiento o sin él. La AEPD exige consentimiento también para esa medición, y aquí se tratan datos con sesgo político (art. 9 del RGPD).
*   **Reason for Rejection:** Rechazado por el autor: gtag no se carga hasta que hay «Acceptar». El riesgo legal no compensa los datos modelados en una web de campaña.

### Consentimiento y política

#### Modal que bloquea la agenda hasta decidir

*   **Pros:** obliga a decidir, así que hay más decisiones registradas. Es lo que el autor propuso al principio («Acept cookies -> sí/no»).
*   **Cons:** la guía de galetes de la AEPD de 2023 considera problemáticos los muros que impiden usar la web. Un `<dialog>` con `showModal()` haría inertes los diálogos de detalle e inscripción que la página abre con `showModal()` al entrar con `?e=`.
*   **Reason for Rejection:** Rechazado por el autor: se usa una franja inferior que no bloquea nada, con los mismos dos botones del mismo peso.

#### Botones «Accepto» / «Rebutjo» o «No, gràcies»

*   **Pros:** tono más cercano.
*   **Cons:** «No, gràcies» resta peso visual y semántico al rechazo, y la AEPD pide que aceptar y rechazar tengan el mismo peso. Además, no coincide con el vocabulario de Barcelona en Comú.
*   **Reason for Rejection:** Rechazado por el autor: se usan «Acceptar» y «Rebutjar», como en barcelonaencomu.cat.

#### Enlazar solo la política de comuns.cat

*   **Pros:** no hay que escribir ni mantener una página propia.
*   **Cons:** habla de otra web, no nombra las cookies `_ga` ni `_ga_<ID>`, dice que «navegar es aceptar» y no explica cómo retirar el consentimiento en esta web.
*   **Reason for Rejection:** Rechazado por el autor: se crea `/galetes` y se enlaza la política de privacidad de barcelonaencomu.cat para el resto del tratamiento.

#### Franja `position: fixed` con `padding-bottom` en el cuerpo

*   **Pros:** es el patrón más común y queda fija siempre, aunque la página sea corta.
*   **Cons:** hay que medir el alto de la franja, que cambia con el ancho y con el tamaño de letra, y reservarlo en el `body`. Si la medida falla, la franja tapa la última tarjeta o el pie.
*   **Reason for Rejection:** Rechazado al redactar el plan técnico, que el autor aprobó: `position: sticky; bottom: 0` al final del flujo ocupa su propio espacio y no necesita medir nada.

#### `MutationObserver` o eventos para ocultar la franja con un diálogo abierto

*   **Pros:** no depende de `:has()`.
*   **Cons:** exige código en la franja que observe el DOM o que cada diálogo avise al abrirse y al cerrarse. Es más código y más estado que se puede desincronizar.
*   **Reason for Rejection:** Rechazado al redactar el plan técnico, que el autor aprobó: `body:has(dialog[open]) .consent { display: none }` repite la técnica que `+layout.svelte` ya usa para bloquear el desplazamiento. Los navegadores sin `:has()` solo verían la franja por debajo del diálogo, sin perder funciones.

### Medición

#### Distrito como propiedad de usuario

*   **Pros:** permite segmentar a las personas por distrito en Explorar.
*   **Cons:** una propiedad de usuario guarda el último valor. Quien visita dos distritos quedaría registrado solo en el último.
*   **Reason for Rejection:** Rechazado por el autor: `districte` es una dimensión de evento, y así se ve a quien interactúa con más de un distrito.

#### Dos embudos: inscripción propia y externa

*   **Pros:** separa los dos flujos en informes distintos.
*   **Cons:** desde `inscripcio-externa-amb-nom.md`, las actividades externas pasan por el mismo diálogo y guardan una inscripción real. Habría dos embudos casi iguales que mantener.
*   **Reason for Rejection:** Rechazado por el autor: un embudo único, `signup_start` → `signup_success`, con el parámetro `externa` para separar los flujos cuando haga falta.

#### Entrega en dos PR (primero el embudo y después el resto)

*   **Pros:** PR más pequeños, más fáciles de revisar y de revertir.
*   **Cons:** el consentimiento, la carga de GA4 y la página `/galetes` tienen que ir en el primero de todas formas, así que el segundo PR solo añadiría eventos.
*   **Reason for Rejection:** Rechazado por el autor: todo se publica el 15 de noviembre de 2026 en un solo PR, porque la campaña acaba el 29 y cada día sin medir es un día sin datos. El riesgo de un PR grande se reduce con las fases del plan, que dejan `npm test` y `npm run check` en verde después de cada paso, y con `GA_ID` como interruptor: si algo falla después de publicar, se apaga la analítica sin revertir.

#### Conservación de 2 meses

*   **Pros:** menos datos guardados, lo que reduce el riesgo.
*   **Cons:** Explorar solo trabaja con datos dentro del periodo de conservación. Con 2 meses no se puede comparar esta campaña con la siguiente.
*   **Reason for Rejection:** Rechazado por el autor: 14 meses, para poder comparar con la próxima campaña. A cambio, GA4 guarda más tiempo datos que pueden revelar interés político; `/galetes` lo explica.

#### Cola de eventos hasta que se ejecute `load()`

*   **Pros:** no depende del orden en que Svelte inicia el layout y la página.
*   **Cons:** más estado y una prueba que tiene que forzar el orden. El layout se inicia antes que la página hija, así que llamar a `load()` al iniciar el layout ya garantiza el orden.
*   **Reason for Rejection:** Rechazado en la revisión: `load()` se llama al iniciar el layout en el navegador y no hay cola.

#### Dos eventos, `share` y `share_failed`, con una tabla de traducción

*   **Pros:** el número de `share` se lee directamente como «compartidos».
*   **Cons:** la tabla tenía que decidir qué cuenta como éxito (por ejemplo, la descarga de la imagen) y GA no puede saber si `shared` es real (comprobaciones S1 y S2). Además pedía una segunda URL con `utm_source=whatsapp` y una prop nueva en `EventDetail`.
*   **Reason for Rejection:** Rechazado en la revisión: un solo `share` con el resultado sin traducir en `resultat` y un solo `utm_source`.

#### Borrar las cookies en `/` y en todo el dominio

*   **Pros:** borra las `_ga` aunque GA las haya creado en otra ruta o con dominio.
*   **Cons:** `jimi75.github.io` es compartido. Borrar en `/` o con `domain=jimi75.github.io` borra también las cookies de GA de otros proyectos de la cuenta.
*   **Reason for Rejection:** Rechazado en la revisión: con `cookie_domain: 'none'` y `cookie_path` en la ruta base, las cookies solo existen ahí y se borran ahí.

#### Evento `deep_link_entry`

*   **Pros:** cuenta las entradas por `?e=` sin tener que filtrar.
*   **Cons:** duplica información: `page_location` ya incluye `?e=` y los UTMs, y `event_detail_view` lleva `origen=link`.
*   **Reason for Rejection:** Rechazado por los revisores: la entrada por `?e=` que pidió el autor queda cubierta sin un evento propio.

#### Evento `signup_submit` (envío válido)

*   **Pros:** añade un paso más al embudo, entre abrir el diálogo y el éxito.
*   **Cons:** en el flujo externo coincide en el mismo instante con el éxito. El porcentaje de error ya sale de `signup_success` más `signup_error`.
*   **Reason for Rejection:** Rechazado por los revisores: el paso no aporta información.

#### Nombrar el éxito `sign_up`

*   **Pros:** es un evento recomendado de GA4 y aparece en informes predefinidos.
*   **Cons:** en GA4 significa «crear una cuenta». Mezclaría las inscripciones a actividades con altas que esta web no tiene.
*   **Reason for Rejection:** Rechazado por los revisores: se usa `signup_success`.

#### Parámetro `event_id`

*   **Pros:** nombre obvio para el identificador de la actividad.
*   **Cons:** se confunde con el propio evento de GA y con la deduplicación de Measurement Protocol.
*   **Reason for Rejection:** Rechazado por los revisores: se usa `activitat_id`.

#### Añadir los UTMs a `detailUrl`

*   **Pros:** un solo sitio construye todas las URL de detalle.
*   **Cons:** `detailUrl` también genera los `href` de las tarjetas, y `share.test.js` comprueba su salida exacta. Los clics internos llevarían UTMs de compartir.
*   **Reason for Rejection:** Rechazado por los revisores: la función nueva `shareUrl` añade los UTMs y `detailUrl` no cambia.

## Non-Functional Requirements

*   **Privacidad:**
    *   No se carga nada de Google sin «Acceptar». Ni siquiera se envían pings sin cookies, porque no se usa el modo avanzado de Consent Mode.
    *   Ningún evento lleva el nombre, el `requestId` ni el secreto para desapuntarse. `activitat_id` es el `id` de la hoja.
    *   `track()` solo acepta los parámetros del catálogo. Los valores de `error_type` y `resultat` salen de listas cerradas.
    *   Google signals y la personalización de anuncios están desactivados en `gtag('config')` y en la propiedad.
*   **Rendimiento:** sin consentimiento, la página no descarga nada de Google; solo crece el JavaScript propio de la app con `analytics.js`, la franja y el pie, sin dependencias nuevas. Con consentimiento, `gtag.js` se carga con `async` y no bloquea la agenda.
*   **Despliegue y marcha atrás:**
    *   Para apagar la analítica, se borra la variable `GA_ID` en *Settings › Secrets and variables › Actions › Variables* del repositorio y se lanza otra vez el flujo `deploy.yml` (*Actions › Run workflow*). Con el ID vacío no hay franja, ni botón «Galetes», ni ninguna llamada a Google.
    *   Las cookies `_ga` que ya existan caducan solas. La página `/galetes` sigue publicada y explica cómo borrarlas.
    *   Revertir el PR también funciona: la clave `agenda-front-ampli:consent` que quede guardada no la lee nadie.

## Risks

| Riesgo | Mitigación |
| --- | --- |
| No hay revisión del delegado de protección de datos de Barcelona en Comú. | Textos de `/galetes` cerrados en este diseño (apéndice), sin nombres ni texto libre en los eventos. Revisión pedida para la próxima campaña (*Future Improvements*). |
| Los datos de interés político son de categoría especial (art. 9 del RGPD). | Consentimiento previo, sin modo avanzado, sin nombres ni Google signals, y retirada real del consentimiento. |
| Quien rechaza no se mide, y no se sabe cuántas personas son. | Los porcentajes del embudo se leen como «de quienes aceptan». Las inscripciones totales siguen en la hoja. |
| Se pierden las vistas de detalle anteriores al consentimiento. | Aceptado: la entrada por `?e=` sigue visible en `page_location` del `page_view`. |
| En el flujo externo se pierde el evento si la pestaña se cierra antes de la respuesta. | Aceptado: la hoja guarda la inscripción igualmente. |
| Un PR grande publicado el mismo día. | Fases con pruebas en verde y `GA_ID` como interruptor de apagado. |
| Datos pocos y con ruido (decenas de inscripciones por distrito). | Se leen como tendencias, no como cifras exactas. |

## Additional Resources

*   [concepts_brief.md](../../concepts_brief.md): decisiones de la fase de ideas.
*   [inscripcio-externa-amb-nom.md](./inscripcio-externa-amb-nom.md): el flujo externo que mide el embudo único.
*   [imatge-propia-compartir.md](./imatge-propia-compartir.md) y [text-compartir.md](./text-compartir.md): los flujos de compartir que mide `share`.
*   [Guía sobre el uso de las cookies, AEPD (julio de 2023)](https://www.aepd.es/guias/guia-cookies.pdf).
*   [Política de privacitat de Barcelona en Comú](https://barcelonaencomu.cat/politica-de-privacitat/).
*   Documentación de GA4: [Consent Mode](https://developers.google.com/tag-platform/security/guides/consent), [parámetros de `gtag('config')`](https://developers.google.com/tag-platform/gtagjs/reference) y [dimensiones personalizadas](https://support.google.com/analytics/answer/14240153).

## Future Improvements

*   **Revisión del delegado de protección de datos:** pedir a Barcelona en Comú que revise `/galetes` antes de la próxima campaña.
*   **Medir con otra herramienta sin cookies:** si los datos de GA4 resultan demasiado escasos para decidir (por ejemplo, menos inscripciones medidas que en la hoja de forma muy marcada), reconsiderar GoatCounter para el recuento total de visitas. La comparación con la hoja es la única forma de estimar cuánto se pierde.

--------------------------------------------------------------------------------

## Detailed Implementation Plan

### Fases

**Adaptación de compatibilidad autorizada el 15 de noviembre de 2026:** SvelteKit 3 usa `$app/env` en lugar de `$app/environment` y resuelve la raíz con `resolve('/[[districte]]', { districte: '' })`. Los tipos JSDoc de las dependencias se limitan a las superficies usadas para admitir los dobles de prueba; `ga-disable-<ID>` se escribe con `Reflect.set` sobre `window`. La franja usa el rol `region` implícito de `<section aria-label="Galetes">`, sin atributo `role` redundante. No cambia el comportamiento aprobado.

Todo va en un solo PR. Este orden permite que `npm test` y `npm run check` pasen después de cada fase:

1.  `analytics.js` y sus tests, `districts.js` y `share.js` con sus tests, `texts.js`.
2.  Layout, `ConsentBanner`, `Footer`, `/galetes`.
3.  Eventos en la página y en los componentes.
4.  e2e: `serve.js`, `script.js`, `share.spec.js` y `analytics.spec.js`.
5.  `deploy.yml` y la documentación.

Las rutas de importación siguen el alias del repositorio: `#lib/…` para `src/lib` y `#lib/components/…` para los componentes.

### Target Files to Create/Modify

#### 1. `src/lib/analytics.js` (Create)

*   **Type / Scope:** módulo JavaScript sin dependencias externas. No importa nada de `$app/*` ni de Svelte. Solo importa `T` de `#lib/texts.js`.
*   **Proposed Changes:**
    *   Tipos JSDoc exportados:
        *   `@typedef {'unknown' | 'granted' | 'denied'} ConsentState`;
        *   `@typedef {{ enabled: boolean, consent: () => ConsentState, accept: (districte: string) => void, reject: () => void, load: (districte: string) => void, track: (name: string, params?: Record<string, string>) => void }} Analytics`.
    *   Constantes exportadas:
        *   `CONSENT_KEY = 'agenda-front-ampli:consent'`;
        *   `CONSENT_MAX_AGE_MS = 395 * 86_400_000`;
        *   `CATALOG`: `Record<string, readonly string[]>` con cada evento de la tabla *Catálogo de eventos* salvo `page_view`, y la lista de parámetros que admite;
        *   `ERROR_TYPES = [...Object.keys(T.signupErrors).filter((key) => key !== 'empty'), 'exception', 'other']`;
        *   `RESULTS = ['ok', 'error', 'shared', 'aborted', 'unsupported', 'generation_failed', 'opened', 'other']`.
    *   Funciones puras exportadas:
        *   `readConsent(storage, nowMs) → ConsentState`, con `nowMs: number`. Aplica las reglas de *Estados del consentimiento*. Con `storage` nulo, o si `getItem` lanza una excepción, devuelve `unknown`.
        *   `writeConsent(storage, value, nowMs)`. Escribe `{v:1, analytics:value, at:nowMs}` e ignora las excepciones.
        *   `isAdmin(href) → boolean`: `new URL(href).searchParams.has('admin')`.
        *   `landingLocation(href) → string`. Separa el `#fragmento`, parte la query por `&`, quita los trozos cuyo nombre (lo que hay antes de `=`) es `ga_debug` y vuelve a unir los demás con `&` tal como estaban, sin decodificarlos. Si no queda ningún trozo, quita también el `?`.
        *   `cleanParams(name, params) → Record<string, string>`. Descarta los parámetros que no están en `CATALOG[name]`, cambia por `other` los valores de `error_type` que no están en `ERROR_TYPES` y los de `resultat` que no están en `RESULTS`, y recorta cada valor a 100 caracteres. No se usa con `page_view`.
    *   `createAnalytics(deps) → Analytics`, con `deps`:
        *   `id: string`;
        *   `storage?: Storage | null`;
        *   `doc?: Document`;
        *   `win?: Window & { dataLayer?: unknown[], gtag?: Function }`: el objeto donde viven `dataLayer`, `gtag`, `ga-disable-<ID>` y las escuchas;
        *   `href?: string`: la URL de llegada;
        *   `cookiePath?: string`;
        *   `dev?: boolean`;
        *   `now?: () => number`;
        *   `reload?: () => void`.

        **Con `id === ''`** devuelve una instancia inactiva sin leer ninguna otra dependencia: `enabled` es `false`, `consent()` devuelve `unknown` y los demás métodos no hacen nada. Es lo que usa el layout durante el prerender.

        **Con ID**, la instancia devuelta tiene:
        *   `enabled: true`. Controla la franja y el botón «Galetes».
        *   Un `blocked` interno, que vale `isAdmin(href)`.
        *   `consent()`: `readConsent(storage, now())` en cada llamada.
        *   `accept(districte)`: guarda `granted` y llama a `load(districte)`.
        *   `reject()`: sigue *Retirar el consentimiento*. Borra las dos cookies con `doc.cookie = \`${name}=; max-age=0; path=${cookiePath}\``, con `name` igual a `_ga` y a `_ga_${id.slice(2)}`, y guarda `denied`. Si `load()` ya se ejecutó, además pone `win['ga-disable-' + id] = true`, llama a `gtag('consent', 'update', { analytics_storage: 'denied' })` y llama a `reload()`.
        *   `load(districte)`: si `blocked`, o si ya se ejecutó, no hace nada. Si no, sigue los ocho pasos de *Carga de GA4*. El `<script>` se crea con `doc.createElement('script')`, `async = true` y `src`, y se añade con `doc.head.append`. El `page_view` se envía con `gtag('event', 'page_view', { page_location: landingLocation(href), page_title: doc.title })`. Las escuchas del paso 8 son `win.addEventListener('storage', …)` y `win.addEventListener('pageshow', …)`; las dos llaman a `reload()` si `consent() !== 'granted'` (en `storage`, solo si `event.key === CONSENT_KEY`; en `pageshow`, solo si `event.persisted`).
        *   `track(name, params)`: si `blocked`, o si `load()` no se ha ejecutado, no hace nada. En desarrollo, si `name` no está en `CATALOG` o si un parámetro sobra, escribe un `console.warn`. Después llama a `gtag('event', name, { ...cleanParams(name, params), districte })`, con el `districte` que recibió `load()`.

#### 2. `src/lib/analytics.test.js` (Create)

*   **Type / Scope:** pruebas unitarias con `node --test`.
*   **Dobles de prueba:**
    *   `storage`: un `Map` con `getItem`, `setItem` y `removeItem`; otra versión cuyo `getItem` lanza.
    *   `doc`: `{ title: 'Agenda', cookies: [], set cookie(value) { this.cookies.push(value) }, head: { children: [], append(el) { this.children.push(el) } }, createElement: (tag) => ({ tagName: tag }) }`.
    *   `win`: `{ listeners: {}, addEventListener(type, fn) { this.listeners[type] = fn } }`.
    *   `reload`: una función que cuenta las llamadas.
    *   `now`: `() => NOW`, con un `NOW` fijo.
*   **Casos:**
    *   `readConsent`:
        *   da `unknown` sin valor, con JSON roto, con `v:2`, con `analytics:'maybe'`, con `at` en el futuro, con 396 días de antigüedad, con un `storage` nulo y con uno que lanza;
        *   da `granted` y `denied` con 394 días de antigüedad.
    *   `isAdmin`: `true` con `?admin` y con `?e=x&admin=1`; `false` con `?e=admin-1`.
    *   `landingLocation`:
        *   quita `ga_debug` en `?ga_debug`, `?ga_debug=1` y `?e=x&ga_debug&utm_source=y`;
        *   conserva el `#fragmento`;
        *   no cambia `?e=a%20b&admin`;
        *   con solo `?ga_debug` devuelve la URL sin `?`.
    *   `cleanParams`:
        *   descarta `nom` y `request_id`;
        *   cambia `error_type:'xyz'` y `resultat:'xyz'` por `other`;
        *   recorta un valor de 150 caracteres.
    *   `ERROR_TYPES` contiene todas las claves de `T.signupErrors` menos `empty`.
    *   `createAnalytics({ id: '' })`, sin más dependencias: `enabled` es `false`, `consent()` devuelve `unknown`, y `load`, `track`, `accept` y `reject` no lanzan.
    *   `load`:
        *   con `?admin` en `href` no añade ningún script ni escribe en `dataLayer`;
        *   añade un solo `<script>`, aunque se llame dos veces;
        *   cada entrada de `win.dataLayer` es un objeto `arguments` (`Object.prototype.toString.call(entry) === '[object Arguments]'`);
        *   pone en `dataLayer`, en este orden, `consent default`, `js`, `set {districte}`, `config` con `send_page_view:false`, `cookie_domain:'none'`, `cookie_path`, `cookie_expires:34128000`, `allow_google_signals:false` y `allow_ad_personalization_signals:false`, y un único `page_view` con `page_location` sin `ga_debug`;
        *   `debug_mode` vale `true` solo con `ga_debug` o `dev`;
        *   registra las escuchas `storage` y `pageshow`.
    *   `track`:
        *   antes de `load` no escribe nada;
        *   después de `load` escribe `['event', name, { …, districte }]`;
        *   con `?admin` no escribe nada.
    *   `reject` después de `load`:
        *   pone `win['ga-disable-G-X']` a `true`;
        *   envía `consent update` con `analytics_storage:'denied'`;
        *   escribe exactamente dos cookies, `_ga=; max-age=0; path=/base` y `_ga_X=; max-age=0; path=/base`;
        *   guarda `denied` y llama a `reload` una vez.
    *   `reject` sin `load`: escribe las mismas dos cookies, guarda `denied` y no llama a `reload`.
    *   Escuchas:
        *   `storage` con `key: CONSENT_KEY` y `denied` guardado llama a `reload`; con `granted` no;
        *   `pageshow` con `persisted: true` y `denied` guardado llama a `reload`; con `persisted: false` no.

#### 3. `src/routes/+layout.svelte` (Modify)

*   **Type / Scope:** layout de Svelte 5.
*   **Proposed Changes:**
    *   Imports:
        *   `browser` de `$app/env`, `page` de `$app/state`, `resolve` de `$app/paths`, `onMount` y `setContext` de `svelte`;
        *   `createAnalytics` de `#lib/analytics.js` y `browserStorage` de `#lib/api.js`;
        *   `ConsentBanner` de `#lib/components/ConsentBanner.svelte` y `Footer` de `#lib/components/Footer.svelte`.
    *   Al iniciar el componente, en este orden:
        *   `districte = page.data.district?.slug ?? 'cap'`.
        *   `analytics`:

            ```js
            const analytics = browser
              ? createAnalytics({
                  id: import.meta.env.VITE_GA_ID ?? '',
                  storage: browserStorage(),
                  doc: document,
                  win: window,
                  href: location.href,
                  cookiePath: resolve('/[[districte]]', { districte: '' }).replace(/\/$/, '') || '/',
                  dev: import.meta.env.DEV,
                  now: Date.now,
                  reload: () => location.reload()
                })
              : createAnalytics({ id: '' });
            ```

        *   `setContext('analytics', analytics)`.
        *   `if (analytics.consent() === 'granted') analytics.load(districte)`. Está fuera de `onMount` a propósito: así se ejecuta antes que el `onMount` de la página, que puede enviar `event_detail_view`. En el prerender la instancia está inactiva y no hace nada.
    *   Estado: `let consent = $state(/** @type {import('#lib/analytics.js').ConsentState} */ ('unknown'))` y `let bannerOpen = $state(false)`.
    *   `onMount`: `consent = analytics.consent()` y `bannerOpen = analytics.enabled && consent === 'unknown'`. La franja se decide en `onMount` y no al iniciar, para que el HTML prerenderizado (sin franja) y el primer render en el navegador coincidan al hidratar.
    *   Markup, en este orden: `{@render children()}`, `<Footer showConsent={analytics.enabled} onconsent={() => (bannerOpen = true)} />` y `{#if bannerOpen}<ConsentBanner current={consent} onaccept={…} onreject={…} />{/if}`.
        *   `onaccept`: `analytics.accept(districte)`, `consent = 'granted'`, `bannerOpen = false` y el foco a `<main>`.
        *   `onreject`: `analytics.reject()`, `consent = 'denied'`, `bannerOpen = false` y el foco a `<main>`. Si `reject` recarga la página, lo demás no llega a verse.
    *   Foco a `<main>`: `const main = document.querySelector('main')`, `main?.setAttribute('tabindex', '-1')` y `main?.focus({ preventScroll: true })`.
    *   Los estilos globales no cambian.

#### 4. `src/lib/components/ConsentBanner.svelte` (Create)

*   **Type / Scope:** componente de Svelte 5.
*   **Proposed Changes:**
    *   Props: `{ current: import('#lib/analytics.js').ConsentState, onaccept: () => void, onreject: () => void }`.
    *   Markup: `<section class="consent" aria-label={T.consent.label}>` con:
        *   el texto `T.consent.text`;
        *   si `current !== 'unknown'`, la línea `T.consent.now(current)`;
        *   el enlace `T.consent.more` a `resolve('/galetes')`, con `data-sveltekit-reload`;
        *   dos `<button type="button" class="choice">` con `T.consent.accept` y `T.consent.reject`.

        Ningún botón tiene `autofocus`.
    *   Estilos:
        *   `.consent`: `position: sticky; bottom: 0; z-index: 1`, `max-height: 30vh; overflow-y: auto`, `padding` y `padding-bottom: max(1rem, env(safe-area-inset-bottom))`, fondo `--lime-light`, borde superior `--ink` y texto `--ink`.
        *   `.choice`: los dos botones con la misma regla, fondo `--ink`, texto `--page`, fuente `--font-display` y el mismo tamaño mínimo de toque (44 px).
        *   `:global(body:has(dialog[open])) .consent { display: none }`.
    *   No escucha Escape ni ninguna otra tecla.

#### 5. `src/lib/components/Footer.svelte` (Create)

*   **Type / Scope:** componente de Svelte 5.
*   **Proposed Changes:**
    *   Props: `{ showConsent: boolean, onconsent: () => void }`.
    *   `<footer>` con:
        *   `{#if showConsent}<button type="button">{T.footer.consent}</button>{/if}`, que llama a `onconsent`;
        *   `<a href={resolve('/galetes')} data-sveltekit-reload>{T.footer.policy}</a>`;
        *   `<a href="https://barcelonaencomu.cat/politica-de-privacitat/" target="_blank" rel="noopener noreferrer">{T.footer.privacy}<span class="sr-only"> {T.newTab}</span></a>`.
    *   Estilos: texto pequeño centrado, color `--ink` y separación con el contenido.

#### 6. `src/routes/galetes/+page.svelte` (Create)

*   **Type / Scope:** página estática prerenderizada (hereda `prerender = true` de `+layout.js`). La build genera `build/galetes.html`.
*   **Proposed Changes:**
    *   `<svelte:head>` con `<title>{T.cookiesPage.title}</title>`.
    *   `<main>` con un `h1` y las secciones del apéndice *Textos de `/galetes`*, tomadas de `T.cookiesPage`.
    *   La tabla de cookies es un `<table>` con `<caption>` y las filas fijas del apéndice, incluida `_ga_XX3RJ48NN2`.
    *   Enlace de vuelta `T.cookiesPage.back` a `resolve('/[[districte]]', { districte: '' })`, con `data-sveltekit-reload`.
    *   No usa `Header`, porque `Header` lee el contexto `district`, que aquí no existe.

#### 7. `src/routes/[[districte]]/+page.svelte` (Modify)

*   **Type / Scope:** página de Svelte 5.
*   **Proposed Changes:**
    *   Añadir `getContext` al import de `svelte` y `const analytics = /** @type {import('#lib/analytics.js').Analytics} */ (getContext('analytics'))`.
    *   `import { shareUrl } from '#lib/share.js'` en lugar de `detailUrl`. `detailLink` pasa a ser `shareUrl(location, detailEvent.id)`.
    *   Tres ayudas locales:
        *   `/** @param {string} id */ const findEvent = (id) => data?.events.find((e) => e.id === id) ?? null`;
        *   `/** @param {import('#lib/events.js').AgendaEvent} event */ const base = (event) => ({ activitat_id: event.id, activitat_tipus: event.type })`;
        *   `/** @param {import('#lib/events.js').AgendaEvent} event */ const signupParams = (event) => ({ ...base(event), externa: event.externalUrl ? 'si' : 'no' })`.
    *   `openDetail(id)`: después de `detailId = id`, `const event = findEvent(id)` y, si existe, `analytics.track('event_detail_view', { ...base(event), origen: 'card' })`.
    *   Rama `?e=` de `onMount`: después de `detailId = linkedId`, lo mismo con `findEvent(linkedId)` y `origen: 'link'`.
    *   `signupDone` no cambia.
    *   `openSignup(id)`: después de `signupId = id`, `const event = findEvent(id)` y, si existe, `analytics.track('signup_start', signupParams(event))`.
    *   `signup(name)`, en este orden:

        ```js
        const id = signupId;
        if (!api || !id || !data) return { ok: false, error: 'server' };
        const event = findEvent(id);
        const params = event ? signupParams(event) : { activitat_id: id };
        let result;
        try {
          result = await api.signup(id, name, data.signups.get(id)?.length ?? 0);
        } catch (error) {
          analytics.track('signup_error', { ...params, error_type: 'exception' });
          throw error;
        }
        analytics.track(result.ok ? 'signup_success' : 'signup_error', result.ok ? params : { ...params, error_type: result.error });
        // … el resto de la función no cambia
        ```

        El `return` inicial no envía nada, igual que antes.
    *   `unsignup(eventId, requestId)`: después del `await`, `analytics.track('unsignup', { activitat_id: eventId, resultat: result.ok ? 'ok' : 'error' })`.

#### 8. `src/lib/components/EventDetail.svelte` (Modify)

*   **Type / Scope:** componente de Svelte 5.
*   **Proposed Changes:**
    *   `getContext` en el import de `svelte` y `const analytics = /** @type {import('#lib/analytics.js').Analytics} */ (getContext('analytics'))`.
    *   Función local `report(itemId, imatge, resultat)`: `analytics.track('share', { method: 'web_share', content_type: 'activitat', item_id: itemId, imatge, resultat })`.
    *   `shareFirst`:
        *   guarda `const itemId = event.id` al principio, antes de cualquier `await`;
        *   tras `generate()`, si `!file && !stale`, llama a `report(itemId, 'default', 'generation_failed')`; si la generación termina porque el detalle se cerró (`stale`), no envía nada: no hubo intento;
        *   tras `await shareImage(...)`, si el resultado no es `needs-second-tap`, llama a `report(itemId, 'default', outcome)` antes de `if (token !== epoch) return`.
    *   `shareSecond`: guarda `itemId` antes de llamar y llama a `report(itemId, 'default', outcome)` como primera línea del `then`.
    *   `startCustomShare`: guarda `itemId` y, con el `outcome` (o `'error'` si la promesa falla), llama a `report(itemId, 'custom', outcome)` antes de `settleCustomShare`, salvo con `needs-second-tap`.
    *   Elegir un archivo que no es una imagen, o cancelar el selector, no envía nada: todavía no hay intento de compartir.
    *   Enlace «Obre WhatsApp amb el text» (`href={waLink(text)}`): `onclick` envía `analytics.track('share', { method: 'whatsapp_link', content_type: 'activitat', item_id: event.id, imatge: 'default', resultat: 'opened' })`.
    *   Enlace del mapa del detalle: `onclick` envía `analytics.track('map_click', { activitat_id: event.id, origen: 'detail' })`.
    *   No hay props nuevas: la URL con UTMs llega en la prop `url` que ya existe.

#### 9. `src/lib/components/EventCard.svelte` (Modify)

*   **Type / Scope:** componente de Svelte 5.
*   **Proposed Changes:** `getContext('analytics')` con el mismo cast que en `EventDetail`. El enlace del mapa de la tarjeta (el que apunta a `google.com/maps`) recibe `onclick` y envía `map_click` con `{ activitat_id: event.id, origen: 'card' }`. El enlace «detall» no cambia: su `onclick` llama a `ondetail` y la página envía la vista.

#### 10. `src/lib/components/SignupDialog.svelte` (Modify)

*   **Type / Scope:** componente de Svelte 5.
*   **Proposed Changes:** `getContext('analytics')` con el mismo cast. El enlace `T.dialog.goExternal` («Ves a la inscripció externa ↗») recibe `onclick`, que envía `external_link_click` con `{ activitat_id: event.id }`. El envío del formulario externo no cambia; su resultado lo mide `signup()` en la página.

#### 11. `src/lib/share.js` (Modify)

*   **Type / Scope:** módulo JavaScript.
*   **Proposed Changes:** nueva función exportada `shareUrl(location, id)`. Devuelve `` `${detailUrl(location, id)}&utm_source=compartir&utm_medium=share` ``. `detailUrl` no cambia.

#### 12. `src/lib/share.test.js` (Modify)

*   **Type / Scope:** pruebas unitarias.
*   **Proposed Changes:** casos nuevos:
    *   `shareUrl` en la raíz y en `/eixample`;
    *   un `id` con caracteres que hay que codificar;
    *   una `location` con query previa (`?admin&e=x`), que no se copia.

    Los tests existentes de `detailUrl` no cambian.

#### 13. `src/lib/events.test.js` (Modify)

*   **Type / Scope:** pruebas unitarias.
*   **Proposed Changes:** un caso nuevo en el que `parseEventParam('?e=sm-12&utm_source=compartir&utm_medium=share')` devuelve `'sm-12'`.

#### 14. `src/lib/districts.js` (Modify)

*   **Type / Scope:** módulo JavaScript.
*   **Proposed Changes:** `export const RESERVED_SLUGS = Object.freeze(['galetes'])`, con un comentario que explique que son rutas estáticas que tienen prioridad sobre `[[districte]]`.

#### 15. `src/lib/districts.test.js` (Modify)

*   **Type / Scope:** pruebas unitarias.
*   **Proposed Changes:** un caso nuevo que comprueba que ningún `ROUTED_DISTRICTS[i].slug` está en `RESERVED_SLUGS`, y que `ROOT_DISTRICT.slug` tampoco.

#### 16. `src/lib/texts.js` (Modify)

*   **Type / Scope:** textos en catalán.
*   **Proposed Changes:** tres grupos nuevos dentro de `T`, con los textos exactos de *Franja de consentimiento* y del apéndice:
    *   `consent`: `label` («Galetes»), `text`, `more` («Més informació»), `accept` («Acceptar»), `reject` («Rebutjar») y `now(state)` («Ara: acceptades» o «Ara: rebutjades»).
    *   `footer`: `consent` («Galetes»), `policy` («Política de galetes») y `privacy` («Privacitat (Barcelona en Comú) ↗»).
    *   `cookiesPage`: `title`, `heading`, `sections` (una lista de `{ heading, paragraphs }`), `table` (`caption`, `headers` y `rows`), `updated` y `back`.

#### 17. `.github/workflows/deploy.yml` (Modify)

*   **Type / Scope:** configuración de CI.
*   **Proposed Changes:**
    *   Nuevo paso «Comprovar l'ID de Google Analytics», después de «Comprovar la URL de l'Apps Script», con `env: GA_ID: ${{ vars.GA_ID }}`:
        *   si está vacío: `echo "::warning::Falta la variable GA_ID: el web es publicarà sense analítica."` y continúa;
        *   si no cumple `^G-[A-Z0-9]+$`: `echo "::error::GA_ID no té el format G-XXXXXXXXXX (valor actual: $GA_ID)."` y `exit 1`.
    *   En el paso `npm run build`, añadir `VITE_GA_ID: ${{ vars.GA_ID }}` a `env`.

#### 18. `e2e/serve.js` (Modify)

*   **Type / Scope:** servidor de las pruebas.
*   **Proposed Changes:** añadir `VITE_GA_ID: 'G-TEST000000'` a `env`, para que la build de pruebas tenga la franja y el botón «Galetes».

#### 19. `e2e/script.js` (Modify)

*   **Type / Scope:** helper de Playwright.
*   **Proposed Changes:**
    *   `ScriptOptions` gana `consent?: 'denied' | 'granted' | null`. Por defecto vale `'denied'`.
    *   Si no es `null`, `page.addInitScript` escribe `agenda-front-ampli:consent` con `{v:1, analytics:consent, at:CONSENT_AT}` **solo si `localStorage.getItem('agenda-front-ampli:consent') === null`**. Así, una decisión tomada durante la prueba (por ejemplo, **Rebutjar** antes de una recarga) no se pisa.
    *   `CONSENT_AT = Date.parse(TODAY) - 9 * 86_400_000`, con `TODAY` importado de `./helpers.js`. Es una fecha fija porque el init script corre antes de que `openAgenda` fije el reloj; con `Date.now()` real, el valor quedaría en el futuro respecto del reloj de la prueba y no sería válido.
    *   Dos rutas, `page.route('**/*googletagmanager.com/**', …)` y `page.route('**/*google-analytics.com/**', …)`, que cubren los subdominios regionales:
        *   `gtag/js`: responde con un script vacío (`contentType: 'text/javascript'`, `body: ''`);
        *   cualquier otra petición: la aborta.

        Las dos anotan la URL en `googleRequests`.
    *   El objeto devuelto gana `googleRequests: () => string[]`.

#### 20. `e2e/analytics.spec.js` (Create)

*   **Type / Scope:** pruebas de Playwright (proyectos `chromium` y `mobile`).
*   **Proposed Changes:**
    *   Helper local `events(page)`: `page.evaluate(() => (window.dataLayer ?? []).map((entry) => Array.from(entry)))`, filtrado a las entradas `['event', name, params]`.
    *   Casos:
        1.  **CUJ 1:** `consent: null` en `./eixample`. La franja es visible; tras **Acceptar** desaparece, el foco está en `main`, hay un solo `<script src*="gtag/js">`, hay un `page_view` con `districte: 'eixample'` y el `localStorage` tiene `granted`.
        2.  **CUJ 2:** `consent: null` en `./`. Tras **Rebutjar**, `googleRequests()` está vacío. Después se recarga `./eixample`: no hay franja ni peticiones a Google.
        3.  **CUJ 3:** `consent: null` con `query: 'e=acte-1&utm_source=compartir&utm_medium=share'`. Con el detalle abierto, la franja no es visible. Se cierra el detalle y se pulsa **Acceptar**. Hay un solo `page_view`, su `page_location` contiene `e=acte-1` y `utm_source=compartir`, y no hay `event_detail_view`. Después se abre el detalle de `accio-1` desde su tarjeta y aparece `event_detail_view` con `origen: 'card'`.
        4.  **CUJ 3 con consentimiento:** `consent: 'granted'` con `query: 'e=acte-1'`. Hay un `event_detail_view` con `origen: 'link'`, y en `dataLayer` aparece después del `page_view`.
        5.  **CUJ 4, propia:** `consent: 'granted'`. **Participar** en `accio-1`, nombre válido y enviar. Aparecen `signup_start` y `signup_success` con `externa: 'no'`. Ningún parámetro contiene el nombre escrito.
        6.  **CUJ 4, error:** `consent: 'granted'` y `options: { busy: true }`. **Participar** en `accio-1`, nombre válido y enviar. Aparece `signup_error` con `error_type: 'busy'`.
        7.  **CUJ 4, externa:** `consent: 'granted'`, con `mockWindowOpen`, en `ext-1`. Aparece `signup_success` con `externa: 'si'` aunque el diálogo ya esté cerrado.
        8.  **Mapa:** `consent: 'granted'`. Antes del clic, `context.route('https://www.google.com/maps/**', (route) => route.fulfill({ body: '' }))`. Un clic en el enlace del mapa de la tarjeta de `accio-1` envía `map_click` con `origen: 'card'`. El evento se comprueba en la página de la agenda, no en la pestaña nueva.
        9.  **Desapuntarse:** `consent: 'granted'`. Inscribirse en `accio-1` y pulsar dos veces «Desapuntar-me de…» en la tarjeta, como en el test «baixa des de la targeta» de `signup.spec.js`. Aparece `unsignup` con `resultat: 'ok'`.
        10. **Enlace externo:** `consent: 'granted'`, `seedMine(page, ['ext-1'])` y la ruta de la web externa, como en el test «qui ja s'ha apuntat veu l'enllaç a la web externa al modal» de `external.spec.js`. Un clic en «Ves a la inscripció externa ↗» envía `external_link_click` con `activitat_id: 'ext-1'`.
        11. **CUJ 5:** `consent: 'granted'`. Con `mockShare(page, ['ok'])`, **Comparteix** envía `share` con `method: 'web_share'`, `imatge: 'default'` y `resultat: 'shared'`, y el texto compartido contiene `utm_source=compartir&utm_medium=share`. Con `mockShare(page, ['AbortError'])`, `share` lleva `resultat: 'aborted'`.
        12. **CUJ 6:** `consent: 'granted'`. Antes de nada se crean con `document.cookie` las cookies `_ga` y `_ga_TEST000000` en la ruta base. Después se pulsa **Galetes** › **Rebutjar**. Se espera la recarga; las dos cookies ya no existen, el `localStorage` tiene `denied` (el init script no lo pisa) y no hay ningún `<script src*="gtag/js">`.
        13. **Otra pestaña:** `consent: 'granted'` en dos páginas del mismo contexto. **Galetes** › **Rebutjar** en la primera; la segunda se recarga (`waitForEvent('load')`) y no tiene `<script src*="gtag/js">`.
        14. **Admin:** `consent: 'granted'` con `query: 'admin'`: no hay `<script src*="gtag/js">` ni eventos. El botón «Galetes» del pie sigue visible.
        15. **`/galetes`:** se carga con `data-sveltekit-reload` desde el pie, muestra la tabla con `_ga_XX3RJ48NN2` y el enlace de vuelta lleva a `./`.
    *   Todos los casos terminan comprobando que ninguna petición a `google-analytics.com` llegó a salir: `googleRequests()` solo contiene, como mucho, `gtag/js` y peticiones abortadas.

#### 21. `e2e/share.spec.js` (Modify)

*   **Type / Scope:** pruebas de Playwright existentes.
*   **Proposed Changes:**
    *   `DETAIL_URL` pasa a `` `http://localhost:5300/agenda-front-ampli/?e=${ID}&utm_source=compartir&utm_medium=share` ``. `EXPECTED_TEXT` y `WA_LINK` se derivan de él y no cambian de forma.
    *   En el test «imatge pròpia en una inscripció externa: el text enllaça al detall de l'app», el texto esperado termina en `?e=ext-1&utm_source=compartir&utm_medium=share`.
    *   Buscar en el archivo cualquier otra URL literal con `?e=` dentro de un texto compartido y añadirle los mismos UTMs. Los `href` de las tarjetas (`?e=ID` sin UTMs) no cambian.

#### 22. `e2e/README.md` (Modify)

*   **Type / Scope:** documentación.
*   **Proposed Changes:**
    *   Explicar la opción `consent` de `installScript`: su valor por defecto es `'denied'`, por eso los specs existentes no ven la franja, y solo se escribe si la clave no existe.
    *   Explicar el `CONSENT_AT` derivado de `TODAY`.
    *   Explicar que las peticiones a Google se interceptan, que `gtag/js` es un script vacío que no crea cookies, y que `analytics.spec.js` lee `window.dataLayer`. Las pruebas no demuestran el comportamiento real de Google; eso se comprueba con DebugView.

#### 23. `src/lib/README.md` (Modify)

*   **Type / Scope:** documentación.
*   **Proposed Changes:**
    *   *Interface*: añadir `analytics.js` (`createAnalytics`, `readConsent`, `writeConsent`, `isAdmin`, `landingLocation`, `cleanParams`, `CATALOG`, los tipos `Analytics` y `ConsentState`), `shareUrl` y `RESERVED_SLUGS`.
    *   *Invariants*: los componentes solo hablan con Google a través de `track()`, ningún parámetro lleva datos personales y `detailUrl` no lleva UTMs.
    *   *Side Effects*: `analytics.js` escribe la clave de consentimiento, inserta `gtag.js`, registra escuchas `storage` y `pageshow`, y borra las cookies `_ga` al rechazar.

#### 24. `src/lib/components/README.md` (Modify)

*   **Type / Scope:** documentación.
*   **Proposed Changes:**
    *   *Interface*: añadir `ConsentBanner` y `Footer`, y el contexto `analytics`, que leen `EventCard`, `EventDetail` y `SignupDialog`.
    *   *Invariants*: el resultado de compartir se registra antes de las comprobaciones de `epoch` y `token`.

#### 25. `src/routes/README.md` (Modify)

*   **Type / Scope:** documentación.
*   **Proposed Changes:**
    *   *Overview* e *Interface*: añadir la ruta `/galetes` y lo que hace ahora el layout (crea `analytics` solo en el navegador, publica el contexto, llama a `load()` al iniciar si hay consentimiento, muestra `Footer` y `ConsentBanner`). En la lista de la página, cambiar `detailUrl` por `shareUrl`.
    *   *Invariants*: un solo `page_view` por carga de página, y los enlaces entre `/galetes` y la agenda recargan la página.
    *   *Side Effects*: con consentimiento, el layout carga `gtag.js` y Google crea las cookies `_ga` en la ruta base.

#### 26. `README.md` (Modify)

*   **Type / Scope:** documentación de mantenimiento, en castellano.
*   **Proposed Changes:**
    *   En *Puesta en marcha › 2. GitHub*: crear la variable de repositorio `GA_ID` con el valor `G-XX3RJ48NN2`.
    *   Sección nueva *Analítica y galetes* después de *Inscripciones*, con:
        *   qué se mide: un enlace a la tabla de eventos de este diseño;
        *   la lista de comprobación de la configuración de GA4, copiada de *Configuración de GA4* con las 8 dimensiones;
        *   cómo comprobar con `?ga_debug` y DebugView;
        *   cómo apagar la analítica borrando `GA_ID`;
        *   cómo añadir un evento:
            1.  añadirlo a `CATALOG` en `analytics.js` y a `analytics.test.js`;
            2.  si lleva un parámetro nuevo, crear su dimensión de evento en GA4;
            3.  si cambia lo que se recoge, actualizar `T.cookiesPage` y la fecha de `/galetes`.
    *   En *Decisiones y límites*: la analítica solo funciona con consentimiento y se pierden las visitas que rechazan.
    *   En *System Overview* y *Global Side Effects*: el sitio puede cargar `gtag.js` y crear las cookies `_ga` con consentimiento.

#### 27. `docs/designs/analitica-ga4-galetes.md` (Modify)

*   **Type / Scope:** este documento de diseño, que ya existe.
*   **Proposed Changes:** cambiar *Status* a «Implemented» al fusionar el PR. `design_draft.md`, `concepts_brief.md` y los informes de revisión de la raíz del repositorio no se incluyen en el PR.

### Verification Plan

*   **Compilación:** `npm run build` con `VITE_GA_ID=G-TEST000000` y `BASE_PATH=/agenda-front-ampli`. Debe terminar sin errores (el prerender no puede tocar `document`) y debe existir `build/galetes.html`.
*   **Análisis estático:** `npm run check` sin errores ni avisos nuevos.
*   **Pruebas unitarias:** `npm test`. Incluye `analytics.test.js` y los casos nuevos de `share`, `events` y `districts`.
*   **E2E:** `npm run test:e2e -- --project=chromium --project=mobile`. Los specs existentes pasan; solo `share.spec.js` cambia sus URLs esperadas. `analytics.spec.js` pasa completo.
*   **Cobertura del catálogo:** cada uno de los 9 eventos del catálogo aparece en al menos un caso de `analytics.spec.js`: `page_view` (1), `event_detail_view` (3, 4), `map_click` (8), `signup_start` y `signup_success` (5), `signup_error` (6), `unsignup` (9), `external_link_click` (10), `share` (11).
*   **Manual, después de publicar:**
    1.  Hacer la lista de comprobación de *Configuración de GA4* antes de crear `GA_ID`.
    2.  Abrir `https://jimi75.github.io/agenda-front-ampli/eixample?ga_debug` en una ventana privada y pulsar **Acceptar**. En DebugView debe salir `page_view` con `districte=eixample`.
    3.  Abrir el detalle de una actividad (`event_detail_view`), pulsar su mapa (`map_click`), **Participar** y enviar un nombre de prueba (`signup_start`, `signup_success`), desapuntarse (`unsignup`) y **Comparteix** (`share`). Cada evento debe salir en DebugView con `districte`.
    4.  En las herramientas del navegador, comprobar que antes de **Acceptar** no sale ninguna petición a `googletagmanager.com`, que las cookies `_ga` tienen ruta `/agenda-front-ampli` y ningún dominio, y que después de **Galetes** › **Rebutjar** no quedan cookies `_ga`.

    `signup_error` y `external_link_click` no se fuerzan en producción: los cubren los casos 6 y 10 del e2e.

## Appendix: Textos de `/galetes`

Textos finales en catalán para `T.cookiesPage`. La implementación los copia tal cual.

*   **`title`:** «Política de galetes · Agenda Frontamplista»
*   **`heading`:** «Política de galetes»
*   **Què són les galetes.** «Les galetes són petits fitxers que un web desa al teu navegador. Aquest web també desa informació al teu navegador amb l'emmagatzematge local (localStorage), que funciona de manera semblant.»
*   **Què fem servir.** Tabla con `caption` «Galetes i dades desades al navegador» y cabeceras «Nom», «Titular», «Finalitat», «Durada» y «Tipus»:

    | Nom | Titular | Finalitat | Durada | Tipus |
    | --- | --- | --- | --- | --- |
    | `_ga` | Google | Distingir navegadors per comptar visites | 13 mesos | Analítica, opcional |
    | `_ga_XX3RJ48NN2` | Google | Mantenir l'estat de la sessió de Google Analytics | 13 mesos | Analítica, opcional |
    | `agenda-front-ampli:consent` | Agenda Frontamplista | Recordar si has acceptat o rebutjat les galetes d'analítica | 13 mesos | Necessària |
    | `agenda-…` | Agenda Frontamplista | Còpia de l'agenda per obrir-la sense connexió i les teves inscripcions (inclou el nom i el codi per desapuntar-te) | Fins que l'esborris | Necessària |

*   **Què recollim.** «Si acceptes, Google Analytics rep quines pàgines i activitats mires, si obres el mapa, si comences, acabes o anul·les una inscripció, si comparteixes una activitat i el districte de l'agenda. No enviem el teu nom ni cap text que escriguis. Google guarda aquestes dades associades a un identificador del teu navegador, sense el teu nom.»
*   **Qui rep les dades.** «Google Ireland Limited, que pot transferir les dades als Estats Units sota el Marc de Privacitat de Dades UE-EUA (EU-US Data Privacy Framework). Hem desactivat Google signals i la personalització d'anuncis.»
*   **Quant de temps.** «Google Analytics conserva les dades 14 mesos. Les galetes `_ga` caduquen als 13 mesos.»
*   **Responsable.** «La coordinació de l'Agenda Frontamplista de Barcelona en Comú Sants-Montjuïc, que gestiona aquesta analítica per als tres districtes. Contacte: santsmontjuic@bcnencomu.cat. La [política de privacitat de Barcelona en Comú](https://barcelonaencomu.cat/politica-de-privacitat/) s'aplica a les inscripcions, però no a aquesta analítica.»
*   **Com canviar d'opinió.** «Prem «Galetes» al peu de qualsevol pàgina de l'agenda i tria «Rebutjar». Esborrarem les galetes `_ga` i deixarem d'enviar dades. També pots esborrar les galetes des de la configuració del navegador.»
*   **`updated`:** «Actualitzat el 15 de novembre de 2026.»
*   **`back`:** «Torna a l'agenda»

--------------------------------------------------------------------------------

*Drafted with EGM*
