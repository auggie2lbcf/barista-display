import React, { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import HeaderDisplay from "../components/HeaderDisplay";
import OrderTabs from "../components/OrderTabs";
import OrdersList from "../components/OrdersList";
import { CONFIG } from "../lib/config";

export default function Home() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("connected");

  // Calculate statistics including completed orders
  const stats = React.useMemo(() => {
    const total = orders.filter(order => order.status !== "completed").length;
    const new_ = orders.filter((order) => order.status === "received").length;
    const preparing = orders.filter(
      (order) => order.status === "preparing"
    ).length;
    const ready = orders.filter((order) => order.status === "ready").length;
    const completed = orders.filter((order) => order.status === "completed").length;

    return { total, new: new_, preparing, ready, completed };
  }, [orders]);

  // Transform Square order data with proper state mapping
  const transformSquareOrder = (order) => {
    console.log("=== Processing Order ===");
    console.log("Order ID:", order.id);
    console.log("Order State:", order.state);
    // console.log("Full Order:", JSON.stringify(order, null, 2)); // Verbose

    if (!order || !order.id) {
      console.warn("Invalid order object:", order);
      return null;
    }

    const fulfillments = order.fulfillments || [];
    const lineItems = order.line_items || [];

    let status = "received"; // default
    let completedAt = null;

    // console.log("Fulfillments:", fulfillments); // Verbose

    if (order.state === "COMPLETED") {
      status = "completed";
      completedAt = order.updated_at || order.created_at;
    } else if (order.state === "CANCELED") {
      return null;
    } else {
      if (fulfillments && fulfillments.length > 0) {
        const primaryFulfillment = fulfillments[0];
        
        // console.log("Primary Fulfillment State:", primaryFulfillment.state); // Verbose
        // console.log("Primary Fulfillment:", JSON.stringify(primaryFulfillment, null, 2)); // Verbose

        switch (primaryFulfillment.state) {
          case "PROPOSED":
            status = "received";
            break;
          case "RESERVED": // Square's "IN_PROGRESS" or "ACCEPTED" might map to "RESERVED" or custom logic
            status = "preparing";
            break;
          case "PREPARED":
            status = "ready";
            break;
          case "COMPLETED":
            status = "completed";
            completedAt = primaryFulfillment.updated_at || primaryFulfillment.created_at;
            break;
          case "CANCELED":
            return null;
          default:
            console.warn("Unknown fulfillment state:", primaryFulfillment.state);
            status = "received";
        }
      }
    }

    // console.log("Determined Status:", status); // Verbose

    let customerName = null;
    if (fulfillments[0]?.pickup_details?.recipient?.display_name) {
      customerName = fulfillments[0].pickup_details.recipient.display_name;
    } else if (fulfillments[0]?.pickup_details?.note) {
      customerName = fulfillments[0].pickup_details.note;
    } else if (fulfillments[0]?.delivery_details?.recipient?.display_name) {
      customerName = fulfillments[0].delivery_details.recipient.display_name;
    } else if (order.recipient?.display_name) { // Fallback to order level recipient
      customerName = order.recipient.display_name;
    }


    const processedLineItems = lineItems.map((item) => {
      let itemName = item.name || "Unknown Item";
      let variationName = item.variation_name || item.catalog_object_id || null;

      const modifiers = (item.modifiers || []).map((modifier) => ({
        name: modifier.name || "Modifier",
        quantity: parseInt(modifier.quantity) || 1,
        price: modifier.base_price_money ? parseInt(modifier.base_price_money.amount) : 0,
        catalog_object_id: modifier.catalog_object_id || null,
      }));

      return {
        name: itemName,
        variationName: variationName,
        quantity: parseInt(item.quantity) || 1,
        modifiers: modifiers,
        note: item.note || null,
        price: item.total_money ? parseInt(item.total_money.amount) : 0,
        catalog_object_id: item.catalog_object_id || null,
      };
    });

    const transformedOrder = {
      id: order.id,
      displayId: order.id.slice(-6),
      version: order.version, // Ensure version is captured
      status,
      timestamp: order.created_at || new Date().toISOString(),
      completedAt: completedAt,
      customerName,
      lineItems: processedLineItems,
      total: parseInt(order.total_money?.amount || 0),
      notes: order.note || null,
      fulfillmentId: fulfillments[0]?.uid || null,
      squareOrderState: order.state,
      squareFulfillmentState: fulfillments[0]?.state || null,
    };

    // console.log("Transformed Order:", transformedOrder); // Verbose
    // console.log("=== End Processing Order ===\n"); // Verbose
    return transformedOrder;
  };

  const fetchOrders = useCallback(async () => {
    if (!CONFIG.SQUARE_LOCATION_ID_CONFIG) {
      setError("Configuration error: Location ID not set");
      setConnectionStatus("error");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const startTime = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
      
      const response = await fetch("/api/square-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          environment: CONFIG.SQUARE_ENVIRONMENT_CONFIG,
          square_api_path: "/v2/orders/search",
          actual_method_for_square: "POST", // Explicitly state method for proxy
          body: {
            location_ids: [CONFIG.SQUARE_LOCATION_ID_CONFIG],
            query: {
              filter: {
                date_time_filter: { created_at: { start_at: startTime } },
                state_filter: { states: ["OPEN", "COMPLETED"] },
              },
              sort: { sort_field: "CREATED_AT", sort_order: "DESC" },
            },
            limit: 100,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(`HTTP ${response.status}: ${errorData.errors?.[0]?.detail || errorData.detail || "Failed to fetch orders"}`);
      }

      const data = await response.json();
      // console.log("=== Square API Response (Fetch) ==="); // Verbose
      // console.log("Total orders returned:", data.orders?.length || 0); // Verbose
      // console.log("Full response:", JSON.stringify(data, null, 2)); // Verbose


      if (data.errors && data.errors.length > 0) {
        throw new Error(data.errors[0].detail || "Square API error during fetch");
      }

      if (!data.orders) {
        setOrders([]);
      } else {
        const transformedOrders = data.orders
          .map(transformSquareOrder)
          .filter((order) => order !== null);
        setOrders(transformedOrders);
      }
      setConnectionStatus("connected");
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError(`Failed to fetch orders: ${err.message}`);
      setConnectionStatus("error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let filtered = orders;
    switch (activeTab) {
      case "new":
        filtered = orders.filter((order) => order.status === "received");
        break;
      case "preparing":
        filtered = orders.filter((order) => order.status === "preparing");
        break;
      case "ready":
        filtered = orders.filter((order) => order.status === "ready");
        break;
      case "completed":
        filtered = orders.filter((order) => order.status === "completed");
        break;
      case "all":
      default:
        filtered = orders.filter((order) => order.status !== "completed");
    }

    if (activeTab === "completed") {
      filtered = filtered.sort((a, b) => 
        new Date(b.completedAt || b.timestamp) - new Date(a.completedAt || a.timestamp)
      );
    } else {
      filtered = filtered.sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp) // Sort oldest first for active orders
      );
    }
    setFilteredOrders(filtered);
  }, [orders, activeTab]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, CONFIG.REFRESH_INTERVAL_SECONDS_CONFIG * 1000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    console.log(`Attempting to update order ${orderId} to status: ${newStatus}`);
    
    const orderToUpdate = orders.find(o => o.id === orderId);
    if (!orderToUpdate) {
      setError("Error: Could not find the order to update.");
      return;
    }

    if (typeof orderToUpdate.version === 'undefined') {
      setError("Error: Order version is missing. Please refresh.");
      fetchOrders();
      return;
    }

    // Block fulfillment state updates if no fulfillmentId and not marking as completed
    if (!orderToUpdate.fulfillmentId && newStatus !== "completed") {
      setError("This order cannot be updated because it has no fulfillment. Only completed status is allowed.");
      return;
    }

    const originalOrders = [...orders];

    // Optimistically update UI
    setOrders((prevOrders) =>
      prevOrders.map((order) => {
        if (order.id === orderId) {
          const updatedOrder = { ...order, status: newStatus };
          if (newStatus === "completed" && !order.completedAt) {
            updatedOrder.completedAt = new Date().toISOString();
          }
          return updatedOrder;
        }
        return order;
      })
    );

    let squareFulfillmentState;
    switch (newStatus) {
      case "received": squareFulfillmentState = "PROPOSED"; break;
      case "preparing": squareFulfillmentState = "RESERVED"; break;
      case "ready": squareFulfillmentState = "PREPARED"; break;
      case "completed": squareFulfillmentState = "COMPLETED"; break;
      default: setError("Unknown status for Square mapping."); return;
    }

    const idempotencyKey = `update-${orderId}-${newStatus}-${Date.now()}`;

    try {
      const requestBodyToProxy = {
        environment: CONFIG.SQUARE_ENVIRONMENT_CONFIG,
        square_api_path: `/v2/orders/${orderId}`,
        actual_method_for_square: "PUT",
        body: {
          order: {
            version: orderToUpdate.version,
            location_id: CONFIG.SQUARE_LOCATION_ID_CONFIG,
          },
          idempotency_key: idempotencyKey,
        },
      };

      // Only include fulfillments if fulfillmentId exists
      if (orderToUpdate.fulfillmentId) {
        requestBodyToProxy.body.order.fulfillments = [
          {
            uid: orderToUpdate.fulfillmentId,
            state: squareFulfillmentState,
          },
        ];
      }

      // If marking as completed and there's no fulfillmentId, update order state
      if (newStatus === "completed" && !orderToUpdate.fulfillmentId) {
        requestBodyToProxy.body.order.state = "COMPLETED";
      }

      const response = await fetch("/api/square-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBodyToProxy),
      });

      if (!response.ok) {
        const errorResult = await response.json().catch(() => ({ detail: response.statusText }));
        console.error("Square update API error response:", errorResult);

        if (
          Array.isArray(errorResult.errors) &&
          errorResult.errors.some(e => e.code === "VERSION_MISMATCH")
        ) {
          setError("Order was updated elsewhere. Refreshing orders. Please try again.");
          fetchOrders();
          setOrders(originalOrders);
          return;
        }

        if (Array.isArray(errorResult.errors) && errorResult.errors.length > 0) {
          setError(`Square API error: ${errorResult.errors[0].detail || "Unknown error"}`);
        } else if (errorResult.detail) {
          setError(`Square API error: ${errorResult.detail}`);
        } else {
          setError("Failed to update order due to an unknown error.");
        }
        setOrders(originalOrders);
        return;
      }

      const result = await response.json();
      console.log("Square order update successful:", result);
      fetchOrders();

    } catch (error) {
      console.error("Error updating Square order:", error);
      setOrders(originalOrders);
      setError(`Failed to update order: ${error.message}. Please try refreshing.`);
    }
  };


  return (
    <>
      <Head>
        <title>Barista KDS</title>
        <meta name="description" content="Barista Kitchen Display System" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="container">
        <HeaderDisplay
          connectionStatus={connectionStatus}
          stats={stats}
          onRefresh={fetchOrders}
          isLoading={isLoading}
        />
        <OrderTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          stats={stats}
        />
        <main className="main-content">
          {error && <div className="error-message">{error}</div>}
          <OrdersList
            orders={filteredOrders}
            onStatusUpdate={handleStatusUpdate}
            isLoading={isLoading && orders.length === 0} // Show loading only if no orders yet
            error={!error && orders.length === 0 && !isLoading ? "No orders to display." : null} // Adjusted error prop for OrdersList
            showCompleted={activeTab === "completed"}
          />
        </main>
      </div>
    </>
  );
}