// The Equal Earth projection (Šavrič, Patterson and Jenny, 2018), which MapLibre
// doesn't have built in. It is registered as a custom projection (ADR 0021).
//
// The map is centred on 11° E, so its edge is 169° W, in the Bering Strait: the
// same edge the map files are cut at (ADR 0020).

const A1 = 1.340264;
const A2 = -0.081106;
const A3 = 0.000893;
const A4 = 0.003796;
const M = Math.sqrt(3) / 2;
const RADIANS = Math.PI / 180;

/** MapLibre treats a custom projection's units as metres. */
const EARTH_RADIUS = 6_371_008.8;

const CENTRE_LONGITUDE = 11;

/** Degrees east of the map's centre, from -180 to 180. */
function fromCentre(lng: number): number {
	const offset = lng - CENTRE_LONGITUDE;
	// 191° is the map's eastern edge, and must not wrap round to the western one.
	if (offset === 180) return 180;
	return ((((offset + 180) % 360) + 360) % 360) - 180;
}

/** The polynomial that gives y, and its derivative, for the angle l. */
function polynomial(l: number): { y: number; slope: number } {
	const l2 = l * l;
	const l6 = l2 * l2 * l2;
	return {
		y: l * (A1 + A2 * l2 + l6 * (A3 + A4 * l2)),
		slope: A1 + 3 * A2 * l2 + l6 * (7 * A3 + 9 * A4 * l2),
	};
}

const HIGHEST_Y = polynomial(Math.asin(M)).y;

export const equalEarth = {
	/** Longitude and latitude in degrees → metres on the flat map. */
	forward(position: number[]): number[] {
		const [lng = 0, lat = 0] = position;
		const l = Math.asin(M * Math.sin(lat * RADIANS));
		const { y, slope } = polynomial(l);
		const x = (fromCentre(lng) * RADIANS * Math.cos(l)) / (M * slope);
		return [x * EARTH_RADIUS, y * EARTH_RADIUS];
	},

	/** Metres on the flat map → longitude and latitude, or null outside the world. */
	inverse(position: number[]): number[] | null {
		const [x = 0, y = 0] = position.map((value) => value / EARTH_RADIUS);
		if (Math.abs(y) > HIGHEST_Y) return null;
		// Newton's method: find the angle whose polynomial gives this y.
		let l = y;
		for (let i = 0; i < 12; i++) {
			const step = (polynomial(l).y - y) / polynomial(l).slope;
			l -= step;
			if (Math.abs(step) < 1e-12) break;
		}
		const offset = (M * x * polynomial(l).slope) / Math.cos(l) / RADIANS;
		const lat = Math.asin(Math.sin(l) / M) / RADIANS;
		if (Math.abs(offset) > 180 || !Number.isFinite(lat)) return null;
		return [offset + CENTRE_LONGITUDE, lat];
	},
};

const WORLD_WIDTH =
	2 * (equalEarth.forward([CENTRE_LONGITUDE + 180, 0])[0] as number);

/** What MapLibre's `addProjection` needs (its `CRS` type). */
export const equalEarthProjection = {
	name: "custom:equal-earth",
	projection: equalEarth,
	// MapLibre lays a square over the world, centred on it. Equal Earth is about
	// twice as wide as it is tall, so the square has empty space above and below.
	tileMatrixSet: {
		origin: [-WORLD_WIDTH / 2, WORLD_WIDTH / 2] as [number, number],
		extentAtZoom0: WORLD_WIDTH,
	},
	// MapLibre prepares our shapes in a background worker, which can't be handed
	// the functions above. It gets this name instead, and equal-earth.worker.ts
	// answers it with the same functions.
	definition: "equal-earth",
};
