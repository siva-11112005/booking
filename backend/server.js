const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000; // Render uses port 10000 by default

// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================
app.use(cors({ 
  origin: process.env.NODE_ENV === 'production' 
    ? [
        process.env.FRONTEND_URL, 
        /\.onrender\.com$/,
        /\.render\.com$/
      ]
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy for Render
app.set('trust proxy', 1);

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Request logger middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  console.log(`${timestamp} - ${req.method} ${req.path} - IP: ${ip}`);
  next();
});

// ============================================
// HEALTH CHECK ENDPOINTS (Important for Render)
// ============================================
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
    }
  });
});

app.get('/api/health', (req, res) => {
  const healthCheck = {
    status: 'healthy',
    service: 'Eswari Physiotherapy API',
    version: '4.0-render',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    port: PORT,
    platform: 'Render',
    renderService: process.env.RENDER_SERVICE_NAME || 'Unknown'
  };
  
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ ...healthCheck, status: 'unhealthy' });
  }
  
  res.status(200).json(healthCheck);
});

// Ping endpoint to prevent cold starts
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// ============================================
// API ROUTES
// ============================================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/admin', require('./routes/admin'));
// In server.js, add this line with other routes:
app.use('/api/payment', require('./routes/payment'));
// ============================================
// PRODUCTION: SERVE REACT BUILD
// ============================================
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../frontend/build');
  
  console.log('============================================');
  console.log('📦 PRODUCTION MODE - RENDER');
  console.log('📂 Serving React build from:', buildPath);
  console.log('============================================');
  
  // Serve static files from React build with caching
  app.use(express.static(buildPath, {
    maxAge: '1y',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      // Don't cache HTML files
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
      // Cache CSS and JS files
      if (filePath.match(/\.(css|js)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));
  
  // API 404 handler - MUST be before React routing
  app.use('/api/*', (req, res) => {
    res.status(404).json({ 
      message: 'API endpoint not found',
      path: req.path,
      method: req.method,
      availableEndpoints: {
        auth: [
          'POST /api/auth/send-otp',
          'POST /api/auth/verify-otp',
          'POST /api/auth/login',
          'POST /api/auth/forgot-password',
          'POST /api/auth/reset-password',
          'GET /api/auth/me'
        ],
        appointments: [
          'GET /api/appointments/slots/:date',
          'POST /api/appointments/book',
          'GET /api/appointments/my-appointments',
          'DELETE /api/appointments/:id'
        ],
        admin: [
          'GET /api/admin/stats',
          'GET /api/admin/appointments',
          'PATCH /api/admin/appointments/:id',
          'GET /api/admin/users',
          'PATCH /api/admin/users/:id/block'
        ]
      }
    });
  });
  
  // Handle React routing - MUST BE LAST
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
  
} else {
  // ============================================
  // DEVELOPMENT MODE
  // ============================================
  console.log('============================================');
  console.log('🛠️  DEVELOPMENT MODE');
  console.log('⚠️  React should run separately on port 3000');
  console.log('============================================');
  
  // Root endpoint - API info
  app.get('/', (req, res) => {
    res.status(200).json({ 
      message: 'Eswari Physiotherapy API v4.0-render',
      status: 'running',
      mode: 'development',
      health: '/api/health',
      endpoints: {
        auth: '/api/auth/*',
        appointments: '/api/appointments/*',
        admin: '/api/admin/*'
      },
      documentation: 'Run React app separately on port 3000 in development'
    });
  });
  
  // 404 handler for development
  app.use((req, res) => {
    res.status(404).json({ 
      message: 'Route not found',
      path: req.path,
      method: req.method
    });
  });
}

// ============================================
// GLOBAL ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
  console.error('❌ ERROR:', err.message);
  console.error('📍 Path:', req.path);
  console.error('📍 Method:', req.method);
  
  if (process.env.NODE_ENV === 'development') {
    console.error('📍 Stack:', err.stack);
  }
  
  res.status(err.status || 500).json({ 
    message: err.message || 'Internal server error',
    path: req.path,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack
    })
  });
});

