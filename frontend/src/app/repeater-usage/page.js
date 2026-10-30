// frontend/src/app/repeater-usage/page.js

'use client'; // This component needs client-side interactivity to fetch data

import React, { useState, useEffect } from 'react';

{/* This metadata cannot simultaneously exist along with the 'use client' directive above.
export const metadata = {
  title: "CARC Repeater Usage Reports",
  description:
    "Access detailed reports of traffic on the CARC repeater, maintained for service quality and FCC compliance. " +
    "This page provides links to monthly repeater activity reports.",
};
*/}

const REPEATER_REPORT_CHECK_API_URL = '/api/repeater-report-exists';

export default function CARCRepeaterUsage() {
  const [availableReports, setAvailableReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-indexed (January is 0)

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    async function checkAndFetchReports() {
      setLoading(true);
      setError(null);
      const reportsToVerify = [];
      const fetchedReports = [];

      // Generate all possible report URLs for the current year up to the current month
      for (let i = 0; i <= currentMonth; i++) {
        const monthNumber = i + 1; // 1-indexed month for URL
        reportsToVerify.push({ month: monthNumber, year: currentYear, monthName: monthNames[i] });
      }

      // Use Promise.allSettled to send all checks concurrently
      // and wait for all to complete, regardless of success/failure
      const checks = reportsToVerify.map(async (report) => {
        try {
          const response = await fetch(`${REPEATER_REPORT_CHECK_API_URL}?year=${report.year}&month=${report.month}`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          return { ...report, exists: data.exists, url: data.url };
        } catch (err) {
          console.error(`Failed to verify report for ${report.monthName} ${report.year}:`, err);
          return { ...report, exists: false, url: `https://audio.stickerburr.net/files/${report.month}_${report.year}/index.html` }; // Provide fallback URL
        }
      });

      const results = await Promise.allSettled(checks);

      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.exists) {
          fetchedReports.push({
            url: result.value.url,
            name: `WA6TOW Repeater activity report for ${result.value.monthName}, ${result.value.year}`
          });
        }
      });

      setAvailableReports(fetchedReports);
      setLoading(false);
    }

    checkAndFetchReports();
  }, []); // Empty dependency array means this runs once on mount

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      <h1 className="text-4xl font-extrabold text-blue-800 mb-6 text-center">
        CARC Repeater Usage Reports
      </h1>

      <div className="bg-white shadow-lg rounded-xl p-6 md:p-8 space-y-4 text-gray-700 leading-relaxed text-lg">
       
        <p>
          The Coastside Amateur Radio Club's repeater traffic is continuously monitored and recorded by 
          an external application.These reports are vital for maintaining service quality and assists with
          compliance with FCC requirements.
        </p>

        <p>
            The initial report shown the graphically the number of minutes the repeater was active as a 
            function of the time of day, for each day of the month. If the user clicks anywhere on a 
            particular day of interest, the application will display a log of each transmission 
            including the start time and the duration of the transmission in seconds. If the user then
            clicks on a particular transmission, then the audio of thattransmission will be downloaded
            to the user's computer in a zip file labeled with the record number and the date of the 
            transmission. One or more audio (*.wav) files may be easily extracted from the zip file for
            audio playback on the user's computer.
        </p>

        <p>
            Each audio file has a length of 30 minutes (1800 seconds). An analysis program may be required
            for the user to efficiently move to those sections of the audio file that actually containe
            audio activity.
        </p>

        <p>
            Below you will find links to the monthly repeater activity reports for the current year, once 
            they become available.
        </p>

        <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2 mb-4">
          {currentYear} Monthly Reports
        </h2>

        {loading ? (
          <p className="text-gray-600 italic text-center">Loading available reports...</p>
        ) : error ? (
          <p className="text-red-600 italic text-center">Error loading reports. Please try again later.</p>
        ) : availableReports.length > 0 ? (
          <ul className="list-disc pl-5 space-y-2">
            {availableReports.map((report, index) => (
              <li key={index}>
                <a
                  href={report.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium text-lg"
                >
                  {report.name}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600 italic">No reports available for {currentYear} yet.</p>
        )}
      </div>

      {/* Copyright Information */}
      <div className="bg-white shadow-lg rounded-xl p-6 md:p-8 text-center text-gray-600 text-sm italic">
        <p>
          WA6TOW REPEATER - Copyright 2017-{currentYear}
        </p>
        <p className="mt-2">
          This page, and data, are provided as-is with no warranties either expressed or implied.
          This data is for informational and non-commercial use only. Copyright 2010-2019.
        </p>
        <p className="mt-2 font-semibold">
          Coastside Amateur Radio Club
        </p>
      </div>
    </div>
  );
}
