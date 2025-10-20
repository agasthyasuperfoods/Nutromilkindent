// pages/api/bulk-customers-v2.js
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const respondMethodNotAllowed = (res, allowed = []) => {
  if (allowed.length) res.setHeader("Allow", allowed.join(", "));
  return res.status(405).json({ error: "Method not allowed" });
};

const parseNullableNumber = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};

// Normalize month_year: if client sends "YYYY-MM" or "YYYY-MM-01" or full ISO date, produce 'YYYY-MM-01'
const normalizeMonthYearIso = (input) => {
  if (!input) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10); // YYYY-MM-01
  }
  // if "YYYY-MM" provided, append "-01"
  if (/^\d{4}-\d{2}$/.test(String(input))) return `${input}-01`;
  // if "YYYY-MM-DD" or full ISO, take first day of that month
  const d = new Date(input);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

// Ensure serial sequence for company_id is at least max(company_id)+1
async function ensureSequenceSynced(client) {
  // pg_get_serial_sequence exists in Postgres: returns sequence name for table/column
  const seqRes = await client.query(
    `SELECT pg_get_serial_sequence('public.bulk_customers','company_id') AS seqname`
  );
  const seqName = seqRes.rows?.[0]?.seqname;
  if (!seqName) return;
  // compute max(company_id) and setval to max+1
  await client.query(
    `SELECT setval($1, (SELECT COALESCE(MAX(company_id), 0) + 1 FROM public.bulk_customers), false)`,
    [seqName]
  );
}

