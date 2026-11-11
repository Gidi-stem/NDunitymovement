/**
 * Organisational copy. Written strictly from the approved brief: no invented statistics, partners,
 * achievements, registrations or guaranteed benefits. Programme activities are described as planned.
 */

export const vision =
  "A united, empowered and globally recognized Niger Delta where people can develop their potential and contribute to regional prosperity.";

export const mission =
  "To unite the people of the Niger Delta through inclusive human-capital development, women and youth empowerment, education, entrepreneurship, agriculture, sports and talent development, while promoting equal opportunity and sustainable community advancement.";

export const coreValues = [
  { name: "Unity", text: "We bring communities together across towns, states and backgrounds around shared goals." },
  { name: "Inclusion", text: "We serve communities across the Niger Delta without unlawful discrimination." },
  { name: "Empowerment", text: "We invest in people — their skills, confidence and opportunities." },
  { name: "Integrity", text: "We act honestly, account openly for what we do, and protect the trust placed in us." },
  { name: "Merit and Potential", text: "We recognise ability and nurture potential wherever we find it." },
  { name: "Service", text: "We exist to serve communities, not to advance personal or political interests." },
  { name: "Respect", text: "We respect people, culture, the law and one another." },
];

export const areasOfIntervention = [
  { slug: "education", title: "Education and Scholarships", blurb: "Academic support, learning opportunities and educational advancement." },
  { slug: "women-youth", title: "Women and Youth Empowerment", blurb: "Skills, mentoring and pathways to economic opportunity." },
  { slug: "enterprise", title: "Entrepreneurship and Business Support", blurb: "Practical support for people starting and growing enterprises." },
  { slug: "agriculture", title: "Agriculture and Food Security", blurb: "Training and support for farming, agribusiness and food security." },
  { slug: "sports", title: "Sports and Talent Development", blurb: "Competitions and talent discovery that open doors for young people." },
  { slug: "technology", title: "Technology and Skills Development", blurb: "Digital literacy, vocational training and technical capacity." },
  { slug: "humanitarian", title: "Community Service and Humanitarian Support", blurb: "Support for vulnerable households and underserved communities." },
];

export const objectives = [
  "Unite the people and communities of the Niger Delta around shared development goals.",
  "Promote education, learning and access to scholarship opportunities.",
  "Empower women and youth through skills, mentoring and enterprise support.",
  "Support agriculture, agribusiness and food security.",
  "Discover and develop talent, including through sports.",
  "Build digital, vocational and technical capacity.",
  "Provide community service and humanitarian support to vulnerable and underserved people.",
  "Promote equal opportunity and sustainable community advancement.",
];

export interface Programme {
  slug: string;
  title: string;
  summary: string;
  objectives: string[];
  beneficiaries: string[];
  activities: string[];
  participation: string;
}

export const programmes: Programme[] = [
  {
    slug: "education",
    title: "Education and Scholarships",
    summary: "Academic support, scholarships, learning opportunities and educational advancement for learners across the Niger Delta.",
    objectives: ["Widen access to learning and academic support.", "Encourage academic excellence and lifelong learning.", "Work towards scholarship opportunities for deserving learners, as resources allow."],
    beneficiaries: ["Primary, secondary and tertiary students", "Out-of-school and returning learners", "Teachers and community educators"],
    activities: ["Academic mentoring and coaching", "Study and learning support programmes", "Scholarship schemes, subject to funding and published criteria", "Education awareness and enrolment drives"],
    participation: "Scholarship and support opportunities will be announced under News & Updates with eligibility criteria and a selection process. Membership does not guarantee a scholarship.",
  },
  {
    slug: "women-youth",
    title: "Women and Youth Empowerment",
    summary: "Skills development, mentoring, entrepreneurship and economic opportunities for women and young people.",
    objectives: ["Build marketable skills and confidence.", "Connect women and youth with mentors and networks.", "Promote economic participation and self-reliance."],
    beneficiaries: ["Young people", "Women and women's groups", "Aspiring and early-stage entrepreneurs"],
    activities: ["Mentoring and leadership development", "Skills and enterprise training", "Peer networks and community forums"],
    participation: "Open calls for participation will be published when programmes are ready, with clear eligibility and selection information. Places and support are not guaranteed.",
  },
  {
    slug: "agriculture",
    title: "Agriculture",
    summary: "Agricultural training, farming support, agribusiness and food-security initiatives.",
    objectives: ["Improve knowledge of good agricultural practice.", "Support farmers and agribusiness start-ups.", "Contribute to local food security."],
    beneficiaries: ["Smallholder and subsistence farmers", "Young and women farmers", "Agribusiness entrepreneurs"],
    activities: ["Farmer training and demonstrations", "Agribusiness and value-chain awareness", "Community food-security initiatives"],
    participation: "Training and support will be announced as they become available. Inputs, grants or equipment are not guaranteed to members or participants.",
  },
  {
    slug: "sports",
    title: "Sports and Talent Development",
    summary: "Sports competitions, talent discovery and youth development.",
    objectives: ["Create safe, fair opportunities to compete and develop.", "Discover and nurture talent in sport and beyond.", "Use sport to build discipline, teamwork and community pride."],
    beneficiaries: ["Young athletes and aspiring professionals", "Schools, clubs and community teams", "Coaches and volunteers"],
    activities: ["Community and inter-community competitions", "Talent identification events", "Coaching and youth-development sessions"],
    participation: "Events will be announced publicly. All activities involving children follow NDUM safeguarding rules, including guardian consent.",
  },
  {
    slug: "technology",
    title: "Technology and Skills Development",
    summary: "Digital literacy, vocational training and technical capacity development.",
    objectives: ["Increase digital literacy and access.", "Provide practical vocational and technical skills.", "Prepare people for work and enterprise in a digital economy."],
    beneficiaries: ["Young people and job-seekers", "Women and community groups", "Small-business owners"],
    activities: ["Digital-skills workshops", "Vocational and technical training", "Practical enterprise and employability sessions"],
    participation: "Training opportunities will be published with dates and eligibility. Certificates, jobs or placements are not guaranteed.",
  },
  {
    slug: "humanitarian",
    title: "Humanitarian Services",
    summary: "Support for orphanages, vulnerable households and underserved communities.",
    objectives: ["Reach vulnerable and underserved people with practical support.", "Respond with dignity, fairness and accountability.", "Mobilise volunteers and community goodwill."],
    beneficiaries: ["Orphanages and child-care homes", "Vulnerable households", "Underserved communities"],
    activities: ["Community outreach and welfare visits", "Donation and support drives", "Volunteer-led community service"],
    participation: "Support is provided as resources allow. Communities and institutions may contact NDUM to be considered; support is not guaranteed.",
  },
];

