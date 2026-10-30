// frontend/src/components/Header.js
"use client";

import Image from "next/image";
import Link from "next/link";

const Header = () => {
    return (
        /*
         * The entire header is 120px tall.
         * The blue bar is 80px tall and vertically centered,
         * leaving 20px of transparent space above and below.
         */
        <header className="relative h-[120px] w-full">

            {/* Blue background bar */}
            <div
                className="
                    absolute
                    left-0
                    top-[20px]
                    h-[80px]
                    w-full
                    bg-blue-600
                "
            />

            {/* Logo area: 140px wide by 120px high */}
            <Link
                href="/home-page"
                aria-label="Return to the Coastside ARC home page"
                className="
                    absolute
                    left-0
                    top-0
                    z-20
                    flex
                    h-[120px]
                    w-[140px]
                    items-center
                    justify-end
                "
            >
                <Image
                    src="/images/misc/wa6tow-logo.gif"
                    alt="Coastside Amateur Radio Club logo"
                    width={120}
                    height={120}
                    priority
                    className="
                        h-[120px]
                        w-[120px]
                        object-contain
                        transition-transform
                        duration-200
                        hover:scale-105
                    "
                />
            </Link>

            {/*
             * Text area begins 140px from the left and occupies
             * all remaining screen width.
             */}
            <div
                className="
                    absolute
                    left-[140px]
                    right-0
                    top-[20px]
                    z-10
                    flex
                    h-[80px]
                    items-center
                    justify-center
                    px-3
                    text-center
                    text-white
                "
            >
                <h1 className="font-bold leading-tight">

                    {/* Full title on medium and larger screens */}
                    <span className="hidden text-3xl sm:inline">
                        Coastside Amateur Radio Club
                    </span>

                    {/* Short title on phones */}
                    <span className="text-2xl sm:hidden">
                        Coastside ARC
                    </span>

                </h1>
            </div>
        </header>
    );
};

export default Header;

