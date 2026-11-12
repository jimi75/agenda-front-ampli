import { toBlob } from 'html-to-image';
import { POSTER } from './config.js';

const FONT = '150px "Special Gothic Condensed One"';
const TIMEOUT_MS = 20_000;

// html-to-image copies the computed style of the root into the clone, including the off-screen
// position, which would leave the image empty. These values cancel it.
const OPTIONS = Object.freeze({
	pixelRatio: 1,
	width: POSTER.width,
	height: POSTER.height,
	cacheBust: false,
	style: { position: 'static', left: '0', top: '0', transform: 'none', margin: '0' }
});

const imageFailed = (/** @type {unknown} */ cause) => new Error('image_failed', { cause });

/**
 * True when every pixel of the PNG is transparent (the known empty result of WebKit).
 * The PNG is drawn on a tiny canvas: the poster paints every pixel, so any opaque one means it rendered.
 * @param {Blob} blob
 */
async function isBlank(blob) {
	const url = URL.createObjectURL(blob);
	try {
		const image = new Image();
		image.src = url;
		await image.decode();
		const canvas = document.createElement('canvas');
		canvas.width = 16;
		canvas.height = 10;
		const context = canvas.getContext('2d', { willReadFrequently: true });
		if (!context) return true;
		context.drawImage(image, 0, 0, canvas.width, canvas.height);
		const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
		for (let i = 3; i < data.length; i += 4) if (data[i] !== 0) return false;
		return true;
	} finally {
		URL.revokeObjectURL(url);
	}
}

/** @param {HTMLElement} node */
async function render(node) {
	await document.fonts.load(FONT, node.textContent ?? '');
	if (!document.fonts.check(FONT)) throw imageFailed('font');

	let blob = await toBlob(node, OPTIONS);
	if (!blob || (await isBlank(blob))) {
		blob = await toBlob(node, OPTIONS);
		if (!blob || (await isBlank(blob))) throw imageFailed('blank');
	}
	return blob;
}

/**
 * Renders the poster node to a PNG file of exactly POSTER.width × POSTER.height.
 * Rejects with `Error('image_failed')` if the font is missing, the image is empty or it takes over 20 s.
 * @param {HTMLElement} node @param {string} id
 * @returns {Promise<File>}
 */
export async function renderPoster(node, id) {
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let timer;
	const timeout = new Promise((_, reject) => {
		timer = setTimeout(() => reject(imageFailed('timeout')), TIMEOUT_MS);
	});
	try {
		const blob = await Promise.race([render(node), timeout]);
		return new File([blob], `agenda-${id}.png`, { type: 'image/png' });
	} catch (error) {
		throw error instanceof Error && error.message === 'image_failed' ? error : imageFailed(error);
	} finally {
		clearTimeout(timer);
	}
}
