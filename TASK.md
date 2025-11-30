# Medical Store Audit - Development Task List

## 🔴 CRITICAL PRIORITY (Do First)

### [ ] 1. Implement Pagination System
- [ ] Add server-side pagination to all data tables
- [ ] Set default page size to 25-50 items
- [ ] Implement page navigation controls (Previous, Next, Page numbers)
- [ ] Add "Items per page" selector (25, 50, 100)
- [ ] Apply pagination to:
  - [ ] Products/Inventory page
  - [ ] Stock receipts page
  - [ ] Suppliers page
  - [ ] Sales records page
  - [ ] Purchase orders page
- [ ] Test performance with large datasets (1000+ records)
- [ ] Ensure mobile responsiveness of pagination controls

**Priority**: CRITICAL - App will crash/slow down with large datasets without this

---

### [ ] 2. Box-based Inventory System
**Context**: Pakistani pharmacies buy in boxes but sell by individual items (tablets, injections, etc.)

#### Database Schema Updates
- [ ] Add new fields to `products` table:
  - [ ] `items_per_box` (integer) - Number of items (tablets/injections) in one box
  - [ ] `price_per_box` (decimal) - Purchase price per box
  - [ ] `price_per_item` (decimal, calculated) - Auto-calculated: price_per_box / items_per_box
  - [ ] `selling_unit` (enum: 'box', 'item', 'both') - How this product is sold
- [ ] Update `stock_receipts` table:
  - [ ] `boxes_received` (integer) - Number of boxes received
  - [ ] `total_items` (integer, calculated) - boxes_received × items_per_box
- [ ] Create migration script for existing data (default: 1 item per box for legacy records)

#### Frontend Updates
- [ ] **Product Entry Form**:
  - [ ] Add "Items per Box" field
  - [ ] Add "Price per Box" field
  - [ ] Auto-calculate and display "Price per Item"
  - [ ] Add "Selling Unit" dropdown (Box/Item/Both)
- [ ] **Stock Receipt Form**:
  - [ ] Change "Quantity" to "Boxes Received"
  - [ ] Display: "Total Items: X" (auto-calculated)
  - [ ] Update stock tracking logic to use total items internally
- [ ] **Billing/Sales Form**:
  - [ ] If selling_unit = 'box': Allow only box quantities
  - [ ] If selling_unit = 'item': Allow only item quantities
  - [ ] If selling_unit = 'both': Add dropdown to select "Sell by Box" or "Sell by Item"
  - [ ] Auto-calculate price based on selected unit
  - [ ] Display clear labels: "3 boxes of Calpol" vs "10 tablets of Calpol"
- [ ] **Inventory Display**:
  - [ ] Show both: "50 boxes (500 tablets)" format
  - [ ] Low stock alerts should work on item count, not box count

#### Testing
- [ ] Test with different box sizes (10, 20, 50, 100 items per box)
- [ ] Test selling same medicine in both boxes and items
- [ ] Verify stock calculations are accurate
- [ ] Test edge cases: partial boxes, fractional items

**Priority**: CRITICAL - Core business requirement for Pakistani market

---

### [ ] 3. Make Dashboard Cards Clickable
**Context**: Cards already exist, just need to make them actionable

- [ ] **Low Stock Card**:
  - [ ] Add onClick handler
  - [ ] Navigate to `/inventory` page
  - [ ] Apply filter: `quantity <= 10`
  - [ ] Pre-populate filter UI to show active filter
  - [ ] Add visual indicator (hover effect, cursor pointer)
  
- [ ] **Near Expiry Card**:
  - [ ] Add onClick handler
  - [ ] Navigate to `/inventory` page
  - [ ] Apply filter: `expiry_date <= today + 15 days`
  - [ ] Pre-populate date range filter
  
- [ ] **Sales Card**:
  - [ ] Add onClick handler
  - [ ] Navigate to `/sales` page
  - [ ] Apply filter: `created_at = today`
  - [ ] Show today's sales details
  
- [ ] **[Fourth Card - TBD]**:
  - [ ] Identify what the fourth card shows
  - [ ] Implement appropriate navigation
  
- [ ] **Mobile Optimization**:
  - [ ] Test card click behavior on mobile devices
  - [ ] Ensure no conflicts with swipe gestures
  - [ ] Add tactile feedback (ripple effect)

**Priority**: HIGH - Major UX improvement, especially for mobile users

---

### [ ] 4. Fix Daily Sales Record Download
**Context**: Previously agreed feature that is currently broken

