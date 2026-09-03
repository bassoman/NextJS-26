import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const environment =
    process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT === "sandbox"
      ? "sandbox"
      : "live";
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim();

  if (!clientId) {
    return NextResponse.json(
      { error: "PayPal client ID is not configured." },
      { status: 503 }
    );
  }

  return NextResponse.json({ clientId, environment });
}