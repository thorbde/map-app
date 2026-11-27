import { exports } from "cloudflare:workers";
import { expect, it } from "vitest";

// Sends a request through the real Worker entry and React Router's server build.
it("renders the home page on the server", async () => {
	const response = await exports.default.fetch("http://localhost/");

	expect(response.status).toBe(200);
	expect(response.headers.get("content-type")).toBe("text/html");
	// The heading is the Panel's h1, which carries an id and a class.
	expect(await response.text()).toMatch(/<h1 [^>]*>Hello<\/h1>/);
});