- [ ] Investigate current download functionality error
- [ ] Fix PDF generation for daily sales
- [ ] Ensure correct data is included:
  - [ ] Date range
  - [ ] All transactions
  - [ ] Total sales amount
  - [ ] Payment methods breakdown
- [ ] Add CSV export option as alternative
- [ ] Test with different date ranges
- [ ] Verify download works on mobile devices

**Priority**: HIGH - Core business functionality

---

## 🟡 HIGH PRIORITY (Do Soon)

### [ ] 5. Medicine Reference Database
**Context**: Separate from inventory - master list of medicines in Pakistan

#### Database Schema
- [ ] Create new table: `medicine_reference`
  - [ ] `id` (primary key)
  - [ ] `generic_name` (text) - e.g., "Paracetamol"
  - [ ] `brand_name` (text) - e.g., "Panadol", "Calpol"
  - [ ] `formula` (text) - Chemical composition
  - [ ] `manufacturer` (text) - Pharmaceutical company
  - [ ] `category` (text) - antibiotic, painkiller, antacid, etc.
  - [ ] `dosage_form` (enum) - tablet, capsule, syrup, injection, cream, etc.
  - [ ] `standard_packaging` (text) - "10 tablets per strip, 10 strips per box"
  - [ ] `strength` (text) - e.g., "500mg", "5ml"
  - [ ] `prescription_required` (boolean)
  - [ ] `controlled_substance` (boolean)
  - [ ] `created_at`, `updated_at`

#### Frontend Features
- [ ] Create "Medicine Database" page (separate from inventory)
- [ ] Add search functionality:
  - [ ] Search by generic name, brand name, formula
  - [ ] Filter by category, manufacturer, dosage form
- [ ] When adding products to inventory:
  - [ ] Add "Search Medicine Database" option
  - [ ] Auto-populate fields if medicine found in reference DB
  - [ ] Allow manual entry if not found
- [ ] Admin functionality to add/edit reference medicines

**Priority**: HIGH - Reduces data entry errors and standardizes medicine info

---

### [ ] 6. Medicine Data Sourcing Strategy

#### Phase 1: Research dawaai.pk
- [ ] Check `robots.txt` at https://dawaai.pk/robots.txt
- [ ] Review Terms of Service for scraping permissions
- [ ] Check if they have a public API
- [ ] Research rate limiting requirements
- [ ] Determine if proxy is needed (test from Pakistan IP first)

#### Phase 2: Ethical Data Collection Decision
**Option A: API (Preferred)**
- [ ] Contact dawaai.pk for API access
- [ ] Check for free tier or educational use

**Option B: Manual Seed Data (Fallback)**
- [ ] Identify top 200-300 most common medicines in Pakistan
- [ ] Manually enter initial dataset
- [ ] Build community contribution features for users to add medicines

**Option C: Respectful Web Scraping (Last Resort)**
- [ ] Only if Options A & B fail and legally permissible
- [ ] Implement with:
  - [ ] Respectful delays (2-5 seconds between requests)
  - [ ] User-Agent identification
  - [ ] Time-based throttling (only scrape during off-peak hours)
  - [ ] One-time seed, not continuous scraping
- [ ] Use Python (BeautifulSoup/Selenium) or Node.js (Puppeteer)
- [ ] Tools needed:
  - [ ] Python: `beautifulsoup4`, `requests`, `pandas`
  - [ ] OR Node.js: `puppeteer`, `cheerio`
- [ ] Store scraped data locally, then import to database

#### Phase 3: Implementation
- [ ] Wait for user decision on approach
- [ ] Implement chosen method
- [ ] Validate data quality
- [ ] Import to `medicine_reference` table

**Priority**: HIGH - Depends on Phase 1 research results

---

### [ ] 7. Sales Receipt Generation
**Context**: Previously agreed feature

- [ ] Add "Generate Receipt" button on sales page
- [ ] Design receipt template:
  - [ ] Store/pharmacy name and address
  - [ ] Date and time of sale
  - [ ] Receipt number
  - [ ] List of items with quantities and prices
  - [ ] Subtotal, tax (if applicable), total
  - [ ] Payment method
  - [ ] Footer with thank you message
- [ ] Implement PDF generation
- [ ] Add "Print Receipt" option
- [ ] Add "WhatsApp Receipt" option (image format)
- [ ] Test thermal printer compatibility (common in Pakistan)

**Priority**: HIGH - Customer-facing feature

---

### [ ] 8. Performance Optimization
**Context**: Improve app loading speed

#### Audit Current Performance
- [ ] Run Lighthouse audit on production build
- [ ] Identify bottlenecks:
  - [ ] Bundle size
  - [ ] Database query performance
  - [ ] API response times
  - [ ] Image optimization

