import { Button, Panel } from "@thorbde/ui";
import { data, Form } from "react-router";
import { getViewer } from "../features/auth/index.server";
import type { Route } from "./+types/home";
import styles from "./home.module.css";

export function meta(_: Route.MetaArgs) {
	return [
		{ title: "Hello" },
		{ name: "description", content: "Learn the world, one country at a time." },
	];
}

export async function loader({ request }: Route.LoaderArgs) {
	const { viewer, headers } = await getViewer(request);
	const signInFailed = new URL(request.url).searchParams.has("sign-in");
	return data({ viewer, signInFailed }, { headers });
}

// The page depends on who is signed in: never stored in a shared cache (ADR 0003).
export function headers({ loaderHeaders }: Route.HeadersArgs) {
	return loaderHeaders;
}

// A rough sign-in panel until the map shell arrives (docs/specs/slice.md, PR 3). Polish comes later.
export default function Home({ loaderData }: Route.ComponentProps) {
	const { viewer, signInFailed } = loaderData;
	return (
		<div className={styles.page}>
			{viewer ? (
				<Panel title={`Hello, ${viewer.name}`} description="You're signed in.">
					<Form method="post" action="/auth/sign-out" reloadDocument>
						<Button type="submit" variant="secondary">
							Sign out
						</Button>
					</Form>
				</Panel>
			) : (
				<Panel
					title="Hello"
					description="Learn the world, one country at a time."
				>
					{signInFailed && (
						<p role="alert" className={styles.error}>
							Sign-in didn't work. Please try again.
						</p>
					)}
					<Form method="post" action="/auth/sign-in" reloadDocument>
						<Button type="submit">Continue with Google</Button>
					</Form>
				</Panel>
			)}
		</div>
	);
}
