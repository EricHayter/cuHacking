import React from 'react'
import { DataGrid } from '@mui/x-data-grid';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';


const columns = [
  { field: 'pid', headerName: 'PID', width: 70 },
  { field: 'name', headerName: 'name', width: 130 },
  { field: 'cpuUsage', headerName: 'cpu usage', width: 130 },
  { field: 'ramUsage', headerName: 'ram usage', width: 130 },
  { field: 'uptime', headerName: 'uptime', width: 130 },
  { field: 'user', headerName: 'user', width: 50 },
  { field: 'suspendProc', headerName: 'suspend', sortable: false, wdith: 45 },
];

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

const row = {
  id: 1,
  pid: 40000,
  name: "process",
  cpuUsage: 10,
  ramUsage: 1,
  uptime: 1000,
  user: "me",
  suspendProc: "idk"
};
// const row = new Row(1000, "process", 10, 1, 1000, "me", "idk");

const rows = [row, row, row, row, row];
//   new Row(1, "process", 10, 1, 1000, "me", "idk"), 
//   new Row(2, "process", 10, 1, 1000, "me", "idk"), 
//   new Row(3, "process", 10, 1, 1000, "me", "idk"), 
//   new Row(4, "process", 10, 1, 1000, "me", "idk"), 
//   new Row(5, "process", 10, 1, 1000, "me", "idk"), 
//   new Row(6, "process", 10, 1, 1000, "me", "idk")
// ]

const paginationModel = { page: 0, pageSize: 5 };

const ProcessTable = () => {
  // const [rows, setRows] = useState([
  //   new Row(1234, 'Process 1', '10%', '20MB', '1h', 'user1', 'No'),
  //   new Row(5678, 'Process 2', '20%', '40MB', '2h', 'user2', 'Yes'),
  //   new Row(9101, 'Process 3', '30%', '60MB', '3h', 'user3', 'No'),
  // ]);
  // const addRow = () => {
  //   const newRow = new Process(1122, 'New Process', '25%', '50MB', '2h', 'user4', 'No');
  //   setRows([...rows, newRow]);
  // };
  return (
      <Paper sx={{ height: 400, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          initialState={{ pagination: { paginationModel } }}
          pageSizeOptions={[5, 10]}
          checkboxSelection
          sx={{ border: 0 }}
        />
      </Paper>	
  )
}

export default ProcessTable;

