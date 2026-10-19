// frontend/src/app/make-payment/page.js
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useRef, useState } from 'react';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const paypalContainerRef = useRef(null);
  const buttonsRendered = useRef(false);

  useEffect(() => {
    if (!token) {
      setError("Missing required transaction tracking token parameter.");
      setLoading(false);
      return;
    }

    console.log(`[Client] Retrieved tracking token: ${token}`);

    
    const scriptId = "paypal-sdk-script";
    let script = document.getElementById(scriptId);

    const initializePayPalButtons = () => {
      if (buttonsRendered.current) return;

      if (!window.paypal) {
        setError("PayPal SDK failed to load properly.");
        setLoading(false);
        return;
      }

      setLoading(false);

      window.paypal.Buttons({
        // Call your brand new Next.js Serverless Order Creation API
        createOrder: async () => {
          try {
            const res = await fetch("/api/orders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ trackingToken: token }),
            });
            if (!res.ok) throw new Error("Backend failed to initialize transaction order.");
            const orderData = await res.json();
            return orderData.id;
          } catch (err) {
            console.error(err);
            alert("Order creation failed. Please try again.");
          }
        },

        // Call your brand new Next.js Serverless Order Capture API on Approval
        onApprove: async (data) => {
          try {
            const res = await fetch(`/api/orders/${data.orderID}/capture`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            });
            if (!res.ok) throw new Error("Backend network error during transaction capture.");

            // Redirect smoothly to your success route
            router.push("/paypal-success");
          } catch (err) {
            console.error(err);
            alert("Payment capture failed. Your bank statement has not been billed.");
          }
        },

        onError: (err) => {
          console.error("PayPal Smart Button Error:", err);
          setError("An authorization failure occurred inside the gateway panel.");
        }
      }).render(paypalContainerRef.current);

      buttonsRendered.current = true;
    };


console.log(`[Client] Initializing PayPal Buttons for tracking token: ${token}`); 

if (!script) {
  script = document.createElement("script");
  
  // ✅ FIXED: Added the complete /sdk/js path and the missing '$' for the variable injection
  script.src = `https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&currency=USD`;
  
  script.id = scriptId;
  script.async = true;
  script.onload = initializePayPalButtons;
  document.body.appendChild(script);
} else {
  initializePayPalButtons();
}

  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-xl shadow-md max-w-md w-full text-center border border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Club Dues Secure Checkout</h2>
        <p className="text-slate-500 text-xs mb-6">Tracking Token: <span className="font-mono font-bold">{token}</span></p>

        {loading && (
          <div className="text-sm font-medium text-slate-600 animate-pulse py-4">
            Loading secure payment gateway configuration...
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded mb-4">
            {error}
          </div>
        )}

        <div ref={paypalContainerRef} className="mt-4 min-h-[150px]"></div>
      </div>
    </div>
  );
}

// Next.js requires useSearchParams hooks to be wrapped in a Suspense boundary
export default function MakePaymentPage() {
  return (
    <Suspense fallback={<div className="text-center p-12">Loading Workspace...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
