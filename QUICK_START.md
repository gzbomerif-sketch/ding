# ⚡ Quick Start - 5 Minute Setup

**Get scraping in 5 minutes!**

---

## 1. Install Modal CLI (1 min)

```bash
pip install modal
modal setup
```

Follow prompts to authenticate.

---

## 2. Create Modal Secret (1 min)

Go to https://modal.com/secrets

**Create secret named**: `convex-secrets`

**Add variable**:
- Key: `CONVEX_SITE_URL`
- Value: Get from Convex dashboard (Settings → URL)
  - Should be: `https://YOUR-DEPLOYMENT.convex.site`

---

## 3. Deploy Scrapers (2 min)

```bash
cd modal_scrapers

# Deploy both
modal deploy instagram.py
modal deploy tiktok.py
```

**SAVE THE WEBHOOK URLs FROM OUTPUT!**

---

## 4. Configure Convex (1 min)

Go to Convex Dashboard → Environment Variables

**Add these**:

```
MODAL_INSTAGRAM_WEBHOOK = <URL from step 3>
MODAL_TIKTOK_WEBHOOK = <URL from step 3>
CONVEX_SITE_URL = https://YOUR-DEPLOYMENT.convex.site
```

Then deploy:

```bash
npx convex deploy
```

---

## 5. Test! (30 sec)

```bash
npm run dev
```

Open: http://localhost:3000/scrapers

1. Select "Instagram"
2. Enter "nike"
3. Click "Scrape Profile"
4. Watch it work! ✨

---

## ✅ Done!

If it worked:
- Job goes: pending → running → completed
- You see Nike's follower count
- Check Modal logs: https://modal.com/logs

If it didn't work:
- Read full setup guide: `SCRAPER_SETUP_GUIDE.md`
- Check troubleshooting section

---

**Need Help?**

1. Check logs in Modal dashboard
2. Check logs in Convex dashboard
3. Read `SCRAPER_SETUP_GUIDE.md`
4. Check environment variables
