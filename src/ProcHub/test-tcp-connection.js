/**
 * TCP Connection Tester
 * 
 * This script tries to connect to multiple ports on the QNX server to find which one is active.
 */

import { createConnection } from 'net';

// Server to test (change this to your QNX server IP)
const SERVER_HOST = '172.20.10.10';

// Ports to test
const TEST_PORTS = [80, 8080, 8000, 3000, 5173, 1234, 4321, 9090, 7000];

// Try to connect to each port
for (const port of TEST_PORTS) {
  console.log(`Testing connection to ${SERVER_HOST}:${port}...`);
  
  const client = createConnection({ host: SERVER_HOST, port: port });
  
  // Set a timeout for the connection attempt
  client.setTimeout(2000);
  
  client.on('connect', () => {
    console.log(`✅ Connected successfully to ${SERVER_HOST}:${port}`);
    
    // Send a test message
    client.write(JSON.stringify({ request_type: "GetProcesses" }));
    
    // Wait for a short period to receive any response
    setTimeout(() => {
      console.log(`Closing connection to ${port}`);
      client.end();
    }, 1000);
  });
  
  client.on('data', (data) => {
    console.log(`Received data from ${port}:`, data.toString());
  });
  
  client.on('timeout', () => {
    console.log(`⏱️ Connection to ${SERVER_HOST}:${port} timed out`);
    client.destroy();
  });
  
  client.on('error', (err) => {
    console.log(`❌ Could not connect to ${SERVER_HOST}:${port}: ${err.message}`);
    client.destroy();
  });
  
  // Delay between connection attempts to avoid overwhelming the system
  await new Promise(resolve => setTimeout(resolve, 3000));
} 