# ✅ Deployment Checklist - Data Extraction Service

**Use this checklist to deploy the scraping service step-by-step.**

---

## Pre-Deployment (Local Setup)

### 1. Install Python & Modal CLI
```bash
# Check Python version (need 3.9+)
python3 --version

# Install Modal
pip install modal

# Authenticate with Modal
modal setup
```
- [ ] Python 3.9+ installed
- [ ] Modal CLI installed
- [ ] Modal authenticated

### 2. Create Modal Secrets
Go to: https://modal.com/secrets

**Create secret: `convex-secrets`**
```
CONVEX_SITE_URL = https://YOUR-DEPLOYMENT.convex.site
```
- [ ] Secret created
- [ ] CONVEX_SITE_URL added

### 3. Deploy Modal Functions
```bash
cd modal_scrapers

# Deploy Instagram scraper
modal deploy instagram.py

# Deploy TikTok scraper
modal deploy tiktok.py
```

**IMPORTANT**: Copy the webhook URLs from the output!
```
Example output:
✓ Web endpoint: https://username--sylcroad-instagram-scraper-scrape-instagram-profile.modal.run
```

- [ ] Instagram scraper deployed
- [ ] TikTok scraper deployed
- [ ] Webhook URLs copied

---

## Convex Configuration

### 4. Add Environment Variables

Go to: Convex Dashboard → Settings → Environment Variables

**Add these variables:**

```bash
# Modal webhook URLs (from step 3)
MODAL_INSTAGRAM_WEBHOOK = https://username--sylcroad-instagram-scraper-scrape-instagram-profile.modal.run
MODAL_TIKTOK_WEBHOOK = https://username--sylcroad-tiktok-scraper-scrape-tiktok-profile.modal.run

# Your Convex site URL
CONVEX_SITE_URL = https://YOUR-DEPLOYMENT.convex.site

# Already set (verify):
ANTHROPIC_API_KEY = sk-ant-...
CLERK_JWT_ISSUER_DOMAIN = https://your-clerk-domain
```

- [ ] MODAL_INSTAGRAM_WEBHOOK added
- [ ] MODAL_TIKTOK_WEBHOOK added
- [ ] CONVEX_SITE_URL added
- [ ] Other env vars verified

### 5. Deploy Convex Functions
```bash
# From project root
npx convex deploy
```

**Verify in Convex dashboard:**
- [ ] `scraperJobs:createScrapeJob` exists
- [ ] `scraperJobs:triggerScrape` exists
- [ ] `scraperJobs:getUserJobs` exists
- [ ] `scraperJobs:handleWebhook` exists
- [ ] HTTP endpoint `/scrapers/webhook` exists

---

## Local Testing

### 6. Test Modal Functions Locally
```bash
cd modal_scrapers

# Test Instagram
python instagram.py
# Expected: JSON with Nike's profile data

# Test TikTok
python tiktok.py
# Expected: JSON with Charli D'Amelio's profile data
```

- [ ] Instagram scraper works locally
- [ ] TikTok scraper works locally
- [ ] Data looks correct

### 7. Test Full Flow Locally
```bash
# From project root
npm run dev

# Open: http://localhost:3000/scrapers
```

**Test Instagram scrape:**
1. Select "Instagram"
2. Enter "nike"
3. Click "Scrape Profile"
4. Wait 30 seconds

**Verify:**
- [ ] Job created (status: pending)
- [ ] Status changes to "running"
- [ ] Status changes to "completed"
- [ ] Results display with follower count
- [ ] Follower count matches real Instagram profile

**Test TikTok scrape:**
1. Select "TikTok"
2. Enter "charlidamelio"
3. Click "Scrape Profile"
4. Wait 30 seconds

**Verify:**
- [ ] Job created successfully
- [ ] Status updates correctly
- [ ] Results display correctly

### 8. Test Rate Limiting
1. Create 6 jobs quickly (within 1 minute)
2. Try to create 7th job

**Verify:**
- [ ] 7th job fails with error: "Rate limit: Max 6 jobs per minute"

### 9. Test Error Handling
1. Enter invalid username: "thisuserdoesnotexist999999"
2. Click "Scrape Profile"

**Verify:**
- [ ] Job created
- [ ] Job fails gracefully
- [ ] Error message displayed

