// frontend/src/app/paypal-success/page.tsx
import Link from 'next/link';
import React from 'react';

export const metadata = {
  title: 'Payment Successful - Coastside ARC',
  description: 'Your club membership dues transaction has been processed successfully.',
};

export default function PaypalSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-xl shadow-md max-w-md w-full text-center border border-slate-200">
        
        {/* Success Icon Anchor */}
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Payment Successful!
        </h2>
        
        <p className="text-slate-600 mb-6 leading-relaxed">
          Thank you for supporting the <strong>Coastside Amateur Radio Club</strong>. Your payment has been securely processed and your membership ledger records are being synchronized.
        </p>

        {/* Navigation Action Hook */}
        <Link 
          href="/home-page" 
          className="inline-block w-full bg-blue-700 hover:bg-blue-800 text-white font-medium py-2.5 px-4 rounded-md transition-colors shadow-sm text-sm text-center"
        >
          Return to HomePage
        </Link>
        
      </div>
    </div>
  );
}
