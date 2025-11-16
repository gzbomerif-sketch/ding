# ⚡ Agent Quick Start Guide
## Get Building in 60 Seconds

---

## 🎯 Your Mission

Build **ONE COMPLETE FEATURE** from start to finish following the established patterns.

---

## 📚 Required Reading (5 mins)

**READ THESE FIRST** (in order):

1. **Your Assignment**:
   - `.claude/plans/{your-feature}-plan.md` ← Your blueprint
   - `.claude/agents/agent-{your-feature}.md` ← Your expertise profile

2. **Project Rules**:
   - `/workspace/CLAUDE.md` ← Project guidelines
   - `/workspace/convexGuidelines.md` ← Backend patterns

3. **Reference Implementation**:
   - `/workspace/convex/siteMirror.ts` ← Working backend example
   - `/workspace/app/(protected)/site-mirror/page.tsx` ← Working frontend example
   - `/workspace/convex/campaigns.ts` ← Campaign backend (complete)
   - `/workspace/convex/metrics.ts` ← Metrics backend (complete)

---

## 🚀 Build Steps (50 mins)

### Step 1: Create Backend (20 mins)

**File**: `convex/{yourFeature}.ts`

**Copy this template and modify**:

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// ============================================================================
// MUTATIONS
// ============================================================================

export const create = mutation({
  args: {
    // Add your args with validators
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. AUTH CHECK (REQUIRED!)
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    // 2. GET USER
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    // 3. AUTHORIZATION CHECK (if needed)
    if (user.role !== "admin") {
      throw new Error("Unauthorized");
    }

    // 4. CREATE RECORD
    const id = await ctx.db.insert("yourTable", {
      ...args,
      userId: user._id,
      createdAt: Date.now(),
    });

    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("yourTable"),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return id;
  },
});

