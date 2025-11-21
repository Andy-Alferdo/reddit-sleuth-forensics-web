# Use Cases - Reddit Sleuth (Corrected)

## Issues Identified in Original Diagrams

### 1. Missing Admin Actor
The original diagrams only show the "Investigator" actor but completely omit the "Admin" actor, who has distinct responsibilities:
- User management (create, update, delete users)
- Role assignment (admin, user)
- System configuration
- Database oversight
- Case management (admin level)

### 2. Missing "View Only" Use Cases
All use cases require active interaction (search, start, fetch, generate), but there's no consideration for users who want to:
- Browse existing data without performing new searches
- View historical analysis results
- Review past monitoring sessions
- Access dashboard summaries
- Read reports without customizing them

### 3. Login Relationship Issues
Login is shown as `<<include>>` on individual use cases, but it should be:
- A standalone use case
- Connected to system-level authentication
- Inherited by all authenticated use cases

### 4. Missing Core Use Cases
- Dashboard/Overview
- Case Management (create, view, manage cases)
- User Management (admin only)
- View Historical Data
- Access System Settings

---

## Corrected Use Case Descriptions

### Actors

#### 1. Investigator (Regular User)
Regular authenticated user who performs investigations and analysis.
**Capabilities:**
- Perform searches and analysis
- Monitor Reddit content
- View results and reports
- Access dashboard
- Manage their own cases

#### 2. Admin
System administrator with elevated privileges.
**Capabilities:**
- All Investigator capabilities (inherits)
- Manage users and roles
- Configure system settings
- Oversee all cases
- Access database statistics

#### 3. Guest (Unauthenticated User)
**Capabilities:**
- View landing page
- Access login/registration

---

## Use Case 1: Authentication

### UC-1.1: Login
**Actor:** Investigator, Admin
**Preconditions:** User has valid credentials
**Main Flow:**
1. User navigates to login page
2. User enters email and password
3. System validates credentials
4. System creates session
5. User redirected to dashboard

**Postconditions:** User is authenticated

### UC-1.2: Register
**Actor:** Guest
**Preconditions:** None
**Main Flow:**
1. User navigates to registration page
2. User provides email, password, full name
3. System validates input
4. System creates account with 'user' role
5. User redirected to login

**Postconditions:** New user account created

### UC-1.3: Logout
**Actor:** Investigator, Admin
**Preconditions:** User is logged in
**Main Flow:**
1. User clicks logout
2. System destroys session
3. User redirected to home page

**Postconditions:** User session terminated

---

## Use Case 2: Dashboard & Overview

### UC-2.1: View Dashboard
**Actor:** Investigator, Admin
**Preconditions:** User is authenticated
**Main Flow:**
1. User accesses dashboard
2. System displays overview statistics
3. System shows recent activity
4. System displays trending topics
5. User can navigate to specific features

**Postconditions:** User sees system overview
**Extensions:**
- Admin sees additional system statistics
- Admin sees all users' activity

---

## Use Case 3: User Profiling

### UC-3.1: Search Reddit User (Active)
**Actor:** Investigator, Admin
**Preconditions:** User is authenticated
**Main Flow:**
1. User enters Reddit username
2. System scrapes Reddit API for user data
3. System performs AI sentiment analysis
4. System stores results
5. User views profile analysis

**Postconditions:** User profile analyzed and stored
**Includes:** UC-1.1 (Login)

### UC-3.2: View User Profile Results (Passive)
**Actor:** Investigator, Admin
**Preconditions:** User is authenticated, profile exists in database
**Main Flow:**
1. User searches for existing username
2. System retrieves stored profile data
3. User views historical profile information
4. User can refresh/update if needed

**Postconditions:** User views existing data without new search
**Includes:** UC-1.1 (Login)

---

## Use Case 4: Community Analysis

### UC-4.1: Analyze Community (Active)
**Actor:** Investigator, Admin
**Preconditions:** User is authenticated
**Main Flow:**
1. User enters subreddit name
2. System scrapes community data
3. System analyzes posts and members
4. System performs AI analysis
5. User views community insights

**Postconditions:** Community analyzed and results stored
**Includes:** UC-1.1 (Login)

### UC-4.2: View Community Results (Passive)
**Actor:** Investigator, Admin
**Preconditions:** User is authenticated, community analysis exists
**Main Flow:**
1. User browses or searches for existing community
2. System displays stored community data
3. User reviews historical community information

**Postconditions:** User views existing analysis
**Includes:** UC-1.1 (Login)

---

## Use Case 5: Link Analysis

### UC-5.1: Perform Link Analysis (Active)
**Actor:** Investigator, Admin
**Preconditions:** User is authenticated
**Main Flow:**
1. User provides links or search criteria
2. System analyzes relationships between subreddits
3. System identifies shared users
4. System generates network visualization
5. User views connection insights

**Postconditions:** Link analysis completed and stored
**Includes:** UC-1.1 (Login)

### UC-5.2: View Link Analysis Results (Passive)
**Actor:** Investigator, Admin
**Preconditions:** User is authenticated, link analysis exists
**Main Flow:**
1. User accesses stored link analysis
2. System displays network graphs
3. User explores relationships

**Postconditions:** User views existing link data
**Includes:** UC-1.1 (Login)

---

## Use Case 6: Monitoring

