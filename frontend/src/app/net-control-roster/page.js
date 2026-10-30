// frontend/src/app/net-control-roster/page.js
'use client';

import React, { useMemo } from 'react';

// --- Data for Net Control Assignments ---
const netControlRosterData = {
  2026: [
    {
      month1: 'JAN',
      days1: [' 7', ' 14', '21', '28'],
      controls1: ['Steve, KN6ORM', '-- Meeting --',
        'Tom, KJ6OGL', 'Ralph, KC6YDH'],
      month2: 'JUL',
      days2: [' 1', ' 8', '15', '22', '29'],
      controls2: ['Steve, KN6ORM', '-- Meeting --', 'Tom, KJ6OGL',
        'Ralph, KC6YDH', 'Tom, KJ6OGL'],
    },
    {
      month1: 'FEB',
      days1: ['4', ' 11', '18', '25'],
      controls1: ['Steve, KN6ORM', '-- Meeting --',
        'Tom, KJ6OGL', 'Ralph, KC6YDH'],
      month2: 'AUG',
      days2: [' 5', '12', '19', '26'],
      controls2: ['Steve, KN6ORM', '-- Meeting --',
        'Tom, KJ6OGL', 'Ralph, KC6YDH'],
    },
    {
      month1: 'MAR',
      days1: [' 4', '11', '18', '25'],
      controls1: ['Steve, KN6ORM', '-- Meeting --',
        'Tom, KJ6OGL', 'Ralph, KC6YDH'],
      month2: 'SEP',
      days2: [' 3', '10', '17', '24'],
      controls2: ['Steve, KN6ORM', '-- Meeting --',
        'Tom, KJ6OGL', 'Ralph, KC6YDH'],
    },
    {
      month1: 'APR',
      days1: [' 1', ' 8', '15', '22', '29'],
      controls1: ['Steve, KN6ORM', '-- Meeting --', 'Tom, KJ6OGL',
        'Ralph, KC6YDH', 'Tom, KJ6OGL'],
      month2: 'OCT',
      days2: [' 7', '14', '21', '28'],
      controls2: ['Steve, KN6ORM', '-- Meeting --',
        'Tom, KJ6OGL', 'Ralph, KC6YDH'],
    },
    {
      month1: 'MAY',
      days1: [' 7', '14', '21', '28'],
      controls1: ['Steve, KN6ORM', '-- Meeting --',
        'Tom, KJ6OGL', 'Ralph, KC6YDH'],
      month2: 'NOV',
      days2: [' 4', '11', '18', '25'],
      controls2: ['Steve, KN6ORM', '-- Meeting --',
        'Tom, KJ6OGL', 'Ralph, KC6YDH'],
    },
    {
      month1: 'JUN',
      days1: [' 3', ' 10', '17', '24'],
      controls1: ['Steve, KN6ORM', '-- Meeting --',
        'Tom, KJ6OGL', 'Ralph, KC6YDH'],
      month2: 'DEC',
      days2: [' 2', ' 9', '16', '23', '30'],
      controls2: ['Steve, KN6ORM', '-- Meeting --', 'Tom, KJ6OGL',
        'Ralph, KC6YDH', 'Tom, KJ6OGL'],
    },
  ],
};

// --- Helper ---
const getNetControlRosterForYear = (year) => netControlRosterData[year] || [];

export default function CARCNetControlRoster() {
  const currentYear = new Date().getFullYear();
  const roster = useMemo(() => getNetControlRosterForYear(currentYear), [currentYear]);

  if (!roster.length) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl text-center text-gray-600">
        <h1 className="text-4xl font-extrabold text-blue-800 mb-6">
          CARC Net Control Roster {currentYear}
        </h1>
        <p>No roster data available for {currentYear} at this time.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      <div className="text-center mb-6">
        <h1 className="text-4xl font-extrabold text-blue-800 mb-4">
          CARC Net Control Roster {currentYear}
        </h1>
      </div>

      {/* Roster Table */}
      <div className="overflow-x-auto bg-white shadow-lg rounded-xl">
        <table className="min-w-full text-left border-collapse">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="py-3 px-2 text-center font-semibold text-base sm:text-lg border-b border-gray-200 w-2/19">Month</th>
              <th className="py-3 px-2 text-center font-semibold text-base sm:text-lg border-b border-gray-200 w-2/19">Day</th>
              <th className="py-3 px-4 text-left font-semibold text-base sm:text-lg border-b border-gray-200 w-5/19">Net Control</th>
              <th className="w-1/19 border-b border-gray-200"></th>
              <th className="py-3 px-2 text-center font-semibold text-base sm:text-lg border-b border-gray-200 w-2/19">Month</th>
              <th className="py-3 px-2 text-center font-semibold text-base sm:text-lg border-b border-gray-200 w-2/19">Day</th>
              <th className="py-3 px-4 text-left font-semibold text-base sm:text-lg border-b border-gray-200 w-5/19">Net Control</th>
            </tr>
          </thead>

          <tbody>
            {roster.map((monthPair, pairIndex) => {
              const maxRows = Math.max(monthPair.days1.length, monthPair.days2.length);
              return Array.from({ length: maxRows }).map((_, i) => (
                <tr
                  key={`${monthPair.month1}-${pairIndex}-${i}`}
                  className="border-b border-gray-200 hover:bg-gray-50 transition duration-150 ease-in-out"
                >
                  {/* Left Column Group (Month 1) */}
                  {i === 0 && (
                    <td rowSpan={maxRows} className="py-2 px-2 text-center align-middle text-gray-800 font-bold text-lg border-r border-gray-300 bg-gray-50">
                      {monthPair.month1}
                    </td>
                  )}
                  <td className="py-2 px-2 text-center text-gray-800 whitespace-nowrap">
                    {monthPair.days1[i] !== undefined ? monthPair.days1[i] : '--'}
                  </td>
                  <td className="py-2 px-4 text-left text-gray-700">
                    {monthPair.controls1[i] || ''}
                  </td>

                  {/* Middle Border Column */}
                  <td className="w-1 border-r border-l border-gray-300"></td>

                  {/* Right Column Group (Month 2) */}
                  {i === 0 && (
                    <td rowSpan={maxRows} className="py-2 px-2 text-center align-middle text-gray-800 font-bold text-lg border-r border-gray-300 bg-gray-50">
                      {monthPair.month2}
                    </td>
                  )}
                  <td className="py-2 px-2 text-center text-gray-800 whitespace-nowrap">
                    {monthPair.days2[i] !== undefined ? monthPair.days2[i] : '--'}
                  </td>
                  <td className="py-2 px-4 text-left text-gray-700">
                    {monthPair.controls2[i] || ''}
                  </td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>

      {/* Notes */}
      <div className="bg-white shadow-lg rounded-xl p-6 md:p-8 mt-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Notes:</h2>
        <p className="text-gray-700 leading-relaxed text-sm italic">
          The CARC Wednesday Night Net is held weekly at 8:00 PM on the WA6TOW
          146.925 MHz repeater (PL 114.8 Hz).
          This roster is for informational purposes and subject to change.
          Please check the{' '}
          <a href="/CARC_Coming_Events" className="text-blue-600 hover:underline">
            Coming Events
          </a>{' '}
          page for specific meeting dates or changes.
        </p>
      </div>
    </div>
  );
}

