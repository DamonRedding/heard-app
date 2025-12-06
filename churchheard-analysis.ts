import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface AnalysisReport {
  timestamp: string;
  sections: {
    landingPage?: any;
    userJourney?: any;
    feedAnalysis?: any;
    engagement?: any;
    frictionPoints?: any[];
    visualHierarchy?: any;
  };
  criticalFindings: {
    engagementBarriers: string[];
    valueProposition: string;
    frictionPoints: string[];
    recommendations: string[];
  };
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function analyzeChurchHeard() {
  const screenshotDir = path.join(__dirname, 'playwright-screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const report: AnalysisReport = {
    timestamp: new Date().toISOString(),
    sections: {},
    criticalFindings: {
      engagementBarriers: [],
      valueProposition: '',
      frictionPoints: [],
      recommendations: []
    }
  };

  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    console.log('🚀 Launching browser...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    page = await context.newPage();

    // ====================
    // 1. LANDING PAGE ANALYSIS
    // ====================
    console.log('\n📍 Phase 1: Landing Page Analysis');
    console.log('Navigating to https://churchheard.com...');

    const navigationStart = Date.now();
    await page.goto('https://churchheard.com', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    const navigationTime = Date.now() - navigationStart;

    console.log(`✅ Page loaded in ${navigationTime}ms`);
    await sleep(2000); // Allow animations to complete

    // Capture landing page
    await page.screenshot({
      path: path.join(screenshotDir, '01-landing-page.png'),
      fullPage: true
    });
    console.log('📸 Screenshot saved: 01-landing-page.png');

    // Analyze landing page elements
    const landingPageData = {
      loadTime: navigationTime,
      title: await page.title(),
      url: page.url(),
      mainHeading: await page.locator('h1').first().textContent().catch(() => 'Not found'),
      subHeading: await page.locator('h2').first().textContent().catch(() => 'Not found'),
      ctaButtons: await page.locator('button, a[href]').count(),
      visibleText: await page.locator('body').textContent(),
      hasNavigation: await page.locator('nav').count() > 0,
      hasHero: await page.locator('header, [class*="hero"]').count() > 0,
    };

    report.sections.landingPage = landingPageData;
    console.log(`  - Title: ${landingPageData.title}`);
    console.log(`  - Main heading: ${landingPageData.mainHeading}`);
    console.log(`  - CTA buttons found: ${landingPageData.ctaButtons}`);

    // ====================
    // 2. NAVIGATION & USER JOURNEY
    // ====================
    console.log('\n🗺️  Phase 2: User Journey Mapping');

    const navigationElements = await page.locator('nav a, [role="navigation"] a').all();
    const navLinks: { text: string; href: string }[] = [];

    for (const link of navigationElements.slice(0, 10)) {
      const text = await link.textContent();
      const href = await link.getAttribute('href');
      if (text && href) {
        navLinks.push({ text: text.trim(), href });
        console.log(`  - Found nav link: "${text.trim()}" -> ${href}`);
      }
    }

    // Try to find and navigate to main sections
    const sectionsToTest = ['feed', 'post', 'profile', 'create', 'home', 'submissions'];
    const foundSections: any[] = [];

    for (const section of sectionsToTest) {
      try {
        // Look for links or buttons containing the section name
        const sectionLink = page.locator(`a:has-text("${section}"), button:has-text("${section}")`).first();
        const linkExists = await sectionLink.count() > 0;

        if (linkExists) {
          console.log(`  ✓ Found section: ${section}`);
          foundSections.push({ name: section, accessible: true });
        }
      } catch (e) {
        console.log(`  ✗ Section not found: ${section}`);
      }
    }

    // Check for feed/posts on main page
    const feedItems = await page.locator('[class*="post"], [class*="card"], [class*="feed"], article').count();
    console.log(`  - Feed items visible on landing: ${feedItems}`);

    if (feedItems > 0) {
      await page.screenshot({
        path: path.join(screenshotDir, '02-feed-view.png'),
        fullPage: true
      });
      console.log('📸 Screenshot saved: 02-feed-view.png');
    }

    // ====================
    // 3. FEED ANALYSIS
    // ====================
    console.log('\n📰 Phase 3: Feed Analysis');

    const feedAnalysis = {
      totalPosts: feedItems,
      postStructure: [] as any[],
      engagementMechanisms: {
        likeButtons: 0,
        commentButtons: 0,
        shareButtons: 0,
        otherActions: 0
      },
      layout: 'unknown'
    };

    if (feedItems > 0) {
      // Analyze first few posts
      const posts = await page.locator('[class*="post"], [class*="card"], article').all();

      for (let i = 0; i < Math.min(3, posts.length); i++) {
        const post = posts[i];
        const postData = {
          index: i,
          hasImage: await post.locator('img').count() > 0,
          hasTitle: await post.locator('h1, h2, h3, h4').count() > 0,
          hasAuthor: await post.locator('[class*="author"], [class*="user"]').count() > 0,
          hasTimestamp: await post.locator('time, [class*="date"], [class*="time"]').count() > 0,
          text: (await post.textContent())?.substring(0, 200),
          engagementButtons: await post.locator('button').count(),
        };

        feedAnalysis.postStructure.push(postData);
        console.log(`  Post ${i + 1}:`);
        console.log(`    - Has image: ${postData.hasImage}`);
        console.log(`    - Has title: ${postData.hasTitle}`);
        console.log(`    - Engagement buttons: ${postData.engagementButtons}`);
      }

      // Count engagement mechanisms
      feedAnalysis.engagementMechanisms.likeButtons = await page.locator('button:has-text("like"), button[aria-label*="like" i], [class*="like"]').count();
      feedAnalysis.engagementMechanisms.commentButtons = await page.locator('button:has-text("comment"), button[aria-label*="comment" i], [class*="comment"]').count();
      feedAnalysis.engagementMechanisms.shareButtons = await page.locator('button:has-text("share"), button[aria-label*="share" i], [class*="share"]').count();

      console.log(`  Engagement mechanisms found:`);
      console.log(`    - Like buttons: ${feedAnalysis.engagementMechanisms.likeButtons}`);
      console.log(`    - Comment buttons: ${feedAnalysis.engagementMechanisms.commentButtons}`);
      console.log(`    - Share buttons: ${feedAnalysis.engagementMechanisms.shareButtons}`);
    }

    report.sections.feedAnalysis = feedAnalysis;

    // ====================
    // 4. ENGAGEMENT TESTING
    // ====================
    console.log('\n🎯 Phase 4: Engagement Mechanism Testing');

    const engagementTests = {
      ctaVisibility: [] as any[],
      interactiveElements: [] as any[],
      barriers: [] as string[]
    };

    // Find all CTAs
    const allCTAs = await page.locator('button, a[class*="button"], [role="button"]').all();
    console.log(`  Found ${allCTAs.length} potential CTAs`);

    for (let i = 0; i < Math.min(10, allCTAs.length); i++) {
      const cta = allCTAs[i];
      const text = await cta.textContent();
      const isVisible = await cta.isVisible();
      const isEnabled = await cta.isEnabled();
      const bbox = await cta.boundingBox();

      const ctaData = {
        text: text?.trim(),
        visible: isVisible,
        enabled: isEnabled,
        position: bbox ? { x: bbox.x, y: bbox.y } : null,
        size: bbox ? { width: bbox.width, height: bbox.height } : null
      };

      engagementTests.ctaVisibility.push(ctaData);

      if (!isVisible) {
        engagementTests.barriers.push(`Hidden CTA: "${text?.trim()}"`);
      }
      if (!isEnabled && isVisible) {
        engagementTests.barriers.push(`Disabled CTA: "${text?.trim()}"`);
      }

      console.log(`  CTA ${i + 1}: "${text?.trim()}" - Visible: ${isVisible}, Enabled: ${isEnabled}`);
    }

    // Test form elements
    const inputs = await page.locator('input, textarea').count();
    const selects = await page.locator('select').count();
    console.log(`  Form elements: ${inputs} inputs, ${selects} selects`);

    report.sections.engagement = engagementTests;

    // ====================
    // 5. UX FRICTION POINTS
    // ====================
    console.log('\n⚠️  Phase 5: UX Friction Point Identification');

    const frictionPoints: any[] = [];

    // Check for loading states
    const loadingIndicators = await page.locator('[class*="loading"], [class*="spinner"], [aria-busy="true"]').count();
    if (loadingIndicators > 0) {
      frictionPoints.push({
        type: 'loading_state',
        severity: 'medium',
        description: `${loadingIndicators} loading indicators found - may indicate slow content`
      });
    }

    // Check for error states
    const errorElements = await page.locator('[class*="error"], [role="alert"]').count();
    if (errorElements > 0) {
      const errorText = await page.locator('[class*="error"], [role="alert"]').first().textContent();
      frictionPoints.push({
        type: 'error_state',
        severity: 'high',
        description: `Error found: ${errorText}`
      });
    }

    // Check for empty states
    const emptyStates = await page.locator(':has-text("No posts"), :has-text("Nothing to show"), :has-text("empty")').count();
    if (emptyStates > 0) {
      frictionPoints.push({
        type: 'empty_state',
        severity: 'high',
        description: 'Empty state detected - no content to engage with'
      });
    }

    // Navigation clarity
    if (navLinks.length === 0) {
      frictionPoints.push({
        type: 'navigation',
        severity: 'high',
        description: 'No clear navigation menu found'
      });
    }

    // Performance check
    if (navigationTime > 3000) {
      frictionPoints.push({
        type: 'performance',
        severity: 'medium',
        description: `Slow page load: ${navigationTime}ms`
      });
    }

    console.log(`  Identified ${frictionPoints.length} friction points:`);
    frictionPoints.forEach((fp, i) => {
      console.log(`    ${i + 1}. [${fp.severity}] ${fp.type}: ${fp.description}`);
    });

    report.sections.frictionPoints = frictionPoints;

    // ====================
    // 6. VISUAL HIERARCHY
    // ====================
    console.log('\n🎨 Phase 6: Visual Hierarchy Assessment');

    const visualHierarchy = {
      headings: {
        h1: await page.locator('h1').count(),
        h2: await page.locator('h2').count(),
        h3: await page.locator('h3').count(),
      },
      images: await page.locator('img').count(),
      sections: await page.locator('section, [class*="section"]').count(),
      mainContentArea: null as any,
      sidebar: await page.locator('aside, [class*="sidebar"]').count() > 0,
      footer: await page.locator('footer').count() > 0,
    };

    console.log(`  Content structure:`);
    console.log(`    - H1 headings: ${visualHierarchy.headings.h1}`);
    console.log(`    - H2 headings: ${visualHierarchy.headings.h2}`);
    console.log(`    - H3 headings: ${visualHierarchy.headings.h3}`);
    console.log(`    - Images: ${visualHierarchy.images}`);
    console.log(`    - Sections: ${visualHierarchy.sections}`);
    console.log(`    - Has sidebar: ${visualHierarchy.sidebar}`);

    // Capture final state
    await page.screenshot({
      path: path.join(screenshotDir, '03-final-state.png'),
      fullPage: true
    });
    console.log('📸 Screenshot saved: 03-final-state.png');

    report.sections.visualHierarchy = visualHierarchy;

    // ====================
    // CRITICAL FINDINGS
    // ====================
    console.log('\n🔍 Generating Critical Findings...');

    // Engagement barriers
    if (feedAnalysis.totalPosts === 0) {
      report.criticalFindings.engagementBarriers.push('No posts visible on landing page');
    }
    if (feedAnalysis.engagementMechanisms.likeButtons === 0) {
      report.criticalFindings.engagementBarriers.push('No like/reaction buttons found');
    }
    if (feedAnalysis.engagementMechanisms.commentButtons === 0) {
      report.criticalFindings.engagementBarriers.push('No comment buttons found');
    }
    if (engagementTests.barriers.length > 0) {
      report.criticalFindings.engagementBarriers.push(...engagementTests.barriers);
    }

    // Value proposition
    const mainText = landingPageData.visibleText?.substring(0, 500) || '';
    if (mainText.toLowerCase().includes('church')) {
      report.criticalFindings.valueProposition = 'Church-focused community platform';
    } else {
      report.criticalFindings.valueProposition = 'Value proposition unclear from landing page';
    }

    // Friction points
    report.criticalFindings.frictionPoints = frictionPoints.map(fp => fp.description);

    // Recommendations
    if (navigationTime > 3000) {
      report.criticalFindings.recommendations.push('Optimize page load time');
    }
    if (feedAnalysis.totalPosts === 0) {
      report.criticalFindings.recommendations.push('Ensure content is visible on landing page');
    }
    if (feedAnalysis.engagementMechanisms.likeButtons === 0) {
      report.criticalFindings.recommendations.push('Add visible engagement mechanisms (likes, reactions)');
    }
    if (navLinks.length < 3) {
      report.criticalFindings.recommendations.push('Improve navigation clarity and visibility');
    }

    console.log('\n✅ Analysis Complete!');
    console.log('\n' + '='.repeat(60));
    console.log('CRITICAL FINDINGS SUMMARY');
    console.log('='.repeat(60));
    console.log('\n🚫 Engagement Barriers:');
    report.criticalFindings.engagementBarriers.forEach(b => console.log(`  - ${b}`));
    console.log('\n💡 Value Proposition:', report.criticalFindings.valueProposition);
    console.log('\n⚠️  Friction Points:');
    report.criticalFindings.frictionPoints.forEach(fp => console.log(`  - ${fp}`));
    console.log('\n📋 Recommendations:');
    report.criticalFindings.recommendations.forEach(r => console.log(`  - ${r}`));
    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('❌ Error during analysis:', error);
    throw error;
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
  }

  // Save report
  const reportPath = path.join(__dirname, 'churchheard-analysis-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Full report saved to: ${reportPath}`);

  return report;
}

// Run the analysis
analyzeChurchHeard().catch(console.error);
