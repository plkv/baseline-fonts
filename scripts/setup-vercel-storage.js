#!/usr/bin/env node

/**
 * Vercel Storage Setup Script
 * 
 * This script helps configure Vercel Blob and KV storage for persistent font storage.
 * Run this after setting up storage in your Vercel dashboard.
 */

const fs = require('fs').promises;
const path = require('path');

async function setupVercelStorage() {
  console.log('🔧 Setting up Vercel storage for persistent font storage...\n');

  // Check current environment
  const hasBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
  const hasKV = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;

  console.log('📋 Current environment:');
  console.log(`   BLOB_READ_WRITE_TOKEN: ${hasBlob ? '✅ Set' : '❌ Missing'}`);
  console.log(`   KV_REST_API_URL: ${!!process.env.KV_REST_API_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`   KV_REST_API_TOKEN: ${!!process.env.KV_REST_API_TOKEN ? '✅ Set' : '❌ Missing'}\n`);

  if (!hasBlob || !hasKV) {
    console.log('⚠️  Storage not configured. Follow these steps:\n');
    
    console.log('1. 🌐 Go to https://vercel.com/dashboard');
    console.log('2. 📂 Select your "baseline-fonts" project');
    console.log('3. 🗄️  Go to Storage tab');
    console.log('4. ➕ Create a new KV Database');
    console.log('5. ➕ Create a new Blob Store');
    console.log('6. 🔧 Copy the environment variables to your project settings');
    console.log('7. 🚀 Redeploy your project\n');
    
    console.log('📝 Required environment variables:');
    console.log('   - BLOB_READ_WRITE_TOKEN');
    console.log('   - KV_REST_API_URL');
    console.log('   - KV_REST_API_TOKEN\n');
    
    process.exit(1);
  }

  console.log('✅ Vercel storage is properly configured!');
  
  // Test the storage
  try {
    console.log('🧪 Testing storage connection...');
    
    const { put } = await import('@vercel/blob');
    const { kv } = await import('@vercel/kv');
    
    // Test blob storage
    const testBlob = await put('test/test.txt', 'Hello Vercel Blob', {
      access: 'public'
    });
    console.log('✅ Blob storage working:', testBlob.url);
    
    // Test KV storage
    await kv.set('test:key', 'Hello Vercel KV');
    const testValue = await kv.get('test:key');
    console.log('✅ KV storage working:', testValue);
    
    // Cleanup test data
    await kv.del('test:key');
    
    console.log('\n🎉 Storage setup complete! Fonts will now persist across deployments.');
    
  } catch (error) {
    console.error('❌ Storage test failed:', error.message);
    console.log('\n🔍 Troubleshooting:');
    console.log('   - Verify environment variables are set correctly');
    console.log('   - Check that storage resources exist in Vercel dashboard');
    console.log('   - Ensure @vercel/blob and @vercel/kv packages are installed');
  }
}

if (require.main === module) {
  setupVercelStorage().catch(console.error);
}

module.exports = { setupVercelStorage };