export default async function handler(req, res) {
  const id = req.query?.id ?? req.body?.id ?? null;

  // GET: list or single (joined with latest monthly_bulk_indents)
  if (req.method === "GET") {
    try {
      const client = await pool.connect();
      try {
        if (id) {
          const sql = `
            SELECT
              b.company_id,
              b.company_name,
              b.area,
              b.mobile_number,
              b.indent_type,
              b.payment_term,
              m.month_year,
              m.quantity_weekdays   AS default_quantity_weekdays,
              m.quantity_saturday   AS saturday,
              m.quantity_sunday     AS sunday,
              m.quantity_holidays   AS holidays
            FROM public.bulk_customers b
            LEFT JOIN (
              SELECT DISTINCT ON (company_id)
                company_id,
                month_year,
                quantity_weekdays,
                quantity_saturday,
                quantity_sunday,
                quantity_holidays
              FROM public.monthly_bulk_indents
              ORDER BY company_id, month_year DESC
            ) m ON m.company_id = b.company_id
            WHERE b.company_id = $1
            LIMIT 1;
          `;
          const { rows } = await client.query(sql, [id]);
          if (!rows.length) return res.status(404).json({ error: "Customer not found" });
          return res.status(200).json({ row: rows[0] });
        } else {
          const sql = `
            SELECT
              b.company_id,
              b.company_name,
              b.area,
              b.mobile_number,
              b.indent_type,
              b.payment_term,
              m.month_year,
              m.quantity_weekdays   AS default_quantity_weekdays,
              m.quantity_saturday   AS saturday,
              m.quantity_sunday     AS sunday,
              m.quantity_holidays   AS holidays
            FROM public.bulk_customers b
            LEFT JOIN (
              SELECT DISTINCT ON (company_id)
                company_id,
                month_year,
                quantity_weekdays,
                quantity_saturday,
                quantity_sunday,
                quantity_holidays
              FROM public.monthly_bulk_indents
              ORDER BY company_id, month_year DESC
            ) m ON m.company_id = b.company_id
            ORDER BY b.company_name NULLS LAST;
          `;
          const { rows } = await client.query(sql);
          return res.status(200).json({ rows });
        }
      } finally {
        client.release();
      }
    } catch (err) {
      console.error("bulk-customers-v2 GET error:", err);
      return res.status(500).json({ error: "Failed to fetch bulk customers" });
    }
  }

  // POST: create (bulk_customers only, optional monthly insert)
  if (req.method === "POST") {
    const {
      company_name,
      mobile_number = null,
      area = null,
      indent_type = null,
      payment_term = null,
      // monthly quantities accepted by client but not written into bulk_customers here
      default_quantity_weekdays = undefined,
      saturday = undefined,
      sunday = undefined,
      holidays = undefined,
      month_year = undefined,
    } = req.body ?? {};

    if (!company_name || !String(company_name).trim()) {
      return res.status(400).json({ error: "company_name is required" });
    }

    // determine whether monthly fields were actually provided
    const monthlyProvided =
      default_quantity_weekdays !== undefined ||
      saturday !== undefined ||
      sunday !== undefined ||
      holidays !== undefined;

    try {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const insertSql = `
          INSERT INTO public.bulk_customers
            (company_name, mobile_number, area, indent_type, payment_term)
          VALUES ($1,$2,$3,$4,$5)
          RETURNING company_id, company_name, mobile_number, area, indent_type, payment_term;
        `;
        const values = [
          String(company_name).trim(),
          mobile_number ?? null,
          area ?? null,
          indent_type ?? null,
          payment_term ?? null,
        ];

        let created = null;
        try {
          const { rows } = await client.query(insertSql, values);
          created = rows[0] ?? null;
        } catch (err) {
          // If duplicate key error caused by sequence being behind, try to sync sequence and retry once.
          if (err && (err.code === "23505" || /duplicate key value violates unique constraint/i.test(String(err.message)))) {
            console.warn("insert duplicate key — attempting sequence sync and retry", err);
            try {
              await ensureSequenceSynced(client);
              const { rows: rowsRetry } = await client.query(insertSql, values);
              created = rowsRetry[0] ?? null;
            } catch (retryErr) {
              console.error("retry after sequence sync failed:", retryErr);
              throw retryErr;
            }
          } else {
            throw err;
          }
        }

        // Optional: if monthly quantities provided, create monthly_bulk_indents for the provided month_year
        if (created && monthlyProvided) {
          const monthIso = normalizeMonthYearIso(month_year) || new Date().toISOString().slice(0, 10);
          const upsertSql = `
            INSERT INTO public.monthly_bulk_indents
              (company_id, month_year, quantity_weekdays, quantity_saturday, quantity_sunday, quantity_holidays)
            VALUES ($1, $2::date, $3, $4, $5, $6)
            ON CONFLICT (company_id, month_year) DO UPDATE
            SET
              quantity_weekdays = COALESCE(EXCLUDED.quantity_weekdays, monthly_bulk_indents.quantity_weekdays),
              quantity_saturday = COALESCE(EXCLUDED.quantity_saturday, monthly_bulk_indents.quantity_saturday),
              quantity_sunday = COALESCE(EXCLUDED.quantity_sunday, monthly_bulk_indents.quantity_sunday),
              quantity_holidays = COALESCE(EXCLUDED.quantity_holidays, monthly_bulk_indents.quantity_holidays)
            RETURNING company_id, month_year, quantity_weekdays, quantity_saturday, quantity_sunday, quantity_holidays;
          `;
          const upsertVals = [
            created.company_id,
            monthIso,
            parseNullableNumber(default_quantity_weekdays),
            parseNullableNumber(saturday),
            parseNullableNumber(sunday),
            parseNullableNumber(holidays),
          ];
          await client.query(upsertSql, upsertVals);
        }

        await client.query("COMMIT");
        return res.status(201).json({ row: created });
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error("bulk-customers-v2 POST error:", err);
      // try to surface helpful message if sequence issue
      if (err && err.code === "23505") {
        return res.status(500).json({ error: "Duplicate key - possible sequence mismatch. Try syncing sequence." });
      }
      return res.status(500).json({ error: "Failed to create bulk customer" });
    }
  }

  // PUT: update bulk_customers (and optionally upsert monthly_bulk_indents)
  if (req.method === "PUT") {
    if (!id) return res.status(400).json({ error: "Missing id parameter" });

    const {
      company_name,
      mobile_number = undefined,
      area = undefined,
      indent_type = undefined,
      payment_term = undefined,
      // monthly fields (only these should go to monthly_bulk_indents)
      default_quantity_weekdays = undefined,
      saturday = undefined,
      sunday = undefined,
      holidays = undefined,
      month_year = undefined, // optional - if present use it; else current month
    } = req.body ?? {};

    if (!company_name || !String(company_name).trim()) {
      return res.status(400).json({ error: "company_name is required" });
    }

    try {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // 1) Update bulk_customers main table
        // Using COALESCE($n, column) pattern: if client sends NULL explicitly -> keep original; if they send a non-null value -> update.
        // NOTE: we treat `undefined` on the Node side by passing null, which allows COALESCE to pick the existing column.
        const updateSql = `
          UPDATE public.bulk_customers
          SET
            company_name = $1,
            mobile_number = COALESCE($2, mobile_number),
            area = COALESCE($3, area),
            indent_type = COALESCE($4, indent_type),
            payment_term = COALESCE($5, payment_term)
          WHERE company_id = $6
          RETURNING company_id, company_name, mobile_number, area, indent_type, payment_term;
        `;
        const updateValues = [
          String(company_name).trim(),
          mobile_number === undefined ? null : mobile_number,
          area === undefined ? null : area,
          indent_type === undefined ? null : indent_type,
          payment_term === undefined ? null : payment_term,
          id,
        ];
        const updateRes = await client.query(updateSql, updateValues);
        if (!updateRes.rows.length) {
          await client.query("ROLLBACK");
          return res.status(404).json({ error: "Customer not found" });
        }
        const updatedCustomer = updateRes.rows[0];

        // 2) If monthly fields are present (not undefined), upsert into monthly_bulk_indents for the specified month_year (or current month)
        let monthlyRow = null;
        const monthlyFieldsProvided =
          default_quantity_weekdays !== undefined ||
          saturday !== undefined ||
          sunday !== undefined ||
          holidays !== undefined;

        if (monthlyFieldsProvided) {
          const monthIso = normalizeMonthYearIso(month_year);
          if (!monthIso) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Invalid month_year" });
          }

          const upsertSql = `
            INSERT INTO public.monthly_bulk_indents
              (company_id, month_year, quantity_weekdays, quantity_saturday, quantity_sunday, quantity_holidays)
            VALUES ($1, $2::date, $3, $4, $5, $6)
            ON CONFLICT (company_id, month_year) DO UPDATE
            SET
              quantity_weekdays = CASE WHEN EXCLUDED.quantity_weekdays IS NOT NULL THEN EXCLUDED.quantity_weekdays ELSE monthly_bulk_indents.quantity_weekdays END,
              quantity_saturday = CASE WHEN EXCLUDED.quantity_saturday IS NOT NULL THEN EXCLUDED.quantity_saturday ELSE monthly_bulk_indents.quantity_saturday END,
              quantity_sunday = CASE WHEN EXCLUDED.quantity_sunday IS NOT NULL THEN EXCLUDED.quantity_sunday ELSE monthly_bulk_indents.quantity_sunday END,
              quantity_holidays = CASE WHEN EXCLUDED.quantity_holidays IS NOT NULL THEN EXCLUDED.quantity_holidays ELSE monthly_bulk_indents.quantity_holidays END
            RETURNING company_id, month_year, quantity_weekdays, quantity_saturday, quantity_sunday, quantity_holidays;
          `;
          const upsertVals = [
            id,
            monthIso,
            default_quantity_weekdays === undefined ? null : parseNullableNumber(default_quantity_weekdays),
            saturday === undefined ? null : parseNullableNumber(saturday),
            sunday === undefined ? null : parseNullableNumber(sunday),
            holidays === undefined ? null : parseNullableNumber(holidays),
          ];
          const upsertRes = await client.query(upsertSql, upsertVals);
          monthlyRow = upsertRes.rows[0] ?? null;
        }

        await client.query("COMMIT");

        // Build response: merge updatedCustomer and monthlyRow (if any)
        const responseRow = {
          company_id: updatedCustomer.company_id,
          company_name: updatedCustomer.company_name,
          mobile_number: updatedCustomer.mobile_number,
          area: updatedCustomer.area,
          indent_type: updatedCustomer.indent_type,
          payment_term: updatedCustomer.payment_term,
          month_year: monthlyRow?.month_year ?? null,
          default_quantity_weekdays: monthlyRow?.quantity_weekdays ?? null,
          saturday: monthlyRow?.quantity_saturday ?? null,
          sunday: monthlyRow?.quantity_sunday ?? null,
          holidays: monthlyRow?.quantity_holidays ?? null,
        };

        return res.status(200).json({ row: responseRow });
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error("bulk-customers-v2 PUT error:", err);
      return res.status(500).json({ error: "Failed to update customer" });
    }
  }

  // DELETE: remove customer (monthly_bulk_indents rows cascade by FK)
  if (req.method === "DELETE") {
    if (!id) return res.status(400).json({ error: "Missing id parameter" });

    try {
      const client = await pool.connect();
      try {
        const delSql = `DELETE FROM public.bulk_customers WHERE company_id = $1 RETURNING company_id;`;
        const { rows } = await client.query(delSql, [id]);
        if (!rows.length) return res.status(404).json({ error: "Customer not found" });
        return res.status(200).json({ deleted: true, id: rows[0].company_id });
      } finally {
        client.release();
      }
    } catch (err) {
      console.error("bulk-customers-v2 DELETE error:", err);
      return res.status(500).json({ error: "Failed to delete customer" });
    }
  }

  return respondMethodNotAllowed(res, ["GET", "POST", "PUT", "DELETE"]);
}
