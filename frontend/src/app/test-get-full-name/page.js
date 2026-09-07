// frontend/src/app/test-get-full-name/page.js
'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import { withBasePath } from '@/lib/basePath';

export default function TestGetFullNamePage() {
  const [resultsMatrix, setResultsMatrix] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasTested, setHasTested] = useState(false); // Tracks if the test was run

  const defaultName = "UNKNOWN"; // Fallback for callsigns not found in the database

  // The original test dictionary that provides multiple test cases and expected results.
  const memberDictionary = [
    { call: 'KN6PIV', expected: 'Jillian Aldersen' },
    { call: 'KM6HYK', expected: 'William J. Anderson' },
    { call: 'KM6UYM', expected: 'Fernel Andong' },
    { call: 'AI6BB', expected: 'Paul Atkins' },
    { call: 'KN6ORM', expected: 'Steve Austin' },
    { call: 'W2OKB', expected: 'Bharat Bailur' },
    { call: 'W6LOG', expected: 'Robert Barbitta' },
    { call: 'KI6HIG', expected: 'Gary Barnes' },
    { call: 'KJ6FHQ', expected: 'Anna Bernstine' },
    { call: 'N6ZEN', expected: 'Dan Bernstein' },
    { call: 'KK6FOI', expected: 'Emily Bernstein' },
    { call: 'AA6XL', expected: 'Michael G. Bevington' },
    { call: 'WB6JKV', expected: 'Michael S. Herbert' },
    { call: 'N6FG', expected: 'Frank Erbacher' },
    { call: 'N6SJF', network: 'Jonathan Lancelle', expected: 'Jonathan Lancelle' },
    { call: 'KJ6OGL', expected: 'Tom Oliver' },
    { call: 'W1AW', expected: defaultName },
    { call: 'WA6TOW', expected: defaultName },
  ];

  // Your optimized batch lookup test routine
  const runBatchLookupTest = async () => {
    setLoading(true);
    setError(null);
    setResultsMatrix({});
    setHasTested(false);

    const testCallsigns = memberDictionary.map(entry => entry.call);
    console.log("🚀 Test Callsigns Array for Batch Request:", testCallsigns);

    try {
      // Fire exactly ONE network request containing the whole list
      const response = await fetch(withBasePath("/api/getFullName"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callsigns: testCallsigns }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status code: ${response.status}`);
      }

      const data = await response.json();
      const nameMap = data.results;
      console.log("🚀 Batch Lookup Results Matrix:", nameMap);

      setResultsMatrix(nameMap || {});
      setHasTested(true);
    } catch (error) {
      console.error("❌ Frontend test execution crashed:", error);
      setError(error.message || 'An error occurred during lookup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white border border-slate-200 rounded-xl shadow-sm mt-8">
      <h2 className="text-xl font-bold text-slate-900 mb-2">
        ⚡ High-Speed Batch Name Lookup Test Portal
      </h2>
      <p className="text-slate-600 text-sm mb-6">
        This diagnostic page tests the optimized SQLite <code>IN()</code> routing matrix by querying <strong>KN6PIV, KM6HYK, KM6UYM and others</strong> all inside exactly one network payload.
      </p>

      <button
        onClick={runBatchLookupTest}
        disabled={loading}
        className="w-full bg-blue-700 hover:bg-blue-800 text-white font-medium py-2.5 px-4 rounded-md transition-colors disabled:bg-slate-400 shadow-sm text-sm"
      >
        {loading ? 'Executing Network Query...' : 'Run Single-Batch Database Test'}
      </button>

      {/* Error Feedback */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded">
          {error}
        </div>
      )}

      {/* 4-Column Matrix Table Output */}
      {hasTested && (
        <div className="mt-6 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Verification Matrix Result:</h3>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="p-3 border-r border-slate-200">Callsign</th>
                  <th className="p-3 border-r border-slate-200">Expected</th>
                  <th className="p-3 border-r border-slate-200">Actual</th>
                  <th className="p-3">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {memberDictionary.map((entry) => {
                  // Resolve actual value out of the API response, fallback to UNKNOWN if omitted
                  const actualValue = resultsMatrix[entry.call] || defaultName;

                  // Verification: Check if expected and actual values match exactly
                  const isPass = entry.expected.trim().toLowerCase() === actualValue.trim().toLowerCase();

                  return (
                    <tr key={entry.call} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 border-r border-slate-200 font-mono font-bold text-slate-900">
                        {entry.call}
                      </td>
                      <td className="p-3 border-r border-slate-200 text-slate-600">
                        {entry.expected}
                      </td>
                      <td className="p-3 border-r border-slate-200 text-slate-800 font-medium">
                        {actualValue}
                      </td>
                      <td className="p-3 font-bold text-center">
                        {isPass ? (
                          /* ✅ PASS: Green background, Black Letters */
                          <div className="w-full py-1 text-center rounded bg-green-500 text-black text-xs font-extrabold tracking-wider">
                            PASS
                          </div>
                        ) : (
                          /* ❌ FAIL: Red background, Yellow Letters */
                          <div className="w-full py-1 text-center rounded bg-red-600 text-yellow-300 text-xs font-extrabold tracking-wider">
                            FAIL
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Raw JSON Debugging Panel */}
      {Object.keys(resultsMatrix).length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Returned JSON Lookup Matrix:</h3>
          <div className="bg-slate-900 text-emerald-400 p-4 rounded-md font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner">
            <pre>{JSON.stringify(resultsMatrix, null, 2)}</pre>
          </div>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-slate-200 text-center">
        <Link href="/home-page" className="text-sm text-blue-600 hover:underline">
          ← Return to Home Page
        </Link>
      </div>
    </div>
  );
}
