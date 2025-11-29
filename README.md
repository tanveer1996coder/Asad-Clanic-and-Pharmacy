# 🏥 MedixFlow - Medical Store Management System

> A comprehensive, enterprise-level web application for managing medical stores, pharmacies, and clinics with real-time inventory tracking, purchase order management, and customer analytics.

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://tanveer1996coder.github.io/Asad-Clanic-and-Pharmacy/)
[![React](https://img.shields.io/badge/React-18.2.0-blue)](https://reactjs.org/)
[![Material-UI](https://img.shields.io/badge/Material--UI-5.14.20-blue)](https://mui.com/)
[![Supabase](https://img.shields.io/badge/Supabase-2.0-green)](https://supabase.com/)

## 🌟 Overview

MedixFlow is a modern, feature-rich medical store management system designed specifically for pharmacies and medical supply stores. Built with React and Supabase, it provides a seamless experience for managing inventory, sales, customers, suppliers, and purchase orders.

**Live Application:** [https://tanveer1996coder.github.io/Asad-Clanic-and-Pharmacy/](https://tanveer1996coder.github.io/Asad-Clanic-and-Pharmacy/)

## ✨ Key Features

### 📦 Inventory Management
- **Real-time Stock Tracking** - Monitor product quantities in real-time
- **Expiry Date Management** - Automatic alerts for products expiring within 15 days (configurable)
- **Low Stock Alerts** - Notifications when stock falls below minimum threshold (default: 10 units)
- **Batch Tracking** - Track products by batch number and expiry date
- **Product Categories** - Organize products by category for easy management
- **Barcode Scanner Integration** - Quick product lookup using barcode scanner

### 💰 Sales & Billing
- **Quick Sale Interface** - Fast and intuitive POS system
- **Professional Receipt Generation** - Thermal printer-ready receipts
- **WhatsApp Receipt Sharing** - Send receipts directly via WhatsApp
- **Receipt Image Download** - Save receipts as images
- **Customer History Tracking** - View customer purchase history
- **Multi-payment Support** - Handle cash, card, and other payment methods
- **Daily Sales Reports** - Download daily sales records as Excel files
- **Sales Analytics** - Visual charts and statistics for sales trends

### 👥 Customer Management
- **Customer Database** - Maintain comprehensive customer records
- **Phone & Address Tracking** - Store customer contact information
- **Purchase History** - View complete purchase history per customer
- **Frequent Items Analysis** - Identify most-purchased items per customer
- **Customer Search** - Quick search by name or phone number

### 🏢 Supplier Management
- **Supplier Directory** - Manage supplier information and contacts
- **Multiple Contacts** - Store multiple contact persons per supplier
- **Direct WhatsApp Contact** - Quick WhatsApp links to suppliers
- **Supplier Performance Tracking** - Monitor delivery and pricing history
- **Mobile-Responsive Cards** - Beautiful card view on mobile devices

### 📋 Purchase Order System
- **Create Purchase Orders** - Easy PO creation with supplier and product selection
- **PO Status Tracking** - Track orders through Draft → Sent → Receiving → Completed
- **Receipt Modals** - Professional PO receipts with download and share options
- **WhatsApp Integration** - Share POs as images via WhatsApp (native share on mobile)
- **PDF Generation** - Generate professional PDF documents
- **Stock Receiving** - Record received stock with actual prices
- **Partial Receiving** - Support for multiple deliveries per PO
- **Auto Stock Update** - Stock quantities update automatically upon receiving

### 📊 Reports & Analytics
- **Dashboard** - Real-time overview of sales, inventory, and alerts
- **Sales Reports** - Detailed sales analysis with date range filtering
- **Profit Tracking** - Monitor profit margins and revenue
- **Top Products** - Identify best-selling products
- **Expiry Reports** - List of products near expiry
- **Low Stock Reports** - Products below minimum stock level
- **Export to Excel** - Download reports in CSV/Excel format
- **Visual Charts** - Bar charts, pie charts, and trend graphs using Recharts

### 🔐 Security & Authentication
- **Email Authentication** - Secure login with email and password
- **Row Level Security (RLS)** - Database-level security policies
- **Multi-user Support** - Role-based access (ready for expansion)
- **Organization Isolation** - Each organization has isolated data
- **Soft Delete** - Deleted records are archived, not permanently removed

### 📱 Mobile Responsiveness
- **Fully Responsive Design** - Works seamlessly on all devices
- **Mobile-First Tables** - Horizontal scrolling on small screens
- **Stacking Headers** - Buttons and titles stack vertically on mobile
- **Touch-Friendly** - Optimized for touch interactions
- **Card Views** - Dedicated card layouts for mobile (Suppliers, Products)
- **Native Share Support** - Web Share API integration for mobile

### 🎨 User Experience
- **Material Design** - Modern, clean UI using Material-UI
- **Dark Mode Ready** - Theme-aware components (expandable)
- **Toast Notifications** - Real-time feedback for user actions
- **Loading States** - Clear loading indicators
- **Empty States** - Helpful messages when no data exists
- **Search & Filters** - Advanced filtering on all major pages
- **Keyboard Navigation** - Full keyboard support

### ⚙️ Customization
- **Store Settings** - Configure store name, address, phone, owner name
- **Currency Symbol** - Set your preferred currency (default: Rs)
- **Expiry Alert Days** - Customize expiry warning threshold
- **Min Stock Level** - Set global or per-product minimum stock
- **Footer Text** - Customize receipt footer messages
- **Branding** - MedixFlow branding on receipts

### 🛠️ Technical Features
- **Offline-Ready Foundation** - PWA capabilities (expandable)
- **Real-time Updates** - Supabase real-time subscriptions (ready)
- **Optimistic UI Updates** - Instant feedback before server confirmation
- **Error Handling** - Comprehensive error handling and user feedback
- **Performance Optimized** - Efficient data fetching and caching
- **Code Splitting** - Lazy loading for faster initial load (expandable)

## 🚀 Technology Stack

### Frontend
- **React 18.2** - Modern React with hooks
- **Material-UI 5.14** - Component library
- **React Router 6** - Client-side routing
- **Recharts 2.10** - Charts and data visualization
- **React Toastify 9.1** - Toast notifications
- **html2canvas 1.4** - Screenshot/image generation
- **jsPDF 2.5** - PDF generation
- **html5-qrcode 2.3** - Barcode scanning
- **Papaparse 5.4** - CSV parsing/generation

### Backend & Database
- **Supabase** - Backend as a Service
  - PostgreSQL database
  - Row Level Security (RLS)
  - Real-time subscriptions
  - Edge Functions (ready)
  - Storage (ready)

### Development
- **React Scripts 5.0** - Build tooling
- **GitHub Pages** - Deployment
- **Git** - Version control

## 📁 Project Structure

```
Medical Store Audit/
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       │   ├── auth/              - Authentication components
│       │   ├── customers/         - Customer management
│       │   ├── dashboard/         - Main dashboard
│       │   ├── products/          - Product management
│       │   ├── purchaseOrders/    - Purchase order system
│       │   ├── reports/           - Reports & analytics
│       │   ├── sales/             - Sales & POS
│       │   ├── settings/          - App settings
│       │   ├── shared/            - Shared components
│       │   ├── stock/             - Stock management
│       │   └── suppliers/         - Supplier management
│       ├── hooks/                 - Custom React hooks
│       ├── utils/                 - Utility functions
│       │   ├── dateHelpers.js     - Date formatting
│       │   ├── formatters.js      - Number/currency formatting
│       │   ├── poPdfGenerator.js  - PO PDF generation
│       │   ├── printPO.js         - PO printing
│       │   ├── printReceipt.js    - Receipt printing
│       │   └── whatsappHelper.js  - WhatsApp integration
│       ├── App.js                 - Main app component
│       ├── supabaseClient.js      - Supabase configuration
│       └── index.js               - Entry point
├── migration_*.sql                - Database migrations
└── README.md                      - This file
```

## 🗄️ Database Schema

### Core Tables
- **products** - Product catalog with stock and pricing
- **sales** - Sales transactions
- **sale_items** - Individual items in each sale
- **customers** - Customer information
- **suppliers** - Supplier directory
- **supplier_contacts** - Supplier contact persons
- **purchase_orders** - Purchase order headers
- **purchase_order_items** - PO line items
- **stock_receipts** - Stock receiving records
- **settings** - Application settings per organization

### Key Features
- **Soft Deletes** - All tables support soft delete via `deleted_at`
- **Audit Trails** - Created/updated timestamps on all records
- **Organization Isolation** - Data segregated by `organization_id`
- **Foreign Keys** - Referential integrity maintained
- **Computed Columns** - Virtual columns for derived data

## 🎯 Use Cases

### For Pharmacies
- Track medicine inventory with batch and expiry
- Generate professional bills and receipts
- Monitor fast-moving and slow-moving drugs
- Manage customer prescriptions and history
- Order stock from pharmaceutical suppliers

### For Medical Supply Stores
- Manage diverse medical equipment inventory
- Track warranties and expiry dates
- Handle B2B and B2C sales
- Coordinate with multiple suppliers
- Generate detailed sales reports

### For Clinics
- Track medical supplies and consumables
- Monitor usage patterns
- Reorder essential items automatically
- Maintain patient purchase history
- Integrated billing system

## 🔧 Setup & Installation

### Prerequisites
- Node.js 14+ and npm
- Supabase account
- Git

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/tanveer1996coder/Asad-Clanic-and-Pharmacy.git
   cd Asad-Clanic-and-Pharmacy/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Supabase**
   - Create a project at [supabase.com](https://supabase.com)
   - Run the migration SQL files in order (v1 through v6)
   - Update `src/supabaseClient.js` with your Supabase URL and anon key

4. **Start development server**
   ```bash
   npm start
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

6. **Deploy to GitHub Pages**
   ```bash
   npm run deploy
   ```

## 📱 Mobile Support

The application is fully optimized for mobile devices:
- **Responsive Tables** - All tables scroll horizontally on small screens
- **Mobile Navigation** - Touch-friendly navigation
- **Native Sharing** - Use device's native share for WhatsApp/images
- **Camera Integration** - Barcode scanning using device camera
- **Touch Gestures** - Swipe, tap, and pinch support

## 🔮 Roadmap

### Planned Features
- [ ] Multi-language support (Urdu, English)
- [ ] Advanced role-based permissions
- [ ] SMS notifications integration
- [ ] Automated reordering suggestions
- [ ] Prescription management
- [ ] Supplier payment tracking
- [ ] Employee management
- [ ] Attendance tracking
- [ ] Android/iOS mobile apps
- [ ] Offline mode with sync
- [ ] Multiple store locations
- [ ] Franchise management

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed for use by Asad Clinic and Pharmacy.

## 👨‍💻 Developer

**MedixFlow** - Designed and developed for modern medical store management.

Contact: +923089020131

## 🙏 Acknowledgments

- Built with React and Material-UI
- Powered by Supabase
- Recharts for beautiful analytics
- Icons from Material Design Icons

---

**Made with ❤️ for better healthcare management**
