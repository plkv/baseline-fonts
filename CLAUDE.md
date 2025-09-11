# Claude Code Memory File - Baseline Font Catalog

## Project Overview
- **Project Name**: Baseline Font Catalog
- **Repository**: https://github.com/plkv/baseline-fonts.git  
- **Current Version**: 0.087 (main branch - production ready)
- **Status**: ✅ Production stable with all critical UI issues fixed
- **Live URL**: https://baseline-fonts.vercel.app

## 🎯 CORE PROJECT PRINCIPLES
1. **Production First**: Local development is NOT priority - only Vercel deployment matters!
2. **No Patches**: Focus on clean, simple, and effective solutions that fix root causes
3. **Preserve Working UI**: Always avoid breaking existing functionality when making fixes

## Project Structure
```
/Users/plkv/Desktop/claude/typedump/baseline-fonts/
├── app/
│   ├── page.tsx (main font catalog interface - v0.app design)
│   ├── admin/ (admin panels for font management)
│   └── api/
│       ├── fonts-clean/ (clean font API endpoints)
│       └── fonts/ (legacy font API endpoints)
├── components/ui/ (Radix UI components)
├── lib/
│   ├── font-parser.ts (OpenType.js font parsing)
│   └── font-storage-clean.ts (Vercel Blob + KV storage)
├── package.json
├── vercel.json (deployment + env config)
└── CLAUDE.md (this file)
```

## Current Status: ✅ PRODUCTION STABLE

### Latest Achievement: All Critical UI Issues Fixed (v0.087)
**Deployed**: 2025-09-09 - Fixed 9 critical UI issues reported by user

1. **✅ Language support filters** - Added Latin fallback for fonts without language data
2. **✅ Text presets rendering** - Fixed CSS variable artifacts polluting Key Glyphs/Basic presets 
3. **✅ Appearance tags** - Added category-based fallbacks when styleTags missing
4. **✅ Text Size slider** - Corrected range from 50-200px to 12-200px
5. **✅ Line height slider** - Corrected range from 80-200% to 90-160%
6. **✅ Variable axis interaction** - Fixed dropdown sync after weight axis slider changes
7. **✅ Download button logic** - Only shows when admin sets download link (not blob URLs)
8. **✅ Text editing cursor** - Enhanced preservation to prevent jumping to start
9. **✅ Stylistic alternates** - Enhanced detection from multiple OpenType feature sources

### Mobile Responsive (User-implemented)
**Commit c703b5b**: Mobile responsive improvements
- ✅ Dynamic sidebar hiding on mobile (<768px)
- ✅ Floating overlay for mobile sidebar interaction  
- ✅ Prevention of layout flash with proper SSR handling
- ✅ Resize event listeners for dynamic screen changes

## Version Management System
- **Always update version on every push**
- Update 3 locations:
  1. `package.json` - "version" field
  2. `vercel.json` - NEXT_PUBLIC_VERSION env var  
  3. Git tag (optional)
- Current version: **0.108**

## Deployment Process (PRODUCTION FOCUSED)
```bash
# 1. Update version
# Edit package.json and vercel.json

# 2. Commit and deploy
git add .
git commit -m "Descriptive message with bullet points"
git push origin main

# 3. Vercel auto-deploys from GitHub
# Monitor at https://vercel.com/dashboard
```

## API Architecture

### Font Storage System
- **Storage**: Vercel Blob (files) + Vercel KV (metadata)
- **Parser**: OpenType.js for comprehensive font analysis
- **API**: `/api/fonts-clean/` endpoints (primary)

### Key Endpoints
- `GET /api/fonts-clean/list` - Get all published fonts
- `POST /api/fonts-clean/upload` - Upload new fonts with parsing
- `PATCH /api/fonts-clean/update` - Update font metadata
- `DELETE /api/fonts-clean/delete` - Remove fonts and files

### Admin Interfaces
- `/admin-simple` - Simple font management
- `/admin` - Advanced font management with family merging

## Technical Stack
- **Framework**: Next.js 15.2.4 with TypeScript
- **UI**: Radix UI + Tailwind CSS + Material Symbols
- **Storage**: Vercel Blob + KV
- **Parsing**: OpenType.js 
- **Deployment**: Vercel with auto-deploy from GitHub

