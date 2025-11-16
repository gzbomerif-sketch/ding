# 🤖 Agent Orchestration Guide
## Multi-Agent Autonomous Development

**Purpose**: Coordinate multiple AI agents to build features simultaneously
**Goal**: Complete all 17 features in 8-12 hours using parallel execution

---

## 🎯 Agent Assignment Matrix

### Available Agents (24 specialized agents)

| Agent File | Expertise | Assigned Features |
|-----------|-----------|-------------------|
| `agent-campaign-analytics.md` | Campaign tracking & metrics | Campaign Analytics (Phase 1) |
| `agent-notification-center.md` | Real-time notifications | Notification Center (Phase 1) |
| `agent-influencer-rankings.md` | Leaderboards & rankings | Influencer Rankings (Phase 1) |
| `agent-roster-manager.md` | Team/roster management | Roster Manager (Phase 2) |
| `agent-profile-monitor.md` | Profile tracking | Profile Monitor (Phase 2) |
| `agent-scraper-sentinel.md` | Scraping monitoring | Scraper Sentinel (Phase 2) |
| `agent-selector-sentinel.md` | CSS selector management | Selector Sentinel (Phase 3) |
| `agent-export-bundle.md` | Data export systems | Export Bundle (Phase 3) |
| `agent-video-workflow.md` | Video processing | Video Workflow (Phase 3) |
| `agent-influencer-insights.md` | Influencer analytics | Influencer Insights (Phase 4) |
| `agent-post-insights.md` | Post performance | Post Insights (Phase 4) |
| `agent-creator-insights.md` | Creator metrics | Creator Insights (Phase 4) |
| `agent-performance-dashboard.md` | Dashboard aggregation | Performance Dashboard (Phase 4) |
| `agent-crawler-dashboard.md` | Crawler management | Crawler Dashboard (Phase 5) |
| `agent-social-scraper.md` | Social media scraping | Social Scraper (Phase 5) |
| `agent-social-sentinel.md` | Social monitoring | Social Sentinel (Phase 5) |
| `agent-command-center.md` | Admin control panel | Command Center (Phase 5) |
| `agent-convex.md` | Convex backend | All backend work |
| `agent-nextjs.md` | Next.js frontend | All frontend work |
| `agent-clerk.md` | Authentication | Auth integration |

---

## 🔄 Parallel Execution Strategy

### Simultaneous Work Groups

**Group A: Critical Features (2-3 agents)**
- Agent 1: Complete Campaign Analytics enhancement
- Agent 2: Build Notification Center
- Agent 3: Build Influencer Rankings

**Group B: Management Tools (3 agents)**
- Agent 4: Build Roster Manager
- Agent 5: Build Profile Monitor
- Agent 6: Build Scraper Sentinel

**Group C: Advanced Features (3 agents)**
- Agent 7: Build Selector Sentinel
- Agent 8: Build Export Bundle
- Agent 9: Build Video Workflow

**Group D: Analytics Suite (4 agents)**
- Agent 10: Build Influencer Insights
- Agent 11: Build Post Insights
- Agent 12: Build Creator Insights
- Agent 13: Build Performance Dashboard

**Group E: Integration (4 agents)**
- Agent 14: Build Crawler Dashboard
- Agent 15: Build Social Scraper
- Agent 16: Build Social Sentinel
- Agent 17: Build Command Center

---

## 📋 Workflow per Agent

### 1. Initialization (5 minutes)
```bash
# Read required documentation
- Read: .claude/plans/{feature}-plan.md
- Read: .claude/agents/agent-{feature}.md
- Read: CLAUDE.md
- Read: convexGuidelines.md
- Verify: convex/schema.ts has required tables
```

### 2. Backend Development (15-25 minutes)
```bash
# Create Convex functions file
- Create: convex/{feature}.ts
- Implement: All CRUD operations
- Implement: Auth checks
- Implement: Aggregation queries
- Add: Proper error handling
- Add: TypeScript types
- Verify: No syntax errors
```

### 3. Frontend Development (20-30 minutes)
```bash
# Create Next.js page and components
- Create: app/(protected)/{feature}/page.tsx
- Create: app/(protected)/{feature}/_components/
- Implement: useQuery/useMutation hooks
- Implement: UI with shadcn/ui
- Add: Loading states
- Add: Error boundaries
- Add: Empty states
```

### 4. Testing & Verification (10 minutes)
```bash
# Test the feature
- Check: TypeScript compiles
- Test: Basic CRUD operations
- Test: Auth protection works
- Test: Real-time updates
- Test: Error handling
- Test: UI responsiveness
```

### 5. Documentation (5 minutes)
```bash
# Update progress
- Mark feature as complete
- Document any issues
- List what was built
- Note time taken
```

**Total Time per Feature**: 55-75 minutes
**With 17 agents**: All features complete in 75 minutes (parallel)
**Sequential (1 agent)**: 17 × 75 = 1,275 minutes = 21 hours

---

## 🚦 Coordination Protocol

### Avoiding Conflicts

**File Ownership**:
- Each agent owns their feature's files
- No two agents edit same file simultaneously
- Shared files (schema.ts) are READ-ONLY

**Communication**:
- Each agent updates their progress in shared log
- Blockers reported immediately
- Completion announced to trigger dependent work

**Dependencies**:
- Notification Center → needed by all features
- Campaign Analytics → needed by insights features
- Profile Monitor → needed by influencer features

