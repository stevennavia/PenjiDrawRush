# Penji Draw Rush

Canvas game with global Top 10 leaderboard, deployed as a static Vercel site plus one Vercel Function.

## Local preview

```bash
cd penji-draw-rush
python3 -m http.server -d dist 8080
```

Open `http://127.0.0.1:8080`. The game works without the leaderboard service; the ranking displays an availability message until Supabase is configured.

Controls: drag to draw ramps and bridges; Space jumps; P/Escape pauses; the round jump button supports touch play.

## Enable the global leaderboard

1. Create a new Supabase project.
2. In Supabase **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql) in full.
3. In Vercel, open the Penji Draw Rush project and add these Environment Variables for **Production**, **Preview**, and **Development**:
   - `SUPABASE_URL`: the Project URL from Supabase.
   - `SUPABASE_SERVICE_ROLE_KEY`: the `service_role` key from Supabase. Keep it private; do not put it in browser code or GitHub.
4. Redeploy Vercel.

The browser calls `/api/leaderboard`. The Vercel Function validates the alias and score, uses the server-only service key to communicate with Supabase, and stores only the best score for each normalized alias. The ranking sorts by score, then distance.

## API

- `GET /api/leaderboard` returns `{ leaderboard: [{ name, score, distance, updated_at }] }` with up to ten entries.
- `POST /api/leaderboard` accepts `{ name, score, distance }`, validates it, updates only a player's better result, and returns the refreshed leaderboard plus the player rank when applicable.

Alias rules: 2–16 characters; letters, numbers, spaces, underscores, and hyphens. Scores and distances must be whole non-negative values under 10,000,000.
