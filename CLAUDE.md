# Claude Code Memory File - Baseline Font Catalog

## Project Overview
- **Project Name**: Baseline Font Catalog
- **Repository**: https://github.com/plkv/baseline-fonts.git  
- **Current Version**: 0.066 (catalog branch)
- **Status**: ✅ Working with new catalog UI
- **IMPORTANT**: Local development is not priority - only Vercel deployment matters!

## Project Structure
```
/Users/plkv/Desktop/claude/baseline/baseline/
├── app/
│   ├── page.tsx (main font catalog interface)
│   ├── admin/ (admin panel for font management)
│   └── api/
│       └── fonts/ (font API endpoints)
├── components/
│   └── ui/ (UI components including card.tsx)
├── lib/
│   ├── font-parser.ts (font parsing logic)
│   └── font-storage.ts (font database management)
├── public/fonts/ (uploaded font files)
├── package.json
├── vercel.json (deployment config)
└── CLAUDE.md (this file)
```

## Recent Major Fixes Applied
1. **Next.js 15 Compatibility** - Updated route handlers to use async params
2. **TypeScript Errors** - Fixed all implicit 'any' type errors throughout codebase
3. **Missing UI Components** - Added card.tsx component
4. **OpenType.js Integration** - Fixed font parsing and type issues
5. **Git Repository** - Corrected remote to baseline-fonts.git
6. **Phase 1 Critical Fixes** - Removed hardcoded fonts array, improved font loading
7. **User Experience** - Added proper empty state handling when no fonts uploaded
8. **Dependencies** - Added missing @vercel/blob and @vercel/kv packages

## Version Management System
- **Always update version on every push**
- Update 2 locations:
  1. `package.json` - "version" field
  2. `app/page.tsx` - version display in header (line ~763)
  3. `vercel.json` - NEXT_PUBLIC_VERSION env var
- Current version pattern: 0.0XX (increment last digits)

## Deployment Process
1. Update version in all 3 files
2. `git add .`
3. `git commit -m "descriptive message"`
4. `git push origin main`
5. Vercel auto-deploys from GitHub pushes

## Key Technical Details

### Font Management
- Fonts stored in `/public/fonts/uploads/`
- Font metadata stored in JSON database
- Dynamic CSS generation for uploaded fonts
- OpenType.js used for font parsing

### API Endpoints
- `/api/fonts/list` - Get all fonts
- `/api/fonts/upload` - Upload new fonts
- `/api/fonts/[id]` - Get/delete specific font
- `/api/fonts/css` - Generate font CSS

### Development Commands
```bash
npm run dev     # Start development server
npm run build   # Build for production
npm run start   # Start production server
```

### Environment
- Working directory: `/Users/plkv/Desktop/claude/baseline/baseline/`
- Platform: macOS (Darwin 24.5.0)
- Node.js project with Next.js 15.2.4
- Uses TypeScript, Tailwind CSS, Radix UI components

## Current Status
- ✅ Project builds successfully without errors
- ✅ All TypeScript issues resolved
- ✅ Git repository pointing to correct URL
- ✅ Version synced across all files (0.026)
- ✅ Latest commit pushed to main branch
- ✅ Vercel deployment triggered

## Known Working Features
- Font catalog with search/filter functionality
- Font upload and management system
- Variable font axis controls
- OpenType feature toggles
- Theme switching (light/dark/color themes)
- Responsive design for mobile/desktop

## Dependencies Installed
- @types/opentype.js (for TypeScript support)
- All Radix UI components for interface
- OpenType.js for font parsing
- Vercel CLI for deployment
- @vercel/blob (for persistent file storage)
- @vercel/kv (for metadata storage)

