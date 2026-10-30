// frontend/src/components/SideMenu.js
"use client"; // This component needs client-side interactivity
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

const SideMenu = () => {
  const pathname = usePathname();

  // Helper for separators
  const sep = (id) => ({ type: "separator", id });

  const menuItems = [
    { name: "Home Page", path: "/home-page" },
    { name: "About CARC", path: "/about-carc" },
    { name: "PayPal Dues", path: "/paypal-dues" },
    { name: "Privacy Policy", path: "/privacy-policy" },
    { name: "Coming Events", path: "/coming-events" },
    { name: "Newsletters", path: "/newsletter" },
    { name: "Presentations", path: "/presentations" },
    { name: "Field Day", path: "/field-day" },
    { name: "Photo Gallery", path: "/photo-gallery" },
    { name: "Club News", path: "/news" },
    { name: "Exams", path: "/exams" },
    { name: "Links", path: "/links" },
    { name: "North Peak Repeater Site", path: "/north-peak" },
    { name: "Officers & Staff", path: "/officers-staff" },
    { name: "Repeater Calendar", path: "/repeater-calendar" },
    { name: "Repeater Usage", path: "/repeater-usage" },
    { name: "Wants and Swaps", path: "/wants-and-swaps" },
    { name: "Net Control Roster", path: "/net-control-roster" },
    sep("carc_separator_1"),
    // Some Documents (shown in Blue text)
    {
      name: "Net Checkin Script",
      type: "pdf",
      url: "/documents/CARC_NET_CHECK-IN_SCRIPT.pdf",
    },
    {
      name: "NET CONTROL Operator Guide",
      type: "pdf",
      url: "/documents/CARC_Net_Control_Operator_Guide-DR_MODIFIED.pdf",
    },
    {
      name: "Repeater User Guide",
      type: "pdf",
      url: "/documents/CARC_Repeater_User_Guide-DR-1_MODIFIED.pdf",
    },
    {
      name: "Membership Form",
      type: "pdf",
      url: "/documents/CARC_MembershipForm.pdf",
    },
    {
      name: "CONSTITUTION & BYLAWS (PDF)",
      type: "pdf",
      url: "/documents/CARC_Constitution_and_Bylaws_08-27-2025.pdf",
    },
    sep("carc_separator_2"),
    { name: "Test Get Full Name", path: "/test-get-full-name" },
    { name: "Test Get Last Entries", path: "/test-get-last-entries" },
    { name: "Browse/Edit Members", path: "/members" },

    sep("carc_separator_3"),
    /* The original menu items created at the start of the project
    { name: "Home", path: "/" },
    { name: "About Us", path: "/about" },
    { name: "Our Services", path: "/services" },
     */
    { name: "How It Works", path: "/how-it-works" },

  ];

  return (
    <nav className="w-64 bg-gray-100 p-4 shadow-lg h-full">
      <ul className="space-y-0">
        {menuItems.map((item) => {
          const key = item.type === "separator" ? item.id : item.name;

          if (item.type === "separator") {
            return (
              <li
                key={key}
                className="my-3 h-1 rounded bg-blue-900"
                aria-hidden="true"
              />
            );
          } else if (item.type === "pdf") {
            return (
              <li key={key}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-2 rounded text-blue-600 hover:bg-gray-200 transition"
                >
                  {item.name}
                </a>
              </li>
            );
          } else {
            return (
              <li key={key}>
                <Link
                  href={item.path}
                  className={`block p-2 rounded transition ${pathname === item.path
                    ? "bg-blue-500 text-white"
                    : "hover:bg-gray-200"
                    }`}
                >
                  {item.name}
                </Link>
              </li>
            );
          }
        })}
      </ul>
    </nav>
  );
};

export default SideMenu;
