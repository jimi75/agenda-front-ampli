# Agenda Frontamplista Sants-Montjuïc

Web estática, en catalán, con las acciones y actos de **noviembre de 2026** del distrito de Sants-Montjuïc. Se publica en GitHub Pages y lee los datos de una hoja de Google.

- Pantalla grande (desde 1024 px): cuadrícula tipo tablero, semana desde dilluns.
- Móvil: lista vertical, un día tras otro, solo los días con eventos. Se abre en el próximo día con eventos.
- Dos tipos: **Accions** (tarjeta lima) y **Actes** (tarjeta rojiza). Cada tarjeta lleva el nombre del tipo escrito, no solo el color.
- Cada tarjeta tiene un enlace **detall** (arriba a la derecha, en la línea del tipo) que abre el detalle del evento: a pantalla completa en móvil y como panel centrado desde 1024 px. Muestra tipo, nombre, fecha y hora, lugar con enlace a Google Maps, recuento y lista de apuntados. Tocar la tarjeta en otro sitio no hace nada.
- Cada evento abierto tiene botón **Participar**: abre un modal pequeño con el formulario (solo nombre o apodo). La tarjeta y el detalle muestran el recuento; la lista de apuntados está en el detalle. En un evento pasado, cancelado o con las inscripciones cerradas, la tarjeta ofrece **Veure apuntats**, que abre el detalle en solo lectura.
- **Desapuntar-me** (R4): si el navegador guarda una inscripción propia de un evento abierto, la tarjeta cambia **Participar** por **Desapuntar-me** (dos toques: «Segur? Prem de nou»). Si el navegador guarda varias inscripciones propias del mismo evento, el botón abre el modal de **Participar**, que muestra «La teva participació» con cada nombre y su botón **Desapuntar-me** (dos toques). El detalle sigue ofreciendo **Participar**. Solo en ese navegador y solo con el evento abierto; la web lo ofrece únicamente si el script anuncia `features: ["unsignup"]`. Ver *Inscripciones*.
- Dos columnas opcionales de la hoja: `responsable` (se muestra en la tarjeta y en el detalle como «Responsable: …») e `inscripcio_url` (si un evento se inscribe en otra web, **Participar** es un enlace que la abre en una pestaña nueva y la tarjeta y el detalle no muestran recuento ni lista de ese evento). Ver *Editar los eventos*.
- Enlace directo a un evento: `…/agenda-front-ampli/?e=<id>` abre su detalle al cargar. **Copia l’enllaç** (siempre visible en el detalle) copia ese enlace, sin `?admin`. Abrir o cerrar el detalle no cambia la barra de direcciones: el enlace se construye siempre con el `id` del evento.
- **Descarrega la imatge** (en el detalle de los eventos que se pueden compartir: abiertos, con inscripciones cerradas o con URL externa) genera cada vez un PNG de 2048 × 1346 px con el título de la agenda, tipo, nombre, día, hora y lugar, y lo descarga como `agenda-<id>.png`. Mientras lo genera el botón dice «Generant…». Si falla, sale «No s’ha pogut generar la imatge». El texto de la imagen crece cuando el nombre y el lugar son cortos.
- **Comparteix** (R3b; mismos eventos que la descarga) genera la imagen al pulsar y la envía con **un solo** `navigator.share({files, text})`: el panel de compartir del sistema recibe el PNG `agenda-<id>.png` y el texto con el enlace al detalle. No se mira antes si el navegador admite archivos (la imagen hace falta igualmente para el respaldo): se comprueba con `canShare` ya con el archivo hecho. Qué pasa según el resultado:
  - Compartido: vuelve a reposo. Si la persona cierra el panel (`AbortError`), vuelve a reposo sin avisar y sin respaldo.
  - El navegador lo rechaza con `NotAllowedError` (lo habitual es que la activación del toque caducó mientras se generaba): la imagen se guarda en memoria y el botón pasa a «Imatge preparada: prem de nou». El segundo toque comparte **ese mismo archivo**, sin volver a generar. Si el segundo toque también falla, va al respaldo y nunca vuelve a «preparada». La imagen preparada se descarta al cerrar el detalle.
  - Sin soporte de archivos (`share` ausente o `canShare` en falso) u otro error: respaldo. Se descarga la imagen, aparece el enlace «Obre WhatsApp amb el text» (`wa.me`, solo con texto) y el aviso «Aquest navegador no pot compartir la imatge. S’ha descarregat: adjunta-la al missatge.».
  - La imagen no se puede generar: «No s’ha pogut generar la imatge» y el mismo enlace `wa.me` de solo texto, sin descarga. **Comparteix** no queda peor que en R1, que solo ofrecía ese enlace.
  - Mientras genera, el botón dice «Generant…» y no admite otro toque. Los mensajes salen en una región `aria-live`.
- Construido antes de comprobar S1 y S2 (decisión del autor del 12 de noviembre, porque no tenía móviles de prueba): **S1 y S2 siguen pendientes de comprobar**. Si salen mal, R3b y R3a se revierten con `git revert` (ver *Decisiones y límites*).
- Tipografía: Special Gothic (la de frenteamplio.info). Impact no se usa: es comercial y no está instalada en Android.

## Cómo funciona

```
Hoja de Google (la editas tú)  <──>  Apps Script (apps-script/Code.gs)  <──>  Web en GitHub Pages
 Esdeveniments, Inscripcions, Config      GET  ?action=agenda                      lee al abrir la página
 (y Baixes, el archivo de bajas)
                                          POST {action:"signup"}                   escribe al apuntarse
                                          POST {action:"unsignup"}                 borra la propia inscripción
```

La web **no lleva los datos dentro**: los pide al abrirse. Cambiar un evento en la hoja se ve al recargar, sin recompilar ni volver a publicar.

## Puesta en marcha (una sola vez)

### 1. La hoja y el script

