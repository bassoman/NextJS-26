// frontend/src/app/api/orders/route.js

import db from "@/lib/sqlite";
import { NextResponse } from "next/server";

async function generateAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  const baseUrl =
    process.env.PAYPAL_BASE_URL?.trim() ||
    "https://api-m.sandbox.paypal.com";

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET keys"
    );
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`PayPal Authentication Failure: ${await response.text()}`);
  }

  return (await response.json()).access_token;
}

export async function POST(request) {
  let trackingToken = "UNKNOWN";

  try {
    const body = await request.json();
    trackingToken = body.trackingToken;

    const row = db
      .prepare(`
        SELECT pp_total
        FROM pp_tnx
        WHERE pp_id = ?
        LIMIT 1
      `)
      .get(trackingToken);

    if (!row) {
      return NextResponse.json(
        { error: "Tracking token pending or not found." },
        { status: 404 }
      );
    }

    const baseUrl =
      process.env.PAYPAL_BASE_URL?.trim() ||
      "https://api-m.sandbox.paypal.com";
    const verifiedPrice = parseFloat(row.pp_total).toFixed(2);
    const origin = request.nextUrl.origin || "http://localhost:3000";
    // The public-facing path prefix under which the app is served (e.g. "/carc").
    // request.nextUrl.origin has no path, so PayPal return/cancel URLs must add it.
    const appBasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

    const accessToken = await generateAccessToken();
    const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: trackingToken,
            amount: {
              currency_code: "USD",
              value: verifiedPrice,
            },
          },
        ],
        application_context: {
          return_url: `${origin}${appBasePath}/paypal-success`,
          cancel_url: `${origin}${appBasePath}/paypal-cancel`,
        },
      }),
    });
    const rawText = await response.text();

    if (!rawText || !response.ok) {
      throw new Error(`PayPal Order API Rejection: ${rawText}`);
    }

    const orderData = JSON.parse(rawText);

    if (typeof orderData.id !== "string") {
      throw new Error("PayPal order response did not include an order ID");
    }

    db.prepare(`
      UPDATE pp_tnx
      SET pp_orderID = ?
      WHERE pp_id = ?
    `).run(orderData.id, trackingToken);

    return NextResponse.json({ id: orderData.id }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.error(
      `Error creating PayPal order for tracking token ${trackingToken}:`,
      error
    );

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
