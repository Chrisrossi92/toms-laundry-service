Tom’s Laundry Service — MVP

Pickup & delivery laundry, end-to-end: customers schedule pickups, admins manage operations, drivers run their routes, and everyone gets updates.

MVP Snapshot (what’s live)

Public: Home, Schedule (guest checkout supported), Track

Customer: Account (phone + email-opt-in)

Admin: Dashboard, Zones & Slots, Pricing, Users (invites), Business Settings

Driver: Driver dashboard with one-tap status updates

Payments: Stripe Checkout (Edge Functions: create-checkout, stripe-webhook)

Comms: Postmark email notifications (order updates)

How it works (quick flow)

Customer enters address & ZIP → app picks the zone (ZIP array match).

Customer chooses a time slot (date + 6–8pm window), sets bags & notes.

Customer pays via Stripe Checkout.

Admin sees the order on Dashboard, assigns a driver, advances statuses.

Customer can Track with a live timeline and gets emails at key steps.

Tech Stack

Frontend: React + Vite + Tailwind
Backend: Supabase (Postgres, Auth, RLS) + Supabase Edge Functions (Deno)
Payments: Stripe Checkout
Email: Postmark

Key tables: user_profiles, zones (zip_codes[]), time_slots (date, window_start, window_end, capacity, used_count), orders, order_bags, order_events, settings_pricing, settings_laundry.

Get started
1) Environment

Create .env.local (frontend):

VITE_SUPABASE_URL=YOUR_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_SITE_URL=http://localhost:5173
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...   # optional until Stripe go-live


Supabase → Project Settings → Functions → Secrets:

SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
POSTMARK_TOKEN=server-xxxx
FROM_EMAIL=updates@your-domain.com

2) Run locally
npm i
npm run dev
# (separately) supabase functions serve
# (optionally) stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook

3) Deploy

Vercel project settings → add the same VITE_* vars. Then:

vercel --prod


vercel.json rewrites are included (SPA fallback + API route), but the app now calls Auth & core tables direct to Supabase for stability.

Admin handbook (day-to-day)

Zones & Slots

Create a zone (e.g., “Cleveland West”), add ZIP codes, set pickup fee.

Generate time slots for the next 1–2 weeks (e.g., 6–8pm, capacity 8).

Pricing

Set $ / bag, pickup fee, and free-pickup threshold.

Users

Invite staff (drivers/admins).

Admin role is stored in user_profiles.role.

Business Settings (Account → admin view)

Toggles for softener / fragrance-free / notes.

Default detergent / wash temp / dry level.

Orders

Dashboard shows buckets by status.

Assign drivers, advance statuses, view notes.

Emails go out at key events.

Guest checkout (no account needed)

Schedule page allows guests to order; they must provide an email for the Stripe receipt & updates.

Logged-in users skip the guest email field and can save their phone number.

Developer notes
Supabase client: one instance

The app exports a singleton client and uses a single AuthProvider. Avoid creating clients elsewhere and avoid importing from multiple relative paths.

Use: import { supabase } from "@/lib/supabaseClient"; (Vite alias)

Do not import from app_backup/ (kept as archive only).

Data access

Direct calls to Supabase for: /auth/v1, user_profiles, zones, time_slots, settings_*.

Stripe + other: Edge Functions (create-checkout, stripe-webhook, notify).

RLS:

user_profiles: user read/write own; admin role set via SQL or Users tooling.

zones: select for all authenticated; insert/update/delete for admin.

time_slots: select for authenticated.

settings_*: select for authenticated; insert/update for admin.

One-time seeding (example)
insert into public.zones (name, zip_codes, pickup_fee_cents)
values ('Cleveland West', array['44102','44107','44111','44116'], 300)
on conflict (name) do update set zip_codes = excluded.zip_codes, pickup_fee_cents = excluded.pickup_fee_cents;

-- Generate two weeks of 6–8pm windows, capacity 8
with d as (
  select generate_series(current_date, current_date + interval '13 days', interval '1 day')::date as day
)
insert into public.time_slots (zone_id, date, window_start, window_end, capacity, used_count)
select (select id from public.zones where name='Cleveland West'),
       d.day, time '18:00', time '20:00', 8, 0
from d
on conflict do nothing;

Stripe webhook

In Supabase → Edge Functions → stripe-webhook: Verify JWT = off (Stripe doesn’t send JWTs).

create-checkout passes slot + bag metadata; webhook finalizes order on successful payment.

Go-live checklist

 Vercel env vars set (VITE_*)

 Supabase secrets set (service role, Stripe, Postmark)

 stripe-webhook JWT off

 At least one zone with ZIPs and time slots generated

 Pricing and Business Settings configured

 Test: guest checkout + email receipt

 Test: admin assigns driver + advances statuses

 Test: driver dashboard updates order status

Roadmap (post-MVP)

Near-term

Orders → Emails: add confirmation email with slot details; admin daily digest.

Success/Cancel pages: friendly confirmation & retry UX.

Staff invites: flow for setting role + pay% in one step.

CSV/Admin exports: daily/weekly reports.

Product enhancements

Subscriptions: weekly/bi-weekly pickups with pause/resume.

Commercial accounts: multi-location, custom pricing, consolidated billing.

Tipping: add tip at checkout or on delivery confirmation.

Ops & quality

Capacity guards: enforce slot capacity atomically (DB constraints).

Route planning: basic stop ordering, maps link for drivers.

Receivables: retry failed payments, downloadable invoices.

Platform

Mobile apps (Driver + Customer) with push notifications.

Role-scoped audit trail: who advanced which status and when.

Analytics: conversion → fulfillment funnel, zip heatmaps, slot utilization.

License / Ownership

This MVP is built for Tom’s Laundry Service. If expanded to an app or production service, we’ll scope the next phase and finalize terms.
