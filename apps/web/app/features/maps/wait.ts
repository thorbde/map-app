/**
 * The promise's value, or nothing once the time is up, whichever comes first.
 * For things worth waiting for, but not for ever.
 */
export function orAfter<T>(
	promise: Promise<T>,
	milliseconds: number,
): Promise<T | undefined> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeUp = new Promise<undefined>((resolve) => {
		timer = setTimeout(() => resolve(undefined), milliseconds);
	});
	return Promise.race([promise, timeUp]).finally(() => clearTimeout(timer));
}
