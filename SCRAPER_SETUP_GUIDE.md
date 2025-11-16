# 🚀 Data Extraction Service - Complete Setup Guide

**For**: SylcRoad Instagram & TikTok Scraping
**Status**: Production Ready
**Time to Deploy**: 30-60 minutes

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Modal.com Setup](#modalcom-setup)
3. [Convex Configuration](#convex-configuration)
4. [Local Testing](#local-testing)
5. [Production Deployment](#production-deployment)
6. [Troubleshooting](#troubleshooting)
7. [Usage Guide](#usage-guide)

---

## 🎯 Prerequisites

### Required Accounts
- [x] Modal.com account (free tier: $30 credit/month)
- [x] Convex account (already set up)
- [x] Python 3.9+ installed locally

### Required Tools
```bash
# Check Python version
python3 --version  # Should be 3.9 or higher

# Install Modal CLI
pip install modal

# Verify installation
modal --version
```

---

## 🔧 Modal.com Setup

### Step 1: Create Account & Authenticate

```bash
# Visit https://modal.com and sign up (free)
# Then authenticate CLI:
modal setup
```

**Follow the prompts:**
1. Open browser to authenticate
2. Log in to Modal
3. CLI will confirm authentication

### Step 2: Create Secrets

Go to Modal Dashboard → Secrets → Create New Secret

**Secret Name**: `convex-secrets`

**Add Variable**:
- Key: `CONVEX_SITE_URL`
- Value: Your Convex HTTP URL (find in Convex dashboard)
  - Format: `https://your-deployment.convex.site`

**Save the secret.**

### Step 3: Deploy Modal Functions

```bash
# Navigate to project root
cd /workspace

# Deploy Instagram scraper
modal deploy modal_scrapers/instagram.py

# Deploy TikTok scraper
modal deploy modal_scrapers/tiktok.py
```

**Expected Output**:
```
✓ Initialized. View run at https://modal.com/...
✓ Created function scrape_instagram_profile
✓ Created function scrape_tiktok_profile

Web endpoints:
  └─ scrape_instagram_profile => https://username--sylcroad-instagram-scraper-scrape-instagram-profile.modal.run
  └─ scrape_tiktok_profile => https://username--sylcroad-tiktok-scraper-scrape-tiktok-profile.modal.run
```

**SAVE THESE URLs!** You'll need them for Convex.

---

## ⚙️ Convex Configuration

### Step 1: Add Environment Variables

Go to Convex Dashboard → Settings → Environment Variables

**Add these variables:**

1. **MODAL_INSTAGRAM_WEBHOOK**
   - Value: `https://username--sylcroad-instagram-scraper-scrape-instagram-profile.modal.run`
   - (from Modal deployment output above)

2. **MODAL_TIKTOK_WEBHOOK**
   - Value: `https://username--sylcroad-tiktok-scraper-scrape-tiktok-profile.modal.run`
   - (from Modal deployment output above)

3. **CONVEX_SITE_URL** (if not already set)
   - Value: `https://your-deployment.convex.site`
   - Find in Convex dashboard → Settings → URL & Deploy Key

### Step 2: Deploy Convex Functions

```bash
# In your project root
npx convex deploy
```

**Verify deployment:**
- Go to Convex dashboard → Functions
- You should see: `scraperJobs:createScrapeJob`, `scraperJobs:triggerScrape`, etc.
- Check HTTP endpoints → Should see `/scrapers/webhook`

---

## 🧪 Local Testing

### Test Modal Functions Locally

```bash
# Test Instagram scraper
cd modal_scrapers
python instagram.py

# Test TikTok scraper
python tiktok.py
```

**Expected Output**:
```json
{
  "username": "nike",
  "followers": 309247821,
  "following": 148,
  "posts": 1087,
  "bio": "Just Do It...",
  "profilePicUrl": "...",
  "isVerified": true,
  "isPrivate": false,
  "scrapedAt": "2024-01-01T00:00:00Z"
}
```

### Test Complete Flow

1. **Start dev server**:
   ```bash
   npm run dev
   ```

2. **Navigate to**: http://localhost:3000/scrapers

3. **Create test scrape**:
   - Platform: Instagram
   - Username: nike
   - Click "Scrape Profile"

4. **Watch real-time updates**:
   - Status should change: pending → running → completed
   - Results should appear in card

5. **Check logs**:
   - Modal dashboard → Logs (see scraper execution)
   - Convex dashboard → Logs (see webhook calls)

---

## 🌐 Production Deployment

### Pre-Deployment Checklist

- [ ] Modal functions deployed
- [ ] Convex environment variables set
- [ ] Convex functions deployed
- [ ] Local testing passed
- [ ] Frontend accessible

### Deploy to Vercel

```bash
# Add environment variables in Vercel dashboard:
# (Same as Convex env vars)

# Deploy
vercel --prod
```

### Verify Production

1. Visit your production URL: `https://your-app.vercel.app/scrapers`
2. Test scrape with a real profile
3. Check Modal dashboard for function execution
4. Check Convex dashboard for data storage

---

## 🔍 Troubleshooting

### Issue: "Modal webhook not configured"

**Solution**:
```bash
# Check Convex env vars
convex env list

# Should see:
# MODAL_INSTAGRAM_WEBHOOK=https://...
# MODAL_TIKTOK_WEBHOOK=https://...

# If missing, add them:
convex env set MODAL_INSTAGRAM_WEBHOOK "https://your-url.modal.run"
convex env set MODAL_TIKTOK_WEBHOOK "https://your-url.modal.run"
```

### Issue: "Job stuck in 'running' status"

**Solution**:
1. Check Modal logs: https://modal.com → Logs
2. Look for scraper errors
3. Common causes:
   - Instagram/TikTok changed their HTML structure
   - Rate limited (wait 5-10 minutes)
   - Invalid username

### Issue: "Webhook failed"

**Solution**:
1. Check webhook URL in Modal secrets
2. Verify: `https://your-deployment.convex.site/scrapers/webhook`
3. Test webhook manually:
   ```bash
   curl -X POST https://your-deployment.convex.site/scrapers/webhook \
     -H "Content-Type: application/json" \
     -d '{"jobId":"test","status":"completed","platform":"Instagram","data":{}}'
   ```

### Issue: "Playwright browser failed to launch"

**Solution**:
- Modal handles this automatically
- If errors persist, check Modal dashboard → System Status
- Try redeploying: `modal deploy modal_scrapers/instagram.py --force`

### Issue: "Rate limited by Instagram/TikTok"

**Solution**:
- Wait 15-30 minutes before next scrape
- Don't scrape same profile more than once per hour
- Implement rate limiting (see below)

---

## 📖 Usage Guide

### Basic Scraping

```typescript
// In your app
const { api } = await import("@/convex/_generated/api");

// Create job
const jobId = await convex.mutation(api.scraperJobs.createScrapeJob, {
  platform: "Instagram",
  username: "nike",
  jobType: "profile",
});

// Trigger scrape
await convex.action(api.scraperJobs.triggerScrape, {
  jobId,
});

// Get results
const job = await convex.query(api.scraperJobs.getJobById, {
  jobId,
});

console.log(job.results);
```

### Scheduled Monitoring

Coming soon: Implement daily scraping for monitored profiles

### Bulk Scraping

```typescript
// Scrape multiple profiles
const usernames = ["nike", "adidas", "puma"];

for (const username of usernames) {
  const jobId = await createJob({ platform: "Instagram", username });
  await triggerScrape({ jobId });
  
  // Wait 5 seconds between scrapes (rate limiting)
  await new Promise(r => setTimeout(r, 5000));
}
```

---

## 💰 Cost Estimates

### Modal.com Pricing

**Free Tier**: $30 credit/month
- ~600-1,500 scrapes (depending on complexity)
- Perfect for testing and small-scale use

**Paid Usage**: $0.02-0.05 per scrape
- 1,000 scrapes = ~$30/month
- 10,000 scrapes = ~$300/month
- Scales to zero when not in use

### Recommendations

- **Development**: Use free tier
- **Production (<1K scrapes/mo)**: Free tier sufficient
- **Production (1K-10K scrapes/mo)**: ~$30-300/month
- **Enterprise (10K+ scrapes/mo)**: Contact Modal for volume pricing

---

## 🛡️ Best Practices

### Rate Limiting

**DO**:
- ✅ Wait 5-10 seconds between scrapes
- ✅ Max 6 scrapes per minute per platform
- ✅ Max 100 scrapes per hour total
- ✅ Track failed scrapes and back off

**DON'T**:
- ❌ Scrape same profile repeatedly
- ❌ Run 100s of scrapes simultaneously
- ❌ Ignore failed scrapes (they count toward limits)

### Data Privacy

- Only scrape public profiles
- Don't store personally identifiable information unnecessarily
- Respect robots.txt
- Follow platform Terms of Service

### Error Handling

- Always implement retry logic (max 3 attempts)
- Log all failures for debugging
- Alert on repeated failures
- Handle edge cases (private profiles, deleted accounts)

---

## 📊 Monitoring

### Modal Dashboard

Monitor:
- Function execution times
- Error rates
- Cost per function call
- Logs and traces

**Access**: https://modal.com/dashboard

### Convex Dashboard

Monitor:
- Database queries
- Webhook calls
- Real-time active users
- Function logs

**Access**: https://dashboard.convex.dev

---

## 🎉 You're Done!

Your data extraction service is now live!

**Next Steps**:
1. ✅ Test in production
2. ✅ Monitor costs
3. ✅ Add more features (scheduled scraping, bulk operations)
4. ✅ Implement rate limiting improvements
5. ✅ Add monitoring/alerts

**Need Help?**
- Modal docs: https://modal.com/docs
- Convex docs: https://docs.convex.dev
- Project plans: `/workspace/.claude/plans/`

---

**Built with** ❤️ **using Modal.com + Convex + Playwright**