1. En [sheets.new](https://sheets.new) crea una hoja de Google nueva, con la cuenta que quieras que sea la propietaria (mejor una cuenta de campaña que una de trabajo: un administrador de Workspace puede bloquear el acceso público). Ponle nombre, por ejemplo `Agenda Sants-Montjuïc`.
2. **Archivo → Configuración**: en *Zona horaria* elige `(GMT+01:00) Madrid`. Guarda. Los sellos de hora de las inscripciones usan esta zona.
3. Renombra la pestaña por defecto (`Full 1` / `Hoja 1`) a `Esdeveniments`, exactamente así. Así `setup` la reutiliza y no queda una pestaña vacía de sobra.
4. **Extensiones → Apps Script.** Se abre el editor con un archivo `Código.gs`. Borra todo su contenido y pega el de [`apps-script/Code.gs`](apps-script/Code.gs). Pulsa **Guardar** (💾).
5. En el menú de la izquierda, **Configuración del proyecto** (⚙️) → marca *Mostrar el archivo de manifiesto "appsscript.json" en el editor*. Vuelve a **Editor** (`<>`), abre `appsscript.json`, borra todo su contenido y pega el de [`apps-script/appsscript.json`](apps-script/appsscript.json). Guarda.
6. Abre `Código.gs` en la lista de archivos de la izquierda (con `appsscript.json` seleccionado no aparece el desplegable de funciones). Arriba, junto a **▶ Ejecutar** y **Depurar**, abre el desplegable de funciones, elige `setup` y pulsa **Ejecutar**. La primera vez pide permisos: **Revisar permisos** → tu cuenta → si sale *Google no ha verificado esta aplicación*, pulsa **Avanzada → Ir a (nombre del proyecto) (no seguro)** → **Permitir**. Es normal en scripts propios, y el script solo accede a esta hoja. Debe terminar con *Ejecución finalizada* en el registro.
7. Vuelve a la hoja. Debes ver tres pestañas: `Esdeveniments` (con la cabecera `id, data, inici, fi, tipus, nom, lloc, mapa, estat`), `Inscripcions` (`data_hora, event_id, nom, request_id`) y `Config` (con `SI` en la celda B1). `setup` también deja listas desplegables en `Esdeveniments`: `data` (los 28 días del 2 al 29 de noviembre), `inici` y `fi` (de 08:00 a 22:00, de 5 en 5 minutos), `tipus` y `estat`. Las listas de fechas y horas están en las columnas E y F de `Config`: no las borres. `setup` protege con un aviso de confirmación las cabeceras de las pestañas y esas listas. Si `setup` falla a medias, corrige el código y vuelve a ejecutarlo: es seguro repetirlo y no toca eventos, inscripciones ni el interruptor `SI`/`NO`.
8. De vuelta en Apps Script: **Implementar → Nueva implementación**. Pulsa ⚙️ junto a *Seleccionar tipo* → **Aplicación web**. *Descripción*: `v1`. *Ejecutar como*: **Yo**. *Quién tiene acceso*: **Cualquier usuario**. Pulsa **Implementar** (si vuelve a pedir autorización, acéptala) y copia la **URL de la aplicación web**, que termina en `/exec`.
9. Comprueba la URL: pégala en una pestaña del navegador añadiendo `?action=agenda` al final. Debe salir `{"ok":true,"v":1,"signupsOpen":true,"events":[],"signups":{}}`.

> **Para cambiar el código más adelante** usa *Implementar → Gestionar implementaciones → ✎ → Versión nueva*. Si haces una "Nueva implementación", la URL cambia y la web deja de funcionar.

### 2. GitHub

1. El repositorio debe ser **público** (GitHub Pages gratis lo exige).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. **Settings → Secrets and variables → Actions → pestaña Variables → New repository variable**: nombre `AGENDA_API_URL`, valor la **URL completa** del paso anterior (`https://script.google.com/macros/s/XXXX/exec`, no solo `/exec`). La publicación falla con un mensaje claro si falta o no tiene ese formato. Si cambias la variable después, relanza el despliegue (pestaña **Actions → Desplegar a GitHub Pages → Run workflow**), porque la URL se incrusta al compilar.
4. Haz `push` a `main`. El flujo [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) comprueba los tipos, ejecuta los tests y las pruebas de navegador (Playwright: los proyectos `chromium` y `mobile` bloquean la publicación si fallan), compila y publica en `https://jimi75.github.io/agenda-front-ampli/`.
5. **Si el CI está en rojo y hay que publicar una reversión** (`git revert` de la entrega): **Actions → Desplegar a GitHub Pages → Run workflow** y marca `skip_e2e`. Omite solo las pruebas de navegador; `npm run check` y `npm test` se ejecutan igual. Úsalo únicamente para desplegar una reversión.

### 3. Comprobaciones después de publicar

Cuando el script esté desplegado, haz estas pruebas **una vez**: el comportamiento de Apps Script entre dominios lo define Google y no se puede probar sin tu cuenta.

```sh
URL='https://script.google.com/macros/s/XXXX/exec'

# Lectura: debe salir {"ok":true,"v":1,...}
curl -sL "$URL?action=agenda" | head -c 400

# Escritura: usa un id de evento que exista en la hoja. No pongas -X POST:
# con -L, curl cambia a GET al seguir la redirección, igual que el navegador.
curl -sL -H 'Content-Type: text/plain;charset=utf-8' \
  --data '{"action":"signup","eventId":"ID_DE_UN_EVENTO","name":"Prova","requestId":"prova-00000001"}' "$URL"
```

Después, desde el móvil **con datos móviles** (no Wi-Fi) y desde el navegador interno de WhatsApp: abre la web, pulsa *Participar* en un evento, apúntate como `Prova` y comprueba que sale en la lista y en la hoja. Borra la fila de prueba. Si falla, mira la consola del navegador: un `Failed to fetch` casi siempre es que la implementación no está en *Cualquier usuario* o que la URL no termina en `/exec`.

**Entrega del detalle (R1), en un móvil real** (Playwright no puede probarlo). Cada paso dice qué debe salir y dónde se anota el resultado:

1. **Detalle y enlace directo.** Abre un evento con *detall*: debe ocupar toda la pantalla y *Tanca* debe cerrarlo. Pega `https://jimi75.github.io/agenda-front-ampli/?e=ID_DE_UN_EVENTO` en un chat de WhatsApp y ábrelo desde ahí: debe abrir el detalle de ese evento, sin desplazar la lista. Con un `id` que no existe sale «No s’ha trobat aquesta activitat».
2. **Botón Atrás en Android.** Con el detalle abierto, pulsa Atrás. No hay resultado «correcto»: depende del navegador (ver *Decisiones y límites*). **Anótalo** en la línea *Resultado en Android* de *Botón Atrás en Android*.
3. **Spike S3: `localStorage` en el navegador interno de WhatsApp** (decide si se construye la baja de inscripción, R4). Abre desde un chat `https://jimi75.github.io/agenda-front-ampli/?admin&e=ID_DE_UN_EVENTO`: el panel de `?admin` muestra `local signups: 0`. Pulsa *Participar* y apúntate como `Prova`: debe pasar a `local signups: 1`. Cierra el navegador interno y vuelve a abrir el mismo enlace desde WhatsApp. Si sigue en `local signups: 1`, `localStorage` se conserva; si vuelve a 0, no. **Anótalo** en la línea *Resultado* de *Navegador interno de WhatsApp (S3)*. Borra después la fila `Prova` de la hoja. La parte de S3 sobre descargar un archivo se prueba con el paso 1 de la entrega de la imagen (R3a), de abajo.

**Entrega de la imagen (R3a), en un móvil real** (Playwright no puede probarlo). Es el spike **S1**. Está **pendiente de comprobar**: R3b se construyó antes de tenerlo (decisión del autor del 12 de noviembre), así que si sale mal la imagen pasa a dibujarse en un canvas o R3 se descarta (regla de abajo). Hazlo con **un iPhone antiguo** y **un Android de gama baja**, con el móvil en datos móviles y la web ya cargada. Cada paso dice qué mirar y dónde se anota el resultado:

1. **Descarga y tiempo.** Abre el detalle de un evento abierto y pulsa *Descarrega la imatge*. Para medir el tiempo graba la pantalla del móvil (o usa un cronómetro en otro aparato): cuenta desde el toque hasta que aparece la descarga o el aviso del navegador, con el botón en «Generant…» entre medias. Repite **tres veces** y apunta la peor. Debe tardar **5 s o menos**. Haz también una descarga con un nombre y un lugar largos (rellena una fila de prueba con unos 120 caracteres en `nom` y `lloc`) y otra desde el navegador interno de WhatsApp (abre el enlace `?e=ID_DE_UN_EVENTO` desde un chat): ahí se comprueba la parte de S3 sobre descargar un archivo.
2. **No sale en blanco.** Abre el PNG descargado (en iPhone, desde *Archivos*; en Android, desde *Descargas*). Debe verse la banda naranja con el título y el cuerpo del color del tipo (lima para Acció, rojizo para Acte) con el texto. Si el PNG sale en blanco **dos veces seguidas**, es el fallo conocido de WebKit.
3. **La fuente se aplica.** El nombre, el día y el lugar deben salir en la tipografía condensada de la web (Special Gothic Condensed One), la misma que los títulos del detalle. Si salen en una letra normal (Arial, Roboto, San Francisco), la fuente ha caído a otra.
4. **Tamaño exacto** (opcional). En iPhone, *Archivos → Obtener información* debe dar 2048 × 1346. Playwright ya lo verifica, pero no con un móvil real.

*Regla (del diseño):* si sale en blanco dos veces seguidas, tarda más de 5 s o la fuente cae a otra, R3 pasa a dibujar la imagen en un canvas (Alternativa G); si tampoco funciona, R3 se descarta y queda el compartir solo con texto de R1. **Anota el resultado** en la línea *Resultado* de *Imagen (S1)*, en *Decisiones y límites*. Si decide descartar R3, R3b y R3a se revierten con `git revert`. S2 (si WhatsApp conserva el texto junto a la imagen) se prueba justo debajo, con R3b.

**Entrega de compartir con archivo (R3b), en un móvil real** (Playwright simula `navigator.share`, pero no WhatsApp ni los paneles de compartir reales). Es el spike **S2**, también **pendiente de comprobar**. Hazlo en **un iPhone** y **un Android**, con la web ya cargada, desde el navegador normal (Safari, Chrome) y, si puedes, desde el navegador interno de WhatsApp:

1. **Comparteix hasta WhatsApp.** Abre el detalle de un evento abierto y pulsa *Comparteix*. Debe salir «Generant…» y después el panel de compartir del sistema, con la imagen. Elige WhatsApp y un chat (el tuyo contigo mismo sirve). Si en lugar del panel el botón pasa a «Imatge preparada: prem de nou», es el `NotAllowedError` previsto: pulsa de nuevo y debe salir el panel. Apunta cuál de los dos caminos ocurre en cada móvil.
2. **Qué mirar (S2).** En la pantalla de envío de WhatsApp, antes de enviar: ¿se ve la imagen **y** el texto «Apunta’t a l’activitat aquí: <enlace>» como pie o mensaje junto a ella? Envíalo y mira el chat: ¿llegan imagen y texto en un solo mensaje, o solo la imagen (texto perdido)? Comprueba también que el enlace del texto abre el detalle de ese evento.
3. **Respaldo.** En un navegador que no ofrezca el panel con archivos (por ejemplo el navegador interno de WhatsApp, si no lo admite), *Comparteix* debe descargar la imagen y mostrar «Obre WhatsApp amb el text» y el aviso. El enlace debe abrir WhatsApp con solo el texto.

*Regla (del diseño):* si WhatsApp no conserva el texto junto a la imagen, se documenta como límite en este README (en *Decisiones y límites*, línea *WhatsApp y el texto con la imagen (S2)*) y la persona usa «Copia l’enllaç». **Anota el resultado** en esa línea: *Resultado en iPhone* y *Resultado en Android*, con «conserva el texto» o «solo llega la imagen», y qué camino ocurrió en el paso 1 (panel directo o segundo toque).

**Entrega del responsable y la URL externa (R2).** Tras desplegar el script y escribir J1 y K1 (ver *Cómo publicar una entrega*), con la misma variable `URL` de arriba:

1. **Lectura.** `curl -sL "$URL?action=agenda" | head -c 800`: cada evento de `events` debe traer `"responsable"` e `"inscripcio_url"` (con `""` si la celda está vacía) y la respuesta **no** debe traer `features` hasta que despliegues R4 (con R4 desplegado trae `"features":["unsignup"]`). Si no salen, el script de la implementación no es el de R2: revisa que la implementación use la versión nueva.
2. **Latencia de `doGet`** (una vez). `curl -sL -o /dev/null -w '%{time_total}\n' "$URL?action=agenda"`. Si pasa de 3 s, hay que añadir una caché de `CacheService` de 30 s en el script (decisión del diseño; hasta entonces no hay caché). **Anótalo** en la línea *Resultado* de *Latencia de `doGet` (R2)*.
3. **Datos de prueba en la hoja.** En una fila de prueba pon `Prova` en `responsable` y `https://example.org` en `inscripcio_url`. Recarga la web: la tarjeta muestra «Responsable: Prova», su **Participar** abre `example.org` en una pestaña nueva, no abre el modal y no hay recuento ni lista. Pon `Config!B1` en `NO` y comprueba que el enlace sigue funcionando; devuélvelo a `SI`. Borra la fila de prueba.

**Entrega de la baja (R4).** Es la única entrega que **borra datos**. Hazla siempre primero en una copia del libro (ver *Cómo publicar una entrega → R4*). Con la variable `URL` de la copia y, después, la del libro real:

1. **Lectura.** `curl -sL "$URL?action=agenda" | head -c 800`: la respuesta debe traer `"features":["unsignup"]` y **ningún** `request_id`.
2. **Comprobación que no escribe.** Una baja con un `requestId` que no existe no debe borrar nada y debe responder `removed:false` (cambia `ID_DE_UN_EVENTO` por un id real; el `requestId` de ejemplo no existe porque los reales son aleatorios):

   ```sh
   curl -sL -H 'Content-Type: text/plain;charset=utf-8' \
     --data '{"action":"unsignup","eventId":"ID_DE_UN_EVENTO","requestId":"no-existe-00000001"}' "$URL"
   # → {"ok":true,"v":1,"eventId":"ID_DE_UN_EVENTO","names":[...],"removed":false}
   ```

   Si sale `"removed":true`, **no sigas**: el script no es el de R4 o está mal. Tampoco debe aparecer la pestaña `Baixes` por esta prueba. Ni una acción desconocida (`"action":"x"`) ni un `requestId` vacío o con caracteres raros deben borrar nada: dan `bad_request`.
3. **Una baja real de prueba** (con datos móviles, en el navegador donde te apuntas): ver el último paso de *Cómo publicar una entrega → R4*.

## Editar los eventos

Pestaña **`Esdeveniments`**, una fila por evento. Las columnas se leen por el nombre de la cabecera, así que puedes reordenarlas.

Para comprobar que todo va, escribe esta primera fila en la fila 2 (escribe a mano; si pegas desde otro sitio usa **Ctrl+Shift+V**, pegar solo valores, para no perder el formato de texto):

| id | data | inici | fi | tipus | nom | lloc | mapa | estat |
|---|---|---|---|---|---|---|---|---|
| `prova-1` | `2026-11-12` | `10:00` | `14:00` | `Acció` | `Paradeta de prova` | `Plaça de Sants, Barcelona` | | |

Recarga la URL `/exec?action=agenda`: el evento debe aparecer en `events` con `"row":2`. Cuando hayas terminado las pruebas, borra la fila.

| Columna | Obligatoria | Ejemplo | Notas |
|---|---|---|---|
| `id` | sí | `paradeta-1` | Único. Solo minúsculas, números y guiones (máx. 20). **No lo cambies** una vez haya gente apuntada: las inscripciones se enlazan por este id. |
| `data` | sí | `2026-11-12` | Año-mes-día, del `2026-11-02` al `2026-11-29`. El 1 y el 30 no se muestran. |
| `inici` | sí | `10:00` | `HH:MM`. |
| `fi` | no | `14:00` | Si falta o es anterior al inicio, solo se muestra la hora de inicio. |
| `tipus` | sí | `Acció` / `Acte` | Lista desplegable. Cualquier otro valor se trata como Acció. |
| `nom` | sí | `Paradeta` | |
| `lloc` | no | `Plaça de Sants, Barcelona` | Se muestra y se enlaza a Google Maps (búsqueda por este texto). |
| `mapa` | no | `https://maps.app.goo.gl/...` | Si lo pones (debe empezar por `https://`), se usa este enlace en vez de la búsqueda. |
| `estat` | no | `Cancel·lat` / `Modificat` | Muestra la etiqueta en la tarjeta. Un evento cancelado no admite más inscripciones. |
| `responsable` | no (columna J) | `Marta` | Solo un nombre: se muestra como «Responsable: Marta» en la tarjeta y en el detalle, hasta 60 caracteres. No pongas teléfonos: la web es pública. |
| `inscripcio_url` | no (columna K) | `https://example.org/inscripcio` | Si el evento se inscribe en otra web. Solo `https://` y sin espacios (misma regla que `mapa`; si no es válida se trata como vacía). **Participar** abre esa web en una pestaña nueva, también con las inscripciones cerradas (`Config!B1` = `NO`), y la tarjeta y el detalle no muestran recuento ni lista. Un evento pasado o cancelado sigue siendo solo lectura, con su recuento y su lista. |

**Las columnas J y K no las crea `setup`** (la hoja sigue siendo A:I). Escribe a mano las cabeceras `responsable` en **J1** e `inscripcio_url` en **K1** (exactamente así, en minúsculas) y haz esto una vez:

1. Selecciona las columnas J:K → **Formato → Número → Texto sin formato**, para que Sheets no convierta ni evalúe lo que se escriba.
2. **Datos → Proteger hojas y rangos → Añadir hoja o rango**, rango `Esdeveniments!J1:K1` → **Establecer permisos → Mostrar un aviso al editar este rango**, como la protección de `A1:I1`.

Si faltan J1 y K1, la agenda funciona igual y esos campos salen vacíos. Si los escribes, hazlo según el orden de *Cómo publicar una entrega*.

- Si una fila está mal (id repetido, fecha fuera del 2 al 29 de noviembre, hora inválida), **se omite solo esa fila** y el resto sigue funcionando. Para ver cuáles, abre la web con `?admin` al final de la URL (`.../agenda-front-ampli/?admin`): sale la lista con el número de fila y el motivo. El panel también muestra las `features` que anuncia el script y cuántas inscripciones propias guarda ese navegador (`local signups`).
- Hasta 3 eventos por día es lo previsto, pero si pones más se muestran todos y la casilla crece.
- Los eventos de un día se ordenan por hora de inicio. **No hace falta ordenar la hoja**: la web ya ordena por fecha y hora. Si la quieres ordenar para verla mejor, usa **Datos → Ordenar hoja → por columna B (A→Z)** con la fila 1 fijada (`setup` la fija), y **nunca** selecciones las columnas incluyendo la cabecera para ordenarlas: la cabecera acabaría mezclada con los eventos.
- **Las cabeceras de la fila 1 no se pueden cambiar ni mover** (`id`, `data`, `inici`, `tipus`, `nom` son obligatorias). `setup` las protege con un aviso: si intentas editar una, Google Sheets pregunta si de verdad quieres hacerlo (también protege las listas de fechas y horas de `Config!E:F`). Es un aviso y no un bloqueo, a propósito: tú eres el único editor, y un bloqueo "solo yo" no te frenaría. Para quitar o cambiar la protección: **Datos → Proteger hojas y rangos**. Si aun así falta alguna cabecera, la web muestra «L'agenda té un problema i ara no es pot mostrar»; abre `?admin` para ver cuál falta y qué filas se ignoran. Si te equivocas, **Archivo → Historial de versiones → Ver el historial de versiones** te deja restaurar la hoja a un momento anterior.
- Hay una plantilla en [`docs/plantilla-esdeveniments.csv`](docs/plantilla-esdeveniments.csv).
- Los cambios se ven al recargar la página. Quien ya la tiene abierta los verá al volver a ella pasados 2 minutos o al pulsar *Participar* (que recarga la agenda en silencio). Abrir el detalle no recarga.

## Inscripciones

- Pestaña **`Inscripcions`**: el script añade una fila por inscripción (`data_hora`, `event_id`, `nom`, `request_id`). Nunca la edita; solo borra una fila cuando la propia persona se desapunta (ver *Baja*).
- **Baja (R4)**: quien se apuntó puede quitarse desde el mismo navegador. En un evento abierto, la tarjeta muestra **Desapuntar-me** en lugar de *Participar*, y pide un segundo toque («Segur? Prem de nou», 5 s) antes de enviar. Con varias inscripciones propias en el mismo evento, el botón abre el modal de *Participar*, que lista «La teva participació» con su nombre y **Desapuntar-me** cada una (mismo doble toque). La web guarda en `localStorage` el `request_id` de cada inscripción: es el único «permiso» para borrarla, y `request_id` no sale nunca en la lectura pública (`?action=agenda`). Por eso la baja solo se ofrece en el navegador donde se hizo la inscripción: si la persona cambia de móvil, limpia los datos del navegador o usa otro, no ve el botón y la quitas tú a mano. Tampoco se ofrece en eventos pasados, cancelados, con inscripciones cerradas (`Config!B1` = `NO`) ni con URL externa, ni en el detalle (donde *Participar* sigue disponible para apuntarse de nuevo o apuntar a otra persona).
- **Pestaña `Baixes`** (se crea sola con la primera baja): antes de borrar la fila, el script copia `data_hora_baixa`, `event_id`, `nom` y `request_id` aquí. Es el archivo para deshacer una baja por error (copia la fila de vuelta a `Inscripcions`) o para ver quién se quitó. Nadie la lee ni la borra: contiene nombres, así que entra en la limpieza de *Cuando acabe noviembre*. El script busca la fila por `event_id` **y** `request_id` y la vuelve a comprobar justo antes de borrar: si mientras tanto reordenaste o editaste la hoja y esa fila ya no coincide, no borra nada y responde `removed:false`.
- **Borrar o corregir un nombre a mano** (otro navegador, otro estado del evento, abuso): borra o edita la fila en la hoja. Lo que borras tú no se archiva en `Baixes`.
- **Cerrar las inscripciones**: pestaña `Config`, celda **B1** → `NO`. Vuelve a `SI` para abrirlas. Con `NO` la web no ofrece la baja, pero el script la sigue aceptando con el `request_id` correcto.
- **Límites** (en `Code.gs`): 150 inscritos por evento y 3000 en total.
- **Duplicados**: se permiten y se cuentan. Dos personas pueden llamarse igual, así que no se deduplica por nombre. Si la respuesta del servidor se pierde y la web reintenta, el `request_id` evita que se escriba dos veces.
- **Quién lo ve**: la lista de apuntados es pública para cualquiera que tenga el enlace (y la URL del script es pública, porque va en el código de la web). Es una decisión aceptada. El modal pide escribir solo el nombre de pila o un apodo. Con un grupo de unas 100 personas, un nombre de pila junto con un lugar y una hora puede identificar a alguien.
- **Sin login**: cualquiera puede apuntar a otra persona o llenar la lista con basura. Lo que sí hace el servidor: solo acepta nombres de 1 a 30 caracteres que empiecen por letra o número (nunca `=`, `+`, `-`, `@`, para que no se interpreten como fórmulas), escribe en formato texto, y comprueba que el evento existe. Si hay abuso, pon `NO` en `Config!B1` y borra las filas desde la hoja. La baja no abre otra vía de abuso: sin el `request_id` de una fila (que solo está en la hoja y en el navegador de quien se apuntó) no se puede borrar, y con uno inventado el script responde `removed:false` sin tocar nada.

## Backup y restauración del script

El código del script existe en dos sitios que nada obliga a mantener iguales: `apps-script/Code.gs` y `apps-script/appsscript.json` en este repositorio, y el proyecto de Apps Script, donde se pega a mano. El backup es una **etiqueta de Git** (`script-v1`, `script-v2`…) sobre un commit en el que esos dos archivos son exactamente los desplegados. `script-v1` es el estado desplegado antes de R2.

**Procedimiento en cada entrega que toque el script (R2 y R4):**

1. **Anotar la versión en uso.** En *Implementar → Gestionar implementaciones*, apunta el número de versión N que usa la implementación de la web.
2. **Capturar el estado real.** Copia el contenido de `Code.gs` y de `appsscript.json` del editor (allí el archivo se llama `Código.gs`) sobre los archivos de `apps-script/` y ejecuta `git diff` contra la última etiqueta (`git diff script-v1 -- apps-script/`). Sin diferencias, esa etiqueta ya es el backup. Con diferencias, haz commit «script: estado desplegado (versión N), antes de R2» (o R4) y crea la etiqueta siguiente: `git tag -a script-vK -m "script: estado desplegado (versión N)"`.
3. **Desplegar.** *Gestionar implementaciones → ✎* de la implementación **cuyo ID coincide con el de la URL de la web** (`AGENDA_API_URL`) *→ Versión nueva*, con la descripción de la entrega. La URL `/exec` no cambia. Nunca *Nueva implementación*: crea otro ID y otra URL, y la web seguiría llamando al script antiguo.
4. **Verificar la respuesta real** del script, no solo el editor (el editor puede ir por delante de lo desplegado): `curl -sL "$URL?action=agenda"` contra la URL de la web debe contener lo que cambia la entrega (R2: `responsable` e `inscripcio_url` en cada evento; R4: `"features":["unsignup"]`). Después, las comprobaciones de *Comprobaciones después de publicar* y las propias de la entrega.
5. **Guardar lo desplegado.** Apunta el número de versión nuevo N' que muestra el editor, pega de nuevo el contenido del editor sobre `apps-script/` (`git diff` debe salir vacío) y crea la etiqueta sobre el commit con ese código: `git tag -a script-vK -m "script: desplegado R2 o R4 (versión N')"`. Las etiquetas no se suben solas: `git push origin script-vK`.

