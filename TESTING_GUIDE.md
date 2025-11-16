# 🧪 Testing Guide - Data Extraction Service

Complete testing checklist for Instagram & TikTok scrapers

---

## Pre-Deployment Testing

### ✅ Modal Functions (Local)

```bash
cd modal_scrapers

# Test Instagram scraper
python instagram.py

# Expected output: Nike profile data with followers, posts, etc.
```

**Verify**:
- [ ] Script runs without errors
- [ ] Returns JSON with profile data
- [ ] Follower count is accurate (check on Instagram)
- [ ] Username, bio, verified status correct

```bash
# Test TikTok scraper
python tiktok.py

# Expected output: Charli D'Amelio profile data
```

**Verify**:
- [ ] Script runs without errors
- [ ] Returns JSON with profile data
- [ ] Follower count and likes are accurate
- [ ] Recent videos array populated

---

### ✅ Convex Functions

```bash
# Start Convex dev server
npx convex dev
```

**Test mutations in Convex dashboard:**

1. **createScrapeJob**
   ```json
   {
     "platform": "Instagram",
     "username": "nike"
   }
   ```
   - [ ] Returns job ID
   - [ ] Job appears in database
   - [ ] Status is "pending"

2. **getUserJobs**
   ```json
   {}
   ```
   - [ ] Returns array of user's jobs
   - [ ] Jobs filtered by current user

3. **Rate limiting**
   - [ ] Try creating 7 jobs in 1 minute → Should fail on 7th
   - [ ] Try scraping same profile twice → Should fail on 2nd

---

### ✅ HTTP Webhook

**Test webhook endpoint manually:**

```bash
curl -X POST https://your-deployment.convex.site/scrapers/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "YOUR_JOB_ID",
    "status": "completed",
    "platform": "Instagram",
    "data": {
      "username": "nike",
      "followers": 309247821,
      "posts": 1087
    }
  }'
```

**Verify**:
- [ ] Returns 200 OK
- [ ] Job status updated to "completed"
- [ ] Results stored in database

---

## Integration Testing

### ✅ Full Scrape Flow

```bash
npm run dev
# Open http://localhost:3000/scrapers
```

**Test Instagram scrape:**

1. Enter "nike" as username
2. Click "Scrape Profile"
3. **Verify**:
   - [ ] Job created immediately (status: pending)
   - [ ] Status changes to "running" within 5 seconds
   - [ ] Status changes to "completed" within 30 seconds
   - [ ] Results display: followers, posts, bio
   - [ ] Numbers match actual Instagram profile

**Test TikTok scrape:**

1. Switch to "TikTok" platform
2. Enter "charlidamelio" as username
3. Click "Scrape Profile"
4. **Verify**:
   - [ ] Job created immediately
   - [ ] Status updates correctly
   - [ ] Results display: followers, likes, videos
   - [ ] Numbers match actual TikTok profile

---

### ✅ Error Handling

**Test invalid username:**
- Username: "thisuserdoesnotexist123456789"
- **Verify**:
  - [ ] Job fails gracefully
  - [ ] Error message displayed
  - [ ] Status changes to "failed"

**Test private profile:**
- Username: (any private profile)
- **Verify**:
  - [ ] Job completes but shows limited data
  - [ ] isPrivate flag is true

**Test rate limiting:**
1. Create 6 jobs in 1 minute
2. Try 7th job
3. **Verify**:
   - [ ] Error: "Rate limit: Max 6 jobs per minute"
   - [ ] UI shows error message

**Test retry logic:**
1. Temporarily break Modal webhook URL (typo in env var)
2. Create job
3. **Verify**:
   - [ ] Job retries 3 times
   - [ ] Exponential backoff (2s, 4s, 8s)
   - [ ] After 3 fails, status = "failed"
   - [ ] Error message: "Failed after 3 retries"

---

### ✅ Real-Time Updates

1. Open scrapers page in 2 browser tabs
2. Create job in Tab 1
3. **Verify in Tab 2**:
   - [ ] Job appears immediately (Convex real-time sync)
   - [ ] Status updates in real-time
   - [ ] Results appear when completed

---

## Performance Testing

### ✅ Load Testing

**Sequential scrapes:**
```bash
# Create 10 jobs, one per minute
for i in {1..10}; do
  # Create job via UI
  sleep 60
done
```

