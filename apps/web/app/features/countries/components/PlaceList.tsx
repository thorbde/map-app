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
 * The places a world or continent panel lists: each a link, drawn as a shape
 * with its name under it (DESIGN.md). `many` is for a continent's countries:
 * smaller tiles, four to a row.
 */
export function PlaceList({
	items,
	outlines,
	many = false,
}: {
	items: readonly PlaceListItem[];
	/** Each place's outline by its `id`: path data in a 100 × 100 box (ADR 0020). */
	outlines: Readonly<Record<string, string>>;
	many?: boolean;
}) {
	return (
		<ShapeTiles
			dense={many}
			columns={many ? 4 : 3}
			items={items.map(({ id, name, detail, to }) => ({
				name,
				detail,
				d: outlines[id] ?? "",
				render: <RouterLink to={to} />,
			}))}
		/>
	);
}
