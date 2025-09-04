# Deployment Setup Guide

## Critical Issue: Font Persistence on Deployment

**Problem:** Every deploy removes previously uploaded font files because Vercel storage is not properly configured.

**Root Cause:** Missing environment variables for Vercel Blob and KV storage.

## Solution: Configure Vercel Storage

### Step 1: Enable Vercel KV Database
1. Go to your Vercel project dashboard: https://vercel.com/dashboard
2. Select the `baseline-fonts` project
3. Go to Storage tab
4. Create a new KV Database
5. Copy the following environment variables:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`

### Step 2: Enable Vercel Blob Storage
1. In the same Storage tab
2. Create a new Blob Store
3. Copy the following environment variables:
   - `BLOB_READ_WRITE_TOKEN`

### Step 3: Add Environment Variables
1. Go to project Settings > Environment Variables
2. Add all the variables from steps 1 and 2
3. Ensure they're available for all environments (Production, Preview, Development)

### Step 4: Redeploy
1. Push any change to trigger a new deployment
2. Verify that font uploads now persist between deployments

## Current Storage Behavior

### Development (Local)
- ✅ Fonts stored in `/public/fonts/` directory
- ✅ Metadata stored in `/public/fonts/fonts-data.json`
- ✅ Persistence across server restarts

### Production (Without Vercel Storage)
- ❌ Fonts stored in memory only
- ❌ Lost on every deployment
- ❌ No persistence

### Production (With Vercel Storage)
- ✅ Font files stored in Vercel Blob
- ✅ Metadata stored in Vercel KV
- ✅ Full persistence across deployments

## Migration Process

If you have fonts that need to be migrated from local storage to Vercel storage:

1. Configure Vercel storage (steps above)
2. Visit `/api/fonts/migrate` endpoint to migrate existing fonts
3. Verify fonts appear in your Vercel dashboard under Storage

## Environment Variables Required

```bash
# Vercel KV (for font metadata)
KV_REST_API_URL=https://your-kv-store-url.kv.vercel-storage.com
KV_REST_API_TOKEN=your_kv_token

# Vercel Blob (for font files)
BLOB_READ_WRITE_TOKEN=your_blob_token
```

## Testing Storage Configuration

You can test if storage is properly configured by checking the upload logs:

- ❌ "Using local file storage" = Vercel storage not configured
- ✅ "Using Vercel Blob storage" = Properly configured

## API Endpoints

- `POST /api/fonts/upload` - Upload fonts (uses configured storage)
- `GET /api/fonts/list` - List fonts (public, published only)
- `GET /api/fonts/list?includeUnpublished=true` - Admin view with all fonts
- `PATCH /api/fonts/update` - Update font metadata
- `PATCH /api/fonts/publish` - Publish/unpublish fonts
- `DELETE /api/fonts/delete` - Delete fonts
- `POST /api/fonts/migrate` - Migrate local fonts to Vercel storage