**Restauración si una entrega falla:**

- **Rápida, mientras el proyecto exista:** *Gestionar implementaciones → ✎ → elegir la versión N*. Las versiones son instantáneas inmutables y la URL no cambia.
- **Si esa versión ya no existe o el proyecto se dañó:** `git checkout script-v1 -- apps-script/Code.gs apps-script/appsscript.json` (así se vuelve al estado anterior a R2; usa la etiqueta del estado anterior a la entrega que falló), pega los dos archivos en el editor y despliega una versión nueva en la misma implementación. La URL no cambia. Son unos minutos.
- **Datos.** El backup cubre el código, no la hoja. Para otros daños en la hoja se usa *Archivo → Historial de versiones* de Google Sheets.

**Límites.** El backup solo protege lo que se copió al repositorio: un cambio hecho en el editor y nunca copiado no queda respaldado, y por eso los pasos 2 y 5 comparan con `git diff`. La copia del editor al repositorio se hace a mano, sin `clasp`, para no instalar herramientas ni activar la API de Apps Script.

## Cómo publicar una entrega

La web se despliega con `git push` a `main` (el flujo de CI comprueba, prueba y publica) y el script a mano. El orden es siempre **script, web, datos**:

1. **Script** (solo si la entrega lo toca, R2 y R4): backup y despliegue según *Backup y restauración del script*. Siempre con *Gestionar implementaciones → ✎ → Versión nueva*, **nunca** *Nueva implementación*, que cambia la URL `/exec`. Los cambios del script son siempre aditivos: la web de antes sigue funcionando con el script nuevo, y la web nueva tolera un script antiguo (si faltan `responsable` o `inscripcio_url` los trata como vacíos).
2. **Web:** `git push` a `main`.
3. **Datos:** al final, lo que cambie en la hoja (cabeceras nuevas, responsables, URLs externas).

