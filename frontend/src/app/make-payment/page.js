// frontend/src/app/make-payment/page.js
import CheckoutClient from './CheckoutClient';

// Render per request so the PayPal client ID comes from the runtime environment.
export const dynamic = 'force-dynamic';

export default function MakePaymentPage() {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim() || '';
  return <CheckoutClient clientId={clientId} />;
}
