// lib/config.js

// Configuration for the application
// It's recommended to use environment variables for sensitive or deployment-specific values.
export const CONFIG = {
  // SQUARE_LOCATION_ID_CONFIG is primarily sourced from .env.local (process.env.SQUARE_LOCATION_ID)
  // Provide a fallback here only if necessary and if it's not sensitive.
  SQUARE_LOCATION_ID_CONFIG: process.env.SQUARE_LOCATION_ID || "L829FM4FCT5S6", // Example fallback
  SQUARE_ENVIRONMENT_CONFIG: "sandbox", // "sandbox" or "production"
  REFRESH_INTERVAL_SECONDS_CONFIG: 30, // How often to refresh orders, in seconds
  ORDER_FETCH_HOURS_AGO: 8, // Fetch orders created in the last X hours
};

// Constants related to the Square API
export const SQUARE_API_CONSTANTS = {
  API_VERSION: "2023-10-18",
  BASE_URL_SANDBOX: "https://connect.squareupsandbox.com",
  BASE_URL_PRODUCTION: "https://connect.squareup.com",
  ORDERS_API_PATH: "/v2/orders",
  SEARCH_ORDERS_PATH: "/v2/orders/search",
  // Add other paths or constants as needed
};

// HTTP Methods
export const HTTP_METHODS = {
  POST: "POST",
  PUT: "PUT",
  GET: "GET", // Although proxy mainly uses POST from client
};

// Order Statuses (Internal to this app)
export const ORDER_STATUS = {
  IN_PROGRESS: "inprogress",
  COMPLETED: "completed",
  CANCELED: "canceled", // If you plan to handle canceled orders visually
};

// Square Order States
export const SQUARE_ORDER_STATE = {
  OPEN: "OPEN",
  COMPLETED: "COMPLETED",
  CANCELED: "CANCELED",
  // DRAFT: "DRAFT", // etc.
};

// Square Fulfillment States
export const SQUARE_FULFILLMENT_STATE = {
  PROPOSED: "PROPOSED",
  RESERVED: "RESERVED",
  PREPARED: "PREPARED",
  COMPLETED: "COMPLETED",
  CANCELED: "CANCELED",
  FAILED: "FAILED",
};