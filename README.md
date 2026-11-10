# Agenda Frontamplista Sants-Montjuïc

Web estática, en catalán, con las acciones y actos de **noviembre de 2026** del distrito de Sants-Montjuïc. Se publica en GitHub Pages y lee los datos de una hoja de Google.

- Pantalla grande (desde 1024 px): cuadrícula tipo tablero, semana desde dilluns.
- Móvil: lista vertical, un día tras otro, solo los días con eventos. Se abre en el próximo día con eventos.
- Dos tipos: **Accions** (tarjeta lima) y **Actes** (tarjeta rojiza). Cada tarjeta lleva el nombre del tipo escrito, no solo el color.
- Cada evento tiene botón **Participar**: abre un modal con la lista de apuntados y un formulario (solo nombre o apodo). La tarjeta muestra el recuento.
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
7. Vuelve a la hoja. Debes ver tres pestañas: `Esdeveniments` (con la cabecera `id, data, inici, fi, tipus, nom, lloc, mapa, estat`), `Inscripcions` (`data_hora, event_id, nom, request_id`) y `Config` (con `SI` en la celda B1). `setup` también deja listas desplegables en `Esdeveniments`: `data` (los 30 días de noviembre), `inici` y `fi` (de 06:00 a 23:55, de 5 en 5 minutos), `tipus` y `estat`. Las listas de fechas y horas están en las columnas E y F de `Config`: no las borres. Si `setup` falla a medias, corrige el código y vuelve a ejecutarlo: es seguro repetirlo y no toca eventos, inscripciones ni el interruptor `SI`/`NO`.
8. De vuelta en Apps Script: **Implementar → Nueva implementación**. Pulsa ⚙️ junto a *Seleccionar tipo* → **Aplicación web**. *Descripción*: `v1`. *Ejecutar como*: **Yo**. *Quién tiene acceso*: **Cualquier usuario**. Pulsa **Implementar** (si vuelve a pedir autorización, acéptala) y copia la **URL de la aplicación web**, que termina en `/exec`.
9. Comprueba la URL: pégala en una pestaña del navegador añadiendo `?action=agenda` al final. Debe salir `{"ok":true,"v":1,"signupsOpen":true,"events":[],"signups":{}}`.

> **Para cambiar el código más adelante** usa *Implementar → Gestionar implementaciones → ✎ → Versión nueva*. Si haces una "Nueva implementación", la URL cambia y la web deja de funcionar.

### 2. GitHub

1. El repositorio debe ser **público** (GitHub Pages gratis lo exige).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. **Settings → Secrets and variables → Actions → pestaña Variables → New repository variable**: nombre `AGENDA_API_URL`, valor la URL `/exec` del paso anterior. La publicación falla con un mensaje claro si falta.
4. Haz `push` a `main`. El flujo [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) comprueba los tipos, ejecuta los tests, compila y publica en `https://jimi75.github.io/agenda-front-ampli/`.

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
| `data` | sí | `2026-11-12` | Año-mes-día, y solo noviembre de 2026. |
| `inici` | sí | `10:00` | `HH:MM`. |
| `fi` | no | `14:00` | Si falta o es anterior al inicio, solo se muestra la hora de inicio. |
| `tipus` | sí | `Acció` / `Acte` | Lista desplegable. Cualquier otro valor se trata como Acció. |
| `nom` | sí | `Paradeta` | |
| `lloc` | no | `Plaça de Sants, Barcelona` | Se muestra y se enlaza a Google Maps (búsqueda por este texto). |
| `mapa` | no | `https://maps.app.goo.gl/...` | Si lo pones (debe empezar por `https://`), se usa este enlace en vez de la búsqueda. |
| `estat` | no | `Cancel·lat` / `Modificat` | Muestra la etiqueta en la tarjeta. Un evento cancelado no admite más inscripciones. |

