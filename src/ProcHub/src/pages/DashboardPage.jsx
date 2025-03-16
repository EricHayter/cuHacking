import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import ProcessTable from "../components/ProcessTable";

const DashboardPage = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [processes, setProcesses] = useState({});
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    // Connect to the WebSocket proxy instead of directly to TCP server
    // This connects to our local proxy which bridges to the TCP server
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.hostname}:7654`;
    
    console.log(`Connecting to WebSocket proxy at: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);

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
              receivedData.pids.forEach(pid => {
                getSimpleProcessDetails(ws, pid);
              });
            }
            break;
            
          case "GetSimpleProcessDetails":
            // Store the process details in our state
            if (receivedData.pid) {
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
            if (receivedData.pid && receivedData.entries) {
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
            // Refresh process list if successful
            if (receivedData.success) {
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
  }, []);

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

  // Convert processes object to array for the table
  const processesArray = Object.values(processes);

  return (
    <div>
      <Navbar onMenuClick={handleMenuClick} />
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
        <ProcessTable 
          data={processesArray}
          loading={loading}
          onGetDetails={getDetailedProcessDetails}
          onSuspendProcess={suspendProcess}
          socket={socket}
        />
      )}
    </div>
  );
};

export default DashboardPage;
