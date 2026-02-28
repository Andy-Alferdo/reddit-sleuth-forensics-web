

# Add Previously Analyzed Cards to All Modules

## Overview
Replace the empty-state placeholder messages in User Profiling and Analysis tabs with clickable cards showing all previously analyzed items for the current case -- similar to how Monitoring shows target cards.

## What Changes

### 1. User Profiling Page (`src/pages/UserProfiling.tsx`)
- When no profile is being viewed (empty state area, lines 699-706), fetch all `user_profiles_analyzed` records for the current case from the database
- Display a grid of cards, each showing:
  - Username
  - Total karma
  - Account age
  - Analyzed date
- Clicking a card loads that profile's data into the view (same as the existing `loadProfileId` flow)
- Keep the "Enter a username..." message but move it below the cards grid, or show it only when there are no saved profiles

### 2. Analysis Page - Keyword Tab (`src/pages/Analysis.tsx`)
- In the keyword empty state (lines 751-757), fetch `analysis_results` where `analysis_type = 'keyword'` for the current case
- Show cards with: keyword name, total mentions, analyzed date
- Clicking loads the saved keyword analysis data

### 3. Analysis Page - Community Tab
- In the community empty state (lines 1004-1010), fetch `analysis_results` where `analysis_type = 'community'` for the current case
- Show cards with: subreddit name, subscriber count (from result_data), analyzed date
- Clicking loads the saved community analysis data

### 4. Analysis Page - Link Tab
- In the link empty state (lines 1171-1177), fetch `analysis_results` where `analysis_type = 'link'` for the current case
- Show cards with: primary username, total karma, analyzed date
- Clicking loads the saved link analysis data

## Technical Approach

### Data Fetching
- Use `useEffect` to query the database when the component mounts and `currentCase` is set
- Query `user_profiles_analyzed` filtered by `case_id` for user profiling
- Query `analysis_results` filtered by `case_id` and `analysis_type` for each analysis tab
- Listen for `case-data-updated` custom events to refresh cards after new analyses are saved

### Card Component
- Create a reusable `SavedAnalysisCard` component (`src/components/SavedAnalysisCard.tsx`) that accepts:
  - `title` (username/keyword/subreddit)
  - `subtitle` (karma/mentions/subscribers)
  - `analyzedAt` (date string)
  - `icon` (User/BarChart3/Users/Network)
  - `onClick` handler
- Style similar to `MonitoringTargetCard`: bordered card with hover effect, compact layout

### Loading Saved Data
- For User Profiling: clicking a card sets the `profileData` state directly from the DB record (reuse existing transform logic from `loadProfileId`)
- For Analysis tabs: clicking a card sets the respective tab data (`keywordData`, `communityData`, `linkData`) from the `result_data` JSON column

### Empty State
- When there are saved items: show the card grid with a subtle "analyze more" prompt
- When there are no saved items: show the current empty state (icon + message)

## Files to Create
1. `src/components/SavedAnalysisCard.tsx` -- reusable card component

## Files to Modify
2. `src/pages/UserProfiling.tsx` -- add saved profiles grid in empty state
3. `src/pages/Analysis.tsx` -- add saved analysis grids in each tab's empty state

