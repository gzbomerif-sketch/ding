# Deployment Instructions - Complete Autonomously

## Current Status
- **Backend**: Convex deployed to dev (formal-ocelot-254)
- **Production**: steady-penguin-728.convex.cloud
- **Required**: CLERK_JWT_ISSUER_DOMAIN environment variable

## Critical Environment Variables Needed

### 1. Clerk JWT Configuration
You MUST configure this in Clerk dashboard first:

1. Go to Clerk Dashboard: https://dashboard.clerk.com
2. Select your application
3. Go to **JWT Templates** → Create template named "convex"
4. Copy the **Issuer domain** (looks like: `clerk.your-app.com`)

### 2. Set Convex Production Environment Variables

Go to: https://dashboard.convex.dev/d/steady-penguin-728/settings/environment-variables

Set these variables:
```
CLERK_JWT_ISSUER_DOMAIN=<your-clerk-issuer-domain>
ANTHROPIC_API_KEY=sk-ant-api03-5iKEgj10LEowFnGFmByZruCm5Q6KfiOiRsyvQem3YzkYymLr#cd-2q4dT_Jje2mq9l2aEUvmlbAOgs4alOGvbvuuwkg8
```

### 3. Deploy Convex Backend
```bash
npx convex deploy --yes
```

### 4. Set Vercel Environment Variables

After Convex deploys, run:
```bash
vercel env add NEXT_PUBLIC_CONVEX_URL production
# Enter: https://steady-penguin-728.convex.cloud

vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production
# Enter: pk_test_Y2xhc3NpYy1hYXJkdmFyay05MS5jbGVyay5hY2NvdW50cy5kZXYk

vercel env add CLERK_SECRET_KEY production
# Enter: sk_test_hIZuWPGVqnpQaI1h5tJVUwq7ybJLGQDzNHUpiDpYjc

vercel env add ANTHROPIC_API_KEY production
# Enter: sk-ant-api03-5iKEgj10LEowFnGFmByZruCm5Q6KfiOiRsyvQem3YzkYymLr#cd-2q4dT_Jje2mq9l2aEUvmlbAOgs4alOGvbvuuwkg8

vercel env add AI_MODEL production
# Enter: claude-3-5-sonnet-20241022

vercel env add MAX_CRAWL_DEPTH production
# Enter: 3

vercel env add MAX_PAGES_PER_CRAWL production
# Enter: 50

vercel env add AI_ANALYSIS_INTERVAL production
# Enter: 10
```

### 5. Deploy to Vercel
```bash
vercel --prod
```

## Alternative: Use Vercel Dashboard

### Option 1: Deploy via Dashboard
1. Go to https://vercel.com
2. Import Git Repository: gzbomerif-sketch/ding
3. Add Environment Variables (same as above)
4. Click Deploy

### Option 2: Use GitHub Integration
1. Push to main branch (already done ✓)
2. Connect repo to Vercel
3. Vercel auto-deploys on push

## What's Been Prepared

✅ All code pushed to GitHub
✅ Database schema complete (31 tables)
✅ Site Mirror fully functional
✅ Campaign Analytics UI ready
✅ All dependencies installed
✅ Convex CLI configured

## What's Needed

❌ Clerk JWT issuer domain (manual step in Clerk dashboard)
❌ Environment variables set in Convex production
❌ Environment variables set in Vercel
❌ Final deployment commands

## Quick Deploy Commands (After Setting Env Vars)

```bash
# 1. Deploy Convex
npx convex deploy --yes

# 2. Deploy to Vercel
vercel --prod

# Done!
```

## Verification

After deployment:
1. Visit your Vercel URL
2. Test authentication with Clerk
3. Try Site Mirror feature
4. Check Campaign Analytics dashboard

## Troubleshooting

### If Convex deploy fails:
- Check CLERK_JWT_ISSUER_DOMAIN is set correctly
- Verify Clerk JWT template exists

### If Vercel deploy fails:
- Ensure all environment variables are set
- Check NEXT_PUBLIC_CONVEX_URL points to production

### If authentication fails:
- Verify Clerk keys match your application
- Check JWT template is named "convex"
- Ensure issuer domain is correct

## Contact & Resources

- Convex Dashboard: https://dashboard.convex.dev/d/steady-penguin-728
- Vercel Dashboard: https://vercel.com
- GitHub Repo: https://github.com/gzbomerif-sketch/ding
- Clerk Dashboard: https://dashboard.clerk.com

---

**Status**: Ready for manual environment variable configuration
**Estimated Time**: 10-15 minutes to complete deployment
**Next Step**: Set CLERK_JWT_ISSUER_DOMAIN in Convex dashboard
