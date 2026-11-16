// Proves the retry in .github/scripts/deploy-worker.sh, with a fake `npx` standing in
// for wrangler. Run with `pnpm test:scripts`.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(
	new URL("../../.github/scripts/deploy-worker.sh", import.meta.url),
);

const NOT_YET =
	'echo "This Worker does not exist on your account. [code: 10007]"; exit 1';
const DEPLOYED = 'echo "https://map-app-pr-1.previews.workers.dev"; exit 0';
const BAD_TOKEN = 'echo "Authentication error [code: 10000]"; exit 1';

/** Runs the script with a fake npx whose n-th call behaves like outcomes[n]. */
function deploy(outcomes) {
	const dir = mkdtempSync(join(tmpdir(), "deploy-worker-"));
	const calls = join(dir, "calls");
	writeFileSync(calls, "");
	const cases = outcomes
		.map((outcome, index) => `${index + 1}) ${outcome} ;;`)
		.join("\n");
	writeFileSync(
		join(dir, "npx"),
		`#!/usr/bin/env bash\necho call >> "${calls}"\ncase "$(wc -l < "${calls}" | tr -d ' ')" in\n${cases}\nesac\n`,
	);
	chmodSync(join(dir, "npx"), 0o755);
	const result = spawnSync("bash", [script, "--name", "map-app-pr-1"], {
		encoding: "utf8",
		env: {
			...process.env,
			PATH: `${dir}:${process.env.PATH}`,
			WRANGLER_VERSION: "0.0.0",
			DEPLOY_RETRY_SECONDS: "0",
		},
	});
	return {
		status: result.status,
		url: result.stdout.trim(),
		calls: readFileSync(calls, "utf8").trim().split("\n").length,
	};
}

test("a deploy that works first time isn't repeated", () => {
	assert.deepEqual(deploy([DEPLOYED]), {
		status: 0,
		url: "https://map-app-pr-1.previews.workers.dev",
		calls: 1,
	});
});

test("'Worker does not exist' right after creating it is retried", () => {
	assert.deepEqual(deploy([NOT_YET, DEPLOYED]), {
		status: 0,
		url: "https://map-app-pr-1.previews.workers.dev",
		calls: 2,
	});
});

test("it gives up after three attempts", () => {
	const result = deploy([NOT_YET, NOT_YET, NOT_YET, DEPLOYED]);
	assert.equal(result.status, 1);
	assert.equal(result.calls, 3);
});

test("any other failure fails at once, with no retry", () => {
	const result = deploy([BAD_TOKEN, DEPLOYED]);
	assert.equal(result.status, 1);
	assert.equal(result.calls, 1);
});
