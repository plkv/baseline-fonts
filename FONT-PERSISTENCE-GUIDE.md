# Font Persistence Deployment Guide

## 🚨 CRITICAL: Fonts Disappearing on Deploy

**Problem**: Every deployment removes uploaded fonts because persistent storage is not configured.

**Solution**: Configure Vercel Blob + KV storage for permanent font persistence.

---

## ⚡ Quick Setup (5 minutes)

### Step 1: Create Storage Resources
1. Go to https://vercel.com/dashboard
2. Select your `baseline-fonts` project
3. Click "Storage" tab
4. Create **KV Database** (for font metadata)
5. Create **Blob Store** (for font files)

### Step 2: Copy Environment Variables
After creating storage resources, copy these variables:

```bash
# From KV Database
KV_REST_API_URL=https://your-kv-store.kv.vercel-storage.com
KV_REST_API_TOKEN=your_kv_token_here

# From Blob Store  
BLOB_READ_WRITE_TOKEN=your_blob_token_here
```

### Step 3: Add to Project Settings
1. Go to Project Settings > Environment Variables
2. Add all three variables above
3. Set them for **Production**, **Preview**, and **Development**

### Step 4: Redeploy
1. Push any change to trigger deployment
2. Visit `/api/fonts/storage-status` to verify setup
3. Test font upload - it should now persist!

---

## 🔍 Verification

### Check Storage Status
Visit your deployed app: `/api/fonts/storage-status`

**✅ Properly Configured:**
```json
{
  "type": "Vercel Cloud (Persistent)",
  "hasVercelBlob": true,
  "hasVercelKV": true,
  "recommendations": [
    "✅ Storage is properly configured for production",
    "🎉 Fonts will persist across deployments"
  ]
}
```

**❌ Not Configured:**
```json
{
  "type": "Memory Only (TEMPORARY - WILL LOSE DATA)",
  "hasVercelBlob": false,
  "hasVercelKV": false,
  "recommendations": [
    "⚠️ URGENT: Configure Vercel Blob and KV storage"
  ]
}
```

### Test Font Persistence
1. Upload a font through admin panel
2. Deploy a change (any change)
3. Check if font still exists after deployment
4. ✅ Success: Font persists across deploys

---

## 🏗️ How Storage Works

### Without Vercel Storage (Current Problem)
```
Upload Font → Local Memory → Deploy → 💥 LOST
```

### With Vercel Storage (Solution)
```
Upload Font → Vercel Blob (Files) + Vercel KV (Metadata) → Deploy → ✅ PERSISTS
```

### Storage Architecture
- **Font Files**: Stored in Vercel Blob with public URLs
- **Metadata**: Stored in Vercel KV (JSON database)
- **Admin Panel**: Manages both transparently
- **Fallback**: Local storage for development

---

## 🧪 Development vs Production

### Development (Local)
- Files: `public/fonts/` directory
- Metadata: `public/fonts/fonts-data.json`
- Persistence: ✅ Across server restarts

### Production (Without Storage)
- Files: Memory only
- Metadata: Memory only  
- Persistence: ❌ Lost on deploy

### Production (With Storage)
- Files: Vercel Blob (permanent URLs)
- Metadata: Vercel KV (cloud database)
- Persistence: ✅ Permanent across deploys

---

## 🔧 Troubleshooting

### "Memory Only" in Production
**Problem**: Storage status shows "Memory Only"
**Solution**: Environment variables not set correctly

1. Double-check variable names (case-sensitive)
2. Ensure variables are set for Production environment  
3. Redeploy after adding variables

### Fonts Upload but Disappear
**Problem**: Uploads work but fonts gone after deploy
**Solution**: Blob storage not configured

1. Verify `BLOB_READ_WRITE_TOKEN` is set
2. Check Blob store exists in Vercel dashboard
3. Test with `/api/fonts/storage-status`

### Can't Edit Font Metadata
**Problem**: Edits don't persist
**Solution**: KV storage not configured

1. Verify `KV_REST_API_URL` and `KV_REST_API_TOKEN`
2. Check KV database exists in dashboard
3. Restart deployment

---

## 📊 Cost Estimate

### Vercel Storage Pricing (Free Tier)
- **KV**: 30,000 requests/month FREE
- **Blob**: 5GB storage + 100GB bandwidth/month FREE

### Typical Usage
- **Small catalog** (50 fonts): ~500MB storage
- **Large catalog** (500 fonts): ~5GB storage  
- **API calls**: ~1000 requests/month

**Result**: Most projects stay within free tier limits.

---

## 🎯 Quick Commands

```bash
# Check current storage status
curl https://your-app.vercel.app/api/fonts/storage-status

# Test setup script locally
node scripts/setup-vercel-storage.js

# Upload test font
curl -X POST "https://your-app.vercel.app/api/fonts/upload" \
  -F "file=@font.otf"
```

---

## ✅ Success Checklist

- [ ] Created Vercel KV Database
- [ ] Created Vercel Blob Store  
- [ ] Added 3 environment variables
- [ ] Redeployed project
- [ ] Storage status shows "Persistent"
- [ ] Uploaded test font
- [ ] Font survives deployment
- [ ] Admin panel manages fonts properly

**Once complete**: All fonts uploaded through admin panel will persist permanently across deployments! 🎉