

# Home Page Redesign - Professional OSINT Dashboard

## Overview
Transform the current minimal Home page into a polished, professional landing experience that matches the quality of established intelligence tools. The redesign adds a hero section with branding, animated background elements, better visual hierarchy, and richer information display.

## Changes

### 1. Add Hero Section with Branding
- Display the mascot logo prominently at the top center with a subtle glow effect
- Show "Intel Reddit" title and "Open-Source Intelligence Platform" subtitle with refined typography
- Add a gradient accent line below the header for visual separation

### 2. Animated Background
- Integrate the existing `MovingBackground` component (floating mascot logos) behind the Home page content for visual depth, similar to how the Login page uses it
- Add a subtle gradient overlay so content remains readable

### 3. Redesigned Action Cards
- Make the two cards (Create New Case / Open Existing Case) larger with hover lift effects (shadow + slight scale transform)
- Add gradient borders on hover instead of flat color borders
- Include subtle icon animations on hover (scale up)
- Add a decorative gradient line/glow at the top of each card

### 4. Enhanced Stats Section
- Redesign the 3 stat cards into a single glassmorphism-style bar with icon indicators for each stat (Shield icon for total, Activity icon for active, Archive icon for closed)
- Add animated count-up effect when numbers load
- Use subtle colored left-border accents for each stat

### 5. Additional Sections
- Add a "Recent Cases" quick-access row showing the 3 most recent cases as small preview cards (case number, name, date, status badge) - clickable to open directly
- Add a footer tagline: "Powered by Open-Source Intelligence" with a subtle opacity

### 6. Visual Polish
- Cards get `backdrop-blur-sm` and semi-transparent backgrounds for glassmorphism feel
- Hover states include `transform scale-[1.02]` and enhanced shadow
- Smooth entrance animations using CSS (fade-in-up on mount)
- Consistent use of `rounded-2xl` for modern card feel

## Technical Details

### Files Modified
- **`src/pages/Home.tsx`** - Complete redesign of the layout with hero section, animated background, redesigned cards, enhanced stats bar, and recent cases section. Add count-up animation hook, entrance animations via CSS classes.
- **`src/index.css`** - Add keyframes for `fade-in-up` entrance animation and glassmorphism utility classes.
- **`tailwind.config.ts`** - Add `fade-in-up` animation to the animation config.

### Key Implementation Notes
- Reuse existing `MovingBackground` component (already built for Login page)
- Reuse existing mascot logo asset (`reddit-sleuth-mascot.png`)
- All existing functionality (case fetching, dialog, search, navigation) stays intact
- No database changes needed
- No new dependencies required

