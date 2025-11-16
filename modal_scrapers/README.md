# Modal Scrapers Setup

## Prerequisites
1. Install Modal CLI: `pip install modal`
2. Authenticate: `modal setup`
3. Create secrets in Modal dashboard

## Secrets Required
Create a secret named `convex-secrets` with:
- `CONVEX_SITE_URL`: Your Convex HTTP endpoint URL

## Deployment

```bash
# Deploy Instagram scraper
modal deploy instagram.py

# Deploy TikTok scraper
modal deploy tiktok.py
```

## Get Webhook URLs
After deployment, Modal will output URLs like:
```
https://your-username--sylcroad-instagram-scraper-scrape-instagram-profile.modal.run
https://your-username--sylcroad-tiktok-scraper-scrape-tiktok-profile.modal.run
```

Add these to your Convex environment variables:
- `MODAL_INSTAGRAM_WEBHOOK`
- `MODAL_TIKTOK_WEBHOOK`

## Testing Locally

```bash
# Test Instagram
python instagram.py

# Test TikTok
python tiktok.py
```

## Usage
These functions are called by Convex actions, not directly.
See `convex/scraperJobs.ts` for integration code.
