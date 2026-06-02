# About stack
- this project is using bun, shadcn (/components/ui), tRPC, tanstack stack (start, router, query)
- supabase as db + auth
- drizzle orm

# Comments
- this project is on early stage. u can make breaking changes if u need
- project intented to work on both mobile and pc. on mobile it is could be add as app with "add to homepage" button.
- for now it is just a hobby project. tbh it does mean nothing

# Agent safety
- NEVER run seed scripts, database mutations, or any side-effectful scripts on your own initiative. Write the script and tell the user to run it themselves. This applies to any script that writes to a database, makes network calls, or modifies the filesystem beyond the project source files.