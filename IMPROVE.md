# SalatTrack Islamic Compliance Enhancement

You are a senior Next.js, Supabase, and product engineer.

Review the SalatTrack codebase and implement the following Islamic compliance improvements while maintaining a clean architecture, strong TypeScript typing, and production-ready code.

## Goal

Ensure SalatTrack remains a tool for self-accountability (muhasabah) and worship improvement, not a gamified religious ranking system.

---

## 1. Add Spiritual Intention Reminders

Create a reusable component:

components/islamic/IntentionReminder.tsx

Display rotating reminders such as:

* "These statistics are for personal reflection. Allah rewards sincerity, not numbers."
* "Prayer is an act of worship for Allah, not a competition."
* "Use this data to improve consistency, not to judge yourself harshly."
* "Allah knows your intentions better than any statistic."

Requirements:

* Mobile-friendly card design.
* Show one random reminder each day.
* Display on Dashboard.
* Display on Weekly View.
* Display on Monthly View.
* Display on AI Analysis page.

---

## 2. Prevent AI From Acting As A Mufti

Review all AI prompts and OpenRouter integrations.

The AI MUST NOT:

* Issue fatwas.
* Declare prayers valid or invalid.
* Declare users sinful.
* Claim Islamic rulings.
* Speak as an imam, scholar, or mufti.

The AI MAY:

* Analyze habits.
* Identify trends.
* Suggest productivity improvements.
* Suggest sleep and schedule adjustments.
* Encourage consistency.

Update the AI system prompt with strict boundaries.

Example guidance:

"You are a prayer habit coach, not an Islamic scholar. Never provide fatwas, legal rulings, or judgments regarding a user's religious status. Focus only on behavioral patterns, consistency, scheduling, and motivation."

Add safeguards in backend validation.

---

## 3. Replace Judgmental Language

Search the entire project.

Replace language such as:

* "Why you missed prayers"
* "You failed"
* "You are inconsistent"

With:

* "Possible contributing factors"
* "Areas for improvement"
* "Opportunities for greater consistency"

Use encouraging and respectful wording throughout.

---

## 4. Add Spiritual Disclaimer Component

Create:

components/islamic/SpiritualDisclaimer.tsx

Content:

"Prayer data is intended for personal reflection and improvement. Only Allah fully knows a person's intentions, circumstances, and efforts."

Display:

* Monthly analytics page.
* Weekly analytics page.
* AI analysis page.

---

## 5. Disable Public Prayer Rankings

If any leaderboard, public ranking, score comparison, friend ranking, or prayer competition system exists:

* Remove it.
* Disable it.
* Remove related routes and APIs.

If not yet implemented:

Update roadmap comments and documentation to state:

"Public prayer leaderboards are intentionally excluded to preserve sincerity and avoid riya (showing off)."

---

## 6. Update Future Roadmap

Modify roadmap documentation.

Remove:

* Community Leaderboard

Replace with:

* Personal Reflection Journal
* Dua Tracking
* Qada Prayer Tracker
* Quran Reading Consistency
* Personal Goal Setting

---

## 7. Add Educational Tooltip

Add tooltip near streaks and statistics:

"Streaks are a motivational tool only and do not measure a person's standing with Allah."

Display wherever streaks are shown.

---

## 8. Code Quality Requirements

* TypeScript strict mode.
* Accessible components.
* Reusable components.
* No duplicated logic.
* Clean architecture.
* Mobile-first responsive design.
* Production-ready implementation.

## Deliverables

1. Full code changes.
2. New components.
3. Updated AI prompt.
4. Updated documentation.
5. Summary of all files modified.
6. Explanation of how each change supports Islamic compliance.
