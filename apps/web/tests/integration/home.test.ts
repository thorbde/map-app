import { exports } from "cloudflare:workers";
import { expect, it } from "vitest";

// Sends a request through the real Worker entry and React Router's server build.
it("renders the home page on the server", async () => {
	const response = await exports.default.fetch("http://localhost/");

	expect(response.status).toBe(200);
	expect(response.headers.get("content-type")).toBe("text/html");
	expect(await response.text()).toContain("<h1>Hello</h1>");
});
