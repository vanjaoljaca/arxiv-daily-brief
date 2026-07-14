// Public synthetic sample. Daily private editions are generated from runs/hn/.
export type HnPulse = { text: string; by?: string; url?: string };
export type HnStory = { rank: number; id: number; title: string; url: string; discussionUrl: string; source: string; points: number; comments: number; timestamp: string; summary: string; badges: string[]; pulse: HnPulse[] };
export type HnDive = { storyId: number; title: string; why: string; agreement: string; disagreement: string; signal: string; projectLinks?: string[]; comments: HnPulse[] };
export type HnEdition = { contentType: "hn"; date: string; version: string; fetchedAt: string; current: boolean; hash: string; stories: HnStory[]; dives: HnDive[] };

export const hnEditions: HnEdition[] = [{
  contentType: "hn",
  date: "2026-01-02",
  version: "v1",
  fetchedAt: "2026-01-02T10:00:00.000Z",
  current: true,
  hash: "public-sample",
  stories: [
    { rank: 1, id: 1, title: "A public sample developer-tool headline", url: "https://example.com/tool", discussionUrl: "https://news.ycombinator.com/item?id=1", source: "example.com", points: 180, comments: 72, timestamp: "2026-01-02T09:30:00.000Z", summary: "A terse description of what shipped and why it may matter.", badges: ["Recommended", "Tools"], pulse: [
      { text: "One group values the simpler operating model.", by: "sample-one", url: "https://news.ycombinator.com/item?id=11" },
      { text: "Another questions the migration cost and missing benchmarks.", by: "sample-two", url: "https://news.ycombinator.com/item?id=12" },
      { text: "A practitioner reports where the approach worked in production.", by: "sample-three", url: "https://news.ycombinator.com/item?id=13" },
    ] },
    { rank: 2, id: 2, title: "A public sample programming-language headline", url: "https://example.org/language", discussionUrl: "https://news.ycombinator.com/item?id=2", source: "example.org", points: 96, comments: 38, timestamp: "2026-01-02T08:45:00.000Z", summary: "A small language experiment makes effects visible in function boundaries.", badges: ["PL"], pulse: [
      { text: "Supporters like the inspectable effect model.", by: "sample-four", url: "https://news.ycombinator.com/item?id=21" },
      { text: "Skeptics prefer a library or operating-system boundary.", by: "sample-five", url: "https://news.ycombinator.com/item?id=22" },
      { text: "Reviewers ask whether the syntax stays legible at scale.", by: "sample-six", url: "https://news.ycombinator.com/item?id=23" },
    ] },
    { rank: 3, id: 3, title: "A public sample general-interest headline", url: "https://example.net/science", discussionUrl: "https://news.ycombinator.com/item?id=3", source: "example.net", points: 74, comments: 29, timestamp: "2026-01-02T07:10:00.000Z", summary: "Broad coverage remains below the strongest personal matches instead of disappearing.", badges: [], pulse: [
      { text: "Readers ask for the primary source behind the claim.", by: "sample-seven", url: "https://news.ycombinator.com/item?id=31" },
      { text: "Domain experts add an older result that changes the novelty claim.", by: "sample-eight", url: "https://news.ycombinator.com/item?id=32" },
      { text: "Others focus on the economics of deployment.", by: "sample-nine", url: "https://news.ycombinator.com/item?id=33" },
    ] },
  ],
  dives: [{
    storyId: 1,
    title: "A public sample developer-tool headline",
    why: "The thread is large because a simple tool choice changes both workflow and security boundaries.",
    agreement: "The command-line path is now practical.",
    disagreement: "The convenience may not justify broad host access.",
    signal: "Concrete operating experience is more useful than generic enthusiasm.",
    projectLinks: ["Use narrow, inspectable interfaces when agents touch local tools."],
    comments: [{ text: "A practitioner names the exact permission boundary.", by: "sample-one", url: "https://news.ycombinator.com/item?id=11" }],
  }],
}];

export const newestHnEdition = hnEditions[0];