**R2 (responsable y URL externa), paso a paso:**

1. Backup del script (pasos 1 y 2 de *Backup y restauración del script*).
2. Pega `apps-script/Code.gs` en el editor y despliega una *Versión nueva* (pasos 3 a 5).
3. En la hoja, escribe a mano `responsable` en **J1** e `inscripcio_url` en **K1**, con formato de texto en J:K y la protección ampliada a J1:K1 (ver *Editar los eventos*).
4. Comprobación de lectura y latencia (ver *Entrega del responsable y la URL externa (R2)*).
5. `git push` a `main` y espera a que el CI publique.
6. Rellena `responsable` e `inscripcio_url` en los eventos que los necesiten.

**R4 (baja de la propia inscripción), paso a paso.** Borra datos: no te saltes ningún paso.

1. **Backup del script** (pasos 1 y 2 de *Backup y restauración del script*): anota la versión N en uso y deja `apps-script/` igual que lo desplegado, con su etiqueta `script-vK`.
2. **Copia de seguridad de `Inscripcions`** en el libro real: *Archivo → Descargar → Valores separados por comas (.csv)* con esa pestaña activa, y guarda el archivo fuera de Drive. Así, pase lo que pase, no pierdes ninguna inscripción.
3. **PROBAR PRIMERO EN UNA COPIA DEL LIBRO.** *Archivo → Hacer una copia* del libro (copia también el script). En la copia: *Extensiones → Apps Script*, pega `apps-script/Code.gs`, *Implementar → Nueva implementación → Aplicación web* (ejecutar como tú, acceso *Cualquier usuario*) y usa **esa** URL como `URL` de los `curl`. Aquí sí vale una implementación nueva, porque es otra URL y la web no la usa. En la copia comprueba:
   - `curl -sL "$URL?action=agenda"` trae `"features":["unsignup"]` y ningún `request_id`.
   - Un `signup` con `curl` (ver *Comprobaciones después de publicar*) y su baja con el mismo `requestId` (`"action":"unsignup"`): la respuesta lleva `"removed":true`, la fila desaparece de `Inscripcions`, y en la pestaña `Baixes` (nueva) queda la fila con la hora, el evento, el nombre y el `request_id`.
   - Repite exactamente la misma baja: ahora `"removed":false` y no cambia nada.
   - La comprobación que no escribe (*Entrega de la baja (R4)*, punto 2) con un `requestId` que no existe: `"removed":false`.
   - Con `Config!B1` en `NO`, la baja de otra inscripción de prueba funciona igual.
   Si algo no sale como aquí, no sigas: el libro real no se ha tocado.
