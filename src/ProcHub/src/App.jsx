import React from 'react';
import DashboardPage from './pages/DashboardPage';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
  // typography: {
  //   fontFamily: '"Courier New", monospace',
  //   fontWeight: 'bold',
  // },
});


const App = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <DashboardPage />
    </ThemeProvider>
  );
};

export default App;
