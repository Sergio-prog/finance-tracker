# About stack
- this project is using bun, shadcn (/components/ui), tRPC, tanstack stack (start, router, query)
- supabase as db + auth
- drizzle orm

# Comments
- this project is on early stage. u can make breaking changes if u need
- project intented to work on both mobile and pc. on mobile it is could be add as app with "add to homepage" button.
- for now it is just a hobby project. tbh it does mean nothing

# Agent-facing API
- This project exposes a REST API at `/api/v1/*` authenticated via `X-API-Key` header.
  Other agents (or the same agent in future sessions) can use it to act on the user's behalf.
- **skills/finance-tracker-api/SKILL.md** — documentation for other agents on how to use the API.
  When you change API behaviour (new endpoints, changed responses, different auth, etc.),
  update this skill file immediately so other agents stay in sync.
- **packages/finances-cli/** — a CLI wrapper (`npx finances-cli`) around the REST API.
  When you add/remove endpoints or change parameters, update the CLI to match so agents
  that use the CLI instead of raw HTTP still work.

# Agent safety
- NEVER run seed scripts, database mutations, or any side-effectful scripts on your own initiative. Write the script and tell the user to run it themselves. This applies to any script that writes to a database, makes network calls, or modifies the filesystem beyond the project source files.