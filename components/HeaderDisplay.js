// components/HeaderDisplay.js
import React from "react";

const CONNECTION_TEXT = {
  connected: "Online",
  error: "Offline",
  connecting: "Connecting...",
};

const HeaderDisplay = ({ connectionStatus, stats, onRefresh, isLoading }) => {
  const connectionText = CONNECTION_TEXT[connectionStatus] || "Unknown";
  const isOnline = connectionStatus === "connected";

  return (
    <header className="header">
      <div className="header-top">
        <h1 className="app-title">☕ The Vine Coffeehouse & Bakery</h1>
        <div className="connection-status">
          <div
            className={`status-dot ${isOnline ? "online" : "offline"}`}
            title={`Connection Status: ${connectionText}`}
          />
          <span>{connectionText}</span>
        </div>
      </div>
      <div className="header-bottom">
        <div className="stats">
          <div className="stat-item">
            <span>In Progress:</span>
            <span className="stat-count">{stats.inprogress || 0}</span>
          </div>
          {/* <div className="stat-item">
            <span>Completed:</span>
            <span className="stat-count">{stats.completed || 0}</span>
          </div> */}
        </div>
        <button
          type="button"
          className="refresh-btn"
          onClick={onRefresh}
          disabled={isLoading || connectionStatus === "connecting"}
          aria-label="Refresh orders"
          title="Refresh orders"
        >
          ↻ {isLoading ? "..." : "Refresh"}
        </button>
      </div>
    </header>
  );
};

export default HeaderDisplay;