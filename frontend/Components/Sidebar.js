"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  Users,
  Stethoscope,
  ClipboardList,
  FlaskConical,
} from "lucide-react";

export default function Sidebar({ isOpen }) {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userData = localStorage.getItem("user");
      if (userData) {
        try {
          const user = JSON.parse(userData);
          setUserRole(user.role);
        } catch (error) {
          console.error("Error parsing user data:", error);
        }
      }
    }
  }, []);

  // Define all possible links
  const allLinks = [
    { href: "/admin", label: "Admin Dashboard", icon: Home, roles: ["SUPER_ADMIN"], color: "from-purple-500 to-purple-600" },
    { href: "/doctor", label: "Doctor Dashboard", icon: Stethoscope, roles: ["DOCTOR", "SUPER_ADMIN"], color: "from-blue-500 to-blue-600" },
    { href: "/reception", label: "Reception", icon: Users, roles: ["RECEPTIONIST", "SUPER_ADMIN"], color: "from-green-500 to-green-600" },
    { href: "/lab", label: "Lab", icon: FlaskConical, roles: ["LAB_STAFF", "SUPER_ADMIN"], color: "from-orange-500 to-orange-600" },
    { href: "/display", label: "Display Screen", icon: ClipboardList, roles: ["DOCTOR", "RECEPTIONIST", "LAB_STAFF", "SUPER_ADMIN"], color: "from-indigo-500 to-indigo-600" },
  ];

  // Filter links based on user role
  const sidebarLinks = userRole
    ? allLinks.filter((link) => link.roles.includes(userRole))
    : [];

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
          onClick={() => {}}
        />
      )}
      <aside
        className={`fixed top-0 left-0 z-40 h-full w-64 bg-white/95 backdrop-blur-xl border-r border-gray-200/50 shadow-xl transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-center h-20 border-b border-gray-200/50 bg-gradient-to-r from-primary-500 to-primary-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Stethoscope size={24} className="text-white" />
            </div>
            <h2 className="text-xl font-display font-bold text-white">Clinic Panel</h2>
          </div>
        </div>
        <nav className="mt-6 flex flex-col space-y-2 px-4">
          {sidebarLinks.map(({ href, label, icon: Icon, color }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`group flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? `bg-gradient-to-r ${color} text-white shadow-lg shadow-${color.split('-')[1]}-500/30`
                    : "text-gray-700 hover:bg-gray-50 hover:text-primary-600"
                }`}
              >
                <Icon 
                  size={20} 
                  className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}
                />
                <span>{label}</span>
                {isActive && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-white/80"></div>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200/50">
          <div className="text-xs text-gray-500 text-center">
            <p className="font-semibold">Healthcare System</p>
            <p className="mt-1">v1.0.0</p>
          </div>
        </div>
      </aside>
    </>
  );
}
