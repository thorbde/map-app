// Stories never ship, so they may use devDependencies.
import { cruise } from "dependency-cruiser";
import { button } from "./button";
export const story = [button, cruise];
