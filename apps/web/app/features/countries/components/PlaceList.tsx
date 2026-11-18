import { ShapeTiles } from "@thorbde/ui";
import { Link as RouterLink } from "react-router";

export type PlaceListItem = {
	/** A continent's id or a country's ISO code: what its outline is found by. */
	id: string;
	name: string;
	/** A second line under the name, such as "55 countries". */
	detail?: string;
	to: string;
};

/**
 * TEMPORARY: every place gets this same round shape. The real outlines come
 * from the map data, in a PR of their own (docs/specs/m1.md, row 5b); they are
 * looked up here by `id`, and nothing else changes.
 */
const PLACEHOLDER_SHAPE = "M50 10a40 40 0 1 0 0 80a40 40 0 1 0 0-80z";

/**
 * The places a world or continent panel lists: each a link, drawn as a shape
 * with its name under it (DESIGN.md). `many` is for a continent's countries:
 * smaller tiles, four to a row.
 */
export function PlaceList({
	items,
	many = false,
}: {
	items: readonly PlaceListItem[];
	many?: boolean;
}) {
	return (
		<ShapeTiles
			dense={many}
			columns={many ? 4 : 3}
			items={items.map(({ name, detail, to }) => ({
				name,
				detail,
				d: PLACEHOLDER_SHAPE,
				render: <RouterLink to={to} />,
			}))}
		/>
	);
}
