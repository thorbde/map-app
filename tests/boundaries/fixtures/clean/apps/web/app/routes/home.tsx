import { loadEssays } from "../features/essays/index.server";
import { map } from "../features/maps/index";
export const home = [map, loadEssays];
