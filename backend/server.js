const countryRoutes = require("./countryRoutes");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

// ========================================
// HELPER FUNCTIONS
// ========================================

function firstValue(body, ...keys) {
  for (const key of keys) {
    if (body[key] !== undefined && body[key] !== null) {
      return body[key];
    }
  }
  return null;
}

function nullableText(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return String(value).trim() || null;
}

function nullableId(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);

  if (!Number.isSafeInteger(number) || number < 1) {
    throw new Error(`Invalid database ID: ${value}`);
  }

  return number;
}

function normalizeOrganizationInput(body) {
  const code = firstValue(
    body,
    "organization_code",
    "organizationCode",
    "code"
  );

  const name = firstValue(
    body,
    "organization_name",
    "organizationName",
    "name"
  );

  const status = firstValue(body, "status") || "Active";

  if (typeof code !== "string" || !code.trim()) {
    throw new Error("Organization Code is required.");
  }

  if (typeof name !== "string" || !name.trim()) {
    throw new Error("Organization Name is required.");
  }

  if (code.trim().length > 30) {
    throw new Error("Organization Code cannot exceed 30 characters.");
  }

  if (name.trim().length > 191) {
    throw new Error("Organization Name cannot exceed 191 characters.");
  }

  if (!["Active", "Inactive"].includes(status)) {
    throw new Error("Status must be Active or Inactive.");
  }

  const license = firstValue(
    body,
    "license_organization",
    "licenseOrganization",
    "license"
  );

  return {
    organization_code: code.trim(),
    organization_name: name.trim(),

    license_organization:
      [true, 1, "1", "true"].includes(license) ? 1 : 0,

    reporting_currency_id: nullableId(
      firstValue(body, "reporting_currency_id", "reportingCurrencyId")
    ),

    org_type_id: nullableId(
      firstValue(body, "org_type_id", "orgTypeId", "typeId")
    ),

    industry_id: nullableId(
      firstValue(body, "industry_id", "industryId")
    ),

    registration_number: nullableText(
      firstValue(body, "registration_number", "registrationNumber")
    ),

    date_of_incorporation: nullableText(
      firstValue(body, "date_of_incorporation", "incorporationDate")
    ),

    tax_id: nullableText(
      firstValue(body, "tax_id", "taxId")
    ),

    registered_address: nullableText(
      firstValue(
        body,
        "registered_address",
        "registeredAddress",
        "address"
      )
    ),

    country_id: nullableId(
      firstValue(body, "country_id", "countryId")
    ),

    state_id: nullableId(
      firstValue(body, "state_id", "stateId")
    ),

    city_id: nullableId(
      firstValue(body, "city_id", "cityId")
    ),

    pincode: nullableText(body.pincode),
    phone: nullableText(body.phone),
    email: nullableText(body.email),
    website: nullableText(body.website),

    logo_url: nullableText(
      firstValue(body, "logo_url", "logoUrl")
    ),

    status
  };
}

// ========================================
// ORGANIZATION COLUMNS
// ========================================

const organizationFields = [
  "organization_code",
  "organization_name",
  "license_organization",
  "reporting_currency_id",
  "org_type_id",
  "industry_id",
  "registration_number",
  "date_of_incorporation",
  "tax_id",
  "registered_address",
  "country_id",
  "state_id",
  "city_id",
  "pincode",
  "phone",
  "email",
  "website",
  "logo_url",
  "status"
];

// ========================================
// ORGANIZATION SELECT QUERY
// ========================================

const organizationSelect = `
  SELECT
    o.*,
    rc.currency_code,
    rc.currency_name,
    rc.currency_code AS currency
  FROM public.organization AS o
  LEFT JOIN public.reporting_currency AS rc
    ON rc.id = o.reporting_currency_id
`;

async function getOrganization(id) {
  const result = await db.query(
    `${organizationSelect} WHERE o.id = $1`,
    [id]
  );

  return result.rows[0] || null;
}

// ========================================
// ERROR HANDLING
// ========================================

