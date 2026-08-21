// frontend/src/app/paypal-dues/page.js
// 
// This component handles the frontend dues renewal form for the Coastside Amateur Radio Club.YEARLY_DUES
// Upon submittal, control is transferred to the backend server code which will interact with PayPal.
// When the PayPAl interaction has either successfully completed a transaction, it will return a success
// indication and a success message will be displayed to the user. Otherwise, an error message will be 
// displayed to the user indicating that the transaction failed. The transaction is also recorded in
// a SQLite database that initially records the transaction and sets the status of the proposed transaction
// to "pending". When the PayPal transaction is completed, the status is updated to "completed" or "failed"
// as appropriate. The PayPal server code is in its own directory right now because it was a more or less
// independent project that now needs to be integrated into the NextJS project. It is expected that this 
// will be done in a way that maintains the separation of concerns and allows for easy updates in the future.
//
// Associated files with their current names are:
//    www.coastsideARC.org/PayPalSuccess.php
//    www.coastsideARC.org/PayPalCancel.php
//    www.coastsideARC.org/@ToBeDeleted/AppFormDBreceptor.php
//    www.coastsideARC.org/@ToBeDeleted/serv_getFullName.php
//    www.coastsideARC.org/@ToBeDeleted/serv_insertPPTnx.php


// 'CARC PayPal Dues' Page Component
// This component handles the dues renewal form for the Coastside Amateur Radio Club
'use client';



import React, { useCallback, useEffect, useState } from 'react';

// Constants for calculations
const PAYPAL_FIXED_FEE = 0.49;
const PAYPAL_PERCENTAGE = 0.0349;
const YEARLY_DUES = 20.00;
const ADDITIONAL_MEMBER_FEE = 3.00;
const DEFAULT_FULLNAME = "U N D E F I N E D";

// API Endpoints - Replace with your actual Next.js API routes
const FULL_NAME_API_URL = 'http://localhost:3000/api/getFullName'; // Example: /api/getFullName.js
const RECEPTOR_API_URL = 'http://localhost:3000/api/submitDues'; // Example: /api/submitDues.js

