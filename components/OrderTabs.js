import React from "react";

const OrderTabs = ({ activeTab, onTabChange, stats }) => {
  const tabs = [
    { id: "inprogress", label: "In Progress", count: stats.inprogress },
    { id: "completed", label: "Completed", count: stats.completed },
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