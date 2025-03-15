import React from 'react'
import { DataGrid } from '@mui/x-data-grid';
import Paper from '@mui/material/Paper';

const columns = [
  { field: 'pid', headerName: 'PID', width: 70 },
  { field: 'name', headerName: 'name', width: 130 },
  { field: 'cpuUsage', headerName: 'cpu usage', width: 130 },
  { field: 'ramUsage', headerName: 'ram usage', width: 130 },
  { field: 'uptime', headerName: 'uptime', width: 130 },
  { field: 'user', headerName: 'user', width: 50 },
  { field: 'suspendProc', headerName: 'suspend', sortable: false, wdith: 45 },
];

const rows = [

]

const paginationModel = { page: 0, pageSize: 5 };

const ProcessTable = () => {
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

