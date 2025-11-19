"use client";

import { useState, useEffect } from "react";
import { queueAPI } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { User, Clock, Users, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";

export default function DisplayScreen() {
  const [queueStatus, setQueueStatus] = useState({
    current: null,
    next: null,
    waitingCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadQueueStatus();

    // Set up real-time updates via Socket.IO
    let socket = null;
    let interval = null;
    let timeInterval = null;

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

    // Update time every second
    timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

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
      if (timeInterval) {
        clearInterval(timeInterval);
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
      <div className="display-screen">
        <div className="text-center z-10">
          <div className="inline-block h-20 w-20 animate-spin rounded-full border-6 border-solid border-white border-r-transparent mb-6"></div>
          <div className="text-4xl font-bold text-white">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="display-screen">
      <div className="w-full max-w-7xl mx-auto px-6 py-8 z-10 animate-fade-in relative">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-20 h-20 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center border-4 border-blue-400 shadow-2xl">
              <User size={40} className="text-blue-600" />
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-gray-800 drop-shadow-lg bg-white/80 backdrop-blur-sm px-8 py-4 rounded-2xl border-4 border-blue-300 shadow-xl">
              Clinic Queue Display
            </h1>
          </div>
          <div className="flex items-center justify-center gap-3 text-xl md:text-2xl font-semibold bg-white/90 backdrop-blur-sm px-6 py-3 rounded-xl border-2 border-blue-200 shadow-lg inline-flex">
            <Clock size={28} className="text-blue-600" />
            <span className="text-gray-800 font-bold">{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            <span className="mx-2 text-blue-400">•</span>
            <span className="text-gray-700">{currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Current Patient - Large and Prominent */}
          <div className="lg:col-span-2">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-3 bg-green-500 px-8 py-4 rounded-full border-4 border-green-400 shadow-2xl">
                <CheckCircle size={36} className="text-white" />
                <h2 className="text-3xl md:text-4xl font-display font-black text-white drop-shadow-lg">
                  NOW SERVING
                </h2>
              </div>
            </div>
            
            {queueStatus.current ? (
              <div className="card p-12 md:p-16 bg-gradient-to-br from-green-500 via-green-600 to-emerald-600 border-4 border-green-400 shadow-2xl animate-scale-in">
                <div className="text-center">
                  {/* Large Ticket Number */}
                  <div className="mb-8">
                    <div className="text-7xl md:text-9xl lg:text-[12rem] font-display font-black text-white drop-shadow-2xl leading-none" style={{ textShadow: '0 8px 32px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)' }}>
                      #{queueStatus.current.ticketNumber}
                    </div>
                    <div className="mt-6 text-2xl md:text-3xl font-black text-white uppercase tracking-wider" style={{ textShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                      Ticket Number
                    </div>
                  </div>
                  
                  {/* Patient Name */}
                  <div className="mt-8 pt-8 border-t-4 border-white/40">
                    <div className="flex items-center justify-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center border-4 border-white/50">
                        <User size={32} className="text-white" />
                      </div>
                      <div className="text-3xl md:text-4xl lg:text-5xl font-display font-black text-white drop-shadow-lg" style={{ textShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
                        {queueStatus.current.patientName}
                      </div>
                    </div>
                    <div className="text-xl md:text-2xl font-bold text-white mt-3 bg-white/20 backdrop-blur-sm px-6 py-3 rounded-xl inline-block" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                      ✓ Please proceed to the doctor's room
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card p-12 md:p-16 bg-white/95 backdrop-blur-xl border-4 border-gray-300 shadow-2xl">
                <div className="text-center">
                  <AlertCircle size={80} className="mx-auto mb-6 text-gray-400" />
                  <div className="text-5xl md:text-6xl font-display font-black text-gray-700 mb-4">
                    No Patient
                  </div>
                  <div className="text-2xl md:text-3xl font-semibold text-gray-600">
                    Currently no one is being served
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Side Panel - Next Patient and Queue Info */}
          <div className="space-y-6">
            {/* Next Patient */}
            <div>
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-2 bg-yellow-500 px-5 py-3 rounded-full border-4 border-yellow-400 shadow-xl">
                  <ArrowRight size={28} className="text-white" />
                  <h3 className="text-xl md:text-2xl font-display font-black text-white drop-shadow-lg">
                    NEXT
                  </h3>
                </div>
              </div>
              
              {queueStatus.next ? (
                <div className="card p-6 md:p-8 bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-500 border-4 border-yellow-400 shadow-2xl animate-slide-up">
                  <div className="text-center">
                    <div className="text-5xl md:text-6xl font-display font-black text-gray-900 mb-4" style={{ textShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                      #{queueStatus.next.ticketNumber}
                    </div>
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <div className="w-10 h-10 rounded-full bg-white/40 backdrop-blur-sm flex items-center justify-center border-2 border-white/60">
                        <User size={20} className="text-gray-800" />
                      </div>
                      <div className="text-xl md:text-2xl font-display font-black text-gray-900" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                        {queueStatus.next.patientName}
                      </div>
                    </div>
                    <div className="text-base md:text-lg font-bold text-gray-800 bg-white/70 backdrop-blur-sm px-4 py-2 rounded-lg border-2 border-white/80 shadow-lg">
                      ⏳ Please wait for your turn
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card p-6 md:p-8 bg-white/95 backdrop-blur-xl border-4 border-gray-300 shadow-xl">
                  <div className="text-center">
                    <Users size={48} className="mx-auto mb-4 text-gray-400" />
                    <div className="text-2xl md:text-3xl font-display font-black text-gray-700 mb-2">
                      No One Waiting
                    </div>
                    <div className="text-base md:text-lg font-semibold text-gray-600">
                      Queue is empty
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Waiting Count */}
            <div className="card p-6 md:p-8 bg-white/95 backdrop-blur-xl border-4 border-blue-300 shadow-2xl">
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center border-4 border-blue-300">
                    <Users size={32} className="text-blue-600" />
                  </div>
                  <div className="text-5xl md:text-6xl font-display font-black text-gray-800" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    {queueStatus.waitingCount}
                  </div>
                </div>
                <div className="text-xl md:text-2xl font-display font-black text-gray-700 mb-2">
                  {queueStatus.waitingCount === 1 ? "Person" : "People"} Waiting
                </div>
                <div className="text-base md:text-lg font-semibold text-gray-600">
                  In the queue
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="card p-6 bg-gradient-to-br from-blue-500 to-blue-600 border-4 border-blue-400 shadow-xl">
              <div className="text-center">
                <div className="text-lg md:text-xl font-display font-black text-white mb-4 drop-shadow-lg">
                  📋 Instructions
                </div>
                <div className="text-sm md:text-base font-bold text-white space-y-3 text-left bg-white/20 backdrop-blur-sm p-4 rounded-xl">
                  <div className="flex items-start gap-3">
                    <span className="text-green-300 font-black text-xl">✓</span>
                    <span className="text-white drop-shadow-md">Check your ticket number</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-green-300 font-black text-xl">✓</span>
                    <span className="text-white drop-shadow-md">Wait for your number to appear</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-green-300 font-black text-xl">✓</span>
                    <span className="text-white drop-shadow-md">Go to doctor's room when called</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
