import { publicImage } from "@/lib/assets";

/** Official logo if /public/images/logo.(svg|png) exists; otherwise a neutral placeholder mark. */
export function Logo({ light = false, size = 40 }: { light?: boolean; size?: number }) {
  const file = publicImage("logo.svg") ?? publicImage("logo.png");
  if (file) {
    return <img src={file} alt="NDUM logo" width={size} height={size} style={{ height: size, width: "auto" }} />;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="NDUM placeholder mark">
      <rect width="48" height="48" fill={light ? "#fff" : "#123d2c"} />
      <rect y="38" width="48" height="4" fill="#c9a227" />
      <path d="M10 33V15l14 14V15m14 18V15" stroke={light ? "#123d2c" : "#fff"} strokeWidth="3.2" fill="none" strokeLinejoin="round" />
    </svg>
  );
}
