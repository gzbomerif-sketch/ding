# Site Mirror - Next.js API Route Implementation

## ✅ Full Implementation Complete!

The Site Mirror feature now includes **REAL web crawling** using Playwright + Crawlee via Next.js API routes.

## 📂 Files Created/Modified

### New Files:
- **`app/api/crawl/route.ts`** - Next.js API route with full Playwright crawler
- **`SITE_MIRROR_API_IMPLEMENTATION.md`** - This documentation

### Modified Files:
- **`convex/siteMirror.ts`** - Updated to call API route instead of mock
- **`app/(protected)/site-mirror/page.tsx`** - Updated download URL handling

## 🏗️ Architecture

```
User → Frontend (Next.js)
         ↓
      Convex Action (startMirrorCrawl)
         ↓
      Next.js API Route (/api/crawl)
         ↓
      Playwright Crawler + Claude AI
         ↓
      ZIP Generation
         ↓
      Save to public/downloads/
         ↓
      Update Convex with download URL
         ↓
      User downloads ZIP file
```

## 🔧 How It Works

### 1. User Submits URL
- User enters URL at `/site-mirror`
- Frontend calls `createMirrorJob` mutation
- Then calls `startMirrorCrawl` action

### 2. Convex Action Delegates to API
- `startMirrorCrawl` action calls `/api/crawl`
- Passes `jobId` and `url` to API route

### 3. API Route Performs Real Crawl
**Steps in `/api/crawl/route.ts`:**

a. **AI Analysis** (uses Claude):
   - Fetches homepage
   - Extracts title and links
   - Sends to Claude for analysis
   - Returns: site type, estimated pages, priority pages, tech stack

b. **Crawl Planning**:
   - Generates priority queue from AI analysis
   - Creates URL patterns to follow
   - Updates Convex with plan

c. **Playwright Crawling**:
   - Launches Playwright browser
   - Crawls priority pages
   - Downloads HTML, CSS, images
   - Follows same-domain links
   - Respects max page limit

d. **ZIP Creation**:
   - Archives all downloaded files
   - Saves to `public/downloads/mirror-{jobId}-{timestamp}.zip`
   - Generates download URL

e. **Completion**:
   - Updates Convex with download URL and stats
   - Returns success response

### 4. User Downloads ZIP
- Download button appears with real ZIP file link
- Files served from `public/downloads/` directory

## 📦 What Gets Downloaded

The ZIP archive contains:
- **HTML files** - Full page content
- **CSS stylesheets** - Styling (up to 5 per page)
- **Images** - Pictures and assets (up to 10 per page)
- **Browsable structure** - Organized for offline viewing

## ⚙️ Configuration

Environment variables (already configured):
```env
ANTHROPIC_API_KEY=sk-ant-api03-...     # Your Claude API key
AI_MODEL=claude-3-5-sonnet-20241022    # Claude model
MAX_PAGES_PER_CRAWL=50                 # Page limit
MAX_CRAWL_DEPTH=3                      # Link depth
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # For API calls
```

## 🧪 Testing

### Test with Real Website:

1. **Start dev server** (already running):
   ```bash
   npm run dev
   ```

2. **Navigate to**: http://localhost:3000/site-mirror

3. **Try these test URLs**:
   - `https://example.com` - Simple site, fast
   - `https://example.org` - Another simple test
   - Your own website URL

4. **Watch the process**:
   - ⏳ Pending
   - 🧠 Analyzing (Claude AI analyzes site structure)
   - 📋 Planning (Creates intelligent crawl plan)
   - 🕷️ Crawling (Playwright downloads pages)
   - 📦 Processing (Creates ZIP archive)
   - ✅ Completed (Download button appears)

5. **Download the ZIP**:
   - Click "Download Mirror (ZIP)"
   - Extract and open `index.html`
   - Browse the mirrored site offline!

## 🔍 Real vs Mock Comparison

