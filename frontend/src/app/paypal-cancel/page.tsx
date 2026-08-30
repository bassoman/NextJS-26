// frontend/src/app/paypal-cancel/page.tsx

import Link from "next/link";

export const metadata = {
  title: "PayPal Payment Cancelled", // More descriptive title for user
  description: "This page is displayed when a PayPal payment has been cancelled by the user.",
};

export default function PayPalCancelPage() { // Renamed for clarity (Page suffix)
  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl text-center space-y-6">
      <div className="bg-white shadow-lg rounded-xl p-8 md:p-10 border-l-8 border-red-500">
        <h1 className="text-4xl font-extrabold text-red-700 mb-4">
          Payment Cancelled
        </h1>
        <p className="text-xl text-gray-700 leading-relaxed">
          Your PayPal Dues & Donation Payment was <strong>cancelled</strong>.
        </p>
        <p className="text-md text-gray-600 mt-4">
          You can return to the{" "}
          <Link href="/paypal-dues" className="text-blue-600 hover:underline">
            dues payment form
          </Link>{" "}
          to try again.
        </p>
      </div>
    </div>
  );
}