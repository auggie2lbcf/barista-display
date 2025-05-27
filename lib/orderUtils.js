// lib/orderUtils.js
import { ORDER_STATUS, SQUARE_ORDER_STATE, SQUARE_FULFILLMENT_STATE } from './config';

/**
 * Transforms a raw Square order object into a display-friendly format.
 * @param {object} squareOrder - The raw order object from the Square API.
 * @returns {object|null} The transformed order object or null if the order should be filtered out.
 */
export const transformSquareOrder = (squareOrder) => {
  if (!squareOrder || !squareOrder.id) {
    console.warn("Invalid Square order object received:", squareOrder);
    return null;
  }

  const { id, version, state, created_at, updated_at, line_items = [], fulfillments = [], total_money, note: orderNote } = squareOrder;

  // Determine internal status
  let internalStatus = ORDER_STATUS.IN_PROGRESS;
  let completedAtTimestamp = null;

  if (state === SQUARE_ORDER_STATE.COMPLETED) {
    internalStatus = ORDER_STATUS.COMPLETED;
    completedAtTimestamp = updated_at || created_at;
  } else if (state === SQUARE_ORDER_STATE.CANCELED) {
    return null; // Filter out canceled orders
  } else {
    // Check fulfillment status if order is not explicitly completed or canceled
    if (fulfillments && fulfillments.length > 0) {
      const primaryFulfillment = fulfillments[0];
      if (primaryFulfillment.state === SQUARE_FULFILLMENT_STATE.COMPLETED) {
        internalStatus = ORDER_STATUS.COMPLETED;
        completedAtTimestamp = primaryFulfillment.updated_at || primaryFulfillment.created_at || updated_at;
      } else if (primaryFulfillment.state === SQUARE_FULFILLMENT_STATE.CANCELED) {
        return null; // Filter out if fulfillment is canceled
      }
      // Other fulfillment states (PROPOSED, RESERVED, PREPARED) are considered IN_PROGRESS
    }
  }

  // Extract customer name
  let customerName = null;
  const primaryFulfillmentDetails = fulfillments[0]?.pickup_details || fulfillments[0]?.delivery_details;
  if (primaryFulfillmentDetails?.recipient?.display_name) {
    customerName = primaryFulfillmentDetails.recipient.display_name;
  } else if (fulfillments[0]?.pickup_details?.note) { // Fallback for pickup note as name
    customerName = fulfillments[0].pickup_details.note;
  } else if (squareOrder.recipient?.display_name) { // Top-level recipient
    customerName = squareOrder.recipient.display_name;
  }


  // Process line items
  const processedLineItems = line_items.map((item) => ({
    name: item.name || "Unknown Item",
    variationName: item.variation_name || item.catalog_object_id || null,
    quantity: parseInt(item.quantity, 10) || 1,
    modifiers: (item.modifiers || []).map((modifier) => ({
      name: modifier.name || "Modifier",
      quantity: parseInt(modifier.quantity, 10) || 1,
      price: modifier.base_price_money ? parseInt(modifier.base_price_money.amount, 10) : 0,
      catalog_object_id: modifier.catalog_object_id || null,
    })),
    note: item.note || null,
    price: item.total_money ? parseInt(item.total_money.amount, 10) : 0,
    catalog_object_id: item.catalog_object_id || null,
  }));

  return {
    id,
    displayId: id.slice(-6).toUpperCase(), // Example: Last 6 chars, uppercase
    version,
    status: internalStatus,
    timestamp: created_at || new Date().toISOString(),
    completedAt: completedAtTimestamp,
    customerName,
    lineItems: processedLineItems,
    total: parseInt(total_money?.amount || 0, 10),
    notes: orderNote || null,
    fulfillmentId: fulfillments[0]?.uid || null,
    // Store original Square states for potential debugging or more complex logic
    squareOrderState: state,
    squareFulfillmentState: fulfillments[0]?.state || null,
  };
};

/**
 * Formats a timestamp string into a locale-specific time string.
 * @param {string} timestamp - The ISO timestamp string.
 * @returns {string} Formatted time string (e.g., "02:30 PM").
 */
export const formatTime = (timestamp) => {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Formats a currency amount (in cents) into a string (e.g., "$10.50").
 * @param {number} amountInCents - The amount in cents.
 * @returns {string} Formatted currency string.
 */
export const formatCurrency = (amountInCents) => {
  if (typeof amountInCents !== 'number') return "$0.00";
  return `$${(amountInCents / 100).toFixed(2)}`;
};