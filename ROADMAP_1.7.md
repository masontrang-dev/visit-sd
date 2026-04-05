# ROADMAP 1.7 — Polish & Standout Features

> Improvements and features to make Visit SD a standout, production-ready application.

**Priority Legend**: 🔴 P0 (Critical) · 🟡 P1 (High) · 🟢 P2 (Medium) · 🔵 P3 (Nice-to-have)

---

## 🎯 High-Impact Quick Wins

### Search & Discovery

- [ ] 🔴 **Search Functionality**
  - Add search bar in FilterBar component
  - Real-time filtering by restaurant name
  - Highlight search matches in results
  - Clear search button
  - Keyboard shortcut (Cmd/Ctrl + K)

- [ ] 🟢 **Smart Random Recommendation**
  - "Feeling adventurous?" button
  - Weight by Must-Try status
  - Avoid recently visited spots
  - Prefer different cuisines than recent visits

- [ ] 🟢 **Nearby Recommendations**
  - Show "Nearby spots" on detail page
  - Use lat/lng to find restaurants within 1 mile
  - Sort by distance
  - Show distance in results

### Sharing & Social

- [ ] 🔴 **Share Individual Restaurants**
  - Add "Share" button on detail pages
  - Copy link to clipboard with toast confirmation
  - Add Open Graph meta tags for rich previews
  - Include restaurant photo, name, cuisine in preview

- [ ] 🟡 **SEO & Metadata Improvements**
  - Add Open Graph meta tags per restaurant
  - Generate dynamic sitemap.xml
  - Add JSON-LD structured data for restaurants
  - Proper title/description per page
  - Twitter Card support

- [ ] 🟢 **Public Favorites/Bookmarking**
  - "❤️ Save" button for public visitors
  - Store favorites in localStorage
  - "My Favorites" filter view
  - Persist across sessions (no login required)
  - Show count of saved restaurants

---

## 🍽️ Restaurant Data Enhancements

### Filtering & Organization

- [ ] 🟡 **Dietary Filters**
  - Add dietary tags: Vegetarian, Vegan, Gluten-free, Halal, Kosher
  - Store as array in database (new column: `dietary_tags`)
  - Add filter pills in FilterBar
  - Multi-select support
  - Show tags on cards

- [ ] 🟡 **Price Range Filter**
  - Add price filter buttons ($, $$, $$$, $$$$)
  - Allow multi-select (e.g., $ and $$)
  - Integrate with existing FilterBar

- [ ] 🟢 **"Perfect For" Tags**
  - Add occasion tags: Date night, Family-friendly, Large groups, Quick lunch, Late night, Outdoor seating, Work meetings
  - Store as array in database (new column: `perfect_for`)
  - Filter by occasion
  - Show as badges on cards

### Hours & Availability

- [ ] 🟡 **Restaurant Hours**
  - Add hours field to database (JSONB)
  - Auto-populate from Google Places API
  - Manual override in admin
  - Show "Open now" badge using current time
  - Display hours on detail page
  - Warn if restaurant is closed

### Photos & Media

- [ ] 🟢 **Photo Gallery**
  - Support multiple photos per restaurant
  - Create `restaurant_photos` table
  - Carousel/gallery on detail page
  - Upload photos from visit tracking
  - Set primary photo
  - Delete photos

- [ ] 🟡 **Improved Photo Handling**
  - Enforce aspect ratio (16:9 or 4:3)
  - Better image optimization
  - Lazy loading with intersection observer
  - Blur-up placeholder effect
  - Error handling with fallback image

---

## 💎 UX/UI Polish

### Mobile Optimization

- [ ] 🔴 **Mobile Filter UX**
  - Horizontal scroll for filter pills on mobile
  - Collapsible filter sections
  - Bottom sheet UI for filters
  - Sticky filter bar

- [ ] 🔴 **Touch Target Improvements**
  - Ensure minimum 44px touch targets
  - Larger buttons on mobile
  - Better spacing between interactive elements