4. **Desplegar en el libro real.** Pega `apps-script/Code.gs` en el editor del libro real y *Gestionar implementaciones → ✎ → Versión nueva* (pasos 3 a 5 de *Backup y restauración del script*; **nunca** *Nueva implementación*). No hace falta ejecutar `setup`: R4 no cambia las columnas de la hoja.
5. **Verificar** contra la URL de la web: la lectura trae `"features":["unsignup"]` y la comprobación que no escribe (*Entrega de la baja (R4)*, punto 2) devuelve `"removed":false`.
6. **Web:** `git push` a `main` y espera a que el CI publique. Hasta este momento la web antigua sigue funcionando con el script nuevo, que solo añade `features` y la acción `unsignup`.
7. **Una baja real de prueba**, desde el móvil con datos móviles: abre la web, pulsa *Participar* en un evento abierto, apúntate como `Prova` y ciérralo. En la tarjeta de ese evento, *Participar* debe haber pasado a **Desapuntar-me**. Púlsalo (cambia a «Segur? Prem de nou»), púlsalo de nuevo y debe salir «T’has desapuntat.»; el recuento baja, el botón vuelve a *Participar*, la fila de `Prova` desaparece de `Inscripcions` y aparece en `Baixes`. Si un mismo navegador tiene varias inscripciones en el evento, **Desapuntar-me** abre el modal con «La teva participació» y un botón por nombre. Después borra la fila de prueba de `Baixes`. Desde otro navegador, o en modo privado, el botón no debe aparecer.

