import React from "react";

const OrderCard = ({ order, onStatusUpdate, showCompleted = false }) => {
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount) => {
    return `$${(amount / 100).toFixed(2)}`;
  };

  const getStatusDisplay = (status) => {
    const statusMap = {
      received: { label: "New", class: "status-new" },
      preparing: { label: "Preparing", class: "status-preparing" },
      ready: { label: "Ready", class: "status-ready" },
      completed: { label: "Completed", class: "status-completed" },
    };
    return statusMap[status] || { label: status, class: "status-new" };
  };

  const getActionButton = () => {
    if (showCompleted) {
      return null; // No action buttons for completed orders
    }

    switch (order.status) {
      case "received":
        return (
          <button
            className="action-button btn-start"
            onClick={() => onStatusUpdate(order.id, "preparing")}
          >
            Start
          </button>
        );
      case "preparing":
        return (
          <button
            className="action-button btn-ready"
            onClick={() => onStatusUpdate(order.id, "ready")}
          >
            Ready
          </button>
        );
      case "ready":
        return (
          <button
            className="action-button btn-done"
            onClick={() => onStatusUpdate(order.id, "completed")}
          >
            Done
          </button>
        );
      default:
        return null;
    }
  };

  const statusDisplay = getStatusDisplay(order.status);

  return (
    <div className={`order-card ${showCompleted ? 'completed-order' : ''}`}>
      <div className="order-header">
        <div className="order-info">
          <div className="order-id">Order #{order.displayId}</div>
          <div className="order-time">
            Created: {formatTime(order.timestamp)}
          </div>
          {order.completedAt && showCompleted && (
            <div className="completion-time">
              Completed: {formatTime(order.completedAt)}
            </div>
          )}
          {order.customerName && (
            <div className="order-customer">{order.customerName}</div>
          )}
        </div>
        <div className={`status-badge ${statusDisplay.class}`}>
          {statusDisplay.label}
        </div>
      </div>

      {order.lineItems && order.lineItems.length > 0 && (
        <div className="line-items">
          {order.lineItems.map((item, index) => (
            <div key={index} className="line-item-detailed">
              <div className="item-header">
                <div className="item-main-info">
                  <span className="item-name">{item.name}</span>
                  <span className="item-quantity">×{item.quantity}</span>
                </div>
                {item.price > 0 && (
                  <span className="item-price">{formatCurrency(item.price)}</span>
                )}
              </div>
              
              {item.variationName && (
                <div className="item-variation">
                  <span className="variation-label">Size/Type:</span>
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
                  <span className="note-label">Note:</span>
                  <span className="note-text">{item.note}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {order.notes && (
        <div className="order-notes">
          <strong>Order Note:</strong> {order.notes}
        </div>
      )}

      <div className="order-total">Total: {formatCurrency(order.total)}</div>

      {getActionButton()}
    </div>
  );
};

export default OrderCard;
