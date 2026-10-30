// frontend/src/app/home-page/page.tsx

import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "CARC Home Page",
  description: `This is the official homepage for the Coastside Amateur \
Radio Club (CARC), featuring meeting information, nets, \
and membership details.`,
};

// Quick links shown as image + title (optional descriptions)
const homePageQuickLinks = [
  {
    imageSrc: "/images/misc/tow_003.gif",
    imageAlt: "Small tower icon",
    title: "Next Meeting -- 2nd Wed of the month",
    linkHref: "/carc-coming-events",
    description: `Meetings of the Coastside Amateur Radio Club are generally held at the Pacifica Fire Station #72, 1100 Linda Mar Boulevard, Pacifica on the second Wednesday at 7:30 PM.

However, special meetings may be held at other locations. For additional detail, please refer to the Meeting/Event Schedule.

In conjunction, we will attempt to include participants via Google Meet at the address included with the meeting notice. We follow COVID-19 recommendations set forth by the County of San Mateo.`,
  },
  {
    imageSrc: "/images/misc/tow_003.gif",
    imageAlt: "Small tower icon",
    title: "CARC VHF & HF Nets",
    linkHref: "/about-carc",
  },
  {
    imageSrc: "/images/misc/tow_003.gif",
    imageAlt: "Small tower icon",
    title: "Net Control Roster",
    linkHref: "/net-control-roster",
  },
];

export default function CARCHomePage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-10">
      {/* Main Title */}
      <h1 className="text-4xl font-extrabold text-blue-800 mb-8 text-center">
        Welcome to the Coastside Amateur Radio Club!
      </h1>

      {/* Quick Links */}
      <section className="space-y-6">
        {homePageQuickLinks.map((item, index) => (
          <div
            key={index}
            className="bg-white shadow-lg rounded-xl p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-4"
          >
            <div className="flex-shrink-0">
              <Image
                src={item.imageSrc}
                alt={item.imageAlt}
                width={50}
                height={50}
                unoptimized
                className="w-12 h-12 object-contain"
              />
            </div>

            <div className="flex-grow space-y-2">
              <Link href={item.linkHref} className="block">
                <span className="text-xl font-semibold text-blue-600 hover:underline cursor-pointer">
                  {item.title}
                </span>
              </Link>
              {item.description && (
                <p className="text-gray-700 leading-relaxed text-base italic whitespace-pre-line">
                  {item.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Membership Section */}
      <section className="bg-white shadow-lg rounded-xl p-6 md:p-8 space-y-4">
        <h2 className="text-3xl font-bold text-gray-900 border-b pb-2 mb-4 text-center">
          Join or Renew Your Membership
        </h2>

        <p className="text-gray-700 leading-relaxed text-lg">
          To join the club or renew your membership, you have two options:
        </p>

        <div className="space-y-4">
          {/* Option 1: Mail-in Application */}
          <p className="text-gray-700 leading-relaxed text-lg">
            Please download and complete a{" "}
            <a
              target="_blank"
              href="/documents/CARC_MembershipForm.pdf"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-medium"
            >
              CARC membership application form
            </a>{" "}
            and return with a Self-Addressed Stamped Envelope to:
          </p>

          <address className="text-gray-800 text-lg font-semibold ml-8 md:ml-12 leading-relaxed not-italic">
            Coastside Amateur Radio Club
            <br />
            P.O. Box 1106
            <br />
            Pacifica, CA 94044-6106
          </address>

          {/* Option 2: Online Payment */}
          <p className="text-gray-700 leading-relaxed text-lg">
            Alternatively, you can renew or join online via our PayPal Dues form:
            <br />
            <Link href="/paypal-dues" className="block mt-2">
              <span className="text-blue-600 hover:underline font-medium cursor-pointer">
                Pay Dues Online with PayPal
              </span>
            </Link>
          </p>

          {/* General Email Contact */}
          <p className="text-gray-700 leading-relaxed text-lg">
            For general inquiries, you may also email us at:
            <br />
            <a
              href="mailto:info@coastsidearc.org"
              className="text-blue-600 hover:underline font-medium"
            >
              info@coastsidearc.org
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
