
//frontend/src/app/members/page.tsx
'use client';

import { useEffect, useState } from 'react';
import {
  deleteMember,
  getMemberCounts,
  getMembers,
  Member,
  saveMember
} from './actions';

export default function MembersPage() {
  const [search, setSearch] = useState('');

  const [selectedMember, setSelectedMember] =
    useState<Member | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [members, setMembers] = useState<Member[]>([]);

  const [counts, setCounts] = useState({
    total: 0,
    active: 0,
  });

  const loadMembers = async () => {
    const [data, updatedCounts] = await Promise.all([
      getMembers(search),
      getMemberCounts(),
    ]);

    setMembers(data);
    setCounts(updatedCounts);
  };

  useEffect(() => {
    void loadMembers();
  }, []);

  useEffect(() => {
    loadMembers();
  }, [search]);

  const handleAddNew = () => {
    setSelectedMember(null);
    setIsModalOpen(true);
  };

  const handleEdit = (member: Member) => {
    setSelectedMember(member);
    setIsModalOpen(true);
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    if (confirm('Are you sure you want to delete this member?')) {
      await deleteMember(id);
      loadMembers();
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await saveMember(formData);
    setIsModalOpen(false);
    loadMembers();
  };



  return (
    <div className="p-8 max-w-7xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">CARC Membership Roster</h1>
        <button
          onClick={handleAddNew}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow"
        >
          + Add New Member
        </button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="w-full max-w-xl">
          <input
            type="text"
            placeholder="Search by CallSign, First or Last Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
      </div>

      <div className="member-summary">
        <strong>Total members:</strong> {counts.total}
        {' | '}
        <strong>Active members:</strong> {counts.active}
      </div>


      {/* Roster Table */}
      <div className="overflow-x-auto border rounded shadow-sm">
        <table className="w-full text-left text-gray-90 border-collapse text-sm">
          <thead className="bg-green-900 border-b">
            <tr>
              <th className="p-3">Call Sign</th>
              <th className="p-3">Name</th>
              <th className="p-3">Class</th>
              <th className="p-3">Officer</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Email</th>
              <th className="p-3">Active</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-4 text-center text-gray-500">
                  No members found.
                </td>
              </tr>
            ) : (
              members.map((m) => (
                <tr key={m.ID} className="border-b hover:bg-gray-100 hover:text-black">
                  <td className="p-3 font-semibold">{m.CallSign || '—'}</td>
                  <td className="p-3">{`${m.FirstName} ${m.LastName}`}</td>
                  <td className="p-3">{m.LicenseClass}</td>
                  <td className="p-3">{m.CARCOfficer || '—'}</td>
                  <td className="p-3">{m.CellPhone || m.HomePhone || '—'}</td>
                  <td className="p-3">{m.Email1 || '—'}</td>
                  <td className="p-3">{m.Active ? '✅' : '❌'}</td>
                  <td className="p-3 text-right space-x-2">
                    <button
                      onClick={() => handleEdit(m)}
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(m.ID)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {
        isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full text-gray-900 max-w-3xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                {selectedMember ? 'Edit Member' : 'Add New Member'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                {selectedMember?.ID && (
                  <input type="hidden" name="ID" value={selectedMember.ID} />
                )}

                {/* Personal Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    name="CallSign"
                    placeholder="Call Sign"
                    defaultValue={selectedMember?.CallSign || ''}
                    className="border p-2 rounded"
                  />
                  <input
                    name="FirstName"
                    placeholder="First Name"
                    defaultValue={selectedMember?.FirstName || ''}
                    className="border p-2 rounded"
                    required
                  />
                  <input
                    name="LastName"
                    placeholder="Last Name"
                    defaultValue={selectedMember?.LastName || ''}
                    className="border p-2 rounded"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    name="LicenseClass"
                    placeholder="License Class"
                    defaultValue={selectedMember?.LicenseClass || ''}
                    className="border p-2 rounded"
                  />
                  <input
                    name="CARCOfficer"
                    placeholder="CARC Officer Position"
                    defaultValue={selectedMember?.CARCOfficer || ''}
                    className="border p-2 rounded"
                  />
                  <input
                    name="YrsLicensed"
                    placeholder="Years Licensed"
                    defaultValue={selectedMember?.YrsLicensed || ''}
                    className="border p-2 rounded"
                  />
                </div>

                {/* Address */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input
                    name="Address"
                    placeholder="Street Address"
                    defaultValue={selectedMember?.Address || ''}
                    className="border p-2 rounded md:col-span-2"
                  />
                  <input
                    name="Apt_Suite"
                    placeholder="Apt/Suite"
                    defaultValue={selectedMember?.Apt_Suite || ''}
                    className="border p-2 rounded"
                  />
                  <input
                    name="City"
                    placeholder="City"
                    defaultValue={selectedMember?.City || ''}
                    className="border p-2 rounded"
                  />
                  <input
                    name="State"
                    placeholder="State"
                    defaultValue={selectedMember?.State || ''}
                    className="border p-2 rounded"
                  />
                  <input
                    name="ZIP"
                    placeholder="ZIP"
                    type="number"
                    defaultValue={selectedMember?.ZIP || ''}
                    className="border p-2 rounded"
                  />
                </div>

                {/* Contact */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    name="HomePhone"
                    placeholder="Home Phone"
                    defaultValue={selectedMember?.HomePhone || ''}
                    className="border p-2 rounded"
                  />
                  <input
                    name="CellPhone"
                    placeholder="Cell Phone"
                    defaultValue={selectedMember?.CellPhone || ''}
                    className="border p-2 rounded"
                  />
                  <input
                    name="CellTxt"
                    placeholder="Cell Text Info"
                    defaultValue={selectedMember?.CellTxt || ''}
                    className="border p-2 rounded"
                  />
                  <input
                    name="Email1"
                    placeholder="Primary Email"
                    defaultValue={selectedMember?.Email1 || ''}
                    className="border p-2 rounded md:col-span-2"
                  />
                  <input
                    name="Email2"
                    placeholder="Secondary Email"
                    defaultValue={selectedMember?.Email2 || ''}
                    className="border p-2 rounded"
                  />
                </div>

                {/* Dues & Affiliations */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <input
                    name="AmountPaid"
                    placeholder="Amount Paid ($)"
                    type="number"
                    step="0.01"
                    defaultValue={selectedMember?.AmountPaid || ''}
                    className="border p-2 rounded"
                  />
                  <input
                    name="DatePaid"
                    placeholder="Date Paid"
                    defaultValue={selectedMember?.DatePaid || ''}
                    className="border p-2 rounded"
                  />
                  <input
                    name="NextDue"
                    placeholder="Next Due Date"
                    defaultValue={selectedMember?.NextDue || ''}
                    className="border p-2 rounded"
                  />
                  <input
                    name="Packet"
                    placeholder="Packet Station Info"
                    defaultValue={selectedMember?.Packet || ''}
                    className="border p-2 rounded"
                  />
                </div>

                {/* Flags / Checkboxes */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t text-sm">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="Active"
                      defaultChecked={!!selectedMember?.Active}
                    />
                    <span>Active</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="CARCMember"
                      defaultChecked={!!selectedMember?.CARCMember}
                    />
                    <span>CARC Member</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="DuesPaid"
                      defaultChecked={!!selectedMember?.DuesPaid}
                    />
                    <span>Dues Paid</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="ARRL"
                      defaultChecked={!!selectedMember?.ARRL}
                    />
                    <span>ARRL</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="ARES"
                      defaultChecked={!!selectedMember?.ARES}
                    />
                    <span>ARES</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="RACES"
                      defaultChecked={!!selectedMember?.RACES}
                    />
                    <span>RACES</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="CERT"
                      defaultChecked={!!selectedMember?.CERT}
                    />
                    <span>CERT</span>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border rounded hover:bg-gray-100"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }
    </div >
  );
}