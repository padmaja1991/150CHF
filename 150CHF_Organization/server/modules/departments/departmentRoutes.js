
import { Router } from 'express';

/* =====================================================
   150CHF — DEPARTMENT BACKEND
   PostgreSQL CRUD + Dependent Master Lookups
   ===================================================== */

export function createDepartmentRoutes(pool) {
  const router = Router();

  // SECTION 1: DATABASE COLUMN MAPPING

  const optionalNames = {
    departmentTypeId: [
      'department_type_id',
      'dept_type_id'
    ],
    departmentHead: [
      'department_head',
      'dept_head_name',
      'dept_head',
      'head_name'
    ],
    headEmail: [
      'head_email',
      'dept_head_email',
      'department_head_email'
    ],
    headPhone: [
      'head_phone',
      'dept_head_phone',
      'department_head_phone'
    ],
    description: [
      'description',
      'department_description'
    ]
  };

  const quote = (name) =>
    `"${name.replace(/"/g, '""')}"`;

  const isId = (value) =>
    Number.isSafeInteger(Number(value)) &&
    Number(value) > 0;

  const clean = (value) =>
    String(value ?? '').trim();

  const optionalId = (value) =>
    clean(value) ? value : null;

  // SECTION 2: READ ACTUAL POSTGRESQL COLUMNS

  async function getSchema() {
    const response = await pool.query(`
      SELECT
        column_name,
        is_nullable,
        column_default,
        is_identity
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'department'
    `);

    if (!response.rows.length) {
      throw new Error(
        'public.department table was not found.'
      );
    }

    const byName = new Map(
      response.rows.map((row) => [
        row.column_name,
        row
      ])
    );

    const mapped = Object.fromEntries(
      Object.entries(optionalNames).map(
        ([field, candidates]) => [
          field,
          candidates.find(
            (name) => byName.has(name)
          ) ?? null
        ]
      )
    );

    return { byName, mapped };
  }

  function optionalSelect(schema) {
    return Object.entries(schema.mapped)
      .map(([field, column]) =>
        `${
          column
            ? `d.${quote(column)}`
            : 'NULL'
        } AS ${quote(field)}`
      )
      .join(',\n');
  }

  // SECTION 3: COMMON DEPARTMENT SELECT

  const baseSelect = (schema) => `
    SELECT
      d.id,
      d.department_code AS code,
      d.department_name AS name,

      d.organization_id AS "organizationId",
      COALESCE(o.organization_name, '')
        AS "organizationName",

      d.company_id AS "companyId",
      COALESCE(c.company_name, '')
        AS "companyName",

      d.branch_id AS "branchId",
      COALESCE(b.branch_name, '')
        AS "branchName",

      ${optionalSelect(schema)},
      d.status

    FROM public.department d

    LEFT JOIN public.organization o
      ON o.id = d.organization_id

    LEFT JOIN public.company c
      ON c.id = d.company_id

    LEFT JOIN public.branch b
      ON b.id = d.branch_id
  `;

  // SECTION 4: DATABASE ERROR HANDLING

  function sendDatabaseError(res, error, message) {
    console.error(message, error);

    if (error.code === '23505') {
      return res.status(409).json({
        message: 'Department Code already exists.'
      });
    }

    if (error.code === '23503') {
      return res.status(400).json({
        message:
          'One of the selected Organization, Company or Branch references is invalid.'
      });
    }

    if (error.code === '23502') {
      return res.status(400).json({
        message:
          'A required database field is missing' +
          (error.column
            ? `: ${error.column}`
            : '') +
          '.'
      });
    }

    const development =
      process.env.NODE_ENV !== 'production';

    return res.status(500).json({
      message: development
        ? `${message}: ${error.message}`
        : message,

      ...(development
        ? {
            postgresCode: error.code ?? null,
            column: error.column ?? null
          }
        : {})
    });
  }

  // SECTION 5: DEPENDENT LOOKUPS

  router.get('/lookups', async (req, res) => {
    try {
      const kind = clean(req.query.kind);

      let sql;
      let params;

      if (
        kind === 'companies' &&
        isId(req.query.organizationId)
      ) {
        sql = `
          SELECT
            id,
            company_code AS code,
            company_name AS name,
            status
          FROM public.company
          WHERE organization_id = $1
          ORDER BY company_name
          LIMIT 500
        `;

        params = [req.query.organizationId];

      } else if (
        kind === 'branches' &&
        isId(req.query.companyId)
      ) {
        sql = `
          SELECT
            id,
            branch_code AS code,
            branch_name AS name,
            status
          FROM public.branch
          WHERE company_id = $1
          ORDER BY branch_name
          LIMIT 500
        `;

        params = [req.query.companyId];

      } else if (kind === 'types') {
        return res.json({
          rows: [],
          configured: false
        });

      } else {
        return res.status(400).json({
          message: 'Invalid lookup request.'
        });
      }

      const result = await pool.query(sql, params);

      return res.json({
        rows: result.rows
      });

    } catch (error) {
      return sendDatabaseError(
        res,
        error,
        'Unable to load department lookup'
      );
    }
  });

  // SECTION 6: GET DEPARTMENT LIST

  router.get('/', async (req, res) => {
    try {
      const schema = await getSchema();

      const filters = [];
      const values = [];

      const code = clean(req.query.code);
      const name = clean(req.query.name);
      const status = clean(
        req.query.status || 'Select'
      );

      // Search by Code
      if (code) {
        values.push(`%${code}%`);

        filters.push(
          `d.department_code ILIKE $${values.length}`
        );
      }

      // Search by Name
      if (name) {
        values.push(`%${name}%`);

        filters.push(
          `d.department_name ILIKE $${values.length}`
        );
      }

      // Search by Status
      if (status !== 'Select') {
        if (
          !['Active', 'Inactive'].includes(status)
        ) {
          return res.status(400).json({
            message: 'Invalid Department status.'
          });
        }

        values.push(status);

        filters.push(
          `d.status = $${values.length}`
        );
      }

      const where = filters.length
        ? `WHERE ${filters.join(' AND ')}`
        : '';

      // Pagination
      const page = Math.max(
        1,
        Number.parseInt(req.query.page, 10) || 1
      );

      const linesPerPage = Math.min(
        10000,
        Math.max(
          1,
          Number.parseInt(
            req.query.linesPerPage,
            10
          ) || 10
        )
      );

      const offset =
        (page - 1) * linesPerPage;

      // Count
      const count = await pool.query(
        `
          SELECT COUNT(*)::integer AS total
          FROM public.department d
          ${where}
        `,
        values
      );

      const total = count.rows[0].total;

      // Fetch records
      const rows = await pool.query(
        `
          ${baseSelect(schema)}
          ${where}

          ORDER BY
            LOWER(d.department_code),
            LOWER(d.department_name),
            d.id

          LIMIT $${values.length + 1}
          OFFSET $${values.length + 2}
        `,
        [...values, linesPerPage, offset]
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
      return sendDatabaseError(
        res,
        error,
        'Unable to load departments'
      );
    }
  });

  // SECTION 7: COMMON VALIDATION

  async function validate(body, res) {
    const data = {
      code: clean(body?.code),
      name: clean(body?.name),

      organizationId: body?.organizationId,
      companyId: body?.companyId,

      branchId: optionalId(body?.branchId),

      departmentTypeId: optionalId(
        body?.departmentTypeId
      ),

      departmentHead:
        clean(body?.departmentHead) || null,

      headEmail:
        clean(body?.headEmail) || null,

      headPhone:
        clean(body?.headPhone) || null,

      description:
        clean(body?.description) || null,

      status: body?.status ?? 'Active'
    };

    if (
      !data.code ||
      !data.name ||
      !isId(data.organizationId) ||
      !isId(data.companyId)
    ) {
      res.status(400).json({
        message:
          'Department Code, Name, Organization and Company are required.'
      });

      return null;
    }

    if (
      !['Active', 'Inactive'].includes(data.status)
    ) {
      res.status(400).json({
        message: 'Invalid Department status.'
      });

      return null;
    }

    if (
      data.branchId !== null &&
      !isId(data.branchId)
    ) {
      res.status(400).json({
        message: 'Invalid Branch ID.'
      });

      return null;
    }

    if (
      data.departmentTypeId !== null &&
      !isId(data.departmentTypeId)
    ) {
      res.status(400).json({
        message: 'Invalid Department Type ID.'
      });

      return null;
    }

    // Validate Company belongs to Organization
    const company = await pool.query(
      `
        SELECT id
        FROM public.company
        WHERE id = $1
          AND organization_id = $2
      `,
      [
        data.companyId,
        data.organizationId
      ]
    );

    if (!company.rowCount) {
      res.status(400).json({
        message:
          'Selected Company does not belong to the selected Organization.'
      });

      return null;
    }

    // Validate Branch belongs to Company
    if (data.branchId !== null) {
      const branch = await pool.query(
        `
          SELECT id
          FROM public.branch
          WHERE id = $1
            AND company_id = $2
            AND (
              organization_id = $3
              OR organization_id IS NULL
            )
        `,
        [
          data.branchId,
          data.companyId,
          data.organizationId
        ]
      );

      if (!branch.rowCount) {
        res.status(400).json({
          message:
            'Selected Branch does not belong to the selected Company/Organization.'
        });

        return null;
      }
    }

    return data;
  }

  // SECTION 8: DYNAMIC INSERT / UPDATE MAPPING

  function writeFields(schema, data) {
    return [
      ['department_code', data.code],
      ['department_name', data.name],
      ['organization_id', data.organizationId],
      ['company_id', data.companyId],
      ['branch_id', data.branchId],

      ...Object.entries(schema.mapped)
        .filter(([, column]) => column)
        .map(([field, column]) => [
          column,
          data[field]
        ]),

      ['status', data.status]
    ];
  }

  function checkUnsupported(schema, data, res) {
    const unsupported = Object.keys(
      schema.mapped
    ).filter(
      (key) =>
        !schema.mapped[key] &&
        data[key] !== null &&
        data[key] !== ''
    );

    if (unsupported.length) {
      res.status(400).json({
        message:
          `Department database has no column for: ${
            unsupported.join(', ')
          }. Please verify the department schema.`
      });

      return false;
    }

    return true;
  }

  // SECTION 9: CREATE DEPARTMENT

  router.post('/', async (req, res) => {
    try {
      const data = await validate(req.body, res);

      if (!data) return;

      const schema = await getSchema();

      if (!checkUnsupported(schema, data, res)) {
        return;
      }

      // Duplicate code checking
      const duplicate = await pool.query(
        `
          SELECT id
          FROM public.department
          WHERE LOWER(department_code) = LOWER($1)
          LIMIT 1
        `,
        [data.code]
      );

      if (duplicate.rowCount) {
        return res.status(409).json({
          message: 'Department Code already exists.'
        });
      }

      const fields = writeFields(schema, data);

      const columns = fields
        .map(([column]) => quote(column))
        .join(', ');

      const placeholders = fields
        .map((_, index) => `$${index + 1}`)
        .join(', ');

      const result = await pool.query(
        `
          INSERT INTO public.department (
            ${columns}
          )
          VALUES (
            ${placeholders}
          )
          RETURNING
            id,
            department_code AS code,
            department_name AS name,
            status
        `,
        fields.map(([, value]) => value)
      );

      return res.status(201).json(
        result.rows[0]
      );

    } catch (error) {
      return sendDatabaseError(
        res,
        error,
        'Unable to create department'
      );
    }
  });

  // SECTION 10: GET SINGLE DEPARTMENT

  router.get('/:id', async (req, res) => {
    if (!isId(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid Department ID.'
      });
    }

    try {
      const schema = await getSchema();

      const result = await pool.query(
        `
          ${baseSelect(schema)}
          WHERE d.id = $1
        `,
        [req.params.id]
      );

      if (!result.rowCount) {
        return res.status(404).json({
          message: 'Department not found.'
        });
      }

      return res.json(result.rows[0]);

    } catch (error) {
      return sendDatabaseError(
        res,
        error,
        'Unable to load department'
      );
    }
  });

  // SECTION 11: UPDATE DEPARTMENT

  router.put('/:id', async (req, res) => {
    if (!isId(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid Department ID.'
      });
    }

    try {
      const data = await validate(req.body, res);

      if (!data) return;

      const schema = await getSchema();

      if (!checkUnsupported(schema, data, res)) {
        return;
      }

      const fields = writeFields(schema, data);

      if (schema.byName.has('updated_date')) {
        fields.push([
          'updated_date',
          new Date()
        ]);
      }

      const assignments = fields
        .map(
          ([column], index) =>
            `${quote(column)} = $${index + 1}`
        )
        .join(', ');

      const result = await pool.query(
        `
          UPDATE public.department
          SET ${assignments}
          WHERE id = $${fields.length + 1}
          RETURNING
            id,
            department_code AS code,
            department_name AS name,
            status
        `,
        [
          ...fields.map(([, value]) => value),
          req.params.id
        ]
      );

      if (!result.rowCount) {
        return res.status(404).json({
          message: 'Department not found.'
        });
      }

      return res.json(result.rows[0]);

    } catch (error) {
      return sendDatabaseError(
        res,
        error,
        'Unable to update department'
      );
    }
  });

  // SECTION 12: DELETE DEPARTMENT

  router.delete('/:id', async (req, res) => {
    if (!isId(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid Department ID.'
      });
    }

    try {
      const result = await pool.query(
        `
          DELETE FROM public.department
          WHERE id = $1
          RETURNING id
        `,
        [req.params.id]
      );

      if (!result.rowCount) {
        return res.status(404).json({
          message: 'Department not found.'
        });
      }

      return res.json({
        message: 'Department deleted.',
        id: result.rows[0].id
      });

    } catch (error) {
      return sendDatabaseError(
        res,
        error,
        'Unable to delete department'
      );
    }
  });

  return router;
}
