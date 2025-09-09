# Tom’s Laundry Service (MVP)

An MVP web app for **Tom’s Laundry Service**, a pickup & delivery laundry platform. Customers schedule a pickup, drivers/admins manage orders, and customers receive status updates by email.

---

## Overview

**What it is:**  
- A web app (desktop + mobile-friendly) to let customers schedule laundry pickups and deliveries.  
- Admin dashboard to track orders, assign drivers, and advance statuses.  
- Driver view to manage assigned stops with one-tap status updates.  
- Customers see progress in their account (/track) and get **email notifications**.  
- Pricing model: **flat-rate per bag** + pickup fee.  

**Who it’s for:**  
- Busy professionals, families, small businesses (salons, Airbnbs, gyms).  
- Tom’s barber shop clients & local Cleveland market initially.  

**Future direction:**  
- Mobile apps with push notifications (replace email).  
- Subscriptions (weekly/bi-weekly).  
- Commercial accounts (restaurants, hotels, salons).  
- Integration with Stripe for live payments (already wired).  

---

## How It Works (Customer Flow)

1. **Sign up / Log in** (email + password or magic link).  
2. **Account page:** save phone (for calls), toggle “Email me updates”, set laundry preferences.  
3. **Schedule a pickup:**  
   - Enter address & ZIP → matched to service zone.  
   - Pick an available evening pickup slot.  
   - Select number of bags & instructions.  
   - Pay via Stripe Checkout.  
4. **Track order:**  
   - See order status & progress bar.  
   - Open “View Details” for pickup window, instructions, bag codes, and event log.  
   - Receive **email updates** (pickup en route, picked up, out for delivery, delivered, etc.).  

---

## Admin & Driver Functionality

### Admin
- `/dashboard`:  
  - Shows orders grouped by status.  
  - Advance order statuses.  
  - Assign drivers by email.  
  - See totals, windows, and special instructions.  
- `/admin/slots`:  
  - Create/update zones (names, ZIP codes, fees).  
  - Generate pickup slots (e.g. 14 days of 6–8pm windows).  
  - View slots and capacity usage.  

### Driver
- `/driver`:  
  - Sees only their assigned orders (RLS protected).  
  - Simple “Advance” button per order to update status.  
  - Optimistic UI → feels instant.  
  - Can view notes/instructions.  

---

## Tech Stack

- **Frontend:**  
  - React + Vite + TailwindCSS  
  - Supabase client (`@supabase/supabase-js`)  
  - Deployed locally, will support mobile apps later

- **Backend:**  
  - Supabase (Postgres + Auth + RLS)  
  - Supabase Edge Functions (Deno) for Stripe + Notifications  
  - Stripe Checkout for payments  
  - Postmark for transactional emails

- **Database Schema (core):**  
  - `users` (Supabase Auth)  
  - `user_profiles` (role, phone, email_opt_in)  
  - `addresses`  
  - `zones` (with ZIP arrays + pickup fee)  
  - `time_slots` (capacity, used_count)  
  - `orders` (status, bags, totals, links to slot, driver, facility)  
  - `order_bags` (bag codes, notes, weights)  
  - `order_events` (timeline of status updates, triggers notifications)  
  - `preferences` (detergent, wash temp, etc.)  

---

## Notes from Today (Session Log)

- ✅ Flattened project structure (removed `app/` nesting).  
- ✅ Fixed Tailwind v4 setup with `@tailwindcss/postcss`.  
- ✅ Built out hero + background gradient styling.  
- ✅ Implemented full **Schedule** page with slot/zone lookups.  
- ✅ Stripe Checkout wired (Edge Functions: `create-checkout`, `stripe-webhook`).  
- ✅ Orders now created on successful payment.  
- ✅ Built **Track** page with realtime status timeline + “View details” modal (bags + events).  
- ✅ Built **Dashboard** page (admin) to advance statuses, assign drivers, live refresh.  
- ✅ Built **Driver** page (role-based, shows assigned orders, thumb-friendly UI).  
- ✅ Added **Admin Slots** page to manage zones/ZIPs and generate time slots.  
- ✅ Added **Account** page with phone, email opt-in, laundry preferences.  
- ✅ Notifications switched from Twilio SMS → Postmark email.  
- ✅ `notify` function built and deployed; DB trigger sends emails automatically on status events.  

