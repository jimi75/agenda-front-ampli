# Agenda Frontamplista Sants-Montjuïc

Web estática, en catalán, con las acciones y actos de **noviembre de 2026** del distrito de Sants-Montjuïc. Se publica en GitHub Pages y lee los datos de una hoja de Google.

- Pantalla grande (desde 1024 px): cuadrícula tipo tablero, semana desde dilluns.
- Móvil: lista vertical, un día tras otro, solo los días con eventos. Se abre en el próximo día con eventos.
- Dos tipos: **Accions** (tarjeta lima) y **Actes** (tarjeta rojiza). Cada tarjeta lleva el nombre del tipo escrito, no solo el color.
- Cada tarjeta tiene un enlace **detall** (arriba a la derecha, en la línea del tipo) que abre el detalle del evento: a pantalla completa en móvil y como panel centrado desde 1024 px. Muestra tipo, nombre, fecha y hora, lugar con enlace a Google Maps, recuento y lista de apuntados. Tocar la tarjeta en otro sitio no hace nada.
- Cada evento abierto tiene botón **Participar**: abre un modal pequeño con el formulario (solo nombre o apodo). La tarjeta y el detalle muestran el recuento; la lista de apuntados está en el detalle. En un evento pasado, cancelado o con las inscripciones cerradas, la tarjeta ofrece **Veure apuntats**, que abre el detalle en solo lectura.
- Enlace directo a un evento: `…/agenda-front-ampli/?e=<id>` abre su detalle al cargar. Desde el detalle, **Comparteix** abre WhatsApp con un texto y ese enlace, y **Copia l’enllaç** lo copia. Abrir o cerrar el detalle no cambia la barra de direcciones: el enlace se construye siempre con el `id` del evento.
- Tipografía: Special Gothic (la de frenteamplio.info). Impact no se usa: es comercial y no está instalada en Android.

## Cómo funciona

```
Hoja de Google (la editas tú)  <──>  Apps Script (apps-script/Code.gs)  <──>  Web en GitHub Pages
 Esdeveniments, Inscripcions, Config      GET  ?action=agenda                      lee al abrir la página
                                          POST {action:"signup"}                   escribe al apuntarse
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
3. **Spike S3: `localStorage` en el navegador interno de WhatsApp** (decide si se construye la baja de inscripción, R4). Abre desde un chat `https://jimi75.github.io/agenda-front-ampli/?admin&e=ID_DE_UN_EVENTO`: el panel de `?admin` muestra `local signups: 0`. Pulsa *Participar* y apúntate como `Prova`: debe pasar a `local signups: 1`. Cierra el navegador interno y vuelve a abrir el mismo enlace desde WhatsApp. Si sigue en `local signups: 1`, `localStorage` se conserva; si vuelve a 0, no. **Anótalo** en la línea *Resultado* de *Navegador interno de WhatsApp (S3)*. Borra después la fila `Prova` de la hoja. La parte de S3 sobre descargar un archivo no se puede probar todavía: no hay ningún archivo que descargar hasta que exista la imagen (R3).

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

- Si una fila está mal (id repetido, fecha fuera del 2 al 29 de noviembre, hora inválida), **se omite solo esa fila** y el resto sigue funcionando. Para ver cuáles, abre la web con `?admin` al final de la URL (`.../agenda-front-ampli/?admin`): sale la lista con el número de fila y el motivo. El panel también muestra las `features` que anuncia el script y cuántas inscripciones propias guarda ese navegador (`local signups`).
- Hasta 3 eventos por día es lo previsto, pero si pones más se muestran todos y la casilla crece.
- Los eventos de un día se ordenan por hora de inicio. **No hace falta ordenar la hoja**: la web ya ordena por fecha y hora. Si la quieres ordenar para verla mejor, usa **Datos → Ordenar hoja → por columna B (A→Z)** con la fila 1 fijada (`setup` la fija), y **nunca** selecciones las columnas incluyendo la cabecera para ordenarlas: la cabecera acabaría mezclada con los eventos.
- **Las cabeceras de la fila 1 no se pueden cambiar ni mover** (`id`, `data`, `inici`, `tipus`, `nom` son obligatorias). `setup` las protege con un aviso: si intentas editar una, Google Sheets pregunta si de verdad quieres hacerlo (también protege las listas de fechas y horas de `Config!E:F`). Es un aviso y no un bloqueo, a propósito: tú eres el único editor, y un bloqueo "solo yo" no te frenaría. Para quitar o cambiar la protección: **Datos → Proteger hojas y rangos**. Si aun así falta alguna cabecera, la web muestra «L'agenda té un problema i ara no es pot mostrar»; abre `?admin` para ver cuál falta y qué filas se ignoran. Si te equivocas, **Archivo → Historial de versiones → Ver el historial de versiones** te deja restaurar la hoja a un momento anterior.
- Hay una plantilla en [`docs/plantilla-esdeveniments.csv`](docs/plantilla-esdeveniments.csv).
- Los cambios se ven al recargar la página. Quien ya la tiene abierta los verá al volver a ella pasados 2 minutos o al pulsar *Participar* (que recarga la agenda en silencio). Abrir el detalle no recarga.

