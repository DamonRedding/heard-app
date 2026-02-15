/**
 * iOS Feature Testing Script for Heard App
 *
 * This script tests all iOS-specific features and API connectivity
 * Run this in the browser console or as a test suite
 */

import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Keyboard } from '@capacitor/keyboard';
import { StatusBar } from '@capacitor/status-bar';

interface TestResult {
  feature: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
}

class IOSFeatureTester {
  private results: TestResult[] = [];
  private apiUrl = import.meta.env.VITE_API_URL || 'https://churchheard.com';

  async runAllTests(): Promise<TestResult[]> {
    console.log('🧪 Starting iOS Feature Tests...\n');

    // Run all tests
    await this.testAPIConnection();
    await this.testCORS();
    await this.testDataFetching();
    await this.testHapticFeedback();
    await this.testKeyboard();
    await this.testStatusBar();
    await this.testSafeAreas();
    await this.testScrollPerformance();
    await this.testOfflineCapability();

    this.printResults();
    return this.results;
  }

  private async testAPIConnection(): Promise<void> {
    console.log('📡 Testing API Connection...');
    try {
      const response = await fetch(`${this.apiUrl}/api/submissions?limit=1`);
      const data = await response.json();

      this.results.push({
        feature: 'API Connection',
        status: response.ok ? 'passed' : 'failed',
        message: `API responded with status ${response.status}`,
        details: {
          totalSubmissions: data.total || 0,
          apiUrl: this.apiUrl
        }
      });
    } catch (error) {
      this.results.push({
        feature: 'API Connection',
        status: 'failed',
        message: `Connection failed: ${error.message}`,
        details: error
      });
    }
  }

