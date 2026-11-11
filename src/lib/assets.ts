import "server-only";
import fs from "node:fs";
import path from "node:path";

/**
 * Real photography and the official logo are supplied by NDUM. Drop files into /public/images
 * (hero.jpg, about.jpg, logo.png, …) and they appear automatically; until then pages use clean
 * placeholders. We deliberately do not ship generic stock photography.
 */
export function publicImage(name: string): string | null {
  try {
    return fs.existsSync(path.join(process.cwd(), "public", "images", name)) ? `/images/${name}` : null;
  } catch {
    return null;
  }
}