// ============================================
// MONGODB CONNECTION WITH RETRY
// ============================================
const connectDB = async () => {
  const maxRetries = 5;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        family: 4, // Force IPv4
        maxPoolSize: 10,
        minPoolSize: 2
      });
      
      console.log('✅ MongoDB Connected Successfully');
      console.log('📊 Database:', mongoose.connection.db.databaseName);
      console.log('🔗 Host:', mongoose.connection.host);
      return true;
      
    } catch (err) {
      retries++;
      console.error(`❌ MongoDB Connection Error (Attempt ${retries}/${maxRetries}):`, err.message);
      
      if (retries < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retries), 30000);
        console.log(`🔄 Retrying in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('💀 Failed to connect to MongoDB after maximum retries');
        if (process.env.NODE_ENV === 'production') {
          console.error('⚠️  Server will exit - Render will restart automatically');
          process.exit(1);
        }
      }
    }
  }
  return false;
};

// MongoDB connection event handlers
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connection established');
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected - attempting to reconnect...');
  setTimeout(connectDB, 5000);
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err.message);
});

// ============================================
// START SERVER
// ============================================
const startServer = async () => {
  try {
    // Connect to database first
    console.log('🔌 Connecting to MongoDB...');
    const connected = await connectDB();
    
    if (!connected && process.env.NODE_ENV === 'production') {
      console.error('💀 Cannot start server without database connection');
      process.exit(1);
    }
    
    // Start HTTP server - Bind to 0.0.0.0 for Render
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('════════════════════════════════════════════════════════');
      console.log('🚀 ESWARI PHYSIOTHERAPY API v4.0');
      console.log('════════════════════════════════════════════════════════');
      console.log(`📍 Platform: Render.com`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📍 Port: ${PORT}`);
      console.log(`📍 Host: 0.0.0.0`);
      console.log(`📍 Service: ${process.env.RENDER_SERVICE_NAME || 'Unknown'}`);
      console.log(`⏰ Started: ${new Date().toLocaleString()}`);
      console.log('════════════════════════════════════════════════════════');
      
      if (process.env.NODE_ENV === 'production') {
        console.log('✅ Serving React build');
        if (process.env.RENDER_EXTERNAL_URL) {
          console.log(`🌐 App URL: ${process.env.RENDER_EXTERNAL_URL}`);
        }
      } else {
        console.log('🛠️  Development mode');
        console.log(`🌐 API: http://localhost:${PORT}`);
        console.log(`🌐 React: http://localhost:3000 (run separately)`);
      }
      
      console.log('════════════════════════════════════════════════════════');
      console.log('');
    });

    // Set keep-alive timeout for Render
    server.keepAliveTimeout = 120000; // 120 seconds
    server.headersTimeout = 120000;

    // ============================================
    // GRACEFUL SHUTDOWN
    // ============================================
    const gracefulShutdown = async (signal) => {
      console.log('');
      console.log(`⚠️  ${signal} received - shutting down gracefully...`);
      
      server.close(async () => {
        console.log('✅ HTTP server closed');
        
        try {
          await mongoose.connection.close(false);
          console.log('✅ MongoDB connection closed');
          console.log('👋 Graceful shutdown completed');
          process.exit(0);
        } catch (err) {
          console.error('❌ Error during MongoDB shutdown:', err.message);
          process.exit(1);
        }
      });
      
      // Force shutdown after 30 seconds
      setTimeout(() => {
        console.error('⚠️  Forced shutdown after 30s timeout');
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // ============================================
    // ERROR HANDLERS
    // ============================================
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise);
      console.error('❌ Reason:', reason);
    });

    process.on('uncaughtException', (err) => {
      console.error('❌ Uncaught Exception:', err.message);
      console.error('❌ Stack:', err.stack);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    // ============================================
    // HEARTBEAT & MEMORY MONITORING (Render specific)
    // ============================================
    if (process.env.NODE_ENV === 'production') {
      // Log heartbeat every 5 minutes
      setInterval(() => {
        const uptime = Math.floor(process.uptime());
        const memory = process.memoryUsage();
        console.log(`💓 Heartbeat - Uptime: ${uptime}s | Memory: ${Math.round(memory.heapUsed / 1024 / 1024)}MB/${Math.round(memory.heapTotal / 1024 / 1024)}MB`);
      }, 300000);

      // Memory warning if usage is high
      setInterval(() => {
        const memory = process.memoryUsage();
        const usedMB = Math.round(memory.heapUsed / 1024 / 1024);
        if (usedMB > 400) { // Render free tier has 512MB
          console.warn(`⚠️  High memory usage: ${usedMB}MB`);
        }
      }, 60000); // Check every minute
    }

  } catch (err) {
    console.error('💀 Failed to start server:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
};

// ============================================
// INITIALIZE APPLICATION
// ============================================
startServer();

// Export for testing
module.exports = app;