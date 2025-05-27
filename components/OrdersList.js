import React from "react";
import OrderCard from "./OrderCard";

const OrdersList = ({ orders, onStatusUpdate, isLoading, error, showCompleted = false }) => {
  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (isLoading && orders.length === 0) {
    return <div className="loading">Loading orders...</div>;
  }

  if (!orders || orders.length === 0) {
    const emptyMessage = showCompleted 
      ? "No completed orders found"
      : "No orders found";
    const emptySubMessage = showCompleted
      ? "Completed orders will appear here"
      : "New orders will appear here automatically";

    return (
      <div className="empty-state">
        <h3>{emptyMessage}</h3>
        <p>{emptySubMessage}</p>
      </div>
    );
  }

  return (
    <div className="orders-list">
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          onStatusUpdate={onStatusUpdate}
          showCompleted={showCompleted}
        />
      ))}
    </div>
  );
};

export default OrdersList;