## Font Catalog Features

### Core Functionality ✅ Working
- Beautiful v0.app-designed catalog interface
- Dynamic font loading from Vercel storage
- Real-time font preview with contentEditable text
- Advanced filtering: categories, weights, languages, appearance tags
- Text presets: Names, Key Glyphs, Basic, Paragraph, Brands
- Collection modes: Text, Display, Weirdo
- Variable font axis controls with sliders
- OpenType feature toggles (stylistic alternates, ligatures, etc.)
- Mobile responsive with floating sidebar
- Theme switching (light/dark/color themes)

### Admin Features ✅ Working  
- Font upload with automatic metadata extraction
- Font family management and merging
- Style tag management and bulk operations
- Publishing/unpublishing control
- Download link management
- Font editing and deletion

## Known Working Integrations
- ✅ GitHub auto-deployment to Vercel
- ✅ Vercel Blob storage for font files
- ✅ Vercel KV for metadata storage  
- ✅ OpenType.js for font parsing
- ✅ Material Symbols icons
- ✅ Radix UI component library
- ✅ Tailwind CSS styling system

## Commit Message Format
```
Brief description of changes

- Detailed bullet points of what changed
- Technical improvements made
- Version bump noted

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Development Guidelines

### When Adding New Features:
1. **Check existing patterns** - Follow established code conventions
2. **Test in production context** - Focus on Vercel deployment behavior  
3. **Preserve working functionality** - Never break existing features
4. **Use clean solutions** - Avoid patches, fix root causes
5. **Update version** - Increment version number before pushing

### When Debugging Issues:
1. **Check production first** - Issues often only appear in Vercel environment
2. **Look for data consistency** - Font metadata might be incomplete
3. **Check API responses** - Verify data structure matches expectations
4. **Test responsive behavior** - Ensure mobile and desktop both work

### File Locations to Remember:
- Main catalog: `/app/page.tsx` (1445 lines)
- Font storage: `/lib/font-storage-clean.ts`  
- Font parsing: `/lib/font-parser.ts`
- Admin interfaces: `/app/admin/` directory
- API endpoints: `/app/api/fonts-clean/`

## Environment Details
- **Working Directory**: `/Users/plkv/Desktop/claude/typedump/baseline-fonts/`
- **Platform**: macOS (Darwin 24.5.0)
- **Node.js**: Latest LTS with Next.js 15.2.4
- **Deployment**: Vercel production environment

## Quick Start for New Sessions
```bash
# Navigate to project
cd /Users/plkv/Desktop/claude/typedump/baseline-fonts/

# Check current status  
git status
git log --oneline -5

# Verify production deployment
# Visit: https://baseline-fonts.vercel.app
```

## 🚀 ARCHITECTURAL REFACTOR PLAN - CTO SOLUTION

### Problem Analysis: Recurring Bug Pattern
The current system suffers from **3 fundamental architectural flaws** causing recurring bugs:

1. **Scattered State Management** - 20+ useState hooks with interdependent updates
2. **Inconsistent Data Models** - Multiple schemas for same font data across API/UI/Storage  
3. **DOM-Heavy React Patterns** - Direct DOM manipulation breaking React reconciliation

### Root Cause → Bug Mapping:
- **Cursor Reset** → Direct DOM manipulation in contentEditable
- **Language Support Empty** → Missing fallback in scattered state
- **Appearance Filters Broken** → Inconsistent styleTags data model
- **Text Preset Errors** → CSS injection during DOM manipulation
- **Missing Symbols False Positives** → Unreliable canvas measurement
- **Stylistic Alternates Missing** → Complex parsing from multiple sources
- **Family Connection Broken** → Flat storage without proper hierarchy

### Solution: Font Management System (FMS)

#### Phase 1: Foundation (Week 1)
```bash
# Install state management
npm install zustand