**Verify**:
- [ ] All jobs complete successfully
- [ ] No rate limit errors (6/min limit respected)
- [ ] Modal costs reasonable

**Parallel scrapes:**
```bash
# Create 5 jobs simultaneously
# Use UI to create 5 jobs quickly (within 10 seconds)
```

**Verify**:
- [ ] All jobs queue properly
- [ ] All complete successfully
- [ ] No race conditions

---

### ✅ Cost Verification

**Track Modal costs:**
1. Check Modal dashboard → Billing
2. Run 10 test scrapes
3. Calculate cost per scrape
4. **Verify**:
   - [ ] Cost is ~$0.02-0.05 per scrape
   - [ ] Within free tier ($30 credit)

---

## Production Testing

### ✅ Deployment Verification

**After deploying to Vercel:**

```bash
vercel --prod
```

1. Visit production URL: `https://your-app.vercel.app/scrapers`
2. Test Instagram scrape
3. Test TikTok scrape
4. **Verify**:
   - [ ] All features work in production
   - [ ] Real-time updates work
   - [ ] Rate limiting active
   - [ ] Error handling correct

---

### ✅ Monitoring

**Check logs:**

**Modal logs:**
1. Go to https://modal.com/logs
2. Find recent scrapes
3. **Verify**:
   - [ ] Logs show scraper execution
   - [ ] No unexpected errors
   - [ ] Execution time < 30 seconds

**Convex logs:**
1. Go to Convex dashboard → Logs
2. Filter by "scraperJobs"
3. **Verify**:
   - [ ] Mutations logged
   - [ ] Webhook calls logged
   - [ ] No auth errors

---

## Edge Cases

### ✅ Special Characters

**Test usernames with special characters:**
- "nike.official"
- "kim_kardashian"
- "123test"

**Verify**:
- [ ] All work correctly
- [ ] URL encoding handled properly

### ✅ Very Large Numbers

**Test high-follower accounts:**
- Instagram: "cristiano" (600M+ followers)
- TikTok: "khaby.lame" (160M+ followers)

**Verify**:
- [ ] Numbers parsed correctly
- [ ] Formatted with K/M notation
- [ ] No overflow errors

### ✅ New Accounts

**Test brand new profiles:**
- 0 followers
- 0 posts

**Verify**:
- [ ] Scrapes successfully
- [ ] Shows 0 for counts
- [ ] No division by zero errors

---

## Regression Testing

**Run before each deployment:**

```bash
# Checklist
# 1. Instagram scrape (nike)
# 2. TikTok scrape (charlidamelio)
# 3. Rate limit test (7 jobs in 1 min)
# 4. Invalid username test
# 5. Real-time sync test (2 tabs)
```

**Time required**: ~15 minutes

**Automate with Playwright** (future):
```typescript
// test/scrapers.spec.ts
test('Instagram scrape flow', async ({ page }) => {
  await page.goto('/scrapers');
  await page.fill('input', 'nike');
  await page.click('button:has-text("Scrape Profile")');
  await expect(page.locator('[data-testid="job-status"]'))
    .toContainText('completed', { timeout: 60000 });
});
```

---

## Success Criteria

### ✅ All Tests Pass

- [ ] **Modal functions**: Instagram + TikTok work locally
- [ ] **Convex functions**: All mutations/queries/actions work
- [ ] **HTTP webhook**: Receives and processes webhooks
- [ ] **Frontend UI**: Real-time updates, proper error handling
- [ ] **Rate limiting**: 6/min, 100/hr limits enforced
- [ ] **Error handling**: Retries 3x with backoff
- [ ] **Production**: All features work on live site
- [ ] **Cost**: Within budget ($0.02-0.05 per scrape)

---

## Troubleshooting Failed Tests

### Modal function fails
→ Check browser installation: `playwright install chromium`
→ Check Modal secrets configured
→ Check for Instagram/TikTok HTML changes

### Webhook not received
→ Verify webhook URL in Modal code
→ Check Convex environment variables
→ Test webhook manually with curl

### Rate limiting not working
→ Check Convex indexes (by_userId)
→ Verify timestamps are in milliseconds
→ Check logic in createScrapeJob

### Real-time updates don't work
→ Verify ConvexProvider configured
→ Check useQuery hooks in frontend
→ Test in incognito (clear cache)

---

**Next**: See `SCRAPER_SETUP_GUIDE.md` for full deployment