## Inscripciones

- Pestaña **`Inscripcions`**: el script añade una fila por inscripción (`data_hora`, `event_id`, `nom`, `request_id`). Nunca la edita ni la borra.
- **Borrar o corregir un nombre**: borra o edita la fila en la hoja. No hay otra vía.
- **Cerrar las inscripciones**: pestaña `Config`, celda **B1** → `NO`. Vuelve a `SI` para abrirlas.
- **Límites** (en `Code.gs`): 150 inscritos por evento y 3000 en total.
- **Duplicados**: se permiten y se cuentan. Dos personas pueden llamarse igual, así que no se deduplica por nombre. Si la respuesta del servidor se pierde y la web reintenta, el `request_id` evita que se escriba dos veces.
- **Quién lo ve**: la lista de apuntados es pública para cualquiera que tenga el enlace (y la URL del script es pública, porque va en el código de la web). Es una decisión aceptada. El modal pide escribir solo el nombre de pila o un apodo. Con un grupo de unas 100 personas, un nombre de pila junto con un lugar y una hora puede identificar a alguien.
- **Sin login**: cualquiera puede apuntar a otra persona o llenar la lista con basura. Lo que sí hace el servidor: solo acepta nombres de 1 a 30 caracteres que empiecen por letra o número (nunca `=`, `+`, `-`, `@`, para que no se interpreten como fórmulas), escribe en formato texto, y comprueba que el evento existe. Si hay abuso, pon `NO` en `Config!B1` y borra las filas desde la hoja.

## Desarrollo en local

```sh
npm install
npm run dev        # http://localhost:5173, con datos de ejemplo (sin Google)
npm run check      # tipos y avisos de Svelte
npm test           # tests de las funciones puras, del cliente y del script
npm run build      # genera build/ (el flujo de GitHub lo hace con las variables de entorno)
npx playwright install chromium   # una sola vez: descarga el navegador de las pruebas
npm run test:e2e   # pruebas de navegador (Playwright)
```

- Sin `VITE_AGENDA_API_URL`, `npm run dev` usa datos simulados en memoria (`src/lib/mock-api.js`). Una compilación de producción sin esa URL muestra el mensaje de error.
- Para probar contra tu hoja real: crea `.env.local` con `VITE_AGENDA_API_URL=https://script.google.com/macros/s/XXXX/exec`.
- Para compilar como en GitHub Pages: `BASE_PATH=/agenda-front-ampli VITE_AGENDA_API_URL=... npm run build`.
- Los tests del script ejecutan `apps-script/Code.gs` con un Google Sheets simulado (`apps-script/fake-google.js`). No sustituyen la comprobación real de arriba.
- `npm run test:e2e` compila la web como en GitHub Pages (`BASE_PATH=/agenda-front-ampli`, con la URL falsa `http://localhost:5301/exec`), la sirve con `vite preview` en `http://localhost:5300/agenda-front-ampli/` y abre un navegador. No hay servidor de Google ni segundo puerto: [`e2e/script.js`](e2e/script.js) intercepta dentro del navegador las peticiones a esa URL y las responde ejecutando el `Code.gs` real contra una hoja simulada. Cada prueba parte de una hoja nueva y de un reloj fijo (10 de noviembre de 2026, `Europe/Madrid`). Los proyectos son `chromium` (escritorio, 1280 px) y `mobile` (Pixel 7, 390 px): los dos bloquean la publicación. `webkit` existe en `playwright.config.js` para una prueba de imagen posterior y todavía no ejecuta nada.
- Todos los textos de la web están en [`src/lib/texts.js`](src/lib/texts.js), para que un catalanohablante los revise en un solo sitio.