**Si R4 sale mal:** la web, con `git revert` y `git push`; el script, con la versión anterior en *Gestionar implementaciones* (la web de R4 tolera el script anterior: sin `features` no muestra la baja). La pestaña `Baixes` no hace falta tocarla. Si una baja se hizo por error, copia su fila de `Baixes` de vuelta a `Inscripcions` (`data_hora`, `event_id`, `nom`, `request_id`) o recupérala del CSV del paso 2.

**No se despliegan juntos:** lectura (R2) y escritura destructiva (R4) en la misma versión del script; datos con URL externa en la hoja antes de que la web de R2 esté publicada (la web antigua los ignoraría y dejaría apuntarse en la agenda); quitar la lista del modal antes de que el detalle la muestre.

**Cómo se deshace una entrega:** la web, con `git revert` y `git push` (si el CI está en rojo, despliega la reversión con la entrada `skip_e2e`, ver *Puesta en marcha → 2. GitHub*); el script, volviendo a la versión anterior en *Gestionar implementaciones* o, si ya no existe, restaurando la etiqueta del backup.

## Desarrollo en local

```sh
npm install
npm run dev        # http://localhost:5173, con datos de ejemplo (sin Google)
npm run check      # tipos y avisos de Svelte
npm test           # tests de las funciones puras, del cliente y del script
npm run build      # genera build/ (el flujo de GitHub lo hace con las variables de entorno)
npx playwright install chromium   # una sola vez: descarga el navegador de las pruebas
npx playwright install webkit     # opcional: solo para la prueba de imagen en WebKit
npm run test:e2e   # pruebas de navegador (Playwright)
```

