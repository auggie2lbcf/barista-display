// components/OrderDetailModal.js
import React from "react";
import { formatTime, formatCurrency } from "../lib/orderUtils"; //
import { ORDER_STATUS } from "../lib/config"; //

const OrderStatusBadge = ({ status }) => {
  const statusMap = {
    [ORDER_STATUS.IN_PROGRESS]: { label: "In Progress", class: "status-inprogress" }, //
    [ORDER_STATUS.COMPLETED]: { label: "Completed", class: "status-completed" }, //
  };
  const displayInfo = statusMap[status] || { label: status, class: "status-unknown" }; //
  return <div className={`status-badge ${displayInfo.class}`}>{displayInfo.label}</div>; //
};

const DetailedLineItem = ({ item }) => ( //
  <div className="detailed-line-item">
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
        <span className="modifiers-label">Modifiers:</span>
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

const OrderDetailModal = ({ order, onClose, onStatusUpdate }) => { // Added onStatusUpdate
  if (!order) return null;

  const {
    id, // Need id for status update
    displayId,
    timestamp,
    completedAt,
    customerName,
    status,
    lineItems = [],
    notes: orderNotes,
    total,
  } = order;

  const handleCompleteClick = async () => {
    if (onStatusUpdate) {
      await onStatusUpdate(id, ORDER_STATUS.COMPLETED); //
    }
    onClose(); // Close modal after action
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close order details">
          &times;
        </button>
        <div className="modal-header">
          <h2>Order #{displayId}</h2>
          <OrderStatusBadge status={status} />
        </div>
        <div className="modal-order-meta">
          <p><strong>Created:</strong> {formatTime(timestamp)}</p>
          {completedAt && <p><strong>Completed:</strong> {formatTime(completedAt)}</p>}
          {customerName && <p><strong>Customer:</strong> {customerName}</p>}
        </div>

        <div className="modal-line-items-container">
          <h3>Items</h3>
          {lineItems.length > 0 ? (
            lineItems.map((item, index) => (
              <DetailedLineItem key={`${order.id}-detail-item-${index}`} item={item} />
            ))
          ) : (
            <p>No items in this order.</p>
          )}
        </div>

        {orderNotes && (
          <div className="modal-order-notes">
            <strong>Order Note:</strong> {orderNotes}
          </div>
        )}

        <div className="modal-order-total">
          Total: {formatCurrency(total)}
        </div>

        {/* Add Complete button if order is in progress */}
        {status === ORDER_STATUS.IN_PROGRESS && ( //
          <button
            type="button"
            className="action-button btn-done modal-action-button" // Added modal-action-button for specific styling if needed
            onClick={handleCompleteClick}
            aria-label={`Mark order ${displayId} as completed`}
          >
            Complete Order
          </button>
        )}
      </div>
    </div>
  );
};

export default OrderDetailModal;