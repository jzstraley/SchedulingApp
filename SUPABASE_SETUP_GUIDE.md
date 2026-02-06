# FellowShift Multi-User Migration - Setup Guide

## 📍 Current Status

**Phase 1 (Foundation) - COMPLETED ✅**

We've completed the foundational setup for migrating FellowShift to a multi-user Supabase-powered system.

### Files Created:
1. ✅ `supabase_schema.sql` - Complete database schema (12 tables + RLS policies)
2. ✅ `src/lib/supabaseClient.js` - Supabase client initialization
3. ✅ `src/lib/supabaseHelpers.js` - Generic CRUD operations
4. ✅ `src/context/AuthContext.jsx` - Authentication context provider
5. ✅ `src/components/auth/LoginPage.jsx` - Login page component
6. ✅ `.env.example` - Environment variables template

### Dependencies Installed:
- ✅ `@supabase/supabase-js` - Supabase client library
- ✅ `react-dnd` + `react-dnd-html5-backend` - Drag-and-drop for calendar
- ✅ `ical-generator` - iCal export functionality

---

## 🚀 Next Steps to Continue Tomorrow

### Step 1: Set Up Supabase (15 minutes)

1. **Create a Supabase project:**
   - Go to [https://supabase.com](https://supabase.com)
   - Sign in or create an account
   - Click "New Project"
   - Fill in:
     - Name: `FellowShift` (or your preferred name)
     - Database Password: (save this somewhere safe)
     - Region: Choose closest to you
     - Plan: Free tier is fine for development

2. **Wait for project to initialize** (takes 2-3 minutes)

3. **Get your API credentials:**
   - In Supabase dashboard, go to **Settings** → **API**
   - Copy these two values:
     - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
     - **anon/public key** (long string starting with `eyJ...`)

4. **Create `.env.local` file:**
   ```bash
   # In your project root directory
   cp .env.example .env.local
   ```

   Then edit `.env.local` and paste your credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGc...your-key-here
   ```

### Step 2: Create Database Schema (5 minutes)

1. **Open Supabase SQL Editor:**
   - In Supabase dashboard, click **SQL Editor** (left sidebar)
   - Click **New Query**

2. **Copy and run the schema:**
   - Open `supabase_schema.sql` in your code editor
   - Copy the ENTIRE contents
   - Paste into the SQL Editor
   - Click **Run** (or press Cmd/Ctrl + Enter)

3. **Verify tables were created:**
   - Click **Database** → **Tables** (left sidebar)
   - You should see 12 tables:
     - institutions
     - profiles
     - fellows
     - block_dates
     - schedule_assignments
     - call_assignments
     - vacation_requests
     - lectures
     - lecture_topics
     - speakers
     - lecture_rsvps
     - fellow_emails
     - audit_log

### Step 3: Create First Admin User (5 minutes)

1. **Create test institution:**
   - In SQL Editor, run:
   ```sql
   INSERT INTO institutions (name, slug)
   VALUES ('Test Cardiology Program', 'test-cardiology')
   RETURNING id;
   ```
   - **SAVE THE ID** returned (you'll need it in next step)

2. **Sign up via Authentication:**
   - In Supabase dashboard, go to **Authentication** → **Users**
   - Click **Add User** → **Create new user**
   - Email: `admin@test.com` (or your email)
   - Password: Create a strong password
   - Check "Auto Confirm User"
   - Click **Create User**
   - **SAVE THE USER ID** (UUID in the table)

3. **Create admin profile:**
   - In SQL Editor, run:
   ```sql
   INSERT INTO profiles (id, institution_id, email, full_name, role, program)
   VALUES (
     'USER-UUID-FROM-STEP-2',  -- Replace with user ID from Authentication
     'INSTITUTION-UUID-FROM-STEP-1',  -- Replace with institution ID
     'admin@test.com',
     'Admin User',
     'program_director',
     'cardiology'
   );
   ```

### Step 4: Test Authentication (2 minutes)

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open the app:**
   - Go to http://localhost:5173
   - You should see the **LoginPage** instead of going directly to the app

3. **Log in:**
   - Email: `admin@test.com` (or whatever you used)
   - Password: (the password you created)
   - Click **Sign in**

4. **Expected behavior:**
   - If successful: The app should redirect you to the main scheduler
   - If error: Check browser console for error messages

---

## 🔧 Continuing Development

Once authentication is working, here's what needs to be done next:

### Phase 2: Update App.jsx (Next Session)

**File to modify:** `src/App.jsx`

**Changes needed:**
1. Import `AuthProvider` and `LoginPage`
2. Wrap entire app with `<AuthProvider>`
3. Add conditional rendering:
   - If not logged in → show `<LoginPage />`
   - If logged in → show main app

**Code pattern:**
```jsx
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './components/auth/LoginPage';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <LoginPage />;

  return <MainApp />; // Existing app code
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
```

### Phase 3: Create Database Hooks

**Files to create:**
- `src/hooks/useSchedule.js` - Schedule CRUD operations
- `src/hooks/useVacations.js` - Vacation request management
- `src/hooks/useCalls.js` - Call/float assignments
- `src/hooks/useLectures.js` - Lecture management
- `src/hooks/useRealtime.js` - Real-time subscriptions

### Phase 4: Update Components

**Priority order:**
1. `ScheduleView` - Connect to database
2. `VacationsView` - Add role-based approval
3. `CallView` - Database persistence
4. `CalendarView` - Read-only from DB
5. `LectureCalendarView` - Full CRUD

### Phase 5: Migration Wizard

**Files to create:**
- `src/components/migration/MigrationWizard.jsx`
- `src/components/migration/ExportTool.jsx`

---

## 📋 Checklist for Tomorrow

Before coding:
- [ ] Supabase project created
- [ ] Database schema executed
- [ ] Test institution created
- [ ] Admin user created and profile linked
- [ ] `.env.local` file configured
- [ ] Can log in successfully

Then continue with:
- [ ] Update `App.jsx` with AuthProvider
- [ ] Test that app loads after login
- [ ] Create first database hook (`useSchedule`)
- [ ] Test reading schedule data from Supabase

---

## 🐛 Troubleshooting

### "Supabase not configured" warning
- Check that `.env.local` exists in project root
- Verify environment variables are correct
- Restart dev server after creating `.env.local`

### Can't log in / "Invalid credentials"
- Verify user was created in Supabase Authentication
- Check email and password match
- Ensure user is "Confirmed" (not pending)

### No profile after login
- Check that profile was inserted in `profiles` table
- Verify user ID in profiles matches auth user ID
- Check `institution_id` is valid

### RLS policy errors
- Verify all RLS policies were created from schema
- Check user is authenticated (auth.uid() returns value)
- Ensure institution_id matches between user and data

---

## 📚 Reference Links

- **Supabase Dashboard:** https://app.supabase.com
- **Supabase Docs:** https://supabase.com/docs
- **React DnD Docs:** https://react-dnd.github.io/react-dnd
- **Implementation Plan:** `/Users/jamesstraley/.claude/plans/dazzling-bouncing-church.md`

---

## 💡 Quick Commands

```bash
# Install dependencies (already done)
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Check for TypeScript errors (if using TS)
npm run type-check
```

---

## 🎯 Success Metrics

You'll know everything is working when:
1. ✅ Login page appears on app load
2. ✅ Can log in with test credentials
3. ✅ After login, see main scheduler interface
4. ✅ Browser console shows "Auth state changed: SIGNED_IN"
5. ✅ No RLS policy errors in console

---

## 📞 Get Help

If stuck tomorrow, check:
1. Browser console for error messages
2. Supabase dashboard → Logs for database errors
3. Implementation plan for detailed architecture
4. This guide's troubleshooting section

Good luck! 🚀
