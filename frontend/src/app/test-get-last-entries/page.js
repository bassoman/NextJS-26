// frontend/src/app/test-get-last-entries/page.js
"use client";

import { useEffect, useState } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

export default function TestGetLastEntries() {
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `${BACKEND_URL}/api/getPPtnxdata?status=posted`,
          { method: "GET" }
        );
        console.log("Response status:", response.status);
        const data = await response.json();
        setResults(data.entries || []);
      } catch (err) {
        console.error("Error fetching PPtnxdata:", err);
        setResults([]);
      } finally {
        setRunning(false);
      }
    };

    fetchData();
  }, []);

  function fmtAmt(amt) {
    return "$\u00A0" + (amt ? parseFloat(amt).toFixed(2) : "0.00");
  }

  if (!running && results.length === 0) {
    return (
      <main className="p-6 max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Recent Paypal Transactions</h1>
        <p className="text-gray-500">No recent transactions found.</p>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Recent Paypal Transactions</h1>

      <p className="text-gray-700">
        This page provides the most recent Paypal transactions recorded in the
        <code> pp_tnx </code> table. Future versions may support paging through
        older records.
      </p>

      {running && <p className="italic text-gray-500">Loading…</p>}

      {!running && results.length > 0 && (
        <div>
          <p className="font-bold">
            Details record for the last {results.length} rows of the <code>pp_tnx</code> table
          </p>
          <table className="w-full text-gray-900 table-auto border-collapse border border-gray-400 mt-6">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1">indx</th>
                <th className="border px-2 py-1">date</th>
                <th className="border px-2 py-1">callsign</th>
                <th className="border px-2 py-1">name</th>
                <th className="border px-2 py-1">years</th>
                <th className="border px-2 py-1">Primary</th>
                <th className="border px-2 py-1">Family</th>
                <th className="border px-2 py-1">Donation</th>
                <th className="border px-2 py-1">Subtotal</th>
                <th className="border px-2 py-1">PayPalFee</th>
                <th className="border px-2 py-1">Club</th>
                <th className="border px-2 py-1">Total</th>
              </tr>
            </thead>

            <tbody>
              {results.map((r, i) => {

                const rowColor = i % 2 === 0 ? "bg-yellow-100" : "bg-blue-100";

                return (
                  <tr key={i} className={`${rowColor} text-gray-900`}>
                    <td className="border px-2 py-1">{r.myindex}</td>
                    <td className="border px-2 py-1">{r.mydate}</td>
                    <td className="border px-2 py-1">{r.callsigns}</td>
                    <td className="border px-2 py-1">{r.FullName}</td>
                    <td className="border px-2 py-1">{r.years}</td>
                    <td className="border px-2 py-1 text-right">{r.primary_}</td>
                    <td className="border px-2 py-1 text-right">{r.family}</td>
                    <td className="border px-2 py-1 text-right">{r.donation}</td>
                    <td className="border px-2 py-1 text-right">{r.subtotal}</td>
                    <td className="border px-2 py-1 text-right">{r.paypalfee}</td>
                    <td className="border px-2 py-1 text-right">{r.clubreceives}</td>
                    <td className="border px-2 py-1 text-right">{r.total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Second table */}
      <div>
        <p className="font-bold text-gray-900">
          Tracking record for the last {results.length} rows of the{" "}
          <code>pp_tnx</code> table
        </p>

        <table className="w-full table-auto border-collapse border border-gray-400 mt-6 text-gray-900">
          <thead>
            <tr className="bg-gray-100 text-gray-900">
              <th className="border px-2 py-1 text-right">indx</th>
              <th className="border px-2 py-1">pp_id</th>
              <th className="border px-2 py-1">pp_orderID</th>
              <th className="border px-2 py-1">status</th>
              <th className="border px-2 py-1 text-right">pp_total</th>
              <th className="border px-2 py-1 text-right">paypal_fee</th>
              <th className="border px-2 py-1 text-right">club_receives</th>
            </tr>
          </thead>

          <tbody>
            {results.map((r, i) => (
              <tr
                key={i}
                className={`${i % 2 === 0 ? "bg-yellow-100" : "bg-blue-100"
                  } text-gray-900`}
              >
                <td className="border px-2 py-1 text-right">{r.myindex}</td>
                <td className="border px-2 py-1">{r.pp_id}</td>
                <td className="border px-2 py-1">{r.pp_orderID}</td>
                <td className="border px-2 py-1">
                  {r.transaction_status}
                </td>
                <td className="border px-2 py-1 text-right">
                  {fmtAmt(r.pp_total)}
                </td>
                <td className="border px-2 py-1 text-right">{r.paypalfee}</td>
                <td className="border px-2 py-1 text-right">
                  {r.clubreceives}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
