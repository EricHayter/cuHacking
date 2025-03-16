import React, { useState, useEffect } from "react";
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
  if (!seconds) return "Unknown";
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
};

const formatMemory = (kb) => {
  if (!kb) return "0 KB";
  
  if (kb < 1024) return `${kb} KB`;
  if (kb < 1048576) return `${(kb / 1024).toFixed(2)} MB`;
  return `${(kb / 1048576).toFixed(2)} GB`;
};

const getCurrentTime = () => {
  const now = new Date();
  return now.toLocaleTimeString(); // Formats as "HH:MM:SS"
};

const ProcessTable = ({ data, loading, onGetDetails, onSuspendProcess, socket }) => {
  const [open, setOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const columns = [
    { field: "pid", headerName: "PID", flex: 0.2 },
    { field: "name", headerName: "Name", flex: 1 },
    { 
      field: "cpu_usage", 
      headerName: "CPU usage", 
      flex: 0.2,
      valueFormatter: (params) => `${params.value.toFixed(1)}%`
    },
    { 
      field: "ram_usage", 
      headerName: "RAM usage", 
      flex: 0.2,
      valueFormatter: (params) => formatMemory(params.value)
    },
    { 
      field: "uptime", 
      headerName: "Uptime", 
      flex: 0.7,
      valueFormatter: (params) => formatUptime(params.value)
    },
    { field: "user", headerName: "User", flex: 0.5 },
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

  const handleSuspendClick = (pid) => {
    if (onSuspendProcess) {
      onSuspendProcess(pid);
    }
  };

  const handleRowClick = (param) => {
    setSelectedRow(param.row);
    setOpen(true);
    setDetailsLoading(true);
    
    // Request detailed process info when a row is clicked
    if (socket && onGetDetails) {
      onGetDetails(socket, param.row.pid);
    }
  };

  // Update chart data when detailed process info is received
  useEffect(() => {
    if (selectedRow && selectedRow.history) {
      const newChartData = selectedRow.history.map(entry => ({
        time: new Date(entry.timestamp * 1000).toLocaleTimeString(),
        CPU_Usage: entry.cpu_usage,
        RAM_Usage: entry.memory_usage / 1024 // Convert to MB
      }));
      
      setChartData(newChartData);
      setDetailsLoading(false);
    }
  }, [selectedRow]);

  const handleClose = () => {
    setOpen(false);
    setSelectedRow(null);
  };

  // Transform the data for DataGrid by adding an id field if needed
  const rows = data ? data.map(process => ({
    ...process,
    id: process.pid // Ensure each row has an id for DataGrid
  })) : [];

  return (
    <Paper
      sx={{
        height: 750,
        width: "100%",
        p: 2
      }}
    >
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="100%">
          <CircularProgress />
        </Box>
      ) : (
        <>
          <DataGrid
            rows={rows}
            columns={columns}
            initialState={{ 
              pagination: { 
                paginationModel: { page: 0, pageSize: 30 } 
              } 
            }}
            pageSizeOptions={[10, 30, 50]}
            sx={{ border: 0 }}
            onRowClick={handleRowClick}
            autoHeight
          />
          
          <Dialog open={open} onClose={handleClose} fullScreen>
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
                  {chartData.length > 0 && (
                    <Box height="400px" width="100%" mt={2}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" />
                          <YAxis yAxisId="left" orientation="left" domain={[0, 100]} />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip />
                          <Legend />
                          <Line 
                            yAxisId="left"
                            type="monotone" 
                            dataKey="CPU_Usage" 
                            stroke="#8884d8" 
                            name="CPU Usage (%)" 
                          />
                          <Line 
                            yAxisId="right"
                            type="monotone" 
                            dataKey="RAM_Usage" 
                            stroke="#82ca9d" 
                            name="RAM Usage (MB)" 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                  
                  {selectedRow && (
                    <Box mt={3}>
                      <h3>Process Information</h3>
                      <p><strong>PID:</strong> {selectedRow.pid}</p>
                      <p><strong>Name:</strong> {selectedRow.name}</p>
                      <p><strong>CPU Usage:</strong> {selectedRow.cpu_usage.toFixed(1)}%</p>
                      <p><strong>RAM Usage:</strong> {formatMemory(selectedRow.ram_usage)}</p>
                      <p><strong>Uptime:</strong> {formatUptime(selectedRow.uptime)}</p>
                      <p><strong>User:</strong> {selectedRow.user}</p>
                    </Box>
                  )}
                </>
              )}
            </DialogContent>
            
            <DialogActions>
              <Button 
                onClick={() => handleSuspendClick(selectedRow?.pid)} 
                color="error" 
                variant="contained"
                disabled={!selectedRow}
              >
                Suspend Process
              </Button>
              <Button onClick={handleClose} color="primary" variant="contained">
                Close
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Paper>
  );
};

export default ProcessTable;
