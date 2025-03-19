// Mock data to simulate responses from a resource-constrained Raspberry Pi
const mockProcesses = {
  pids: [1, 321, 4018],
  
  // Simple process details
  processDetails: {
    1: {
      pid: 1,
      name: "procnto",
      cpu_usage: 0.2,
      ram_usage: 1024, // 1MB
      uptime: 86401, // 1 day, 1 second
      user: "root"
    },
    321: {
      pid: 321,
      name: "devc-sersci",
      cpu_usage: 0.1,
      ram_usage: 512, // 512KB
      uptime: 86401,
      user: "root"
    },
    4018: {
      pid: 4018,
      name: "proc-monitor",
      cpu_usage: 0.3,
      ram_usage: 1536, // 1.5MB
      uptime: 3600, // 1 hour
      user: "root"
    }
  },
  
  // Detailed process history for charts
  detailedHistory: {}
};

// Generate history data for each process
Object.keys(mockProcesses.processDetails).forEach(pid => {
  const process = mockProcesses.processDetails[pid];
  mockProcesses.detailedHistory[pid] = generateDetailedHistory(
    parseInt(pid), 
    process.name, 
    getBaselineForProcess(process.name, true).minCpu,
    getBaselineForProcess(process.name, true).maxCpu,
    getBaselineForProcess(process.name, true).minRam,
    getBaselineForProcess(process.name, true).maxRam
  );
});

// Define baseline values for different process types on resource-constrained device
function getBaselineForProcess(name, isResourceConstrained = true) {
  if (isResourceConstrained) {
    // Low resource usage patterns for Raspberry Pi
    const processTypes = {
      "procnto": { minCpu: 0.1, maxCpu: 0.3, minRam: 900, maxRam: 1100 },
      "devc-sersci": { minCpu: 0.0, maxCpu: 0.2, minRam: 450, maxRam: 550 },
      "proc-monitor": { minCpu: 0.2, maxCpu: 0.5, minRam: 1400, maxRam: 1600 }
    };
    return processTypes[name] || { minCpu: 0.05, maxCpu: 0.3, minRam: 500, maxRam: 1200 };
  } else {
    // Original values (kept for reference but not used)
    const processTypes = {
      "procnto": { minCpu: 0.1, maxCpu: 0.5, minRam: 1024, maxRam: 3072 },
      "slogger2": { minCpu: 0.0, maxCpu: 0.2, minRam: 1024, maxRam: 2048 },
      "io-pkt-v6-hc": { minCpu: 0.2, maxCpu: 1.0, minRam: 3072, maxRam: 4096 },
      "devc-ser8250": { minCpu: 0.0, maxCpu: 0.1, minRam: 512, maxRam: 1024 },
      "proc-monitor": { minCpu: 0.5, maxCpu: 2.0, minRam: 10000, maxRam: 14000 }
    };
    return processTypes[name] || { minCpu: 0.1, maxCpu: 1.0, minRam: 1024, maxRam: 4096 };
  }
}

// Generate random history data for a process with usage patterns
function generateDetailedHistory(pid, name, minCpu, maxCpu, minRam, maxRam) {
  const entries = [];
  const now = Date.now();
  
  // Basic usage patterns for resource-constrained devices
  // (values from 0 to 1 representing percentage of max)
  const patterns = {
    stable: Array(60).fill(0).map(() => 0.7 + (Math.random() * 0.2)),
    slightVariation: Array(60).fill(0).map(() => 0.5 + (Math.random() * 0.3)),
    lowIdle: Array(60).fill(0).map((_, i) => {
      // Mostly idle with occasional small spikes
      return (i % 15 === 0) ? 0.6 + (Math.random() * 0.2) : 0.2 + (Math.random() * 0.1);
    })
  };
  
  // Select pattern based on process name
  let pattern;
  if (name === "procnto") {
    pattern = patterns.stable;
  } else if (name === "proc-monitor") {
    pattern = patterns.slightVariation;
  } else {
    pattern = patterns.lowIdle;
  }
  
  // Generate 60 data points (last hour, one point per minute)
  for (let i = 0; i < 60; i++) {
    const timestamp = now - (59 - i) * 60 * 1000;
    
    // CPU follows the pattern
    const cpuFactor = pattern[i];
    const cpuValue = minCpu + (maxCpu - minCpu) * cpuFactor;
    
    // RAM generally follows CPU but with less volatility
    const ramFactor = 0.8 * pattern[i] + 0.2 * (Math.random() * 0.1 + 0.9);
    const ramValue = minRam + (maxRam - minRam) * ramFactor;
    
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

// Generate a random value between min and max
function randomValue(min, max) {
  return min + Math.random() * (max - min);
}

export default mockProcesses; 