---

## Plan for Next Session

- [ ] Write **Success/Cancel pages** for Stripe (with clear CTAs).  
- [ ] Add **order confirmation email** after scheduling (pickup window + instructions).  
- [ ] Add **admin daily digest email** (slot counts, today’s pickups).  
- [ ] Polish Account page UX (inline save, show opt-in status).  
- [ ] Begin planning **customer-facing mobile app** (push notifications).  
- [ ] Explore **subscription plans** and recurring pickups.  

---

## Dev Notes

- **Env Vars (Supabase Functions):**

SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
POSTMARK_TOKEN=server-xxx
FROM_EMAIL=updates@yourdomain.com

- **Run locally:**
```bash
npm run dev                   # frontend
supabase functions serve      # backend functions
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook


supabase functions deploy create-checkout
supabase functions deploy stripe-webhook
supabase functions deploy notify


Session Log
2025-09-07

Initial app setup + Tailwind v4 fix

Hero/landing page with gradient background

Zones & slots seeded manually, then admin page created for automation

Stripe Checkout integrated (Edge Functions for checkout + webhook)

Schedule page → creates orders on successful payment

Track page → status timeline + details modal with bags/events

Dashboard (admin) → advance statuses, assign drivers, realtime updates

Driver view → assigned orders only, thumb-friendly “Advance” buttons

Account page → email, phone, laundry preferences, email opt-in toggle

Notifications → switched from Twilio SMS to Postmark email

Built notify function + DB trigger for automatic emails

Confirmed order lifecycle works end-to-end (customer schedule → admin advance → customer track → emails sent)

Session Log — September 9, 2025
Current State

Frontend (Vite + React):

Home, Schedule, Track, Account, Dashboard, Zones & Slots, Pricing, and Driver pages built out.

Role-based navigation implemented (customer, admin, driver).

Admin dashboard shows KPIs and order status buckets with assign/reassign functionality.

Customer scheduling form works, creates Stripe Checkout session.

Email notifications (via Postmark) integrated for order confirmations.

Twilio SMS integration deferred (too much overhead — replaced with email updates).

Supabase:

Tables: orders, order_bags, order_events, time_slots, zones, user_profiles, settings_pricing, settings_laundry.

RLS policies working for users vs. admins.

All required secrets configured: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, POSTMARK_TOKEN, FROM_EMAIL.

Edge functions deployed:

create-checkout (creates Stripe session w/ metadata)

stripe-webhook (listens for Stripe events → inserts orders)

notify (for email updates)

invite-user (for creating accounts and assigning roles)

Stripe:

Sandbox mode fully set up.

create-checkout successfully launches checkout sessions.

Webhook destination configured in Stripe pointing to Supabase Edge Function stripe-webhook.

STRIPE_WEBHOOK_SECRET added to Supabase secrets.

Problems Encountered

Stripe webhooks were failing with 401 Unauthorized before reaching function code.

Root cause: Supabase Edge Functions default to requiring JWT auth. Stripe does not send JWTs.

After redeployments and retries, errors persisted until confirming this mismatch.

Fix In Progress

Solution: Disable JWT verification for the stripe-webhook function.

In Supabase dashboard → Edge Functions → stripe-webhook → turn off Verify JWT.

Alternatively: redeploy with --no-verify-jwt flag if available.

Once JWT verification is disabled, Stripe’s checkout.session.completed events will pass through to our function.

Next test: resend events from Stripe dashboard to confirm order insertion.

Next Steps

Disable JWT verification on stripe-webhook function (if not already done).

Resend checkout.session.completed event from Stripe → confirm logs show success.

Check Supabase orders table for new row (payment_status = paid).

If metadata errors occur, ensure create-checkout is passing user_id, pickup_slot_id, est_bags, and instructions in the session metadata.

After confirmed success → wire up Postmark email notifications inside the webhook handler so customers/admins are emailed once payment succeeds.

Finalize driver/admin views so they can see orders flow from Scheduled → En Route → Completed.
