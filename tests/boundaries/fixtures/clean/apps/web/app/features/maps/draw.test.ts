// A colocated test may use devDependencies and cloudflare:* modules.

import { env } from "cloudflare:workers";
import knip from "knip";
import { draw } from "./draw";
export const cases = [knip, env, draw];
