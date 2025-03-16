/**
 * TCP to WebSocket Proxy Server for ProcHub
 * 
 * This server acts as a bridge between the browser (WebSocket) and the QNX process monitor (TCP)
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { createConnection } from 'net';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// TCP server connection details
const TCP_HOST = '172.20.10.10';  // Change to your QNX server IP
const TCP_PORT = 8000;            // QNX server is running on port 8000

// Add reconnection settings
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000; // 3 seconds

// Serve the static frontend files
app.use(express.static('dist'));

// Store active TCP connections
const connections = new Map();

// WebSocket server
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  let reconnectAttempts = 0;
  let tcpClient = null;
  
  // Function to create TCP connection with retry logic
  const connectToTcpServer = () => {
    // Create a TCP connection for this WebSocket client
    tcpClient = createConnection({ host: TCP_HOST, port: TCP_PORT }, () => {
      console.log('Connected to TCP server');
      reconnectAttempts = 0; // Reset attempts on successful connection
    });
    
    // Store this connection
    const connectionId = Date.now().toString();
    connections.set(connectionId, { ws, tcpClient });
    
    // Handle TCP data and forward to WebSocket
    tcpClient.on('data', (data) => {
      try {
        const message = data.toString();
        console.log('Received from TCP:', message);
        
        // Skip known non-JSON responses
        if (message === 'QCONN' || message.trim() === '' || message.startsWith('\u0000')) {
          console.log('Skipping non-JSON message:', message);
          return;
        }
        
        // Try to parse as JSON to validate
        try {
          JSON.parse(message);
          
          // Forward valid JSON to WebSocket client
          if (ws.readyState === ws.OPEN) {
            ws.send(message);
          }
        } catch (jsonError) {
          console.error('Invalid JSON received from TCP server:', jsonError.message);
          console.log('Raw message:', message);
        }
      } catch (error) {
        console.error('Error processing TCP data:', error);
      }
    });
    
    // Handle TCP errors
    tcpClient.on('error', (error) => {
      console.error('TCP connection error:', error);
      
      // Try to reconnect if not exceeding max attempts
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`Reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${RECONNECT_DELAY/1000} seconds...`);
        
        setTimeout(() => {
          if (ws.readyState === ws.OPEN) {
            connectToTcpServer();
          }
        }, RECONNECT_DELAY);
      } else {
        console.log('Max reconnection attempts reached. Closing WebSocket.');
        ws.close();
      }
    });
    
    // Handle TCP connection close
    tcpClient.on('close', () => {
      console.log('TCP connection closed');
      connections.delete(connectionId);
    });
    
    return tcpClient;
  };
  
  // Initialize connection
  tcpClient = connectToTcpServer();
  
  // Handle WebSocket messages and forward to TCP
  ws.on('message', (message) => {
    try {
      const messageStr = message.toString();
      console.log('Received from WebSocket:', messageStr);
      
      // Forward to TCP server if connected
      if (tcpClient && !tcpClient.destroyed) {
        tcpClient.write(messageStr);
      } else {
        console.log('Cannot send message: TCP connection not available');
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });
  
  // Handle WebSocket close
  ws.on('close', () => {
    console.log('WebSocket connection closed');
    if (tcpClient) {
      tcpClient.end();
    }
  });
});

// Start the server
const PORT = process.env.PORT || 8888;
server.listen(PORT, () => {
  console.log(`TCP-WebSocket proxy server running on port ${PORT}`);
  console.log(`Proxying to TCP server at ${TCP_HOST}:${TCP_PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  
  // Close all active connections
  for (const { ws, tcpClient } of connections.values()) {
    tcpClient.end();
    ws.terminate();
  }
  
  server.close(() => {
    console.log('Server shut down');
    process.exit(0);
  });
}); 