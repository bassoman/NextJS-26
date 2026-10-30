// frontend/src/app/api/getPPtnxdata/route.ts

import db from "@/lib/sqlite";
import { NextRequest, NextResponse } from "next/server";

interface TransactionRow {
  myindex: number | null;
  mydate: string | null;
  years: string | null;
  callsigns: string | null;
  primary_: string | null;
  family: string | null;
  donation: string | null;
  subtotal: string | null;
  paypalfee: string | null;
  clubreceives: string | null;
  total: string | null;
  FullName: string | null;
  pay_paypal: string | null;
  transaction_status: string | null;
  pp_orderID: string | null;
  pp_id: string | null;
  pp_total: number | null;
}

export async function GET(request: NextRequest) {
  try {
    console.log(
      "[SQLite API] Fetching last 12 historical transaction logs from pp_tnx..."
    );

    const rows = db
      .prepare(`
        SELECT
          myindex,
          mydate,
          years,
          callsigns,
          primary_,
          family,
          donation,
          subtotal,
          paypalfee,
          clubreceives,
          total,
          FullName,
          pay_paypal,
          transaction_status,
          pp_orderID,
          pp_id,
          pp_total
        FROM pp_tnx
        WHERE transaction_status = 'posted'
        ORDER BY myindex DESC
        LIMIT 12
      `)
      .all() as TransactionRow[];

    console.log(
      `✅ Successfully retrieved ${rows.length} SQLite transaction entries.`
    );

    return NextResponse.json(
      {
        success: true,
        entries: rows,
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    console.error(
      "❌ Critical failure inside /api/getPPtnxdata:",
      message
    );

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}