#### Optimizations
- [ ] **Frontend**:
  - [ ] Implement code splitting
  - [ ] Lazy load components
  - [ ] Optimize images (WebP format)
  - [ ] Enable service worker for caching
  - [ ] Minimize bundle size
- [ ] **Backend/Database**:
  - [ ] Add database indexes for frequently queried fields
  - [ ] Optimize Supabase RLS policies
  - [ ] Implement query result caching
  - [ ] Use database connection pooling
- [ ] **Targeted Load Time**: Under 3 seconds on 3G connection

**Priority**: HIGH - User retention depends on performance

---

## 🟢 MEDIUM PRIORITY

### [ ] 9. Manual Supplier Contact Management (Supply Chain Phase 1)
**Context**: First phase before reaching out to pharmaceutical companies

#### Database Schema
- [ ] Update `suppliers` table:
  - [ ] `contact_person` (text)
  - [ ] `phone` (text)
  - [ ] `whatsapp` (text)
  - [ ] `email` (text)
  - [ ] `address` (text)
  - [ ] `city` (text)
  - [ ] `province` (text)
  - [ ] `postal_code` (text)
  - [ ] `latitude` (decimal, nullable)
  - [ ] `longitude` (decimal, nullable)
  - [ ] `companies_represented` (text array) - List of pharma companies
  - [ ] `is_distributor` (boolean)
  - [ ] `is_manufacturer_rep` (boolean)
  - [ ] `notes` (text)

#### Frontend Features
- [ ] Enhanced supplier form with all new fields
- [ ] "Contact Supplier" quick actions:
  - [ ] Click to call (tel: link)
  - [ ] WhatsApp direct message (wa.me link)
  - [ ] Email (mailto: link)
- [ ] Supplier directory page with:
  - [ ] Search and filter
  - [ ] Sort by location
  - [ ] View on map (if coordinates available)
- [ ] Location-based features:
  - [ ] Request location permission
  - [ ] Show nearest suppliers
  - [ ] Distance calculation

**Priority**: MEDIUM - Builds foundation for future supply chain integration

---

### [ ] 10. Device Management & Security
**Context**: Previously agreed security features

#### Single Device Login
- [ ] Create `user_devices` table:
  - [ ] `user_id`, `device_id`, `device_name`, `last_login`, `is_active`
- [ ] On login:
  - [ ] Generate unique device fingerprint
  - [ ] Check if device is authorized
  - [ ] If new device:
    - [ ] Send verification code to email
    - [ ] Code expires in 15 minutes
    - [ ] Upon verification, deactivate old device
    - [ ] Send security alert to email: "New device logged in"
- [ ] User can manage devices in settings
- [ ] Admin can override device restrictions

#### Security Alerts
- [ ] Email notifications for:
  - [ ] New device login
  - [ ] Password change
  - [ ] Failed login attempts (>3)
  - [ ] Data export activities

**Priority**: MEDIUM - Important for business data security

---

### [ ] 11. Fix/Remove Google Authentication
**Context**: Previously agreed - Google OAuth is currently broken

**Option A: Fix Google OAuth**
- [ ] Review Supabase Google OAuth configuration
- [ ] Test OAuth flow
- [ ] Fix any redirect URI issues
- [ ] Update Google Cloud Console settings if needed

**Option B: Remove Google OAuth (If unfixable)**
- [ ] Remove Google sign-in button from login page
- [ ] Remove Google sign-in button from signup page
- [ ] Keep only email/password authentication
- [ ] Update documentation

**Priority**: MEDIUM - Currently blocking some users, but email auth works

---

### [ ] 12. Disable Public Signup Page
**Context**: Manual account creation for business control

- [ ] Hide/disable signup route
- [ ] Create admin-only "Create Account" page
- [ ] Admin can:
  - [ ] Create user accounts
  - [ ] Set initial password (user changes on first login)
  - [ ] Assign organization
  - [ ] Assign role
  - [ ] Send welcome email with login instructions
- [ ] Public signup page shows: "Contact administrator for account creation"

**Priority**: MEDIUM - Better business control

---

### [ ] 13. Customer Care Integration
**Context**: Previously agreed feature

- [ ] Add customer care phone number in settings
- [ ] Display phone number in:
  - [ ] App footer
  - [ ] Help menu
  - [ ] Error pages ("Need help? Call...")
- [ ] Click-to-call functionality on mobile
- [ ] WhatsApp support option
- [ ] Add "Help & Support" page with:
  - [ ] FAQ section
  - [ ] Contact options
  - [ ] Tutorial videos (future)

