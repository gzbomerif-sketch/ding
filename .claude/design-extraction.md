# Design Extraction: CrownCoins Master Tracker

**Source URL**: https://music.cobrand.com/promote/e6fd8188-da11-4018-b3e9-ff011205bd76/share/

## Overview
A campaign tracking dashboard for music promotion campaigns operated by InClips Media (Streamline Music Group). The interface displays budget tracking, campaign performance, and social media audio content management.

---

## Design System

### Typography
- **Font Family**: Inter (Google Fonts)
- **Weights Available**: 100, 200, 300, 400, 500, 600, 700, 800, 900
- **Loading Strategy**: font-display: swap
- Modern, clean, versatile typeface for hierarchical content

### Brand Identity
- **Organization**: InClips Media (Streamline Music Group)
- **Logo**: Positioned in header with click-through to inclipsmedia.com
- **Whitelabel**: Custom branded dashboard experience

---

## Layout Structure

### Header Section
- Top navigation bar with logo
- Light/white background
- Clickable logo element
- Brand identity emphasis

### Main Content Area
Campaign dashboard with hierarchical organization:

#### Primary Campaign Card
- **Title**: "CrownCoins Master Tracker"
- **Status**: ENABLED indicator
- **Budget Display**:
  - Total Budget: $150,000 USD
  - Current Spend: $100,000 USD
  - Spend Committed: $0
- **Visual Elements**: Likely progress bar or gauge showing budget utilization (66.67% spent)

#### Sub-Campaign Cards (Activations)
Two campaign activation cards, each displaying:

**Card 1**: "CrownCoins Open Creative (Goal: 167 Million Views)"
- Spend: $50,000
- Brand: CrownCoins Casino
- Segment data with social sounds
- Instagram platform focus

**Card 2**: "CrownCoins Open Creative (Goal: 400 Million Views)"
- Spend: $50,000
- Brand: CrownCoins Casino
- Segment data with social sounds
- Instagram platform focus

---

## Component Patterns

### Campaign Cards
- Card-based layout system
- Nested expandable sections
- Hierarchical data organization
- Budget and spend metrics prominently displayed

### Data Visualization Elements
- **Progress Tracking**: Budget vs. Spend visualization
- **Metric Displays**: Financial data ($USD format)
- **Status Indicators**: ENABLED/DISABLED states
- **View Goals**: Large numbers (167M, 400M) emphasized

### Audio Content Management
- Scrollable list or tabbed interface for sound management
- 100+ audio tracks per campaign segment
- Platform-specific organization (Instagram)
- Social sound references with IDs and titles

---

## UI Patterns & Interactions

### Expected Interactive Elements
1. **Navigation**: Header with logo link
2. **Campaign Expansion**: Collapsible/expandable campaign details
3. **Audio List**: Scrollable sound library within each segment
4. **Budget Visualization**: Interactive progress or chart components
5. **Status Toggles**: Campaign enable/disable controls (if admin view)

### Data Organization
- Hierarchical structure: Campaign → Activations → Segments → Social Sounds
- Financial tracking at multiple levels
- Platform-specific data (Instagram focus)
- Large-scale view goal tracking (millions of views)

---

## Design Characteristics

### Visual Style (Inferred)
- Clean, professional dashboard aesthetic
- Data-first presentation
- Card-based modular layout
- Financial metrics prominently displayed
- Status and progress indicators
- Organized hierarchy for complex data

### Color Scheme (Inferred from Context)
- Professional/corporate palette
- Likely uses neutral backgrounds (white/light gray)
- Accent colors for status indicators
- Financial data highlighting
- Brand color integration for CrownCoins Casino

### Spacing & Layout
- Generous whitespace for readability
- Card-based grid system
- Clear visual hierarchy
- Nested indentation for sub-items
- Consistent padding/margins

---

## Technical Architecture

### Data Structure
- JSON-based data organization
- RESTful or GraphQL API integration likely
- Real-time or periodic data updates
- Complex nested relationships (campaigns → activations → segments → sounds)

### Platform Integration
- Instagram social sound tracking
- Music promotion campaign management
- Budget allocation and tracking
- Performance metrics (view goals)

---

## Key Features

1. **Campaign Management**
   - Multiple campaign tracking
   - Budget allocation
   - Spend monitoring
   - Status management

2. **Financial Tracking**
   - Total budget display
   - Current spend tracking
   - Committed spend tracking
   - Per-activation budget allocation

3. **Audio Content Library**
   - Extensive social sound catalogs
   - Platform-specific organization
   - Track identification and management

4. **Performance Goals**
   - View count objectives (millions)
   - Progress toward goals
   - Campaign-level metrics

5. **Brand Integration**
   - Whitelabel customization
   - Multiple brand support (CrownCoins Casino)
   - Organization hierarchy

---

## Implementation Notes

### Likely Tech Stack
- React or similar component-based framework
- Google Fonts integration (Inter)
- JSON data handling
- Responsive design patterns
- Card-based UI library (possibly Material-UI, Ant Design, or custom)

### Key UI Components Needed
1. Header with logo and navigation
2. Campaign card component (reusable)
3. Budget/spend progress visualization
4. Status badge/indicator component
5. Expandable/collapsible sections
6. Scrollable list for audio tracks
7. Metric display components (large numbers, currency)
8. Grid/flex layout system for cards

### Responsive Considerations
- Mobile-friendly card stacking
- Collapsible sections for small screens
- Touch-friendly interaction targets
- Scrollable content areas

---

## Next Steps for Implementation

To accurately replicate this design, I would need:

1. **Visual Screenshot**: Actual rendered page appearance
2. **Color Values**: Specific hex codes for backgrounds, text, accents
3. **Spacing Values**: Exact padding/margin measurements
4. **Component Details**: Button styles, card shadows, borders
5. **Interactive States**: Hover effects, active states, transitions
6. **Responsive Breakpoints**: Layout changes for different screen sizes

The page appears to be a JavaScript-heavy SPA (Single Page Application), so direct HTML extraction is limited. A screenshot or live browser inspection would provide complete visual styling details.
