// frontend/src/app/layout.tsx
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import type { Metadata } from "next"; // ✅ Import Metadata type
import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SideMenu from "../components/SideMenu";

const inter = Inter({ subsets: ["latin"] });

// ✅ Strongly typed metadata
export const metadata: Metadata = {
  title: "Demonstration Web Project",
  description: "A Next.js and Express.js demonstration project",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex flex-col min-h-screen">
          <Header />
          <div className="flex flex-1">
            <SideMenu />
            <main className="flex-1 p-8">{children}</main>
          </div>
          <Footer />
        </div>
      </body>
    </html>
  );
}


