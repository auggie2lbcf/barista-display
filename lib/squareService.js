// lib/squareService.js
import { CONFIG, SQUARE_API_CONSTANTS, HTTP_METHODS, SQUARE_ORDER_STATE, SQUARE_FULFILLMENT_STATE } from './config'; // Added SQUARE_ORDER_STATE and SQUARE_FULFILLMENT_STATE

/**
 * Generic function to call the square-proxy API.
 * @param {string} squareApiPath - The Square API path (e.g., "/v2/orders/search").
 * @param {string} actualMethodForSquare - The HTTP method for the actual Square API call (e.g., "POST", "PUT").
 * @param {object} bodyForSquare - The body to send to the Square API.
 * @returns {Promise<object>} The JSON response from the proxy.
 * @throws {Error} If the API call fails or returns an error.
 */
const callSquareProxy = async (squareApiPath, actualMethodForSquare, bodyForSquare = {}) => {
  const response = await fetch("/api/square-proxy", {
    method: HTTP_METHODS.POST, // Method to our proxy is always POST
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      environment: CONFIG.SQUARE_ENVIRONMENT_CONFIG,
      square_api_path: squareApiPath,
      actual_method_for_square: actualMethodForSquare,
      body: bodyForSquare,
    }),
  });

  const responseData = await response.json().catch(() => {
    // Handle cases where the proxy or Square might not return JSON
    if (!response.ok) {
      return {
        errors: [{
          category: "PROXY_ERROR",
          code: "PARSE_ERROR",
          detail: `Failed to parse JSON response from proxy/Square. Status: ${response.status} ${response.statusText}`
        }]
      };
    }
    return {}; // Should not happen for successful Square calls
  });

  if (!response.ok) {
    const errorMessage = responseData.errors?.[0]?.detail || responseData.detail || `API Error: ${response.statusText}`;
    console.error(`Square Proxy Error (${squareApiPath}): ${errorMessage}`, responseData);
    throw new Error(errorMessage);
  }

  if (responseData.errors && responseData.errors.length > 0) {
    console.warn(`Square API returned errors for ${squareApiPath}:`, responseData.errors);
    // Depending on severity, you might want to throw only for critical errors
    // For now, let's throw the first error's detail
    throw new Error(responseData.errors[0].detail || "Square API error");
  }

  return responseData;
};

/**
 * Fetches orders from Square.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of orders.
 */
export const fetchOrdersFromSquare = async () => {
  if (!CONFIG.SQUARE_LOCATION_ID_CONFIG) {
    throw new Error("Configuration error: Square Location ID not set.");
  }

  const startTime = new Date(
    Date.now() - CONFIG.ORDER_FETCH_HOURS_AGO * 60 * 60 * 1000
  ).toISOString();

  const searchBody = {
    location_ids: [CONFIG.SQUARE_LOCATION_ID_CONFIG],
    query: {
      filter: {
        date_time_filter: { created_at: { start_at: startTime } },
        state_filter: { states: [SQUARE_ORDER_STATE.OPEN, SQUARE_ORDER_STATE.COMPLETED] }, // Now correctly referenced
      },
      sort: { sort_field: "CREATED_AT", sort_order: "DESC" },
    },
    limit: 100, // Adjust as needed
  };

  const data = await callSquareProxy(
    SQUARE_API_CONSTANTS.SEARCH_ORDERS_PATH,
    HTTP_METHODS.POST,
    searchBody
  );
  return data.orders || [];
};

/**
 * Updates an order in Square (e.g., to mark as completed).
 * @param {string} orderId - The ID of the order to update.
 * @param {number} version - The version of the order.
 * @param {string|null} fulfillmentId - The fulfillment ID if updating a fulfillment.
 * @returns {Promise<object>} The updated order data from Square.
 */
export const updateSquareOrder = async (orderId, version, fulfillmentId) => {
  const idempotencyKey = `complete-${orderId}-${Date.now()}`;
  const updatePayload = {
    order: {
      version,
      location_id: CONFIG.SQUARE_LOCATION_ID_CONFIG, // Required by Square for order updates
    },
    idempotency_key: idempotencyKey,
  };

  if (fulfillmentId) {
    updatePayload.order.fulfillments = [
      {
        uid: fulfillmentId,
        state: SQUARE_FULFILLMENT_STATE.COMPLETED, // Now correctly referenced
      },
    ];
  } else {
    // If no specific fulfillment, update the overall order state
    // Note: This might not be the correct way for all Square setups.
    // Often, completing a fulfillment is preferred.
    updatePayload.order.state = SQUARE_ORDER_STATE.COMPLETED; // Now correctly referenced
  }

  const result = await callSquareProxy(
    `${SQUARE_API_CONSTANTS.ORDERS_API_PATH}/${orderId}`,
    HTTP_METHODS.PUT,
    updatePayload
  );
  return result.order;
};