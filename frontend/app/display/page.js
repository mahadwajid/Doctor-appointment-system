"use client";

import { useState, useEffect } from "react";
import { queueAPI } from "@/lib/api";
import { getSocket } from "@/lib/socket";

export default function DisplayScreen() {
  const [queueStatus, setQueueStatus] = useState({
    current: null,
    next: null,
    waitingCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQueueStatus();

    // Set up real-time updates via Socket.IO
    let socket = null;
    let interval = null;

    const setupSocket = async () => {
      try {
        const socketResult = getSocket();
        if (!socketResult) {
          // Server-side rendering, just use polling
          interval = setInterval(loadQueueStatus, 5000);
          return;
        }

        // Handle both promise and direct socket
        socket = socketResult instanceof Promise ? await socketResult : socketResult;
        
        if (!socket) return;

        socket.on("queue-update", (data) => {
          setQueueStatus({
            current: data.current,
            next: data.waiting?.[0] || null,
            waitingCount: data.waiting?.length || 0,
          });
          setLoading(false);
        });

        socket.on("patient-called", (data) => {
          // Immediately refresh queue status
          loadQueueStatus();
        });

        socket.on("appointment-completed", (data) => {
          // Immediately refresh queue status when appointment is completed
          loadQueueStatus();
        });

        socket.on("new-patient", () => {
          // Refresh when new patient is added
          loadQueueStatus();
        });
      } catch (error) {
        console.error("Failed to setup socket:", error);
      }
    };

    setupSocket();

    // Poll for updates every 2 seconds as fallback (more frequent for better responsiveness)
    interval = setInterval(loadQueueStatus, 2000);

    return () => {
      if (socket) {
        socket.off("queue-update");
        socket.off("patient-called");
        socket.off("appointment-completed");
        socket.off("new-patient");
      }
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  const loadQueueStatus = async () => {
    try {
      const data = await queueAPI.getStatus();
      setQueueStatus(data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to load queue status:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="text-4xl font-bold text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-900 to-blue-700">
      <div className="text-center text-white">
        <h1 className="mb-8 text-6xl font-bold">Patient Display Screen</h1>

        {/* Current Patient */}
        <div className="mb-12">
          <h2 className="mb-4 text-3xl font-semibold">Now Serving</h2>
          {queueStatus.current ? (
            <div className="rounded-lg bg-white p-12 shadow-2xl">
              <div className="text-8xl font-extrabold text-blue-600">
                #{queueStatus.current.ticketNumber}
              </div>
              <div className="mt-4 text-3xl font-semibold text-gray-800">
                {queueStatus.current.patientName}
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-gray-200 p-12 shadow-2xl">
              <div className="text-6xl font-bold text-gray-500">No Patient</div>
            </div>
          )}
        </div>

        {/* Next Patient */}
        <div className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">Next In Line</h2>
          {queueStatus.next ? (
            <div className="rounded-lg bg-yellow-400 p-8 shadow-xl">
              <div className="text-6xl font-extrabold text-gray-800">
                #{queueStatus.next.ticketNumber}
              </div>
              <div className="mt-2 text-2xl font-semibold text-gray-800">
                {queueStatus.next.patientName}
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-gray-200 p-8 shadow-xl">
              <div className="text-4xl font-bold text-gray-500">No One Waiting</div>
            </div>
          )}
        </div>

        {/* Waiting Count */}
        <div className="text-2xl font-semibold">
          <span className="rounded bg-white px-6 py-2 text-blue-600">
            {queueStatus.waitingCount} {queueStatus.waitingCount === 1 ? "Person" : "People"} Waiting
          </span>
        </div>

        {/* Current Time */}
        <div className="mt-8 text-xl">
          {new Date().toLocaleString()}
        </div>
      </div>
    </div>
  );
}
