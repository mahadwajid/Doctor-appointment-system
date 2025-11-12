"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

export default function Navbar({ toggleSidebar }) {
  return (
    <nav className="flex items-center justify-between bg-white px-6 py-3 shadow-md">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="md:hidden text-gray-600 hover:text-blue-600"
        >
          <Menu size={24} />
        </button>
        <h1 className="text-xl font-bold text-blue-600">
          Doctor Appointment System
        </h1>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-gray-600">Welcome, Doctor</span>
        <button className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700">
          Logout
        </button>
      </div>
    </nav>
  );
}
