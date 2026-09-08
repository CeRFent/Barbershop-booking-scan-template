#!/usr/bin/env node

/**
 * Favicon Generation Script
 * 
 * This script helps generate proper favicon files for this site.
 *
 * To use this script:
 * 1. Install sharp: npm install sharp
 * 2. Run: node scripts/generate-favicon.js
 *
 * Or manually replace the favicon files:
 * 1. Convert your logo to these sizes:
 *    - favicon.ico (16x16, 32x32, 48x48)
 *    - apple-touch-icon.png (180x180)
 *    - favicon-16x16.png
 *    - favicon-32x32.png
 *    - favicon-192x192.png (for PWA)
 *    - favicon-512x512.png (for PWA)
 */

const fs = require('fs');
const path = require('path');

console.log('🎨 Favicon Generator');
console.log('================================');

console.log('\n📋 Required favicon files:');
console.log('├── favicon.ico (16x16, 32x32, 48x48)');
console.log('├── favicon.svg (32x32) ✅ Created');
console.log('├── favicon-96x96.png (96x96)');
console.log('├── apple-touch-icon.png (180x180)');
console.log('├── android-chrome-192x192.png (192x192)');
console.log('├── android-chrome-512x512.png (512x512)');
console.log('└── site.webmanifest ✅ Created');

console.log('\n📝 Instructions:');
console.log('1. Take your Q logo image');
console.log('2. Create the above files with the specified sizes');
console.log('3. Place them in the /public folder');
console.log('4. The favicon.svg has been created as a placeholder');

console.log('\n🎯 Current favicon setup:');
console.log('✅ favicon.svg - Created with elegant Q design');
console.log('✅ layout.tsx - Updated to use new favicon configuration');
console.log('✅ site.webmanifest - Created for PWA support');
console.log('⏳ favicon.ico - Needs to be replaced with your Q logo');
console.log('⏳ favicon-96x96.png - Needs to be replaced with your Q logo');
console.log('⏳ apple-touch-icon.png - Needs to be replaced with your Q logo');
console.log('⏳ android-chrome-192x192.png - Needs to be replaced with your Q logo');
console.log('⏳ android-chrome-512x512.png - Needs to be replaced with your Q logo');

console.log('\n💡 Tips:');
console.log('- Use a tool like https://realfavicongenerator.net/');
console.log('- Or use online converters to create .ico files');
console.log('- Make sure your Q logo has good contrast on black background');
console.log('- Test the favicon in different browsers');

console.log('\n🚀 Next steps:');
console.log('1. Replace favicon.ico with your Q logo');
console.log('2. Replace apple-touch-icon.png with your Q logo');
console.log('3. Test the favicon in your browser');
console.log('4. Deploy to see the new favicon live!');
