import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import DashboardContent from '../components/DashboardContent';

const DashboardPage = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  const handleMenuClick = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  return (
    <div>
      <Navbar onMenuClick={handleMenuClick} />
      <Sidebar />
      <DashboardContent />
    </div>
  );
};

export default DashboardPage;