function apiError(res, error, defaultMessage) {
  console.error("API error:", error);

  const validation =
    /^(Organization Code|Organization Name|Status|Invalid database ID)/.test(
      error.message || ""
    );

  if (validation) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  if (error.code === "23505") {
    return res.status(409).json({
      success: false,
      message: "Organization Code already exists."
    });
  }

  if (error.code === "23503") {
    return res.status(409).json({
      success: false,
      message:
        "This record is referenced by another record or has an invalid reference."
    });
  }

  return res.status(500).json({
    success: false,
    message: defaultMessage
  });
}

// ========================================
// HOME API
// ========================================

app.get("/", (req, res) => {
  res.send("150CHF PostgreSQL backend is running!");
});

// ========================================
// TEST BODY API
// ========================================

app.post("/api/test-body", (req, res) => {
  res.json({
    success: true,
    body: req.body
  });
});

// ========================================
// HEALTH CHECK API
// ========================================

app.get("/api/health", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT current_database() AS database, current_schema() AS schema"
    );

    res.json({
      status: "OK",
      database: result.rows[0].database,
      schema: result.rows[0].schema
    });
  } catch (error) {
    apiError(res, error, "Database operation failed.");
  }
});

// ========================================
// DATABASE TEST API
// ========================================

app.get("/api/db-test", async (req, res) => {
  try {
    const result = await db.query(
      'SELECT current_database() AS "databaseName"'
    );

    res.json({
      success: true,
      message: "PostgreSQL connected successfully!",
      database: result.rows[0].databaseName
    });
  } catch (error) {
    apiError(res, error, "Database connection failed.");
  }
});

// ========================================
// // ========================================
// COUNTRY LOOKUP - POSTGRESQL
// ========================================

console.log("COUNTRY API REGISTERED SUCCESSFULLY");

app.get("/api/lookups/countries", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        id,
        country_code_iso3 AS country_code,
        country_name,
        status
      FROM public.country_master
      ORDER BY country_name
    `);

    res.json(result.rows);
  } catch (error) {
    apiError(res, error, "Could not load countries.");
  }
});


// ========================================
// REPORTING CURRENCY LOOKUP - POSTGRESQL
// ========================================

app.get("/api/lookups/reporting-currencies", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        id,
        currency_code,
        currency_name,
        status
      FROM public.reporting_currency
      ORDER BY currency_code
    `);

    res.json(result.rows);
  } catch (error) {
    apiError(res, error, "Could not load reporting currencies.");
  }
});


 // ===== INDUSTRY LOOKUP - POSTGRESQL =====

app.get("/api/lookups/industries", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        id,
        industry_code,
        industry_name,
        status
      FROM public.industry_master
      ORDER BY industry_name
    `);

    res.json(result.rows);
  } catch (error) {
    apiError(res, error, "Could not load industries.");
  }
});

// ===== [INDUSTRY-API-02 | Create Industry Master] =====

app.post("/api/lookups/industries", async (req, res) => {
  try {
    const { industry_code, industry_name, status = "Active" } = req.body || {};

    const code = String(industry_code ?? "").trim();
    const name = String(industry_name ?? "").trim();

    if (!code || !name) {
      return res.status(400).json({
        message: "Industry Code and Industry Name are required."
      });
    }

    if (code.length > 30 || name.length > 150) {
      return res.status(400).json({
        message: "Industry Code or Name is too long."
      });
    }

    if (!["Active", "Inactive"].includes(status)) {
      return res.status(400).json({
        message: "Invalid industry status."
      });
    }

    const duplicate = await db.query(
      `SELECT id FROM public.industry_master
       WHERE LOWER(industry_code) = LOWER($1)
       LIMIT 1`,
      [code]
    );

    if (duplicate.rows.length > 0) {
      return res.status(409).json({
        message: "Industry Code already exists."
      });
    }

    const result = await db.query(
      `INSERT INTO public.industry_master
       (industry_code, industry_name, status)
       VALUES ($1, $2, $3)
       RETURNING id, industry_code, industry_name, status`,
      [code, name, status]
    );

    return res.status(201).json(result.rows[0]);

  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "Industry already exists."
      });
    }

    apiError(res, error, "Could not create industry.");
  }
});

// ========================================
// ORGANIZATION: GET ALL
// ========================================

app.get("/api/organizations", async (req, res) => {
  try {
    const result = await db.query(`
      ${organizationSelect}
      ORDER BY o.id DESC
    `);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    apiError(res, error, "Could not load organizations.");
  }
});


 // ===== ORGANIZATION TYPE LOOKUP - POSTGRESQL =====

app.get("/api/lookups/organization-types", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        id,
        type_code,
        type_name,
        status
      FROM public.organization_type_master
      ORDER BY type_name
    `);

    res.json(result.rows);
  } catch (error) {
    apiError(res, error, "Could not load organization types.");
  }
});