- [ ] 🟡 **Mobile Map Optimization**
  - Improve map controls for touch
  - Better marker clustering
  - Swipeable info windows
  - "Center on me" button

### Loading & Empty States

- [ ] 🟡 **Skeleton Screens**
  - Replace "Loading..." with skeleton cards
  - Match card layout exactly
  - Animated shimmer effect
  - Show during initial load and refetch

- [ ] 🟢 **Contextual Empty States**
  - Custom messages per filter
  - Suggestions for next action
  - Illustrations or icons
  - "Add first X" CTA for admins

### Micro-interactions

- [ ] 🟢 **Animation Polish**
  - Card hover lift effect (transform: translateY)
  - Filter button ripple effect
  - Success checkmark animation on visit mark
  - Smooth scroll to filtered sections
  - Toast notifications for actions

- [ ] 🟢 **Dark Mode Refinement**
  - Test all images in dark mode
  - Add subtle glow on accent colors
  - Verify all states (hover, active, disabled)
  - Ensure proper contrast ratios

### Navigation

- [ ] 🟢 **Breadcrumbs**
  - Add breadcrumb trail: Home > Mexican > Tacos El Gordo
  - Preserve filter state in back navigation
  - Show current location in hierarchy

- [ ] 🔵 **Keyboard Shortcuts**
  - Esc to close modals
  - Cmd/Ctrl + K for search
  - Arrow keys in filter navigation
  - Enter to submit forms

---

## 🔧 Technical Improvements

### Performance

- [ ] 🟡 **Performance Optimization**
  - Implement virtual scrolling for 100+ restaurants
  - Add service worker for offline viewing
  - Cache restaurant data in localStorage with TTL
  - Use Next.js Image component everywhere
  - Code splitting for admin routes

- [ ] 🟢 **Error Boundaries**
  - Add React error boundaries around major sections
  - Friendly error messages with retry button
  - Log errors to Supabase for monitoring
  - Fallback UI for broken components

### Data & Analytics

- [ ] 🟢 **Enhanced Analytics**
  - Track which restaurants are viewed most
  - Track filter usage patterns
  - Track map vs list view preference
  - Add "Popular this week" section
  - Track search queries

- [ ] 🔵 **Export/Backup**
  - Export restaurants to CSV (admin)
  - Generate printable PDF guide
  - Export to Google Maps list
  - Backup all data button

### Validation & Security

- [ ] 🟡 **Data Validation**
  - Validate all form inputs
  - Sanitize user input
  - Check photo URLs before saving
  - Validate coordinates
  - Prevent duplicate entries

- [ ] 🟢 **Rate Limiting**
  - Add rate limiting to admin endpoints
  - Prevent abuse of public endpoints
  - Implement request throttling

---

## 🌟 Standout Features

### Visit Tracking Enhancements

- [ ] 🟢 **Visit Notes/Reviews**
  - Add optional notes when marking as visited
  - "What did you order?" field
  - "Would you return?" rating
  - Show notes in visit history
  - Filter by rating

- [ ] 🔵 **Visit Streaks & Gamification**
  - Track admin stats: "🔥 5-day boba streak!"
  - "🏆 Visited 10 different cuisines this month"
  - "📍 Explored 3 new neighborhoods"
  - Achievement badges
  - Stats dashboard

### Collaborative Features

- [ ] 🟢 **Multi-Admin Collaboration**
  - Vote on must-try status
  - Competing notes from different admins
  - Timeline view of who added what
  - Activity feed
  - Admin attribution on all actions

### Smart Features

- [ ] 🔵 **Weather-Aware Suggestions**
  - Integrate weather API (OpenWeather)
  - Suggest outdoor patios on sunny days
  - Cozy indoor spots on rainy days
  - Ice cream shops when hot
  - Weather badge on cards

- [ ] 🔵 **Integration with External Services**
  - DoorDash links
  - Uber Eats links
  - Yelp reviews
  - OpenTable reservations
  - Google Reviews rating

