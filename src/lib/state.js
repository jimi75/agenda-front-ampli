/**
 * @typedef {'past' | 'cancelled' | 'closed' | 'open'} ParticipationState
 */

/**
 * What a person can do with an event. The priority is: past, cancelled, closed, open.
 * `externalUrl` does not affect the state.
 * @param {{ date: string, status: string }} event
 * @param {{ today: string, signupsOpen: boolean }} context
 * @returns {ParticipationState}
 */
export function participationState(event, { today, signupsOpen }) {
	if (event.date < today) return 'past';
	if (event.status === 'cancelled') return 'cancelled';
	if (!signupsOpen) return 'closed';
	return 'open';
}
