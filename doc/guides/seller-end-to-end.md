# Seller end-to-end: register → login → catalog

This guide walks through the **sample manufacturer** flow on localhost, fixes the common **`MissingSecret` / `/api/auth/error`** issue, and lists **curl** examples with realistic sample data.

## 1. Environment (fix `MissingSecret`)

Auth.js needs a **secret** to encrypt the session cookie. If you see:

`[auth][error] MissingSecret: Please define a secret`

Do **one** of the following:

### Option A — Development (quickest)

With `npm run dev`, **`AUTH_SECRET` is optional**: the app uses a **development-only fallback** in [`src/auth.ts`](../../src/auth.ts) so sign-in works without editing `.env`.

Restart the dev server after pulling the change.

### Option B — Explicit secret (recommended)

1. Copy [`.env.example`](../../.env.example) to `.env`.
2. Generate a secret and add it:

```bash
openssl rand -base64 32
```

Put the result in `.env`:

```env
AUTH_SECRET=paste-the-output-here
MONGO_URI=mongodb://127.0.0.1:27017
GEMINI_API_KEY=your-key-if-using-ai-search
```

3. Restart `npm run dev`.

**Production:** you **must** set `AUTH_SECRET` (never rely on the dev fallback).

Also ensure **`MONGO_URI`** is set; registration and login query MongoDB.

---

## 2. Register a seller (browser)

1. Open `http://localhost:3000/register/seller`.
2. Complete the wizard (example values below).
3. After **Create account**, the app calls `signIn("credentials")`. With a valid auth secret, you land on **`/seller/dashboard`**.

### Sample registration payload (matches the form)

| Step        | Field / choice              | Sample value |
|------------|-----------------------------|--------------|
| Account    | Work email                  | `demo.seller@example.com` |
| Account    | Password                    | `DemoPass123!` (8+ chars) |
| Business   | Business name               | `Sample Glass Works Pvt Ltd` |
| Business   | Industry                    | `Glass & ceramics` |
| Business   | GSTIN (optional)            | `22AAAAA0000A1Z5` or leave blank |
| Contact    | Mobile                      | `+919876543210` |
| Contact    | Operational messages        | Checked |
| AI setup   | Primary language            | `English` / `en` |
| AI setup   | Mode                        | **Assist with deals** or **FAQs only** |

---

## 3. Register via API (curl)

Same data as the UI:

```bash
curl -sS -X POST "http://localhost:3000/api/register/seller" \
  -H "Content-Type: application/json" \
  -d '{
    "email":"demo.seller@example.com",
    "password":"DemoPass123!",
    "businessName":"Sample Glass Works Pvt Ltd",
    "industryCategory":"Glass & ceramics",
    "gstin":"22AAAAA0000A1Z5",
    "phone":"+919876543210",
    "phoneNotifyConsent":true,
    "preferredLanguage":"en",
    "agentMode":"negotiate"
  }'
```

Expect **`201`** and `{"ok":true,...}`.  
If the email already exists → **`409`**.

Then sign in in the browser at `/login`, or use session cookies only after browser login (see [curl recipes](../api/curl-recipes.md)).

---

## 4. Login (browser)

1. `http://localhost:3000/login`
2. Email: `demo.seller@example.com`  
3. Password: `DemoPass123!`  
4. You should be redirected to **`/seller/dashboard`** (seller role).

Optional: `http://localhost:3000/login?callbackUrl=/seller/products`

---

## 5. Log out

Use **Log out** in the top bar (session-aware header). You return to the home page session cleared.

---

## 6. Add a sample product (seller UI)

1. From the dashboard, open **Products** → `/seller/products`.
2. Create one product with at least:

- **Name:** `300ml Amber Glass Bottle`
- **Description:** (10+ characters) e.g. `Pharma-grade amber glass bottle, 300ml, screw neck. Suitable for syrups and oils.`
- **Category:** `Glass & ceramics`
- **Tags:** `amber`, `pharma`, `300ml`
- **Pricing (list):** e.g. amount `12`, currency `INR`, billing **one_time**

The API stores `metadata.sellerOrgId` as your **user id** automatically for seller-created rows.

---

## 7. Add tiered pricing (sample)

1. Open **Tiered pricing** → `/seller/pricing-rules`.
2. Select the product you created.
3. Example tiers (INR, MOQ 500):

| Min qty | Max qty | Unit ₹ | Lead days (optional) |
|---------|---------|--------|----------------------|
| 500     | 1999    | 11.50  | 14 |
| 2000    | (empty) | 9.00   | 21 |

This is what powers answers like “under ₹10 at volume” when search intent includes quantity and max price.

---

## 8. Optional: product via curl (seller session)

You must be logged in as that seller in the browser, then copy the session cookie into `Cookie:` (see [curl recipes](../api/curl-recipes.md)).

Example body (matches [`productSchema`](../../src/lib/schemas/product.ts)):

```bash
curl -sS -X POST "http://localhost:3000/api/seller/products" \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_SESSION_COOKIE" \
  -d '{
    "name":"300ml Amber Glass Bottle",
    "description":"Pharma-grade amber glass bottle, 300ml, screw neck. Suitable for syrups and oils.",
    "category":"Glass & ceramics",
    "useCases":["pharma packaging","food oils"],
    "tags":["amber","pharma","300ml"],
    "customizationAvailable":true,
    "pricing":{"amount":12,"currency":"INR","billingPeriod":"one_time"},
    "metadata":{"website":"","source":"manual"}
  }'
```

---

## 9. Verify in search

Open:

`http://localhost:3000/search?q=amber%20glass%20bottles%201000%20units%20under%2012%20rupees`

(Requires Mongo + embeddings/Gemini depending on your search path.)

---

## 10. Troubleshooting

| Symptom | What to do |
|---------|------------|
| `/api/auth/error` or `MissingSecret` | Set `AUTH_SECRET` in `.env` or use latest `auth.ts` dev fallback and restart dev server. |
| `ClientFetchError` after register | Same as above — sign-in cannot complete without a secret. |
| Registration 409 | Email already registered — sign in or use another email. |
| Login “Invalid credentials” | Wrong password or user not created — check Mongo `users` collection. |
| Products not in search | Add embeddings/Gemini env vars; hybrid search may need `GEMINI_API_KEY`. |

---

## Related docs

- [API curl recipes](../api/curl-recipes.md)
- [Inventory / routes](../inventory.md)
- [Seller journey use case](../use-cases/seller-journey.md)
