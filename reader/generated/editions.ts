export type Edition = {
  date: string;
  version: string;
  current: boolean;
  title: string;
  markdown: string;
};

export const editions: Edition[] = [
  {
    date: "2026-01-02",
    version: "v1",
    current: true,
    title: "Today’s useful questions",
    markdown: `# Today’s useful questions — sample edition

## Follow-up from yesterday

There was no voice feedback yesterday. The ranking still carries forward the open question about how interface structure changes what people notice.

## Learning and interaction

### A public sample paper

This sample shows the intended reading shape: what the researchers learned, what should update, why it connects to the reader, a useful question, and what remains unproven.

**Question:** What would make this result concrete enough to test in your own work?`,
  },
  {
    date: "2026-01-01",
    version: "v2",
    current: true,
    title: "A corrected sample edition",
    markdown: "# Corrected sample edition\n\nA later version can become current without erasing the original.",
  },
  {
    date: "2026-01-01",
    version: "v1",
    current: false,
    title: "Original sample edition",
    markdown: "# Original sample edition\n\nSaved history remains readable and addressable.",
  },
];

export const newestEdition = editions[0];
