---
name: "Framework Nextjs Implementation"
description: "Implementation guide for framework nextjs feature"
tools: ["filesystem"]
---

# Framework Nextjs Agent

## Mission
Implement Next.js features according to the codebase's established patterns, design system, and tech stack.

---

## Tech Stack & Libraries

### Core Framework
- **Next.js 15.5.3** with App Router (Turbopack enabled in dev)
- **React 19.0.0** and React DOM 19.0.0
- **TypeScript 5.x** with strict type checking

### Backend & Database
- **Convex 1.23.0** - Real-time backend with queries, mutations, actions
- **Zod 4.1.11** - Schema validation and type inference

### Authentication
- **Clerk** (@clerk/nextjs 6.12.6, @clerk/clerk-react 5.25.0)
- JWT-based authentication integrated with Convex

### UI Component Library
- **Radix UI** - Headless component primitives:
  - Avatar, Checkbox, Dialog, Dropdown Menu, Label, Select
  - Separator, Slot, Tabs, Toggle, Toggle Group, Tooltip
- **shadcn/ui** - Pre-built components using Radix UI
- **Lucide React 0.544.0** - Icon library
- **Tabler Icons React 3.35.0** - Additional icon set

### Styling & Theming
- **Tailwind CSS 4** (@tailwindcss/postcss)
- **next-themes 0.4.6** - Dark/light mode theming
- **class-variance-authority 0.7.1** - Component variants
- **clsx 2.1.1** + **tailwind-merge 3.3.1** - Conditional classes
- **tw-animate-css 1.3.8** - Animation utilities

### Data Visualization
- **Recharts 2.15.4** - Charting library for metrics and analytics

### Tables & Data Display
- **TanStack Table 8.21.3** - Headless table component

### Drag & Drop
- **dnd-kit** - Complete drag and drop toolkit:
  - @dnd-kit/core 6.3.1
  - @dnd-kit/modifiers 9.0.0
  - @dnd-kit/sortable 10.0.0
  - @dnd-kit/utilities 3.2.2

### UI/UX Enhancements
- **Vaul 1.1.2** - Drawer component
- **Sonner 2.0.7** - Toast notifications

### Scraping & Automation
- **Playwright 1.56.1** - Browser automation
- **Crawlee 3.15.3** - Web scraping framework
- **Cheerio 1.1.2** - HTML parsing

### Utilities
- **Archiver 7.0.1** - File compression (ZIP creation)
- **Anthropic AI SDK 0.69.0** - AI integration

### Development Tools
- **ESLint 9** with Next.js config
- **Prettier 3.5.3** - Code formatting
- **npm-run-all 4.1.5** - Run scripts in parallel

---

## Implementation Steps

### 1. Plan Architecture
- Review feature requirements and existing patterns
- Check for similar implementations in the codebase
- Identify which libraries and components to use
- Plan component hierarchy and data flow

### 2. Create Components
- Use shadcn/ui components from `/components/ui/`
- Follow existing component patterns in `/app/(protected)/`
- Use Radix UI primitives when building custom components
- Implement with TypeScript for type safety

### 3. Add Business Logic
- Use Convex queries with `useQuery(api.*.*)` for data fetching
- Use Convex mutations with `useMutation(api.*.*)` for write operations
- Implement Zod schemas for validation
- Add proper error handling

### 4. Style Components
- Use Tailwind CSS with the existing dark theme
- Follow color palette from `globals.css`:
  - Background: #000000, Cards: #1a1a1a
  - Text: #ffffff, Muted: #b3b3b3
  - Chart colors: Purple, Cyan, Green, Amber, Red
- Use Inter font (loaded via Google Fonts)
- Apply responsive design with `sm:`, `md:`, `lg:` breakpoints

### 5. Test Feature
- Test with Clerk authentication flow
- Verify real-time updates with Convex
- Check responsive design on mobile/tablet/desktop
- Test dark theme rendering
- Verify accessibility

---

## Design System Reference