- Si una fila está mal (id repetido, fecha fuera de noviembre, hora inválida), **se omite solo esa fila** y el resto sigue funcionando. Para ver cuáles, abre la web con `?admin` al final de la URL (`.../agenda-front-ampli/?admin`): sale la lista con el número de fila y el motivo.
- Hasta 3 eventos por día es lo previsto, pero si pones más se muestran todos y la casilla crece.
- Los eventos de un día se ordenan por hora de inicio.
- Hay una plantilla en [`docs/plantilla-esdeveniments.csv`](docs/plantilla-esdeveniments.csv).
- Los cambios se ven al recargar la página. Quien ya la tiene abierta los verá al volver a ella pasados 2 minutos o al abrir un modal.

## Inscripciones

- Pestaña **`Inscripcions`**: el script añade una fila por inscripción (`data_hora`, `event_id`, `nom`, `request_id`). Nunca la edita ni la borra.
- **Borrar o corregir un nombre**: borra o edita la fila en la hoja. No hay otra vía; el modal lo dice.
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
```

- Sin `VITE_AGENDA_API_URL`, `npm run dev` usa datos simulados en memoria (`src/lib/mock-api.js`). Una compilación de producción sin esa URL muestra el mensaje de error.
- Para probar contra tu hoja real: crea `.env.local` con `VITE_AGENDA_API_URL=https://script.google.com/macros/s/XXXX/exec`.
- Para compilar como en GitHub Pages: `BASE_PATH=/agenda-front-ampli VITE_AGENDA_API_URL=... npm run build`.
- Los tests del script ejecutan `apps-script/Code.gs` con un Google Sheets simulado (`apps-script/fake-google.js`). No sustituyen la comprobación real de arriba.
- Todos los textos de la web están en [`src/lib/texts.js`](src/lib/texts.js), para que un catalanohablante los revise en un solo sitio.

## Decisiones y límites

- **Solo noviembre de 2026.** El mes está en `src/lib/config.js`; para otro mes habría que cambiar eso, `validDates_()` en `apps-script/Code.gs` (la lista de fechas de `setup()`) y los tests.
- **Si Google falla**: la web muestra la última copia guardada en el dispositivo con el aviso "Dades de fa X min". Si no hay copia, muestra un error con botón *Torna-ho a provar*, nunca un calendario vacío.
- **Si se envía un nombre y la respuesta no llega**, la web no reenvía: vuelve a leer la lista y, si el nombre está, da la inscripción por hecha.
- **Eventos pasados y cancelados**: el modal se abre en solo lectura (se puede ver quién se apuntó, no apuntarse). Las tarjetas pasadas se ven en grises.
- **Botón Atrás en Android**: el modal es un `<dialog>` nativo. No se ha tocado el historial del navegador, así que el comportamiento depende del navegador: en Chrome reciente Atrás cierra el modal (igual que Esc); en otros puede volver a la página anterior. Hay un botón *Tanca* siempre visible.
- **No se indexa**: `noindex` en `src/app.html` y `robots.txt`.
- **Colores**: lima `#CFE287`, naranja `#DE4B28`, y `#A8351A` (naranja oscuro) para el texto pequeño y las tarjetas de Actes. Lima sobre `#A8351A` da un contraste de 4,67:1 (cumple AA para texto normal). La cabecera usa `#EEF5CF` sobre el naranja (3,62:1: solo vale para texto grande, por eso el título y el mes tienen un mínimo de 24 px). Las maquetas de referencia están en [`docs/disseny/`](docs/disseny/).
- **Licencias de las fuentes**: Special Gothic y Special Gothic Condensed One están bajo SIL OFL 1.1 y se sirven desde la propia web. Los textos de licencia están en [`static/licenses/`](static/licenses/).

## Cuando acabe noviembre

1. `Config!B1` → `NO`.
2. Descarga o borra la pestaña `Inscripcions` (son datos de personas).
3. Si no se va a reutilizar: en Apps Script, *Implementar → Gestionar implementaciones → Archivar*, y desactiva GitHub Pages o borra el repositorio.