## Decisiones y límites

- **Solo del 2 al 29 de noviembre de 2026.** Son cuatro semanas completas (de lunes a domingo), así que la cuadrícula no tiene casillas vacías. Los días están en `src/lib/config.js` (`MONTH.firstDay` y `MONTH.lastDay`) y, para la lista desplegable de la hoja, en `FIRST_DAY` y `LAST_DAY` de `apps-script/Code.gs`. Para otro mes habría que cambiar los dos sitios, el año y el mes en ambos, y los tests. Si cambias las fechas del script, vuelve a ejecutar `setup`: reconstruye la lista y borra las fechas sobrantes.
- **Horas del desplegable (de 08:00 a 22:00).** Salen de `FIRST_TIME` y `LAST_TIME` en `apps-script/Code.gs`, en minutos desde las 00:00. Si solo borras celdas en `Config!F`, el desplegable cambia al momento, pero `setup` reconstruye esa lista desde el código y recupera el rango anterior; por eso el cambio duradero se hace en el código y se vuelve a ejecutar `setup`. Es solo una ayuda al rellenar la hoja: la web muestra cualquier hora válida (`HH:MM`) y un pegado la salta.
- **Si Google falla**: la web muestra la última copia guardada en el dispositivo con el aviso "Dades de fa X min". Si no hay copia, muestra un error con botón *Torna-ho a provar*, nunca un calendario vacío.
- **Si se envía un nombre y la respuesta no llega**, la web no reenvía: vuelve a leer la lista y, si el nombre está, da la inscripción por hecha.
- **Eventos pasados y cancelados**: se abre el detalle en solo lectura (se puede ver quién se apuntó, no apuntarse; sin *Participar*). Con las inscripciones cerradas (`Config!B1` = `NO`) pasa lo mismo, con el aviso «Les inscripcions estan tancades». Las tarjetas pasadas se ven en grises.
- **Botón Atrás en Android**: el detalle y el modal de inscripción son `<dialog>` nativos. No se ha tocado el historial del navegador, así que el comportamiento depende del navegador: en Chrome reciente Atrás cierra el diálogo (igual que Esc); en otros puede volver a la página anterior. Hay un botón *Tanca* siempre visible. *Resultado en Android:* pendiente de comprobar.
- **Navegador interno de WhatsApp (S3)**: decide si se construye la baja de inscripción (que solo funciona si `localStorage` se conserva al cerrar y volver a abrir el enlace). *Resultado:* pendiente de comprobar (ver *Comprobaciones después de publicar*).
- **No se indexa**: `noindex` en `src/app.html` y `robots.txt`.
- **Colores**: lima `#CFE287`, naranja `#DE4B28`, y `#A8351A` (naranja oscuro) para el texto pequeño y las tarjetas de Actes. Lima sobre `#A8351A` da un contraste de 4,67:1 (cumple AA para texto normal). La cabecera usa `#EEF5CF` sobre el naranja (3,62:1: solo vale para texto grande, por eso el título y el mes tienen un mínimo de 24 px). Las maquetas de referencia están en [`docs/disseny/`](docs/disseny/).
- **Licencias de las fuentes**: Special Gothic y Special Gothic Condensed One están bajo SIL OFL 1.1 y se sirven desde la propia web. Los textos de licencia están en [`static/licenses/`](static/licenses/).

## Cuando acabe noviembre

1. `Config!B1` → `NO`.
2. Descarga o borra la pestaña `Inscripcions` (son datos de personas).
3. Si no se va a reutilizar: en Apps Script, *Implementar → Gestionar implementaciones → Archivar*, y desactiva GitHub Pages o borra el repositorio.
