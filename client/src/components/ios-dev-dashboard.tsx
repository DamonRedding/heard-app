import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { IOSFeatureTester } from '../../../test-ios-features';
import { useHaptic } from './ios-optimizations';

interface TestResult {
  feature: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
}

export function IOSDevDashboard() {
  const [isVisible, setIsVisible] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const haptic = useHaptic();

  // Toggle dashboard with keyboard shortcut
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Cmd+Shift+D to toggle dashboard
      if (e.metaKey && e.shiftKey && e.key === 'D') {
        setIsVisible(prev => !prev);
        haptic.light();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [haptic]);

  // Check API status on mount
  useEffect(() => {
    checkAPIConnection();
  }, []);

  const checkAPIConnection = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://churchheard.com';
      const response = await fetch(`${apiUrl}/api/submissions?limit=1`);
      setApiStatus(response.ok ? 'connected' : 'error');
    } catch (error) {
      setApiStatus('error');
    }
  };

  const runTests = async () => {
    setIsTestRunning(true);
    haptic.medium();

    const tester = new IOSFeatureTester();
    const results = await tester.runAllTests();
    setTestResults(results);

    setIsTestRunning(false);
    haptic.success();
  };

  const testHaptic = async (type: string) => {
    switch (type) {
      case 'light':
        await haptic.light();
        break;
      case 'medium':
        await haptic.medium();
        break;
      case 'heavy':
        await haptic.heavy();
        break;
      case 'success':
        await haptic.success();
        break;
      case 'warning':
        await haptic.warning();
        break;
      case 'error':
        await haptic.error();
        break;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return '✅';
      case 'failed':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return '⏳';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'passed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'warning':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (!isVisible) {
    // Floating button to open dashboard
    return (
      <div
        className="fixed bottom-20 right-4 z-50 opacity-30 hover:opacity-100 transition-opacity"
        onClick={() => {
          setIsVisible(true);
          haptic.light();
        }}
      >
        <Button size="sm" variant="outline">
          📱 iOS Dev
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 overflow-y-auto">
      <div className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Header */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-2xl">iOS Development Dashboard</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsVisible(false);
                  haptic.light();
                }}
              >
                ✕
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <span>API Status:</span>
                  <Badge variant={apiStatus === 'connected' ? 'default' : 'destructive'}>
                    {apiStatus === 'checking' && '⏳ Checking...'}
                    {apiStatus === 'connected' && '✅ Connected'}
                    {apiStatus === 'error' && '❌ Disconnected'}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <span>Environment:</span>
                  <Badge variant="outline">
                    {import.meta.env.MODE}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <span>API URL:</span>
                  <Badge variant="secondary" className="text-xs">
                    {import.meta.env.VITE_API_URL || 'https://churchheard.com'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button
                  onClick={runTests}
                  disabled={isTestRunning}
                  variant="default"
                >
                  {isTestRunning ? '⏳ Running...' : '🧪 Run All Tests'}
                </Button>
                <Button
                  onClick={() => checkAPIConnection()}
                  variant="outline"
                >
                  🔄 Check API
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                >
                  🔃 Reload App
                </Button>
                <Button
                  onClick={() => console.log('App State:', window)}
                  variant="outline"
                >
                  📊 Log State
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Haptic Testing */}
          <Card>
            <CardHeader>
              <CardTitle>Haptic Feedback Testing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                <Button size="sm" onClick={() => testHaptic('light')}>
                  Light
                </Button>
                <Button size="sm" onClick={() => testHaptic('medium')}>
                  Medium
                </Button>
                <Button size="sm" onClick={() => testHaptic('heavy')}>
                  Heavy
                </Button>
                <Button size="sm" onClick={() => testHaptic('success')}>
                  Success
                </Button>
                <Button size="sm" onClick={() => testHaptic('warning')}>
                  Warning
                </Button>
                <Button size="sm" onClick={() => testHaptic('error')}>
                  Error
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Test Results */}
          {testResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {testResults.map((result, index) => (
                    <Alert key={index} variant={result.status === 'failed' ? 'destructive' : 'default'}>
                      <AlertTitle className="flex items-center justify-between">
                        <span>
                          {getStatusIcon(result.status)} {result.feature}
                        </span>
                        <Badge variant={getStatusBadgeVariant(result.status)}>
                          {result.status}
                        </Badge>
                      </AlertTitle>
                      <AlertDescription>
                        {result.message}
                        {result.details && (
                          <pre className="mt-2 text-xs overflow-x-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        )}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>

                {/* Summary */}
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Summary</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      ✅ Passed: {testResults.filter(r => r.status === 'passed').length}
                    </div>
                    <div>
                      ⚠️ Warnings: {testResults.filter(r => r.status === 'warning').length}
                    </div>
                    <div>
                      ❌ Failed: {testResults.filter(r => r.status === 'failed').length}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Device Info */}
          <Card>
            <CardHeader>
              <CardTitle>Device Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>User Agent:</strong>
                  <p className="text-xs text-muted-foreground break-all">
                    {navigator.userAgent}
                  </p>
                </div>
                <div>
                  <strong>Screen:</strong>
                  <p className="text-muted-foreground">
                    {window.screen.width} x {window.screen.height} ({window.devicePixelRatio}x)
                  </p>
                </div>
                <div>
                  <strong>Viewport:</strong>
                  <p className="text-muted-foreground">
                    {window.innerWidth} x {window.innerHeight}
                  </p>
                </div>
                <div>
                  <strong>Safe Areas:</strong>
                  <p className="text-muted-foreground">
                    Top: {getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0px'}
                    , Bottom: {getComputedStyle(document.documentElement).getPropertyValue('--sab') || '0px'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CORS Warning */}
          {apiStatus === 'error' && (
            <Alert variant="destructive">
              <AlertTitle>⚠️ CORS Configuration Required</AlertTitle>
              <AlertDescription>
                <p>The API connection is failing, likely due to missing CORS headers.</p>
                <p className="mt-2">Add the CORS middleware to your production server:</p>
                <pre className="mt-2 p-2 bg-black/20 rounded text-xs overflow-x-auto">
                  {`import { corsMiddleware } from './cors-middleware';
app.use(corsMiddleware);`}
                </pre>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}