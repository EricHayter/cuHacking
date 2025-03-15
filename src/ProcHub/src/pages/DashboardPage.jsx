import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import ProcessTable from '../components/ProcessTable';

const DashboardPage = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  const handleMenuClick = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  return (
    <div>
      <Navbar onMenuClick={handleMenuClick} />
      <ProcessTable />
    </div>
  );
};

export default DashboardPage;

