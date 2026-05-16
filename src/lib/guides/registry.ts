import * as treasurerStart from "./posts/treasurer-start";
import * as duesExemptionPolicy from "./posts/dues-exemption-policy";
import * as futsalSplitTeams from "./posts/futsal-split-teams";
import * as futsalTacticsApp from "./posts/futsal-tactics-app";
import * as dormancyAutoExemption from "./posts/dormancy-auto-exemption";
import type { GuidePost } from "./types";

const all: GuidePost[] = [treasurerStart, duesExemptionPolicy, futsalSplitTeams, futsalTacticsApp, dormancyAutoExemption];

export const guides = Object.fromEntries(all.map((g) => [g.meta.slug, g])) as Record<
  string,
  GuidePost
>;

export const guideSlugs = all.map((g) => g.meta.slug);

export function getGuide(slug: string): GuidePost | null {
  return guides[slug] ?? null;
}

export function listGuides(): GuidePost[] {
  return [...all].sort((a, b) => b.meta.publishedAt.localeCompare(a.meta.publishedAt));
}
