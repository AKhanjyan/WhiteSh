const mongoose = require('mongoose');
const { checkMongoDBPort } = require('../utils/checkMongoDB');

// MongoDB connection
const connectDB = async (retries = 5, delay = 3000) => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shop_dev';
  
  // Extract host and port from URI
  // Handle different URI formats: mongodb://host:port/db or mongodb://user:pass@host:port/db
  let host = 'localhost';
  let port = 27017;
  
  try {
    const url = new URL(mongoURI);
    host = url.hostname || 'localhost';
    port = url.port ? parseInt(url.port) : 27017;
  } catch (e) {
    // Fallback to regex if URL parsing fails
    const uriMatch = mongoURI.match(/mongodb:\/\/[^@]*@?([^:]+):(\d+)/);
    if (uriMatch) {
      host = uriMatch[1];
      port = parseInt(uriMatch[2]);
    }
  }
  
  console.log(`🔌 Attempting to connect to MongoDB: ${mongoURI.replace(/\/\/.*@/, '//***@')}`);
  
  // Check if MongoDB port is accessible first
  console.log(`🔍 Checking MongoDB port ${host}:${port}...`);
  const portAvailable = await checkMongoDBPort(host, port);
  
  if (!portAvailable) {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    console.error(`\n❌ MongoDB is not accessible at ${host}:${port}`);
    console.error(`\n💡 MongoDB server is not running. Please start MongoDB:`);
    console.error(`\n   Windows:`);
    console.error(`   1. If installed as service: net start MongoDB`);
    console.error(`   2. If installed manually: mongod --dbpath "C:\\data\\db"`);
    console.error(`   3. Or use Docker: docker run -d -p 27017:27017 --name mongodb mongo:latest`);
    console.error(`\n   Linux/Mac:`);
    console.error(`   1. sudo systemctl start mongod`);
    console.error(`   2. Or: mongod --dbpath /data/db`);
    console.error(`   3. Or use Docker: docker run -d -p 27017:27017 --name mongodb mongo:latest`);
    
    if (isDevelopment) {
      console.error(`\n⚠️  DEVELOPMENT MODE: Server will start but API endpoints will not work without MongoDB.`);
      console.error(`   After starting MongoDB, the server will automatically reconnect.\n`);
      // В режиме разработки не бросаем ошибку, чтобы сервер мог запуститься
      return null;
    } else {
      console.error(`\n   After starting MongoDB, restart this server.\n`);
      throw new Error(`MongoDB server is not running at ${host}:${port}`);
    }
  }
  
  console.log(`✅ MongoDB port ${host}:${port} is accessible`);
  
  // Connection options for better reliability
  // Note: bufferMaxEntries and bufferCommands are deprecated in Mongoose 8+
  const connectionOptions = {
    serverSelectionTimeoutMS: 5000, // 5 seconds timeout
    socketTimeoutMS: 45000, // 45 seconds socket timeout
    connectTimeoutMS: 10000, // 10 seconds connection timeout
    maxPoolSize: 10, // Maximum number of connections in the pool
    minPoolSize: 2, // Minimum number of connections in the pool
    retryWrites: true, // Enable retryable writes
    retryReads: true, // Enable retryable reads
  };

  // Set up event listeners before connecting
  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('💡 Full error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected');
  });

  mongoose.connection.on('connecting', () => {
    console.log('🔄 Connecting to MongoDB...');
  });

  mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
    console.log(`🌐 Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
  });

  // Retry logic
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(mongoURI, connectionOptions);
      
      // Verify connection
      await mongoose.connection.db.admin().ping();
      console.log('✅ MongoDB ping successful - connection verified');
      
      // Graceful shutdown
      process.on('SIGTERM', async () => {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
        process.exit(0);
      });

      return mongoose.connection;
    } catch (error) {
      console.error(`❌ MongoDB connection attempt ${attempt}/${retries} failed:`, error.message);
      
      if (attempt < retries) {
        console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('❌ All MongoDB connection attempts failed');
        console.error('💡 Please check:');
        console.error('   1. MongoDB is running: mongod or docker ps');
        console.error('   2. Connection string in .env: MONGODB_URI');
        console.error('   3. Network connectivity to MongoDB server');
        console.error('   4. MongoDB port 27017 is accessible');
        throw error;
      }
    }
  }
};

module.exports = { connectDB, mongoose };

