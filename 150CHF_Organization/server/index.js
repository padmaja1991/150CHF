
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';
import { z } from 'zod';
import { createDepartmentRoutes } from './modules/departments/departmentRoutes.js';
import { createCompanyRoutes } from './modules/companies/companyRoutes.js';
dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4100);

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME || '150chf_db',
  max: 5
});

app.use(cors());
app.use(express.json({ limit: '6mb' }));

// =====================================================
// DEPARTMENT MODULE — DATABASE API ROUTES
// =====================================================
app.use('/api/departments', createDepartmentRoutes(pool));

// =====================================================
// COMPANY MODULE — DATABASE API ROUTES
// =====================================================
app.use('/api/companies', createCompanyRoutes(pool));

// =====================================================
// ERROR HANDLING AND VALIDATION
// =====================================================

const errorMessage = (error) =>
  error instanceof Error
    ? error.message
    : String(error || 'Database request failed.');

const optionalText = (max) =>
  z.preprocess(
    (v) => v == null ? '' : v,
    z.string().trim().max(max).default('')
  );

const organizationSchema = z.object({
  code: z.string().trim().min(1).max(30),
  name: z.string().trim().min(1).max(191),
  licenseOrganization: z.boolean().default(false),
  reportingCurrency: optionalText(100),
  orgType: optionalText(100),
  industry: optionalText(100),
  registrationNumber: optionalText(100),
  dateOfIncorporation: optionalText(20),
  taxId: optionalText(100),
  registeredAddress: optionalText(255),
  country: optionalText(100),
  state: optionalText(100),
  city: optionalText(100),
  pincode: optionalText(20),
  phone: optionalText(50),
  email: optionalText(191),
  website: optionalText(191),
  imageDataUrl: z.preprocess(
    (v) => v == null ? '' : v,
    z.string().max(5_000_000).default('')
  ),
  status: z.enum(['Active', 'Inactive']).default('Active')
});

const querySchema = z.object({
  code: z.string().trim().max(30).default(''),
  name: z.string().trim().max(191).default(''),
  status: z.enum(['Select', 'Active', 'Inactive'])
    .default('Select'),
  page: z.coerce.number().int().min(1).default(1),
  linesPerPage: z.coerce.number()
    .int().min(1).max(10000).default(10)
});

const idSchema = z.coerce.number().int().positive();

const db = (sql, values = [], client = pool) =>
  client.query(sql, values);

const normalize = (v) => String(v ?? '').trim();
const clean = (v) => normalize(v) || null;

class InputError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function sendError(res, error) {
  console.error('API error:', error);

  const status =
    error instanceof z.ZodError ||
    error?.code === '22P02' ||
    error?.code === '22007'
      ? 400
      : error instanceof InputError
        ? error.status
        : error?.code === '23505' ||
          error?.code === '23503'
          ? 409
          : 500;

  const message =
    error instanceof z.ZodError
      ? error.issues.map(
          i => `${i.path.join('.')}: ${i.message}`
        ).join('; ')
      : error?.code === '23505'
        ? 'A duplicate organization value already exists.'
        : error?.code === '23503'
          ? 'This record is referenced by another record or master data is invalid.'
          : errorMessage(error);

  res.status(status).json({ message });
}

// =====================================================
// REUSABLE POSTGRESQL MASTER LOOKUPS
// =====================================================

const lookupDefinitions = {
  currencies: {
    table: 'reporting_currency',
    code: 'currency_code',
    name: 'currency_name'
  },
  industries: {
    table: 'industry_master',
    code: 'industry_code',
    name: 'industry_name'
  },
  'organization-types': {
    table: 'organization_type_master',
    code: 'type_code',
    name: 'type_name'
  },
  countries: {
    table: 'country_master',
    code: 'country_code_iso2',
    name: 'country_name'
  },
  states: {
    table: 'state_master',
    code: 'state_code',
    name: 'state_name'
  },
  cities: {
    table: 'city_master',
    code: 'city_code',
    name: 'city_name'
  }
};

// =====================================================
// DATABASE HEALTH
// =====================================================

app.get('/api/health', async (_req, res) => {
  try {
    await db('SELECT 1');

    res.json({
      ok: true,
      message: 'Database connected'
    });
  } catch (error) {
    sendError(res, error);
  }
});

// =====================================================
// ORGANIZATION SUMMARY
// =====================================================

app.get('/api/summary', async (_req, res) => {
  try {
    const { rows } = await db(`
      SELECT
        COUNT(*)::integer AS total,
        COUNT(*) FILTER (
          WHERE status = 'Active'
        )::integer AS active,
        COUNT(*) FILTER (
          WHERE status = 'Inactive'
        )::integer AS inactive
      FROM organization
    `);

    res.json(rows[0]);
  } catch (error) {
    sendError(res, error);
  }
});

