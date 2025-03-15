import React from 'react';
import { Box, Typography } from '@mui/material';
import ProcessTable from './ProcessTable';

const DashboardContent = () => {
  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        padding: 3,
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

