
/* =========================================================
   150CHF — DEPARTMENT MODULE
   FILE: departmentService.js

   Department-specific API communication.
   Organization and Company services remain unchanged.
   ========================================================= */

// SECTION 1: Reuse existing API response handler
import {
  readApiResponse
} from '../../components/organizationService';

// SECTION 2: Default Department search filters
export const emptyDepartmentSearch = {
  code: '',
  name: '',
  status: 'Select'
};

// SECTION 3: Default Department form values
export const emptyDepartment = {
  code: '',
  name: '',
  organizationId: '',
  companyId: '',
  branchId: '',
  departmentTypeId: '',
  departmentHead: '',
  headEmail: '',
  headPhone: '',
  description: '',
  status: 'Active'
};

// SECTION 4: GET Department List
export async function getDepartments({ queryKey }) {
  const [, filters, page, linesPerPage] = queryKey;

  const params = new URLSearchParams({
    code: filters.code,
    name: filters.name,
    status: filters.status,
    page: String(page),
    linesPerPage: String(linesPerPage)
  });

  const response = await fetch(
    `/api/departments?${params}`
  );

  return readApiResponse(
    response,
    'Unable to load departments'
  );
}

// SECTION 5: GET Single Department
export async function getDepartment(id) {
  const response = await fetch(`/api/departments/${id}`);

  return readApiResponse(
    response,
    'Unable to load department'
  );
}

// SECTION 6: CREATE Department
export async function createDepartment(department) {
  const response = await fetch('/api/departments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(department)
  });

  return readApiResponse(
    response,
    'Unable to create department'
  );
}

// SECTION 7: UPDATE Department
export async function saveDepartment(id, department) {
  const response = await fetch(
    `/api/departments/${id}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(department)
    }
  );

  return readApiResponse(
    response,
    'Unable to update department'
  );
}

// SECTION 8: DELETE Department
export async function deleteDepartment(id) {
  const response = await fetch(
    `/api/departments/${id}`,
    { method: 'DELETE' }
  );

  return readApiResponse(
    response,
    'Unable to delete department'
  );
}

  /* =========================================================
   SECTION 9: GET Organizations for Department Lookup

   Purpose:
   Load real Organization records from PostgreSQL
   through the existing Organization API.
   ========================================================= */

export async function getDepartmentOrganizations() {
  const response = await fetch(
    '/api/organizations?page=1&linesPerPage=10000'
  );

  const result = await readApiResponse(
    response,
    'Unable to load organizations'
  );

  return result.rows ?? [];
}