// =====================================================
// GENERIC MASTER LOOKUP API
// =====================================================

for (const [route, definition] of
  Object.entries(lookupDefinitions)) {

  app.get(`/api/${route}`, async (req, res) => {
    try {
      const { table, code, name } = definition;

      let where = '';
      const values = [];

      if (route === 'states') {
        const country = clean(
          req.query.countryCode ||
          req.query.countryId
        );

        if (!country) return res.json([]);

        values.push(country);

        where = `
          WHERE country_id = (
            SELECT id
            FROM country_master
            WHERE
              LOWER(country_code_iso2) = LOWER($1)
              OR CAST(id AS TEXT) = $1
            LIMIT 1
          )
        `;
      }

      if (route === 'cities') {
        const country = clean(
          req.query.countryCode ||
          req.query.countryId
        );

        const state = clean(
          req.query.stateCode ||
          req.query.stateId
        );

        if (!country || !state) {
          return res.json([]);
        }

        values.push(country, state);

        where = `
          WHERE state_id = (
            SELECT s.id
            FROM state_master s
            JOIN country_master c
              ON c.id = s.country_id
            WHERE (
              LOWER(c.country_code_iso2) = LOWER($1)
              OR CAST(c.id AS TEXT) = $1
            )
            AND (
              LOWER(s.state_code) = LOWER($2)
              OR LOWER(s.state_name) = LOWER($2)
              OR CAST(s.id AS TEXT) = $2
            )
            LIMIT 1
          )
        `;
      }

      const { rows } = await db(`
        SELECT
          id,
          ${code} AS code,
          ${name} AS name,
          status
        FROM ${table}
        ${where}
        ORDER BY ${name}
      `, values);

      res.json(rows);
    } catch (error) {
      sendError(res, error);
    }
  });
}

// =====================================================
// EXISTING CURRENCY LOOKUP COMPATIBILITY
// =====================================================

app.get(
  '/api/lookups/reporting-currencies',
  async (_req, res) => {
    try {
      const { rows } = await db(`
        SELECT
          id,
          currency_code AS code,
          currency_name AS name,
          status
        FROM reporting_currency
        ORDER BY currency_name
      `);

      res.json(rows);
    } catch (error) {
      sendError(res, error);
    }
  }
);

// =====================================================
// REUSABLE ORGANIZATION SELECT
// =====================================================

const organizationSelect = `
  SELECT
    o.id,
    o.organization_code AS code,
    o.organization_name AS name,

    (o.license_organization <> 0)
      AS "licenseOrganization",

    COALESCE(rc.currency_code, '')
      AS "reportingCurrency",

    COALESCE(ot.type_name, '')
      AS "orgType",

    COALESCE(i.industry_name, '')
      AS industry,

    COALESCE(o.registration_number, '')
      AS "registrationNumber",

    TO_CHAR(
      o.date_of_incorporation,
      'YYYY-MM-DD'
    ) AS "dateOfIncorporation",

    COALESCE(o.tax_id, '')
      AS "taxId",

    COALESCE(o.registered_address, '')
      AS "registeredAddress",

    COALESCE(c.country_name, '')
      AS country,

    COALESCE(s.state_name, '')
      AS state,

    COALESCE(ci.city_name, '')
      AS city,

    COALESCE(o.pincode, '')
      AS pincode,

    COALESCE(o.phone, '')
      AS phone,

    COALESCE(o.email, '')
      AS email,

    COALESCE(o.website, '')
      AS website,

    COALESCE(o.logo_url, '')
      AS "imageDataUrl",

    o.status

  FROM organization o

  LEFT JOIN reporting_currency rc
    ON rc.id = o.reporting_currency_id

  LEFT JOIN organization_type_master ot
    ON ot.id = o.org_type_id

  LEFT JOIN industry_master i
    ON i.id = o.industry_id

  LEFT JOIN country_master c
    ON c.id = o.country_id

  LEFT JOIN state_master s
    ON s.id = o.state_id

  LEFT JOIN city_master ci
    ON ci.id = o.city_id
`;

// =====================================================
// ORGANIZATION LIST / SEARCH / PAGINATION
// =====================================================

