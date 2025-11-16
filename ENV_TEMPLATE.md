# Environment Variables Template

## Convex Environment Variables

Add these in Convex Dashboard → Settings → Environment Variables:

```bash
# Modal Webhooks (get from Modal deployment output)
MODAL_INSTAGRAM_WEBHOOK=https://your-username--sylcroad-instagram-scraper-scrape-instagram-profile.modal.run
MODAL_TIKTOK_WEBHOOK=https://your-username--sylcroad-tiktok-scraper-scrape-tiktok-profile.modal.run

# Convex Site URL (for webhooks)
CONVEX_SITE_URL=https://your-deployment.convex.site

# Anthropic API (already set for Site Mirror)
ANTHROPIC_API_KEY=sk-ant-...

# Clerk Auth (already set)
CLERK_JWT_ISSUER_DOMAIN=https://your-app.clerk.accounts.dev
```

## Modal Secrets

Create secret named "convex-secrets" with:

```bash
CONVEX_SITE_URL=https://your-deployment.convex.site
```

## Local .env.local (for Next.js)

```bash
# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Optional: For local Modal testing
MODAL_INSTAGRAM_WEBHOOK=https://...
MODAL_TIKTOK_WEBHOOK=https://...
```

## How to Get These Values

### MODAL_*_WEBHOOK
1. Run `modal deploy modal_scrapers/instagram.py`
2. Copy the webhook URL from output
3. Repeat for tiktok.py

### CONVEX_SITE_URL
1. Go to Convex Dashboard
2. Settings → URL & Deploy Key
3. Copy the .convex.site URL (NOT .convex.cloud!)

### ANTHROPIC_API_KEY
- Already configured (used by Site Mirror)
- Get from: https://console.anthropic.com

### CLERK_*
- Already configured
- Get from: https://dashboard.clerk.com

## Verification

```bash
# Check Modal deployment
modal app list

# Check Convex env vars
npx convex env list

# Check local env
cat .env.local
```
