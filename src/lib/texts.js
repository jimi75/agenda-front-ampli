import { MONTH } from './config.js';

const NEW_TAB = '(s’obre en una pestanya nova)';

export const T = {
	siteTitle: (/** @type {import('./districts.js').District} */ district) => `Agenda Frontamplista ${district.name}`,
	siteDescription: (/** @type {import('./districts.js').District} */ district) =>
		`Accions i actes de ${MONTH.name} de ${MONTH.year} al districte ${district.deName}.`,
	monthLabel: `${MONTH.name} ${MONTH.year}`,
	weekdays: ['dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte', 'diumenge'],
	types: { accio: 'Acció', acte: 'Acte' },
	legendLabel: 'Tipus d’activitat',
	today: 'Avui',
	ofMonth: `de ${MONTH.name}`,
	newTab: NEW_TAB,
	consent: {
		label: 'Galetes',
		text: "Fem servir galetes de Google Analytics per saber, sense el teu nom, com es fa servir l'agenda. Google (EUA) rebrà aquestes dades. Només les activarem si acceptes. Pots canviar d'opinió a «Galetes», al peu de la pàgina.",
		more: 'Més informació',
		accept: 'Acceptar',
		reject: 'Rebutjar',
		now: (/** @type {import('#lib/analytics.js').ConsentState} */ state) => state === 'granted' ? 'Ara: acceptades' : 'Ara: rebutjades'
	},
	footer: {
		consent: 'Galetes',
		policy: 'Política de galetes',
		privacy: 'Privacitat (Barcelona en Comú) ↗'
	},
	cookiesPage: {
		title: 'Política de galetes · Agenda Frontamplista',
		heading: 'Política de galetes',
		sections: [
			{ heading: 'Què són les galetes', paragraphs: ["Les galetes són petits fitxers que un web desa al teu navegador. Aquest web també desa informació al teu navegador amb l'emmagatzematge local (localStorage), que funciona de manera semblant."] },
			{ heading: 'Què fem servir', paragraphs: [] },
			{ heading: 'Què recollim', paragraphs: ["Si acceptes, Google Analytics rep quines pàgines i activitats mires, si obres el mapa, si comences, acabes o anul·les una inscripció, si comparteixes una activitat i el districte de l'agenda. No enviem el teu nom ni cap text que escriguis. Google guarda aquestes dades associades a un identificador del teu navegador, sense el teu nom."] },
			{ heading: 'Qui rep les dades', paragraphs: ["Google Ireland Limited, que pot transferir les dades als Estats Units sota el Marc de Privacitat de Dades UE-EUA (EU-US Data Privacy Framework). Hem desactivat Google signals i la personalització d'anuncis."] },
			{ heading: 'Quant de temps', paragraphs: ['Google Analytics conserva les dades 14 mesos. Les galetes `_ga` caduquen als 13 mesos.'] },
			{ heading: 'Responsable', paragraphs: ["La coordinació de l'Agenda Frontamplista de Barcelona en Comú Sants-Montjuïc, que gestiona aquesta analítica per als tres districtes. Contacte: santsmontjuic@bcnencomu.cat. La [política de privacitat de Barcelona en Comú](https://barcelonaencomu.cat/politica-de-privacitat/) s'aplica a les inscripcions, però no a aquesta analítica."] },
			{ heading: "Com canviar d'opinió", paragraphs: ["Prem «Galetes» al peu de qualsevol pàgina de l'agenda i tria «Rebutjar». Esborrarem les galetes `_ga` i deixarem d'enviar dades. També pots esborrar les galetes des de la configuració del navegador."] }
		],
		table: {
			caption: 'Galetes i dades desades al navegador',
			headers: ['Nom', 'Titular', 'Finalitat', 'Durada', 'Tipus'],
			rows: [
				['_ga', 'Google', 'Distingir navegadors per comptar visites', '13 mesos', 'Analítica, opcional'],
				['_ga_XX3RJ48NN2', 'Google', "Mantenir l'estat de la sessió de Google Analytics", '13 mesos', 'Analítica, opcional'],
				['agenda-front-ampli:consent', 'Agenda Frontamplista', "Recordar si has acceptat o rebutjat les galetes d'analítica", '13 mesos', 'Necessària'],
				['agenda-…', 'Agenda Frontamplista', "Còpia de l'agenda per obrir-la sense connexió i les teves inscripcions (inclou el nom i el codi per desapuntar-te)", "Fins que l'esborris", 'Necessària']
			]
		},
		updated: 'Actualitzat el 15 de novembre de 2026.',
		back: "Torna a l'agenda"
	},
	noJs: 'Aquesta agenda necessita JavaScript per funcionar.',
	loading: 'Carregant l’agenda…',
	empty: 'Encara no hi ha cap activitat programada.',
	unreadable: 'L’agenda té un problema i ara no es pot mostrar. Torna-ho a provar d’aquí a una estona.',
	missingColumns: (/** @type {string[]} */ names, tab = 'Esdeveniments') =>
		`A la pestanya ${tab} no es troba la capçalera: ${names.join(', ')}. Ha de ser a la fila 1 i escrita exactament així.`,
	prefixWarning: (/** @type {string[]} */ ids, /** @type {import('./districts.js').District} */ district) =>
		`Aquests ids no comencen per ${district.prefix}: ${ids.join(', ')}. Es mostren igualment.`,
	allRowsSkipped: 'Cap fila del full és vàlida, per això no es mostra cap activitat.',
	loadError: 'No s’ha pogut carregar l’agenda.',
	loadErrorHelp: 'Comprova la connexió o torna-ho a provar d’aquí a uns minuts.',
	retry: 'Torna-ho a provar',
	status: { cancelled: 'Cancel·lat', modified: 'Modificat' },
	participate: 'Participar',
	viewSignups: 'Veure apuntats',
	pastNote: 'Aquesta activitat ja ha passat.',
	mapTitle: 'Obre el lloc a Google Maps',
	skippedWarning: (/** @type {number} */ n) =>
		`${n} ${n === 1 ? 'fila del full s’ha ignorat' : 'files del full s’han ignorat'} (només ho veus tu):`,
	staleData: (/** @type {number} */ minutes) => {
		if (minutes < 1) return 'Dades guardades fa uns segons. No s’ha pogut actualitzar.';
		if (minutes < 60) return `Dades de fa ${minutes} min. No s’ha pogut actualitzar.`;
		return `Dades de fa ${Math.floor(minutes / 60)} h. No s’ha pogut actualitzar.`;
	},
	count: (/** @type {number} */ n) =>
		n === 0 ? 'Ningú apuntat' : n === 1 ? '1 persona apuntada' : `${n} persones apuntades`,
	participateLabel: (/** @type {string} */ name, /** @type {string} */ date) =>
		`Participar a ${name}, ${date}`,
	unsignLabel: (/** @type {string} */ name, /** @type {string} */ date) =>
		`Desapuntar-me de ${name}, ${date}`,
	viewSignupsLabel: (/** @type {string} */ name, /** @type {string} */ date) =>
		`Veure qui s’ha apuntat a ${name}, ${date}`,
	dateLabel: (/** @type {number} */ weekday, /** @type {number} */ day) =>
		`${T.weekdays[weekday]} ${day} de ${MONTH.name}`,
	card: {
		detail: 'compartir i més...',
		detailLabel: (/** @type {string} */ name, /** @type {string} */ date) =>
			`Veure el detall de ${name}, ${date}`,
		manager: (/** @type {string} */ name) => `Responsable: ${name}`
	},
	detail: {
		close: 'Tanca',
		participation: 'Participació',
		listTitle: 'Persones apuntades',
		listEmpty: 'Encara no s’ha apuntat ningú.',
		externalNote: 'La inscripció es fa en una web externa.',
		notFound: 'No s’ha trobat aquesta activitat.'
	},
	share: {
		share: 'Comparteix',
		customImage: 'Tria una imatge pròpia per compartir',
		customShare: 'Comparteix amb la imatge pròpia',
		customChosen: 'Imatge triada, a punt per compartir',
		customFailed: 'No s’ha pogut compartir la imatge',
		generating: 'Generant…',
		ready: 'Imatge preparada: prem de nou',
		imageFailed: 'No s’ha pogut generar la imatge. Torna-ho a provar.',
		fallbackNote:
			'Aquest navegador no pot compartir la imatge. S’ha descarregat: adjunta-la al missatge.',
		waLink: 'Obre WhatsApp amb el text',
		title: (/** @type {string} */ name) => `📢 *${name}* 📢`,
		date: (/** @type {string} */ label) => `🗓️ ${label}`,
		time: (/** @type {string} */ range) => `⏰ ${range}`,
		place: (/** @type {string} */ place) => `📍 ${place}`,
		link: (/** @type {string} */ url) => `🔗 Més detalls i inscripcions: ${url}`
	},
	participation: {
		mine: 'La teva participació',
		unsign: 'Desapuntar-me',
		unsignConfirm: 'Segur? Prem de nou',
		unsigning: 'Desapuntant…',
		unsignDone: 'T’has desapuntat.',
		alreadyGone: 'Ja no hi eres a la llista.',
		hint: 'Si vols desapuntar-te, torna a obrir aquesta activitat des d’aquest mateix navegador.'
	},
	dialog: {
		close: 'Tanca',
		purpose: 'Apunta’t per avisar que hi vindràs.',
		privacy:
			'El teu nom serà visible per a qualsevol persona que tingui l’enllaç. Posa-hi només el teu nom de pila o un àlies.',
		nameLabel: 'El teu nom o àlies',
		submit: 'Apunta’m',
		submitExternal: 'Continua a la inscripció ↗',
		submitExternalLabel: `Continua a la inscripció ${NEW_TAB}`,
		goExternal: 'Ves a la inscripció externa ↗',
		goExternalLabel: `Ves a la inscripció externa ${NEW_TAB}`,
		sending: 'Enviant…',
		success: 'Fet! S’ha registrat la teva participació.',
		closed: 'Les inscripcions estan tancades.',
		pastNote: 'Aquesta activitat ja ha passat: no s’hi pot apuntar ningú més.',
		cancelledNote: 'Aquesta activitat s’ha cancel·lat: no s’hi pot apuntar ningú més.'
	},
	signupErrors: /** @type {Record<string, string>} */ ({
		empty: 'Escriu el teu nom o àlies.',
		invalid_name:
			'El nom no és vàlid. Fes servir només lletres, números i espais (màxim 30 caràcters).',
		unknown_event: 'Aquesta activitat ja no existeix. Recarrega la pàgina.',
		event_full: 'Aquesta activitat ja té el màxim de persones apuntades.',
		closed: 'Les inscripcions estan tancades.',
		busy: 'El servidor està ocupat. Torna-ho a provar d’aquí a un moment.',
		network: 'No s’ha pogut enviar. Comprova la connexió i torna-ho a provar.',
		unconfirmed:
			'No hem pogut confirmar l’enviament. Recarrega la pàgina i mira la llista abans de tornar-ho a provar.',
		server: 'Hi ha hagut un error al servidor. Torna-ho a provar d’aquí a un moment.',
		bad_request: 'No s’ha pogut fer. Recarrega la pàgina i torna-ho a provar.',
		unknown_district: 'No s’ha pogut fer. Recarrega la pàgina i torna-ho a provar.'
	})
};
