# Pedir el nombre antes de abrir la inscripción externa

*   **Author:** Juan Peist
*   **Status:** Proposed
*   **Date:** 2026-11-15

--------------------------------------------------------------------------------

## Overview

Algunos eventos de la agenda tienen una URL de inscripción en otra web (columna `inscripcio_url` de la hoja). Hoy, el botón **Participar** de esos eventos es un enlace que abre esa web en una pestaña nueva. La app no guarda nada, así que el evento no muestra recuento ni lista de personas apuntadas.

Con este diseño, esos eventos funcionan como los demás:
*   **Participar** abre el modal de nombre o alias.
*   Al enviarlo, la app abre la web externa en una pestaña nueva y guarda una inscripción normal en segundo plano.
*   Después cierra el modal y muestra el detalle del evento.
*   El evento pasa a mostrar recuento, lista de nombres y **Desapuntar-me**, igual que cualquier otro evento abierto.

El backend (`apps-script/Code.gs`) no cambia: ya acepta inscripciones para cualquier evento que exista.

**Contexto.**
*   Los eventos y las inscripciones viven en una hoja de Google, y un Apps Script hace de API.
*   La celda `Config!B1` abre (`SI`) o cierra (`NO`) las inscripciones de toda la agenda. La app la recibe como `signupsOpen`.
*   Cada navegador guarda sus propias inscripciones en `localStorage` (clave `my-signups`), solo cuando el servidor confirma el guardado.
*   Si la respuesta del servidor se pierde y la recuperación (`recover()` en `api.js`) tampoco la encuentra, el resultado es `unconfirmed` y no se guarda nada en local.
*   La baja (**Desapuntar-me**) solo existe si el servidor activa la funcionalidad `unsignup`.

Para más detalle, consulta `src/lib/README.md` y `src/routes/README.md`.

**Términos.** En este documento:
*   **Evento externo** es un evento con `externalUrl` no vacío (columna `inscripcio_url`).
*   **Web externa** es esa URL.
*   **Pestaña nueva** es la pestaña que se abre para ella.

## The Problem

El equipo no tiene acceso a los datos de las plataformas externas. Por eso no sabe cuántas personas piensan ir a un evento externo. Además, quien consulta la agenda no ve ninguna señal de interés en esos eventos, aunque sí la ve en los demás.

Las webs externas sirven para recoger contactos (*leads*), no para planificar el evento. Al equipo le basta con una estimación propia de cuántas personas irán.

**Solución:** pedir el nombre en la app antes de enviar a la persona a la web externa, y guardarlo como cualquier otra inscripción.

La lista resultante es una estimación. Sus límites están en *Risks & Mitigations*.

## Goals

*   En un evento externo con inscripciones abiertas, **Participar** abre el mismo modal de nombre que el resto de eventos.
*   Al enviar un nombre válido, la web externa se abre en una pestaña nueva **en el mismo gesto** del envío, antes de cualquier espera de red. Así el navegador no la bloquea.
*   Se guarda una inscripción normal mediante `api.signup`. Aparece en el recuento y en la lista igual que las demás.
*   La pestaña nueva se abre aunque el guardado falle.
*   Tras el envío, el modal se cierra y queda visible el detalle del evento.
*   Si este navegador ya tiene guardada una inscripción para ese evento, el modal muestra, además del formulario, un enlace a la web externa que se abre en una pestaña nueva.
*   Los eventos externos ofrecen **Desapuntar-me** con el mismo mensaje que los demás.
*   Con `Config!B1 = NO`, los eventos externos se muestran cerrados, como los demás, sin acceso a la web externa.
*   El texto que se comparte siempre enlaza con el detalle del evento en la app.
*   El flujo de los eventos sin `externalUrl` no cambia.

## Non-Goals

*   Comprobar si la persona completa la inscripción en la web externa. No hay ninguna comunicación con esa web.
*   Distinguir, en la app o en la hoja `Inscripcions`, las inscripciones de eventos externos de las demás.
*   Eliminar duplicados por nombre.
*   Pasar el nombre al formulario de la web externa.
*   Avisar a la persona si el guardado en segundo plano falla.
*   Cancelar la inscripción en la web externa cuando alguien se desapunta en la app.
*   Cambiar los límites del servidor (150 por evento, 3000 en total) o el backend.
*   Ofrecer un enlace a la web externa sin pedir el nombre a quien no tiene una inscripción en este navegador.

## Open Questions

*   Ninguna. Los riesgos aceptados están en *Risks & Mitigations*.

## Critical User Journeys (CUJs)

### CUJ 1: Primera inscripción en un evento externo desde la tarjeta

*   **Given**: Un evento externo futuro, no cancelado, con inscripciones abiertas y sin inscripción propia en este navegador.
*   **When**: La persona pulsa **Participar** en la tarjeta, escribe `Anna` y pulsa **Continua a la inscripció ↗**.
*   **Then**:
    *   La web externa se abre en una pestaña nueva.
    *   El modal se cierra y se abre el detalle del evento.
    *   Cuando termina el guardado, el recuento sube en uno, `Anna` aparece en la lista y la tarjeta muestra **Desapuntar-me** (si `unsignup` está activo).

### CUJ 2: Primera inscripción desde el detalle