---

## Production Deployment

### 10. Deploy to Vercel
```bash
# Make sure .env.local has all vars
# (Same as Convex env vars)

# Deploy
vercel --prod

# Or push to main branch (if auto-deploy enabled)
```

- [ ] Environment variables set in Vercel
- [ ] Deployed to production
- [ ] Production URL accessible

### 11. Test in Production
Visit: `https://your-app.vercel.app/scrapers`

**Run same tests as local:**
- [ ] Instagram scrape works
- [ ] TikTok scrape works
- [ ] Rate limiting works
- [ ] Error handling works
- [ ] Real-time updates work

---

## Monitoring Setup

### 12. Configure Monitoring

**Modal Dashboard:**
- [ ] Check function execution logs
- [ ] Verify costs are reasonable
- [ ] Set up cost alerts (optional)

**Convex Dashboard:**
- [ ] Check database queries
- [ ] Verify webhook calls
- [ ] Monitor real-time activity

**Browser Console:**
- [ ] No JavaScript errors
- [ ] No network errors
- [ ] Convex connection established

---

## Post-Deployment

### 13. Documentation
- [ ] Team knows how to access `/scrapers`
- [ ] Team knows rate limits (6/min, 100/hr)
- [ ] Team knows cooldown period (1 hour per profile)

### 14. Set Usage Expectations
- [ ] Free tier: ~600-1,500 scrapes/month
- [ ] Cost per scrape: ~$0.02-0.05
- [ ] Response time: ~20-40 seconds per scrape

---

## Troubleshooting

### Issue: "Modal webhook not configured"
**Fix:**
```bash
# Verify Convex env vars
convex env list

# Should see MODAL_INSTAGRAM_WEBHOOK and MODAL_TIKTOK_WEBHOOK
# If missing, add them in Convex dashboard
```

### Issue: Job stuck in "running"
**Fix:**
1. Check Modal logs: https://modal.com/logs
2. Look for errors in scraper execution
3. Common causes:
   - Instagram/TikTok rate limiting (wait 15-30 min)
   - HTML structure changed (update selectors)
   - Invalid username

### Issue: Webhook not received
**Fix:**
1. Verify webhook URL in Modal code
2. Check: `https://your-deployment.convex.site/scrapers/webhook`
3. Test manually:
   ```bash
   curl -X POST https://your-deployment.convex.site/scrapers/webhook \
     -H "Content-Type: application/json" \
     -d '{"jobId":"test","status":"completed","platform":"Instagram","data":{}}'
   ```

### Issue: Rate limiting not working
**Fix:**
1. Check Convex indexes: `by_userId` must exist
2. Verify timestamps are in milliseconds
3. Check createScrapeJob logic in scraperJobs.ts

---

## ✅ Final Verification

Before marking as complete, verify:

### Functionality
- [ ] Can scrape Instagram profiles
- [ ] Can scrape TikTok profiles
- [ ] Real-time status updates work
- [ ] Results display correctly
- [ ] Rate limiting enforced
- [ ] Error handling works
- [ ] Retry logic works (3x retries)

### Performance
- [ ] Scrapes complete in 20-40 seconds
- [ ] No timeout errors
- [ ] UI responsive

### Cost
- [ ] Modal costs tracked
- [ ] Within free tier budget
- [ ] Cost alerts set up (optional)

### Monitoring
- [ ] Modal logs accessible
- [ ] Convex logs accessible
- [ ] No unexpected errors

---

## 🎉 DEPLOYMENT COMPLETE!

**Your data extraction service is LIVE!**

**Next Steps:**
1. ✅ Share `/scrapers` URL with team
2. ✅ Monitor costs in Modal dashboard
3. ✅ Track usage in Convex dashboard
4. ✅ Consider adding scheduled scraping (future enhancement)

**Documentation:**
- User guide: `SCRAPER_SETUP_GUIDE.md`
- Testing: `TESTING_GUIDE.md`
- Features: `FEATURE_COMPLETE.md`
- Quick start: `QUICK_START.md`

---

**Questions or Issues?**
- Check troubleshooting sections above
- Review setup guide: `SCRAPER_SETUP_GUIDE.md`
- Check Modal docs: https://modal.com/docs
- Check Convex docs: https://docs.convex.dev
