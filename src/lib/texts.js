import { MONTH } from './config.js';

export const T = {
	siteTitle: 'Agenda Frontamplista Sants-Montjuïc',
	monthLabel: `${MONTH.name} ${MONTH.year}`,
	weekdays: ['dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte', 'diumenge'],
	weekdaysShort: ['dl.', 'dt.', 'dc.', 'dj.', 'dv.', 'ds.', 'dg.'],
	types: { accio: 'Acció', acte: 'Acte' },
	legendLabel: 'Tipus d’activitat',
	today: 'Avui',
	ofMonth: `de ${MONTH.name}`,
	newTab: '(s’obre en una pestanya nova)',
	noJs: 'Aquesta agenda necessita JavaScript per funcionar.',
	loading: 'Carregant l’agenda…',
	empty: 'Encara no hi ha cap activitat programada.',
	unreadable: 'L’agenda té un problema i ara no es pot mostrar. Torna-ho a provar d’aquí a una estona.',
	missingColumns: (/** @type {string[]} */ names) =>
		`A la pestanya Esdeveniments no es troba la capçalera: ${names.join(', ')}. Ha de ser a la fila 1 i escrita exactament així.`,
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
	viewSignupsLabel: (/** @type {string} */ name, /** @type {string} */ date) =>
		`Veure qui s’ha apuntat a ${name}, ${date}`,
	dateLabel: (/** @type {number} */ weekday, /** @type {number} */ day) =>
		`${T.weekdays[weekday]} ${day} de ${MONTH.name}`,
	dialog: {
		close: 'Tanca',
		purpose: 'Apunta’t per avisar que hi vindràs.',
		privacy:
			'El teu nom serà visible per a qualsevol persona que tingui l’enllaç. Posa-hi només el teu nom de pila o un àlies.',
		correction: 'Si t’has equivocat, escriu a qui organitza: només ell pot esborrar noms.',
		nameLabel: 'El teu nom o àlies',
		submit: 'Apunta’m',
		sending: 'Enviant…',
		success: 'Fet! S’ha registrat la teva participació.',
		listTitle: 'Persones apuntades',
		listEmpty: 'Encara no s’ha apuntat ningú.',
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
		server: 'Hi ha hagut un error al servidor. Torna-ho a provar d’aquí a un moment.'
	})
};
