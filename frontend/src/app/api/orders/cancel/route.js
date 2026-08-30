// frontend/src/app/api/orders/cancel/route.js

import db from "@/lib/sqlite";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const { orderID, trackingToken } = body;

    console.log(
      `[Cancel API] Payment cancellation requested for Order ID: ${orderID || "N/A"}, Token: ${trackingToken || "N/A"}`
    );

    let changes = 0;

    if (orderID) {
      const result = db
        .prepare(`
          UPDATE pp_tnx
          SET transaction_status = 'cancelled'
          WHERE pp_orderID = ?
        `)
        .run(orderID);
      changes += result.changes;
    }

    if (trackingToken && changes === 0) {
      const result = db
        .prepare(`
          UPDATE pp_tnx
          SET transaction_status = 'cancelled'
          WHERE pp_id = ?
        `)
        .run(trackingToken);
      changes += result.changes;
    }

    console.log(`[Cancel API] Updated ${changes} row(s) to 'cancelled'`);

    return NextResponse.json({ success: true, changes }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Error recording cancellation:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
