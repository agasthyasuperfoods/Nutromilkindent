import { Pool } from "pg";

// ----------------- DB Setup -----------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function executeQuery(client, query, values) {
  try {
    const result = await client.query(query, values);
    return result;
  } catch (error) {
    throw error;
  }
}

// ----------------- API Route -----------------
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const payload = req.body; // expecting an array of entries

  if (!Array.isArray(payload) || payload.length === 0) {
    return res.status(400).json({ message: "No indent entries provided" });
  }

  let client;
  try {
    client = await pool.connect();
    await executeQuery(client, "BEGIN");

    let grandTotal = 0;

    // Insert each entry into the database
    for (const entry of payload) {
      const {
        date,
        delivery_boy_id = null,
        company_id = null,
        company_name = "",
        quantity,
        item_type = "REGULAR_MILK",
      } = entry;

      if (!date || !quantity) {
        throw new Error("Missing date or quantity in entry");
      }

      await executeQuery(
        client,
        `INSERT INTO indents (indent_date, delivery_boy_id, company_id, company_name, quantity, item_type)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [date, delivery_boy_id, company_id, company_name, quantity, item_type]
      );

      grandTotal += Number(quantity || 0);
    }

    await executeQuery(client, "COMMIT");

    return res.status(201).json({
      success: true,
      message: "Indent submitted successfully",
      grandTotal,
    });
  } catch (err) {
    if (client) await executeQuery(client, "ROLLBACK");
    console.error("API Error:", err);
    return res.status(500).json({ message: err.message || "Internal Server Error" });
  } finally {
    if (client) client.release();
  }
}
