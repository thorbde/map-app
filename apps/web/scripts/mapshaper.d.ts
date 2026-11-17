// mapshaper ships no types. This is the one function scripts/build-maps.ts uses.
declare module "mapshaper" {
	const mapshaper: {
		/** Runs mapshaper commands on files held in memory, and returns its output files. */
		applyCommands(
			commands: string,
			input: Record<string, string>,
		): Promise<Record<string, Buffer | string>>;
	};
	export default mapshaper;
}
