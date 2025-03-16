/**
 * Advanced TCP to WebSocket Proxy Server for ProcHub
 * 
 * This server acts as a bridge between the browser (WebSocket) and the QNX process monitor (TCP)
 * with enhanced protocol handling and debugging.
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

// Serve the static frontend files
app.use(express.static('dist'));

// Store active TCP connections
const connections = new Map();

// Known QNX handshake patterns
const HANDSHAKE_PATTERNS = [
  Buffer.from('QCONN\r\n'),
  Buffer.from([0xFF, 0xFD, 0x22])
];

// Check if a buffer contains one of the known handshake patterns
function isHandshakeBuffer(buffer) {
  return HANDSHAKE_PATTERNS.some(pattern => {
    if (buffer.length < pattern.length) return false;
    for (let i = 0; i < pattern.length; i++) {
      if (buffer[i] !== pattern[i]) return false;
    }
    return true;
  });
}

// WebSocket server
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  let reconnectAttempts = 0;
  let tcpClient = null;
  let handshakeComplete = false;
  
  // Function to create TCP connection with retry logic
  const connectToTcpServer = () => {
    // Create a TCP connection for this WebSocket client
    tcpClient = createConnection({ host: TCP_HOST, port: TCP_PORT }, () => {
      console.log('Connected to TCP server');
      reconnectAttempts = 0; // Reset attempts on successful connection
      handshakeComplete = false;
    });
    
    // Store this connection
    const connectionId = Date.now().toString();
    connections.set(connectionId, { ws, tcpClient });
    
    // Handle TCP data and forward to WebSocket
    tcpClient.on('data', (data) => {
      try {
        // Log reception
        console.log(`Received from TCP [${data.length} bytes]`);
        
        // Check for known handshake patterns
        if (!handshakeComplete && isHandshakeBuffer(data)) {
          console.log('Detected QNX handshake message:', data);
          handshakeComplete = true;
          
          // Initialize the connection with a GetProcesses request
          setTimeout(() => {
            try {
              const initCommand = JSON.stringify({ request_type: "GetProcesses" });
              console.log('Sending initialization command:', initCommand);
              tcpClient.write(initCommand);
            } catch (err) {
              console.error('Error sending initialization command:', err);
            }
          }, 1000);
          
          return;
        }
        
        // Hexdump function for better debugging
        const hexdump = (buffer) => {
          const result = [];
          for (let i = 0; i < Math.min(buffer.length, 128); i += 16) {
            const chunk = buffer.slice(i, i + 16);
            const hex = Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join(' ');
            const printable = Array.from(chunk).map(b => b >= 32 && b <= 126 ? String.fromCharCode(b) : '.').join('');
            result.push(`${i.toString(16).padStart(8, '0')}: ${hex.padEnd(48, ' ')} | ${printable}`);
          }
          return result.join('\n');
        };
        
        // Print detailed hex dump for binary data
        if (data.some(byte => (byte < 10 || (byte > 13 && byte < 32)) && byte !== 9)) {
          console.log('Message contains binary data:');
          console.log(hexdump(data));
          return;
        }
        
        // Convert buffer to string and trim
        const message = data.toString().trim();
        
        // Skip empty messages
        if (message === '') {
          console.log('Skipping empty message');
          return;
        }
        
        // Log the message
        console.log('Message as text:', message);
        
        // Strict JSON validation
        if (message.startsWith('{') && message.endsWith('}')) {
          try {
            // Attempt to parse and validate JSON
            const jsonObj = JSON.parse(message);
            
            // Only forward if it has request_type property
            if (jsonObj && jsonObj.request_type) {
              console.log('Valid JSON message with request_type:', jsonObj.request_type);
              
              // Forward to WebSocket client
              if (ws.readyState === ws.OPEN) {
                console.log('Forwarding valid JSON to WebSocket client');
                ws.send(message);
              }
            } else {
              console.log('JSON missing request_type property, not forwarding');
            }
          } catch (jsonError) {
            console.error('Invalid JSON received from TCP server:', jsonError.message);
          }
        } else {
          console.log('Message is not a JSON object, not forwarding');
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
        // Validate that the message is valid JSON before sending
        try {
          JSON.parse(messageStr); // Just to validate
          tcpClient.write(messageStr);
          console.log('Message sent to TCP server');
        } catch (err) {
          console.error('Invalid JSON from WebSocket client, not forwarding:', err.message);
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
const PORT = process.env.PORT || 8888;
server.listen(PORT, () => {
  console.log(`Advanced TCP-WebSocket proxy server running on port ${PORT}`);
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