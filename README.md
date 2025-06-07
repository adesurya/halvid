# 🎬 ShortVideo Platform

Platform web modern untuk menonton dan mengelola video pendek dengan dashboard admin yang powerful dan integrasi cloud storage.

## ✨ Fitur Utama

### 🎭 Frontend (User Experience)
- **TikTok-style Interface** - Interface modern seperti TikTok untuk menonton video
- **Grid View** - Tampilan grid tradisional untuk browsing video
- **Advanced Search** - Pencarian dengan auto-complete dan filter
- **Video Player** - Player video dengan kontrol custom dan keyboard shortcuts
- **Responsive Design** - Tampilan optimal di semua device
- **Real-time Statistics** - Tracking views, likes, dan engagement

### 👨‍💼 Admin Dashboard
- **Comprehensive Video Management** - Upload, edit, delete, dan manage video
- **Category Management** - Kelola kategori video dengan mudah
- **Series Management** - Buat dan kelola series video
- **Analytics Dashboard** - Statistik lengkap video populer dan performa
- **Cloud Storage Integration** - Integrasi penuh dengan Wasabi Cloud Storage
- **User Authentication** - Sistem login admin dengan role-based access
- **Bulk Operations** - Operasi massal untuk video management

### ☁️ Cloud Storage
- **Wasabi Integration** - Penyimpanan video di Wasabi Cloud Storage
- **Automatic Thumbnail Generation** - Generate thumbnail otomatis dari video
- **File Management** - Upload, delete, dan manage file di cloud
- **Storage Analytics** - Monitor penggunaan storage dan statistik

### 📊 Analytics & Statistics
- **Video Performance** - Track views, likes, shares per video
- **Category Performance** - Analisis performa per kategori
- **Upload Trends** - Trend upload dan engagement
- **Real-time Dashboard** - Dashboard real-time dengan charts interaktif

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ dan npm
- MySQL 5.7+ atau 8.0+
- Akun Wasabi Cloud Storage
- FFmpeg (untuk video processing)

### 1. Clone Repository
```bash
git clone https://github.com/your-username/shortvideo-platform.git
cd shortvideo-platform
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment
```bash
# Jalankan setup wizard interaktif
node setup.js

# Atau copy manual
cp .env.example .env
# Edit .env dengan konfigurasi Anda
```

### 4. Setup Database
```bash
# Database akan dibuat otomatis oleh setup.js
# Atau manual:
mysql -u root -p < schema.sql
```

### 5. Start Server
```bash
# Development
npm run dev

# Production
npm start
```

### 6. Access Application
- **Frontend**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin
- **Default Login**: admin / admin123

## 🔧 Configuration

### Environment Variables

Konfigurasi utama di file `.env`:

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=short_video_db

# Wasabi Cloud Storage
WASABI_ACCESS_KEY=your_access_key
WASABI_SECRET_KEY=your_secret_key
WASABI_BUCKET_NAME=your_bucket_name
WASABI_REGION=us-east-1

# Security
SESSION_SECRET=your_session_secret
JWT_SECRET=your_jwt_secret

# Admin
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=admin123
```

### Wasabi Setup

1. **Buat Akun Wasabi**: Daftar di [wasabi.com](https://wasabi.com)
2. **Buat Bucket**: Buat bucket baru di Wasabi Console
3. **Generate Keys**: Buat Access Key dan Secret Key
4. **CORS Configuration**: Set CORS policy untuk bucket:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]
```

## 📁 Project Structure

```
shortvideo-platform/
├── 📂 config/
│   ├── database.js          # Database configuration
│   └── wasabi.js            # Wasabi cloud storage config
├── 📂 controllers/
│   ├── VideoController.js   # Public video controller
│   └── AdminController.js   # Admin dashboard controller
├── 📂 models/
│   ├── VideoModel.js        # Video data model
│   └── AdminModels.js       # Admin models (Category, Series, etc)
├── 📂 middleware/
│   └── adminAuth.js         # Admin authentication middleware
├── 📂 routes/
│   ├── index.js             # Public routes
│   └── admin.js             # Admin routes
├── 📂 views/
│   ├── 📂 admin/            # Admin dashboard views
│   │   ├── layout.ejs       # Admin layout template
│   │   ├── dashboard.ejs    # Dashboard view
│   │   ├── videos.ejs       # Video management
│   │   ├── categories.ejs   # Category management
│   │   ├── series.ejs       # Series management
│   │   └── analytics.ejs    # Analytics dashboard
│   ├── layout.ejs           # Public layout template
│   ├── tiktok-index.ejs     # TikTok-style homepage
│   ├── video-detail.ejs     # Video detail page
│   └── search-results.ejs   # Search results page
├── 📂 public/
│   ├── 📂 css/
│   │   └── style.css        # Frontend styles
│   └── 📂 js/
│       └── main.js          # Frontend JavaScript
├── 📂 uploads/              # Local upload directory (fallback)
├── 📂 logs/                 # Application logs
└── 📂 scripts/              # Utility scripts
```

## 🎯 API Endpoints

### Public API
```
GET  /                       # Homepage (TikTok-style)
GET  /grid                   # Grid view
GET  /video/:id              # Video detail
GET  /search                 # Search videos
POST /video/:id/like         # Like video
GET  /api/videos             # Get videos (JSON)
GET  /api/trending           # Get trending videos
```

### Admin API
```
# Authentication
GET  /admin/login            # Login page
POST /admin/login            # Login process
POST /admin/logout           # Logout

