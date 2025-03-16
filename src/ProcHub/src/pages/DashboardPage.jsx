import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import ProcessTable from "../components/ProcessTable";

const DashboardPage = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [data, setData] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const ws = new WebSocket("ws://172.20.10.10");

    ws.onmessage = (event) => {
      try {
        const receivedData = JSON.parse(event.data);
		console.log(receivedData);
        switch (receivedData["request_type"]) {
          case "GetProcesses":
            for (let i = 0; i < receivedData["pids"].length; i++) {
              getSimpleProcessDetails(ws, receivedData["pids"][i]);
            }
			// copy it over to a new map
            break;
        }
        // setData(receivedData);
      } catch (error) {
        console.error("Invalid JSON received:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
    };

    setSocket(ws);

    const interval = setInterval(() => {
      getProcesses(ws);
    }, 1000);

    return () => {
      clearInterval(interval);
      ws.close();
    };
  }, []);

  const getProcesses = (ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ request_type: "GetProcesses" });
      ws.send(message);
    }
  };

  const getSimpleProcessDetails = (ws, pid) => {
    if (ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({
        request_type: "GetSimpleProcessDetalis",
        pid: pid,
      });
      ws.send(message);
    }
  };

  const getDetailedProcessDetails = (ws, pid) => {
    if (ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({
        request_type: "GetDetailedProcessDetails",
        pid: pid,
      });
      ws.send(message);
    }
  };

  const suspendProcess = (ws, pid) => {
    if (ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({
        request_type: "SuspendProcess",
        pid: pid,
      });
      ws.send(message);
    }
  };

  const handleMenuClick = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  return (
    <div>
      <Navbar onMenuClick={handleMenuClick} />
      <ProcessTable data={data}/>
    </div>
  );
};

export default DashboardPage;
