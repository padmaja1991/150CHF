
import { Router } from 'express';

/* =========================================================
   150CHF — COMPANY BACKEND
   CRUD, Search, Sorting, Pagination, Validation and Lookups
   Uses the existing PostgreSQL company table.
   ========================================================= */

export function createCompanyRoutes(pool) {
  const router = Router();

  // =====================================================
  // SECTION 1 — COMMON HELPERS
  // =====================================================

  const clean = (value) => String(value ?? '').trim();

  const isId = (value) =>
    /^\d+$/.test(clean(value)) &&
    Number.isSafeInteger(Number(value)) &&
    Number(value) > 0;

  const idOrNull = (value) =>
    clean(value) === '' ? null : Number(value);

  const badRequest = (res, message) =>
    res.status(400).json({ message });

  function handleError(res, error, fallback) {
    console.error(`Company API: ${fallback}`, error);

    if (error.code === '23505') {
      return res.status(409).json({
        message:
          'Company Code already exists for this Organization.'
      });
    }

    if (error.code === '23503') {
      return res.status(409).json({
        message:
          'Invalid master reference or this Company is used by another record.'
      });
    }

    if (error.code === '23502') {
      return badRequest(
        res,
        `Required field is missing: ${error.column || 'unknown'}.`
      );
    }

    if (error.code === '22001') {
      return badRequest(
        res,
        'One or more values are too long for the database column.'
      );
    }

    return res.status(500).json({
      message: fallback
    });
  }

  // =====================================================
  // SECTION 2 — COMMON COMPANY SELECT
  // =====================================================

  const companySelect = `
    SELECT
      c.id,

      c.company_code AS code,
      c.company_name AS name,

      c.organization_id AS "organizationId",

      COALESCE(o.organization_name, '')
        AS "organizationName",

      COALESCE(o.organization_code, '')
        AS "organizationCode",

      COALESCE(c.registration_number, '')
        AS "registrationNumber",

      c.reporting_currency_id
        AS "reportingCurrencyId",

      COALESCE(rc.currency_code, '')
        AS "reportingCurrency",

      COALESCE(rc.currency_code, '')
        AS currency,

      COALESCE(c.address, '')
        AS address,

      c.state_id AS "stateId",

      COALESCE(s.state_name, '')
        AS "stateName",

      c.city_id AS "cityId",

      COALESCE(ci.city_name, '')
        AS "cityName",

      COALESCE(c.postal_code, '')
        AS "postalCode",

      COALESCE(c.logo_url, '')
        AS "logoUrl",

      c.status

    FROM public.company c

    LEFT JOIN public.organization o
      ON o.id = c.organization_id

    LEFT JOIN public.reporting_currency rc
      ON rc.id = c.reporting_currency_id

    LEFT JOIN public.state_master s
      ON s.id = c.state_id

    LEFT JOIN public.city_master ci
      ON ci.id = c.city_id
  `;

  // =====================================================
  // SECTION 3 — COMPANY MASTER LOOKUPS
  // =====================================================

  router.get('/lookups', async (req, res) => {
    try {
      const kind = clean(req.query.kind);

      let sql;
      let params = [];

      if (kind === 'organizations') {
        sql = `
          SELECT
            id,
            organization_code AS code,
            organization_name AS name,
            status
          FROM public.organization
          ORDER BY organization_name
          LIMIT 500
        `;

      } else if (kind === 'currencies') {
        sql = `
          SELECT
            id,
            currency_code AS code,
            currency_name AS name,
            status
          FROM public.reporting_currency
          ORDER BY currency_name
          LIMIT 500
        `;

      } else if (kind === 'states') {
        sql = `
          SELECT
            id,
            state_code AS code,
            state_name AS name,
            status
          FROM public.state_master
          ORDER BY state_name
          LIMIT 500
        `;

      } else if (kind === 'cities') {
        if (!isId(req.query.stateId)) {
          return badRequest(
            res,
            'Select a State before City.'
          );
        }

        sql = `
          SELECT
            id,
            city_code AS code,
            city_name AS name,
            status
          FROM public.city_master
          WHERE state_id = $1
          ORDER BY city_name
          LIMIT 500
        `;

        params = [Number(req.query.stateId)];

      } else {
        return badRequest(
          res,
          'Invalid Company lookup type.'
        );
      }

      const result = await pool.query(sql, params);

      return res.json({
        rows: result.rows
      });

    } catch (error) {
      return handleError(
        res,
        error,
        'Unable to load Company lookup.'
      );
    }
  });

  // =====================================================
  // SECTION 4 — LIST, SEARCH, SORTING, PAGINATION
  // =====================================================

  router.get('/', async (req, res) => {
    try {
      const code = clean(req.query.code);
      const name = clean(req.query.name);
      const status = clean(
        req.query.status || 'Select'
      );

      if (!['Select', 'Active', 'Inactive'].includes(status)) {
        return badRequest(
          res,
          'Invalid Company status.'
        );
      }

      const page = Number(req.query.page ?? 1);
      const linesPerPage = Number(
        req.query.linesPerPage ?? 10
      );

      if (
        !Number.isInteger(page) ||
        page < 1 ||
        !Number.isInteger(linesPerPage) ||
        linesPerPage < 1 ||
        linesPerPage > 10000
      ) {
        return badRequest(
          res,
          'Invalid page or linesPerPage.'
        );
      }

      // Allowed sorting columns
      const sorts = {
        code: 'c.company_code',
        name: 'c.company_name',
        organizationName: 'o.organization_name',
        currency: 'rc.currency_code',
        status: 'c.status'
      };

      const sortBy = clean(req.query.sortBy || 'code');

      const sortDirection = clean(
        req.query.sortDirection || 'asc'
      ).toLowerCase();

      if (
        !Object.prototype.hasOwnProperty.call(sorts, sortBy) ||
        !['asc', 'desc'].includes(sortDirection)
      ) {
        return badRequest(
          res,
          'Invalid sort field or direction.'
        );
      }

      const values = [];
      const conditions = [];

      // Search by Company Code
      if (code) {
        values.push(`%${code}%`);

        conditions.push(
          `c.company_code ILIKE $${values.length}`
        );
      }

      // Search by Company Name
      if (name) {
        values.push(`%${name}%`);

        conditions.push(
          `c.company_name ILIKE $${values.length}`
        );
      }

      // Search by Status
      if (status !== 'Select') {
        values.push(status);

        conditions.push(
          `c.status = $${values.length}`
        );
      }

      // Optional Organization filter
      if (clean(req.query.organizationId)) {
        if (!isId(req.query.organizationId)) {
          return badRequest(
            res,
            'Invalid Organization ID.'
          );
        }

        values.push(Number(req.query.organizationId));

        conditions.push(
          `c.organization_id = $${values.length}`
        );
      }

      const where = conditions.length
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

      // Count matching records
      const count = await pool.query(
        `
          SELECT COUNT(*)::integer AS total
          FROM public.company c
          ${where}
        `,
        values
      );

      const total = count.rows[0].total;

      // Fetch paginated records
      const rows = await pool.query(
        `
          ${companySelect}
          ${where}

          ORDER BY
            LOWER(${sorts[sortBy]})
              ${sortDirection.toUpperCase()},
            c.id

          LIMIT $${values.length + 1}
          OFFSET $${values.length + 2}
        `,
        [
          ...values,
          linesPerPage,
          (page - 1) * linesPerPage
        ]
      );

      return res.json({
        rows: rows.rows,
        total,
        page,
        linesPerPage,
        totalPages: Math.max(
          1,
          Math.ceil(total / linesPerPage)
        )
      });

    } catch (error) {
      return handleError(
        res,
        error,
        'Unable to load companies.'
      );
    }
  });

  // =====================================================
  // SECTION 5 — COMPANY INPUT VALIDATION
  // =====================================================

  function parseCompany(body, res) {
    const value = {
      code: clean(body?.code),
      name: clean(body?.name),

      organizationId: body?.organizationId,

      registrationNumber:
        clean(body?.registrationNumber) || null,

      reportingCurrencyId:
        body?.reportingCurrencyId,

      address: clean(body?.address) || null,

      stateId: body?.stateId,
      cityId: body?.cityId,

      postalCode:
        clean(body?.postalCode) || null,

      logoUrl:
        clean(body?.logoUrl) || null,

      status:
        clean(body?.status || 'Active')
    };

    // Required fields
    if (
      !value.code ||
      !value.name ||
      !isId(value.organizationId)
    ) {
      badRequest(
        res,
        'Company Code, Name, and Organization are required.'
      );

      return null;
    }

    // Status validation
    if (!['Active', 'Inactive'].includes(value.status)) {
      badRequest(
        res,
        'Invalid Company status.'
      );

      return null;
    }

    // Optional foreign key validation
    for (const field of [
      'reportingCurrencyId',
      'stateId',
      'cityId'
    ]) {
      if (
        clean(value[field]) &&
        !isId(value[field])
      ) {
        badRequest(
          res,
          `Invalid ${field}.`
        );

        return null;
      }
    }

    return {
      ...value,

      organizationId:
        Number(value.organizationId),

      reportingCurrencyId:
        idOrNull(value.reportingCurrencyId),

      stateId:
        idOrNull(value.stateId),

      cityId:
        idOrNull(value.cityId)
    };
  }

  // =====================================================
  // SECTION 6 — VALIDATE FOREIGN KEY REFERENCES
  // =====================================================

  async function validateReferences(data, res, client) {

    // Check Organization
    const organization = await client.query(
      `
        SELECT id
        FROM public.organization
        WHERE id = $1
      `,
      [data.organizationId]
    );

    if (!organization.rowCount) {
      badRequest(
        res,
        'Selected Organization does not exist.'
      );

      return false;
    }

    // Check Reporting Currency
    if (data.reportingCurrencyId !== null) {
      const currency = await client.query(
        `
          SELECT id
          FROM public.reporting_currency
          WHERE id = $1
        `,
        [data.reportingCurrencyId]
      );

      if (!currency.rowCount) {
        badRequest(
          res,
          'Selected Reporting Currency does not exist.'
        );

        return false;
      }
    }

    // Check State
    if (data.stateId !== null) {
      const state = await client.query(
        `
          SELECT id
          FROM public.state_master
          WHERE id = $1
        `,
        [data.stateId]
      );

      if (!state.rowCount) {
        badRequest(
          res,
          'Selected State does not exist.'
        );

        return false;
      }
    }

    // Check City belongs to State
    if (data.cityId !== null) {
      if (data.stateId === null) {
        badRequest(
          res,
          'Select State before City.'
        );

        return false;
      }

      const city = await client.query(
        `
          SELECT id
          FROM public.city_master
          WHERE id = $1
            AND state_id = $2
        `,
        [
          data.cityId,
          data.stateId
        ]
      );

      if (!city.rowCount) {
        badRequest(
          res,
          'Selected City does not belong to the selected State.'
        );

        return false;
      }
    }

    return true;
  }

  // =====================================================
  // SECTION 7 — DUPLICATE COMPANY CODE CHECK
  // =====================================================

  async function duplicateCode(
    data,
    excludedId,
    client
  ) {
    const result = await client.query(
      `
        SELECT id
        FROM public.company
        WHERE organization_id = $1
          AND LOWER(TRIM(company_code))
              = LOWER(TRIM($2))
          AND (
            $3::bigint IS NULL
            OR id <> $3::bigint
          )
        LIMIT 1
      `,
      [
        data.organizationId,
        data.code,
        excludedId
      ]
    );

    return result.rowCount > 0;
  }

  // =====================================================
  // SECTION 8 — CREATE COMPANY
  // =====================================================

  router.post('/', async (req, res) => {
    const data = parseCompany(req.body, res);

    if (!data) return;

    let client;

    try {
      client = await pool.connect();

      await client.query('BEGIN');

      // Validate foreign keys
      if (!(await validateReferences(data, res, client))) {
        await client.query('ROLLBACK');
        return;
      }

      // Duplicate Company Code
      if (await duplicateCode(data, null, client)) {
        await client.query('ROLLBACK');

        return res.status(409).json({
          message:
            'Company Code already exists for this Organization.'
        });
      }

      // Insert Company
      const result = await client.query(
        `
          INSERT INTO public.company (
            company_code,
            company_name,
            organization_id,
            registration_number,
            reporting_currency_id,
            address,
            state_id,
            city_id,
            postal_code,
            logo_url,
            status
          )
          VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11
          )
          RETURNING id
        `,
        [
          data.code,
          data.name,
          data.organizationId,
          data.registrationNumber,
          data.reportingCurrencyId,
          data.address,
          data.stateId,
          data.cityId,
          data.postalCode,
          data.logoUrl,
          data.status
        ]
      );

      await client.query('COMMIT');

      return res.status(201).json({
        id: result.rows[0].id,
        message: 'Company created.'
      });

    } catch (error) {
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error(
            'Company rollback failed',
            rollbackError
          );
        }
      }

      return handleError(
        res,
        error,
        'Unable to create company.'
      );

    } finally {
      if (client) client.release();
    }
  });

  // =====================================================
  // SECTION 9 — GET SINGLE COMPANY
  // =====================================================

  router.get('/:id', async (req, res) => {
    if (!isId(req.params.id)) {
      return badRequest(
        res,
        'Invalid Company ID.'
      );
    }

    try {
      const result = await pool.query(
        `
          ${companySelect}
          WHERE c.id = $1
        `,
        [Number(req.params.id)]
      );

      if (!result.rowCount) {
        return res.status(404).json({
          message: 'Company not found.'
        });
      }

      return res.json(result.rows[0]);

    } catch (error) {
      return handleError(
        res,
        error,
        'Unable to load company.'
      );
    }
  });

  // =====================================================
  // SECTION 10 — UPDATE COMPANY
  // =====================================================

  router.put('/:id', async (req, res) => {
    if (!isId(req.params.id)) {
      return badRequest(
        res,
        'Invalid Company ID.'
      );
    }

    const data = parseCompany(req.body, res);

    if (!data) return;

    const id = Number(req.params.id);

    let client;

    try {
      client = await pool.connect();

      await client.query('BEGIN');

      // Check existing record
      const existing = await client.query(
        `
          SELECT id
          FROM public.company
          WHERE id = $1
          FOR UPDATE
        `,
        [id]
      );

      if (!existing.rowCount) {
        await client.query('ROLLBACK');

        return res.status(404).json({
          message: 'Company not found.'
        });
      }

      // Validate references
      if (!(await validateReferences(data, res, client))) {
        await client.query('ROLLBACK');
        return;
      }

      // Check duplicate Company Code
      if (await duplicateCode(data, id, client)) {
        await client.query('ROLLBACK');

        return res.status(409).json({
          message:
            'Company Code already exists for this Organization.'
        });
      }

      // Update Company
      await client.query(
        `
          UPDATE public.company
          SET
            company_code = $1,
            company_name = $2,
            organization_id = $3,
            registration_number = $4,
            reporting_currency_id = $5,
            address = $6,
            state_id = $7,
            city_id = $8,
            postal_code = $9,
            logo_url = $10,
            status = $11,
            updated_date = CURRENT_TIMESTAMP
          WHERE id = $12
        `,
        [
          data.code,
          data.name,
          data.organizationId,
          data.registrationNumber,
          data.reportingCurrencyId,
          data.address,
          data.stateId,
          data.cityId,
          data.postalCode,
          data.logoUrl,
          data.status,
          id
        ]
      );

      await client.query('COMMIT');

      return res.json({
        id,
        message: 'Company updated.'
      });

    } catch (error) {
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error(
            'Company rollback failed',
            rollbackError
          );
        }
      }

      return handleError(
        res,
        error,
        'Unable to update company.'
      );

    } finally {
      if (client) client.release();
    }
  });

  // =====================================================
  // SECTION 11 — DELETE COMPANY
  // =====================================================

  router.delete('/:id', async (req, res) => {
    if (!isId(req.params.id)) {
      return badRequest(
        res,
        'Invalid Company ID.'
      );
    }

    try {
      const result = await pool.query(
        `
          DELETE FROM public.company
          WHERE id = $1
          RETURNING id
        `,
        [Number(req.params.id)]
      );

      if (!result.rowCount) {
        return res.status(404).json({
          message: 'Company not found.'
        });
      }

      return res.json({
        id: result.rows[0].id,
        message: 'Company deleted.'
      });

    } catch (error) {
      return handleError(
        res,
        error,
        'Unable to delete company.'
      );
    }
  });

  // =====================================================
  // SECTION 12 — RETURN ROUTER
  // =====================================================

  return router;
}
