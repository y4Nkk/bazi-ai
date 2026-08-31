# Project memory

This file records verified, reusable project decisions. It is not a user-profile store, an AI conversation log, or a place for API keys, birth data, tokens, prompts, or generated personal reports.

## 2026-08-31: initial boundary

- Repository: y4Nkk/bazi-ai, private GitHub repository.
- Product: Chinese web application for deterministic BaZi trend analysis with optional BYOK AI interpretation.
- Deployment: one Next.js application on Vercel; no database, account system, queue, cron job, or separate backend in V1.
- Input owner: BirthInput includes Gregorian date and time, traditional chart gender, birthplace, timezone, longitude, latitude, and an explicit civil or true-solar time standard. Four manually typed pillars are not a V1 input path.
- Calculation owner: deterministic domain modules own the chart, luck cycles, factors, scores, and candles. AI cannot calculate or overwrite them.
- Chart owner: the smallest series point is a shichen; daily, monthly, and yearly candles aggregate lower-level points.
- BYOK: provider presets only; API keys are transient request data and are never persisted or logged.
- Visual source: DESIGN.md recreates SpiralCoder's semantic liquid-glass system under Bazi AI tokens. docs/reference/getdesign-apple.md is a preserved third-party Apple inspiration file, not the project visual source of truth.

## Verification status

- Git repository initialized locally on main and linked to https://github.com/y4Nkk/bazi-ai.git.
- GitHub repository is private and has the configured description.
- The getdesign Apple reference was installed and preserved at docs/reference/getdesign-apple.md.
- No application code, runtime dependency manifest, database, API endpoint, or deployment has been created yet.
