// ===== [DEPT-API-01 | Department Routes] =====

const express = require("express");
const db = require("./db");

const router = express.Router();

// ===== [DEPT-API-02 | Organization Lookup] =====
// Fetch existing organizations from PostgreSQL

router.get("/lookups/department-organizations", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        id,
        organization_code,
        organization_name,
        status
      FROM public.organization
      ORDER BY organization_name
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Department organization lookup error:", error);
    res.status(500).json({
      message: "Could not load organizations."
    });
  }
});

// ===== [DEPT-API-03 | Get All Departments] =====

router.get("/departments", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT *
      FROM public.department
      ORDER BY department_code ASC
    `);

    res.json(result.rows);

  } catch (error) {
    console.error("Department fetch error:", error);

    res.status(500).json({
      message: "Could not load departments."
    });
  }
});
// ===== [DEPT-API-04 | Company Lookup by Organization] =====

router.get("/lookups/department-companies", async (req, res) => {
  try {
    const { organization_id } = req.query;

    if (!organization_id || !/^\d+$/.test(String(organization_id))) {
      return res.status(400).json({
        message: "Valid organization_id is required."
      });
    }

    const result = await db.query(
      `SELECT
         id,
         company_code AS code,
         company_name AS name,
         status
       FROM public.company
       WHERE organization_id = $1
       ORDER BY company_name`,
      [organization_id]
    );

    res.json(result.rows);

  } catch (error) {
    console.error("Department company lookup error:", error);

    res.status(500).json({
      message: "Could not load companies."
    });
  }
});
// ===== [DEPT-API-05 | Create Department] =====

router.post("/departments", async (req, res) => {
  try {
    const {
      department_code,
      department_name,
      organization_id,
      company_id,
      branch_id,
      dept_head_id,
      dept_head_email,
      dept_head_contact,
      department_type_id,
      description,
      status
    } = req.body;

    // Required field validation
    if (
      !String(department_code ?? "").trim() ||
      !String(department_name ?? "").trim() ||
      !organization_id ||
      !company_id ||
      !status
    ) {
      return res.status(400).json({
        message: "Please fill all required Department fields."
      });
    }

    // Verify that the selected company belongs to the organization
    const companyCheck = await db.query(
      `SELECT id FROM public.company
       WHERE id = $1 AND organization_id = $2`,
      [company_id, organization_id]
    );

    if (companyCheck.rowCount === 0) {
      return res.status(400).json({
        message: "Selected Company does not belong to the Organization."
      });
    }

    // Insert Department
    const result = await db.query(
      `INSERT INTO public.department (
        department_code,
        department_name,
        organization_id,
        company_id,
        branch_id,
        dept_head_id,
        dept_head_email,
        dept_head_contact,
        department_type_id,
        description,
        status
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11
      )
      RETURNING *`,
      [
        department_code.trim(),
        department_name.trim(),
        organization_id,
        company_id,
        branch_id || null,
        dept_head_id || null,
        dept_head_email || null,
        dept_head_contact || null,
        department_type_id || null,
        description || null,
        status
      ]
    );

    return res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error("Department create error:", error);

    return res.status(500).json({
      message: "Could not create Department."
    });
  }
});
module.exports = router;