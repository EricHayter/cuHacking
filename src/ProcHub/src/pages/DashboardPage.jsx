import React, { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import ProcessTable from "../components/ProcessTable";
import MockWebSocket from "../mockService";
import { Box, Paper, Typography, Grid, CircularProgress, Chip } from "@mui/material";
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

const DashboardPage = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [processes, setProcesses] = useState({});
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const [useMockData, setUseMockData] = useState(true); 
  const [suspendedPids, setSuspendedPids] = useState(new Set());
  const startTimeRef = useRef(Date.now()); // Page load time
  const [systemUptime, setSystemUptime] = useState(0);
  const [systemStats, setSystemStats] = useState({
    totalCpu: 0,
    totalRam: 0,
    processCount: 0
  });
  const socketRef = useRef(null);

  useEffect(() => {
    // Update system uptime every second starting from 0
    const timer = setInterval(() => {
      setSystemUptime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculate system stats whenever processes change
  useEffect(() => {
    const processArray = Object.values(processes);
    const totalCpu = processArray.reduce((sum, proc) => sum + proc.cpu_usage, 0);
    const totalRam = processArray.reduce((sum, proc) => sum + proc.ram_usage, 0);
    
    setSystemStats({
      totalCpu: totalCpu,
      totalRam: totalRam,
      processCount: processArray.length
    });
  }, [processes]);

  useEffect(() => {
    let ws;
    
    if (useMockData) {
      console.log("Using mock WebSocket data");
      ws = new MockWebSocket("ws://mock-server");
    } else {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.hostname}:7654`;
      console.log(`Connecting to WebSocket proxy at: ${wsUrl}`);
      ws = new WebSocket(wsUrl);
    }

    ws.onopen = () => {
      console.log("WebSocket connection established");
      setConnectionError(false);
      getProcesses(ws);
    };

    ws.onmessage = (event) => {
      // Immediately log the raw data for debugging
      console.log('Raw WebSocket message received:', 
        typeof event.data === 'string' ? event.data.substring(0, 100) + (event.data.length > 100 ? '...' : '') : 'Non-string data');
        
      try {
        // Skip empty, non-string, or very short messages
        if (!event.data || typeof event.data !== 'string') {
          console.log("Received non-string message, skipping");
          return;
        }
        
        const data = event.data.trim();
        if (data === '') {
          console.log("Received empty message, skipping");
          return;
        }
        
        // Check message format - must be a JSON object
        if (!data.startsWith('{') || !data.endsWith('}')) {
          console.log("Message is not a JSON object:", data);
          return;
        }
        
        // Pre-validate request_type property using regex
        if (!/"request_type"\s*:\s*"[^"]+"/.test(data)) {
          console.log("Message doesn't contain request_type property:", data);
          return;
        }

        // Try to parse JSON
        const receivedData = JSON.parse(data);
        
        // Ensure the request_type property exists
        if (!receivedData.request_type) {
          console.log("Message missing request_type property after parsing:", receivedData);
          return;
        }
        
        console.log("Processing valid message:", receivedData.request_type);
        
        switch (receivedData.request_type) {
          case "GetProcesses":
            // Request details for each process
            if (receivedData.pids && Array.isArray(receivedData.pids)) {
              // Filter out suspended PIDs
              const activePids = receivedData.pids.filter(pid => !suspendedPids.has(pid));
              activePids.forEach(pid => {
                getSimpleProcessDetails(ws, pid);
              });
            }
            break;
            
          case "GetSimpleProcessDetails":
            // Store the process details in our state
            if (receivedData.pid && !suspendedPids.has(receivedData.pid)) {
              setProcesses(prev => ({
                ...prev,
                [receivedData.pid]: {
                  pid: receivedData.pid,
                  name: receivedData.name || "Unknown",
                  cpu_usage: receivedData.cpu_usage !== undefined ? receivedData.cpu_usage : 0,
                  ram_usage: receivedData.ram_usage !== undefined ? receivedData.ram_usage : 0,
                  uptime: receivedData.uptime !== undefined ? receivedData.uptime : 0,
                  user: receivedData.user || "Unknown"
                }
              }));
            }
            break;
            
          case "GetDetailedProcessDetails":
            // Handle detailed process data (for charts)
            if (receivedData.pid && receivedData.entries && !suspendedPids.has(receivedData.pid)) {
              // Update the process with detailed history
              setProcesses(prev => {
                const process = prev[receivedData.pid];
                if (process) {
                  return {
                    ...prev,
                    [receivedData.pid]: {
                      ...process,
                      history: receivedData.entries
                    }
                  };
                }
                return prev;
              });
            }
            break;
            
          case "SuspendProcess":
            // Handle suspend process response
            console.log(`Process ${receivedData.pid} suspend ${receivedData.success ? 'successful' : 'failed'}`);
            // If successful, remove the process from our state
            if (receivedData.success) {
              const pid = receivedData.pid;
              
              // Add to suspended PIDs set
              setSuspendedPids(prev => {
                const newSet = new Set(prev);
                newSet.add(pid);
                return newSet;
              });
              
              // Remove from processes state
              setProcesses(prev => {
                const newProcesses = { ...prev };
                delete newProcesses[pid];
                return newProcesses;
              });
              
              // Refresh process list
              getProcesses(ws);
            }
            break;
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Invalid JSON received:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setConnectionError(true);
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
      // Only show error if not intended close
      if (ws.readyState !== WebSocket.CLOSING && ws.readyState !== WebSocket.CLOSED) {
        setConnectionError(true);
      }
    };

    setSocket(ws);

    // Set up polling interval
    const interval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        getProcesses(ws);
      }
    }, 5000); // Poll every 5 seconds

    return () => {
      clearInterval(interval);
      if (ws) ws.close();
    };
  }, [useMockData, suspendedPids]);

  const getProcesses = (ws) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ request_type: "GetProcesses" });
      ws.send(message);
    }
  };

  const getSimpleProcessDetails = (ws, pid) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({
        request_type: "GetSimpleProcessDetails",
        PID: pid,
      });
      ws.send(message);
    }
  };

  const getDetailedProcessDetails = (ws, pid) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({
        request_type: "GetDetailedProcessDetails",
        PID: pid,
      });
      ws.send(message);
    }
  };

  const suspendProcess = (pid) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({
        request_type: "SuspendProcess",
        PID: pid,
      });
      socket.send(message);
    }
  };

  const handleMenuClick = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  // Format uptime for display
  const formatSystemUptime = () => {
    const hours = Math.floor(systemUptime / 3600);
    const minutes = Math.floor((systemUptime % 3600) / 60);
    const seconds = systemUptime % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Format memory for display
  const formatMemory = (kb) => {
    if (!kb && kb !== 0) return "0 KB";
    
    if (kb < 1024) return `${kb} KB`;
    if (kb < 1048576) return `${(kb / 1024).toFixed(2)} MB`;
    return `${(kb / 1048576).toFixed(2)} GB`;
  };

  // Convert processes object to array for the table
  const processesArray = Object.values(processes);

  return (
    <div>
      <Navbar onMenuClick={handleMenuClick} />
      
      {/* System Stats Summary */}
      <Box sx={{ p: 2 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <MemoryIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">CPU Usage</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                {systemStats.totalCpu.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total across {systemStats.processCount} processes
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <StorageIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">RAM Usage</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                {formatMemory(systemStats.totalRam)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total memory consumption
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AccessTimeIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Runtime</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                {formatSystemUptime()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Time since startup
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6">System Status</Typography>
              </Box>
              <Chip 
                label="Raspberry Pi" 
                color="primary" 
                sx={{ fontWeight: 'bold', fontSize: '1rem', py: 2, px: 1, mb: 1 }} 
              />
              <Typography variant="body2" color="text.secondary">
                QNX Neutrino RTOS
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
      
      {connectionError ? (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Connection Error</h2>
          <p>Could not connect to the process monitoring server. Please ensure the server is running.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{ padding: '8px 16px', background: '#1976d2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Retry Connection
          </button>
        </div>
      ) : (
        <>
          <ProcessTable 
            data={processesArray}
            loading={loading}
            onGetDetails={getDetailedProcessDetails}
            onSuspendProcess={suspendProcess}
            socket={socket}
            startTime={startTimeRef.current}
            systemUptime={systemUptime}
          />
        </>
      )}
    </div>
  );
};

export default DashboardPage;
