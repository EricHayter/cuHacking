import React, { useState, useEffect, useRef } from "react";
import { DataGrid } from "@mui/x-data-grid";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Chip,
  Typography,
  Alert,
  Grid,
  LinearProgress,
} from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const formatUptime = (seconds) => {
  // Always treat 0 as a valid value
  if (seconds === undefined || seconds === null) return "0s";
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
};

const formatMemory = (kb) => {
  if (!kb && kb !== 0) return "Unknown";
  
  if (kb < 1024) return `${kb} KB`;
  if (kb < 1048576) return `${(kb / 1024).toFixed(2)} MB`;
  return `${(kb / 1048576).toFixed(2)} GB`;
};

const getCurrentTime = () => {
  const now = new Date();
  return now.toLocaleTimeString(); // Formats as "HH:MM:SS"
};

const ProcessTable = ({ data, loading, onGetDetails, onSuspendProcess, socket, startTime, systemUptime }) => {
  const [open, setOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [suspendStatus, setSuspendStatus] = useState({ success: null, pid: null });
  const processStartTimes = useRef({});
  const chartDataRef = useRef({});
  const lastUpdateRef = useRef(Date.now());

  // Initialize process start times when data changes
  useEffect(() => {
    if (data) {
      data.forEach(process => {
        if (!processStartTimes.current[process.pid]) {
          // Start all processes at current system time if not already tracked
          processStartTimes.current[process.pid] = systemUptime;
          chartDataRef.current[process.pid] = [];
        }
      });
    }
  }, [data, systemUptime]);

  // Update chart data every second for all processes
  useEffect(() => {
    const now = Date.now();
    const timeDiff = now - lastUpdateRef.current;
    if (timeDiff >= 1000) { // Update every second
      data.forEach(process => {
        if (chartDataRef.current[process.pid]) {
          // Add new data point
          const newPoint = {
            time: new Date(now).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            CPU_Usage: process.cpu_usage,
            RAM_Usage: process.ram_usage / 1024 // Convert to MB
          };
          
          // Keep last 60 points
          chartDataRef.current[process.pid].push(newPoint);
          if (chartDataRef.current[process.pid].length > 60) {
            chartDataRef.current[process.pid].shift();
          }
          
          // If this is the selected process, update chart
          if (selectedRow && selectedRow.pid === process.pid) {
            setChartData([...chartDataRef.current[process.pid]]);
          }
        }
      });
      lastUpdateRef.current = now;
    }
  }, [data, systemUptime]);

  const handleSuspendClick = (pid) => {
    if (onSuspendProcess) {
      setSuspendStatus({ success: null, pid });
      onSuspendProcess(pid);
      // In a real app, we'd update the status based on the response
      // For the mock, we'll simulate a response
      setTimeout(() => {
        const success = Math.random() > 0.2; // 80% chance of success
        setSuspendStatus({ success, pid });
        setTimeout(() => setSuspendStatus({ success: null, pid: null }), 3000);
      }, 800);
    }
  };

  const handleRowClick = (param) => {
    setSelectedRow(param.row);
    setOpen(true);
    setDetailsLoading(true);
    
    // Use existing chart data for the selected process
    if (chartDataRef.current[param.row.pid]) {
      setChartData([...chartDataRef.current[param.row.pid]]);
    } else {
      // Initialize chart data if it doesn't exist
      chartDataRef.current[param.row.pid] = [];
      setChartData([]);
    }
    setDetailsLoading(false);
    
    // Still request real data if available
    if (socket && onGetDetails) {
      onGetDetails(socket, param.row.pid);
    }
  };

  const columns = [
    { field: "pid", headerName: "PID", flex: 0.2 },
    { field: "name", headerName: "Name", flex: 0.8 },
    { 
      field: "cpu_usage", 
      headerName: "CPU usage", 
      flex: 0.3,
      valueFormatter: (params) => params.value !== undefined ? `${params.value.toFixed(1)}%` : '0.0%',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <Box
            sx={{
              width: `${Math.min(params.value * 20, 100)}%`,
              backgroundColor: params.value > 1 ? '#ff9800' : '#4caf50',
              height: 6,
              borderRadius: 3,
              mr: 1
            }}
          />
          <Typography variant="body2">{params.value.toFixed(1)}%</Typography>
        </Box>
      ),
    },
    { 
      field: "ram_usage", 
      headerName: "RAM usage", 
      flex: 0.4,
      valueFormatter: (params) => params.value !== undefined ? formatMemory(params.value) : '0 KB',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <Box
            sx={{
              width: `${Math.min((params.value / 2048) * 100, 100)}%`,
              backgroundColor: params.value > 5000 ? '#ff9800' : '#2196f3',
              height: 6,
              borderRadius: 3,
              mr: 1
            }}
          />
          <Typography variant="body2">{formatMemory(params.value)}</Typography>
        </Box>
      ),
    },
    { 
      field: "uptime", 
      headerName: "Uptime", 
      flex: 0.5,
      valueGetter: (params) => {
        if (!params || !params.row) return 0;
        const pid = params.row.pid;
        const startTime = processStartTimes.current[pid] || systemUptime;
        return Math.max(0, systemUptime - startTime);
      },
      valueFormatter: (params) => formatUptime(params.value)
    },
    { field: "user", headerName: "User", flex: 0.3 },
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      flex: 0.3,
      renderCell: (params) => (
        <Button
          variant="outlined"
          color="error"
          onClick={(e) => {
            e.stopPropagation();
            handleSuspendClick(params.row.pid);
          }}
          size="small"
        >
          Suspend
        </Button>
      ),
    },
  ];

  const handleClose = () => {
    setOpen(false);
    setSelectedRow(null);
    setChartData([]);
  };

  // Transform the data for DataGrid by adding an id field if needed
  const rows = data ? data.map(process => ({
    ...process,
    id: process.pid // Ensure each row has an id for DataGrid
  })) : [];

  return (
    <Box sx={{ position: 'relative' }}>
      {suspendStatus.success !== null && (
        <Alert 
          severity={suspendStatus.success ? "success" : "error"}
          sx={{ 
            position: 'absolute', 
            top: 10, 
            right: 10, 
            zIndex: 9999,
            boxShadow: 3 
          }}
        >
          {suspendStatus.success 
            ? `Process ${suspendStatus.pid} suspended successfully` 
            : `Failed to suspend process ${suspendStatus.pid}`}
        </Alert>
      )}
      
      <Paper
        sx={{
          height: 'auto',
          width: "100%",
          p: 2,
          marginBottom: 2
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">QNX Processes</Typography>
          <Chip 
            label="Raspberry Pi" 
            color="primary" 
            size="small" 
            sx={{ fontWeight: 'bold' }}
          />
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="400px">
            <CircularProgress />
          </Box>
        ) : (
          <>
            <DataGrid
              rows={rows}
              columns={columns}
              initialState={{ 
                pagination: { 
                  paginationModel: { page: 0, pageSize: 10 } 
                } 
              }}
              pageSizeOptions={[5, 10]}
              sx={{ border: 0 }}
              onRowClick={handleRowClick}
              autoHeight
            />
            
            <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
              <DialogTitle>
                Process Details: {selectedRow ? `${selectedRow.name} (PID: ${selectedRow.pid})` : ''}
              </DialogTitle>
              
              <DialogContent>
                {detailsLoading ? (
                  <Box display="flex" justifyContent="center" alignItems="center" height="300px">
                    <CircularProgress />
                  </Box>
                ) : (
                  <>
                    {selectedRow && (
                      <Grid container spacing={3} sx={{ mb: 3, mt: 1 }}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" color="text.secondary">Process Information</Typography>
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2">
                              <strong>PID:</strong> {selectedRow.pid}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Name:</strong> {selectedRow.name}
                            </Typography>
                            <Typography variant="body2">
                              <strong>User:</strong> {selectedRow.user}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Uptime:</strong> {formatUptime(Math.max(0, systemUptime - (processStartTimes.current[selectedRow.pid] || systemUptime)))}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" color="text.secondary">Resource Usage</Typography>
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2">
                              <strong>CPU Usage:</strong> {selectedRow.cpu_usage?.toFixed(1)}%
                            </Typography>
                            <LinearProgress 
                              variant="determinate" 
                              value={Math.min(selectedRow.cpu_usage * 20, 100)} 
                              sx={{ mt: 0.5, mb: 1.5, height: 8, borderRadius: 1 }}
                              color={selectedRow.cpu_usage > 1 ? "warning" : "success"}
                            />
                            
                            <Typography variant="body2">
                              <strong>RAM Usage:</strong> {formatMemory(selectedRow.ram_usage)}
                            </Typography>
                            <LinearProgress 
                              variant="determinate" 
                              value={Math.min((selectedRow.ram_usage / 2048) * 100, 100)} 
                              sx={{ mt: 0.5, mb: 1.5, height: 8, borderRadius: 1 }}
                              color="primary"
                            />
                          </Box>
                        </Grid>
                      </Grid>
                    )}
                    
                    {chartData.length > 0 ? (
                      <>
                        <Typography variant="subtitle1" sx={{ mt: 3, mb: 2 }}>
                          Resource Usage History
                        </Typography>
                        <Box height="350px" width="100%">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="time" />
                              <YAxis 
                                yAxisId="left" 
                                orientation="left" 
                                domain={[0, dataMax => Math.max(1, dataMax * 1.2)]}
                                label={{ value: 'CPU %', angle: -90, position: 'insideLeft' }}
                              />
                              <YAxis 
                                yAxisId="right" 
                                orientation="right" 
                                domain={[0, dataMax => Math.max(100, dataMax * 1.2)]}
                                label={{ value: 'RAM (MB)', angle: 90, position: 'insideRight' }}
                              />
                              <Tooltip formatter={(value, name) => {
                                if (name === 'CPU_Usage') return [`${value.toFixed(2)}%`, 'CPU Usage'];
                                if (name === 'RAM_Usage') return [`${value.toFixed(2)} MB`, 'RAM Usage'];
                                return [value, name];
                              }} />
                              <Legend />
                              <Line 
                                yAxisId="left"
                                type="monotone" 
                                dataKey="CPU_Usage" 
                                stroke="#4caf50" 
                                dot={false}
                                name="CPU Usage"
                              />
                              <Line 
                                yAxisId="right"
                                type="monotone" 
                                dataKey="RAM_Usage" 
                                stroke="#2196f3" 
                                dot={false}
                                name="RAM Usage"
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </Box>
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        Collecting data... Please wait.
                      </Typography>
                    )}
                  </>
                )}
              </DialogContent>
              
              <DialogActions>
                <Button 
                  variant="contained" 
                  color="error" 
                  onClick={() => {
                    handleSuspendClick(selectedRow?.pid);
                    handleClose();
                  }}
                >
                  SUSPEND PROCESS
                </Button>
                <Button onClick={handleClose} variant="contained" color="primary">
                  CLOSE
                </Button>
              </DialogActions>
            </Dialog>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default ProcessTable;