*   **Given**: El detalle de un evento externo está abierto y no hay inscripción propia.
*   **When**: La persona pulsa **Participar** en el detalle, escribe un nombre válido y lo envía.
*   **Then**: La web externa se abre en una pestaña nueva, el modal se cierra y el detalle sigue visible. La lista se actualiza cuando termina el guardado.

### CUJ 3: Nombre no válido

*   **Given**: El modal de un evento externo está abierto.
*   **When**: La persona envía el nombre vacío o un nombre que `validateName` rechaza.
*   **Then**: El modal muestra el error de siempre, no se abre ninguna pestaña y no se envía ninguna petición de inscripción.

### CUJ 4: Fallo del guardado

*   **Given**: El modal de un evento externo, con la red caída o con el servidor respondiendo error.
*   **When**: La persona envía un nombre válido.
*   **Then**:
    *   La web externa se abre igualmente en una pestaña nueva y el modal se cierra. No aparece ningún aviso.
    *   **Si el servidor no recibió nada:** no hay fila en la hoja ni inscripción local. La próxima vez, **Participar** muestra el formulario sin el enlace.
    *   **Si el servidor guardó la fila pero se perdió la respuesta (`unconfirmed`):** el nombre aparece en la lista, pero este navegador no lo sabe y no puede borrarlo. Pasa igual hoy con los eventos normales (ver *Risks & Mitigations*).

### CUJ 5: Persona que vuelve

*   **Given**: Este navegador ya tiene una inscripción guardada para el evento externo.
*   **When**: La persona pulsa **Participar** en la tarjeta o en el detalle.
*   **Then**:
    *   Se abre el modal con el enlace **«Ves a la inscripció externa ↗»**.
    *   Al pulsarlo, la web externa se abre en una pestaña nueva y no se crea otra inscripción.
    *   El formulario sigue disponible por si quiere apuntar a otra persona.

### CUJ 6: Desapuntarse de un evento externo

*   **Given**: Una inscripción propia en un evento externo y la funcionalidad `unsignup` activa.
*   **When**: La persona pulsa **Desapuntar-me** dos veces en la tarjeta.
*   **Then**:
    *   La inscripción se borra de la app y aparece «T'has desapuntat.».
    *   La web externa no se toca.
    *   La próxima vez, **Participar** abre el modal sin el enlace.

### CUJ 7: Inscripciones cerradas

*   **Given**: `Config!B1 = NO`.
*   **When**: La persona mira un evento externo.
*   **Then**:
    *   La tarjeta muestra el recuento y **Veure apuntats**.
    *   El detalle muestra la nota de inscripciones cerradas, sin acceso a la web externa.

### CUJ 8: Compartir un evento externo

*   **Given**: El detalle de un evento externo.
*   **When**: La persona pulsa **Comparteix** o usa una imagen propia.
*   **Then**: El texto termina con `🔗 Més detalls i inscripcions: <URL del detalle en la app>`, no con la URL de la web externa.

## Technical Plan (Architecture)

### Idea central: los eventos externos son eventos abiertos

Hoy, `participationState` devuelve `'external'` para los eventos externos. Para ese estado, los componentes ocultan el recuento, la lista, **Desapuntar-me** y el modal. Esto se decide en cuatro condiciones repartidas entre `EventCard.svelte` y `EventDetail.svelte`, más `canShare`.

En lugar de añadir excepciones `|| 'external'` en cada una, el diseño **elimina el estado `'external'`**. Un evento externo pasa a ser `'open'` o `'closed'` según `signupsOpen`, igual que cualquier otro. Así:

*   El recuento, la lista, **Desapuntar-me** y la nota de inscripciones cerradas funcionan sin cambios, porque ya dependen de `'open'` y `'closed'`.
*   **Comparteix** ya se muestra para `'open'` y `'closed'`. Lo único que cambia es que `shareText` deja de usar `externalUrl` y siempre enlaza con el detalle de la app (CUJ 8).
*   Que las inscripciones cerradas oculten el acceso a la web externa es una consecuencia directa: el estado es `'closed'`.
*   Lo único propio de los eventos externos está en `SignupDialog.svelte`: el texto del botón de enviar, la apertura de la pestaña nueva y el enlace para quien vuelve.

**Participar** sigue llamando a `openSignup(id)` en la tarjeta y en el detalle, como en cualquier evento.

Prioridad nueva de `participationState`: `past`, `cancelled`, `closed`, `open`.

### Qué hace el modal de un evento externo

```text
 Participar (tarjeta o detalle) ──► openSignup(id) ──► SignupDialog
                                                         │
                         ¿mine tiene una inscripción de este evento?
                             sí ──► muestra además el enlace <a> a la web externa
                                                         │
                                          envío del formulario (submit)
                                                         │
                               validateName ── no válido ──► error en el modal, nada más
                                                         │ válido
                                                         ▼
                      ¿externalUrl? ── no ──►  flujo actual sin cambios (await, fase 'done')
                                                         │ sí
                                                         ▼
                      1. window.open(externalUrl, '_blank', 'noopener,noreferrer')   (sincrónico)
                      2. onsubmit(name)  ← sin await; page.signup() lee signupId en este momento
                      3. ondone(event.id) ← la página cierra el modal y abre el detalle
                                                         │
                                                         ▼
                      page.signup() termina en segundo plano:
                        ok    → addMine + recuento y lista actualizados
                        error → nada visible (el modal ya está cerrado)
```