| Feature | Mock Implementation | API Route Implementation |
|---------|---------------------|-------------------------|
| AI Analysis | ❌ Mock data | ✅ Real Claude API |
| Web Crawling | ❌ Simulated | ✅ Real Playwright |
| Asset Download | ❌ None | ✅ HTML, CSS, Images |
| ZIP Creation | ❌ Mock URL | ✅ Real ZIP file |
| Download | ❌ 404 error | ✅ Works! |
| Duration | ~8 seconds | 10-60 seconds (depends on site) |

## 💰 Cost Estimates

### Per Mirror Job:
- **Claude API**: $0.05 - $0.20 per analysis
- **Vercel/Hosting**: Free (hobby tier) or $20/month (pro)
- **Storage**: Local (`public/downloads/`)

### Monthly (100 mirrors):
- **Claude**: ~$5-20
- **Hosting**: $0-20
- **Total**: $5-40/month

## 🚀 Deployment Considerations

### Development (Current Setup):
- ✅ Works locally with `npm run dev`
- ✅ Files saved to `public/downloads/`
- ✅ No additional services needed

### Production (Vercel):

**Limitations**:
- Serverless function timeout: 10s (hobby), 60s (pro)
- May timeout on large sites

**Solutions**:
1. **Upgrade to Vercel Pro** ($20/month)
   - 60-second timeout
   - Handles most sites

2. **Add Background Jobs**:
   - Use Vercel Cron or external queue
   - Process crawls asynchronously

3. **Optimize Crawling**:
   - Reduce `MAX_PAGES_PER_CRAWL`
   - Skip heavy assets
   - Use faster selectors

### Alternative: VPS Deployment
For unlimited processing time:
- Deploy to DigitalOcean, Railway, Hetzner
- No timeout limits
- Full control over resources
- Cost: $5-20/month

## 📊 Monitoring & Debugging

### Check API Route Logs:
```bash
# In terminal where dev server is running
# Look for console.log outputs from /api/crawl
```

### Common Issues:

1. **"Failed to fetch" error**:
   - Check `NEXT_PUBLIC_BASE_URL` is set correctly
   - Ensure dev server is running

2. **AI analysis fails**:
   - Verify `ANTHROPIC_API_KEY` is valid
   - Check API key has credits

3. **Crawler times out**:
   - Reduce `MAX_PAGES_PER_CRAWL`
   - Target smaller websites

4. **Download link 404**:
   - Check `public/downloads/` directory exists
   - Verify ZIP file was created

## 🎯 Features Implemented

- ✅ Real AI website analysis with Claude
- ✅ Intelligent crawl planning
- ✅ Playwright browser automation
- ✅ HTML page downloading
- ✅ CSS stylesheet extraction
- ✅ Image downloading
- ✅ Same-domain link following
- ✅ ZIP archive creation
- ✅ Real-time status updates
- ✅ Statistics tracking
- ✅ Error handling
- ✅ Download functionality

## 🔮 Future Enhancements

### Short-term:
- [ ] Progress percentage tracking
- [ ] Cancel job functionality
- [ ] Retry failed downloads
- [ ] Better error messages

### Medium-term:
- [ ] JavaScript file downloading
- [ ] Font file extraction
- [ ] Robots.txt respect
- [ ] Rate limiting per domain

### Long-term:
- [ ] Scheduled re-crawling
- [ ] Diff detection between versions
- [ ] PDF export option
- [ ] Multiple format exports (WARC, MHTML)

## 🔗 Quick Links

- **UI**: http://localhost:3000/site-mirror
- **API Endpoint**: http://localhost:3000/api/crawl
- **Downloads**: http://localhost:3000/downloads/
- **Convex Dashboard**: https://dashboard.convex.dev

## 🎉 Success!

You now have a **fully functional Site Mirror** with:
- Real AI-powered analysis
- Actual web crawling
- Downloadable ZIP archives
- Production-ready UI
- Type-safe backend

Try it now at: **http://localhost:3000/site-mirror** 🚀
