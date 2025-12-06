const { chromium } = require('playwright');

async function investigate() {
  console.log('Starting ChurchHeard.com investigation...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  const page = await context.newPage();

  try {
    // Task 1: Navigate to landing page
    console.log('\n=== Task 1: Landing Page ===');
    await page.goto('https://churchheard.com', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'screenshots/01-landing-page.png', fullPage: true });
    console.log('✓ Landing page screenshot captured');

    const title = await page.title();
    console.log('Page title:', title);

    // Extract main headline/value proposition
    const h1 = await page.locator('h1').first().textContent().catch(() => 'Not found');
    console.log('Main headline:', h1);

    // Task 2: Identify navigation and main sections
    console.log('\n=== Task 2: Navigation Analysis ===');
    const navLinks = await page.locator('nav a, header a').allTextContents();
    console.log('Navigation links:', navLinks);

    // Look for CTAs
    const buttons = await page.locator('button, a[class*="button"], a[class*="btn"]').allTextContents();
    console.log('Primary CTAs:', buttons.slice(0, 5));

    // Task 3: Check for feed/content area
    console.log('\n=== Task 3: Feed/Content Analysis ===');

    // Look for feed container
    const feedExists = await page.locator('[class*="feed"], [class*="post"], [id*="feed"]').count();
    console.log('Feed elements found:', feedExists);

    if (feedExists > 0) {
      await page.screenshot({ path: 'screenshots/02-feed-view.png', fullPage: true });
      console.log('✓ Feed screenshot captured');

      // Analyze post structure
      const posts = await page.locator('[class*="post"], article').count();
      console.log('Posts visible:', posts);

      // Check for engagement buttons
      const engagementButtons = await page.locator('button[class*="like"], button[class*="comment"], button[class*="share"]').count();
      console.log('Engagement buttons found:', engagementButtons);
    }

    // Task 4: Test navigation to key pages
    console.log('\n=== Task 4: Key Page Navigation ===');

    // Try to find and navigate to common pages
    const pagesToCheck = [
      { selector: 'a[href*="about"]', name: 'About' },
      { selector: 'a[href*="login"], a[href*="signin"]', name: 'Login' },
      { selector: 'a[href*="signup"], a[href*="register"]', name: 'Signup' },
      { selector: 'a[href*="features"]', name: 'Features' },
    ];

    for (const pageInfo of pagesToCheck) {
      const link = page.locator(pageInfo.selector).first();
      if (await link.count() > 0) {
        console.log(`Found ${pageInfo.name} link`);
        await link.click();
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: `screenshots/03-${pageInfo.name.toLowerCase()}-page.png`, fullPage: true });
        console.log(`✓ ${pageInfo.name} page screenshot captured`);
        await page.goBack();
        await page.waitForLoadState('networkidle');
      }
    }

    // Task 5: Performance metrics
    console.log('\n=== Task 5: Performance Analysis ===');
    const performanceMetrics = await page.evaluate(() => {
      const timing = performance.timing;
      return {
        loadTime: timing.loadEventEnd - timing.navigationStart,
        domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 'N/A'
      };
    });
    console.log('Performance metrics:', performanceMetrics);

    // Task 6: Accessibility quick check
    console.log('\n=== Task 6: Accessibility Check ===');
    const hasSkipLink = await page.locator('a[href="#main"], a[href="#content"]').count();
    const hasAltText = await page.locator('img[alt]').count();
    const totalImages = await page.locator('img').count();
    console.log('Skip link present:', hasSkipLink > 0);
    console.log('Images with alt text:', `${hasAltText}/${totalImages}`);

    console.log('\n✓ Investigation complete!');

  } catch (error) {
    console.error('Error during investigation:', error.message);
  } finally {
    await browser.close();
  }
}

investigate();
