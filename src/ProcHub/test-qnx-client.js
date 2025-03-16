/**
 * QNX Process Monitor TCP Client
 * 
 * This script establishes a direct TCP connection to the QNX Process Monitor
 * and allows testing the different commands.
 */

import { createConnection } from 'net';
import readline from 'readline';

// Server connection details
const SERVER_HOST = '172.20.10.10';
const SERVER_PORT = 8000;

// Commands to test
const commands = {
  'processes': { request_type: "GetProcesses" },
  'details': (pid) => ({ request_type: "GetSimpleProcessDetails", PID: parseInt(pid) }),
  'history': (pid) => ({ request_type: "GetDetailedProcessDetails", PID: parseInt(pid) }),
  'suspend': (pid) => ({ request_type: "SuspendProcess", PID: parseInt(pid) })
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('Connecting to QNX Process Monitor...');
const client = createConnection({ host: SERVER_HOST, port: SERVER_PORT }, () => {
  console.log(`Connected to ${SERVER_HOST}:${SERVER_PORT}`);
  console.log('\nCommands:');
  console.log('  processes - List all process IDs');
  console.log('  details <pid> - Get details for a specific process');
  console.log('  history <pid> - Get history data for a specific process');
  console.log('  suspend <pid> - Suspend a specific process');
  console.log('  exit - Close the connection and exit');
  
  promptUser();
});

// Process server responses
client.on('data', (data) => {
  try {
    // Try to parse as JSON
    const jsonData = JSON.parse(data.toString());
    console.log('\nResponse:');
    console.log(JSON.stringify(jsonData, null, 2));
  } catch (error) {
    // If not JSON, show raw data
    console.log('\nReceived data:');
    console.log(data.toString());
  }
  
  promptUser();
});

client.on('error', (error) => {
  console.error('Connection error:', error.message);
  process.exit(1);
});

client.on('close', () => {
  console.log('Connection closed');
  process.exit(0);
});

// Prompt user for input
function promptUser() {
  rl.question('\nEnter command: ', (input) => {
    const args = input.trim().split(' ');
    const command = args[0].toLowerCase();
    
    if (command === 'exit') {
      console.log('Closing connection...');
      client.end();
      rl.close();
      return;
    }
    
    if (command === 'processes') {
      sendCommand(commands.processes);
    } else if (command === 'details' && args[1]) {
      sendCommand(commands.details(args[1]));
    } else if (command === 'history' && args[1]) {
      sendCommand(commands.history(args[1]));
    } else if (command === 'suspend' && args[1]) {
      sendCommand(commands.suspend(args[1]));
    } else {
      console.log('Invalid command. Available commands: processes, details <pid>, history <pid>, suspend <pid>, exit');
      promptUser();
    }
  });
}

// Send command to server
function sendCommand(commandObj) {
  const commandStr = JSON.stringify(commandObj);
  console.log(`Sending: ${commandStr}`);
  client.write(commandStr);
} 