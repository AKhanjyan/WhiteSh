const { MongoClient } = require('mongodb');

/**
 * Check if MongoDB is accessible
 * @param {string} uri - MongoDB connection URI
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<{available: boolean, error?: string}>}
 */
async function checkMongoDBAvailability(uri, timeout = 5000) {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: timeout,
    connectTimeoutMS: timeout,
  });

  try {
    await client.connect();
    await client.db().admin().ping();
    await client.close();
    return { available: true };
  } catch (error) {
    return {
      available: false,
      error: error.message,
    };
  }
}

/**
 * Check if MongoDB port is open
 * @param {string} host - MongoDB host
 * @param {number} port - MongoDB port
 * @returns {Promise<boolean>}
 */
async function checkMongoDBPort(host = 'localhost', port = 27017) {
  return new Promise((resolve) => {
    const net = require('net');
    const socket = new net.Socket();
    
    const timeout = 2000;
    socket.setTimeout(timeout);
    
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.once('error', () => {
      resolve(false);
    });
    
    socket.connect(port, host);
  });
}

module.exports = {
  checkMongoDBAvailability,
  checkMongoDBPort,
};