**Por qué este orden (1 → 2 → 3):**

1.  **`window.open` antes que cualquier `await`.**
    *   Los navegadores solo permiten abrir una pestaña poco tiempo después del gesto de la persona. Safari para iOS es el más estricto, y no hay una cifra documentada.
    *   El guardado tarda segundos: timeout de 15 s en `config.js`, más un bloqueo de hasta 10 s en Apps Script.
    *   El repositorio ya aplica la misma regla en `shareImage` (`src/lib/share.js`).
2.  **`onsubmit` antes de `ondone`.**
    *   `signup()` en `+page.svelte` lee `signupId` de forma sincrónica al empezar.
    *   Si el modal se cerrara antes (`signupId = null`), `signup()` devolvería `server` sin enviar nada.
    *   Esta invariante queda documentada en un comentario.
3.  **`ondone` cierra el modal y abre el detalle:** `signupId = null; detailId = id`.
    *   Si el modal se abrió desde el detalle, el detalle ya está debajo.
    *   Si se abrió desde la tarjeta, se abre el detalle.

Hay una sola llamada a `window.open`, dentro de `submit`. El enlace para quien vuelve es un `<a>` normal y no la necesita.

`noopener` hace que `window.open` devuelva `null`, así que no se puede saber si el navegador bloqueó la pestaña. Se acepta: si el guardado ha ido bien, la próxima vez el modal muestra el enlace de la CUJ 5.

El acceso directo de quien vuelve se ofrece **dentro** del modal, y no en lugar del modal. Este es el único cambio respecto a `concepts_brief.md`: así hay una sola llamada a `window.open` y ninguna diferencia entre la tarjeta y el detalle.

### Textos y accesibilidad

*   **Botón de enviar en eventos externos:**
    *   El texto es **«Continua a la inscripció ↗»** (`T.dialog.submitExternal`).
    *   Su `aria-label` es `T.dialog.submitExternalLabel`: «Continua a la inscripció (s’obre en una pestanya nova)». Así la flecha no se lee en voz alta.
*   **Enlace para quien vuelve:**
    *   Es un `<a href={externalUrl} target="_blank" rel="noopener noreferrer">` con el texto `T.dialog.goExternal` («Ves a la inscripció externa ↗») y el `aria-label` `T.dialog.goExternalLabel`.
    *   Al ser un enlace normal, el navegador no lo bloquea, y se puede abrir con Ctrl+clic o con clic central.
*   **Texto de propósito:** «Apunta’t per avisar que hi vindràs.» no cambia.
*   **Aviso de privacidad:** el aviso del modal (`T.dialog.privacy`) también se muestra en los eventos externos.
*   **Nota del detalle:** `T.detail.externalNote` («La inscripció es fa en una web externa.») se mantiene en el detalle de los eventos externos abiertos, debajo de **Participar**.

### Lo que no cambia

*   `apps-script/Code.gs`, `api.js`, `my-signups.js`, `events.js`, `Calendar.svelte`, la hoja y los límites del servidor.
*   El flujo del modal para eventos sin `externalUrl`: espera, fase `done`, mensaje de éxito y lista propia.
*   La regla de prioridad `past` → `cancelled`, que ya cubren los tests.

## Risks & Mitigations

| Riesgo | Efecto | Decisión |
|---|---|---|
| Sobreconteo | Cuenta a quien se apunta en la app pero abandona la web externa, y los duplicados creados desde otros dispositivos o navegadores. | Aceptado: la lista es una estimación. |
| Infraconteo | No cuenta a quien llega a la web externa sin pasar por la app. | Aceptado. |
| Fallo silencioso del guardado (`network`, `busy`) | No se guarda nada y nadie avisa, porque la persona ya está en la pestaña nueva. La próxima vez ve el formulario sin el enlace. | Aceptado (Non-Goal). |
| Confirmación perdida (`unconfirmed`) | El servidor guardó la fila, pero este navegador no lo sabe. El nombre sale en la lista y no se puede borrar desde aquí. | Aceptado. Pasa igual hoy con los eventos normales. |
| Pestaña bloqueada (navegadores internos de apps) | No se abre la web externa. Si el guardado fue bien, el modal ofrece el enlace la próxima vez. | Aceptado. La prueba manual es obligatoria. |
| Evento completo (`event_full`, 150) | El error no se ve porque el modal ya está cerrado. `signup()` recarga la agenda en silencio, como ahora. El recuento deja de subir. | Aceptado. |
| Pausa de JS en iOS y en navegadores internos | La pestaña de la app puede quedar en pausa al abrirse la otra. El guardado termina tarde o como `unconfirmed`. | Aceptado. El timeout y `recover()` no cambian. |
| Tope de 3000 inscripciones | `signup()` pone `signupsOpen = false` y los eventos externos también salen cerrados durante esa sesión. | Aceptado, igual que con los demás eventos. |

## Alternatives Considered

### Alternativa A: abrir la pestaña después de guardar

