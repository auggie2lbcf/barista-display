// components/OrdersList.js
import React from "react";
import OrderCard from "./OrderCard";

const OrdersList = ({
  orders,
  onStatusUpdate,
  isLoading,
  emptyStateMessage, // Changed from 'error' prop for clarity
  showCompleted = false,
}) => {

  if (isLoading) {
    return <div className="loading-state">Loading orders...</div>;
  }

  if (emptyStateMessage && (!orders || orders.length === 0)) {
    const subMessage = showCompleted
      ? "Completed orders will appear here once processed."
      : "New orders will appear here automatically.";
    return (
      <div className="empty-state">
        <h3>{emptyStateMessage}</h3>
        <p>{subMessage}</p>
      </div>
    );
  }


  if (!orders || orders.length === 0) {
    // This case should ideally be covered by emptyStateMessage
    // but acts as a fallback.
    return (
      <div className="empty-state">
        <h3>No orders to display</h3>
        <p>Check back soon or try refreshing.</p>
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