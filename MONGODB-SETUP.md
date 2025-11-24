# MongoDB Setup Guide

## 🔍 Problem Diagnosis

The application was not fetching data from MongoDB because:
1. **MongoDB server is not running** on `localhost:27017`
2. The connection code lacked proper error handling and retry logic
3. No port availability check before attempting connection

## ✅ What Was Fixed

### 1. Improved MongoDB Connection (`apps/api/src/lib/mongodb.js`)
- ✅ Added proper connection options (timeouts, pool size, retry settings)
- ✅ Added port availability check before connecting
- ✅ Added retry logic (5 attempts with 3-second delays)
- ✅ Enhanced error messages with clear instructions
- ✅ Added connection event listeners for better monitoring
- ✅ Improved URI parsing to handle different connection string formats

### 2. Created MongoDB Check Utility (`apps/api/src/utils/checkMongoDB.js`)
- ✅ Port availability checker
- ✅ Connection tester
- ✅ Reusable utility functions

## 🚀 How to Start MongoDB

### Option 1: Windows Service (Recommended)
```powershell
# Check if MongoDB service exists
Get-Service MongoDB

# Start MongoDB service
net start MongoDB

# Or using PowerShell
Start-Service MongoDB
```

### Option 2: Manual Start (Windows)
```powershell
# Create data directory if it doesn't exist
New-Item -ItemType Directory -Force -Path "C:\data\db"

# Start MongoDB manually
mongod --dbpath "C:\data\db"
```

### Option 3: Docker (Cross-platform)
```bash
# Start MongoDB in Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Check if it's running
docker ps

# View logs
docker logs mongodb
```

### Option 4: Linux/Mac
```bash
# Start MongoDB service
sudo systemctl start mongod

# Or manually
mongod --dbpath /data/db
```

## 🔍 Verify MongoDB is Running

### Check Port
```powershell
# Windows PowerShell
Test-NetConnection -ComputerName localhost -Port 27017

# Should return: TcpTestSucceeded : True
```

### Connect with MongoDB Shell
```bash
mongosh "mongodb://localhost:27017/shop"
```

### Or use MongoDB Compass
- Download from: https://www.mongodb.com/try/download/compass
- Connect to: `mongodb://localhost:27017`

## 📝 Environment Configuration

Make sure your `.env` file has:
```env
MONGODB_URI=mongodb://localhost:27017/shop
```

Or for a different database:
```env
MONGODB_URI=mongodb://localhost:27017/shop_dev
```

## 🧪 Test the Connection

After starting MongoDB, run the API server:
```bash
cd WhiteShop
npm run dev:api
```

You should see:
```
🔌 Attempting to connect to MongoDB: mongodb://localhost:27017/shop
🔍 Checking MongoDB port localhost:27017...
✅ MongoDB port localhost:27017 is accessible
🔄 Connecting to MongoDB...
✅ MongoDB connected successfully
📊 Database: shop
🌐 Host: localhost:27017
✅ MongoDB ping successful - connection verified
🚀 API Server running on http://localhost:3001
```

## ❌ If MongoDB Still Doesn't Connect

1. **Check if MongoDB is installed:**
   ```powershell
   mongod --version
   ```

2. **Check if port 27017 is in use:**
   ```powershell
   netstat -ano | findstr :27017
   ```

3. **Check MongoDB logs:**
   - Windows: `C:\Program Files\MongoDB\Server\<version>\log\mongod.log`
   - Or check Docker logs: `docker logs mongodb`

4. **Try connecting with MongoDB Compass:**
   - If Compass can't connect, the issue is with MongoDB installation/configuration
   - If Compass connects but the app doesn't, check the connection string in `.env`

## 📚 Additional Resources

- MongoDB Installation: https://www.mongodb.com/docs/manual/installation/
- MongoDB Windows Service: https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-windows/#run-mongodb-community-edition-as-a-windows-service
- Docker MongoDB: https://hub.docker.com/_/mongo