app.get('/api/organizations', async (req, res) => {
  try {
    const {
      code,
      name,
      status,
      page,
      linesPerPage
    } = querySchema.parse(req.query);

    const filters = [];
    const values = [];

    if (code) {
      values.push(`%${code}%`);
      filters.push(
        `o.organization_code ILIKE $${values.length}`
      );
    }

    if (name) {
      values.push(`%${name}%`);
      filters.push(
        `o.organization_name ILIKE $${values.length}`
      );
    }

    if (status !== 'Select') {
      values.push(status);
      filters.push(
        `o.status = $${values.length}`
      );
    }

    const where = filters.length
      ? `WHERE ${filters.join(' AND ')}`
      : '';

    const countResult = await db(`
      SELECT COUNT(*)::integer AS total
      FROM organization o
      ${where}
    `, values);

    const total = countResult.rows[0].total;

    const { rows } = await db(`
      SELECT
        o.id,
        o.organization_code AS code,
        o.organization_name AS name,
        COALESCE(rc.currency_code, '')
          AS currency,
        o.status,
        o.logo_url AS "imageDataUrl"

      FROM organization o

      LEFT JOIN reporting_currency rc
        ON rc.id = o.reporting_currency_id

      ${where}

      ORDER BY
        LOWER(o.organization_code),
        LOWER(o.organization_name),
        o.id

      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `, [
      ...values,
      linesPerPage,
      (page - 1) * linesPerPage
    ]);

    res.json({
      rows,
      total,
      page,
      linesPerPage,
      totalPages: Math.max(
        1,
        Math.ceil(total / linesPerPage)
      )
    });

  } catch (error) {
    sendError(res, error);
  }
});

// =====================================================
// GET SINGLE ORGANIZATION
// =====================================================

