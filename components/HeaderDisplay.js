// components/HeaderDisplay.js
import React from "react";
import OrderTabs from "./OrderTabs"; // OrderTabs is crucial here

const CONNECTION_TEXT = {
  connected: "Online",
  error: "Offline",
  connecting: "Connecting...",
};

const HeaderDisplay = ({
  connectionStatus,
  stats, // stats is kept for OrderTabs, though not displayed elsewhere in header now
  onRefresh,
  isLoading,
  activeTab,
  onTabChange,
  tabOptions
}) => {
  const connectionText = CONNECTION_TEXT[connectionStatus] || "Unknown";
  const isOnline = connectionStatus === "connected";

  return (
    <header className="header">
      <div className="header-main-row"> {/* Changed from header-top */}
        {/* The app title (h1) is removed */}
        {/* OrderTabs are now here */}
        <div className="header-tabs-container">
          <OrderTabs
            activeTab={activeTab}
            onTabChange={onTabChange}
            stats={stats} // Pass stats to OrderTabs for counts
            tabOptions={tabOptions}
          />
        </div>

        <div className="header-controls"> {/* Container for status and refresh */}
          <div className="connection-status">
            <div
              className={`status-dot ${isOnline ? "online" : "offline"}`}
              title={`Connection Status: ${connectionText}`}
            />
            <span>{connectionText}</span>
          </div>
          <button
            type="button"
            className="refresh-btn"
            onClick={onRefresh}
            disabled={isLoading || connectionStatus === "connecting"}
            aria-label="Refresh orders"
            title="Refresh orders"
          >
            ↻ {isLoading ? "..." : ""} {/* Removed "Refresh" text to save space */}
          </button>
        </div>
      </div>
      {/* header-bottom is removed as stats and refresh button are integrated above or managed differently */}
    </header>
  );
};

export default HeaderDisplay;