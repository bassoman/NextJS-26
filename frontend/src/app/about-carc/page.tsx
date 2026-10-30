// frontend/src/app/about-carc/page.js

import React from "react";
import Link from "next/link"; // Add this import at the top


export const metadata = {
  title: "CARC About CARC",
  description:
    "A brief description of the Coastside Amateur Radio Club, including its history, activities, and membership information.",
};

export default function CARCAboutCARC() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">
        Join the Coastside Amateur Radio Club(CARC)
      </h2>
      <p>
        The Coastside Amateur Radio Club (CARC) is a welcoming, ARRL-affiliated
        community of amateur radio enthusiasts. Since 1959, {"we've"} been serving
        Pacifica and the surrounding Bay Area providing vital emergency services
        to the City of Pacifica.
      </p>
      <p>
        We invite you to join our monthly meetings, which are held on the{" "}
        <b>second Wednesday of each month at 7:30 PM</b> at Pacifica Fire Station #72 
        Station (1100 Linda Mar Blvd, Pacifica). Visitors are always welcome, so please
        stop by! We reccomend checking the{" "}
        <Link href="/coming-events">
          <span className="cursor-pointer underline text-blue-600 hover:text-blue-800">
            Coming Events
          </span>
        </Link>{" "}
        page for any schedule changes.
      </p>

      <p>
        Membership dues are just $20.00 per year which helps support club
        activities (such as Field Day) and the publication of our newsletter,
        the Coastside Communicator.
      </p>

      <h2 className="text-2xl font-bold mb-4">Club Repeater Systems</h2>

      <p>
        CARC maintains a robust repeater and digipeater system located on the
        North Peak of Montara Mountain(1900 ft.elevation) at the border of
        Pacifica and Montara. The repeaters provide excellent coverage of the
        Coastside and beyond.
      </p>
      <hr></hr>
      <ul className="list-disc pl-4 list-inside text-gray-800 space-y-2">
        <li>
          2 meter repeater (voice)
          <ul className="pl-6">
            <li> Callsign: WA6TOW/R</li>
            <li> Frequency: 146.925 MHz</li>
            <li> Offset: -600 kHz</li>
            <li> PL Tone: 114.8 Hz</li>
          </ul>
        </li>

        {/*
                <li> 70 cm repeater (voice)
                    <ul>
                        <li> Callsign: WA6TOW/R</li>
                        <li> Frequency: 441.075 MHz</li>
                        <li> Offset: +5 MHz</li>
                        <li> PL Tone: 114.8 Hz</li>
                    </ul>
                </li>
                */}

        <li>
          {" "}
          APRS Digipeater
          <ul className="pl-6">
            <li> Callsign: WA6TOW-1</li>
            <li> Frequency: 144.390 MHz</li>
            <li> Digipeater Path: WIDE1-1,WIDE2-1</li>
            <li> Location: 37.5633 N, 122.5000 W</li>
            <li> Altitude: 1900 ft.</li>
          </ul>
        </li>
      </ul>

      <hr></hr>

      <table className="table-auto w-full text-left border-collapse border border-gray-300">
        <caption className="caption-top text-center text-[20px] font-bold mb-4">
          Coastside VHF Nets
        </caption>

        <thead>
          <tr>
            <th className="text-center border">Day</th>
            <th className="text-center border">Time</th>
            <th className="text-center border">Repeater/Frequency</th>
            <th className="text-center border">Group/Contact</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td className="text-center border">SUN</td>
            <td className="text-center border">7:00AM</td>
            <td className="text-center border">WA6TOW(146.925 PL114.8)</td>
            <td className="text-center border">
              Knights of the Megahertz Net<br></br>
              Kelly Tuttle: wb6aaj626@gmail.communicate
            </td>
          </tr>

          <tr>
            <td className="text-center border">MON</td>
            <td className="text-center border">7:00PM</td>
            <td className="text-center border">WA6TOW(146.925 PL114.8)</td>
            <td className="text-center border">Pacifica CERT Net</td>
          </tr>

          <tr>
            <td rowSpan ={2} className="text-center border">
              TUE
            </td>
            <td className="text-center border">7:30PM</td>
            <td className="text-center border">WA6TOW(146.925 PL114.8)</td>
            <td className="text-center border">
              Daly City Net<br></br>
              Tom Oliver, KJ6OGL:<br></br>
              toliver0557@gmail.com
            </td>
          </tr>

          <tr>
            <td className="text-center border">8:00PM</td>
            <td className="text-center border">
              WA6TOW(146.925 PL114.8)<br></br>
              KC6ULT(146.865 PL114.8)
            </td>
            <td className="text-center border">
              San Mateo County OES Net<br></br>
              Dan Bennett:dgbennett@smcgov.org
            </td>
          </tr>

          <tr>
            <td className="text-center border">WED</td>
            <td className="text-center border">8:00PM</td>
            <td className="text-center border">WA6TOW(146.925 PL114.8)</td>
            <td className="text-center border">
              CARC Wednesday Night Checkin<br></br>
              Tom Oliver, KJ6OGL:<br></br>
              toliver0557@gmail.com
            </td>
          </tr>
        </tbody>
      </table>

      <table className="table-auto w-full text-left border-collapse border border-gray-500">
        <caption className="caption-top text-center text-[20px] font-bold mb-4">
          Coastside HF Nets
        </caption>

        <thead>
          <tr>
            <th className="text-center border">Day</th>
            <th className="text-center border">Time</th>
            <th className="text-center border">Frequency</th>
            <th className="text-center border">Group</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td className="text-center border">MON</td>
            <td className="text-center border">8:30PM</td>
            <td className="text-center border">HF: 1908±kHz</td>
            <td className="text-center border">160 Meter Net</td>
          </tr>
          <tr>
            <td className="text-center border">WED</td>
            <td className="text-center border">8:30PM</td>
            <td className="text-center border">HF: 1908±kHz</td>
            <td className="text-center border">160 Meter Net</td>
          </tr>
          <tr>
            <td className="text-center border">FRI</td>
            <td className="text-center border">8:30PM</td>
            <td className="text-center border">HF: 1908±kHz</td>
            <td className="text-center border">160 Meter Net</td>
          </tr>
          <tr>
            <td className="text-center border">SAT</td>
            <td className="text-center border">9:00AM</td>
            <td className="text-center border">
              HF: 3.852MHz or up<br></br>
              Alt: 7227.5kHz
            </td>
            <td className="text-center border">
              QCWA-11 Saturday Morning Group<br></br>
              Bill Lillie:N6BCT@ARRL.NET
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
