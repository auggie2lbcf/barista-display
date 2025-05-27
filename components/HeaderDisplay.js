import React from "react";

const HeaderDisplay = ({ connectionStatus, stats, onRefresh, isLoading }) => {
  return (
    <header className="header">
      <div className="header-top">
        <h1 className="app-title">☕ KDS</h1>
        <div className="connection-status">
          <div
            className={`status-dot ${
              connectionStatus === "error" ? "error" : ""
            }`}
          />
          <span>{connectionStatus === "connected" ? "Online" : "Offline"}</span>
        </div>
      </div>
      <div className="header-bottom">
        <div className="stats">
          <div className="stat-item">
            <span>New:</span>
            <span className="stat-count">{stats.new}</span>
          </div>
          <div className="stat-item">
            <span>Prep:</span>
            <span className="stat-count">{stats.preparing}</span>
          </div>
          <div className="stat-item">
            <span>Ready:</span>
            <span className="stat-count">{stats.ready}</span>
          </div>
        </div>
        <button
          className="refresh-btn"
          onClick={onRefresh}
          disabled={isLoading}
          aria-label="Refresh orders"
        >
          ↻ {isLoading ? "..." : "Refresh"}
        </button>
      </div>
    </header>
  );
};

export default HeaderDisplay;
