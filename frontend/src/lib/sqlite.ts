import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

type SqliteDatabase = Database.Database;

let database: SqliteDatabase | undefined;

function createMockDatabase(): SqliteDatabase {
  const mockDatabase = new Database(":memory:");

  mockDatabase.exec(`
    CREATE TABLE merged (Callsign TEXT, FullName TEXT);
    CREATE TABLE pp_tnx (
      myindex INTEGER,
      mydate TEXT,
      years TEXT,
      "new" INTEGER,
      callsigns TEXT,
      primary_ TEXT,
      family TEXT,
      repeater TEXT,
      digipeater TEXT,
      donation TEXT,
      subtotal TEXT,
      paypalfee TEXT,
      clubreceives TEXT,
      total TEXT,
      FullName TEXT,
      pay_paypal TEXT,
      transaction_status TEXT,
      pp_orderID TEXT,
      pp_id TEXT,
      pp_total REAL,
      pp_response TEXT
    );
    CREATE TABLE members (ID INTEGER PRIMARY KEY, CallSign TEXT, FirstName TEXT, LastName TEXT);
    CREATE TABLE members_audit_log (
      Operation TEXT,
      MemberID INTEGER,
      CallSign TEXT,
      OldValues TEXT,
      NewValues TEXT,
      ChangedVia TEXT
    );
  `);

  return mockDatabase;
}

export function getDatabase(): SqliteDatabase {
  if (!database) {
    if (process.env.CARC_DATABASE_MODE === "mock") {
      database = createMockDatabase();
    } else {
      const dbPath =
        process.env.SQLITE_DATABASE_PATH ||
        path.join(process.cwd(), "data", "carc.db");

      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
      database = new Database(dbPath);
      database.pragma("journal_mode = WAL");
    }
  }

  return database;
}

const db = {
  prepare: (...args: Parameters<SqliteDatabase["prepare"]>) =>
    getDatabase().prepare(...args),
  transaction: (...args: Parameters<SqliteDatabase["transaction"]>) =>
    getDatabase().transaction(...args),
};

export default db;
