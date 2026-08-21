// frontend/src/app/api/orders/[orderID]/capture/route.js

import { NextResponse } from "next/server";
import db from "@/lib/sqlite";
import {
  invokePayPalLambda,
  isPayPalLambdaConfigured,
} from "@/lib/paypal-lambda";

// Helper function to generate an access token from PayPal Sandbox
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

  const auth = Buffer.from(
    `${clientId}:${clientSecret}`
  ).toString("base64");

  const response = await fetch(
    `${baseUrl}/v1/oauth2/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${auth}`,
      },
      body: "grant_type=client_credentials",
    }
  );

  if (!response.ok) {
    const errorMsg = await response.text();

    throw new Error(
      `PayPal Authentication Failure: ${errorMsg}`
    );
  }

  const data = await response.json();

  return data.access_token;
}

// Capture PayPal order
export async function POST(request, { params }) {
  try {
    const resolvedParams = await params;
    const { orderID } = resolvedParams;

    if (!orderID) {
      return NextResponse.json(
        { error: "Missing PayPal order ID." },
        { status: 400 }
      );
    }

    console.log(
      `[Serverless API] Capturing PayPal Order ID: ${orderID}`
    );

    const baseUrl =
      process.env.PAYPAL_BASE_URL?.trim() ||
      "https://api-m.sandbox.paypal.com";
    let responseOk = true;
    let data;

    if (isPayPalLambdaConfigured("capture")) {
      data = await invokePayPalLambda("capture", { orderID });
    } else {
      const accessToken = await generateAccessToken();
      const response = await fetch(
        `${baseUrl}/v2/checkout/orders/${orderID}/capture`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      responseOk = response.ok;
      const rawText = await response.text();
      if (!rawText || rawText.trim().length === 0) {
        throw new Error(
          `PayPal Server returned an empty response string with status: ${response.status}`
        );
      }
      data = JSON.parse(rawText);
    }

    console.log(
      `PayPal order status for order ${orderID}: ${data.status}`
    );

    if (!responseOk) {
      console.error(
        "❌ PayPal Capture API Rejection Payload:",
        data
      );

      return NextResponse.json(
        data,
        { status: response.status }
      );
    }

    const purchaseUnit = data.purchase_units?.[0];

    const captureStatus =
      purchaseUnit?.payments?.captures?.[0]?.status;

    const purchaseStatus = data.status;

    console.log(
      `Current purchase status for order ${orderID}: ${purchaseStatus}`
    );

    console.log(
      `Current capture status for order ${orderID}: ${captureStatus}`
    );

    if (purchaseStatus === "COMPLETED") {
      console.log(
        `✅ PayPal Order ${orderID} completed successfully. Updating pp_tnx table...`
      );

      const result = db
        .prepare(`
          UPDATE pp_tnx
          SET
            transaction_status = 'posted',
            pp_response = ?
          WHERE pp_orderID = ?
        `)
        .run(
          JSON.stringify(data),
          orderID
        );

      console.log(
        `🔄 Updated pp_tnx table: ${result.changes} row(s) set to 'posted' for order ${orderID}`
      );

      if (result.changes === 0) {
        console.warn(
          `⚠️ PayPal capture succeeded, but no pp_tnx row matched order ID ${orderID}`
        );
      }
    } else {
      console.warn(
        `⚠️ Capture returned payment status: ${captureStatus}`
      );
    }

    return NextResponse.json(
      data,
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      "❌ Critical Failure inside Next.js /api/orders/capture route:",
      message
    );

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}