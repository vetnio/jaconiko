import "server-only";
import { Client } from "pg";
import { decrypt } from "@/lib/crypto";

const CONNECT_TIMEOUT_MS = 10_000;
const STATEMENT_TIMEOUT_MS = 30_000;
const MAX_ROWS = 1000;

// --- Types ---

export interface SchemaColumn {
  tableSchema: string;
  tableName: string;
  columnName: string;
  dataType: string;
  isNullable: string;
  columnDefault: string | null;
}

export interface QueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  fields: { name: string; dataTypeID: number }[];
}

// --- SQL Allowlist ---

/**
 * Validates that a query only contains SELECT/WITH statements.
 * This is a defense-in-depth check alongside SET TRANSACTION READ ONLY.
 */
function validateQuery(sql: string): void {
  // Strip leading whitespace and block comments
  const stripped = sql
    .trim()
    .replace(/^\/\*[\s\S]*?\*\//g, "")
    .trim();

  const upper = stripped.toUpperCase();

  if (!upper.startsWith("SELECT") && !upper.startsWith("WITH")) {
    throw new Error("Only SELECT and WITH (CTE) queries are allowed");
  }

  // Forbid write/DDL keywords as standalone SQL keywords.
  // These are checked as word boundaries to reduce false positives
  // from column names or string literals. The real enforcement is
  // SET TRANSACTION READ ONLY at the PostgreSQL protocol level.
  const forbidden = [
    /\bINSERT\s+INTO\b/i,
    /\bUPDATE\s+\S+\s+SET\b/i,
    /\bDELETE\s+FROM\b/i,
    /\bDROP\s+(TABLE|INDEX|SCHEMA|DATABASE|VIEW|FUNCTION|TRIGGER)\b/i,
    /\bCREATE\s+(TABLE|INDEX|SCHEMA|DATABASE|VIEW|FUNCTION|TRIGGER)\b/i,
    /\bALTER\s+(TABLE|INDEX|SCHEMA|DATABASE|VIEW|FUNCTION|TRIGGER)\b/i,
    /\bTRUNCATE\b/i,
    /\bGRANT\b/i,
    /\bREVOKE\b/i,
    /\bCOPY\b/i,
  ];

  for (const pattern of forbidden) {
    if (pattern.test(sql)) {
      throw new Error(
        `Query contains forbidden SQL pattern: ${pattern.source}`
      );
    }
  }
}

// --- Internal helpers ---

function createClient(connectionString: string): Client {
  return new Client({
    connectionString,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
    statement_timeout: STATEMENT_TIMEOUT_MS,
  });
}

async function withReadOnlyClient<T>(
  encryptedConnectionString: string,
  iv: string,
  fn: (client: Client) => Promise<T>
): Promise<T> {
  const connectionString = decrypt(encryptedConnectionString, iv);
  const client = createClient(connectionString);

  try {
    await client.connect();
    await client.query("BEGIN TRANSACTION READ ONLY");

    const result = await fn(client);

    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Connection may already be broken; ignore rollback errors
    }
    throw error;
  } finally {
    await client.end().catch(() => {
      // Ignore close errors
    });
  }
}

// --- Public API ---

/**
 * Introspects the user's database schema via information_schema.
 * Returns column metadata for all user-defined tables (excludes system schemas).
 */
export async function getUserDatabaseSchema(params: {
  encryptedConnectionString: string;
  iv: string;
}): Promise<SchemaColumn[]> {
  return withReadOnlyClient(
    params.encryptedConnectionString,
    params.iv,
    async (client) => {
      const result = await client.query<{
        table_schema: string;
        table_name: string;
        column_name: string;
        data_type: string;
        is_nullable: string;
        column_default: string | null;
      }>(`
        SELECT
          table_schema,
          table_name,
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY table_schema, table_name, ordinal_position
      `);

      return result.rows.map((row) => ({
        tableSchema: row.table_schema,
        tableName: row.table_name,
        columnName: row.column_name,
        dataType: row.data_type,
        isNullable: row.is_nullable,
        columnDefault: row.column_default,
      }));
    }
  );
}

/**
 * Executes a read-only SQL query against the user's database.
 *
 * Safety layers:
 * 1. SQL allowlist — only SELECT/WITH queries pass validation
 * 2. SET TRANSACTION READ ONLY — PostgreSQL rejects any writes
 * 3. statement_timeout — prevents long-running queries
 * 4. Row limit — caps results to MAX_ROWS
 */
export async function queryUserDatabase(params: {
  encryptedConnectionString: string;
  iv: string;
  query: string;
  queryParams?: unknown[];
}): Promise<QueryResult> {
  validateQuery(params.query);

  return withReadOnlyClient(
    params.encryptedConnectionString,
    params.iv,
    async (client) => {
      // Wrap in a subquery to enforce row limit without modifying the user's query
      const limitedQuery = `SELECT * FROM (${params.query}) AS _limited LIMIT ${MAX_ROWS}`;
      const result = await client.query(limitedQuery, params.queryParams);

      return {
        rows: result.rows,
        rowCount: result.rowCount ?? 0,
        fields: result.fields.map((f) => ({
          name: f.name,
          dataTypeID: f.dataTypeID,
        })),
      };
    }
  );
}
