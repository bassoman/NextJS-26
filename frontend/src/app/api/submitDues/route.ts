// frontend/src/app/api/submitDues/route.ts

import db from "@/lib/sqlite";
import { NextRequest, NextResponse } from "next/server";

// Helper function to safely format money fields as strings
function fmtMoneyStr(val: unknown): string {
  if (val === undefined || val === null || val === "") return "$\u00A00.00";

  const num =
    typeof val === "number"
      ? val
      : parseFloat(String(val));

  if (isNaN(num)) return "$\u00A00.00";

  return `$\u00A0${num.toFixed(2)}`;
}

interface DuesRequestBody {
  callsign?: string;
  total?: number | string;
  years?: number | string;
  newmember?: boolean;
  callsigns?: string;
  primary?: number | string;
  family?: number | string;
  repeater?: number | string;
  digipeater?: number | string;
  donation?: number | string;
  subtotal?: number | string;
  paypalfee?: number | string;
  clubreceives?: number | string;
  pp_total?: number;
  date?: string;
  transaction_status?: "pending" | "posted" | "cancelled";
}

interface MemberRow {
  FullName: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const formData = (await request.json()) as DuesRequestBody;

    if (!formData.callsign || !formData.total) {
      return NextResponse.json(
        { error: "Missing required form data" },
        { status: 400 }
      );
    }

    // Generate our persistent tracking token.
    const new_pp_id =
      `PP_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const cleanCallsign = formData.callsign.trim().toUpperCase();

    let resolvedFullName = "UNKNOWN MEMBER";

    // Look up the member name.
    const memberRow = db
      .prepare(`
        SELECT FullName
        FROM merged
        WHERE callsign = ?
        LIMIT 1
      `)
      .get(cleanCallsign) as MemberRow | undefined;

    if (memberRow?.FullName) {
      resolvedFullName = memberRow.FullName.trim();

      console.log(
        `[Dues API] Successfully resolved callsign ${cleanCallsign} to: ${resolvedFullName}`
      );
    } else {
      console.warn(
        `[Dues API] Callsign ${cleanCallsign} not found in database registry. Defaulting to fallback name.`
      );
    }

    // Combine legacy donation-related fields.
    const rawRepeater =
      typeof formData.repeater === "number"
        ? formData.repeater
        : parseFloat(formData.repeater || "0");

    const rawDigi =
      typeof formData.digipeater === "number"
        ? formData.digipeater
        : parseFloat(formData.digipeater || "0");

    const rawDonation =
      typeof formData.donation === "number"
        ? formData.donation
        : parseFloat(formData.donation || "0");

    const totalDonationValue =
      rawRepeater + rawDigi + rawDonation;

    const repeaterValue = fmtMoneyStr(0);
    const digipeaterValue = fmtMoneyStr(0);

    const nextIndexRow = db
      .prepare(`
    SELECT COALESCE(MAX(myindex), 0) + 1 AS nextIndex
    FROM pp_tnx
  `)
      .get() as { nextIndex: number };

    const nextMyIndex = nextIndexRow.nextIndex;


    const insertSql = `
      INSERT INTO pp_tnx (
        myindex,
        years,
        "new",
        callsigns,
        FullName,
        primary_,
        family,
        repeater,
        digipeater,
        donation,
        subtotal,
        paypalfee,
        clubreceives,
        total,
        pp_total,
        mydate,
        transaction_status,
        pp_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const insertValues = [
      nextMyIndex,
      formData.years ?? 0,
      formData.newmember ? 1 : 0,
      formData.callsigns ?? "",
      resolvedFullName,
      fmtMoneyStr(formData.primary),
      fmtMoneyStr(formData.family),
      repeaterValue,
      digipeaterValue,
      fmtMoneyStr(totalDonationValue),
      fmtMoneyStr(formData.subtotal),
      fmtMoneyStr(formData.paypalfee),
      fmtMoneyStr(formData.clubreceives),
      fmtMoneyStr(formData.total),
      formData.pp_total ?? 0,
      formData.date ??
      new Date().toISOString().slice(0, 19).replace("T", " "),
      formData.transaction_status ?? "pending",
      new_pp_id,
    ];

    db.prepare(insertSql).run(...insertValues);

    console.log(
      `[SQLite API] Ledger saved. Resolved Name for Token: ${resolvedFullName}`
    );

    return NextResponse.json(
      {
        success: true,
        transactionId: new_pp_id,
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    console.error(
      "❌ SQLite database error in /api/submitDues:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to initialize dues tracking record: " +
          message,
      },
      { status: 500 }
    );
  }
}