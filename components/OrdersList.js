// components/OrdersList.js
import React from "react";
import OrderCard from "./OrderCard"; //
import ScrollContainer from 'react-indiana-drag-scroll';

const OrdersList = ({
  orders,
  onStatusUpdate,
  isLoading,
  emptyStateMessage, 
  showCompleted = false,
  onOrderSelect, // Added prop
}) => {

  if (isLoading) {
    return <div className="loading-state">Loading orders...</div>;
  }

  if (emptyStateMessage && (!orders || orders.length === 0)) { //
    const subMessage = showCompleted //
      ? "Completed orders will appear here once processed."
      : "New orders will appear here automatically.";
    return (
      <div className="empty-state">
        <h3>{emptyStateMessage}</h3>
        <p>{subMessage}</p>
      </div>
    );
  }

  if (!orders || orders.length === 0) { //
    return (
      <div className="empty-state">
        <h3>No orders to display</h3>
        <p>Check back soon or try refreshing.</p>
      </div>
    );
  }

  return (
    <ScrollContainer
      vertical={false}      
      horizontal={true}     
      className="orders-list" 
      hideScrollbars={true} 
    >
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          onStatusUpdate={onStatusUpdate}
          showCompleted={showCompleted}
          onOrderSelect={onOrderSelect} // Pass down the prop
        />
      ))}
    </ScrollContainer>
  );
};

export default OrdersList;