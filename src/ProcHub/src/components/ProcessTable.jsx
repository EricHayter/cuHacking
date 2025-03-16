import React, { useState, useEffect } from 'react'
import { DataGrid } from '@mui/x-data-grid';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import { Dialog, DialogActions, DialogContent, DialogTitle, Button } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const cpuData = [
  { time: 'time1', CPU_Usage: 10 },
  { time: 'time2', CPU_Usage: 11 },
  { time: 'time3', CPU_Usage: 13 },
  { time: 'time4', CPU_Usage: 15 },
  { time: 'time5', CPU_Usage: 19 },
  { time: 'time6', CPU_Usage: 16 },
  { time: 'time7', CPU_Usage: 11 },
  { time: 'time8', CPU_Usage: 5 },
  { time: 'time9', CPU_Usage: 3 },
  { time: 'time10', CPU_Usage: 5 },
];

const columns = [
  { field: 'pid', headerName: 'PID', flex: 0.2 },
  { field: 'name', headerName: 'Name', flex: 1 },
  { field: 'cpuUsage', headerName: 'CPU usage', flex: 0.2 },
  { field: 'ramUsage', headerName: 'RAM usage', flex: 0.2 },
  { field: 'uptime', headerName: 'Uptime', flex: 0.7 },
  { field: 'user', headerName: 'User', flex: 0.5 },
  { field: 'suspendProc', 
    headerName: 'Suspend',
    sortable: false,
    width: 45,
    renderCell: (params) => (
      <Button
        variant="outlined"
        color="error"
        onClick={() => handleButtonClick(params.row.id)}
      >
        Suspend
      </Button>
    ),
    flex: 0.3
    },
];

const handleButtonClick = (id) => {
  alert(`I'm going to suspend proess with PID: ${id}`);
};

class Row {
  constructor(id, name, cpuUsage, ramUsage, uptime, user, suspendProc) {
    this.id = id;
    this.pid = id;
    this.name = name;
    this.cpuUsage = cpuUsage;
    this.ramUsage = ramUsage;
    this.uptime = uptime;
    this.user = user;
    this.suspendProc = suspendProc;
  }
}

const rows = [
  new Row(1, "process", 11, 11, 1001, "me"), 
  new Row(2, "process", 12, 12, 1002, "me"), 
  new Row(3, "process", 13, 13, 1003, "me"), 
  new Row(4, "process", 14, 14, 1004, "me"), 
  new Row(5, "process", 15, 15, 1005, "me"), 
  new Row(6, "process", 16, 16, 1006, "me"),
  new Row(7, "process", 16, 16, 1006, "me"),
  new Row(8, "process", 16, 16, 1006, "me"),
  new Row(9, "process", 16, 16, 1006, "me"),
  new Row(12, "process", 16, 16, 1006, "me"),
  new Row(62, "process", 16, 16, 1006, "me"),
  new Row(63, "process", 16, 16, 1006, "me"),
  new Row(64, "process", 16, 16, 1006, "me"),
  new Row(65, "process", 16, 16, 1006, "me"),
  new Row(66, "process", 16, 16, 1006, "me"),
  new Row(67, "process", 16, 16, 1006, "me"),
]

const paginationModel = { page: 0, pageSize: 30 };

const ProcessTable = () => {
  const [open, setOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [data, setData] = useState(cpuData);

  const generateNew = () => Math.floor(Math.random() * 100);

  const updateData = () => {
    setData(prevData => {
      const newData = [...prevData];
      newData.shift();
      newData.push({ time: 'newtime', CPU_Usage: generateNew() });
      return newData;
    });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      updateData(); 
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleRowClick = (param) => {
    setSelectedRow(param.row);
    setOpen(true);
  }

  const handleClose = () => {
    setOpen(false);
  }
  return (
      <Paper sx={{ 
        height: 750,   
        width: '100%',
      }}>
        <DataGrid
          rows={rows}
          columns={columns}
          initialState={{ pagination: { paginationModel } }}
          pageSizeOptions={[5, 10]}
          sx={{ border: 0 }}
          onRowClick={handleRowClick}
        />
        <Dialog open={open} onClose={handleClose} fullScreen>
        <DialogTitle>Process Details</DialogTitle>
          <ResponsiveContainer width="100%" height="50%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[0, 100]}/>
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="CPU_Usage" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
          <DialogContent>
            {selectedRow && (
              <div>
                <p><strong>PID:</strong> {selectedRow.pid}</p>
                <p><strong>Name:</strong> {selectedRow.name}</p>
                <p><strong>CPU Usage:</strong> {selectedRow.cpuUsage}</p>
                <p><strong>RAM Usage:</strong> {selectedRow.ramUsage}</p>
                <p><strong>Uptime:</strong> {selectedRow.uptime}</p>
                <p><strong>User:</strong> {selectedRow.user}</p>
                <p><strong>Other info:</strong> {"blahblahblah"}</p>
              </div>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} color="primary">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>	
  )
}

export default ProcessTable;
