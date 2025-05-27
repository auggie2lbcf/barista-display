// pages/api/square-proxy.js
import { SQUARE_API_CONSTANTS, HTTP_METHODS } from "../../lib/config";

const { API_VERSION, BASE_URL_SANDBOX, BASE_URL_PRODUCTION } = SQUARE_API_CONSTANTS;

export default async function squareProxyHandler(req, res) {
  if (req.method !== HTTP_METHODS.POST) {
    console.warn(`Proxy: Method ${req.method} not allowed. Only POST is accepted from client.`);
    return res.status(405).json({ error: "Method Not Allowed: Proxy accepts only POST." });
  }

  const {
    environment, // "sandbox" or "production"
    square_api_path: squareApiPath, // e.g., "/v2/orders/search"
    body: requestBodyToSquare, // Body for the Square API
    actual_method_for_square: actualMethodForSquare, // Intended HTTP method for Square (POST, PUT, GET etc.)
  } = req.body;

  // Validate essential parameters
  if (!environment || !squareApiPath || !actualMethodForSquare) {
    return res.status(400).json({
      error: "Bad Request: Missing one or more required fields: environment, square_api_path, actual_method_for_square.",
    });
  }

  if (![HTTP_METHODS.POST, HTTP_METHODS.PUT, HTTP_METHODS.GET].includes(actualMethodForSquare.toUpperCase())) {
     // Add other methods if Square API uses them, e.g. DELETE
    return res.status(400).json({ error: `Bad Request: Invalid actual_method_for_square: ${actualMethodForSquare}.`});
  }

  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  if (!accessToken) {
    console.error("Proxy Error: SQUARE_ACCESS_TOKEN environment variable is missing.");
    return res.status(500).json({ error: "Server Configuration Error: Missing access token." });
  }

  if (!["sandbox", "production"].includes(environment)) {
    return res.status(400).json({ error: "Bad Request: Invalid environment. Must be 'sandbox' or 'production'." });
  }

  const squareBaseUrl = environment === "production" ? BASE_URL_PRODUCTION : BASE_URL_SANDBOX;
  const fullSquareUrl = `${squareBaseUrl}${squareApiPath}`;
  const methodForSquareRequest = actualMethodForSquare.toUpperCase();

  console.log(`Proxying [${methodForSquareRequest}] request to: ${fullSquareUrl}`);
  if (requestBodyToSquare && Object.keys(requestBodyToSquare).length > 0) {
    // Only log body if it's not empty and not a GET request (though GET can have body, it's unusual)
    if (methodForSquareRequest !== HTTP_METHODS.GET) {
        console.log("Request body to Square API:", JSON.stringify(requestBodyToSquare, null, 2));
    }
  }


  try {
    const squareResponse = await fetch(fullSquareUrl, {
      method: methodForSquareRequest,
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Square-Version": API_VERSION,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      // Conditionally add body for methods that support it
      body: (methodForSquareRequest !== HTTP_METHODS.GET && requestBodyToSquare)
            ? JSON.stringify(requestBodyToSquare)
            : undefined,
    });

    let responseDataFromSquare;
    const contentType = squareResponse.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      responseDataFromSquare = await squareResponse.json().catch(err => {
        console.error("Proxy Error: Failed to parse Square API JSON response.", err);
        // If parsing fails but status indicates an error, create a structured error
        if (!squareResponse.ok) {
          return {
            errors: [{
              category: "API_ERROR",
              code: "JSON_PARSE_ERROR",
              detail: `Failed to parse JSON response from Square. Status: ${squareResponse.status} ${squareResponse.statusText}`
            }]
          };
        }
        return {}; // Or throw, if successful non-JSON responses are not expected
      });
    } else {
        // Handle non-JSON responses (e.g. plain text errors or empty successful responses)
        const textResponse = await squareResponse.text();
        console.log(`Square API non-JSON response (Status ${squareResponse.status}):`, textResponse);
        if (!squareResponse.ok) {
             responseDataFromSquare = {
                errors: [{
                    category: "API_ERROR",
                    code: squareResponse.statusText.replace(/\s+/g, '_').toUpperCase() || "UNKNOWN_ERROR",
                    detail: textResponse || `Square API Error: ${squareResponse.status}`
                }]
            };
        } else {
            responseDataFromSquare = { message: "Operation successful, no JSON content."}; // For 204 No Content etc.
        }
    }

    console.log(`Square API response status: ${squareResponse.status}`);
    if (Object.keys(responseDataFromSquare).length > 0) {
        // console.log("Square API response data:", JSON.stringify(responseDataFromSquare, null, 2));
    }


    return res.status(squareResponse.status).json(responseDataFromSquare);

  } catch (error) {
    console.error("Proxy Error: Unhandled exception in square-proxy.", error);
    return res.status(500).json({
      error: "Internal Server Error: Proxy failed.",
      message: error.message,
      // stack: process.env.NODE_ENV === "development" ? error.stack : undefined, // Be cautious exposing stack
    });
  }
}