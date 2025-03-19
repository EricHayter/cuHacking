import mockProcesses from './mockData';

class MockWebSocket {
  constructor(url) {
    console.log(`Creating mock WebSocket connection to ${url}`);
    this.readyState = WebSocket.CONNECTING;
    this.CONNECTING = WebSocket.CONNECTING;
    this.OPEN = WebSocket.OPEN;
    this.CLOSING = WebSocket.CLOSING;
    this.CLOSED = WebSocket.CLOSED;
    
    // Set up event callbacks (will be assigned by client)
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    this.onclose = null;
    
    // Track last update time for uptime calculation
    this.lastUpdateTime = Date.now();
    
    // Simulate connection delay
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen({ target: this });
      }
    }, 500);
  }
  
  // Method to send requests to the mock server
  send(message) {
    try {
      const request = JSON.parse(message);
      console.log('Mock WebSocket received request:', request);
      
      // Handle different request types with slight delay to simulate network
      setTimeout(() => this.handleRequest(request), 150);
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  }
  
  // Handle the different request types
  handleRequest(request) {
    // Calculate elapsed time since last update for uptime
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - this.lastUpdateTime) / 1000);
    this.lastUpdateTime = now;
    
    // Update all process uptimes
    if (elapsedSeconds > 0) {
      Object.keys(mockProcesses.processDetails).forEach(pid => {
        mockProcesses.processDetails[pid].uptime += elapsedSeconds;
      });
    }
    
    switch (request.request_type) {
      case 'GetProcesses':
        this.handleGetProcesses();
        break;
        
      case 'GetSimpleProcessDetails':
        this.handleGetSimpleProcessDetails(request.PID);
        break;
        
      case 'GetDetailedProcessDetails':
        this.handleGetDetailedProcessDetails(request.PID);
        break;
        
      case 'SuspendProcess':
        this.handleSuspendProcess(request.PID);
        break;
        
      default:
        console.warn(`Unknown request type: ${request.request_type}`);
    }
  }
  
  // Simulate GetProcesses response
  handleGetProcesses() {
    if (this.onmessage) {
      const response = {
        request_type: 'GetProcesses',
        pids: mockProcesses.pids
      };
      
      this.onmessage({ data: JSON.stringify(response) });
    }
  }
  
  // Simulate GetSimpleProcessDetails response
  handleGetSimpleProcessDetails(pid) {
    if (this.onmessage && mockProcesses.processDetails[pid]) {
      const process = mockProcesses.processDetails[pid];
      
      // Add some random variation to CPU and RAM usage
      const cpuVariation = process.cpu_usage * 0.2;
      const ramVariation = process.ram_usage * 0.1;
      
      const response = {
        request_type: 'GetSimpleProcessDetails',
        pid: process.pid,
        name: process.name,
        cpu_usage: process.cpu_usage + (Math.random() * cpuVariation * 2 - cpuVariation),
        ram_usage: process.ram_usage + Math.floor(Math.random() * ramVariation * 2 - ramVariation),
        uptime: process.uptime,
        user: process.user
      };
      
      this.onmessage({ data: JSON.stringify(response) });
    }
  }
  
  // Simulate GetDetailedProcessDetails response
  handleGetDetailedProcessDetails(pid) {
    if (this.onmessage && mockProcesses.processDetails[pid]) {
      // Generate fresh history data with current timestamp
      const process = mockProcesses.processDetails[pid];
      const entries = this.generateRealtimeHistory(
        process.pid,
        process.name,
        process.cpu_usage,
        process.ram_usage
      );
      
      const response = {
        request_type: 'GetDetailedProcessDetails',
        pid: pid,
        entries: entries
      };
      
      this.onmessage({ data: JSON.stringify(response) });
    }
  }
  
  // Generate realtime history data for charts
  generateRealtimeHistory(pid, name, currentCpu, currentRam) {
    const entries = [];
    const now = Date.now();
    
    // Generate 60 data points (last hour, one point per minute)
    for (let i = 0; i < 60; i++) {
      const timestamp = now - (59 - i) * 60 * 1000;
      const timeAgo = 59 - i; // minutes ago
      
      // CPU varies more in the past, converges to current value
      const cpuVariation = 0.3 * Math.exp(-timeAgo / 30); // Exponential decay of variation
      const cpuValue = currentCpu * (1 + (Math.random() * 2 - 1) * cpuVariation);
      
      // RAM varies less
      const ramVariation = 0.15 * Math.exp(-timeAgo / 40);
      const ramValue = currentRam * (1 + (Math.random() * 2 - 1) * ramVariation);
      
      entries.push({
        timestamp,
        time: new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        cpu_usage: parseFloat(cpuValue.toFixed(1)),
        ram_usage: Math.floor(ramValue),
        pid,
        name
      });
    }
    
    return entries;
  }
  
  // Simulate SuspendProcess response
  handleSuspendProcess(pid) {
    if (this.onmessage) {
      const response = {
        request_type: 'SuspendProcess',
        pid: pid,
        success: Math.random() > 0.1 // 90% success rate
      };
      
      this.onmessage({ data: JSON.stringify(response) });
    }
  }
  
  // Method to close the connection
  close() {
    this.readyState = WebSocket.CLOSING;
    
    setTimeout(() => {
      this.readyState = WebSocket.CLOSED;
      if (this.onclose) {
        this.onclose({ target: this });
      }
    }, 100);
  }
}

export default MockWebSocket; 