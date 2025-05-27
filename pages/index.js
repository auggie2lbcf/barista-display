// pages/index.js
import React, { useState, useEffect, useCallback, useRef } from "react"; // Added useRef
import Head from "next/head";
import HeaderDisplay from "../components/HeaderDisplay";
import OrderTabs from "../components/OrderTabs";
import OrdersList from "../components/OrdersList";
import { CONFIG } from "../lib/config";
// No need for DragDropContext if we are not reordering items

export default function Home() {
  // ... (all your existing state and functions: orders, filteredOrders, activeTab, etc.)
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("inprogress"); 
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("connected");

  const scrollableContainerRef = useRef(null); // Ref for the main content area

  // ... (stats, transformSquareOrder, fetchOrders, useEffect for filtering, useEffect for fetching)
  const stats = React.useMemo(() => {
    const inprogress = orders.filter(order => order.status === "inprogress").length;
    const completed = orders.filter((order) => order.status === "completed").length;
    return { total: inprogress, inprogress, completed };
  }, [orders]);

  const transformSquareOrder = (order) => {
    // ... (keep existing transformSquareOrder function)
    console.log("=== Processing Order ===");
    console.log("Order ID:", order.id);
    console.log("Order State:", order.state);

    if (!order || !order.id) {
      console.warn("Invalid order object:", order);
      return null;
    }

    const fulfillments = order.fulfillments || [];
    const lineItems = order.line_items || [];

    let status = "inprogress"; 
    let completedAt = null;

    if (order.state === "COMPLETED") {
      status = "completed";
      completedAt = order.updated_at || order.created_at;
    } else if (order.state === "CANCELED") {
      return null; 
    } else {
      if (fulfillments && fulfillments.length > 0) {
        const primaryFulfillment = fulfillments[0];
        if (primaryFulfillment.state === "COMPLETED") {
           status = "completed";
           completedAt = primaryFulfillment.updated_at || primaryFulfillment.created_at || order.updated_at;
        } else if (primaryFulfillment.state === "CANCELED") {
            return null;
        }
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
    let newFilteredList = [];
    if (activeTab === "inprogress") {
      newFilteredList = orders.filter((order) => order.status === "inprogress");
    } else if (activeTab === "completed") {
      newFilteredList = orders.filter((order) => order.status === "completed");
    }

    if (activeTab === "completed") {
      newFilteredList = newFilteredList.sort((a, b) => 
        new Date(b.completedAt || b.timestamp) - new Date(a.completedAt || a.timestamp)
      );
    } else { 
        newFilteredList = newFilteredList.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }
    setFilteredOrders(newFilteredList);
  }, [orders, activeTab]); 

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, CONFIG.REFRESH_INTERVAL_SECONDS_CONFIG * 1000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    // ... (keep existing handleStatusUpdate function)
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
      fetchOrders(); 
      return;
    }

    const originalOrders = [...orders]; 

    const updateOrderState = (list) => list.map((order) => {
      if (order.id === orderId) {
        return { ...order, status: newStatus, completedAt: new Date().toISOString() };
      }
      return order;
    });
    setOrders(updateOrderState(orders));
    
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
            state: "COMPLETED", 
          },
        ];
      } else {
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
        if (errorResult.errors?.some(e => e.code === "VERSION_MISMATCH")) {
          setError("Order was updated elsewhere. Refreshing orders. Please try again.");
          fetchOrders(); 
        } else {
          setError(`Square API error: ${errorResult.errors?.[0]?.detail || errorResult.detail || "Unknown error"}`);
          setOrders(originalOrders); 
        }
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


  // Drag to scroll logic
  useEffect(() => {
    const slider = scrollableContainerRef.current;
    if (!slider) return;

    let isDown = false;
    let startX;
    let startY; // To track vertical scroll position
    let scrollLeft;
    let scrollTop; // To track vertical scroll position

    const onMouseDown = (e) => {
      isDown = true;
      slider.style.cursor = 'grabbing';
      slider.style.userSelect = 'none'; // Prevent text selection while dragging
      startX = e.pageX - slider.offsetLeft;
      startY = e.pageY - slider.offsetTop; // Capture Y for vertical scroll
      scrollLeft = slider.scrollLeft;
      scrollTop = slider.scrollTop; // Capture scrollTop
    };

    const onMouseLeaveOrUp = () => {
      isDown = false;
      slider.style.cursor = 'grab';
      slider.style.userSelect = ''; // Re-enable text selection
    };

    const onMouseMove = (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      const y = e.pageY - slider.offsetTop; // Get current Y
      const walkX = (x - startX) * 1; // Multiplier can adjust scroll speed/sensitivity
      const walkY = (y - startY) * 1; // Multiplier for Y scroll
      slider.scrollLeft = scrollLeft - walkX;
      slider.scrollTop = scrollTop - walkY; // Apply vertical scroll
    };

    slider.addEventListener('mousedown', onMouseDown);
    slider.addEventListener('mouseleave', onMouseLeaveOrUp);
    slider.addEventListener('mouseup', onMouseLeaveOrUp);
    slider.addEventListener('mousemove', onMouseMove);

    // Set initial cursor style
    slider.style.cursor = 'grab';

    return () => {
      slider.removeEventListener('mousedown', onMouseDown);
      slider.removeEventListener('mouseleave', onMouseLeaveOrUp);
      slider.removeEventListener('mouseup', onMouseLeaveOrUp);
      slider.removeEventListener('mousemove', onMouseMove);
      slider.style.cursor = ''; // Reset cursor on unmount
      slider.style.userSelect = ''; // Reset userSelect on unmount
    };
  }, [scrollableContainerRef]); // Re-run if the ref changes (though it shouldn't often)


  return (
    <>
      <Head>
        <title>Barista KDS</title>
        <meta name="description" content="Barista Kitchen Display System" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {/* No DragDropContext needed for this type of scrolling */}
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
        {/* Assign the ref to the main content area */}
        <main className="main-content" ref={scrollableContainerRef}>
          {error && <div className="error-message">{error}</div>}
          <OrdersList
            orders={filteredOrders}
            onStatusUpdate={handleStatusUpdate}
            isLoading={isLoading && orders.length === 0}
            error={!error && filteredOrders.length === 0 && !isLoading ? (activeTab === "completed" ? "No completed orders found" : "No in-progress orders found.") : null}
            showCompleted={activeTab === "completed"}
            // droppableId is not needed if not using react-beautiful-dnd
          />
        </main>
      </div>
    </>
  );
}