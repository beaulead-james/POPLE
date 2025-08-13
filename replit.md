# PO+PLE 포커 커뮤니티 웹사이트

## Overview

This is a Korean poker community website for PO+PLE (포커 플레이어). The project is a single-page application built with HTML and Tailwind CSS via CDN, designed as a modern dark-themed landing page for a poker player community. The website features Korean content with an embedded YouTube video, real tournament posters, and focuses on community features, galleries, and contact information for poker enthusiasts.

## Recent Changes (August 2025)

- **Complete Dark Theme Redesign**: All sections now feature a cohesive dark theme with gradient backgrounds, glassmorphism effects, and premium visual styling
- **YouTube Integration**: Added embedded YouTube video (c2oB0HurMJY) in the hero section with responsive design
- **Real Tournament Content**: Integrated actual JOPT 2025 tournament poster in the gallery section
- **Community Images**: Added user-uploaded community image to second gallery card
- **Company Information**: Updated all contact details with (주)뷰리드 company information including business registration, phone numbers, and address
- **Production Ready**: Removed development guide section and finalized website for deployment
- **Enhanced Interactivity**: Added hover animations, scale effects, and smooth transitions throughout
- **Professional Layout**: Upgraded to premium-quality design with backdrop blur effects and modern card layouts
- **Deployment Configuration**: Fixed deployment issues by configuring proper Production Web Server using Python HTTP server on port 5000 for Replit deployment compatibility
- **Production Server Setup** (August 10, 2025): Updated workflow to use production-ready server.py with security headers instead of basic Python HTTP server for proper deployment health checks
- **Admin Server Unified** (August 10, 2025): Resolved about:blank issues by serving both main site and admin page through single admin server (port 3000), eliminating proxy complexity and ensuring stable access
- **Enhanced Feature Cards** (August 12, 2025): Added 3 additional core feature cards (실시간 통계 분석, 멤버십 혜택, AI 포커 어시스턴트) with unique gradient designs, bringing total to 9 feature cards in responsive 3-column layout
- **Event Cards Redesign** (August 12, 2025): Replaced dynamic event loading with 3 static sample event cards (JOPT 2025, 커뮤니티 모임, 교육 세미나) featuring glassmorphism effects and hover animations
- **Build Issues Fixed** (August 12, 2025): Resolved event cards container errors, eliminated TailwindCSS CDN warnings by implementing local CSS build, and unified event loading system for better performance
- **Deployment Configuration Fixed** (August 12, 2025): Resolved static deployment issues by copying all public directory files to root directory to match Replit's static deployment configuration (publicDir = "/"), ensuring proper index.html accessibility
- **Complete Event Management System** (August 12, 2025): Implemented full-featured event management system with SQLite database, Express.js server, and admin interface supporting CRUD operations, search, filtering, pagination, and markdown editing with real-time preview
- **Unified Brand Theme & Typography** (August 12, 2025): Applied Pretendard font family throughout the project for optimal Korean text rendering, implemented new brand color palette (#0A84FF primary, #00B894 secondary, #FF9F43 accent) with consistent button classes (btn-primary, btn-ghost), status badge mapping, and improved admin UI layout with aligned search bar and table containers for better visual consistency
- **SEO & Social Media Optimization** (August 12, 2025): Added comprehensive Open Graph and Twitter Card meta tags for optimal social media sharing, updated page titles and descriptions to reflect PO+PLE as an all-in-one poker platform, integrated user-provided favicon.png, implemented fixed sidebar layout for admin interface with proper overflow handling and responsive design
- **Access Statistics Management System** (August 13, 2025): Implemented comprehensive analytics system with SQLite backend for tracking page views, unique visitors, and popular pages. Added analytics middleware for automatic logging, admin dashboard with Chart.js visualizations, real-time KPI cards, and detailed traffic analysis. Includes bot filtering, IP hashing for privacy, and responsive analytics interface with 30-day data retention

## User Preferences

Preferred communication style: Simple, everyday language in Korean (한국어).

## System Architecture

### Frontend Architecture
- **Single-page application**: Built with HTML and Tailwind CSS via CDN for rapid development
- **Responsive design**: Uses Tailwind's responsive utility classes for mobile-first design
- **Component-based design**: Modular sections including hero, features, gallery, and contact
- **Korean language support**: All content optimized for Korean text and cultural context
- **Dynamic event loading**: Real-time event data integration from database API with fallback handling

### Backend Architecture
- **Express.js server**: RESTful API server with session-based authentication
- **SQLite database**: File-based database with automated schema management and migrations
- **Event management system**: Complete CRUD operations with search, filtering, and pagination
- **Admin interface**: Full-featured content management system with markdown editor and preview
- **Authentication**: Simple username/password authentication with session management

### Design System
- **Brand colors**: Custom brand color palette ranging from brand-50 to brand-900 with primary color #6366f1
- **Typography**: Tailwind's default font stack optimized for Korean and English text
- **Interactive elements**: Smooth hover effects and transitions using Tailwind utilities
- **Mobile navigation**: Responsive hamburger menu for mobile devices

### Performance Optimizations
- **CDN delivery**: Tailwind CSS loaded via CDN for fast setup and deployment
- **Minimal JavaScript**: Only essential JavaScript for mobile menu functionality
- **Optimized images**: Placeholder support for hero and gallery images

## External Dependencies

### Frontend Dependencies
- **Tailwind CSS 3.4.1**: Loaded via CDN for utility-first CSS framework
- **Marked.js**: Client-side markdown parsing for content preview and rendering
- **Custom theme configuration**: Extended brand color palette defined in JavaScript config
- **Responsive utilities**: Mobile-first responsive design using Tailwind's breakpoint system

### Backend Dependencies
- **Node.js packages**: Express.js, SQLite3, express-session, cookie-parser, marked
- **Database**: SQLite with automated schema creation and data seeding
- **Authentication**: Session-based with configurable admin credentials

### Images and Assets
- **Logo**: Custom PO+PLE logo (logo.png) uploaded by user
- **Event thumbnails**: Dynamic loading from database with fallback placeholder support
- **Gallery images**: Placeholder images that can be replaced with actual content

## API Endpoints

### Public Endpoints
- `GET /` - Main website
- `GET /api/events` - Event listing with filtering and pagination
- `GET /api/events/:id` - Single event by ID
- `GET /api/events/slug/:slug` - Single event by slug
- `GET /event/:identifier` - Event detail page (slug or ID)

### Admin Endpoints (Authentication Required)
- `GET /admin` - Admin dashboard and login
- `POST /admin/login` - Admin authentication
- `POST /admin/logout` - Admin logout
- `POST /api/events` - Create new event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

## Database Schema

### Events Table
- `id` (INTEGER PRIMARY KEY) - Auto-incrementing event ID
- `title` (TEXT NOT NULL) - Event title
- `slug` (TEXT UNIQUE) - URL-friendly identifier
- `content` (TEXT NOT NULL) - Markdown content
- `content_format` (TEXT) - Content format (markdown/html/text)
- `start_date` (TEXT NOT NULL) - Event start date (YYYY-MM-DD)
- `end_date` (TEXT NOT NULL) - Event end date (YYYY-MM-DD)
- `status` (TEXT NOT NULL) - Event status (draft/published/archived)
- `thumbnail_url` (TEXT) - Event thumbnail image URL
- `tags` (TEXT) - Comma-separated tags
- `published_at` (TEXT) - Publication timestamp
- `created_at` (TEXT) - Creation timestamp
- `updated_at` (TEXT) - Last update timestamp (auto-updated via trigger)

The project requires Node.js runtime and can be deployed to any Node.js hosting service.