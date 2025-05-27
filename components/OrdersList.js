// components/OrdersList.js
import React from "react";
import OrderCard from "./OrderCard";
import ScrollContainer from 'react-indiana-drag-scroll'; // Import the package

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
    // Wrap the list of cards with ScrollContainer
    // The existing 'orders-list' class provides display:flex, gap, etc.
    // react-indiana-drag-scroll handles the overflow and drag interaction.
    <ScrollContainer
      vertical={false}      // Disable vertical scrolling by drag
      horizontal={true}     // Enable horizontal scrolling by drag
      className="orders-list" // Apply existing styling for flex layout and gap
      hideScrollbars={true} // This is a prop from react-indiana-drag-scroll, defaults to true
      // You can also pass 'style' prop if needed for more specific container styling
    >
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          onStatusUpdate={onStatusUpdate}
          showCompleted={showCompleted}
        />
      ))}
    </ScrollContainer>
  );
};

export default OrdersList;