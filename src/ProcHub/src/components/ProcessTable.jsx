import React from 'react'
import { DataGrid } from '@mui/x-data-grid';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button'


const columns = [
  { field: 'pid', headerName: 'PID', flex: 0.2 },
  { field: 'name', headerName: 'name', flex: 1 },
  { field: 'cpuUsage', headerName: 'cpu usage', flex: 0.2 },
  { field: 'ramUsage', headerName: 'ram usage', flex: 0.2 },
  { field: 'uptime', headerName: 'uptime', flex: 0.7 },
  { field: 'user', headerName: 'user', flex: 0.5 },
  { field: 'suspendProc', 
    headerName: 'suspend',
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

// Button click handler
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
  new Row(1, "process", 11, 11, 1001, "me", "idk"), 
  new Row(2, "process", 12, 12, 1002, "me", "idk"), 
  new Row(3, "process", 13, 13, 1003, "me", "idk"), 
  new Row(4, "process", 14, 14, 1004, "me", "idk"), 
  new Row(5, "process", 15, 15, 1005, "me", "idk"), 
  new Row(6, "process", 16, 16, 1006, "me", "idk"),
  new Row(7, "process", 16, 16, 1006, "me", "idk"),
  new Row(8, "process", 16, 16, 1006, "me", "idk"),
  new Row(9, "process", 16, 16, 1006, "me", "idk"),
  new Row(12, "process", 16, 16, 1006, "me", "idk"),
  new Row(62, "process", 16, 16, 1006, "me", "idk"),
  new Row(63, "process", 16, 16, 1006, "me", "idk"),
  new Row(64, "process", 16, 16, 1006, "me", "idk"),
  new Row(65, "process", 16, 16, 1006, "me", "idk"),
  new Row(66, "process", 16, 16, 1006, "me", "idk"),
  new Row(67, "process", 16, 16, 1006, "me", "idk"),
]

const paginationModel = { page: 0, pageSize: 30 };

const ProcessTable = () => {
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
        />
      </Paper>	
  )
}

export default ProcessTable;