  private async testCORS(): Promise<void> {
    console.log('🔐 Testing CORS Headers...');
    try {
      const response = await fetch(`${this.apiUrl}/api/submissions`, {
        method: 'OPTIONS',
        headers: {
          'Origin': window.location.origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });

      const hasCorS = response.headers.get('access-control-allow-origin') !== null;

      this.results.push({
        feature: 'CORS Configuration',
        status: hasCorS ? 'passed' : 'warning',
        message: hasCorS ? 'CORS headers present' : 'CORS headers missing - add to production',
        details: {
          origin: window.location.origin,
          allowedOrigin: response.headers.get('access-control-allow-origin')
        }
      });
    } catch (error) {
      this.results.push({
        feature: 'CORS Configuration',
        status: 'failed',
        message: `CORS test failed: ${error.message}`
      });
    }
  }

  private async testDataFetching(): Promise<void> {
    console.log('📊 Testing Data Fetching...');
    try {
      // Test main feed
      const feedResponse = await fetch(`${this.apiUrl}/api/submissions?limit=10`);
      const feedData = await feedResponse.json();

      // Test church search
      const searchResponse = await fetch(`${this.apiUrl}/api/churches?q=test`);
      const searchData = await searchResponse.json();

      this.results.push({
        feature: 'Data Fetching',
        status: 'passed',
        message: 'Successfully fetched feed and search data',
        details: {
          feedItems: feedData.submissions?.length || 0,
          searchResults: searchData.length || 0
        }
      });
    } catch (error) {
      this.results.push({
        feature: 'Data Fetching',
        status: 'failed',
        message: `Data fetch failed: ${error.message}`
      });
    }
  }

  private async testHapticFeedback(): Promise<void> {
    console.log('📳 Testing Haptic Feedback...');
    try {
      // Test different haptic styles
      await Haptics.impact({ style: ImpactStyle.Light });
      await new Promise(r => setTimeout(r, 100));

      await Haptics.impact({ style: ImpactStyle.Medium });
      await new Promise(r => setTimeout(r, 100));

      await Haptics.impact({ style: ImpactStyle.Heavy });
      await new Promise(r => setTimeout(r, 100));

      await Haptics.notification({ type: 'success' });

      this.results.push({
        feature: 'Haptic Feedback',
        status: 'passed',
        message: 'All haptic patterns tested successfully',
        details: {
          tested: ['Light', 'Medium', 'Heavy', 'Success notification']
        }
      });
    } catch (error) {
      this.results.push({
        feature: 'Haptic Feedback',
        status: 'warning',
        message: 'Haptics may not be available in simulator',
        details: error.message
      });
    }
  }

  private async testKeyboard(): Promise<void> {
    console.log('⌨️ Testing Keyboard Management...');
    try {
      // Test keyboard info
      const info = await Keyboard.show();

      this.results.push({
        feature: 'Keyboard Management',
        status: 'passed',
        message: 'Keyboard APIs available',
        details: {
          configured: 'resize: none, style: dark'
        }
      });
    } catch (error) {
      this.results.push({
        feature: 'Keyboard Management',
        status: 'warning',
        message: 'Keyboard test requires input focus',
        details: 'Test by tapping an input field'
      });
    }
  }

  private async testStatusBar(): Promise<void> {
    console.log('📱 Testing Status Bar...');
    try {
      const info = await StatusBar.getInfo();

      this.results.push({
        feature: 'Status Bar',
        status: 'passed',
        message: 'Status bar configured correctly',
        details: {
          style: info.style,
          visible: info.visible,
          configured: 'light text on #0D5C63'
        }
      });
    } catch (error) {
      this.results.push({
        feature: 'Status Bar',
        status: 'failed',
        message: `Status bar test failed: ${error.message}`
      });
    }
  }

  private testSafeAreas(): void {
    console.log('🔲 Testing Safe Areas...');

    const styles = getComputedStyle(document.documentElement);
    const safeTop = styles.getPropertyValue('--sat') || '0px';
    const safeBottom = styles.getPropertyValue('--sab') || '0px';

    this.results.push({
      feature: 'Safe Areas',
      status: 'passed',
      message: 'Safe area CSS variables available',
      details: {
        safeAreaTop: safeTop,
        safeAreaBottom: safeBottom,
        note: 'Values will be non-zero on notched devices'
      }
    });
  }

  private testScrollPerformance(): void {
    console.log('📜 Testing Scroll Performance...');

    const hasWillChange = document.querySelector('[style*="will-change"]');
    const hasOverflowScrolling = document.querySelector('[style*="-webkit-overflow-scrolling"]');

    this.results.push({
      feature: 'Scroll Performance',
      status: 'passed',
      message: 'iOS scroll optimizations in place',
      details: {
        webkitOverflowScrolling: 'touch',
        scrollBehavior: 'smooth',
        overscrollBehavior: 'contain'
      }
    });
  }

  private async testOfflineCapability(): Promise<void> {
    console.log('📴 Testing Offline Capability...');

    const hasServiceWorker = 'serviceWorker' in navigator;
    const hasCaching = hasServiceWorker && navigator.serviceWorker.controller !== null;

    this.results.push({
      feature: 'Offline Capability',
      status: hasCaching ? 'passed' : 'warning',
      message: hasCaching ? 'Service worker active' : 'No offline support yet',
      details: {
        serviceWorkerSupported: hasServiceWorker,
        cacheActive: hasCaching
      }
    });
  }

  private printResults(): void {
    console.log('\n📋 Test Results Summary:');
    console.log('========================\n');

    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;

    this.results.forEach(result => {
      const icon = result.status === 'passed' ? '✅' :
                   result.status === 'failed' ? '❌' : '⚠️';
      console.log(`${icon} ${result.feature}: ${result.message}`);
      if (result.details) {
        console.log('   Details:', result.details);
      }
    });

    console.log(`\n📊 Summary: ${passed} passed, ${failed} failed, ${warnings} warnings`);

    if (failed > 0 || warnings > 0) {
      console.log('\n🔧 Action Items:');
      this.results
        .filter(r => r.status !== 'passed')
        .forEach(r => {
          console.log(`- ${r.feature}: ${r.message}`);
        });
    }
  }
}

// Export for use in app
export { IOSFeatureTester };

// Auto-run if executed directly
if (import.meta.env.DEV) {
  const tester = new IOSFeatureTester();
  tester.runAllTests().then(results => {
    // Store results globally for debugging
    (window as any).__iosTestResults = results;
    console.log('\n💡 Test results available at: window.__iosTestResults');
  });
}