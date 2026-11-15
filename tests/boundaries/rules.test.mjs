// Proves that every import rule in .dependency-cruiser.cjs catches what it should.
// Each folder in fixtures/ breaks exactly one rule (named after the folder);
// fixtures/clean/ follows them all. Run with `pnpm test:boundaries`.

import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { cruise } from "dependency-cruiser";

const require = createRequire(import.meta.url);
const config = require("../../.dependency-cruiser.cjs");
const fixturesDir = fileURLToPath(new URL("./fixtures/", import.meta.url));

/** The names of the rules a fixture breaks. */
async function brokenRules(fixture) {
	// The real options, minus the app's tsconfig path, which doesn't exist in fixtures.
	const { tsConfig: _appTsConfig, ...options } = config.options;
	const { output } = await cruise(["."], {
		...options,
		baseDir: `${fixturesDir}${fixture}`,
		ruleSet: { forbidden: config.forbidden },
		validate: true,
	});
	return [...new Set(output.summary.violations.map((v) => v.rule.name))].sort();
}

const ruleNames = config.forbidden.map((rule) => rule.name).sort();
const fixtures = readdirSync(fixturesDir).filter((name) => name !== "clean");

test("every rule has a fixture that breaks it", () => {
	assert.deepEqual(fixtures.sort(), ruleNames);
});

test("the clean fixture breaks no rules", async () => {
	assert.deepEqual(await brokenRules("clean"), []);
});

for (const rule of ruleNames) {
	test(`${rule}: catches its fixture, and nothing else fires`, async () => {
		assert.deepEqual(await brokenRules(rule), [rule]);
	});
}