### UC-6.1: Start Monitoring (Active)
**Actor:** Investigator, Admin
**Preconditions:** User is authenticated
**Main Flow:**
1. User searches for username/community
2. User clicks "Start Monitoring"
3. System begins real-time tracking (15-second intervals)
4. System displays activity feed
5. User receives notifications on new activity

**Postconditions:** Real-time monitoring active
**Includes:** UC-1.1 (Login)

### UC-6.2: Stop Monitoring
**Actor:** Investigator, Admin
**Preconditions:** User is authenticated, monitoring is active
**Main Flow:**
1. User clicks "Stop Monitoring"
2. System halts tracking
3. System saves monitoring session

**Postconditions:** Monitoring stopped, data preserved
**Includes:** UC-1.1 (Login)

### UC-6.3: View Monitoring History (Passive)
**Actor:** Investigator, Admin
**Preconditions:** User is authenticated
**Main Flow:**
1. User accesses monitoring history
2. System displays past monitoring sessions
3. User reviews historical activity

**Postconditions:** User views past monitoring data
**Includes:** UC-1.1 (Login)

---

## Use Case 7: Reporting

### UC-7.1: Generate Report (Active)
**Actor:** Investigator, Admin
**Preconditions:** User is authenticated, analysis data exists
**Main Flow:**
1. User selects data for report
2. User clicks "Generate Report"
3. System compiles analysis results
4. System formats report
5. User views/downloads report

**Postconditions:** Report generated
**Includes:** UC-1.1 (Login)

### UC-7.2: Customize Report (Active)
**Actor:** Investigator, Admin
**Preconditions:** User is authenticated, report generated
**Main Flow:**
1. User selects report customization options
2. User filters data, adjusts format
3. System regenerates customized report
4. User views/downloads customized report

**Postconditions:** Customized report created
**Extends:** UC-7.1 (Generate Report)
**Includes:** UC-1.1 (Login)

### UC-7.3: View Past Reports (Passive)
**Actor:** Investigator, Admin
**Preconditions:** User is authenticated, reports exist
**Main Flow:**
1. User accesses report history
2. System displays list of past reports
3. User opens and reviews report

**Postconditions:** User views historical reports
**Includes:** UC-1.1 (Login)

---

## Use Case 8: Case Management

### UC-8.1: Create Case
**Actor:** Investigator, Admin
**Preconditions:** User is authenticated
**Main Flow:**
1. User navigates to case creation
2. User enters case details (name, description, keywords)
3. System creates new case
4. User associates analysis with case

**Postconditions:** New case created
**Includes:** UC-1.1 (Login)

### UC-8.2: View Cases (Passive)
**Actor:** Investigator, Admin
**Preconditions:** User is authenticated
**Main Flow:**
1. User accesses cases list
2. System displays user's cases (or all cases for Admin)
3. User browses case information

**Postconditions:** User views case data
**Includes:** UC-1.1 (Login)
**Extensions:**
- Admin can view all users' cases

### UC-8.3: Update Case Status
**Actor:** Investigator, Admin
**Preconditions:** User is authenticated, case exists
**Main Flow:**
1. User opens case
2. User updates status, adds notes, attaches evidence
3. System saves changes

**Postconditions:** Case updated
**Includes:** UC-1.1 (Login)

---

## Use Case 9: User Management (Admin Only)

### UC-9.1: View All Users
**Actor:** Admin
**Preconditions:** Admin is authenticated
**Main Flow:**
1. Admin accesses admin dashboard
2. System displays all users list
3. Admin views user details (email, role, creation date)

**Postconditions:** Admin sees user information
**Includes:** UC-1.1 (Login)

### UC-9.2: Create User
**Actor:** Admin
**Preconditions:** Admin is authenticated
**Main Flow:**
1. Admin clicks "Add User"
2. Admin enters email, password, assigns role
3. System creates user account
4. System sends confirmation

**Postconditions:** New user created by admin
**Includes:** UC-1.1 (Login)

### UC-9.3: Update User Role
**Actor:** Admin
**Preconditions:** Admin is authenticated, user exists
**Main Flow:**
1. Admin selects user
2. Admin changes role (user ↔ admin)
3. System updates user_roles table
4. System confirms change

**Postconditions:** User role updated
**Includes:** UC-1.1 (Login)

### UC-9.4: View Database Statistics
**Actor:** Admin
**Preconditions:** Admin is authenticated
**Main Flow:**
1. Admin accesses database tab
2. System displays total users, admin count, table statistics
3. Admin reviews system health

**Postconditions:** Admin sees database overview
**Includes:** UC-1.1 (Login)

---

## Summary of Key Changes

### Added Use Cases
1. **Admin-specific use cases**: User management, database overview
2. **Passive/View-only use cases**: View existing data without performing new searches
3. **Case management**: Create, view, update cases
4. **Dashboard**: Central overview for all users

### Corrected Relationships
- Login is now a base use case `<<included>>` by all authenticated actions
- Admin inherits all Investigator capabilities
- Passive use cases distinguished from active analysis
- `<<extends>>` used for optional customization (e.g., Customize Report extends Generate Report)

### Actor Clarifications
- **Investigator**: Regular authenticated user
- **Admin**: Elevated privileges, inherits Investigator capabilities
- **Guest**: Unauthenticated user (limited to login/register)

### Use Case Naming Convention
- **Active**: "Perform X", "Start X", "Create X" (triggers new action/analysis)
- **Passive**: "View X", "Browse X", "Access X" (reads existing data)
- **Admin**: "Manage X", "Configure X" (administrative functions)
