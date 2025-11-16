"""
TikTok Profile Scraper - Modal Function
Scrapes TikTok profiles using Playwright in serverless environment
"""

import modal
import json
from typing import Dict, Any

# Create Modal stub
stub = modal.Stub("sylcroad-tiktok-scraper")

# Docker image with Playwright and dependencies
image = (
    modal.Image.debian_slim()
    .pip_install(
        "playwright==1.40.0",
        "httpx==0.25.2"
    )
    .run_commands(
        "playwright install chromium",
        "playwright install-deps chromium"
    )
)


@stub.function(
    image=image,
    timeout=300,  # 5 minutes max per scrape
    cpu=1.0,
    memory=2048,  # 2GB RAM
    secrets=[modal.Secret.from_name("convex-secrets")],
)
async def scrape_tiktok_profile(
    username: str,
    job_id: str,
    webhook_url: str
) -> Dict[str, Any]:
    """
    Scrape TikTok profile and return structured data
    
    Args:
        username: TikTok username (without @)
        job_id: Convex job ID for tracking
        webhook_url: Convex webhook endpoint to send results
        
    Returns:
        Dict with profile data: followers, likes, videos, etc.
    """
    from playwright.async_api import async_playwright
    import httpx
    
    print(f"[INFO] Starting TikTok scrape for @{username}")
    
    async with async_playwright() as p:
        browser = None
        try:
            # Launch browser
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                ]
            )
            
            # Create context with realistic settings
            context = await browser.new_context(
                user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                viewport={'width': 1920, 'height': 1080},
                locale='en-US',
            )
            
            page = await context.new_page()
            
            # Navigate to profile
            url = f"https://www.tiktok.com/@{username}"
            print(f"[INFO] Navigating to {url}")
            
            await page.goto(url, wait_until='networkidle', timeout=30000)
            
            # Wait for user page to load
            await page.wait_for_selector('[data-e2e="user-page"]', timeout=15000)
            
            print("[INFO] Page loaded, extracting data...")
            
            # Extract profile data using JavaScript
            data = await page.evaluate("""
                () => {
                    // Helper to parse counts (handles K, M, B)
                    const parseCount = (text) => {
                        if (!text) return 0;
                        
                        // Remove any non-numeric characters except K, M, B, and decimal
                        const cleaned = text.replace(/[^\\d.KMB]/g, '');
                        const match = cleaned.match(/([\\d.]+)([KMB]?)/);
                        
                        if (!match) return 0;
                        
                        const num = parseFloat(match[1]);
                        const suffix = match[2];
                        
                        if (suffix === 'K') return Math.floor(num * 1000);
                        if (suffix === 'M') return Math.floor(num * 1000000);
                        if (suffix === 'B') return Math.floor(num * 1000000000);
                        return Math.floor(num);
                    };
                    
                    // Get username
                    const username = document.querySelector('[data-e2e="user-title"]')?.textContent?.trim() || '';
                    
                    // Get bio
                    const bio = document.querySelector('[data-e2e="user-bio"]')?.textContent?.trim() || '';
                    
                    // Get avatar
                    const avatarElement = document.querySelector('[data-e2e="user-avatar"] img');
                    const avatar = avatarElement?.src || '';
                    
                    // Get stats using title attributes
                    const followersElement = document.querySelector('[title*="Followers"], [data-e2e="followers-count"]');
                    const followingElement = document.querySelector('[title*="Following"], [data-e2e="following-count"]');
                    const likesElement = document.querySelector('[title*="Likes"], [data-e2e="likes-count"]');
                    
                    const followers = parseCount(
                        followersElement?.getAttribute('title') || 
                        followersElement?.textContent || '0'
                    );
                    
                    const following = parseCount(
                        followingElement?.getAttribute('title') || 
                        followingElement?.textContent || '0'
                    );
                    
                    const likes = parseCount(
                        likesElement?.getAttribute('title') || 
                        likesElement?.textContent || '0'
                    );
                    
                    // Check verification
                    const verified = !!document.querySelector('[data-e2e="user-verified-badge"]');
                    
                    // Get video count
                    const videos = document.querySelectorAll('[data-e2e="user-post-item"]').length;
                    
                    // Get recent video data
                    const recentVideos = Array.from(
                        document.querySelectorAll('[data-e2e="user-post-item"]')
                    ).slice(0, 12).map(item => {
                        const link = item.querySelector('a')?.href || '';
                        const viewsElement = item.querySelector('[data-e2e="video-views"]');
                        const views = parseCount(viewsElement?.textContent || '0');
                        return { link, views };
                    });
                    
                    return {
                        username,
                        bio,
                        avatar,
                        followers,
                        following,
                        likes,
                        videos,
                        verified,
                        recentVideos,
                        scrapedAt: new Date().toISOString(),
                    };
                }
            """)
            
            print(f"[SUCCESS] Scraped @{username}: {data['followers']} followers, {data['likes']} likes")
            
            # Send success webhook
            async with httpx.AsyncClient() as client:
                webhook_response = await client.post(
                    webhook_url,
                    json={
                        "jobId": job_id,
                        "status": "completed",
                        "platform": "TikTok",
                        "data": data,
                    },
                    timeout=30.0
                )
                print(f"[INFO] Webhook sent: {webhook_response.status_code}")
            
            return data
            
        except Exception as e:
            error_msg = str(e)
            print(f"[ERROR] Scraping failed: {error_msg}")
            
            # Send error webhook
            try:
                async with httpx.AsyncClient() as client:
                    await client.post(
                        webhook_url,
                        json={
                            "jobId": job_id,
                            "status": "failed",
                            "platform": "TikTok",
                            "error": error_msg,
                        },
                        timeout=30.0
                    )
            except Exception as webhook_error:
                print(f"[ERROR] Webhook failed: {webhook_error}")
            
            raise e
            
        finally:
            if browser:
                await browser.close()


# Export for Modal CLI
if __name__ == "__main__":
    # Local testing
    import asyncio
    
    async def test():
        result = await scrape_tiktok_profile.local(
            username="charlidamelio",
            job_id="test-123",
            webhook_url="https://httpbin.org/post"
        )
        print(json.dumps(result, indent=2))
    
    asyncio.run(test())