# Dashboard
GET  /admin/dashboard        # Admin dashboard
GET  /admin/analytics        # Analytics page

# Video Management
GET  /admin/videos           # List videos
GET  /admin/videos/upload    # Upload form
POST /admin/videos/upload    # Upload video
GET  /admin/videos/:id/edit  # Edit form
PUT  /admin/videos/:id       # Update video
DELETE /admin/videos/:id     # Delete video

# Category Management
GET  /admin/categories       # List categories
POST /admin/categories       # Create category
PUT  /admin/categories/:id   # Update category
DELETE /admin/categories/:id # Delete category

# Series Management
GET  /admin/series           # List series
POST /admin/series           # Create series
PUT  /admin/series/:id       # Update series
DELETE /admin/series/:id     # Delete series

# Analytics API
GET  /admin/api/analytics    # Get analytics data
GET  /admin/api/quick-stats  # Quick statistics
```

## 💾 Database Schema

### Core Tables
- **videos** - Data video utama
- **categories** - Kategori video
- **series** - Series video
- **admin_users** - User admin
- **video_stats** - Statistik video harian
- **analytics_summary** - Ringkasan analytics

### Relationships
- Video belongs to Category
- Video belongs to Series (optional)
- Series belongs to Category
- Video has many Video Stats
- Video has many Interactions

## 🎨 Frontend Features

### TikTok-Style Interface
- Vertical scrolling video feed
- Auto-play video saat scroll
- Gesture controls (swipe, double-tap)
- Real-time like animation
- Mobile-first responsive design

### Video Player
- Custom video controls
- Keyboard shortcuts (Space, Arrow keys)
- Picture-in-picture mode
- Theater mode
- Progress tracking
- Auto-quality adjustment

### Search & Discovery
- Real-time search suggestions
- Tag-based filtering
- Category browsing
- Trending videos
- Related videos

## 🛡️ Security Features

- **Authentication**: Session-based admin authentication
- **Authorization**: Role-based access control (Super Admin, Admin, Editor)
- **Rate Limiting**: Protection against spam dan abuse
- **CSRF Protection**: Cross-site request forgery protection
- **Input Validation**: Comprehensive input validation
- **Security Headers**: Helmet.js security headers
- **File Upload Security**: Type dan size validation

## 📈 Analytics Features

### Video Analytics
- Views tracking per video
- Like/unlike tracking
- Watch time monitoring
- Completion rate analysis
- Geographic analytics (IP-based)

### Dashboard Metrics
- Total videos, views, likes
- Upload trends
- Category performance
- Popular content analysis
- User engagement metrics

### Real-time Updates
- Live view counters
- Real-time like updates
- Dashboard auto-refresh
- WebSocket support (optional)

## 🔧 Development

### Available Scripts
```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm test           # Run tests
npm run lint       # Run ESLint
npm run setup      # Run setup wizard
npm run migrate    # Run database migrations
npm run seed       # Seed database with sample data
npm run backup     # Backup database
```

### Development Guidelines
1. Follow MVC architecture pattern
2. Use ES6+ features
3. Implement proper error handling
4. Write comprehensive tests
5. Follow security best practices
6. Optimize for performance

### Testing
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage
```

## 🚀 Deployment

### Production Setup
1. **Server Requirements**:
   - Ubuntu 20.04+ atau CentOS 8+
   - Node.js 16+
   - MySQL 8.0+
   - Nginx (reverse proxy)
   - SSL certificate

2. **Environment Variables**:
   ```bash
   NODE_ENV=production
   PORT=3000
   # Database with SSL
   DB_SSL=true
   # Security settings
   FORCE_HTTPS=true
   TRUST_PROXY=true
   ```

3. **Nginx Configuration**:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       return 301 https://$server_name$request_uri;
   }

   server {
       listen 443 ssl http2;
       server_name yourdomain.com;
       
       ssl_certificate /path/to/certificate.crt;
       ssl_certificate_key /path/to/private.key;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
       
       location /uploads {
           expires 7d;
           add_header Cache-Control "public, immutable";
       }
   }
   ```

4. **Process Management**:
   ```bash
   # Install PM2
   npm install -g pm2
   
   # Start application
   pm2 start app.js --name shortvideo
   
   # Save PM2 configuration
   pm2 save
   pm2 startup
   ```

### Docker Deployment
```dockerfile
FROM node:16-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 3000

CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork repository
2. Buat feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push ke branch (`git push origin feature/amazing-feature`)
5. Buat Pull Request

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Support

- **Documentation**: [Wiki](https://github.com/your-username/shortvideo-platform/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-username/shortvideo-platform/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/shortvideo-platform/discussions)
- **Email**: support@shortvideo.com

## 🙏 Acknowledgments

- [Express.js](https://expressjs.com/) - Web framework
- [MySQL](https://mysql.com/) - Database
- [Wasabi](https://wasabi.com/) - Cloud storage
- [Chart.js](https://chartjs.org/) - Analytics charts
- [Font Awesome](https://fontawesome.com/) - Icons
- [FFmpeg](https://ffmpeg.org/) - Video processing

## 📊 Stats

![GitHub stars](https://img.shields.io/github/stars/your-username/shortvideo-platform?style=social)
![GitHub forks](https://img.shields.io/github/forks/your-username/shortvideo-platform?style=social)
![GitHub issues](https://img.shields.io/github/issues/your-username/shortvideo-platform)
![GitHub license](https://img.shields.io/github/license/your-username/shortvideo-platform)

---

⭐ **Star repository ini jika membantu!** ⭐