*   **Pros**: La pestaña solo se abre si la inscripción se ha guardado. El orden es más intuitivo.
*   **Cons**: Safari para iOS bloquea `window.open` si pasa demasiado tiempo desde el toque, y el guardado tarda varios segundos. La persona se quedaría sin web externa.
*   **Reason for Rejection**: Es más importante abrir siempre la web externa, aunque falle el guardado, que abrirla solo cuando se guarda. En iOS, este orden no lo garantiza.

### Alternativa B: abrir `about:blank` al pulsar y cambiar la dirección al terminar el guardado

*   **Pros**: Evita el bloqueo y permite saber cuándo termina el guardado.
*   **Cons**: Necesita la referencia a la ventana, así que no se puede usar `noopener`. Eso permite que la web externa controle la pestaña de la app (*tab-nabbing*). Además, la pestaña queda en blanco hasta 15 s o más.
*   **Reason for Rejection**: El resultado del guardado no cambia lo que pasa después, así que no compensa el riesgo de *tab-nabbing* ni la espera con la pestaña en blanco.

### Alternativa C: abrir la web externa en la misma pestaña

*   **Pros**: El navegador nunca bloquea nada.
*   **Cons**: La app se descarga y el guardado en curso se pierde. El detalle deja de verse.
*   **Reason for Rejection**: La app se descargaría y el guardado se perdería.

### Alternativa D: mantener el estado `'external'` y añadir excepciones en los componentes

*   **Pros**: Cambia menos `state.js` y su test.
*   **Cons**: Obliga a tocar cuatro condiciones en `EventCard.svelte` y `EventDetail.svelte`, más `canShare`. También habría que repetir la regla de inscripciones cerradas en cada sitio.
*   **Reason for Rejection**: Tratar el evento como `'open'` o `'closed'` reutiliza todo el comportamiento existente y deja la diferencia en un solo componente.

### Alternativa E: con inscripciones cerradas, saltar el modal y abrir la web externa como ahora

*   **Pros**: La persona puede seguir inscribiéndose en la web externa aunque la app esté cerrada.
*   **Cons**: Los eventos externos se comportarían de forma distinta a los demás cuando todo está cerrado.
*   **Reason for Rejection**: Un solo interruptor (`Config!B1`) cierra todo, y así no hace falta una rama propia para los eventos externos. Lo mismo pasa al llegar al tope de 3000.

### Alternativa F: enlace permanente a la web externa sin dar el nombre

*   **Pros**: Sirve si la pestaña se bloquea o si se cierra el modal con Escape.
*   **Cons**: Permite saltarse el nombre y reduce la estimación.
*   **Reason for Rejection**: El enlace solo se ofrece, dentro del modal, a quien ya tiene una inscripción en este navegador.

### Alternativa G: confirmar la inscripción con la web externa o con un botón «Ya me he inscrito»

*   **Pros**: La estimación sería más exacta.
*   **Cons**: No hay ninguna forma de comunicarse con la web externa. Un botón manual añade un paso que la mayoría no haría.
*   **Reason for Rejection**: Como casi nadie pulsaría el botón manual, la lista saldría menos completa que la estimación actual.

### Alternativa H: marcar las inscripciones externas o cambiar el backend

*   **Pros**: El organizador podría distinguir intenciones de inscripciones confirmadas.
*   **Cons**: Cambia la API y la hoja, y contradice que las inscripciones se vean igual.
*   **Reason for Rejection**: Basta con que el equipo sepa que la lista es una estimación (lo explica el README en `inscripcio_url`). Cambiar la hoja y la API cuesta más de lo que aporta.

### Alternativa I: compartir la URL de la web externa, como ahora

*   **Pros**: Quien recibe el mensaje llega a la web externa en un solo paso.
*   **Cons**: Esas personas no pasan por el modal.
*   **Reason for Rejection**: Quien entra por el enlace compartido no contaría en la estimación, que es el objetivo del diseño.

### Alternativa J: textos de botón «Apunta'm i continua ↗» o «Apunta'm ↗»

*   **Pros**: Son más cortos o dicen que se guarda el nombre.
*   **Cons**: Dejan menos claro que falta la inscripción en la web externa.
*   **Reason for Rejection**: «Continua a la inscripció» deja claro que falta un paso en la web externa.

### Alternativa K: un `<a target="_blank">` normal como botón de enviar

*   **Pros**: El navegador no lo bloquea, y se puede abrir con Ctrl+clic.
*   **Cons**: Enter envía el formulario sin pulsar el enlace, así que seguiría haciendo falta `window.open` y habría dos caminos. Validar el nombre en el `onclick` de un enlace es frágil.
*   **Reason for Rejection**: Un solo camino (`submit`) es más fácil de mantener. `navigator.sendBeacon` y `fetch` con `keepalive` también se descartan: el primero no deja leer la respuesta, y el segundo solo ayuda cuando la página se descarga, no cuando pasa a segundo plano.

### Alternativa L: Participar abre la web externa directamente para quien vuelve

*   **Pros**: Un clic menos para quien ya está apuntado.
*   **Cons**:
    *   Dos sitios llamarían a `window.open` con la regla de no esperar antes.
    *   Haría falta lógica nueva en `state.js` y en la página, y props nuevas en `Calendar`, `EventCard` y `EventDetail`.
    *   La tarjeta y el detalle se comportarían distinto según `unsignup`.
    *   **Participar** perdería Ctrl+clic.
