import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Doctor Appointment Management System",
  description: "Built with Next.js + TailwindCSS",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-100 text-gray-800`}>
        {children}
      </body>
    </html>
  );
}
