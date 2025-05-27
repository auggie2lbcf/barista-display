// components/OrderCard.js
import React from "react";
import { ORDER_STATUS } from "../lib/config"; //
import { formatTime, formatCurrency } from "../lib/orderUtils"; //

const OrderStatusBadge = ({ status }) => {
  const statusMap = {
    [ORDER_STATUS.IN_PROGRESS]: { label: "In Progress", class: "status-inprogress" }, //
    [ORDER_STATUS.COMPLETED]: { label: "Completed", class: "status-completed" }, //
  };
  const displayInfo = statusMap[status] || { label: status, class: "status-unknown" };

  return (
    <div className={`status-badge ${displayInfo.class}`}>
      {displayInfo.label}
    </div>
  );
};

// Simplified LineItem for card overview
const OverviewLineItem = ({ item }) => (
  <div className="overview-line-item">
    <span className="item-quantity-overview">{item.quantity}×</span>
    <span className="item-name-overview" title={item.name}>{item.name}</span>
    {/* Optionally show variation if it's very short, or omit for overview */}
    {item.variationName && <span className="item-variation-overview">({item.variationName})</span>}
  </div>
);


const OrderCard = ({ order, onStatusUpdate, showCompleted = false, onOrderSelect }) => {
  if (!order) return null;

  const {
    id,
    displayId,
    timestamp,
    completedAt,
    customerName,
    status,
    lineItems = [],
    notes: orderNotes,
    total,
  } = order;

  const renderActionButton = () => {
    if (showCompleted || status === ORDER_STATUS.COMPLETED) { //
      return null; 
    }

    if (status === ORDER_STATUS.IN_PROGRESS) { //
      return (
        <button
          type="button"
          className="action-button btn-done"
          onClick={(e) => {
            e.stopPropagation(); // Prevent card click when clicking button
            onStatusUpdate(id, ORDER_STATUS.COMPLETED); //
          }}
          aria-label={`Mark order ${displayId} as completed`}
        >
          Complete
        </button>
      );
    }
    return null; 
  };
  
  const handleCardClick = () => {
    if (onOrderSelect) {
      onOrderSelect(order);
    }
  };

  return (
    <div 
      className={`order-card ${showCompleted ? 'completed-order' : 'inprogress-order'}`}
      onClick={handleCardClick} // Added click handler
      role="button" // Make it accessible as a button
      tabIndex={0} // Make it focusable
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(); }} // Keyboard accessible
    >
      <div className="order-header">
        <div className="order-info">
          <div className="order-id">Order #{displayId}</div>
          <div className="order-time">
            Created: {formatTime(timestamp)}
          </div>
          {customerName && (
            <div className="order-customer" title={customerName}>{customerName}</div>
          )}
          {showCompleted && completedAt && (
            <div className="completion-time">
              Completed: {formatTime(completedAt)}
            </div>
          )}
        </div>
        <OrderStatusBadge status={status} />
      </div>

      {/* Item Overview Section */}
      <div className="order-items-overview">
        {lineItems.length > 0 ? (
          lineItems.slice(0, 3).map((item, index) => ( // Show first 3 items as overview
            <OverviewLineItem key={`${id}-overview-item-${index}`} item={item} />
          ))
        ) : (
          <p className="no-items-overview">No items</p>
        )}
        {lineItems.length > 3 && (
          <p className="more-items-indicator">...and {lineItems.length - 3} more item(s)</p>
        )}
      </div>


      {orderNotes && (
        <div className="order-notes-overview">
          <strong>Note:</strong> {orderNotes.substring(0, 50)}{orderNotes.length > 50 ? "..." : ""}
        </div>
      )}

      <div className="order-total">Total: {formatCurrency(total)}</div>

      {renderActionButton()}
    </div>
  );
};

export default OrderCard;