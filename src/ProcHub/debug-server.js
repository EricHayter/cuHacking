/**
 * QNX TCP Server Debug Utility
 * 
 * Connects to the QNX TCP server and logs all communication with detailed inspection
 * of the raw bytes to help diagnose protocol issues.
 */

import { createConnection } from 'net';

// Server connection details
const SERVER_HOST = '172.20.10.10';
const SERVER_PORT = 8000;

console.log(`Connecting to QNX server at ${SERVER_HOST}:${SERVER_PORT}...`);

const client = createConnection({ host: SERVER_HOST, port: SERVER_PORT }, () => {
  console.log('Connected to server');
  
  // Send GetProcesses request after a brief delay
  setTimeout(() => {
    sendCommand({ request_type: "GetProcesses" });
  }, 2000);
});

// Function to send a command
function sendCommand(command) {
  const data = JSON.stringify(command);
  console.log(`\n===== SENDING =====`);
  console.log('Text format:', data);
  logByteArray('Raw bytes:', Buffer.from(data, 'utf8'));
  client.write(data);
}

// Handle incoming data with detailed debugging
client.on('data', (data) => {
  console.log(`\n===== RECEIVED =====`);
  
  // Log as text
  console.log('Text format:', data.toString());
  
  // Detailed byte logging
  logByteArray('Raw bytes:', data);
  
  // Try to parse as JSON
  try {
    const json = JSON.parse(data.toString());
    console.log('Parsed JSON:', json);
  } catch (err) {
    console.log('Not valid JSON:', err.message);
  }
  
  // After initial response, try sending another command
  if (!data.toString().includes('pids')) {
    setTimeout(() => {
      sendCommand({ request_type: "GetProcesses" });
    }, 2000);
  } else {
    // If we got a valid response, try getting details for the first PID
    try {
      const response = JSON.parse(data.toString());
      if (response.pids && response.pids.length > 0) {
        setTimeout(() => {
          const pid = response.pids[0];
          console.log(`\nRequesting details for PID ${pid}`);
          sendCommand({ request_type: "GetSimpleProcessDetails", PID: pid });
        }, 2000);
      }
    } catch (err) {
      // Ignore parse errors
    }
  }
});

// Log errors
client.on('error', (err) => {
  console.error('Connection error:', err.message);
  process.exit(1);
});

// Handle connection close
client.on('close', () => {
  console.log('Connection closed');
  process.exit(0);
});

// Helper function to log detailed byte information
function logByteArray(label, buffer) {
  console.log(label);
  
  const hexView = [];
  const charView = [];
  
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    
    // Add to hex view with padding
    const hex = byte.toString(16).padStart(2, '0');
    hexView.push(hex);
    
    // Add to character view
    const char = byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.';
    charView.push(char);
    
    // Print line every 16 bytes
    if ((i + 1) % 16 === 0 || i === buffer.length - 1) {
      // Pad the last row if needed
      while (hexView.length % 16 !== 0) {
        hexView.push('  ');
        charView.push(' ');
      }
      
      // Group hex values in sets of 8
      const hexString = hexView.join(' ').match(/.{1,24}/g).join('  ');
      const charString = charView.join('');
      
      console.log(`  ${hexString}  |  ${charString}`);
      
      // Reset views for next line
      hexView.length = 0;
      charView.length = 0;
    }
  }
  
  console.log('');
} 