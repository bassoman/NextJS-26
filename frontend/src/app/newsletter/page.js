// frontend/src/app/newsletter/page.js

import Link from 'next/link';
import newslettersData from '../../data/newsletters';
export const metadata = {
  title: 'CARC Newsletters',
  description: 'Access the latest and archived newsletters from the Coastside Amateur Radio Club (CARC).',
};

export default function CARCNewslettersIndex() {
  const currentYear = new Date().getFullYear();
  const availableYears = Object.keys(newslettersData).sort((a, b) => b - a);

  // Get newsletters for the current year, filter out invalid entries,
  // and only show newsletters up to the current month.
  const currentMonth = new Date().getMonth();
  const currentYearNewsletters = (newslettersData[currentYear] || [])
    .filter(nl => {
      // Ensure 'file' and 'displayDate' exist
      if (!nl.file || !nl.displayDate) {
        return false; // Exclude invalid entries
      }

      // Only show newsletters up to the current month.
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const nlMonthIndex = monthNames.findIndex(m => nl.displayDate.startsWith(m));

      return nlMonthIndex !== -1 && nlMonthIndex <= currentMonth;
    });

  // Determine which years to show as "previous years" links
  const previousYears = availableYears.filter(year => parseInt(year) < currentYear);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      <h1 className="text-4xl font-extrabold text-blue-800 mb-6 text-center">
        CARC Newsletters
      </h1>

      {/* Current Year Newsletters Section */}
      <section className="bg-white shadow-lg rounded-xl p-6 md:p-8 space-y-4">
        <h2 className="text-3xl font-bold text-gray-900 border-b pb-3 mb-4">
          Newsletters for {currentYear}
        </h2>
        {currentYearNewsletters.length > 0 ? (
          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {currentYearNewsletters.map((nl, index) => (
              <li key={index} className="bg-gray-50 p-4 rounded-md shadow-sm hover:bg-gray-100 transition duration-150">
                <a
                  href={`/newsletters/${currentYear}/${nl.file}`} // Path to PDF in public folder
                  target="_blank" // Opens in new tab
                  rel="noopener noreferrer" // Security best practice for target="_blank"
                  className="text-blue-600 hover:underline font-medium text-lg block"
                >
                  {nl.displayDate} Newsletter
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600 italic">No newsletters available for {currentYear} yet, or none for the current month or earlier.</p>
        )}
      </section>

      {/* Previous Years Section */}
      <section className="bg-white shadow-lg rounded-xl p-6 md:p-8 space-y-4">
        <h2 className="text-3xl font-bold text-gray-900 border-b pb-3 mb-4">
          Archived Newsletters by Year
        </h2>
        {previousYears.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {previousYears.map(year => (
              <Link
                key={year}
                href={`/newsletter/${year}`}
                className="block text-center bg-green-600 text-white py-3 px-2 rounded-md hover:bg-green-700 transition duration-150 shadow-md"
              >
                {year}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 italic">No previous year archives available.</p>
        )}
      </section>
    </div>
  );
}