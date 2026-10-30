//frontend/src/app/members/actions.ts
'use server';

import db from '@/lib/sqlite';
import { revalidatePath } from 'next/cache';

export interface Member {
  ID?: number;
  CallSign: string;
  LicenseClass: string;
  CARCOfficer: string;
  FirstName: string;
  LastName: string;
  Address: string;
  Apt_Suite: string;
  City: string;
  State: string;
  ZIP: number | null;
  HomePhone: string;
  CellPhone: string;
  CellTxt: string;
  Email1: string;
  Email2: string;
  CARCMember: number;
  Active: number;
  Inactive: number;
  DuesDue: number;
  DuesPaid: number;
  DatePaid: string;
  LastPaid: string;
  NextDue: string;
  AmountPaid: number | null;
  YrsLicensed: string;
  MemberSince: number | null;
  DonateTo: string;
  DonationAmt: number | null;
  ARRL: number;
  ARES: number;
  RACES: number;
  CERT: number;
  Packet: string;
}

export async function getMembers(search: string = ''): Promise<Member[]> {
  if (search.trim()) {
    const stmt = db.prepare(`
      SELECT * FROM members 
      WHERE CallSign LIKE ? OR FirstName LIKE ? OR LastName LIKE ?
      ORDER BY LastName, FirstName
    `);
    const wildcard = `%${search.trim()}%`;
    return stmt.all(wildcard, wildcard, wildcard) as Member[];
  }
  return db.prepare('SELECT * FROM members ORDER BY LastName, FirstName').all() as Member[];
}

export interface MemberCounts {
  total: number;
  active: number;
}

export async function getMemberCounts(): Promise<MemberCounts> {
  return db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN Active = 1 THEN 1 ELSE 0 END) AS active
    FROM members
  `).get() as MemberCounts;
}

type StoredMember = Member & { ID: number };

const getMemberByID = db.prepare(`
  SELECT * FROM members WHERE ID = ?
`);

const insertAuditEntry = db.prepare(`
  INSERT INTO members_audit_log (
    Operation,
    MemberID,
    CallSign,
    OldValues,
    NewValues,
    ChangedVia
  ) VALUES (
    @Operation,
    @MemberID,
    @CallSign,
    @OldValues,
    @NewValues,
    'website'
  )
