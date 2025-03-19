# ProcHub - Process Monitor

A React-based UI for monitoring processes running on QNX systems.

## Mock Data Setup

This application has been configured to use fully mocked data on the frontend, eliminating the need for a real QNX server connection. The mock implementation:

- Simulates all WebSocket communications
- Provides realistic mock process data that changes over time
- Shows CPU, memory, and uptime information for various processes
- Supports viewing detailed process history charts
- Simulates process suspension commands

## Development

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm run dev
   ```

3. Build for production:
   ```
   npm run build
   ```

## Implementation Details

- The mock data is implemented in `src/mockData.js`
- The WebSocket simulation is in `src/mockService.js`
- The main dashboard component uses these mock services transparently
