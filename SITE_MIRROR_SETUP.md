# Site Mirror Feature - Setup Instructions

## Overview

The **Intelligent Site Mirror** feature uses AI-powered analysis with Claude to create smart website mirrors. It analyzes site structure, plans crawl strategies, and creates downloadable ZIP archives.

## Setup Steps

### 1. Get Your Anthropic API Key

1. Go to https://console.anthropic.com/
2. Sign in or create an account
3. Navigate to "API Keys" section
4. Click "Create Key"
5. Copy your API key (starts with `sk-ant-...`)

### 2. Add API Key to Environment

Open `.env.local` and replace `your_anthropic_api_key_here` with your actual key:

```env
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
```

### 3. Add API Key to Convex Dashboard

The AI analysis runs in Convex actions, so you need to add the key there too:

1. Go to your Convex Dashboard: https://dashboard.convex.dev/d/formal-ocelot-254/settings/environment-variables
2. Click "Add Environment Variable"
3. Name: `ANTHROPIC_API_KEY`
4. Value: Your Anthropic API key
5. Click "Save"

### 4. Test the Feature

1. Make sure `npx convex dev` is running in your terminal
2. Start the Next.js dev server: `npm run dev`
3. Navigate to http://localhost:3000/site-mirror
4. Enter a website URL and click "Mirror Site"
5. Watch the AI analyze and crawl the site in real-time!

## How It Works

### Phase 1: AI Analysis
- Fetches the homepage
- Claude analyzes the site structure, navigation, and content types
- Identifies the site type (blog, e-commerce, docs, etc.)
- Estimates total pages and complexity

### Phase 2: Intelligent Planning
- Generates a priority-based crawl plan
- Identifies which pages are most important
- Predicts URL patterns based on site type
- Creates an optimized crawl strategy

### Phase 3: Smart Crawling
- Uses Playwright to crawl pages with JavaScript support
- Downloads HTML, CSS, JS, images, and other assets
- Follows the AI-generated priority queue
- Adapts strategy based on discoveries

### Phase 4: Processing
- Compiles all downloaded files
- Creates a browsable ZIP archive
- Stores metadata and statistics

## Features

- ✅ **AI-Powered Analysis** - Claude understands site structure before crawling
- ✅ **Real-time Updates** - See progress through each phase
- ✅ **Smart Prioritization** - Crawls important pages first
- ✅ **Adaptive Strategy** - Adjusts based on what it discovers
- ✅ **Full Asset Download** - Gets HTML, CSS, JS, images, fonts
- ✅ **Browsable Archives** - Creates working offline copies
- ✅ **User Authentication** - Each user sees only their own mirrors
- ✅ **Job History** - Track all your mirror jobs

## Cost Estimates

Using Claude 3.5 Sonnet:
- **Per site mirror**: ~$0.05 - $0.20
- **Analysis phase**: ~$0.01 - $0.05
- **Mid-crawl re-analyses**: ~$0.02 - $0.10
- **Validation phase**: ~$0.01 - $0.05

Costs vary based on site complexity and number of pages.

## Customization

Edit configuration in `.env.local`:

```env
AI_MODEL=claude-3-5-sonnet-20241022    # Claude model to use
MAX_CRAWL_DEPTH=3                       # Maximum link depth
MAX_PAGES_PER_CRAWL=50                  # Page limit per job
AI_ANALYSIS_INTERVAL=10                 # Re-analyze every N pages
```

## Troubleshooting

### "Unauthenticated" Error
- Make sure you're signed in with Clerk
- Check that `npx convex dev` is running

### "Invalid API Key" Error
- Verify your Anthropic API key is correct
- Check it's added to both `.env.local` AND Convex Dashboard
- Restart `npx convex dev` after adding the key

### Crawl Fails or Times Out
- Try reducing `MAX_PAGES_PER_CRAWL`
- Some sites may block automated crawling
- Check the error message for specific issues

### No Jobs Appearing
- Verify you're signed in
- Check browser console for errors
- Ensure Convex functions deployed successfully

## Next Steps

Once you have your API key configured:

1. Test with a simple website first (personal blog, portfolio)
2. Try more complex sites (documentation, e-commerce)
3. Experiment with different crawl settings
4. Monitor costs in your Anthropic dashboard

## Future Enhancements

Planned features:
- [ ] Scheduled re-crawling for change detection
- [ ] Diff view between mirror versions
- [ ] Export to design tools (Figma, Sketch)
- [ ] Custom selector extraction
- [ ] PDF generation of pages
- [ ] SEO metrics extraction
- [ ] Technology stack detection
- [ ] Performance analysis

---

**Ready to mirror some sites?** Add your API key and start creating intelligent mirrors! 🚀
