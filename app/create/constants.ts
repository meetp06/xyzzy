export const DURATION_OPTIONS = [
  { value: 16, label: "16s", description: "2 clips" },
  { value: 24, label: "24s", description: "3 clips" },
  { value: 32, label: "32s", description: "4 clips" },
  { value: 48, label: "48s", description: "6 clips" },
  { value: 64, label: "64s", description: "8 clips" },
  { value: 96, label: "96s", description: "12 clips" },
] as const;

export const FAMILIARITY_OPTIONS = [
  { value: "beginner", label: "New to this", description: "Explain like I'm hearing about this for the first time" },
  { value: "familiar", label: "Familiar", description: "I know the basics, give me the interesting details" },
  { value: "expert", label: "Expert", description: "I follow this closely, give me the deep cuts" },
] as const;

export const TOPIC_TYPES = {
  freetext: "freetext",
  news_link: "news_link",
  hacker_news: "hacker_news",
} as const;