*   **Reason for Rejection**: El enlace dentro del modal da el mismo acceso con una sola llamada a `window.open`.

## Non-Functional Requirements

*   **Seguridad**:
    *   `window.open` siempre recibe `'noopener,noreferrer'`, y el enlace del modal usa `rel="noopener noreferrer"`, igual que los enlaces actuales.
    *   La URL viene de `externalUrl`, que `httpsUrl` (`events.js`) ya limita a `https://` sin espacios. No se añade ninguna otra fuente de URL.
*   **Carga del servidor**: Las inscripciones de eventos externos cuentan para los límites de 150 por evento y 3000 en total (`Code.gs`). Los casos límite están en *Risks & Mitigations*.
*   **Despliegue y marcha atrás**:
    *   Solo cambia el frontend. Para volver atrás basta con revertir el commit y desplegar.
    *   Las filas ya guardadas para eventos externos se quedarían en la hoja. La versión anterior no las mostraría, pero seguirían contando para los límites de 150 y 3000.

--------------------------------------------------------------------------------

## Additional Resources

*   `concepts_brief.md`: brainstorming con revisión Goldfish.
*   `src/lib/components/README.md`: la regla de no esperar antes de `nav.share` también se aplica aquí a `window.open`.
*   `docs/designs/text-compartir.md`: diseño de la plantilla del texto compartido.

## Future Improvements

*   Ninguna por ahora.

--------------------------------------------------------------------------------

## Detailed Implementation Plan

### Fases

1.  **F1. Lógica y textos:** §1-3 y §9-10. Termina con `npm test`.
2.  **F2. Componentes y página:** §4-7. Termina con `npm run check` sin errores.
3.  **F3. Pruebas e2e:** §8-11. Termina con `npm run test:e2e`.
4.  **F4. Documentación:** §12-16. Termina con `npm run build`.

Entre F1 y F2, `npm run check` falla por las comparaciones con `'external'` que quedan en los componentes. Es lo esperado.

### Target Files to Create/Modify

#### 1. `src/lib/state.js` (Modify)

*   **Type / Scope**: Módulo JS de lógica pura.
*   **Proposed Changes**:
    *   Quitar `'external'` de `ParticipationState`: queda `'past' | 'cancelled' | 'closed' | 'open'`.
    *   En `participationState`:
        *   Borrar `if (Boolean(event.externalUrl)) return 'external';`.
        *   Actualizar el comentario: la prioridad es `past`, `cancelled`, `closed`, `open`, y `externalUrl` no influye en el estado.
        *   Quitar `externalUrl` del tipo del parámetro.

#### 2. `src/lib/state.test.js` (Modify)

*   **Type / Scope**: Test unitario (`node --test`).
*   **Proposed Changes**:
    *   Sustituir `external ignora signupsOpen` por `un esdeveniment amb externalUrl és open o closed com els altres`. Con `signupsOpen: true` debe dar `'open'`, y con `false`, `'closed'`.
    *   Renombrar `sense el camp externalUrl (R1) no és external` a `sense el camp externalUrl (R1) és open`.
    *   Renombrar `cancel·lat guanya a extern i a tancat` a `cancel·lat guanya a tancat, també amb externalUrl`.
    *   Mantener `passat guanya a tot`.

#### 3. `src/lib/texts.js` (Modify)

*   **Type / Scope**: Textos de la interfaz (catalán).
*   **Proposed Changes**:
    *   Antes de `export const T`, definir `const NEW_TAB = '(s’obre en una pestanya nova)';`. Cambiar `newTab` para que use `NEW_TAB`.
    *   Dentro de `dialog`, añadir:
        *   `submitExternal: 'Continua a la inscripció ↗'`.
        *   `` submitExternalLabel: `Continua a la inscripció ${NEW_TAB}` ``.
        *   `goExternal: 'Ves a la inscripció externa ↗'`.
        *   `` goExternalLabel: `Ves a la inscripció externa ${NEW_TAB}` ``.
    *   El resto de textos no cambia.

#### 4. `src/lib/components/SignupDialog.svelte` (Modify)

*   **Type / Scope**: Componente Svelte 5.
*   **Proposed Changes**:
    *   **Prop nueva:** `ondone: (eventId: string) => void`, en el JSDoc y en la desestructuración.
    *   **Valor derivado:** `const externalUrl = $derived(event?.externalUrl ?? '');`.
    *   **Enlace para quien vuelve:**
        *   Se muestra si `externalUrl && mine.length > 0`, encima del formulario.
        *   Es `<a class="button" href={externalUrl} target="_blank" rel="noopener noreferrer" aria-label={T.dialog.goExternalLabel}>{T.dialog.goExternal}</a>`.
        *   No depende de `showMine`, porque `showMine` exige `unsignup`.
        *   La página ya pasa `mine` filtrado por este evento.
    *   **`submit`:** después de `validateName`, y solo si `externalUrl` no está vacío, ejecutar este flujo sin ningún `await`:
        1.  `if (!event) return;`.
        2.  `phase = 'sending'` y `error = ''`. Esta fase no llega a verse. Sirve de cerrojo: `submit` ya termina al principio si `phase !== 'idle'`, así que un segundo Enter no abre otra pestaña.
        3.  `window.open(externalUrl, '_blank', 'noopener,noreferrer')`. Encima de esta llamada, el comentario: «window.open before any await keeps the user activation; onsubmit before ondone because the page reads signupId synchronously».
        4.  `const id = event.id;` y después `onsubmit(check.name).catch(() => {})`, sin `await`. El resultado se ignora.
        5.  `ondone(id)` y `return`.
    *   **Botón de enviar:**
        *   Con `externalUrl`, mostrar `T.dialog.submitExternal` y usar `aria-label={T.dialog.submitExternalLabel}`.
        *   Sin `externalUrl`, sin cambios.
    *   **Sin `externalUrl`:** el flujo actual queda igual, con `await`, fase `done` y mensaje de éxito.