export const remove = mutation({
  args: {
    id: v.id("yourTable"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// ============================================================================
// QUERIES
// ============================================================================

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .first();
    if (!user) return [];

    return await ctx.db
      .query("yourTable")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const getById = query({
  args: {
    id: v.id("yourTable"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db.get(args.id);
  },
});
```

**Checklist**:
- [ ] All functions have validators (`v.*`)
- [ ] All mutations check auth
- [ ] All queries check auth
- [ ] Used proper indexes from schema
- [ ] Error messages are clear
- [ ] TypeScript types are correct

---

### Step 2: Create Frontend Page (20 mins)

**File**: `app/(protected)/{yourFeature}/page.tsx`

**Copy this template and modify**:

```typescript
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Edit } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

export default function YourFeaturePage() {
  // ============================================================================
  // STATE & QUERIES
  // ============================================================================
  const items = useQuery(api.yourFeature.list);
  const createItem = useMutation(api.yourFeature.create);
  const updateItem = useMutation(api.yourFeature.update);
  const deleteItem = useMutation(api.yourFeature.remove);

  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleCreate = async () => {
    if (!name.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      await createItem({ name: name.trim() });
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: Id<"yourTable">) => {
    if (!confirm("Are you sure?")) return;

    try {
      await deleteItem({ id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Feature</h1>
          <p className="text-muted-foreground">
            Feature description goes here
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Create Form */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Item</CardTitle>
          <CardDescription>Add a new item to your list</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Enter name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              disabled={isLoading}
            />
            <Button onClick={handleCreate} disabled={isLoading || !name.trim()}>
              <Plus className="mr-2 h-4 w-4" />
              Create
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Items List */}
      <div className="grid gap-4">
        {items === undefined ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Loading...</p>
            </CardContent>
          </Card>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No items yet. Create your first one above!
              </p>
            </CardContent>
          </Card>
        ) : (
          items.map((item) => (
            <Card key={item._id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{item.name}</CardTitle>
                    <CardDescription>
                      Created {new Date(item.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(item._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
```

**Checklist**:
- [ ] "use client" directive at top
- [ ] useQuery for reading data
- [ ] useMutation for writing data
- [ ] Loading states implemented
- [ ] Error handling implemented
- [ ] Empty state handled
- [ ] shadcn/ui components used
- [ ] Responsive design
- [ ] TypeScript types correct

---

### Step 3: Create Components (10 mins)

**Optional**: Break down complex UI into smaller components

**Directory**: `app/(protected)/{yourFeature}/_components/`

**Example component**:

```typescript
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Doc } from "@/convex/_generated/dataModel";

interface ItemCardProps {
  item: Doc<"yourTable">;
  onDelete: (id: Id<"yourTable">) => void;
}

export function ItemCard({ item, onDelete }: ItemCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{item.name}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Item content */}
      </CardContent>
    </Card>
  );
}
```

---

## ✅ Testing Checklist (5 mins)

Before marking complete:

### Backend Tests
- [ ] Navigate to feature URL
- [ ] Create an item (should work)
- [ ] Refresh page (data should persist)
- [ ] Delete an item (should work)
- [ ] Update an item (should work)
- [ ] Log out and try to access (should block)

### Frontend Tests
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Loading states work
- [ ] Error messages display
- [ ] Empty state shows
- [ ] UI is responsive (mobile + desktop)
- [ ] Real-time updates work (open 2 tabs)

---

## 🚨 Common Mistakes to Avoid

### ❌ DON'T DO THIS:

1. **Forgetting Auth**:
   ```typescript
   // ❌ BAD
   export const getData = query({
     handler: async (ctx) => {
       return await ctx.db.query("data").collect(); // Everyone sees everything!
     }
   });
   ```

2. **Missing Validators**:
   ```typescript
   // ❌ BAD
   export const create = mutation({
     args: {}, // No validators!
     handler: async (ctx, args: any) => { // Using any!
       // ...
     }
   });
   ```

3. **Wrong Import Paths**:
   ```typescript
   // ❌ BAD
   import { api } from "../../../convex/_generated/api";
   
   // ✅ GOOD
   import { api } from "@/convex/_generated/api";
   ```

4. **Not Handling Loading**:
   ```typescript
   // ❌ BAD
   const data = useQuery(api.feature.getData);
   return <div>{data.map(...)}</div>; // Crashes if undefined!
   
   // ✅ GOOD
   const data = useQuery(api.feature.getData);
   if (data === undefined) return <div>Loading...</div>;
   return <div>{data.map(...)}</div>;
   ```

---

## 🎯 Success Criteria

Your feature is COMPLETE when:

1. ✅ Backend file created with all CRUD operations
2. ✅ Frontend page created and accessible
3. ✅ Auth checks working (logged out users blocked)
4. ✅ Real-time updates working (changes appear immediately)
5. ✅ No TypeScript errors
6. ✅ No console errors
7. ✅ UI matches existing design patterns
8. ✅ All user flows tested and working

---

## 📝 Report Your Progress

Update the progress log:

```markdown
## Feature: {Your Feature Name}
Status: ✅ COMPLETE

### Backend
- Created: convex/{feature}.ts
- Functions: create, update, delete, list, getById
- Lines: {count}
- Tests: ✅ All passing

### Frontend
- Created: app/(protected)/{feature}/page.tsx
- Components: {count}
- Lines: {count}
- Tests: ✅ All passing

### Issues: None

### Time: {minutes} minutes
```

---

## 🆘 Need Help?

**Check these references**:
1. Site Mirror: `/workspace/convex/siteMirror.ts`
2. Campaigns: `/workspace/convex/campaigns.ts`
3. Metrics: `/workspace/convex/metrics.ts`
4. Frontend: `/workspace/app/(protected)/campaigns/page.tsx`

**Still stuck?**
- Re-read your plan file
- Check convexGuidelines.md
- Look at error messages carefully
- Verify all imports resolve

---

## 🎉 Ready to Build!

**Your steps**:
1. ✅ Read your plan (5 min)
2. ✅ Create backend (20 min)
3. ✅ Create frontend (20 min)
4. ✅ Test everything (5 min)
5. ✅ Report completion (2 min)

**Total**: ~52 minutes per feature

**LET'S BUILD SOMETHING AMAZING!** 🚀

---

*Remember: Quality over speed. A working feature is better than a fast but broken one.*