**Execution Order** (for dependencies):
1. Notification Center (all depend on this)
2. Campaign Analytics (insights depend on this)
3. All other features (parallel)

---

## 📊 Progress Tracking

### Shared Progress Log Format

```markdown
## Agent #{ID} - {Feature Name}

### Status: [NOT_STARTED | IN_PROGRESS | TESTING | COMPLETE | BLOCKED]

### Backend Progress
- [ ] Created convex/{feature}.ts
- [ ] Implemented CRUD operations
- [ ] Added auth checks
- [ ] Tested queries/mutations

### Frontend Progress
- [ ] Created page.tsx
- [ ] Created components
- [ ] Implemented UI
- [ ] Added real-time updates
- [ ] Tested user flows

### Issues
- {List any blockers or issues}

### Time Log
- Start: {timestamp}
- Backend Complete: {timestamp}
- Frontend Complete: {timestamp}
- Testing Complete: {timestamp}
- Total: {minutes}

### Deliverables
- Backend: convex/{feature}.ts ({lines} lines, {functions} functions)
- Frontend: app/(protected)/{feature}/page.tsx
- Components: {list component files}
```

---

## 🎯 Quality Gates

Each agent must pass these gates before marking complete:

### Gate 1: Backend Quality
- [ ] All TypeScript types defined
- [ ] All functions have validators
- [ ] Auth checks in all mutations/queries
- [ ] Error handling implemented
- [ ] No console.log statements
- [ ] Follows convexGuidelines.md patterns

### Gate 2: Frontend Quality
- [ ] "use client" directive added
- [ ] All imports resolve correctly
- [ ] Uses shadcn/ui components
- [ ] Responsive design implemented
- [ ] Loading states added
- [ ] Error boundaries added
- [ ] Empty states handled

### Gate 3: Integration Quality
- [ ] Real-time updates working
- [ ] Navigation integrated (if applicable)
- [ ] Auth protection verified
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Feature accessible via URL

### Gate 4: UX Quality
- [ ] Consistent with existing design
- [ ] Intuitive user flow
- [ ] Fast load times
- [ ] No UI jank or flicker
- [ ] Accessible (keyboard navigation)
- [ ] Mobile responsive

---

## 🚨 Error Handling Protocol

### Common Issues & Solutions

**Issue**: TypeScript errors in generated types
**Solution**: Run `npx convex dev` to regenerate types

**Issue**: Auth not working
**Solution**: Check Clerk integration in ConvexClientProvider

**Issue**: Query returns empty array
**Solution**: Check userId filtering and indexes

**Issue**: Mutation fails silently
**Solution**: Add try/catch and proper error messages

**Issue**: UI not updating in real-time
**Solution**: Verify useQuery hook used correctly

**Issue**: Component import errors
**Solution**: Check path aliases (@/*) configured

---

## 🔧 Development Environment

### Required Tools
- Node.js 18+
- npm or yarn
- TypeScript 5.x
- Next.js 15
- Convex CLI

### Running Development Server
```bash
# Start both frontend and backend
npm run dev

# Backend only
npx convex dev

# Frontend only
npm run dev:frontend
```

### Accessing Features
- Frontend: http://localhost:3000
- Convex Dashboard: Opens automatically
- Feature URLs: http://localhost:3000/{feature-name}

---

## 📈 Success Metrics

### Per Feature
- Backend: 100% functions working
- Frontend: 100% UI functional
- Auth: 100% protected
- Real-time: 100% reactive
- Tests: 100% passing

### Overall Project
- 17 features complete: 100%
- Type safety: 100%
- Auth coverage: 100%
- Real-time: 100%
- UI consistency: 100%

**Target**: All metrics at 100% = 110% functionality

---

## 🎉 Completion Checklist

When all agents complete:

### Phase 1: Verification
- [ ] All 17 features accessible
- [ ] All TypeScript compiles without errors
- [ ] All features load without errors
- [ ] Auth works on all protected routes
- [ ] Real-time updates work everywhere

### Phase 2: Testing
- [ ] Manual test each feature
- [ ] Test auth flows
- [ ] Test error scenarios
- [ ] Test on mobile
- [ ] Test across browsers

### Phase 3: Polish
- [ ] Fix any UI inconsistencies
- [ ] Optimize slow queries
- [ ] Add missing error messages
- [ ] Improve loading states
- [ ] Final accessibility check

### Phase 4: Documentation
- [ ] Update IMPLEMENTATION_STATUS.md
- [ ] Update COMPLETE_SYSTEM_OVERVIEW.md
- [ ] Create user guide (if needed)
- [ ] Document any gotchas
- [ ] List known limitations

---

## 🚀 Launch Readiness

After all features complete:

1. **Code Quality**: ✅ All lints pass
2. **Type Safety**: ✅ No TS errors
3. **Auth**: ✅ All routes protected
4. **Real-time**: ✅ All features reactive
5. **UI/UX**: ✅ Consistent design
6. **Performance**: ✅ Fast load times
7. **Error Handling**: ✅ Comprehensive
8. **Mobile**: ✅ Responsive
9. **Documentation**: ✅ Complete
10. **Tests**: ✅ All passing

**Result**: App is 110% functional and ready for production! 🎉

---

*This orchestration guide enables multiple agents to work in parallel, completing all features efficiently while maintaining quality and consistency.*
