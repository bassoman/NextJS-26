// frontend/src/app/api/getFullName/route.ts
import db from "@/lib/sqlite";
import { NextRequest, NextResponse } from "next/server";

// Explicit interface matching the incoming body expectation
interface LookupRequestBody {
  callsigns?: string[];
}

interface NameRow {
  Callsign: string;
  FullName: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LookupRequestBody;
    const { callsigns } = body;

    if (!callsigns || !Array.isArray(callsigns) || callsigns.length === 0) {
      return NextResponse.json(
        {
          error:
            "Invalid payload. 'callsigns' must be a non-empty array.",
        },
        { status: 400 }
      );
    }

    console.log(
      `[SQLite API] Executing batch name lookup for: ${callsigns.join(", ")}`
    );

    // SQLite requires one ? placeholder for each value.
    //
    // Example:
    // WHERE Callsign IN (?, ?, ?)
    const placeholders = callsigns.map(() => "?").join(",");

    const statement = db.prepare(`
      SELECT Callsign, FullName
      FROM merged
      WHERE Callsign IN (${placeholders})
    `);

    const rows = statement.all(...callsigns) as NameRow[];

    // Build the key-value dictionary mapping.
    const resultsMap: Record<string, string> = {};

    // Seed map with UNKNOWN fallbacks.
    callsigns.forEach((call) => {
      resultsMap[call.toUpperCase()] = "UNKNOWN";
    });

    // Overwrite with actual database hits.
    rows.forEach((row) => {
      if (row.Callsign && row.FullName) {
        resultsMap[row.Callsign.toUpperCase()] = row.FullName.trim();
      }
    });

    console.log(
      "✅ SQLite batch lookup completed successfully."
    );

    return NextResponse.json(
      { results: resultsMap },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    console.error(
      "❌ Critical failure inside /api/getFullName:",
      message
    );

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}