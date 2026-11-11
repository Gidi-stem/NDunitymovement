export const koboToNaira = (kobo: number) => kobo / 100;
export const formatNaira = (kobo: number) =>
  "₦" + new Intl.NumberFormat("en-NG", { maximumFractionDigits: 2 }).format(kobo / 100);
