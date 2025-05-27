import React from "react";

const OrderTabs = ({ activeTab, onTabChange, stats }) => {
  const tabs = [
    { id: "all", label: "All", count: stats.total },
    { id: "new", label: "New", count: stats.new },
    { id: "preparing", label: "Prep", count: stats.preparing },
    { id: "ready", label: "Ready", count: stats.ready },
    { id: "completed", label: "Done", count: stats.completed },
  ];

  return (
    <nav className="tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
          onClick={() => onTabChange(tab.id)}
          aria-label={`${tab.label} orders (${tab.count})`}
        >
          {tab.label}
          {tab.count > 0 && (
            <span style={{ marginLeft: "0.25rem", fontSize: "0.75rem" }}>
              ({tab.count})
            </span>
          )}
        </button>
      ))}
    </nav>
  );
};

export default OrderTabs;
