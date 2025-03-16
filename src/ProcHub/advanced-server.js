/**
 * Improved TCP to WebSocket Proxy Server for ProcHub
 * 
 * This enhanced server fixes JSON parsing issues between the browser (WebSocket)
 * and the QNX process monitor (TCP server).
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
const TCP_HOST = '172.20.10.10';
const TCP_PORT = 8000;

// Add reconnection settings
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000; // 3 seconds
const RESPONSE_TIMEOUT = 5000; // 5 seconds timeout for responses

// Serve the static frontend files
app.use(express.static('dist'));

// Store active TCP connections
const connections = new Map();

// Known QNX handshake patterns (as buffer patterns)
const HANDSHAKE_PATTERNS = [
  Buffer.from('QCONN\r\n'),
  Buffer.from([0xFF, 0xFD, 0x22])
];

// Check if a buffer contains one of the known handshake patterns
function isHandshakeMessage(buffer) {
  return HANDSHAKE_PATTERNS.some(pattern => {
    if (buffer.length < pattern.length) return false;
    for (let i = 0; i < pattern.length; i++) {
      if (buffer[i] !== pattern[i]) return false;
    }
    return true;
  });
}

// Format buffer for logging
function formatBufferForLog(buffer) {
  const text = buffer.toString();
  return `Text data: ${text}`;
}

// Check if data appears to be binary
function isBinaryData(buffer) {
  // Check first few bytes for common binary patterns
  return buffer.some(byte => byte < 32 && ![9, 10, 13].includes(byte));
}

// Try to parse JSON safely
function tryParseJSON(str) {
  try {
    const obj = JSON.parse(str);
    return obj;
  } catch (e) {
    return null;
  }
}

// Safe write to TCP socket with timeout and error handling
function safeTcpWrite(tcpClient, data, timeout = RESPONSE_TIMEOUT) {
  return new Promise((resolve, reject) => {
    if (!tcpClient || tcpClient.destroyed) {
      reject(new Error('TCP client not available'));
      return;
    }

    const timeoutId = setTimeout(() => {
      reject(new Error('Write operation timed out'));
    }, timeout);

    tcpClient.write(data, (err) => {
      clearTimeout(timeoutId);
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

// WebSocket server
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  let reconnectAttempts = 0;
  let tcpClient = null;
  let handshakeComplete = false;
  let dataBuffer = Buffer.alloc(0); // Buffer for accumulating data
  let lastRequestTime = 0;
  let pendingResponse = false;
  
  // Function to create TCP connection with retry logic
  const connectToTcpServer = () => {
    // Create a TCP connection for this WebSocket client
    tcpClient = createConnection({ host: TCP_HOST, port: TCP_PORT }, () => {
      console.log('Connected to TCP server');
      reconnectAttempts = 0; // Reset attempts on successful connection
      handshakeComplete = false;
      dataBuffer = Buffer.alloc(0); // Reset data buffer
      
      // Set keep-alive to detect connection drops
      tcpClient.setKeepAlive(true, 1000);
    });
    
    // Store this connection
    const connectionId = Date.now().toString();
    connections.set(connectionId, { ws, tcpClient });
    
    // Handle TCP data and forward to WebSocket
    tcpClient.on('data', (data) => {
      try {
        console.log(`Received from TCP [${data.length} bytes]: ${formatBufferForLog(data)}`);
        
        // Check for handshake patterns
        if (!handshakeComplete && isHandshakeMessage(data)) {
          console.log('Detected QNX handshake message');
          handshakeComplete = true;
          
          // Initialize the connection with a GetProcesses request after a short delay
          setTimeout(async () => {
            try {
              const initCommand = JSON.stringify({ request_type: "GetProcesses" });
              console.log('Sending initialization command:', initCommand);
              await safeTcpWrite(tcpClient, initCommand);
            } catch (err) {
              console.error('Error sending initialization command:', err);
            }
          }, 1000);
          
          return;
        }
        
        // Skip handling binary data
        if (isBinaryData(data)) {
          console.log('Skipping binary data');
          return;
        }
        
        // Convert buffer to string and process
        const message = data.toString().trim();
        
        // Skip empty messages
        if (message === '') {
          console.log('Skipping empty message');
          return;
        }
        
        // Try to parse as JSON
        const jsonObj = tryParseJSON(message);
        if (jsonObj) {
          console.log(`Valid JSON message with request_type: ${jsonObj.request_type}`);
          pendingResponse = false;
          
          // Forward to WebSocket client
          if (ws.readyState === ws.OPEN) {
            ws.send(message);
          }
        } else {
          console.log('Invalid or non-JSON message, not forwarding');
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
  ws.on('message', async (message) => {
    try {
      const messageStr = message.toString();
      console.log('Received from WebSocket:', messageStr);
      
      // Validate the message is proper JSON
      const jsonObj = tryParseJSON(messageStr);
      if (!jsonObj) {
        console.log('Invalid JSON from WebSocket, not forwarding');
        return;
      }
      
      // Check if we should throttle requests
      const now = Date.now();
      if (now - lastRequestTime < 1000) { // Minimum 1 second between requests
        console.log('Request throttled');
        return;
      }
      
      // Check if we're still waiting for a response
      if (pendingResponse) {
        console.log('Still waiting for previous response, skipping request');
        return;
      }
      
      // Forward to TCP server if connected
      if (tcpClient && !tcpClient.destroyed) {
        try {
          await safeTcpWrite(tcpClient, messageStr);
          console.log('Message sent to TCP server');
          lastRequestTime = now;
          pendingResponse = true;
          
          // Set a timeout to clear pendingResponse if no response received
          setTimeout(() => {
            if (pendingResponse) {
              console.log('Response timeout, resetting pending flag');
              pendingResponse = false;
            }
          }, RESPONSE_TIMEOUT);
        } catch (error) {
          console.error('Error sending message to TCP server:', error);
          pendingResponse = false;
        }
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
const PORT = process.env.PORT || 7654;
server.listen(PORT, () => {
  console.log(`Improved TCP-WebSocket proxy server running on port ${PORT}`);
  console.log(`Proxying to TCP server at ${TCP_HOST}:${TCP_PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  
  // Close all active connections
  for (const { ws, tcpClient } of connections.values()) {
    if (tcpClient) tcpClient.end();
    if (ws) ws.terminate();
  }
  
  server.close(() => {
    console.log('Server shut down');
    process.exit(0);
  });
});