- Sin `VITE_AGENDA_API_URL`, `npm run dev` usa datos simulados en memoria (`src/lib/mock-api.js`). Una compilación de producción sin esa URL muestra el mensaje de error.
- Para probar contra tu hoja real: crea `.env.local` con `VITE_AGENDA_API_URL=https://script.google.com/macros/s/XXXX/exec`.
- Para compilar como en GitHub Pages: `BASE_PATH=/agenda-front-ampli VITE_AGENDA_API_URL=... npm run build`.
- Los tests del script ejecutan `apps-script/Code.gs` con un Google Sheets simulado (`apps-script/fake-google.js`). No sustituyen la comprobación real de arriba.
- `npm run test:e2e` compila la web como en GitHub Pages (`BASE_PATH=/agenda-front-ampli`, con la URL falsa `http://localhost:5301/exec`), la sirve con `vite preview` en `http://localhost:5300/agenda-front-ampli/` y abre un navegador. No hay servidor de Google ni segundo puerto: [`e2e/script.js`](e2e/script.js) intercepta dentro del navegador las peticiones a esa URL y las responde ejecutando el `Code.gs` real contra una hoja simulada. Cada prueba parte de una hoja nueva y de un reloj fijo (10 de noviembre de 2026, `Europe/Madrid`). Los proyectos son `chromium` (escritorio, 1280 px) y `mobile` (Pixel 7, 390 px): los dos bloquean la publicación. `webkit` (Safari de escritorio) solo ejecuta [`e2e/image.spec.js`](e2e/image.spec.js), porque ahí está el riesgo conocido de la imagen en blanco de Safari; en el CI va en un paso aparte con `continue-on-error: true`, así que si falla avisa pero no bloquea la publicación. Para ejecutarlo en local: `npx playwright test --project=webkit` (antes, `npx playwright install webkit`). No sustituye la comprobación S1 en un iPhone real. [`e2e/share.spec.js`](e2e/share.spec.js) prueba «Comparteix» con `navigator.share` simulado (`mockShare` en [`e2e/helpers.js`](e2e/helpers.js)): no sustituye la comprobación S2 con WhatsApp en un móvil real.
- Todos los textos de la web están en [`src/lib/texts.js`](src/lib/texts.js), para que un catalanohablante los revise en un solo sitio.

## Decisiones y límites

