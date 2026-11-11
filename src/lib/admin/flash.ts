import { redirect } from "next/navigation";

/** Redirect back to a page with a one-shot message shown by <Flash/>. */
export function flash(path: string, kind: "msg" | "err", text: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${kind}=${encodeURIComponent(text.slice(0, 200))}`);
}