---

## 🎨 Design System

### Component Library

- [ ] 🟢 **Toast Notifications**
  - Success/error/info toasts
  - Auto-dismiss with timer
  - Action buttons in toasts
  - Stack multiple toasts
  - Position: top-right

- [ ] 🟢 **Dropdown Menus**
  - Reusable dropdown component
  - Keyboard navigation
  - Click outside to close
  - Use for action menus

- [ ] 🟢 **Tabs Component**
  - For organizing detail page sections
  - Keyboard navigation
  - URL hash support
  - Animated indicator

- [ ] 🟢 **Badge Component**
  - Standardized pill badges
  - Variants: default, accent, success, warning
  - Sizes: sm, md, lg
  - Removable badges

- [ ] 🔵 **Avatar Component**
  - For user attribution
  - Initials fallback
  - Size variants
  - Status indicators

---

## 🚨 Bug Fixes & Critical Issues

- [ ] 🔴 **Version Number Sync**
  - Add `NEXT_PUBLIC_APP_VERSION` to .env
  - Update package.json version
  - Auto-sync version from package.json

- [ ] 🔴 **Photo URL Validation**
  - Better validation before saving
  - Test URL accessibility
  - Fallback for broken images
  - Show placeholder if no photo

- [ ] 🟡 **Form Error Handling**
  - Show validation errors inline
  - Prevent submission with invalid data
  - Clear error messages
  - Highlight invalid fields

- [ ] 🟡 **Network Error Handling**
  - Retry failed requests
  - Show offline indicator
  - Queue actions when offline
  - Sync when back online

---

## 📊 Database Migrations

### New Tables

```sql
-- Dietary tags and perfect_for tags
ALTER TABLE restaurants
  ADD COLUMN dietary_tags text[],
  ADD COLUMN perfect_for text[],
  ADD COLUMN hours jsonb;

-- Photo gallery
CREATE TABLE restaurant_photos (
  id bigint generated always as identity primary key,
  restaurant_id bigint references restaurants(id) on delete cascade,
  photo_url text not null,
  is_primary boolean default false,
  caption text,
  uploaded_by text,
  created_at timestamptz default now()
);

ALTER TABLE restaurant_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON restaurant_photos FOR SELECT USING (true);
CREATE POLICY "Anon insert" ON restaurant_photos FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon delete" ON restaurant_photos FOR DELETE USING (true);

-- Visit notes
ALTER TABLE restaurant_visits
  ADD COLUMN notes text,
  ADD COLUMN rating int check (rating between 1 and 5),
  ADD COLUMN dish_ordered text;

-- Analytics enhancements
ALTER TABLE page_views
  ADD COLUMN restaurant_id bigint references restaurants(id) on delete set null,
  ADD COLUMN action text; -- 'view', 'share', 'favorite', etc.
```

---

## 🎯 Implementation Priority

### Phase 1: Core UX (Week 1)
- Search functionality
- Mobile optimization
- Share buttons
- Skeleton screens
- Toast notifications

### Phase 2: Filtering & Data (Week 2)
- Dietary filters
- Price range filter
- Hours & availability
- Photo gallery
- SEO improvements

### Phase 3: Polish & Features (Week 3)
- Smart recommendations
- Public favorites
- "Perfect For" tags
- Visit notes
- Enhanced analytics

### Phase 4: Advanced Features (Week 4+)
- Weather integration
- External service links
- Gamification
- Multi-admin features
- Export/backup

---

## 📝 Notes

- All features should maintain existing design system standards
- Test on mobile devices before marking complete
- Update STANDARDS.md with new patterns
- Add tests for critical features
- Document new environment variables in .env.example
- Keep bundle size under 500KB
- Maintain accessibility standards (WCAG AA)
- All new features should work offline where possible

---

**Last Updated:** March 31, 2026  
**Target Completion:** Q2 2026  
**Version:** 1.7.0
