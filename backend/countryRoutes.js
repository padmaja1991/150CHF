// ===== [COUNTRY-API-01 | Country Routes] =====
const express = require("express");
const db = require("./db");

const router = express.Router();

// ===== [COUNTRY-API-02 | Get All Countries] =====
router.get("/countries", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        id,
        country_name,
        country_code_iso2 AS iso2,
        country_code_iso3 AS iso3,
        numeric_code,
        region_id,
        currency_id,
        phone_code,
        flag_emoji,
        sort_order,
        status
      FROM public.country_master
      ORDER BY country_name ASC
    `);

    return res.json(result.rows);

  } catch (error) {
    console.error("Country fetch error:", error);

    return res.status(500).json({
      message: "Could not load countries."
    });
  }
});

module.exports = router;