app.get('/api/organizations/:id', async (req, res) => {
  try {
    const id = idSchema.parse(req.params.id);

    const { rows } = await db(
      `${organizationSelect}
       WHERE o.id = $1
       LIMIT 1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: 'Organization not found'
      });
    }

    res.json(rows[0]);

  } catch (error) {
    sendError(res, error);
  }
});

// =====================================================
// RESOLVE MASTER TABLE REFERENCES
// =====================================================

async function resolveMaster(
  client,
  table,
  codeColumn,
  nameColumn,
  value,
  label,
  extra = ''
) {
  const input = clean(value);

  if (!input) return null;

  const { rows } = await db(`
    SELECT id
    FROM ${table}
    WHERE (
      LOWER(${codeColumn}) = LOWER($1)
      OR LOWER(${nameColumn}) = LOWER($1)
      OR CAST(id AS TEXT) = $1
    )
    ${extra}
    LIMIT 1
  `, [input], client);

  if (!rows.length) {
    throw new InputError(
      `${label} '${input}' was not found in PostgreSQL master data.`
    );
  }

  return rows[0].id;
}

// =====================================================
// RESOLVE ORGANIZATION FOREIGN KEYS
// =====================================================

async function resolveReferences(client, org) {
  const currencyId = await resolveMaster(
    client,
    'reporting_currency',
    'currency_code',
    'currency_name',
    org.reportingCurrency,
    'Reporting Currency'
  );

  const orgTypeId = await resolveMaster(
    client,
    'organization_type_master',
    'type_code',
    'type_name',
    org.orgType,
    'Organization Type'
  );

  const industryId = await resolveMaster(
    client,
    'industry_master',
    'industry_code',
    'industry_name',
    org.industry,
    'Industry'
  );

  const countryId = await resolveMaster(
    client,
    'country_master',
    'country_code_iso2',
    'country_name',
    org.country,
    'Country'
  );

  let stateId = null;

  if (clean(org.state)) {
    if (!countryId) {
      throw new InputError(
        'Select Country before State/Province.'
      );
    }

    const { rows } = await db(`
      SELECT id
      FROM state_master
      WHERE country_id = $2
        AND (
          LOWER(state_code) = LOWER($1)
          OR LOWER(state_name) = LOWER($1)
          OR CAST(id AS TEXT) = $1
        )
      LIMIT 1
    `, [org.state.trim(), countryId], client);

    if (!rows.length) {
      throw new InputError(
        `State/Province '${org.state}' does not belong to the selected Country.`
      );
    }

    stateId = rows[0].id;
  }

  let cityId = null;

  if (clean(org.city)) {
    if (!countryId || !stateId) {
      throw new InputError(
        'Select Country and State/Province before City.'
      );
    }

    const { rows } = await db(`
      SELECT id
      FROM city_master
      WHERE country_id = $2
        AND state_id = $3
        AND (
          LOWER(city_name) = LOWER($1)
          OR LOWER(COALESCE(city_code, '')) =
            LOWER($1)
          OR CAST(id AS TEXT) = $1
        )
      LIMIT 1
    `, [
      org.city.trim(),
      countryId,
      stateId
    ], client);

    if (!rows.length) {
      throw new InputError(
        `City '${org.city}' does not belong to the selected State/Province.`
      );
    }

    cityId = rows[0].id;
  }

  return {
    currencyId,
    orgTypeId,
    industryId,
    countryId,
    stateId,
    cityId
  };
}

// =====================================================
// DUPLICATE VALIDATION
// =====================================================

async function checkDuplicate(
  client,
  org,
  excludedId = null
) {
  const fields = [
    [
      'organization_code',
      org.code,
      'Organization Code'
    ],
    [
      'organization_name',
      org.name,
      'Organization Name'
    ],
    [
      'registration_number',
      org.registrationNumber,
      'Registration Number'
    ],
    ['phone', org.phone, 'Phone number'],
    ['email', org.email, 'Email']
  ];

  for (const [column, value, label] of fields) {
    if (!clean(value)) continue;

    const { rows } = await db(`
      SELECT id
      FROM organization
      WHERE
        LOWER(TRIM(${column})) =
          LOWER(TRIM($1))
        AND (
          $2::bigint IS NULL
          OR id <> $2::bigint
        )
      LIMIT 1
    `, [value, excludedId], client);

    if (rows.length) {
      throw new InputError(
        `${label} already exists. Enter a unique value.`,
        409
      );
    }
  }
}

// =====================================================
// ORGANIZATION WRITE VALUES
// =====================================================

function organizationValues(org, ids) {
  return [
    org.code,
    org.name,
    org.licenseOrganization ? 1 : 0,
    ids.currencyId,
    ids.orgTypeId,
    ids.industryId,
    clean(org.registrationNumber),
    clean(org.dateOfIncorporation),
    clean(org.taxId),
    clean(org.registeredAddress),
    ids.countryId,
    ids.stateId,
    ids.cityId,
    clean(org.pincode),
    clean(org.phone),
    clean(org.email),
    clean(org.website),
    clean(org.imageDataUrl),
    org.status
  ];
}

const writeColumns = [
  'organization_code',
  'organization_name',
  'license_organization',
  'reporting_currency_id',
  'org_type_id',
  'industry_id',
  'registration_number',
  'date_of_incorporation',
  'tax_id',
  'registered_address',
  'country_id',
  'state_id',
  'city_id',
  'pincode',
  'phone',
  'email',
  'website',
  'logo_url',
  'status'
];

// =====================================================
// CREATE / UPDATE REUSABLE FUNCTION
// =====================================================

async function writeOrganization(req, res, isUpdate) {
  let client;

  try {
    const org = organizationSchema.parse(req.body);

    const id = isUpdate
      ? idSchema.parse(req.params.id)
      : null;

    client = await pool.connect();

    await client.query('BEGIN');

    if (isUpdate) {
      const found = await db(`
        SELECT id
        FROM organization
        WHERE id = $1
        FOR UPDATE
      `, [id], client);

      if (!found.rows.length) {
        throw new InputError(
          'Organization not found',
          404
        );
      }
    }

    await checkDuplicate(client, org, id);

    const refs = await resolveReferences(
      client,
      org
    );

    const values = organizationValues(
      org,
      refs
    );

    let result;

    if (isUpdate) {
      const assignments = writeColumns
        .map(
          (column, i) =>
            `${column} = $${i + 1}`
        )
        .join(', ');

      result = await db(`
        UPDATE organization
        SET ${assignments}
        WHERE id = $${values.length + 1}
        RETURNING id
      `, [...values, id], client);

    } else {
      const placeholders = writeColumns
        .map((_, i) => `$${i + 1}`)
        .join(', ');

      result = await db(`
        INSERT INTO organization (
          ${writeColumns.join(', ')}
        )
        VALUES (${placeholders})
        RETURNING id
      `, values, client);
    }

    await client.query('COMMIT');

    res.status(isUpdate ? 200 : 201).json({
      id: result.rows[0].id,
      message: isUpdate
        ? 'Organization updated'
        : 'Organization created'
    });

  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error(
          'Rollback failed:',
          rollbackError
        );
      }
    }

    sendError(res, error);

  } finally {
    if (client) client.release();
  }
}

// =====================================================
// CREATE ORGANIZATION
// =====================================================

app.post('/api/organizations', (req, res) => {
  writeOrganization(req, res, false);
});

// =====================================================
// UPDATE ORGANIZATION
// =====================================================

app.put('/api/organizations/:id', (req, res) => {
  writeOrganization(req, res, true);
});

// =====================================================
// DELETE ORGANIZATION
// =====================================================

app.delete('/api/organizations/:id', async (req, res) => {
  try {
    const id = idSchema.parse(req.params.id);

    const result = await db(`
      DELETE FROM organization
      WHERE id = $1
      RETURNING id
    `, [id]);

    if (!result.rowCount) {
      return res.status(404).json({
        message: 'Organization not found'
      });
    }

    res.json({
      message: 'Organization deleted'
    });

  } catch (error) {
    sendError(res, error);
  }
});

// =====================================================
// START BACKEND SERVER
// =====================================================

// Schema migrations should be reviewed and executed
// separately, not on each server startup.

const server = app.listen(port, () => {
  console.log(
    `Server running on http://localhost:${port}`
  );
});

server.on('error', (error) => {
  console.error(
    'Unable to start API server:',
    errorMessage(error)
  );
});
