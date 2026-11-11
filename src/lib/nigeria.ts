/** The nine constitutionally recognised Niger Delta states (NDDC Act). */
export const NIGER_DELTA_STATES = [
  "Abia", "Akwa Ibom", "Bayelsa", "Cross River", "Delta", "Edo", "Imo", "Ondo", "Rivers",
] as const;

export const OTHER_REGION = "Outside the Niger Delta";

const OTHER_STATES = [
  "Adamawa", "Anambra", "Bauchi", "Benue", "Borno", "Ebonyi", "Ekiti", "Enugu", "Gombe", "Jigawa",
  "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Osun",
  "Oyo", "Plateau", "Sokoto", "Taraba", "Yobe", "Zamfara", "Federal Capital Territory",
];

/** All 36 states + FCT, alphabetical. */
export const ALL_STATES = [...NIGER_DELTA_STATES, ...OTHER_STATES].sort((a, b) => a.localeCompare(b));
export const CHAPTER_STATES = [...NIGER_DELTA_STATES, OTHER_REGION] as const;
export const RESIDENCE_STATES = [...ALL_STATES, "Outside Nigeria"] as const;
