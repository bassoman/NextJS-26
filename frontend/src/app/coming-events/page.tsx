// frontend/src/app/coming-events/page.js

// import React from "react"; (Not needed if not using React features directly)

// Link is not explicitly used in this rewritten version,
// but keep it if you plan to add internal links later.
// import Link from "next/link";

export const metadata = {
  title: "CARC Coming Events",
  description:
    "The calendar of events of the Coastside Amateur Radio Club (CARC) for the current year.",
};

const Events = [
  { Date: "Jan 14th", Event: "CARC Meeting ~ 2026 Event Planning" },
  { Date: "Jan 24th-25th", Event: "ARRL Winter Field Day" },
  { 
      Date: "Feb 11th", 
      Event: "CARC Meeting ~ 2026 Agenda Final APRS Presentation" 
  },
  { Date: "Mar 8th", Event: "Daylight Savings Time Begins" },
  { 
      Date: "Mar 11th", 
      Event: `Google Meet Meeting (W7SX speaker on \
        Antenna Physics) ~ Invite will be E-mailed` 
  },
  { 
      Date: "Apr 8th", 
      Event: "Pizza Meeting, Round Table Linda Mar" 
  },
  { 
      Date: "Apr 26th", 
      Event: `HMBARC Dream Machines, HMB Airport` 
  },
  {
    Date: "May 13th",
    Event: "CARC Meeting ~ Field Day Planning",
  },
  {
    Date: "Jun 10th",
    Event: "CARC Meeting ~ Final Field Day Planning",
  },
  { Date: "Jun 14th",       Event: "Flag Day" },
  { 
    Date: "Jun 27th-28th",  
    Event: "ARRL Field Day ~ Location TBD" 
  },
  { Date: "Jul 8th",        Event: "CARC Meeting" },
  { Date: "Aug 12th",       Event: "CARC Meeting" },
  { Date: "Sep 9th",        Event: "CARC Meeting ~ Fog Fest Planning" },
  {
    Date: "Sep 26th-27th",
    Event: "Pacific Coast Fog Fest ~ Palmetto Ave., Pacifica ~ 10am - 6pm",
  },
  { Date: "Oct 14th",       Event: "CARC Meeting, 2027 Nomination of Officers" },
  { Date: "Nov 1st",        Event: "Daylight Savings Time Ends" },
  {
    Date: "Nov 14th",
    Event:
      "CARC Dinner Meeting ~ Election of 2026 Officers ~ Date, Time & Location TBD",
  },
  { 
    Date: "Dec 9th", 
    Event: "CARC Meeting ~ Holiday Potluck" 
  },
];

export default function CARCComingEvents() {
  // Get the current year to display dynamically in the heading
  const currentYear = new Date().getFullYear();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      {/* Page Title */}
      <h1 className="text-4xl font-extrabold text-blue-800 mb-6 text-center">
        CARC Coming Events {currentYear}
      </h1>

      {/* Introductory Paragraph */}
      <div className="bg-white shadow-lg rounded-xl p-6 md:p-8">
        <p className="text-gray-700 leading-relaxed text-lg mb-4">
          Join the QCWA/Pioneer Radio Club luncheon every third Wednesday of
          each month at {"Harry's Hoffbrau"}, 1909 El Camino Real, Redwood City CA
          94063. Social hour begins at <b>11:00 AM</b>, followed by lunch at
          <b>11:30 AM</b>.
        </p>
      </div>


        {/* Dynamic Events Table */}
        <div className="overflow-x-auto"> {/* Ensures table is scrollable on small screens */}
          <table className="min-w-full text-left border-collapse bg-white shadow-md rounded-lg">
            <thead>
               <tr className="bg-blue-600 text-white">
                <th className="py-3 px-4 text-center font-semibold text-lg border-b border-gray-200">Date</th>
                <th className="py-3 px-4 text-left font-semibold text-lg border-b border-gray-200">Event</th>
              </tr>
            </thead>


            <tbody className="text-gray-700">
                 {Events.map((event, index) => (
                <tr key={index} className="border-b border-gray-400 hover:bg-gray-50 transition duration-150 ease-in-out">
                  <td className="py-2 px-4 text-center text-gray-800 font-medium whitespace-nowrap">{event.Date}</td>
                  <td className="py-2 px-4 text-left text-gray-700">{event.Event}</td>
                </tr>
                 ))}
            </tbody>
          </table>
        </div>

      {/* Important Note about Meetings */}
      <div className="bg-white shadow-lg rounded-xl p-6 md:p-8 mt-6">
        <p className="text-gray-700 leading-relaxed text-sm italic">
          <strong>*Note:</strong>
          All club meetings are currently held at <b>7:30 PM</b> at the Pacifica
          Fire Station #72, 1100 Linda Mar Boulevard, Pacifica,
          unless otherwise posted. Where possible, all meetings will also have a
          Google Meet link available for those who cannot attend in person.
          Please check the website regularly for updates.
        </p>
      </div>
    </div>
  );
}
