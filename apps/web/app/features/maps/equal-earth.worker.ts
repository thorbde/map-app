// Runs inside MapLibre's background workers (loaded with importScriptInWorkers).
// It gives them the Equal Earth maths, so the shapes they prepare land in the
// same place as on the page. See equal-earth.ts.
import { equalEarth } from "./equal-earth";

type MapLibreWorker = {
	setProjectionHandler(
		handler: (definition: string) => typeof equalEarth,
	): void;
};

(self as unknown as MapLibreWorker).setProjectionHandler(() => equalEarth);
