// components/OrderTabs.js
import React from "react";

const OrderTabs = ({ activeTab, onTabChange, stats, tabOptions }) => {
  const TABS_CONFIG = [
    { id: tabOptions.IN_PROGRESS, label: "In Progress", count: stats.inprogress },
    { id: tabOptions.COMPLETED, label: "Completed", count: stats.completed },
  ];

  return (
    <nav className="tabs">
      {TABS_CONFIG.map((tab) => (
        <button
          type="button"
          key={tab.id}
          className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
          onClick={() => onTabChange(tab.id)}
          aria-pressed={activeTab === tab.id}
          aria-label={`${tab.label} orders (${tab.count || 0})`}
        >
          {tab.label}
          {(tab.count || 0) > 0 && (
            <span className="tab-count">
              ({tab.count})
            </span>
          )}
        </button>
      ))}
    </nav>
  );
};

export default OrderTabs;