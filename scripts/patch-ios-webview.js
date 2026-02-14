#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the iOS ViewController
const viewControllerPath = path.join(__dirname, '../ios/App/App/CAPBridgeViewController.swift');

// Check if we need to run the script
if (!fs.existsSync(viewControllerPath)) {
  console.log('iOS project not found. Run this after "npx cap add ios"');
  process.exit(0);
}

// Read the current file
let content = fs.readFileSync(viewControllerPath, 'utf8');

// Check if already patched
if (content.includes('// PATCH: Dynamic background color')) {
  console.log('WebView already patched for dynamic background color');
  process.exit(0);
}

// Find the viewDidLoad method and add our patch
const viewDidLoadRegex = /override func viewDidLoad\(\) {[\s\S]*?super\.viewDidLoad\(\)/;
const match = content.match(viewDidLoadRegex);

if (match) {
  const patchCode = `
        // PATCH: Dynamic background color for overscroll
        if let webView = self.webView {
            // Set initial background color
            webView.isOpaque = false
            webView.backgroundColor = UIColor(red: 245/255, green: 241/255, blue: 232/255, alpha: 1.0)
            webView.scrollView.backgroundColor = UIColor(red: 245/255, green: 241/255, blue: 232/255, alpha: 1.0)

            // Extend content to edges
            webView.scrollView.contentInsetAdjustmentBehavior = .never

            // Listen for theme changes
            NotificationCenter.default.addObserver(
                forName: Notification.Name("ThemeChanged"),
                object: nil,
                queue: .main
            ) { notification in
                if let isDarkMode = notification.userInfo?["isDarkMode"] as? Bool {
                    if isDarkMode {
                        // Dark mode colors
                        webView.backgroundColor = UIColor(red: 13/255, green: 18/255, blue: 20/255, alpha: 1.0)
                        webView.scrollView.backgroundColor = UIColor(red: 13/255, green: 18/255, blue: 20/255, alpha: 1.0)
                    } else {
                        // Light mode colors
                        webView.backgroundColor = UIColor(red: 245/255, green: 241/255, blue: 232/255, alpha: 1.0)
                        webView.scrollView.backgroundColor = UIColor(red: 245/255, green: 241/255, blue: 232/255, alpha: 1.0)
                    }
                }
            }
        }`;

  const replacement = match[0] + patchCode;
  content = content.replace(viewDidLoadRegex, replacement);

  // Write the patched file
  fs.writeFileSync(viewControllerPath, content);
  console.log('✓ Patched iOS WebView for dynamic background color');
} else {
  console.error('Could not find viewDidLoad method to patch');
  process.exit(1);
}