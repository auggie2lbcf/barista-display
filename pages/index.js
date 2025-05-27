// pages/index.js
import React, { useState, useEffect, useCallback, useMemo } from "react"; // Removed useRef
import Head from "next/head";
import HeaderDisplay from "../components/HeaderDisplay";
import OrderTabs from "../components/OrderTabs";
import OrdersList from "../components/OrdersList";
import { CONFIG, ORDER_STATUS } from "../lib/config";
import { transformSquareOrder } from "../lib/orderUtils";
import { fetchOrdersFromSquare, updateSquareOrder } from "../lib/squareService";

const CONNECTION_STATUS = {
  CONNECTED: "connected",
  ERROR: "error",
  CONNECTING: "connecting",
};

const TAB_OPTIONS = {
  IN_PROGRESS: "inprogress",
  COMPLETED: "completed",
};

export default function HomePage() {
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState(TAB_OPTIONS.IN_PROGRESS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(CONNECTION_STATUS.CONNECTING);

  // Removed: scrollableContainerRef, isDraggingRef, dragStartCoordsRef, scrollStartCoordsRef

  const stats = useMemo(() => {
    const inprogressCount = orders.filter(order => order.status === ORDER_STATUS.IN_PROGRESS).length;
    const completedCount = orders.filter(order => order.status === ORDER_STATUS.COMPLETED).length;
    return {
      total: inprogressCount,
      inprogress: inprogressCount,
      completed: completedCount,
    };
  }, [orders]);

  const loadOrders = useCallback(async (isManualRefresh = false) => {
    if (!isManualRefresh) setIsLoading(true);
    setError(null);
    setConnectionStatus(CONNECTION_STATUS.CONNECTING);

    try {
      const rawOrders = await fetchOrdersFromSquare();
      const transformed = rawOrders.map(transformSquareOrder).filter(Boolean);
      setOrders(transformed);
      setConnectionStatus(CONNECTION_STATUS.CONNECTED);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError(`Failed to fetch orders: ${err.message}`);
      setConnectionStatus(CONNECTION_STATUS.ERROR);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    const intervalId = setInterval(
      () => loadOrders(),
      CONFIG.REFRESH_INTERVAL_SECONDS_CONFIG * 1000
    );
    return () => clearInterval(intervalId);
  }, [loadOrders]);

  // Removed: useEffect for handling drag-to-scroll (mouse and touch)

  const filteredOrders = useMemo(() => {
    let newFilteredList = [];
    if (activeTab === TAB_OPTIONS.IN_PROGRESS) {
      newFilteredList = orders.filter((order) => order.status === ORDER_STATUS.IN_PROGRESS);
    } else if (activeTab === TAB_OPTIONS.COMPLETED) {
      newFilteredList = orders.filter((order) => order.status === ORDER_STATUS.COMPLETED);
    }

    if (activeTab === TAB_OPTIONS.COMPLETED) {
      return newFilteredList.sort((a, b) =>
        new Date(b.completedAt || b.timestamp) - new Date(a.completedAt || a.timestamp)
      );
    }
    return newFilteredList.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }, [orders, activeTab]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    if (newStatus !== ORDER_STATUS.COMPLETED) {
      setError("Invalid status update. Only 'completed' is allowed for now.");
      return;
    }

    const orderToUpdate = orders.find(o => o.id === orderId);
    if (!orderToUpdate) {
      setError("Error: Could not find the order to update.");
      return;
    }

    if (typeof orderToUpdate.version === 'undefined') {
      setError("Error: Order version is missing. Please refresh.");
      await loadOrders(true);
      return;
    }

    const originalOrders = [...orders];
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId
          ? { ...order, status: newStatus, completedAt: new Date().toISOString() }
          : order
      )
    );

    try {
      await updateSquareOrder(orderId, orderToUpdate.version, orderToUpdate.fulfillmentId);
      await loadOrders(true);
    } catch (err) {
      console.error("Error updating Square order:", err);
      setOrders(originalOrders);
      if (err.message.includes("VERSION_MISMATCH")) {
        setError("Order was updated elsewhere. Refreshing orders. Please try again.");
      } else {
        setError(`Failed to update order: ${err.message}. Please try refreshing.`);
      }
      await loadOrders(true);
    }
  };
  
  const getEmptyStateMessage = () => {
    if (isLoading && orders.length === 0) return null;
    if (filteredOrders.length === 0) {
      return activeTab === TAB_OPTIONS.COMPLETED
        ? "No completed orders found."
        : "No in-progress orders found.";
    }
    return null;
  };

  return (
    <>
      <Head>
        <title>Barista KDS</title>
        <meta name="description" content="Barista Kitchen Display System for Square" />
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no, minimum-scale=1, maximum-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="container">
        <HeaderDisplay
          connectionStatus={connectionStatus}
          stats={stats}
          onRefresh={() => loadOrders(true)}
          isLoading={isLoading}
        />
        <OrderTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          stats={stats}
          tabOptions={TAB_OPTIONS}
        />
        {/* The main element no longer needs a ref for scrolling here */}
        <main className="main-content">
          {error && <div className="error-message global-error-message">{error}</div>}
          <OrdersList
            orders={filteredOrders}
            onStatusUpdate={handleStatusUpdate}
            isLoading={isLoading && orders.length === 0}
            emptyStateMessage={getEmptyStateMessage()}
            showCompleted={activeTab === TAB_OPTIONS.COMPLETED}
          />
        </main>
      </div>
    </>
  );
}