### Typography
- Page titles: `text-3xl font-bold tracking-tight`
- Card titles: `text-sm font-medium` (headers), `text-2xl font-bold` (standalone)
- Card descriptions: `text-sm text-muted-foreground`
- Body text: Default font with `text-foreground`

### Spacing
- Container padding: `p-6`
- Section gaps: `space-y-4`, `space-y-6`
- Grid gaps: `gap-4`
- Card internals: `px-6`, `pb-2` (header), `pt-6` (content)

### Colors (Dark Theme)
- **Background:** `bg-background` (#000000)
- **Card:** `bg-card` (#1a1a1a)
- **Foreground:** `text-foreground` (#ffffff)
- **Muted:** `text-muted-foreground` (#b3b3b3)
- **Primary:** `bg-primary` (#fafafa)
- **Chart Colors:** chart-1 through chart-5

### Status Badges
- Active: `bg-green-500/10 text-green-500`
- Draft: `bg-gray-500/10 text-gray-500`
- Paused: `bg-yellow-500/10 text-yellow-500`
- Completed: `bg-blue-500/10 text-blue-500`

### Interactive States
- Hover: `hover:bg-accent`, `hover:bg-primary/5`
- Borders: `border-border` (default), `border-primary` (active)
- Rounded corners: `rounded-md` (0.625rem base)

---

## Common Patterns

### Data Fetching (Convex)
```typescript
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// Query
const data = useQuery(api.module.functionName, { param: value });

// Mutation
const mutate = useMutation(api.module.functionName);
await mutate({ param: value });
```

### Card Layout
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Responsive Grid
```tsx
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  {/* Grid items */}
</div>
```

### Status Badge
```tsx
<Badge className="bg-green-500/10 text-green-500">
  Active
</Badge>
```

### Toast Notifications
```tsx
import { toast } from "sonner";

toast.success("Success message");
toast.error("Error message");
```

---

## Files to Create/Modify

### For New Features
- Page: `/app/(protected)/[feature]/page.tsx`
- Components: `/app/(protected)/[feature]/_components/`
- Convex functions: `/convex/[feature].ts`
- Types: Use TypeScript with Convex's generated types

### For UI Components
- Shared UI: `/components/ui/[component].tsx`
- Feature components: `/app/(protected)/[feature]/_components/`
- Use shadcn/ui CLI to add new components if needed

### For Backend
- Schema: `/convex/schema.ts` (add tables)
- Functions: `/convex/[module].ts` (queries, mutations, actions)
- Auth: `/convex/auth.config.ts` (if auth changes needed)

---

## Completion Checklist
- [ ] Components created with proper TypeScript types
- [ ] Convex queries/mutations implemented with auth checks
- [ ] Styling applied using Tailwind + dark theme
- [ ] Icons from lucide-react or tabler-icons
- [ ] Responsive design tested (mobile, tablet, desktop)
- [ ] Real-time updates working with Convex
- [ ] Error handling and loading states
- [ ] Feature tested with Clerk authentication
- [ ] Accessibility considerations (ARIA labels, keyboard nav)

---

## Reference Examples

### Existing Implementations
- **Campaign Dashboard**: `/app/(protected)/campaigns/page.tsx`
  - Tabs, metric cards, charts, filters
  - Real-time data with Convex
  - Date range picker, platform selector

### Component Examples
- **MetricCards**: KPI display with icons and formatted numbers
- **PerformanceChart**: Recharts integration with dual axes
- **CampaignList**: Card-based list with status badges
- **CampaignDashboard**: Comprehensive dashboard with filters

---

## Notes
- Always use existing UI components from `/components/ui/` before creating new ones
- Follow the dark theme color palette consistently
- Implement proper loading and error states for all async operations
- Use Convex's real-time capabilities for live data updates
- Ensure role-based access control in Convex functions (admin, client, influencer)
- Test with actual data from Convex rather than mock data
- Keep pages concise by delegating logic to components (modular code best practice)
