# NZ Steel — Form Builder

A desktop-oriented tool for creating digital check sheets (checkbox, pass/fail,
number, comment, photo, mark-up, and rating fields) that replace paper PDF
check sheets. Forms are created, reviewed, and approved here, then published
to Supabase so the worklist app can load them for operators to fill in.

## One-time setup

### 1. Create the Supabase table

Open your Supabase project → **SQL Editor** → paste the contents of
`supabase-setup.sql` → **Run**.

This creates a `forms` table with a permissive access policy (fine for
proving the idea — tighten later with proper auth).

### 2. Add your Supabase credentials

Open `src/supabaseClient.js` and replace the two placeholder values:

```js
const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

Find both in your Supabase project under **Settings → API**. The anon key
is safe to use here — it's the public client key, not the secret
`service_role` key.

### 3. Set the GitHub Pages base path

Open `vite.config.js` and make sure `base` matches your GitHub repo name
exactly, e.g. if your repo is `github.com/msclarkNZS/nzsteel-form-builder`:

```js
base: "/nzsteel-form-builder/",
```

## Getting this into GitHub

1. Create a new **empty** repository on GitHub (no README/license, so there's
   nothing to conflict with) — e.g. `nzsteel-form-builder`.
2. On the repo's main page, click **Add file → Upload files**.
3. Drag this whole folder's contents into the upload area (including the
   `.github` folder — GitHub's uploader preserves folder structure on drag
   and drop, so it's a genuine upload, not a paste, which avoids the
   line-break stripping issue from pasting into text boxes).
4. Commit directly to `main`.
5. Go to **Settings → Pages** in the repo, and under **Build and deployment
   → Source**, choose **GitHub Actions**.
6. Go to the **Actions** tab — the deploy workflow should already be running
   from your upload. Wait for it to go green.
7. Your app will be live at:
   `https://<your-github-username>.github.io/nzsteel-form-builder/`

Every time you push changes to `main`, it rebuilds and redeploys
automatically — same pattern as nzsteel-pm.

## Local development (optional)

If the developer with VS Code wants to run this locally instead of only
building via GitHub Actions:

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## How saving works

Edits to a form (title, sections, fields, tags, etc.) update instantly in
the browser, but only get written to Supabase when you click **Save** in
the form editor. This matches an explicit "publish when ready" model rather
than autosaving every keystroke. The header shows **Unsaved changes** until
you save.

Deleting a form from the Library is immediate — it removes the row from
Supabase straight away, no separate save step.

## What's not wired up yet

- **Photos are stored as base64 inside the form's JSON** for now, not in a
  separate Supabase Storage bucket. This is simplest to prove the idea, but
  if forms accumulate a lot of reference photos, moving photo storage to a
  bucket (same pattern as nzsteel-pm) would be a good next step.
- **No login/roles yet** — the `forms` table currently allows anyone with
  the anon key to read and write. Fine while proving the concept; before
  wider rollout, this should be locked down (e.g. only supervisors can
  create/edit, only approved forms are visible to the worklist app).
- **No link to the worklist app yet** — this project only manages the
  `forms` table. The worklist app (built separately) is expected to read
  `status = 'approved'` forms from the same Supabase project and let
  operators pick one manually from an organised list — no automatic
  matching against SAP data for now.
