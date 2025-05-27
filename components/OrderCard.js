// components/OrderCard.js
import React from "react";
import { ORDER_STATUS } from "../lib/config";
import { formatTime, formatCurrency } from "../lib/orderUtils"; // Import utility functions

const OrderStatusBadge = ({ status }) => {
  const statusMap = {
    [ORDER_STATUS.IN_PROGRESS]: { label: "In Progress", class: "status-inprogress" },
    [ORDER_STATUS.COMPLETED]: { label: "Completed", class: "status-completed" },
    // Add other statuses if needed
  };
  const displayInfo = statusMap[status] || { label: status, class: "status-unknown" }; // Default for unknown

  return (
    <div className={`status-badge ${displayInfo.class}`}>
      {displayInfo.label}
    </div>
  );
};

const LineItem = ({ item }) => (
  <div className="line-item-detailed">
    <div className="item-header">
      <div className="item-main-info">
        <span className="item-name" title={item.name}>{item.name}</span>
        <span className="item-quantity">×{item.quantity}</span>
      </div>
      {item.price > 0 && (
        <span className="item-price">{formatCurrency(item.price)}</span>
      )}
    </div>

    {item.variationName && (
      <div className="item-variation">
        <span className="variation-label">Type:</span>
        <span className="variation-name">{item.variationName}</span>
      </div>
    )}

    {item.modifiers && item.modifiers.length > 0 && (
      <div className="item-modifiers">
        {item.modifiers.map((modifier, modIndex) => (
          <div key={modIndex} className="modifier-item">
            <span className="modifier-name">
              {modifier.quantity > 1 ? `${modifier.quantity}× ` : ""}
              {modifier.name}
            </span>
            {modifier.price > 0 && (
              <span className="modifier-price">
                +{formatCurrency(modifier.price)}
              </span>
            )}
          </div>
        ))}
      </div>
    )}

    {item.note && (
      <div className="item-note">
        <span className="note-label">Item Note:</span>
        <span className="note-text">{item.note}</span>
      </div>
    )}
  </div>
);


const OrderCard = ({ order, onStatusUpdate, showCompleted = false }) => {
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
    if (showCompleted || status === ORDER_STATUS.COMPLETED) {
      return null; // No action buttons for completed orders in either tab
    }

    if (status === ORDER_STATUS.IN_PROGRESS) {
      return (
        <button
          type="button"
          className="action-button btn-done"
          onClick={() => onStatusUpdate(id, ORDER_STATUS.COMPLETED)}
          aria-label={`Mark order ${displayId} as completed`}
        >
          Complete
        </button>
      );
    }
    return null; // Default to no button if status is not 'inprogress'
  };

  return (
    <div className={`order-card ${showCompleted ? 'completed-order' : 'inprogress-order'}`}>
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

      {lineItems.length > 0 && (
        <div className="line-items">
          {lineItems.map((item, index) => (
            <LineItem key={`${id}-item-${index}`} item={item} />
          ))}
        </div>
      )}

      {orderNotes && (
        <div className="order-notes">
          <strong>Order Note:</strong> {orderNotes}
        </div>
      )}

      <div className="order-total">Total: {formatCurrency(total)}</div>

      {renderActionButton()}
    </div>
  );
};

export default OrderCard;