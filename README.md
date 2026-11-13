# French-write

A plain writing box for TCF Canada *expression écrite* practice. No spellcheck, no autocorrect, no suggestions. Entries are saved to Supabase, so they show up on every device you sign in on.

- Accent toolbar (`é è ê ë à â î ï ô û ù ü ç œ æ ä ÿ ' « » ·`) that inserts at the cursor, with a **Maj** toggle that switches the buttons to capitals (É È Ç Œ ...)
- Task selector (T1 / T2 / T3) with the word range for each task: 60–120, 120–150, 120–180
- Live word count, counted the TCF way (anything between two spaces is one word)
- Save Entry button, or Ctrl+S
- History panel with search. Type `T2` in the search box to see only T2 entries. Click an entry to reload it.
- The text you are typing is kept as a draft on the device, so a refresh does not wipe it

## Setup (about 5 minutes)

### 1. Create the database (Supabase, free)

1. Go to [supabase.com](https://supabase.com), sign in, and click **New project**. Any name, any region near you.
2. Open **SQL Editor**, paste everything from [`supabase/schema.sql`](supabase/schema.sql), and click **Run**.
3. Open **Authentication → Users → Add user → Create new user**. Enter your email and a password, and tick **Auto Confirm User**. This is the login you will use in the app.
4. Open **Project Settings → API** (or the **Connect** button at the top) and copy two values:
   - **Project URL**, which looks like `https://abcdefgh.supabase.co`
   - **Publishable key** (older projects call it the `anon` `public` key)

   Do not use the `secret` / `service_role` key. That one must never go in a website.

Optional but sensible: in **Authentication → Sign In / Providers**, turn off **Allow new users to sign up**. You already made your account in step 3, so nobody else needs to.

### 2. Deploy on Vercel (free)

1. Go to [vercel.com/new](https://vercel.com/new) and import the `French-write` GitHub repo. Vercel detects Vite on its own, so leave the build settings alone.
2. Before clicking Deploy, open **Environment Variables** and add:

   | Name | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | your Project URL |
   | `VITE_SUPABASE_KEY` | your Publishable key |

3. Click **Deploy**. Open the URL it gives you on any device and sign in with the email and password from step 1.3.

If you add or change the variables later, redeploy (**Deployments → ⋯ → Redeploy**). They are baked in at build time.

Every push to `main` redeploys automatically.

## Run it locally

```bash
npm install
```

```bash
npm run dev
```

To use the cloud database locally, copy `.env.example` to `.env.local` and fill in the same two values. Without them the app runs in local mode: it works, but entries stay in that one browser and the top bar says "Local mode: not synced".

## Good to know

- Your entries are protected by Row Level Security. The key in the website is public by design and can read nothing until you sign in, and then only your own rows.
- Android keyboards (Gboard and others) can still show their own suggestion strip. A website cannot switch that off. Turn off suggestions in the keyboard's settings if you want true exam conditions on a phone.
- Free Supabase projects pause after about a week with no activity. If sign-in stops working after a break, open the Supabase dashboard and click **Restore**.