#### 5. `src/routes/[[districte]]/+page.svelte` (Modify)

*   **Type / Scope**: Página (orquestación de estado).
*   **Proposed Changes**:
    *   **Función nueva `signupDone(id)`:** `signupId = null; detailId = id;`. Al abrirse el detalle con `showModal`, el foco va a su botón de cerrar, como ahora.
    *   **`SignupDialog`:** añadir `ondone={signupDone}`.
    *   **`signup(name)`:** sin cambios de lógica.
        *   Encima de `const id = signupId`, añadir el comentario: «read before any await; the dialog may already be closed».
        *   El caso `closed` sigue poniendo `signupsOpen = false`.
    *   `onparticipate={openSignup}` no cambia.

#### 6. `src/lib/components/EventCard.svelte` (Modify)

*   **Type / Scope**: Componente Svelte 5.
*   **Proposed Changes**:
    *   Eliminar el bloque `{#if participation === 'external'}`, incluido el enlace `<a class="button">` a `event.externalUrl`. El evento externo usa la rama normal:
        *   recuento;
        *   **Desapuntar-me**, si hay inscripción propia y `unsignup` está activo;
        *   si no, **Participar**, con el estado `'open'`, o **Veure apuntats**, con el estado `'closed'`.
    *   Quitar `.button` del selector CSS `button, .button`, porque ya no se usa en este componente.

#### 7. `src/lib/components/EventDetail.svelte` (Modify)

*   **Type / Scope**: Componente Svelte 5.
*   **Proposed Changes**:
    *   Quitar las condiciones `participation !== 'external'` que envuelven el recuento y la lista. Ahora se muestran siempre.
    *   En la sección de participación:
        *   Eliminar la rama `{:else if participation === 'external'}` con su enlace `<a>`.
        *   En la rama `'open'`, si `event.externalUrl`, mostrar `<p class="note">{T.detail.externalNote}</p>` debajo de **Participar**.
    *   `canShare` pasa a `participation === 'open' || participation === 'closed'`.

#### 8. `e2e/helpers.js` (Modify)

*   **Type / Scope**: Utilidades de Playwright.
*   **Proposed Changes**: Añadir dos funciones, con el mismo patrón que `mockShare` y `shareCalls`:
    *   `mockWindowOpen(page)`: con `page.addInitScript`, sustituye `window.open` por una función que añade la URL a `window.__openCalls` y devuelve `null`.
    *   `openCalls(page)`: devuelve `window.__openCalls`.
    *   Mover `seedMine(page, ids)` desde `e2e/signup.spec.js` a `helpers.js` y exportarlo, porque ahora también lo usa `external.spec.js`. En `signup.spec.js`, importarlo.

#### 9. `src/lib/share.js` (Modify)

*   **Type / Scope**: Módulo JS.
*   **Proposed Changes**:
    *   En `shareText`, usar siempre `T.share.link(url)` y quitar `externalUrl` del `Pick` del parámetro.
    *   Actualizar el JSDoc: el enlace siempre es el del detalle en la app.

#### 10. `src/lib/share.test.js` (Modify)

*   **Type / Scope**: Test unitario.
*   **Proposed Changes**: Sustituir `shareText: l’enllaç extern substitueix el del detall` por `shareText: un esdeveniment amb externalUrl enllaça al detall de l’app`.
    *   Crear antes `const ext = { ...EVENT, externalUrl: 'https://example.org/inscripcio' }` y pasar `ext`. Así el objeto no es un literal y `npm run check` acepta la propiedad extra.
    *   Comprobar que el texto contiene `DETAIL_URL` y no contiene la URL de la web externa.

#### 11. Pruebas e2e: `e2e/external.spec.js`, `e2e/signup.spec.js` y `e2e/share.spec.js` (Modify)