`);

function getStoredMember(id: number): StoredMember {
  const member = getMemberByID.get(id) as StoredMember | undefined;

  if (!member) {
    throw new Error(`Member ID ${id} was not found.`);
  }

  return member;
}

export async function saveMember(formData: FormData) {
  const id = formData.get('ID') ? Number(formData.get('ID')) : null;

  const data = {
    CallSign: (formData.get('CallSign') as string) || '',
    LicenseClass: (formData.get('LicenseClass') as string) || '',
    CARCOfficer: (formData.get('CARCOfficer') as string) || '',
    FirstName: (formData.get('FirstName') as string) || '',
    LastName: (formData.get('LastName') as string) || '',
    Address: (formData.get('Address') as string) || '',
    Apt_Suite: (formData.get('Apt_Suite') as string) || '',
    City: (formData.get('City') as string) || '',
    State: (formData.get('State') as string) || '',
    ZIP: formData.get('ZIP') ? Number(formData.get('ZIP')) : null,
    HomePhone: (formData.get('HomePhone') as string) || '',
    CellPhone: (formData.get('CellPhone') as string) || '',
    CellTxt: (formData.get('CellTxt') as string) || '',
    Email1: (formData.get('Email1') as string) || '',
    Email2: (formData.get('Email2') as string) || '',
    CARCMember: formData.get('CARCMember') === 'on' ? 1 : 0,
    Active: formData.get('Active') === 'on' ? 1 : 0,
    Inactive: formData.get('Inactive') === 'on' ? 1 : 0,
    DuesDue: formData.get('DuesDue') === 'on' ? 1 : 0,
    DuesPaid: formData.get('DuesPaid') === 'on' ? 1 : 0,
    DatePaid: (formData.get('DatePaid') as string) || '',
    LastPaid: (formData.get('LastPaid') as string) || '',
    NextDue: (formData.get('NextDue') as string) || '',
    AmountPaid: formData.get('AmountPaid') ? Number(formData.get('AmountPaid')) : null,
    YrsLicensed: (formData.get('YrsLicensed') as string) || '',
    MemberSince: formData.get('MemberSince') ? Number(formData.get('MemberSince')) : null,
    DonateTo: (formData.get('DonateTo') as string) || '',
    DonationAmt: formData.get('DonationAmt') ? Number(formData.get('DonationAmt')) : null,
    ARRL: formData.get('ARRL') === 'on' ? 1 : 0,
    ARES: formData.get('ARES') === 'on' ? 1 : 0,
    RACES: formData.get('RACES') === 'on' ? 1 : 0,
    CERT: formData.get('CERT') === 'on' ? 1 : 0,
    Packet: (formData.get('Packet') as string) || ''
  };

  if (id !== null) {
    const updateMember = db.prepare(`
    UPDATE members SET
      CallSign = @CallSign, LicenseClass = @LicenseClass, CARCOfficer = @CARCOfficer,
      FirstName = @FirstName, LastName = @LastName, Address = @Address, Apt_Suite = @Apt_Suite,
      City = @City, State = @State, ZIP = @ZIP, HomePhone = @HomePhone, CellPhone = @CellPhone,
      CellTxt = @CellTxt, Email1 = @Email1, Email2 = @Email2, CARCMember = @CARCMember,
      Active = @Active, Inactive = @Inactive, DuesDue = @DuesDue, DuesPaid = @DuesPaid,
      DatePaid = @DatePaid, LastPaid = @LastPaid, NextDue = @NextDue, AmountPaid = @AmountPaid,
      YrsLicensed = @YrsLicensed, MemberSince = @MemberSince, DonateTo = @DonateTo,
      DonationAmt = @DonationAmt, ARRL = @ARRL, ARES = @ARES, RACES = @RACES, CERT = @CERT,
      Packet = @Packet
    WHERE ID = @id
  `);

    const updateTransaction = db.transaction(() => {
      const before = getStoredMember(id);
      const result = updateMember.run({ ...data, id });

      if (result.changes !== 1) {
        throw new Error(
          `Expected to update one member, but updated ${result.changes}.`
        );
      }

      const after = getStoredMember(id);

      insertAuditEntry.run({
        Operation: 'UPDATE',
        MemberID: id,
        CallSign: after.CallSign,
        OldValues: JSON.stringify(before),
        NewValues: JSON.stringify(after)
      });
    });

    updateTransaction();
  } else {
    const insertMember = db.prepare(`
    INSERT INTO members (
      ID, CallSign, LicenseClass, CARCOfficer, FirstName, LastName, Address, Apt_Suite,
      City, State, ZIP, HomePhone, CellPhone, CellTxt, Email1, Email2,
      CARCMember, Active, Inactive, DuesDue, DuesPaid, DatePaid, LastPaid, NextDue,
      AmountPaid, YrsLicensed, MemberSince, DonateTo, DonationAmt,
      ARRL, ARES, RACES, CERT, Packet
    ) VALUES (
      @ID, @CallSign, @LicenseClass, @CARCOfficer, @FirstName, @LastName, @Address,
      @Apt_Suite, @City, @State, @ZIP, @HomePhone, @CellPhone, @CellTxt, @Email1,
      @Email2, @CARCMember, @Active, @Inactive, @DuesDue, @DuesPaid, @DatePaid,
      @LastPaid, @NextDue, @AmountPaid, @YrsLicensed, @MemberSince, @DonateTo,
      @DonationAmt, @ARRL, @ARES, @RACES, @CERT, @Packet
    )
  `);

    const insertTransaction = db.transaction(() => {
      const nextIDRow = db.prepare(`
      SELECT COALESCE(MAX(ID), 0) + 1 AS NextID
      FROM members
    `).get() as { NextID: number };

      const newID = nextIDRow.NextID;
      const result = insertMember.run({ ID: newID, ...data });

      if (result.changes !== 1) {
        throw new Error(
          `Expected to insert one member, but inserted ${result.changes}.`
        );
      }

      const after = getStoredMember(newID);

      insertAuditEntry.run({
        Operation: 'INSERT',
        MemberID: newID,
        CallSign: after.CallSign,
        OldValues: null,
        NewValues: JSON.stringify(after)
      });
    });

    insertTransaction();
  }

  revalidatePath('/members');
}

export async function deleteMember(id: number) {
  const deleteStatement = db.prepare(`
    DELETE FROM members WHERE ID = ?
  `);

  const deleteTransaction = db.transaction(() => {
    const before = getStoredMember(id);
    const result = deleteStatement.run(id);

    if (result.changes !== 1) {
      throw new Error(
        `Expected to delete one member, but deleted ${result.changes}.`
      );
    }

    insertAuditEntry.run({
      Operation: 'DELETE',
      MemberID: id,
      CallSign: before.CallSign,
      OldValues: JSON.stringify(before),
      NewValues: null
    });
  });

  deleteTransaction();
  revalidatePath('/members');
}