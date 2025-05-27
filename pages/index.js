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
    console.log("Full Order:", JSON.stringify(order, null, 2));

    if (!order || !order.id) {
      console.warn("Invalid order object:", order);
      return null;
    }

    const fulfillments = order.fulfillments || [];
    const lineItems = order.line_items || [];

    // Determine status based on Square's order and fulfillment states
    let status = "received"; // default
    let completedAt = null;

    console.log("Fulfillments:", fulfillments);

    // First check overall order state
    if (order.state === "COMPLETED") {
      status = "completed";
      completedAt = order.updated_at || order.created_at;
    } else if (order.state === "CANCELED") {
      // Skip canceled orders
      return null;
    } else {
      // Order is OPEN, check fulfillment states for more specific status
      if (fulfillments && fulfillments.length > 0) {
        // Look for the primary fulfillment (usually the first one)
        const primaryFulfillment = fulfillments[0];
        
        console.log("Primary Fulfillment State:", primaryFulfillment.state);
        console.log("Primary Fulfillment:", JSON.stringify(primaryFulfillment, null, 2));

        switch (primaryFulfillment.state) {
          case "PROPOSED":
            status = "received";
            break;
          case "RESERVED":
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
            // Skip canceled fulfillments
            return null;
          default:
            console.warn("Unknown fulfillment state:", primaryFulfillment.state);
            status = "received";
        }
      }
    }

    console.log("Determined Status:", status);

    // Extract customer name from various sources
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

    // Process line items with detailed variations and modifiers
    const processedLineItems = lineItems.map((item) => {
      let itemName = item.name || "Unknown Item";
      
      let variationName = null;
      if (item.variation_name) {
        variationName = item.variation_name;
      } else if (item.catalog_object_id) {
        variationName = item.catalog_object_id;
      }

      const modifiers = (item.modifiers || []).map((modifier) => {
        return {
          name: modifier.name || "Modifier",
          quantity: parseInt(modifier.quantity) || 1,
          price: modifier.base_price_money ? parseInt(modifier.base_price_money.amount) : 0,
          catalog_object_id: modifier.catalog_object_id || null,
        };
      });

      const itemNote = item.note || null;

      return {
        name: itemName,
        variationName: variationName,
        quantity: parseInt(item.quantity) || 1,
        modifiers: modifiers,
        note: itemNote,
        price: item.total_money ? parseInt(item.total_money.amount) : 0,
        catalog_object_id: item.catalog_object_id || null,
      };
    });

    const transformedOrder = {
      id: order.id,
      displayId: order.id.slice(-6),
      version: order.version || 1,
      status,
      timestamp: order.created_at || new Date().toISOString(),
      completedAt: completedAt,
      customerName,
      lineItems: processedLineItems,
      total: parseInt(order.total_money?.amount || 0),
      notes: order.note || null,
      fulfillmentId: fulfillments[0]?.uid || null,
      // Store raw Square data for debugging
      squareOrderState: order.state,
      squareFulfillmentState: fulfillments[0]?.state || null,
    };

    console.log("Transformed Order:", transformedOrder);
    console.log("=== End Processing Order ===\n");

    return transformedOrder;
  };

  // Fetch orders from Square API via our proxy
  const fetchOrders = useCallback(async () => {
    if (!CONFIG.SQUARE_LOCATION_ID_CONFIG) {
      setError("Configuration error: Location ID not set");
      setConnectionStatus("error");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch orders from the last 8 hours to include recently completed ones
      const startTime = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
      
      const response = await fetch("/api/square-proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          environment: CONFIG.SQUARE_ENVIRONMENT_CONFIG,
          square_api_path: "/v2/orders/search",
          body: {
            location_ids: [CONFIG.SQUARE_LOCATION_ID_CONFIG],
            query: {
              filter: {
                date_time_filter: {
                  created_at: {
                    start_at: startTime,
                  },
                },
                state_filter: {
                  states: ["OPEN", "COMPLETED"], // Include both open and completed
                },
              },
              sort: {
                sort_field: "CREATED_AT",
                sort_order: "DESC",
              },
            },
            limit: 100, // Increased limit to get more orders
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log("=== Square API Response ===");
      console.log("Total orders returned:", data.orders?.length || 0);
      console.log("Full response:", JSON.stringify(data, null, 2));

      if (data.errors && data.errors.length > 0) {
        throw new Error(data.errors[0].detail || "Square API error");
      }

      if (!data.orders) {
        console.log("No orders found in response");
        setOrders([]);
        setConnectionStatus("connected");
        return;
      }

      const transformedOrders = data.orders
        .map(transformSquareOrder)
        .filter((order) => order !== null);

      console.log("=== Final Transformed Orders ===");
      transformedOrders.forEach(order => {
        console.log(`Order ${order.displayId}: ${order.status} (Square: ${order.squareOrderState}/${order.squareFulfillmentState})`);
      });

      setOrders(transformedOrders);
      setConnectionStatus("connected");
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError(`Failed to fetch orders: ${err.message}`);
      setConnectionStatus("error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Filter orders based on active tab
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
        // Show all except completed for "all" tab
        filtered = orders.filter((order) => order.status !== "completed");
    }

    // Sort orders appropriately
    if (activeTab === "completed") {
      filtered = filtered.sort((a, b) => 
        new Date(b.completedAt || b.timestamp) - new Date(a.completedAt || a.timestamp)
      );
    } else {
      filtered = filtered.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );
    }

    setFilteredOrders(filtered);
  }, [orders, activeTab]);

  // Auto-refresh orders
  useEffect(() => {
    fetchOrders();

    const interval = setInterval(() => {
      fetchOrders();
    }, CONFIG.REFRESH_INTERVAL_SECONDS_CONFIG * 1000);

    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Handle status updates - this will update Square via API
  const handleStatusUpdate = async (orderId, newStatus) => {
    console.log(`Attempting to update order ${orderId} to status: ${newStatus}`);
    
    // Find the order to get its details
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      console.error("Order not found:", orderId);
      return;
    }

    // Optimistically update the UI first
    setOrders((prevOrders) =>
      prevOrders.map((order) => {
        if (order.id === orderId) {
          const updatedOrder = { ...order, status: newStatus };
          
          if (newStatus === "completed") {
            updatedOrder.completedAt = new Date().toISOString();
          }
          
          return updatedOrder;
        }
        return order;
      })
    );

    // Map our status to Square fulfillment state
    let squareFulfillmentState;
    switch (newStatus) {
      case "received":
        squareFulfillmentState = "PROPOSED";
        break;
      case "preparing":
        squareFulfillmentState = "RESERVED";
        break;
      case "ready":
        squareFulfillmentState = "PREPARED";
        break;
      case "completed":
        squareFulfillmentState = "COMPLETED";
        break;
      default:
        console.error("Unknown status:", newStatus);
        return;
    }

    try {
      // Update the fulfillment in Square
      if (order.fulfillmentId) {
        const response = await fetch("/api/square-proxy", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            environment: CONFIG.SQUARE_ENVIRONMENT_CONFIG,
            square_api_path: `/v2/orders/${orderId}/fulfillments/${order.fulfillmentId}`,
            body: {
              fulfillment: {
                state: squareFulfillmentState,
              },
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to update fulfillment: ${response.status}`);
        }

        const result = await response.json();
        console.log("Square fulfillment update result:", result);
      }
    } catch (error) {
      console.error("Error updating Square fulfillment:", error);
      
      // Revert the optimistic update on error
      setOrders((prevOrders) =>
        prevOrders.map((o) => 
          o.id === orderId ? order : o
        )
      );
      
      setError(`Failed to update order status: ${error.message}`);
    }
  };

  return (
    <>
      <Head>
        <title>Barista KDS</title>
        <meta
          name="description"
          content="Barista Kitchen Display System for 5-inch touchscreen"
        />
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
          <OrdersList
            orders={filteredOrders}
            onStatusUpdate={handleStatusUpdate}
            isLoading={isLoading}
            error={error}
            showCompleted={activeTab === "completed"}
          />
        </main>
      </div>
    </>
  );
}