*   **Type / Scope**: Tests de Playwright. La web externa se intercepta con `context.route('https://example.org/**', …)`, como ahora.
*   **Proposed Changes en `e2e/external.spec.js`**:
    *   **Sustituir** el test de la tarjeta con enlace por uno que compruebe esto:
        *   La tarjeta `ext-1` tiene un botón **Participar**, sin enlace.
        *   Muestra `T.count(0)`.
    *   **Sustituir** el test del detalle con enlace por uno que compruebe esto:
        *   El detalle muestra el recuento y la lista vacía (`T.detail.listEmpty`).
        *   Muestra el botón **Participar**, `T.detail.externalNote` y **Comparteix**.
    *   **Sustituir** el test del texto compartido: contiene `?e=ext-1` y no contiene `EXTERNAL_URL`.
    *   **Sustituir** `pulsar «Participar» obre l’URL externa…` por el flujo nuevo:
        1.  Pulsar **Participar** en la tarjeta abre el modal.
        2.  Escribir `Anna` y pulsar `getByRole('button', { name: T.dialog.submitExternalLabel })`. Su texto visible es `T.dialog.submitExternal`.
        3.  `context.waitForEvent('page')` devuelve una pestaña con `EXTERNAL_URL`.
        4.  El modal se cierra.
        5.  El detalle de `ext-1` es visible, y su botón de cerrar tiene el foco (`toBeFocused()`).
        6.  El detalle acaba mostrando `Anna` y `T.count(1)`.
    *   **Nuevo** `window.open s’executa abans del POST (Chromium no bloqueja pestanyes; és l’única protecció de l’ordre)`:
        1.  Llamar a `mockWindowOpen(page)` y después a `openAgenda`.
        2.  Registrar `page.route(/localhost:5301\/exec/, handler)`. Si la petición es POST, el handler guarda `await openCalls(page)` en una variable. Siempre termina con `route.fallback()`.
        3.  Enviar `Anna`.
        4.  Comprobar que el valor guardado es `[EXTERNAL_URL]`, es decir, que `window.open` ya se había llamado cuando llegó el POST.
    *   **Nuevo** `un error en desar obre igualment la pestanya`:
        1.  Registrar `page.route(/localhost:5301\/exec/, (r) => r.request().method() === 'POST' ? r.abort() : r.fallback())`.
        2.  Enviar `Anna`.
        3.  Esperar el GET `?action=agenda` de `recover()`.
        4.  Comprobar que se abrió la pestaña, que `readMine(page)` no tiene `ext-1` y que la lista sigue vacía.
        5.  No usar `options.loseAnswer`, que sí guarda la fila.
    *   **Nuevo** `un nom buit no obre cap pestanya`:
        1.  Con `mockWindowOpen`, enviar el nombre vacío.
        2.  Comprobar que `openCalls` está vacío y que se muestra el error.
        3.  Comprobar que no hay ningún POST. El GET de `openSignup` sí ocurre.
    *   **Nuevo** `dos Enter seguits obren una sola pestanya`:
        1.  Con `mockWindowOpen`, pulsar Enter dos veces con `page.keyboard.press('Enter')`.
        2.  Comprobar que `openCalls` tiene exactamente una URL.
    *   **Nuevo** `qui ja s’ha apuntat veu l’enllaç a la web externa al modal`:
        1.  Con `seedMine(page, ['ext-1'])` y `features: []`, pulsar **Participar** en la tarjeta.
        2.  El modal muestra el enlace `T.dialog.goExternalLabel`, con `href` igual a `EXTERNAL_URL` y `target="_blank"`.
        3.  Al pulsarlo, se abre una pestaña nueva y no hay ningún POST.
    *   **Nuevo** `es pot desapuntar d’un esdeveniment extern`:
        1.  Después de la inscripción, cerrar la pestaña nueva y el detalle (`T.detail.close`).
        2.  Pulsar **Desapuntar-me** dos veces en la tarjeta.
        3.  Comprobar que aparecen `T.participation.unsignDone` y `T.count(0)`.
        4.  Comprobar que **Participar** abre el modal sin el enlace.
    *   **Sustituir** `amb B1 = NO l’enllaç extern segueix funcionant…` por `amb B1 = NO un esdeveniment extern està tancat`:
        1.  La tarjeta muestra **Veure apuntats**.
        2.  El detalle muestra `T.dialog.closed`.
        3.  No hay ningún botón **Participar** ni ningún enlace a `EXTERNAL_URL`.
    *   **Ajustar** el bucle de URL no válidas:
        1.  Quitar la comprobación de `participateLink`.
        2.  Abrir el modal y comprobar que el botón de enviar es `T.dialog.submit`, no `T.dialog.submitExternalLabel`.
    *   **Ajustar** `un esdeveniment cancel·lat amb URL externa…`: quitar la comprobación de `participateLink` y mantener la de **Veure qui s’ha apuntat**.
    *   **Eliminar** los helpers `participateLink` y `expectExternalLink`.
*   **Proposed Changes en `e2e/signup.spec.js`**:
    *   En `no s’ofereix la baixa en un esdeveniment passat, cancel·lat o amb inscripció externa`, quitar `ext-1` de las tres listas.
    *   Cambiar el título a `no s’ofereix la baixa en un esdeveniment passat o cancel·lat`. Ahora `ext-1` sí ofrece la baja, y eso ya lo comprueba `external.spec.js`.
*   **Proposed Changes en `e2e/share.spec.js`**: en `imatge pròpia en una inscripció externa…`:
    *   `expectedText` termina en `http://localhost:5300/agenda-front-ampli/?e=ext-1`, con el mismo patrón que `DETAIL_URL`.
    *   Cambiar el título a `…: el text enllaça al detall de l’app`.

#### 12. `src/lib/components/README.md` (Modify)

