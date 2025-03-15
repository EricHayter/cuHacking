import React from 'react';
import { Box, Typography } from '@mui/material';
import ProcessTable from './ProcessTable';

const DashboardContent = () => {
  return (
    <Box
      sx={{
        flexGrow: 1,
        bgcolor: 'background.default',
        padding: 3,
        marginLeft: 240, // To leave space for the sidebar
        marginTop: 64, // To leave space for the navbar
      }}
    >
      <Typography variant="h4" gutterBottom>
        Welcome to the Dashboard!
      </Typography>
      {/* Add additional content here */}
	  <ProcessTable />
    </Box>
  );
};

export default DashboardContent;