// ===== [ORG-TYPE-API-02 | Create Organization Type] =====

app.post("/api/lookups/organization-types", async (req, res) => {
  try {
    const { type_code, type_name, status = "Active" } = req.body || {};

    const code = String(type_code ?? "").trim();
    const name = String(type_name ?? "").trim();

    if (!code || !name) {
      return res.status(400).json({
        message: "Organization Type Code and Name are required."
      });
    }

    if (code.length > 30 || name.length > 150) {
      return res.status(400).json({
        message: "Organization Type Code or Name is too long."
      });
    }

    if (!["Active", "Inactive"].includes(status)) {
      return res.status(400).json({
        message: "Invalid organization type status."
      });
    }

    const duplicate = await db.query(
      `SELECT id FROM public.organization_type_master
       WHERE LOWER(type_code) = LOWER($1)
       LIMIT 1`,
      [code]
    );

    if (duplicate.rows.length > 0) {
      return res.status(409).json({
        message: "Organization Type Code already exists."
      });
    }

    const result = await db.query(
      `INSERT INTO public.organization_type_master
       (type_code, type_name, status)
       VALUES ($1, $2, $3)
       RETURNING id, type_code, type_name, status`,
      [code, name, status]
    );

    return res.status(201).json(result.rows[0]);

  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "Organization Type already exists."
      });
    }

    apiError(res, error, "Could not create organization type.");
  }
});
// ===== [GEO-LOOKUP-API-01 | State / Province lookup] =====
// Uses SELECT * because state_master's exact display-column names
// still need confirmation; normalize the response without changing DB schema.
app.get("/api/lookups/states", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM public.state_master ORDER BY id");
    res.json(result.rows.map(item => ({
      id: item.id,
      code: item.state_code ?? item.province_code ?? item.code ?? "",
      name: item.state_name ?? item.province_name ?? item.name ?? "",
      status: item.status ?? "",
      country_id: item.country_id ?? null
    })));
  } catch (error) {
    apiError(res, error, "Could not load states.");
  }
});

