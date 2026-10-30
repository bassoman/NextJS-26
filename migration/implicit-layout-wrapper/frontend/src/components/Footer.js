// frontend/src/components/Footer.js
"use client";
import React, { useEffect, useState } from "react";

const Footer = () => {
  const [lastModified, setLastModified] = useState("");

  useEffect(() => {
    if (typeof document !== "undefined") {
      setLastModified(document.lastModified);
    }
  }, []);

  return (
    <footer className="bg-gray-500 text-white p-4 text-center mt-auto">
      <p suppressHydrationWarning>&copy; {new Date().getFullYear()} CoastsideARC. All rights reserved.</p>
      {lastModified && (
        <p className="text-sm mt-1 italic">
          Page last modified: {lastModified}
        </p>
      )}
    </footer>
  );
};

export default Footer;
