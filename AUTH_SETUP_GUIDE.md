# Authentication Setup Guide

## Phase 1 - Week 1: Authentication System

### Overview
Complete authentication and authorization system using Supabase Auth with RBAC (Role-Based Access Control).

---

## What Has Been Implemented

### ✅ 1. Database Migration (`supabase/migrations/010_create_auth_system.sql`)
- User profiles table with role-based access
- User sessions table for audit trail
- Role permissions table with seeded permissions
- Three user roles: `admin`, `operator`, `viewer`
- RLS (Row Level Security) policies
- Helper functions for permission checking
- Automatic triggers for profile creation
- Views for user activity monitoring

### ✅ 2. TypeScript Types (`types/auth.ts`)
- User, UserSession, Permission interfaces
- Role and resource type definitions
- Permission checking types
- Auth state management types

### ✅ 3. Authentication Utilities
- **Client-side** (`lib/auth/supabase.ts`):
  - `signIn()` - User login
  - `signUp()` - User registration
  - `signOut()` - User logout
  - `getCurrentUser()` - Fetch current user
  - `updateUserProfile()` - Update user data
  - `resetPassword()` - Password reset

- **Server-side** (`lib/auth/supabase-server.ts`):
  - `createServerSupabaseClient()` - Server Supabase client
  - `getServerUser()` - Get user in server components
  - `requireServerAuth()` - Protected server routes

### ✅ 4. Permission System (`lib/auth/permissions.ts`)
- `hasPermission()` - Check user permissions
- `canRead()`, `canCreate()`, `canUpdate()`, `canDelete()` - Resource actions
- `isAdmin()`, `isOperator()`, `isViewer()` - Role checks
- `requirePermission()` - Authorization middleware helper

### ✅ 5. React Context (`contexts/AuthContext.tsx`)
- `AuthProvider` - Global auth state provider
- `useAuth()` - Auth hook for components
- `useRequireAuth()` - Protected page hook
- `usePermission()` - Permission checking hook
- `useRole()` - Role information hook

### ✅ 6. Authentication Pages
- **Login Page** (`app/login/page.tsx`):
  - Email/password login form
  - Error handling
  - Loading states
  - Link to registration

- **Register Page** (`app/register/page.tsx`):
  - Registration form with validation
  - Optional profile fields (name, company, phone)
  - Password confirmation
  - Link to login

### ✅ 7. Route Protection (`middleware.ts`)
- Automatic session refresh
- Protected routes (redirect to login if not authenticated)
- Public routes (redirect to dashboard if authenticated)
- API route protection (return 401 if not authenticated)

---

## Setup Instructions

### Step 1: Apply Database Migration

1. **Option A: Using Supabase CLI**
   ```bash
   # Run the migration
   npx supabase db push
   ```

2. **Option B: Using Supabase Dashboard**
   - Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your project
   - Go to **SQL Editor**
   - Click **New Query**
   - Copy the entire content of `supabase/migrations/010_create_auth_system.sql`
   - Paste and click **Run**

### Step 2: Configure Supabase Auth

1. Go to **Authentication → Settings** in Supabase Dashboard
2. Enable **Email** auth provider
3. Configure **Site URL**: `http://localhost:3000`
4. Configure **Redirect URLs**:
   - `http://localhost:3000/dashboard`
   - `http://localhost:3000/auth/callback`
5. Set **JWT expiry**: 3600 seconds (1 hour)
6. Save changes

### Step 3: Environment Variables

Ensure you have these in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Step 4: Create First Admin User

After the migration is applied:

1. **Sign up through the app** at `http://localhost:3000/register`
2. **Promote to admin** using Supabase Dashboard:
   - Go to **SQL Editor**
   - Run this query (replace with your email):
   ```sql
   UPDATE user_profiles
   SET role = 'admin'
   WHERE email = 'your-email@example.com';
   ```

---

## Testing the Authentication System

### 1. Test User Registration

```bash
# Navigate to registration page
http://localhost:3000/register
```

**Test Data:**
- Email: `test@example.com`
- Password: `password123`
- Full Name: `Test User`
- Company: `Test Company`

**Expected:**
- User created successfully
- Redirected to `/dashboard`
- User profile created with `viewer` role by default

### 2. Test User Login

```bash
# Navigate to login page
http://localhost:3000/login
```

**Expected:**
- Login successful
- Session created
- Redirected to `/dashboard`

### 3. Test Route Protection

**Test protected routes without login:**
```bash
# Try to access dashboard without logging in
http://localhost:3000/dashboard
```

**Expected:**
- Redirected to `/login?redirect=/dashboard`

**Test public routes when logged in:**
```bash
# Try to access login while logged in
http://localhost:3000/login
```

**Expected:**
- Redirected to `/dashboard`

### 4. Test Permission System

**Check permissions in a component:**
```typescript
import { usePermission, useRole } from '@/contexts/AuthContext';

function MyComponent() {
  const canEditQuotations = usePermission('quotations', 'update');
  const { isAdmin } = useRole();

  return (
    <div>
      {canEditQuotations && <button>Edit</button>}
      {isAdmin && <button>Admin Panel</button>}
    </div>
  );
}
```

### 5. Test API Protection

**Protected API Route Example:**
```typescript
// app/api/test/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth/supabase-server';
import { requirePermission } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  const user = await getServerUser();

  const { authorized, error } = requirePermission(user, 'quotations', 'read');

  if (!authorized) {
    return NextResponse.json({ error }, { status: 403 });
  }

  return NextResponse.json({ success: true, user });
}
```

---

## User Roles and Permissions

### Admin
**Full access to everything:**
- All resources: read, create, update, delete
- User management
- System settings

### Operator
**Read/Write access to core resources:**
- Quotations: read, create, update
- RFQs: read, create, update
- Providers: read, create, update
- Integrations: read
- Settings: read

### Viewer
**Read-only access:**
- Quotations: read
- RFQs: read
- Providers: read
- Integrations: read

---

## Next Steps (Week 2)

After testing the authentication system:

1. **Protect all API routes** with authentication
2. **Add permission checks** to existing APIs
3. **Update UI components** to show/hide based on permissions
4. **Add security headers** (CSP, CORS, etc.)
5. **Implement input sanitization**
6. **Add GDPR compliance** (data export, deletion)

---

## Troubleshooting

### Issue: Migration fails
**Solution:** Check that you have the latest Supabase schema. Drop and recreate if needed.

### Issue: Cannot login after signup
**Solution:** Check Supabase Auth logs in Dashboard → Authentication → Logs

### Issue: Middleware redirects too many times
**Solution:** Clear browser cookies and try again

### Issue: Type errors with Supabase client
**Solution:** Run `npm install` to ensure all packages are up to date

---

## Security Checklist

- [x] Database migration with RLS policies
- [x] Type-safe authentication utilities
- [x] Client and server-side auth functions
- [x] Permission-based access control
- [x] Protected routes with middleware
- [x] Secure session management
- [ ] API routes protection (Week 1, Day 5-7)
- [ ] Security headers (Week 2)
- [ ] Input sanitization (Week 2)
- [ ] GDPR compliance (Week 2)

---

**Status:** ✅ Phase 1, Week 1, Day 1-4 Complete
**Next:** Apply migration and test authentication flows
**Timeline:** On track for 12-week production roadmap

---

**Last Updated:** 2025-10-29
**Version:** 1.0
