"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  Stethoscope,
  ClipboardList,
  FlaskConical,
} from "lucide-react";

const sidebarLinks = [
  { href: "/admin", label: "Admin Dashboard", icon: Home },
  { href: "/doctor", label: "Doctor Dashboard", icon: Stethoscope },
  { href: "/reception", label: "Reception", icon: Users },
  { href: "/lab", label: "Lab", icon: FlaskConical },
  { href: "/display", label: "Display Screen", icon: ClipboardList },
];

export default function Sidebar({ isOpen }) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-full w-64 bg-white shadow-md transition-transform duration-200 md:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex items-center justify-center h-16 border-b">
        <h2 className="text-lg font-bold text-blue-600">Clinic Panel</h2>
      </div>
      <nav className="mt-4 flex flex-col space-y-1 px-4">
        {sidebarLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 ${
              pathname.startsWith(href) ? "bg-blue-100 text-blue-600" : ""
            }`}
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
