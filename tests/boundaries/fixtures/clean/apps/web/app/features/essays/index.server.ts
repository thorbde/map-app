import { slug } from "../../lib/slug";
import { env } from "../../server/platform/index.server";
import { map } from "../maps/index";
export const loadEssays = () => [map, env, slug];
