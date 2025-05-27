import React, { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import HeaderDisplay from "../components/HeaderDisplay";
import OrderTabs from "../components/OrderTabs";
import OrdersList from "../components/OrdersList";
import { CONFIG } from "../lib/config";

export default function Home() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("inprogress"); // Default to inprogress
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("connected");

  const stats = React.useMemo(() => {
    const inprogress = orders.filter(order => order.status === "inprogress").length;
    const completed = orders.filter((order) => order.status === "completed").length;
    // total will represent active (inprogress) orders for the "All" tab if we rename "inprogress" tab to "All Active"
    // or simply be the inprogress count if we have "In Progress" and "Completed" tabs.
    // For this simplification, "total" can be considered the count of "inprogress" orders.
    return { total: inprogress, inprogress, completed };
  }, [orders]);

  const transformSquareOrder = (order) => {
    console.log("=== Processing Order ===");
    console.log("Order ID:", order.id);
    console.log("Order State:", order.state);

    if (!order || !order.id) {
      console.warn("Invalid order object:", order);
      return null;
    }

    const fulfillments = order.fulfillments || [];
    const lineItems = order.line_items || [];

    let status = "inprogress"; // Default to inprogress
    let completedAt = null;

    if (order.state === "COMPLETED") {
      status = "completed";
      completedAt = order.updated_at || order.created_at;
    } else if (order.state === "CANCELED") {
      return null; // Skip canceled orders
    } else {
      // Any other "OPEN" state or relevant fulfillment state will be "inprogress"
      // If specific Square fulfillment states should prevent "inprogress", add logic here.
      // For now, if not COMPLETED or CANCELED, it's inprogress.
      if (fulfillments && fulfillments.length > 0) {
        const primaryFulfillment = fulfillments[0];
        if (primaryFulfillment.state === "COMPLETED") {
           status = "completed";
           completedAt = primaryFulfillment.updated_at || primaryFulfillment.created_at || order.updated_at;
        } else if (primaryFulfillment.state === "CANCELED") {
            return null;
        }
        // Other fulfillment states like PROPOSED, RESERVED, PREPARED all map to "inprogress"
      }
    }
    
    console.log("Determined Status:", status);

    let customerName = null;
    if (fulfillments[0]?.pickup_details?.recipient?.display_name) {
      customerName = fulfillments[0].pickup_details.recipient.display_name;
    } else if (fulfillments[0]?.pickup_details?.note) {
      customerName = fulfillments[0].pickup_details.note;
    } else if (fulfillments[0]?.delivery_details?.recipient?.display_name) {
      customerName = fulfillments[0].delivery_details.recipient.display_name;
    } else if (order.recipient?.display_name) {
      customerName = order.recipient.display_name;
    }

    const processedLineItems = lineItems.map((item) => ({
      name: item.name || "Unknown Item",
      variationName: item.variation_name || item.catalog_object_id || null,
      quantity: parseInt(item.quantity) || 1,
      modifiers: (item.modifiers || []).map((modifier) => ({
        name: modifier.name || "Modifier",
        quantity: parseInt(modifier.quantity) || 1,
        price: modifier.base_price_money ? parseInt(modifier.base_price_money.amount) : 0,
        catalog_object_id: modifier.catalog_object_id || null,
      })),
      note: item.note || null,
      price: item.total_money ? parseInt(item.total_money.amount) : 0,
      catalog_object_id: item.catalog_object_id || null,
    }));

    return {
      id: order.id,
      displayId: order.id.slice(-6),
      version: order.version,
      status,
      timestamp: order.created_at || new Date().toISOString(),
      completedAt,
      customerName,
      lineItems: processedLineItems,
      total: parseInt(order.total_money?.amount || 0),
      notes: order.note || null,
      fulfillmentId: fulfillments[0]?.uid || null,
      squareOrderState: order.state,
      squareFulfillmentState: fulfillments[0]?.state || null,
    };
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
          actual_method_for_square: "POST",
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
    let filtered = [];
    if (activeTab === "inprogress") {
      filtered = orders.filter((order) => order.status === "inprogress");
    } else if (activeTab === "completed") {
      filtered = orders.filter((order) => order.status === "completed");
    }

    if (activeTab === "completed") {
      filtered = filtered.sort((a, b) => 
        new Date(b.completedAt || b.timestamp) - new Date(a.completedAt || a.timestamp)
      );
    } else { // "inprogress"
      filtered = filtered.sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
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
    // We only allow updating to "completed"
    if (newStatus !== "completed") {
        setError("Invalid status update. Only 'completed' is allowed.");
        return;
    }
    console.log(`Attempting to mark order ${orderId} as ${newStatus}`);
    
    const orderToUpdate = orders.find(o => o.id === orderId);
    if (!orderToUpdate) {
      setError("Error: Could not find the order to update.");
      return;
    }

    if (typeof orderToUpdate.version === 'undefined') {
      setError("Error: Order version is missing. Please refresh.");
      fetchOrders(); // Force refresh
      return;
    }

    const originalOrders = [...orders];

    setOrders((prevOrders) =>
      prevOrders.map((order) => {
        if (order.id === orderId) {
          return { ...order, status: newStatus, completedAt: new Date().toISOString() };
        }
        return order;
      })
    );

    const idempotencyKey = `complete-${orderId}-${Date.now()}`;
    
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

      if (orderToUpdate.fulfillmentId) {
        requestBodyToProxy.body.order.fulfillments = [
          {
            uid: orderToUpdate.fulfillmentId,
            state: "COMPLETED", // Directly set to Square's COMPLETED state
          },
        ];
      } else {
        // If no fulfillmentId, update the order state directly to COMPLETED
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
        // Handle version mismatch or other errors
        if (errorResult.errors?.some(e => e.code === "VERSION_MISMATCH")) {
          setError("Order was updated elsewhere. Refreshing orders. Please try again.");
          fetchOrders();
        } else {
          setError(`Square API error: ${errorResult.errors?.[0]?.detail || errorResult.detail || "Unknown error"}`);
        }
        setOrders(originalOrders); // Revert optimistic update
        return;
      }

      const result = await response.json();
      console.log("Square order update successful:", result);
      fetchOrders(); // Refresh orders to get the latest state and version

    } catch (error) {
      console.error("Error updating Square order:", error);
      setOrders(originalOrders); // Revert optimistic update
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
            isLoading={isLoading && orders.length === 0}
            error={!error && orders.length === 0 && !isLoading ? "No orders to display." : null}
            showCompleted={activeTab === "completed"}
          />
        </main>
      </div>
    </>
  );
}