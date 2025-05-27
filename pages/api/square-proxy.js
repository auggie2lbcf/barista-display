const fetch = require("node-fetch");

const SQUARE_API_VERSION = "2023-10-18";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    if (!accessToken) {
      console.error("SQUARE_ACCESS_TOKEN environment variable is missing");
      return res.status(500).json({
        error: "Server configuration error: Missing access token",
      });
    }

    const { environment, square_api_path, body } = req.body;

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

    console.log(`Proxying request to: ${fullUrl}`);
    console.log("Request method: POST");
    console.log("Request body:", JSON.stringify(body, null, 2));

    // Determine the HTTP method - fulfillment updates use PUT
    let method = "POST";
    if (square_api_path.includes("/fulfillments/")) {
      method = "PUT";
    }

    const squareResponse = await fetch(fullUrl, {
      method: method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Square-Version": SQUARE_API_VERSION,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body || {}),
    });

    const responseData = await squareResponse.json();
    
    console.log(`Square API response status: ${squareResponse.status}`);
    console.log("Square API response data:", JSON.stringify(responseData, null, 2));

    res.status(squareResponse.status).json(responseData);
  } catch (error) {
    console.error("Error in square-proxy:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
}
