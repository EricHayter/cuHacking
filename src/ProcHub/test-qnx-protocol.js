/**
 * QNX Protocol Analyzer
 * 
 * This tool connects to the QNX server and performs protocol analysis to identify issues
 * with the JSON responses that might be causing parsing problems.
 */

import { createConnection } from 'net';
import fs from 'fs';

// Server connection details
const SERVER_HOST = '172.20.10.10';
const SERVER_PORT = 8000;

// Options
const SAVE_RESPONSES_TO_FILE = true;
const LOG_DIR = './qnx_logs';
const CONNECTION_TIMEOUT = 5000; // milliseconds
const COMMAND_DELAY = 2000; // milliseconds
const MAX_COMMANDS = 5;

// Ensure log directory exists
if (SAVE_RESPONSES_TO_FILE) {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

// Commands to test in sequence
const COMMANDS = [
  { request_type: "GetProcesses" },
  { request_type: "GetSimpleProcessDetails", PID: 1 },
  { request_type: "GetDetailedProcessDetails", PID: 1 },
  { request_type: "GetProcesses" },
  { request_type: "GetSimpleProcessDetails", PID: 2 }
];

console.log(`Connecting to QNX server at ${SERVER_HOST}:${SERVER_PORT}...`);

let commandIndex = 0;
let responseCount = 0;

// Create connection
const client = createConnection({ 
  host: SERVER_HOST, 
  port: SERVER_PORT,
  timeout: CONNECTION_TIMEOUT
});

// Set up connection timeout
client.setTimeout(CONNECTION_TIMEOUT);

client.on('connect', () => {
  console.log('Connected to QNX server');
  
  // Wait for any initial handshake messages
  setTimeout(() => {
    console.log('\n==== Starting protocol analysis ====');
    sendNextCommand();
  }, 1000);
});

// Create a function to send the next command
function sendNextCommand() {
  if (commandIndex >= COMMANDS.length || commandIndex >= MAX_COMMANDS) {
    console.log('\n==== Protocol analysis complete ====');
    client.end();
    return;
  }
  
  const command = COMMANDS[commandIndex++];
  const data = JSON.stringify(command);
  
  console.log(`\n[${new Date().toISOString()}] Sending command: ${data}`);
  client.write(data);
}

// Handle incoming data
client.on('data', (data) => {
  responseCount++;
  const timestamp = new Date().toISOString();
  const responseId = `response_${commandIndex}_${responseCount}`;
  
  console.log(`\n[${timestamp}] Received data (${data.length} bytes)`);
  
  // Log detailed hexdump
  console.log('Hexdump:');
  console.log(hexdump(data));
  
  // Try to convert to string
  const textData = data.toString();
  console.log('As text:', textData);
  
  // Check for handshake or binary data
  const isPrintable = data.every(byte => byte === 0 || byte > 31 || byte === 10 || byte === 13);
  if (!isPrintable) {
    console.log('Contains non-printable characters, likely binary or handshake data');
  }
  
  // Check if it looks like JSON
  const trimmed = textData.trim();
  const startsWithBrace = trimmed.startsWith('{');
  const endsWithBrace = trimmed.endsWith('}');
  const startsWithBracket = trimmed.startsWith('[');
  const endsWithBracket = trimmed.endsWith(']');
  
  if ((startsWithBrace && endsWithBrace) || (startsWithBracket && endsWithBracket)) {
    console.log('Data appears to be JSON formatted');
    
    // Try to parse
    try {
      const parsed = JSON.parse(trimmed);
      console.log('Successfully parsed as JSON:', JSON.stringify(parsed, null, 2));
    } catch (err) {
      console.log('JSON parsing failed:', err.message);
      
      // Character by character analysis to find parsing issues
      analyzeJsonString(trimmed);
    }
  } else {
    console.log('Data does not appear to be JSON formatted');
  }
  
  // Save response to file for further analysis
  if (SAVE_RESPONSES_TO_FILE) {
    // Save raw binary data
    fs.writeFileSync(`${LOG_DIR}/${responseId}_raw.bin`, data);
    
    // Save text representation
    fs.writeFileSync(`${LOG_DIR}/${responseId}_text.txt`, textData);
    
    // Save hexdump
    fs.writeFileSync(`${LOG_DIR}/${responseId}_hex.txt`, hexdump(data));
    
    console.log(`Response saved to ${LOG_DIR}/${responseId}_*`);
  }
  
  // Send next command after delay
  setTimeout(sendNextCommand, COMMAND_DELAY);
});

client.on('timeout', () => {
  console.error('Connection timed out');
  client.destroy();
});

client.on('error', (err) => {
  console.error('Connection error:', err.message);
  process.exit(1);
});

client.on('close', () => {
  console.log('Connection closed');
  process.exit(0);
});

// Utility functions
function hexdump(buffer) {
  const result = [];
  for (let i = 0; i < buffer.length; i += 16) {
    const chunk = buffer.slice(i, i + 16);
    const hex = Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join(' ');
    const printable = Array.from(chunk).map(b => b >= 32 && b <= 126 ? String.fromCharCode(b) : '.').join('');
    result.push(`${i.toString(16).padStart(8, '0')}: ${hex.padEnd(48, ' ')} | ${printable}`);
  }
  return result.join('\n');
}

function analyzeJsonString(str) {
  console.log('Analyzing JSON string character by character:');
  
  let inString = false;
  let escapeNext = false;
  let bracesCount = 0;
  let bracketsCount = 0;
  let charIssues = [];
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const code = str.charCodeAt(i);
    
    // Check for control characters in wrong places
    if (code < 32 && code !== 10 && code !== 13 && code !== 9) {
      charIssues.push({
        position: i,
        char: char,
        code: code,
        issue: 'Control character in JSON'
      });
    }
    
    // Track string context
    if (!escapeNext && char === '"') {
      inString = !inString;
    }
    
    // Track escape sequences
    if (char === '\\' && !escapeNext) {
      escapeNext = true;
    } else {
      escapeNext = false;
    }
    
    // If not in a string, track brackets and braces
    if (!inString) {
      if (char === '{') bracesCount++;
      if (char === '}') bracesCount--;
      if (char === '[') bracketsCount++;
      if (char === ']') bracketsCount--;
      
      // Check for mismatches
      if (bracesCount < 0) {
        charIssues.push({
          position: i,
          char: char,
          code: code,
          issue: 'Unmatched closing brace'
        });
      }
      
      if (bracketsCount < 0) {
        charIssues.push({
          position: i,
          char: char,
          code: code,
          issue: 'Unmatched closing bracket'
        });
      }
    }
  }
  
  // Report ending states
  if (inString) {
    charIssues.push({
      position: str.length - 1,
      issue: 'Unterminated string'
    });
  }
  
  if (bracesCount !== 0) {
    charIssues.push({
      position: str.length - 1,
      issue: `Unbalanced braces (${bracesCount})`
    });
  }
  
  if (bracketsCount !== 0) {
    charIssues.push({
      position: str.length - 1,
      issue: `Unbalanced brackets (${bracketsCount})`
    });
  }
  
  // Report issues
  if (charIssues.length > 0) {
    console.log('Found potential JSON parsing issues:');
    charIssues.forEach(issue => {
      console.log(`  Position ${issue.position}: ${issue.issue}${
        issue.char ? ` (char: ${issue.char}, code: ${issue.code})` : ''
      }`);
    });
    
    // If we have issues near the beginning or end, show those parts
    for (const issue of charIssues) {
      if (issue.position < 20) {
        console.log('JSON start:', str.substring(0, 40));
        break;
      }
    }
    
    for (const issue of charIssues) {
      if (issue.position > str.length - 20) {
        console.log('JSON end:', str.substring(str.length - 40));
        break;
      }
    }
  } else {
    console.log('No obvious JSON structure issues found');
  }
} 