## Commit Message Format
Always use this format for consistency:
```
Brief description of changes

- Detailed bullet points of what changed
- Any technical improvements made
- Version updates included

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Important Notes
- Always run `npm run build` to verify no TypeScript errors before pushing
- Font uploads are handled via API with proper validation
- CSS is dynamically generated for uploaded fonts
- Admin interface available at `/admin` route
- Project uses comprehensive error handling and logging

## Next Steps Checklist
If continuing development:
1. [ ] Verify latest version number
2. [ ] Check if build passes: `npm run build`
3. [ ] Update version before any new push
4. [ ] Test font upload functionality
5. [ ] Ensure Vercel deployment is working

Last updated: 2025-09-04

## Phase 1 Critical Fixes Completed
✅ **All Phase 1 objectives achieved:**
1. ✅ Removed hardcoded fonts array from main page (app/page.tsx lines 16-107)
2. ✅ Fixed font loading to use only uploaded fonts via API call
3. ✅ Added proper error handling for font loading failures with fallback states
4. ✅ Improved user feedback when no fonts uploaded (empty state with admin link)
5. ✅ Tested complete user flow - API returns fonts correctly, build succeeds
6. ✅ Updated version to 0.024 across all files
7. ✅ Added missing Vercel dependencies (@vercel/blob, @vercel/kv)

## Admin Functionality Testing Results

### ✅ Working Functions:
1. **Font Upload** - Comprehensive metadata extraction (19 OpenType features)
2. **Font Parsing** - Extracts weight, style, languages, foundry, features
3. **Font Editing** - Successfully updates all metadata fields
4. **Font Removal** - Properly deletes files and metadata
5. **Publishing/Unpublishing** - NEW: Complete publish status control
   - Public API filters unpublished fonts
   - Admin API shows all fonts with `?includeUnpublished=true`

### ❌ Critical Issues Identified:

#### 1. Deployment Font Persistence (CRITICAL)
- **Problem**: Every deploy removes uploaded fonts
- **Cause**: Missing Vercel Blob/KV environment variables
- **Impact**: Production unusable - fonts disappear on deployment
- **Solution**: Configure BLOB_READ_WRITE_TOKEN, KV_REST_API_URL, KV_REST_API_TOKEN

#### 2. Path Mismatch (FIXED)
- **Problem**: Inconsistent font paths in storage system
- **Fix Applied**: Updated to use consistent `/fonts/filename.otf` paths

**Technical Implementation:**
- Font loading now exclusively uses `loadUploadedFonts()` function
- Enhanced empty state differentiation: "no fonts uploaded" vs "filtered results"
- API endpoint `/api/fonts/list` verified working
- Build process clean with no TypeScript errors
- All error states properly handled with user-friendly feedback
- Publishing system filters public vs admin views
- Added `/api/fonts/publish` endpoint for status control

## FONT PERSISTENCE SOLUTION IMPLEMENTED

### ✅ **Font Persistence Guaranteed**
The critical deployment issue has been solved with a comprehensive persistent storage system:

#### New Persistent Storage Manager (`lib/persistent-storage.ts`)
- **Development**: Fonts stored in `/public/fonts/` + `fonts-data.json` 
- **Production (with Vercel Storage)**: Fonts stored in Vercel Blob + KV
- **Production (without Vercel Storage)**: Memory only + warnings

#### Smart Storage Detection
- Automatically detects environment and available storage
- Provides clear warnings when storage is misconfigured
- Falls back gracefully with explicit storage type logging

#### Deployment Setup Required
**URGENT**: Configure Vercel storage to prevent font loss:

1. Go to https://vercel.com/dashboard → baseline-fonts project → Storage
2. Create KV Database + Blob Store  
3. Add environment variables:
   - `BLOB_READ_WRITE_TOKEN`
   - `KV_REST_API_URL` 
   - `KV_REST_API_TOKEN`
4. Redeploy project

#### Verification Endpoints
- `/api/fonts/storage-status` - Check storage configuration
- Storage logs show type: "Vercel Cloud (Persistent)" vs "Memory Only"

#### Comprehensive Documentation
- `FONT-PERSISTENCE-GUIDE.md` - Complete setup instructions
- `scripts/setup-vercel-storage.js` - Automated configuration checker
- `DEPLOYMENT-SETUP.md` - Technical deployment details

**Result**: Once configured, all fonts uploaded through admin panel will persist permanently across all deployments! 🎉

## 🎉 CATALOG BRANCH - NEW UI INTEGRATED (2025-09-07)

### Major Achievement: Beautiful Catalog UI from v0.app

Successfully integrated the sophisticated catalog interface from https://github.com/plkv/typedump-front-v0 with the existing admin functionality!

### What's New in Catalog Branch:

**✅ New Catalog Interface:**
- Beautiful, professional font catalog UI created with v0.app
- Preserved exact design system, colors, and typography from v0 frontend
- Dynamic font loading from existing API endpoints
- Advanced font preview with real-time editing
- Sophisticated filtering and sorting capabilities
- Variable font axis controls and OpenType feature toggles

**✅ Seamless Admin Integration:**  
- Admin link in catalog navigation (`/admin-simple`)
- Fonts uploaded via admin appear automatically in catalog
- Complete preservation of existing admin functionality
- Both interfaces share the same backend and storage

**✅ Advanced Features:**
- Text presets (Names, Key Glyphs, Basic, Paragraph, Brands)  
- Display mode selection (Text, Display, Weirdo)
- Font category filtering (Sans, Serif, Display, Mono, etc.)
- Dynamic font weight and italic selection
- Real-time text size and line height adjustment
- Expandable font cards with OpenType controls
- Responsive design with collapsible sidebar

### Technical Implementation:

**Backend Integration:**
- Connects to existing `/api/fonts/list-v2` endpoint
- Transforms font data to catalog UI format
- Dynamic CSS injection for uploaded fonts
- Preserves all metadata from font parser

**Design System Preserved:**  
- Copied `globals.css`, `layout.tsx` from v0 frontend
- Maintained exact color scheme and typography
- Preserved Material Symbols icons and styling
- Kept all UI components and interactions

### Branch Structure:
- **catalog branch**: ✅ New catalog UI + existing admin (CURRENT)
- **main branch**: ✅ Advanced admin functionality (commit 73fb580)  
- **admin branch**: Simple admin interface

### URLs:
- **Catalog**: http://localhost:3000 (Beautiful font browsing)
- **Admin**: http://localhost:3000/admin-simple (Font management)
- **Full Admin**: http://localhost:3000/admin (Advanced management)

### Development Status:
- ✅ Build passes successfully 
- ✅ Development server running
- ✅ API integration working
- ✅ Font loading and preview working
- ✅ Admin functionality preserved
- ✅ Design system intact

### ⚠️ IMPORTANT PROJECT RULE:
**Local development is NOT priority - only Vercel deployment matters!**
- Focus on production deployment functionality
- Local compilation/development issues are secondary
- Vercel-specific features and environment take precedence