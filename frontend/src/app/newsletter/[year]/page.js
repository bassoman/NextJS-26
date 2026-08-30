// frontend/src/app/CARC_Newsletter/[year]/page.js

// import React from 'react';   // Import React if you are using React features directly
import Link from 'next/link';
import newslettersData from '../../../data/newsletters'; // Adjust path if needed
import { notFound } from 'next/navigation'; // For handling invalid years

// This function tells Next.js which dynamic paths to pre-render at build time.
// For App Router, it's `generateStaticParams`.
export async function generateStaticParams() {
  return Object.keys(newslettersData).map(year => ({
    year: year,
  }));
}

export default async function YearNewslettersPage({ params }) {
  const resolvedParams = await params;
  const { year } = resolvedParams; // Extract the year from the URL parameters

  // Get newsletters for the specific year
  const newslettersForYear = newslettersData[year];

  // If the year is not found in our data, show a 404 page
  if (!newslettersForYear) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      <h1 className="text-4xl font-extrabold text-blue-800 mb-6 text-center">
        CARC Newsletters: {year}
      </h1>

      <section className="bg-white shadow-lg rounded-xl p-6 md:p-8 space-y-4">
        <h2 className="text-3xl font-bold text-gray-900 border-b pb-3 mb-4">
          All Newsletters for {year}
        </h2>
        {newslettersForYear.length > 0 ? (
          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {newslettersForYear.map((nl, index) => (
              <li key={index} className="bg-gray-50 p-4 rounded-md shadow-sm hover:bg-gray-100 transition duration-150">
                <a
                  href={`/newsletters/${year}/${nl.file}`} // Path to PDF in public folder
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium text-lg block"
                >
                  {nl.displayDate} Newsletter
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600 italic">No newsletters available for {year}.</p>
        )}
        <div className="mt-8 text-center">
          <Link
            href="/newsletter"
            className="inline-block bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition duration-150 font-medium"
          >
            &larr; Back to All Newsletters
          </Link>
        </div>
      </section>
    </div>
  );
}
// Note: Ensure that the newslettersData structure matches the expected format
// and that the file paths in the data are correct for your project structure.