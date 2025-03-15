import React from 'react';
import { Drawer, List, ListItem, ListItemText } from '@mui/material';

const Sidebar = () => {
  return (
    <Drawer
      sx={{
        width: 240,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 240,
          boxSizing: 'border-box',
        },
      }}
      variant="permanent"
      anchor="left"
    >
      <List>
        <ListItem button>
          <ListItemText primary="Dashboard" />
        </ListItem>
        <ListItem button>
          <ListItemText primary="Settings" />
        </ListItem>
        <ListItem button>
          <ListItemText primary="Profile" />
        </ListItem>
      </List>
    </Drawer>
  );
};

export default Sidebar;

