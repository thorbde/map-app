import type { Route } from "./+types/home";

export function meta(_: Route.MetaArgs) {
	return [
		{ title: "Hello" },
		{ name: "description", content: "Learn the world, one country at a time." },
	];
}

// A placeholder until the map shell arrives in M1. Styling comes from @thorbde/ui in M0 PRs 5–7.
export default function Home() {
	return (
		<main>
			<h1>Hello</h1>
			<p>Learn the world, one country at a time. The map is on its way.</p>
		</main>
	);
}