- **Solo del 2 al 29 de noviembre de 2026.** Son cuatro semanas completas (de lunes a domingo), así que la cuadrícula no tiene casillas vacías. Los días están en `src/lib/config.js` (`MONTH.firstDay` y `MONTH.lastDay`) y, para la lista desplegable de la hoja, en `FIRST_DAY` y `LAST_DAY` de `apps-script/Code.gs`. Para otro mes habría que cambiar los dos sitios, el año y el mes en ambos, y los tests. Si cambias las fechas del script, vuelve a ejecutar `setup`: reconstruye la lista y borra las fechas sobrantes.
- **Horas del desplegable (de 08:00 a 22:00).** Salen de `FIRST_TIME` y `LAST_TIME` en `apps-script/Code.gs`, en minutos desde las 00:00. Si solo borras celdas en `Config!F`, el desplegable cambia al momento, pero `setup` reconstruye esa lista desde el código y recupera el rango anterior; por eso el cambio duradero se hace en el código y se vuelve a ejecutar `setup`. Es solo una ayuda al rellenar la hoja: la web muestra cualquier hora válida (`HH:MM`) y un pegado la salta.
- **Si Google falla**: la web muestra la última copia guardada en el dispositivo con el aviso "Dades de fa X min". Si no hay copia, muestra un error con botón *Torna-ho a provar*, nunca un calendario vacío.
- **Si se envía un nombre y la respuesta no llega**, la web no reenvía: vuelve a leer la lista y, si el nombre está, da la inscripción por hecha.
- **Eventos pasados y cancelados**: se abre el detalle en solo lectura (se puede ver quién se apuntó, no apuntarse; sin *Participar*). Con las inscripciones cerradas (`Config!B1` = `NO`) pasa lo mismo, con el aviso «Les inscripcions estan tancades». Las tarjetas pasadas se ven en grises.
- **Botón Atrás en Android**: el detalle y el modal de inscripción son `<dialog>` nativos. No se ha tocado el historial del navegador, así que el comportamiento depende del navegador: en Chrome reciente Atrás cierra el diálogo (igual que Esc); en otros puede volver a la página anterior. Hay un botón *Tanca* siempre visible. *Resultado en Android:* pendiente de comprobar.
- **Navegador interno de WhatsApp (S3)**: decide si se construye la baja de inscripción (que solo funciona si `localStorage` se conserva al cerrar y volver a abrir el enlace). *Resultado:* `localStorage` se conserva al cerrar y volver a abrir el enlace (lo comprobó el autor); R4 se construyó.
- **Imagen (S1)**: el PNG se genera en el navegador con `html-to-image` (versión exacta `1.11.13`) a 2048 × 1346 px, con una sola fuente (Special Gothic Condensed One) y `pixelRatio: 1`. Si la fuente no se carga o el resultado sale vacío (se repinta una vez), o pasan 20 s, el botón vuelve a reposo con «No s’ha pogut generar la imatge». El tamaño del texto sale de `posterScale` por recuento de caracteres del nombre y del lugar, en tres escalones (`1.9`, `1.5`, `1.15`); el texto largo mantiene los tamaños anteriores (`1`) y los nombres con letras muy anchas pueden perder líneas. Un nombre de más de cuatro líneas o un lugar de más de tres se corta con `line-clamp`; en el Chrome actual la librería pierde los puntos suspensivos de `line-clamp` (el texto se corta en seco, dentro de la imagen). *Resultado en iPhone antiguo:* pendiente de comprobar. *Resultado en Android de gama baja:* pendiente de comprobar (ver *Comprobaciones después de publicar*).
- **WhatsApp y el texto con la imagen (S2)**: *Comparteix* envía la imagen y el texto en un solo `navigator.share`, pero lo que hace WhatsApp con el texto junto a una imagen adjunta depende de la app y no se puede probar desde el entorno de desarrollo. Si no lo conserva, es un límite conocido: la persona usa *Copia l’enllaç* y pega el enlace. *Resultado en iPhone:* pendiente de comprobar. *Resultado en Android:* pendiente de comprobar (ver *Comprobaciones después de publicar*). R3b se construyó antes de S1 y S2; si salen mal, se revierten R3b y R3a con `git revert` y R3 sigue la regla de S1 (canvas o descartar).
- **No se indexa**: `noindex` en `src/app.html` y `robots.txt`.
- **Latencia de `doGet` (R2)**: `doGet` lee las hojas completas en cada carga y un mensaje de WhatsApp puede producir una ráfaga de cargas. *Resultado (12 de noviembre):* entre 2,6 y 3,6 s por petición, de los que 1,0–1,3 s son la base de la plataforma (`?action=x`, que no lee la hoja). Sin caché por ahora; se reconsidera con el script de R4 o si aparecen errores de carga.
- **`responsable` e `inscripcio_url` son públicos**: lo que escribas en esas columnas lo ve cualquiera que abra la web, y el campo `responsable` no se limita a nombres de pila. La URL externa solo admite `https://` y se abre con `rel="noopener noreferrer"`; el script devuelve ambos campos tal cual y es la web la que valida la URL.
- **Colores**: lima `#CFE287`, naranja `#DE4B28`, y `#A8351A` (naranja oscuro) para el texto pequeño y las tarjetas de Actes. Lima sobre `#A8351A` da un contraste de 4,67:1 (cumple AA para texto normal). La cabecera usa `#EEF5CF` sobre el naranja (3,62:1: solo vale para texto grande, por eso el título y el mes tienen un mínimo de 24 px). Las maquetas de referencia están en [`docs/disseny/`](docs/disseny/).
- **Licencias de las fuentes**: Special Gothic y Special Gothic Condensed One están bajo SIL OFL 1.1 y se sirven desde la propia web. Los textos de licencia están en [`static/licenses/`](static/licenses/).

## Cuando acabe noviembre

1. `Config!B1` → `NO`.
2. Descarga o borra las pestañas `Inscripcions` y `Baixes` (son datos de personas).
3. Si no se va a reutilizar: en Apps Script, *Implementar → Gestionar implementaciones → Archivar*, y desactiva GitHub Pages o borra el repositorio.

## System Overview

Static SvelteKit site (`adapter-static`, prerendered) that reads and writes its data through a Google Apps Script web app bound to a Google Sheet. The browser talks to the script with `GET ?action=agenda` and `POST` actions `signup` / `unsignup`; see *Cómo funciona* above for the diagram.

## Local Interface & Invariants

- [vite.config.js](./vite.config.js): SvelteKit plugin with `adapter-static`, runes mode forced outside `node_modules`; `paths.base` is `BASE_PATH` only when `NODE_ENV === 'production'`, otherwise `''`.
- [playwright.config.js](./playwright.config.js): `testDir: 'e2e'`, `webServer` = `node e2e/serve.js`, projects `chromium`, `mobile`, `webkit` (see [e2e](./e2e/README.md)).
- [package.json](./package.json) scripts: `dev`, `build`, `preview`, `check`, `test`, `test:e2e`; `imports` alias `#lib` → `./src/lib/index.js`, `#lib/*` → `./src/lib/*`.

## Subdirectories & System Boundaries

- src: [./src/README.md](./src/README.md) - SvelteKit app shell, [lib](./src/lib/README.md) (logic, API client, texts, [components](./src/lib/components/README.md)) and [routes](./src/routes/README.md) (the single page).
- apps-script: [./apps-script/README.md](./apps-script/README.md) - `Code.gs` backend (`doGet`, `doPost`, `setup`), its manifest and the in-memory Google fake used by tests.
- e2e: [./e2e/README.md](./e2e/README.md) - Playwright specs and the in-browser Apps Script stand-in.

## Global Invariants

- The month range (days 2–29 of 2026-11) and the name rule are duplicated in `src/lib/config.js` / `src/lib/names.js` and `apps-script/Code.gs`; both sides must change together. The server copy is authoritative.
- The browser never learns another person's `request_id`; it exists only in `Inscripcions`/`Baixes` and in the sign-up's own browser `localStorage`.
- POSTs to the script are `text/plain` JSON with no custom headers (no CORS preflight); script answers are always HTTP 200.

## Global Side Effects

- Google Sheet tabs `Esdeveniments`, `Inscripcions`, `Baixes`, `Config` (through `apps-script/Code.gs`).
- Browser `localStorage` keys `agenda-sants-montjuic-2026-11` (offline copy) and `agenda-sants-montjuic-2026-11:mine` (own sign-ups).
- `npm run build` writes `build/`; `.github/workflows/deploy.yml` publishes it to GitHub Pages.

## System Verification

- Run: `npm test` (unit tests: `src/lib` and `apps-script`)
- Types: `npm run check`
- Browser: `npm run test:e2e`
