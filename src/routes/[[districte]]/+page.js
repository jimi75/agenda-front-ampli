import { error } from '@sveltejs/kit';
import { findDistrict, ROOT_DISTRICT, ROUTED_DISTRICTS } from '#lib/districts.js';

export function entries() {
	return ROUTED_DISTRICTS.map((district) => ({ districte: district.slug }));
}

/** @type {import('./$types').PageLoad} */
export function load({ params }) {
	if (!params.districte) return { district: ROOT_DISTRICT };
	const district = findDistrict(params.districte);
	if (!district) error(404, 'Not found');
	return { district };
}
