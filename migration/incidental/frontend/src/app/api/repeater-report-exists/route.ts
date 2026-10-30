// frontend/src/app/api/repeater-report-exists/route.ts

import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/sqlite";

interface ReportRow {
  myindex: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const year = searchParams.get("year");
    const month = searchParams.get("month");

    if (year && month) {
      const reportUrl = `https://audio.stickerburr.net/files/${month}_${year}/index.html`;
      let exists = false;
      try {
        const headRes = await fetch(reportUrl, {
          method: "HEAD",
          signal: AbortSignal.timeout(2000),
        });
        exists = headRes.ok;
      } catch {
        exists = false;
      }

      return NextResponse.json(
        {
          success: true,
          exists,
          url: reportUrl,
        },
        { status: 200 }
      );
    }

    const callsign = searchParams
      .get("callsign")
      ?.trim()
      .toUpperCase();

    const dateStr = searchParams.get("date");

    if (!callsign) {
      return NextResponse.json(
        {
          error: "Missing required query parameter: 'callsign' or 'year' & 'month'",
        },
        { status: 400 }
      );
    }

    console.log(
      `[Compliance API] Verifying FCC recorded broadcast log presence for: ${callsign} on Date: ${dateStr || "Latest"}`
    );

    let row: ReportRow | undefined;

    if (dateStr) {
      row = db
        .prepare(`
          SELECT myindex
          FROM pp_tnx
          WHERE callsigns = ?
            AND date(mydate) = date(?)
          ORDER BY myindex DESC
          LIMIT 1
        `)
        .get(callsign, dateStr) as ReportRow | undefined;
    } else {
      row = db
        .prepare(`
          SELECT myindex
          FROM pp_tnx
          WHERE callsigns = ?
          ORDER BY myindex DESC
          LIMIT 1
        `)
        .get(callsign) as ReportRow | undefined;
    }

    const exists = row !== undefined;

    console.log(
      `[Compliance API] Verification for ${callsign}: ${
        exists
          ? "✅ COMPLIANT LOG RECORDED"
          : "❌ NO COMPLIANCE RECORD FOUND"
      }`
    );

    return NextResponse.json(
      {
        success: true,
        exists,
        message: exists
          ? "Broadcast compliance recording verified."
          : "Missing required broadcast audio documentation.",
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    console.error(
      "❌ Critical Failure inside Next.js broadcast compliance check:",
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