**Priority**: MEDIUM - Customer support

---

## 🔵 FUTURE / LONG-TERM

### [ ] 14. Supply Chain Integration with Pharmaceutical Companies (Phase 2)
**Context**: Game-changing feature but requires business development

#### Strategy
- [ ] **Research Phase**:
  - [ ] Identify top 10 pharmaceutical manufacturers in Pakistan
  - [ ] Research their existing distributor networks
  - [ ] Prepare business proposal document
  
- [ ] **Outreach Phase**:
  - [ ] Contact companies (start with 2-3)
  - [ ] Explain win-win value proposition:
    - [ ] Pharmacies find authorized distributors easily
    - [ ] Distributors get more business
    - [ ] Manufacturers ensure authentic supply chain
  - [ ] Request official distributor contact lists
  
- [ ] **Technical Implementation**:
  - [ ] Create `official_distributors` table
  - [ ] Link to pharmaceutical companies
  - [ ] Location-based search
  - [ ] "Find nearest authorized distributor" feature
  - [ ] Direct contact integration

#### Database Schema (Future)
- [ ] `pharmaceutical_companies` table
- [ ] `official_distributors` table with verification status
- [ ] `distributor_products` - what each distributor stocks
- [ ] Location-based search with radius

**Priority**: FUTURE - Requires business partnerships, not just coding

---

### [ ] 15. Android Mobile Application
**Context**: Previously agreed for wider reach

#### Technology Decision
- [ ] **Option A**: React Native (reuse web code)
- [ ] **Option B**: Flutter
- [ ] **Option C**: Progressive Web App (PWA) - Quickest option

#### Features (Subset of Web App)
- [ ] Login/Authentication
- [ ] Dashboard with clickable cards
- [ ] Quick sales entry
- [ ] Barcode scanning
- [ ] Low stock alerts
- [ ] Offline mode (sync when online)
- [ ] Push notifications for:
  - [ ] Low stock alerts
  - [ ] Near expiry alerts
  - [ ] Daily sales summary

#### Deployment
- [ ] Google Play Store (Free to publish first app: $25 one-time)
- [ ] APK direct download option

**Priority**: FUTURE - After web app is stable

---

### [ ] 16. Database Encryption
**Context**: Previously agreed security enhancement

- [ ] Research Supabase encryption options
- [ ] Identify sensitive fields:
  - [ ] Supplier contact information
  - [ ] Sales data
  - [ ] User personal information
- [ ] Implement column-level encryption
- [ ] Ensure performance impact is acceptable
- [ ] Update backup procedures

**Priority**: FUTURE - Nice to have, current RLS provides good security

---

## 📋 ONGOING MAINTENANCE

### [ ] Documentation
- [ ] Keep README.md updated with new features
- [ ] Document database schema changes
- [ ] Create user manual/guide
- [ ] Record tutorial videos (future)

### [ ] Testing
- [ ] Write unit tests for critical functions
- [ ] Test on different devices and browsers
- [ ] Load testing with large datasets
- [ ] User acceptance testing with real pharmacists

### [ ] Bug Fixes
- [ ] Monitor error logs
- [ ] Fix reported issues
- [ ] Improve error handling
- [ ] Add user-friendly error messages

---

## 🎯 NOTES & DECISIONS PENDING

### Questions to Resolve:
1. **Box System**: Do different suppliers provide the same medicine in different box sizes?
2. **Dawaai.pk**: Should we research scraping feasibility first, or start with manual database?
3. **Timeline**: What's the target launch date for initial release?
4. **Fourth Dashboard Card**: What should it display?
5. **Google Auth**: Fix it or remove it?
6. **Budget**: Confirmed $0 budget - all free tools only

### Free Tools Being Used:
- ✅ Supabase (Free tier)
- ✅ GitHub (Free hosting)
- ✅ React (Free framework)
- ✅ Material-UI (Free components)

### Future Costs to Consider:
- Google Play Store: $25 one-time (for Android app)
- Custom domain: ~$10-15/year (optional)
- Supabase paid tier: If database grows beyond free tier limits

---

## 📊 PROGRESS TRACKING

**Critical Tasks**: 0/4 complete
**High Priority Tasks**: 0/4 complete
**Medium Priority Tasks**: 0/5 complete
**Future Tasks**: 0/3 complete

**Next Immediate Steps**:
1. Start with pagination implementation
2. Simultaneously work on box-based inventory system
3. Make dashboard cards clickable
4. Fix sales record download

---

*Last Updated: 2025-11-30*
*Created by: Antigravity AI Assistant*
