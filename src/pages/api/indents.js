import { Pool } from "pg";

// ----------------- DB Setup -----------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
});

// ----------------- API Route -----------------
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const payload = req.body; // expecting an array of entries

  console.log('📥 Received indent payload:', JSON.stringify(payload, null, 2));

  if (!Array.isArray(payload) || payload.length === 0) {
    return res.status(400).json({ message: "No indent entries provided" });
  }

  let client;
  try {
    client = await pool.connect();
    console.log('✅ Database connected');
    
    await client.query("BEGIN");
    console.log('✅ Transaction started');

    let grandTotal = 0;
    let insertedCount = 0;

    // First, delete existing entries for this date to avoid duplicates
    const firstDate = payload[0].date;
    const deleteResult = await client.query(
      `DELETE FROM indents WHERE indent_date = $1`,
      [firstDate]
    );
    console.log(`🗑️ Deleted ${deleteResult.rowCount} existing entries for date: ${firstDate}`);

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

      console.log(`📝 Inserting: ${company_name} - ${quantity}L - ${item_type}`);

      // Remove RETURNING id since the column doesn't exist
      await client.query(
        `INSERT INTO indents (indent_date, delivery_boy_id, company_id, company_name, quantity, item_type)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [date, delivery_boy_id, company_id, company_name, quantity, item_type]
      );

      console.log(`✅ Inserted: ${company_name}`);
      grandTotal += Number(quantity || 0);
      insertedCount++;
    }

    await client.query("COMMIT");
    console.log(`✅ Transaction committed. Inserted ${insertedCount} entries. Grand Total: ${grandTotal}L`);

    return res.status(201).json({
      success: true,
      message: "Indent submitted successfully",
      grandTotal,
      insertedCount,
    });
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
      console.error("❌ Transaction rolled back");
    }
    console.error("❌ API Error:", err);
    console.error("Error details:", err.message);
    console.error("Error stack:", err.stack);
    return res.status(500).json({ 
      message: err.message || "Internal Server Error",
      error: err.toString()
    });
  } finally {
    if (client) client.release();
  }
}
