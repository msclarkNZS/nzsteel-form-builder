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

## Per-item grid orientation ("rotate" the table)

When a section contains one or more Per-item grid checks, a control appears
above the field list: **"One check, all items"** (default — tick a check
across every burner/unit before moving to the next check) vs **"One item,
all checks"** (pick a burner/unit first, then work through every check for
just that one, matching how an audit is actually walked on-site). This is
a per-section setting, so different sections in the same form can use
different orientations if needed.

## Per-cell notes on failed grid checks

Any Per-item grid cell set to **Fail** (when the cell type is Pass/Fail)
gets its own small "+ Note" button — a comment plus an optional photo
scoped to just that one failed cell, separate from the check's own
overall comment. These show up in the Summary too, labelled with which
item they belong to.

## Excluding checks from the summary, and summary header fields

Every check now has an **"Exclude from summary"** toggle and a **"Use
as"** selector (Operator name / Completion date / none) in its editor.
Fields marked as Operator name or Completion date don't need to be Pass/Fail
or have comments to show up — their entered value is pulled straight into
the Summary's header, alongside the form's title and document reference.
Anything ticked "Exclude from summary" (e.g. the operator's name field
itself) won't clutter the failed-checks/comments lists below.

## Review summary

In the preview, a "📋 Summary" tab sits alongside the sections (and appears
automatically as "View Summary →" after the last section on phone/tablet).
It lists:
- Every check where a Pass/Fail (or a Pass/Fail cell within a Per-item grid)
  was marked **Fail**
- Every check that has a comment or a photo attached to its comment

This gives a quick "what needs attention" view before actually submitting,
without having to page back through every section.

## Dropdown response type

A new **Dropdown** response type lets you define a fixed list of choices
(e.g. Good / Worn / Damaged) via a simple add/remove list in the field
editor. Toggle **Single** or **Multi** selection — single renders as a
native dropdown, multi renders as a set of toggleable chips.

## Per-item grid (matrix) response type

For check sheets structured as a table — the same check repeated across
several numbered units (burners, kilns, mills, etc.) — use the new
**Per-item grid** response type instead of creating a separate field per
column. Define the column headers once (there's a "Burners #2–#10" preset
button, or add your own list) and pick a cell type (Checkbox or Pass/Fail).
It renders as one compact row of identical inputs, one per column.

PDF import also recognises this pattern automatically where possible —
it's been taught to look for tables where a row's check applies once per
column, versus rows that are a single check spanning the whole row width.
Given how varied real check sheets are, always review what comes through
and adjust with the "✓ Check" / "ℹ️ Info text" toggle or by editing the
column list directly — this is a best-effort read of the table structure,
not a guarantee, especially on complex or inconsistently-formatted tables.

## Info text blocks vs checks

Not every line in a paper check sheet needs a response — safety notices,
setup instructions, and "before you begin" text at the top of a section are
common. Each field in the builder can be toggled between:

- **✓ Check** — a normal check with response types (checkbox, pass/fail,
  number, etc.)
- **ℹ️ Info text** — plain instructional content with no response inputs.
  Shows as a distinct blue card in preview and doesn't count towards the
  "X of Y completed" progress.

Toggle either way at any time from the field card in the editor. PDF import
also tries to classify each extracted item as one or the other automatically.

## Comments

Rather than an always-visible textarea on every check, the Comment response
type now shows as a small **+ Comment** button. Tapping it expands into a
text box plus an optional photo attachment — useful for adding context
without cluttering checks that don't need it.

## Importing forms from a PDF

There are two ways to import, chosen via a toggle in the Import modal:

**📋 Paste from Claude (works right now, no setup needed)**
Open a chat with Claude at claude.ai, upload your PDF check sheet, and send
along the extraction prompt shown in the modal (there's a Copy button).
Paste Claude's JSON reply back into the box and click Import. This uses
whatever Claude access you already have — no Anthropic API key, no billing,
nothing to configure.

**📄 Direct upload (not wired up yet)**
This calls the Anthropic API directly from the browser and currently fails
with "Failed to fetch" — there's no API key configured, and there
deliberately isn't one hardcoded in this repo (an API key in browser-visible
code is a real security problem, since anyone can view it in dev tools).

To make direct upload work, you'd need:
1. An Anthropic API key from console.anthropic.com
2. A small Supabase Edge Function that holds the key privately and proxies
   the request (browser → Edge Function → Anthropic API → back)
3. Store the key via `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`
   (never commit it to this repo)

Worth doing once you're past the prove-the-concept stage and want a fully
automated import flow. Until then, "Paste from Claude" covers the same
ground manually.

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
