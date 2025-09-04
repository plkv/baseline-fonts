# Claude Code Memory File - Baseline Font Catalog

## Project Overview
- **Project Name**: Baseline Font Catalog
- **Repository**: https://github.com/plkv/baseline-fonts.git
- **Current Version**: 0.021
- **Status**: ✅ Working and deployed

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
- ✅ Version synced across all files (0.021)
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