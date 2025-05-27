const fetch = require("node-fetch");

const SQUARE_API_VERSION = "2023-10-18";

export default async function handler(req, res) {
  if (req.method !== "POST") { // This is the method from client (index.js) to this proxy
    return res.status(405).json({ error: "Method not allowed for proxy" });
  }

  try {
    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    if (!accessToken) {
      console.error("SQUARE_ACCESS_TOKEN environment variable is missing");
      return res.status(500).json({
        error: "Server configuration error: Missing access token",
      });
    }

    // actual_method_for_square is the intended HTTP method for the Square API
    const { environment, square_api_path, body, actual_method_for_square } = req.body;

    if (!environment || !square_api_path) {
      return res.status(400).json({
        error: "Missing required fields: environment and square_api_path",
      });
    }

    if (!["sandbox", "production"].includes(environment)) {
      return res.status(400).json({
        error: "Invalid environment. Must be 'sandbox' or 'production'",
      });
    }

    const squareBaseUrl =
      environment === "production"
        ? "https://connect.squareup.com"
        : "https://connect.squareupsandbox.com";

    const fullUrl = `${squareBaseUrl}${square_api_path}`;

    // Determine the HTTP method for the Square API call
    let methodToSquare = "POST"; // Default

    if (actual_method_for_square) {
      methodToSquare = actual_method_for_square.toUpperCase();
    } else {
      // Fallback logic if actual_method_for_square is not provided by the client
      // This can be made more robust based on specific paths
      if (square_api_path.includes("/fulfillments/") && !square_api_path.endsWith("/update")) {
        // This specific condition might be for an old/incorrect fulfillment update attempt
        methodToSquare = "PUT";
      } else if (square_api_path.match(/^\/v2\/orders\/[^/]+$/) && !square_api_path.includes("search") && !square_api_path.includes("batch-retrieve")) {
        // Matches /v2/orders/{order_id} for UpdateOrder, which should be PUT
        methodToSquare = "PUT";
      }
      // Add other specific rules here if needed, e.g. for POST to /v2/orders/{order_id}/pay
    }

    console.log(`Proxying request to: ${fullUrl}`);
    console.log(`Request method to Square API: ${methodToSquare}`); // Log the actual method being used
    console.log("Request body to Square API:", JSON.stringify(body, null, 2));

    const squareResponse = await fetch(fullUrl, {
      method: methodToSquare,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Square-Version": SQUARE_API_VERSION,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body || {}), // Ensure body is at least an empty object if not provided
    });

    const responseData = await squareResponse.json().catch(err => {
      // Handle cases where Square might not return JSON (e.g., some 5xx errors or network issues)
      console.error("Failed to parse Square API JSON response:", err);
      // Return a structured error if parsing fails but status indicates an error
      if (!squareResponse.ok) {
        return { 
            errors: [{ 
                category: "API_ERROR", 
                code: "PARSE_ERROR", 
                detail: `Failed to parse JSON response from Square. Status: ${squareResponse.status} ${squareResponse.statusText}` 
            }]
        };
      }
      return {}; // Or throw, depending on how you want to handle non-JSON success (unlikely for Square)
    });
    
    console.log(`Square API response status: ${squareResponse.status}`);
    console.log("Square API response data:", JSON.stringify(responseData, null, 2));

    res.status(squareResponse.status).json(responseData);
  } catch (error) {
    console.error("Error in square-proxy:", error);
    res.status(500).json({
      error: "Internal server error in proxy",
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
}