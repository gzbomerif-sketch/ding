"""
Instagram Profile Scraper - Modal Function
Scrapes Instagram profiles using Playwright in serverless environment
"""

import modal
import json
from typing import Dict, Any

# Create Modal stub
stub = modal.Stub("sylcroad-instagram-scraper")

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
async def scrape_instagram_profile(
    username: str,
    job_id: str,
    webhook_url: str
) -> Dict[str, Any]:
    """
    Scrape Instagram profile and return structured data
    
    Args:
        username: Instagram username (without @)
        job_id: Convex job ID for tracking
        webhook_url: Convex webhook endpoint to send results
        
    Returns:
        Dict with profile data: followers, posts, bio, etc.
    """
    from playwright.async_api import async_playwright
    import httpx
    
    print(f"[INFO] Starting Instagram scrape for @{username}")
    
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
            url = f"https://www.instagram.com/{username}/"
            print(f"[INFO] Navigating to {url}")
            
            await page.goto(url, wait_until='networkidle', timeout=30000)
            
            # Wait for profile header to load
            await page.wait_for_selector('header', timeout=15000)
            
            print("[INFO] Page loaded, extracting data...")
            
            # Extract profile data using JavaScript
            data = await page.evaluate("""
                () => {
                    // Helper to parse follower counts (handles K, M, B)
                    const parseCount = (text) => {
                        if (!text) return 0;
                        const match = text.match(/([\\d,.]+)([KMB]?)/);
                        if (!match) return 0;
                        
                        const num = parseFloat(match[1].replace(/,/g, ''));
                        const suffix = match[2];
                        
                        if (suffix === 'K') return Math.floor(num * 1000);
                        if (suffix === 'M') return Math.floor(num * 1000000);
                        if (suffix === 'B') return Math.floor(num * 1000000000);
                        return Math.floor(num);
                    };
                    
                    // Get stats from header
                    const stats = Array.from(
                        document.querySelectorAll('header section ul li')
                    ).map(li => li.textContent?.trim() || '');
                    
                    // Extract username
                    const username = document.querySelector('header h2')?.textContent?.trim() || '';
                    
                    // Extract bio
                    const bioElement = document.querySelector('header section div span');
                    const bio = bioElement?.textContent?.trim() || '';
                    
                    // Check verification
                    const isVerified = !!document.querySelector('svg[aria-label="Verified"]');
                    
                    // Check if private
                    const isPrivate = !!document.querySelector('h2')?.textContent?.includes('Private');
                    
                    // Get profile picture
                    const profilePicElement = document.querySelector('header img');
                    const profilePicUrl = profilePicElement?.src || '';
                    
                    // Get full name
                    const fullNameElement = document.querySelector('header section div div span');
                    const fullName = fullNameElement?.textContent?.trim() || '';
                    
                    // Parse stats
                    const posts = parseCount(stats[0] || '0');
                    const followers = parseCount(stats[1] || '0');
                    const following = parseCount(stats[2] || '0');
                    
                    return {
                        username,
                        fullName,
                        bio,
                        followers,
                        following,
                        posts,
                        profilePicUrl,
                        isVerified,
                        isPrivate,
                        scrapedAt: new Date().toISOString(),
                    };
                }
            """)
            
            print(f"[SUCCESS] Scraped @{username}: {data['followers']} followers")
            
            # Send success webhook
            async with httpx.AsyncClient() as client:
                webhook_response = await client.post(
                    webhook_url,
                    json={
                        "jobId": job_id,
                        "status": "completed",
                        "platform": "Instagram",
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
                            "platform": "Instagram",
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
        result = await scrape_instagram_profile.local(
            username="nike",
            job_id="test-123",
            webhook_url="https://httpbin.org/post"
        )
        print(json.dumps(result, indent=2))
    
    asyncio.run(test())
