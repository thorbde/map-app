import { Link } from "@thorbde/ui";
import { Link as RouterLink } from "react-router";
import styles from "./PlaceList.module.css";

export type PlaceListItem = {
	/** A continent's id or a country's ISO code: what its outline will be found by. */
	id: string;
	name: string;
	/** A short line with the name, such as "55 countries". */
	detail?: string;
	to: string;
};

/**
 * The places a world or continent panel lists, each a link.
 *
 * TEMPORARY: plain links. Thor chose shape tiles here, each place as its own
 * outline with its name under it (DESIGN.md). They replace the inside of this
 * component when the outlines have a build step and the tile is a component in
 * @thorbde/ui; the panels that use this don't change.
 */
export function PlaceList({ items }: { items: readonly PlaceListItem[] }) {
	return (
		<ul className={styles.list}>
			{items.map(({ id, name, detail, to }) => (
				<li key={id}>
					<Link render={<RouterLink to={to} />}>{name}</Link>
					{detail && <span className={styles.detail}> {detail}</span>}
				</li>
			))}
		</ul>
	);
}
