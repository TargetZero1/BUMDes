# BUMDes Mulyoarjo App

React + Vite project for bookkeeping, warehouse stock, and Excel import/export.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in the Supabase values if you want to override the built-in defaults.
3. Start the app:
   ```bash
   npm run dev
   ```

## Supabase Schema

The app now expects authenticated users, `profiles`, `units`, and unit-scoped business tables in Supabase.

Apply the migration in `supabase/migrations/20260707000000_bumdes_auth_units.sql` to keep the database aligned with the code. It adds the auth trigger, RLS policies, unit seed rows, and the `unit_id` / `created_by` columns used by the app.

## Auth & Multi-Unit Features

**Implemented:**
- First-user-becomes-super-admin bootstrap (via `handle_new_user()` trigger)
- Role-based access: super_admin, unit_admin, staff, viewer
- Unit-scoped data filtering (all CRUD operations filter by `unit_id`)
- RLS policies enforce access control at the database layer
- Overview mode for super admins to view all units
- Approval-based onboarding (staff accounts pending approval until super admin enables)

**How it works:**
1. First signup creates a super_admin with `status='approved'` and `can_view_all=true`
2. Subsequent signups create pending profiles awaiting super-admin approval
3. Data tables (`kas_umum_debit`, `kas_umum_kredit`, etc.) are unit-scoped via `unit_id` foreign key
4. RLS policies check `can_access_unit()` function which validates unit membership or super-admin status
5. App passes user `access_token` to all queries for automatic session-based RLS

## Free Hosting

Best quick options for this app:

1. Vercel: connect the repo, set the build command to `npm run build`, and the output folder to `dist`.
2. Netlify: connect the repo with the included `netlify.toml`; the app will build from `dist` automatically.

Both are free for this kind of static Vite app. Vercel is usually the fastest to set up, Netlify is just as simple if you prefer their dashboard.

## Project Structure

- `src/App.jsx` contains the app state and routing between sections.
- `src/components/` contains reusable UI sections and widgets.
- `src/lib/` contains constants, data transforms, Supabase helpers, analytics, and Excel helpers.