export const tiers = [
  { id: "general_assembly", name: "General Assembly", text: "The proposed membership body of the Movement." },
  { id: "board_of_trustees", name: "Board of Trustees", text: "Proposed trustees responsible for oversight and stewardship." },
  { id: "national_executive_council", name: "National Executive Council", text: "The proposed national executive responsible for day-to-day leadership." },
  { id: "state_chapters", name: "State Chapters", text: "Proposed state-level units coordinating NDUM activity in each state." },
  { id: "lga_chapters", name: "LGA Chapters", text: "Proposed units at Local Government Area level." },
  { id: "ward_units", name: "Ward and Community Units", text: "Proposed grassroots units in wards and communities." },
  { id: "standing_committees", name: "Standing Committees", text: "Proposed committees for specific areas of work." },
] as const;
export type TierId = (typeof tiers)[number]["id"];

export interface LeaderProfile {
  id: string;
  tier: TierId;
  full_name: string;
  position: string;
  bio: string | null;
  photo_url: string | null;
}

/** Shown only until leadership profiles are entered in the dashboard. Biography intentionally empty. */
export const defaultLeadership: LeaderProfile[] = [
  { id: "default-president", tier: "national_executive_council", full_name: "Gladys Isaiah Ayibakipreye", position: "President, Niger Delta Unity Movement", bio: null, photo_url: null },
];

export const eligibility = [
  "You are committed to NDUM's vision, mission and core values.",
  "You are willing to follow the NDUM Constitution and lawful rules and policies.",
  "You can provide accurate personal and contact information.",
  "Membership is open to eligible individuals who wish to serve and strengthen communities across the Niger Delta, without unlawful discrimination.",
];

export const membershipResponsibilities = [
  "Act with integrity and respect, and uphold NDUM's values.",
  "Provide accurate information and keep your details up to date.",
  "Follow the NDUM Constitution and lawful rules and policies.",
  "Take part in the Movement's activities as your time allows.",
  "Pay applicable registration fees once formally approved by NDUM.",
];

export const membershipBenefits = [
  "Belong to a regional movement for unity and community development.",
  "Take part in NDUM programmes, events and activities, subject to each programme's published criteria.",
  "Volunteer, contribute ideas and help shape local chapters.",
  "Receive official NDUM communication and updates.",
];

export const faqs = [
  { q: "What is NDUM?", a: "The Niger Delta Unity Movement is a proposed nonprofit, community-focused movement working for regional unity, human-capital development and sustainable community advancement. It is not a political party or campaign." },
  { q: "Who can join?", a: "Eligible individuals who share NDUM's mission and agree to follow its Constitution and lawful policies. NDUM seeks to serve communities across the Niger Delta without unlawful discrimination." },
  { q: "Is there a membership fee?", a: "A registration fee of ₦2,000 is proposed and is pending formal approval. Online payment is not yet active. A separate identity-card fee has not yet been approved. Only pay through channels officially published on this website." },
  { q: "Does membership guarantee scholarships, grants, jobs or appointments?", a: "No. Membership does not guarantee any grant, scholarship, job or appointment. Programmes publish their own criteria and selection processes." },
  { q: "How is my personal information used?", a: "Only for membership administration, in line with our Privacy Notice and applicable Nigerian data-protection requirements. We do not collect National Identification Numbers or bank details when you register." },
  { q: "How will I know the status of my application?", a: "After applying you receive a private status link. You can use it to check your status, respond to any request for correction and, once payment is activated, pay the registration fee." },
];

export const POST_CATEGORIES: Record<string, string> = {
  announcement: "Announcement", programme: "Programme update", community: "Community development",
  event: "Event", scholarship: "Scholarship", empowerment: "Empowerment", press: "Press release",
};
export const GALLERY_CATEGORIES: Record<string, string> = {
  community: "Community activities", education: "Educational programmes", sports: "Sports activities",
  empowerment: "Empowerment initiatives", events: "Meetings and events",
};
