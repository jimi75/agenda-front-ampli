/**
 * @typedef {'past' | 'cancelled' | 'external' | 'closed' | 'open'} ParticipationState
 */

/**
 * What a person can do with an event. The priority is: past, cancelled, external, closed, open.
 * An event with a valid `inscripcio_url` (`externalUrl`) is 'external'; without it, it never is.
 * @param {{ date: string, status: string, externalUrl?: string }} event
 * @param {{ today: string, signupsOpen: boolean }} context
 * @returns {ParticipationState}
 */
export function participationState(event, { today, signupsOpen }) {
	if (event.date < today) return 'past';
	if (event.status === 'cancelled') return 'cancelled';
	if (Boolean(event.externalUrl)) return 'external';
	if (!signupsOpen) return 'closed';
	return 'open';
}