*   **Type / Scope**: Documentación.
*   **Proposed Changes**:
    *   En la entrada de `EventCard.svelte` (Interface), quitar la frase sobre la acción que es un enlace externo cuando `state === 'external'`.
    *   En la entrada de `SignupDialog.svelte`, añadir la prop `ondone` y el enlace para quien vuelve.
    *   Donde dice que se puede compartir con «`open`, `closed` or `external`», quitar `external`.
    *   Sustituir la línea «`EventCard.svelte` external links use `target="_blank"` … not shown for `'external'` events» por: «`SignupDialog.svelte` with an `externalUrl` calls `window.open(url, '_blank', 'noopener,noreferrer')` before any `await`, then `onsubmit` without awaiting it, then `ondone`; its link for returning users uses `rel="noopener noreferrer"`.»

#### 13. `src/lib/README.md` (Modify)

*   **Type / Scope**: Documentación.
*   **Proposed Changes**: Quitar `'external'` en las dos menciones de `participationState`: el tipo devuelto y la prioridad. La prioridad queda `past`, `cancelled`, `closed`, `open`.

#### 14. `src/routes/README.md` (Modify)

*   **Type / Scope**: Documentación.
*   **Proposed Changes**: En Side effects, añadir:
    *   `signupDone(id)` cierra el modal y abre el detalle.
    *   «`signup()` reads `signupId` before any `await`, so it works after the dialog has closed».

#### 15. `README.md` (Modify)

*   **Type / Scope**: Documentación de usuario y operación (castellano). Los números de línea son de hoy y solo sirven de pista.
*   **Proposed Changes**:
    *   **Columnas opcionales (hoy, l. 10):** sustituir la descripción de `inscripcio_url` por: «**Participar** pide el nombre, lo apunta en la app y abre esa web en una pestaña nueva».
    *   **Comparteix (l. 12):** quitar «o con URL externa». El texto siempre enlaza con el detalle de la app.
    *   **Datos de prueba (l. 112):** sustituir lo que se comprueba de `inscripcio_url` por: «**Participar** pide el nombre, la web `example.org` se abre en una pestaña nueva y el nombre aparece en la lista del detalle».
    *   **Tabla de columnas, fila `inscripcio_url` (l. 152):** sustituir la descripción por: «Si el evento se inscribe en otra web. Solo `https://` y sin espacios (si no es válida se trata como vacía). **Participar** pide el nombre, lo apunta en la app y abre esa web en una pestaña nueva. Con `Config!B1 = NO` el evento sale cerrado como los demás. Las filas de `Inscripcions` de estos eventos indican intención de ir, no una inscripción confirmada en la otra web.»
    *   **Baja (R4, l. 171):** quitar la excepción de los eventos con URL externa.
    *   **Datos públicos (l. 343):** cambiar «se abre con `rel="noopener noreferrer"`» por «se abre con `noopener` y `noreferrer`».

#### 16. `e2e/README.md` (Modify)

*   **Type / Scope**: Documentación.
*   **Proposed Changes**: Añadir esta línea: «[external.spec.js](./external.spec.js): sign-up flow for events with an external URL; uses `mockWindowOpen` from `helpers.js` to check that the new tab opens before the POST.»

#### 17. `docs/designs/inscripcio-externa-amb-nom.md` (Create)

*   **Type / Scope**: Documento de diseño.
*   **Proposed Changes**: Este documento.

No se modifican `apps-script/Code.gs`, `apps-script/Code.test.js`, `src/lib/api.js`, `src/lib/my-signups.js`, `src/lib/events.js`, `src/lib/mock-api.js` ni `src/lib/components/Calendar.svelte`. `e2e/script.js` ya incluye el evento `ext-1`.

### Verification Plan

*   **Compilation/Build**: `npm run build`.
*   **Unit Tests**: `npm test`, que incluye `state.test.js` y `share.test.js`.
*   **Static Analysis & Linting**: `npm run check` (svelte-check con los tipos JSDoc). Detecta los usos de `'external'` que queden.
*   **E2E/Integration**: `npm run test:e2e`. Aparte del test cambiado en §11, el resto de `e2e/signup.spec.js` debe pasar sin cambios. Eso demuestra que el flujo sin `externalUrl` no ha cambiado.
*   **Comprobación manual en dispositivos reales**: es obligatoria antes de publicar, porque Playwright no reproduce el bloqueo de pestañas. Anotar el resultado en el PR.
    1.  **Safari en iOS con datos móviles:** apuntarse a un evento de prueba con `inscripcio_url`. La web externa se abre en una pestaña nueva sin aviso de bloqueo. Al volver, el nombre aparece en la lista.
    2.  **Navegador interno de WhatsApp, desde un enlace compartido:** el mismo flujo. Anotar si la web externa se abre en otra vista y si el nombre se guarda.
    3.  **Navegador interno de Instagram o Facebook:** el mismo flujo.
    4.  **Chrome en Android:** el mismo flujo.
    5.  **En todos los casos:** al pulsar **Participar** otra vez, el modal muestra el enlace a la web externa.

--------------------------------------------------------------------------------

<!-- Provenance: Indicates initial structural drafting via EGM. -->

*Drafted with EGM*