// ===== [GEO-LOOKUP-API-02 | City lookup] =====
app.get("/api/lookups/cities", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, city_code AS code, city_name AS name,
             status, state_id, country_id
      FROM public.city_master
      ORDER BY city_name
    `);
    res.json(result.rows);
  } catch (error) {
    apiError(res, error, "Could not load cities.");
  }
});

// ========================================
// ORGANIZATION: GET ONE
// ========================================

app.get("/api/organizations/:id", async (req, res) => {
  try {
    const id = nullableId(req.params.id);

    const org = await getOrganization(id);

    if (!org) {
      return res.status(404).json({
        success: false,
        message: "Organization not found."
      });
    }

    res.json({
      success: true,
      data: org
    });
  } catch (error) {
    apiError(res, error, "Could not load organization.");
  }
});

// ========================================
// ORGANIZATION: CREATE
// ========================================

app.post("/api/organizations", async (req, res) => {
  try {
    console.log("POST /api/organizations body:", req.body);

    const org = normalizeOrganizationInput(req.body);

    const placeholders = organizationFields
      .map((_, i) => `$${i + 1}`)
      .join(", ");

    const sql = `
      INSERT INTO public.organization (
        ${organizationFields.join(", ")}
      )
      VALUES (${placeholders})
      RETURNING id
    `;

    const values = organizationFields.map(
      (field) => org[field]
    );

    const result = await db.query(sql, values);

    const saved = await getOrganization(
      result.rows[0].id
    );

    res.status(201).json({
      success: true,
      message: "Organization saved successfully!",
      data: saved
    });
  } catch (error) {
    apiError(res, error, "Could not save organization.");
  }
});

// ========================================
// ORGANIZATION: UPDATE
// ========================================

app.put("/api/organizations/:id", async (req, res) => {
  try {
    const id = nullableId(req.params.id);

    console.log("PUT organization ID:", id);
    console.log("PUT organization body:", req.body);

    const org = normalizeOrganizationInput(req.body);

    const assignments = organizationFields
      .map((field, i) => `${field} = $${i + 1}`)
      .join(", ");

    const sql = `
      UPDATE public.organization
      SET
        ${assignments},
        updated_date = CURRENT_TIMESTAMP
      WHERE id = $${organizationFields.length + 1}
      RETURNING id
    `;

    const values = [
      ...organizationFields.map((field) => org[field]),
      id
    ];

    const result = await db.query(sql, values);

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Organization not found."
      });
    }

    const saved = await getOrganization(id);

    res.json({
      success: true,
      message: "Organization updated successfully.",
      data: saved,
      affectedRows: result.rowCount
    });
  } catch (error) {
    apiError(res, error, "Could not update organization.");
  }
});

// ========================================
// ORGANIZATION: DELETE
// ========================================

app.delete("/api/organizations/:id", async (req, res) => {
  try {
    const id = nullableId(req.params.id);

    const result = await db.query(
      "DELETE FROM public.organization WHERE id = $1 RETURNING id",
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Organization not found."
      });
    }

    res.json({
      success: true,
      message: "Organization deleted successfully.",
      deletedId: id
    });
  } catch (error) {
    apiError(res, error, "Could not delete organization.");
  }
});

// ========================================
// BOOKING: CREATE
// ========================================

app.post("/api/bookings", async (req, res) => {
  try {
    console.log("POST /api/bookings body:", req.body);

    const {
      organization_id,
      booking_type,
      origin,
      destination,
      cargo_description,
      cargo_weight,
      container_type,
      container_quantity,
      service_type,
      pickup_date,
      delivery_date,
      status
    } = req.body;

    if (
      typeof origin !== "string" ||
      !origin.trim() ||
      typeof destination !== "string" ||
      !destination.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Origin and destination are required."
      });
    }

    const weight =
      cargo_weight == null || cargo_weight === ""
        ? null
        : Number(cargo_weight);

    const quantity =
      container_quantity == null || container_quantity === ""
        ? null
        : Number(container_quantity);

    if (
      weight !== null &&
      (!Number.isFinite(weight) || weight < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Cargo weight must be a valid non-negative number."
      });
    }

    if (
      quantity !== null &&
      (!Number.isInteger(quantity) || quantity < 1)
    ) {
      return res.status(400).json({
        success: false,
        message: "Container quantity must be a positive whole number."
      });
    }

    const orgId = nullableId(organization_id);

    const bookingReference =
      "BKG-" +
      Date.now() +
      "-" +
      Math.floor(100 + Math.random() * 900);

    const sql = `
      INSERT INTO public.bookings (
        booking_reference,
        organization_id,
        booking_type,
        origin,
        destination,
        cargo_description,
        cargo_weight,
        container_type,
        container_quantity,
        service_type,
        pickup_date,
        delivery_date,
        status
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13
      )
      RETURNING id
    `;

    const values = [
      bookingReference,
      orgId,
      nullableText(booking_type),
      origin.trim(),
      destination.trim(),
      nullableText(cargo_description),
      weight,
      nullableText(container_type),
      quantity,
      nullableText(service_type),
      nullableText(pickup_date),
      nullableText(delivery_date),
      status || "Draft"
    ];

    const result = await db.query(sql, values);

    res.status(201).json({
      success: true,
      message: "Booking saved successfully!",
      id: result.rows[0].id,
      booking_reference: bookingReference
    });
  } catch (error) {
    apiError(res, error, "Could not save booking details.");
  }
});

// ===== [DEPT-API-REGISTER-01 | Department Routes] =====

const departmentRoutes = require("./departmentRoutes");

app.use("/api", departmentRoutes);
app.use("/api", countryRoutes);
// ========================================
// UNKNOWN API ROUTES
// ========================================

app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`
  });
});

// ========================================
// GLOBAL ERROR HANDLER
// ========================================

app.use((error, req, res, next) => {
  console.error("Unhandled server error:", error);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    success: false,
    message: "Internal server error."
  });
});

// ========================================
// START SERVER
// ========================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `150CHF PostgreSQL backend running at http://localhost:${PORT}`
  );
});