# Create unified data models
lib/models/FontFamily.ts    # Hierarchical family model
lib/models/FontVariant.ts   # Individual font variants
lib/font-store.ts          # Centralized Zustand store
```

#### Phase 2: Data Architecture (Week 2)  
```bash
# Hierarchical data model
lib/font-processor.ts      # Multi-stage validation pipeline
scripts/migrate-families.ts # Convert flat data to hierarchy
app/api/fonts-clean/families # New family-based endpoints
```

#### Phase 3: UI Refactor (Week 3)
```bash
# Replace useState patterns
components/ControlledTextPreview.tsx  # Controlled inputs
lib/symbol-detector.ts               # Unicode-aware detection
app/page.tsx                        # Connect to FontStore
```

#### Phase 4: Testing & Deploy (Week 4)
```bash
# Comprehensive testing
tests/font-store.test.ts
tests/font-processor.test.ts
# Performance optimization & migration validation
```

### Key Architectural Changes:

#### 1. Unified State Management
**Before**: 20+ useState hooks
**After**: Single FontStore with computed values
```typescript
interface FontStore {
  fonts: NormalizedFont[]
  families: FontFamily[]
  filters: FilterState
  
  // Computed (eliminates filter bugs)
  filteredFonts: () => NormalizedFont[]
  availableLanguages: () => string[]
  availableStyleTags: () => string[]
}
```

#### 2. Hierarchical Data Model
**Before**: Flat font storage with weak connections
**After**: True parent-child hierarchy with inheritance
```typescript
interface FontFamily {
  id: string
  name: string
  // Global settings inherited by all variants
  collection: 'Text' | 'Display' | 'Weirdo'
  styleTags: string[]
  languages: string[]
  fonts: FontVariant[]  // Children inherit these settings
}
```

#### 3. Controlled Input System
**Before**: Direct DOM manipulation causing cursor jump
**After**: Pure React with state-managed cursor position
```typescript
// No more DOM manipulation - cursor tracked in React state
const [textValue, setTextValue] = useState("")
const [cursorPosition, setCursorPosition] = useState(0)
```

#### 4. Robust Font Processing Pipeline
**Before**: Inconsistent metadata extraction
**After**: Multi-stage validation with fallbacks
```typescript
// Standardized processing eliminates missing data
validateFile → extractMetadata → parseFeatures → detectLanguages → validate
```

### Expected Outcomes:
- **🎯 Zero recurring bugs** - Issues prevented by design
- **📈 Maintainability** - Single source of truth for all data
- **⚡ Performance** - Computed values, no redundant processing
- **🛡️ Data Consistency** - Validation pipeline prevents corrupt entries
- **🔄 Family Sync** - Collection changes propagate automatically

### Migration Strategy:
- **Backward Compatible** - Existing fonts work during transition
- **Gradual Rollout** - Phase-by-phase implementation
- **Data Preservation** - No font data loss during migration
- **Production Focus** - Vercel deployment priority maintained

### 🎯 PHASE 1 COMPLETE: Foundation Architecture (v0.088)
**Completed**: 2025-09-09 - Core architectural foundation implemented

#### ✅ Phase 1 Deliverables:
1. **Zustand State Management** - Single source of truth replacing 20+ useState hooks
2. **Hierarchical Data Models** - FontFamily + FontVariant with proper inheritance  
3. **Centralized FontStore** - Computed selectors eliminate filter inconsistencies
4. **ControlledTextPreview** - Eliminates cursor jumping with pure React state
5. **Unicode Symbol Detector** - Accurate fallback detection vs canvas measurement
6. **Font Processing Pipeline** - Multi-stage validation with consistent metadata

#### 📁 New Architecture Files:
```
lib/models/
├── FontFamily.ts          # Hierarchical family model with inheritance
└── FontVariant.ts         # Individual font variants

lib/
├── font-store.ts          # Centralized Zustand store
├── font-processor.ts      # Robust processing pipeline  
└── symbol-detector.ts     # Unicode-aware symbol detection

components/ui/font/
└── ControlledTextPreview.tsx # Cursor-stable text inputs
```

#### 🔄 Next: Phase 2 - Data Migration
Ready to convert existing flat data to hierarchical families and update API endpoints.

**Last Updated**: 2025-09-09  
**Status**: 🏗️ Phase 1 Foundation Complete - Ready for Phase 2 Data Migration