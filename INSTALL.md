# Install your own arXiv Daily Brief

The easiest installation method is to hand this repository to the LLM agent you already use. It should have internet access, a writable project folder, and some way to schedule recurring work and create a dated chat or task.

## One-prompt setup

Send your agent the repository URL and this prompt:

> Build me a personal daily arXiv briefing based on this repository. Do the setup work, not today's research synthesis, in this chat. Create a separate processing task for ingestion and synthesis, and create a fresh dated task containing the completed brief each day.
>
> Start by asking me only what is necessary to establish my initial interests, existing knowledge, preferred level of explanation, and wake-up deadline. Persist that as an editable reader profile.
>
> Each run must wait for the fresh official arXiv daily batch, ingest the complete batch rather than only keyword-searching, deduplicate it, and then rank papers against my profile. Do not force a paper into every interest category.
>
> Rewrite the research in language matched to my current understanding, while gently introducing the concepts I need to learn. For every selected paper, explain what the researchers learned, what the field should update, why it connects to me, one useful question I can ask, and what remains unproven. Assume I may read zero full papers at first, but help me build toward understanding and questioning the papers themselves. Avoid opening with ingestion statistics or assigning reading quotas.
>
> Persist dated feedback, a cursor recording which discussion turns have already been ingested, a dated-task registry, and an evidence-based knowledge map of papers and concepts I have actually encountered. Before each new run, ingest outstanding feedback from previous daily tasks.
>
> Keep raw processing out of the daily reading task. The daily task should contain the complete finished presentation inline, not merely a link to a file. Keep the setup/discussion task as the place where we change the process.
>
> Create a safe test run first. Only activate the recurring schedule after the test edition has been verified end to end.

## Files your agent should create

The exact format is flexible, but a simple Markdown-first instance should contain:

```text
context/
  reader-profile.md
feedback/
  YYYY-MM-DD.md
state/
  feedback-cursor.json
  daily-tasks.json
  knowledge-map.md
runs/
  YYYY-MM-DD/
    summary.json
    reading-brief.md
```

Large reproducible feed downloads should normally be ignored by Git. Keep the compact run summary and finished edition; refetch raw source material when necessary.

## Questions the setup interview should answer

- Which fields or problems reliably catch your attention?
- Which adjacent areas should be explored occasionally?
- What do you already understand, and what terminology needs gentle introduction?
- What makes a research summary feel boring, useful, or magnetic to you?
- When must the finished edition be waiting for you?
- Where should the dated brief appear?

Do not over-design the first profile. The point of the feedback loop is that the filter becomes more accurate through use.

## A good first-run check

Before trusting the schedule, verify that the system:

1. waited for and ingested the intended arXiv batch;
2. considered the complete batch rather than a preselected AI-only slice;
3. produced a genuinely personal, readable edition;
4. opened the dated task and presented the entire brief inline;
5. captured feedback from that task for the next run; and
6. preserved the original edition when feedback triggered a same-day rewrite.

Once that loop works, the daily brief can gradually become both a research radar and a record of how your interests and foundations develop.