function CarcPayPalDues() {
  const [selectedYears, setSelectedYears] = useState(() => {
    const currentYear = new Date().getFullYear();
    // Initialize with the current year checked by default, or an empty set
    return new Set([currentYear]);
  });
  const [isNewMember, setIsNewMember] = useState(false);
  const [callsigns, setCallsigns] = useState('');
  const [donation, setDonation] = useState(0.00);
  const [includePaypalFee, setIncludePaypalFee] = useState(false);

  // Calculated values
  const [numCheckedYears, setNumCheckedYears] = useState(0);
  const [proRataFactor, setProRataFactor] = useState(0);
  const [primaryDues, setPrimaryDues] = useState(0);
  const [familyDues, setFamilyDues] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [paypalFee, setPaypalFee] = useState(0);
  const [optionalPaypalFee, setOptionalPaypalFee] = useState(0);
  const [clubReceives, setClubReceives] = useState(0);
  const [totalCharges, setTotalCharges] = useState(0);
  const [currentDateTime, setCurrentDateTime] = useState('');

  // Derived state for backend submission
  const [formData, setFormData] = useState({});

  // Helper to format currency
  const formatDollars = (amount) => {
    return `$${Number(amount).toFixed(2)}`;
  };

  // Helper to round off numbers
  const roundoff = (mynum, places) => {
    const x = Math.pow(10, places);
    return Math.round(mynum * x) / x;
  };

  // Function to get current date and time in YYYY-MM-DD HH:MM:SS format
  const getDate = useCallback(() => {
    const now = new Date();
    const num2 = (x) => ("0" + Number(x)).slice(-2);
    return `${now.getFullYear()}-${num2(now.getMonth() + 1)}-${num2(now.getDate())} ${num2(now.getHours())}:${num2(now.getMinutes())}:${num2(now.getSeconds())}`;
  }, []);

  // Function to get pro-rata factor
  const getProRata = useCallback(() => {
    const d = new Date();
    const month = d.getMonth(); // 0-indexed
    return (12 - month);
  }, []);

  // Effect to update pro-rata factor and current date/time on component mount
  useEffect(() => {
    setProRataFactor(getProRata());
    setCurrentDateTime(getDate());
  }, [getProRata, getDate]);

  // Handle year checkbox changes
  const handleYearChange = (year) => {
    setSelectedYears(prevSelectedYears => {
      const newSet = new Set(prevSelectedYears);
      if (newSet.has(year)) {
        newSet.delete(year);
      } else {
        newSet.add(year);
      }
      return newSet;
    });
  };

  // Handle new member checkbox change
  const handleNewMemberChange = (e) => {
    setIsNewMember(e.target.checked);
  };

  // Handle callsigns input change
  const handleCallsignsChange = (e) => {
    // 1. Convert to uppercase first
    const upper = e.target.value.toUpperCase();

    // 2. Replace commas and multiple consecutive spaces with a single space.
    // Note: We removed .trim() so trailing spaces survive while typing!
    const cleanValue = upper.replace(/[,\s]+/g, " ");

    setCallsigns(cleanValue);
  };

  // Handle donation input changes
  const handleDonationChange = (e) => {
    setDonation(parseFloat(e.target.value) || 0);
  };

  // Handle PayPal fee checkbox change
  const handlePaypalFeeChange = (e) => {
    setIncludePaypalFee(e.target.checked);
  };

  // Main calculation logic, runs whenever relevant state changes
  useEffect(() => {
    const calculatedNumYears = selectedYears.size;
    setNumCheckedYears(calculatedNumYears);

    let currentYearDues = 0;
    let fullYearsCount = calculatedNumYears;

    // Apply pro-rata for new members checking the current year
    const currentYear = new Date().getFullYear();
    if (selectedYears.has(currentYear) && isNewMember) {
      fullYearsCount = calculatedNumYears - 1;
      currentYearDues = (proRataFactor / 12.0) * YEARLY_DUES;
    }

    const calculatedPrimary = (fullYearsCount * YEARLY_DUES) + currentYearDues;
    setPrimaryDues(calculatedPrimary);

    const arrCallsigns = callsigns.split(' ').filter(c => c !== '');
    const Ncallsigns = arrCallsigns.length;
    let calculatedFamily = 0;
    if (Ncallsigns > 1) {
      calculatedFamily = (Ncallsigns - 1) * ADDITIONAL_MEMBER_FEE * calculatedNumYears;
    }
    setFamilyDues(calculatedFamily);

    const calculatedSubtotal = calculatedPrimary + calculatedFamily + donation;
    setSubtotal(calculatedSubtotal);

    let calculatedPaypalFee = 0;
    let calculatedOptionalPaypalFee = 0;
    let calculatedTotal = 0;
    let calculatedClubReceives = 0;

    if (includePaypalFee) {
      calculatedClubReceives = roundoff(calculatedSubtotal, 2);
      calculatedTotal = roundoff((calculatedClubReceives + PAYPAL_FIXED_FEE) / (1.0 - PAYPAL_PERCENTAGE), 2);
      calculatedOptionalPaypalFee = roundoff(calculatedTotal - calculatedClubReceives, 2);
      calculatedPaypalFee = calculatedOptionalPaypalFee;
    } else {
      calculatedPaypalFee = roundoff(calculatedSubtotal * PAYPAL_PERCENTAGE + PAYPAL_FIXED_FEE, 2);
      calculatedClubReceives = roundoff(calculatedSubtotal - calculatedPaypalFee, 2);
      calculatedTotal = roundoff(calculatedPaypalFee + calculatedClubReceives, 2);
      calculatedOptionalPaypalFee = roundoff(0.00, 2);
    }

    setPaypalFee(calculatedPaypalFee);
    setOptionalPaypalFee(calculatedOptionalPaypalFee);
    setClubReceives(calculatedClubReceives);
    setTotalCharges(calculatedTotal);

    // Prepare data for submission
    setFormData({
      years: Array.from(selectedYears).sort().join(' '),
      newmember: isNewMember ? 'yes' : 'no',
      callsigns: callsigns,
      ncallsigns: Ncallsigns,
      callsign: arrCallsigns[0] || '', // Primary callsign
      primary: calculatedPrimary,
      family: calculatedFamily,
      donation: donation,
      subtotal: calculatedSubtotal,
      pay_paypal: includePaypalFee ? 'yes' : 'no',
      paypalfee: calculatedPaypalFee,
      clubreceives: calculatedClubReceives,
      total: calculatedTotal,
      pp_total: calculatedTotal,
      date: currentDateTime,
      transaction_status: 'pending',
    });

  }, [selectedYears, isNewMember, callsigns, donation,
    includePaypalFee, proRataFactor, currentDateTime]);


  // Asynchronous API calls
  const getFullNameFromMergeTable = async (callsign) => {
    try {
      const response = await fetch(FULL_NAME_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ callsign })
      });
      if (!response.ok) {
        throw new Error(`Error fetching FullName: ${response.statusText}`);
      }
      const data = await response.json();
      return data.result?.FullName || DEFAULT_FULLNAME;
    } catch (error) {
      console.error("Error in getFullNameFromMergeTable:", error);
      return DEFAULT_FULLNAME;
    }
  };

  const insertDataIntoPPTnxTable = async (dataToInsert) => {
    try {
      const response = await fetch(RECEPTOR_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToInsert),
      });
      if (!response.ok) {
        throw new Error(`Error inserting data: ${response.statusText}`);
      }
      const data = await response.json();
      return data.new_pp_id;
    } catch (error) {
      console.error("Error in insertDataIntoPPTnxTable:", error);
      throw error; // Re-throw to be caught by the submit handler
    }
  };

  // Complete direct submit handler inside your frontend dues page component
  const handleSubmit = async () => {
    // 1. Basic input validations
    if (selectedYears.size === 0) {
      alert("At least one year must be selected.");
      return;
    }
    if (!callsigns.trim()) {
      alert("Callsign(s) cannot be empty.");
      return;
    }

    try {
      const fullName = await getFullNameFromMergeTable(formData.callsign);
      console.log("DEBUG - Resolved full name for callsign:", fullName);

      // Construct the data payload ensuring clean spacing constraints
      const dataToSend = {
        ...formData,
        callsigns: callsigns.trim(),
        fullname: fullName
      };

      // 2. Fire the database persistence execution directly
      console.log("DEBUG - What the frontend is sending to /api/submitDues:", dataToSend);

      const response = await fetch("/api/submitDues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        throw new Error(`Server returned status code: ${response.status}`);
      }

      const data = await response.json();

    // 1. Grab the tracking identifier returned by the serverless layer
    const targetTrackingId = data.transactionId || data.pp_id || data.id;
    if (!targetTrackingId) {
      console.error("❌ Synch Error: Tracking token missing from serverless payload.", data);
      alert("System synchronization error: Tracking ID could not be initialized.");
      return;
    }

    console.log("🔗 Routing to modern serverless payment flow using token:", targetTrackingId);

    // 2. FIXED: Change this from 'http://localhost:5556/...' to a clean relative path!
    // This routes the browser cleanly on port 3000 to your Next.js page component.
    const fullTransferAddress = `/make-payment?token=${targetTrackingId}`;
    
    console.log("🚀 Serverless Gateway Redirect Target:", fullTransferAddress);
    window.location.replace(fullTransferAddress);

  } catch (error) {
    console.error("❌ Submission process crashed:", error);
    alert("An error occurred during submission. Please check your network connection.");
  }

  };

  const currentYear = new Date().getFullYear();
  const yearsToDisplay = Array.from({ length: 4 }, (_, i) => currentYear + i); // 2026, 2027, 2028, 2029

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h2 className="text-3xl text-center font-extrabold text-blue-800 mb-6">
        Dues Renewal Form for the Coastside Amateur Radio Club
      </h2>
      <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
        <p className="text-gray-700 mb-4 leading-relaxed">
          Currently, the basic membership fee is **$20.00/year** for the primary membership in a household.
          Additional members in a household are **$3.00/year** each.
        </p>
        <p className="text-gray-700 mb-4 italic leading-relaxed">
          <strong className="text-red-600">Note:</strong> The IRS rules for CARC as a 501(c)(7) organization do{" "}
          <em className="font-semibold underline">not</em> allow membership dues or donations to be deductible for
          income tax purposes by the donor.
        </p>
        <p className="text-gray-700 mb-4 leading-relaxed">
          For Associate (unlicensed) members, enter the first initial and last name of the Associate
          as a simple text string (e.g., <code className="bg-gray-100 p-1 rounded">J_SMITH</code>) with no space.
        </p>
        <p className="text-gray-700 mb-4 leading-relaxed">
          If you are a new member, your membership fee for the current year will be pro-rated. The month you are
          joining will be determined from the form submission date. Please check the "New Member" checkbox below
          if you are a new member.
        </p>
      </div>

      <form className="space-y-6 bg-white p-6 rounded-xl shadow-lg">
        {/* Years Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-full">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Select Membership Years:</h3>
          </div>
          {yearsToDisplay.map((year) => (
            <label key={year} className="flex items-center space-x-3 cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition duration-150">
              <input
                type="checkbox"
                checked={selectedYears.has(year)}
                onChange={() => handleYearChange(year)}
                className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-gray-900 font-medium">{year}</span>
            </label>
          ))}
          <div className="col-span-full text-sm text-gray-600 mt-2">
            Number of Years selected: <span className="font-semibold text-blue-700">{numCheckedYears}</span>
            {numCheckedYears === 0 && <p className="text-red-500 mt-1">At least one year must be selected.</p>}
          </div>
        </div>

        {/* New Member Checkbox */}
        <div className="flex items-center justify-between py-2 border-b border-gray-200">
          <label htmlFor="newmember" className="text-gray-800 font-medium">
            New Member?
          </label>
          <input
            type="checkbox"
            id="newmember"
            checked={isNewMember}
            onChange={handleNewMemberChange}
            className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
          />
        </div>

        {/* Callsigns Input */}
        <div className="space-y-1">
          <label htmlFor="callsigns" className="block text-gray-800 font-medium">
            Callsign(s) (Primary & Family):
          </label>
          <input
            type="text"
            id="callsigns"
            value={callsigns}
            onChange={handleCallsignsChange}
            placeholder="e.g., AB1CD EF2GH"
            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm uppercase"
          />
          {!callsigns.trim() && (
            <p className="text-red-500 text-sm">Please enter at least one callsign.</p>
          )}
        </div>

        {/* Display Fields */}
        <div className="grid grid-cols-2 gap-y-3 gap-x-4 bg-gray-50 p-4 rounded-lg">
          <div className="text-gray-700 font-medium">Server Time:</div>
          <div className="text-right font-mono text-gray-900">{currentDateTime}</div>

          <div className="text-gray-700 font-medium">Pro Rata Factor:</div>
          <div className="text-right font-mono text-gray-900">{proRataFactor} months</div>

          <div className="text-gray-700 font-medium">Primary Dues:</div>
          <div className="text-right font-bold text-green-700">{formatDollars(primaryDues)}</div>

          <div className="text-gray-700 font-medium">Family Dues:</div>
          <div className="text-right font-bold text-green-700">{formatDollars(familyDues)}</div>
        </div>

        {/* Donation Fields */}
        <div className="grid grid-cols-2 gap-y-3 gap-x-4">
          <label htmlFor="donation" className="text-gray-800 font-medium">
            Donation:
          </label>
          <input
            type="number"
            id="donation"
            value={donation.toFixed(2)}
            onChange={handleDonationChange}
            min="0"
            step="0.01"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-right"
          />
        </div>

        {/* Subtotal */}
        <div className="grid grid-cols-2 gap-y-3 gap-x-4 border-t pt-4 mt-4">
          <div className="text-gray-800 font-semibold text-lg">Subtotal:</div>
          <div className="text-right font-bold text-blue-800 text-lg">{formatDollars(subtotal)}</div>
        </div>

        {/* PayPal Fee Checkbox */}
        <div className="flex items-center justify-between py-2 border-t border-gray-200 pt-4">
          <label htmlFor="ppfeechecked" className="text-gray-800 font-medium">
            Include PayPal Fee (You Pay):
          </label>
          <input
            type="checkbox"
            id="ppfeechecked"
            checked={includePaypalFee}
            onChange={handlePaypalFeeChange}
            className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
          />
        </div>

        {/* Final Amounts Display */}
        <div className="grid grid-cols-2 gap-y-3 gap-x-4 bg-blue-50 p-4 rounded-lg">
          <div className="text-blue-700 font-medium">Optional PayPal Fee:</div>
          <div className="text-right font-bold text-blue-700">{formatDollars(optionalPaypalFee)}</div>

          <div className="text-blue-700 font-medium">PayPal Receives:</div>
          <div className="text-right font-bold text-blue-700">{formatDollars(paypalFee)}</div>

          <div className="text-blue-700 font-medium">Club Receives:</div>
          <div className="text-right font-bold text-blue-700">{formatDollars(clubReceives)}</div>

          <div className="text-blue-900 font-extrabold text-xl">Total Charges:</div>
          <div className="text-right font-extrabold text-blue-900 text-xl">{formatDollars(totalCharges)}</div>
        </div>

        {/* Submit Button */}
        <div className="text-center mt-8">
          <button
            type="button"
            onClick={handleSubmit}
            className="bg-green-700 text-white py-3 px-8 rounded-lg text-lg font-semibold hover:bg-green-800 transition duration-300 shadow-md"
          >
            Submit to PayPal
          </button>
        </div>
      </form>
    </div>
  );
}

export default CarcPayPalDues;
