
import { useMemo, useState } from 'react';

/* =====================================================
   150CHF — COMPANY SERVICE
   CRUD, VALIDATION, LOOKUPS
   ===================================================== */

// =====================================================
// SECTION 1 — DEFAULT VALUES
// =====================================================

const emptySearch = {
  code: '',
  name: '',
  status: 'Select'
};

const emptyCompany = {
  code: '',
  name: '',
  organizationId: '',
  organizationName: '',
  registrationNumber: '',
  reportingCurrencyId: '',
  reportingCurrency: '',
  address: '',
  stateId: '',
  stateName: '',
  cityId: '',
  cityName: '',
  postalCode: '',
  logoUrl: '',
  status: 'Active'
};

// =====================================================
// SECTION 2 — API RESPONSE HANDLER
// =====================================================

async function readApiResponse(response, fallbackMessage) {
  const body = await response.text();
  let result = null;

  if (body) {
    try {
      result = JSON.parse(body);
    } catch {
      throw new Error(
        `${fallbackMessage} (HTTP ${response.status})`
      );
    }
  }

  if (!response.ok) {
    throw new Error(
      result?.message ||
      `${fallbackMessage} (HTTP ${response.status})`
    );
  }

  if (result === null) {
    throw new Error(
      `${fallbackMessage}: Empty API response.`
    );
  }

  return result;
}

// =====================================================
// SECTION 3 — GET COMPANY LIST
// SEARCH, SORTING AND PAGINATION
// =====================================================

async function getCompanies({ queryKey }) {
  const [
    ,
    filters,
    page,
    linesPerPage,
    sort = { key: 'code', direction: 'asc' }
  ] = queryKey;

  const params = new URLSearchParams({
    code: filters.code || '',
    name: filters.name || '',
    status: filters.status || 'Select',
    page: String(page),
    linesPerPage: String(linesPerPage),
    sortBy: sort.key,
    sortDirection: sort.direction
  });

  const response = await fetch(
    `/api/companies?${params}`
  );

  return readApiResponse(
    response,
    'Unable to load companies'
  );
}

// =====================================================
// SECTION 4 — CREATE COMPANY
// =====================================================

async function createCompany(company) {
  const response = await fetch('/api/companies', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(company)
  });

  return readApiResponse(
    response,
    'Unable to create company'
  );
}

// =====================================================
// SECTION 5 — UPDATE COMPANY
// =====================================================

async function saveCompany(id, company) {
  const response = await fetch(
    `/api/companies/${id}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(company)
    }
  );

  return readApiResponse(
    response,
    'Unable to update company'
  );
}

// =====================================================
// SECTION 6 — GET SINGLE COMPANY
// =====================================================

async function getCompany(id) {
  const response = await fetch(
    `/api/companies/${id}`
  );

  return readApiResponse(
    response,
    'Unable to load company'
  );
}

// =====================================================
// SECTION 7 — DELETE COMPANY
// =====================================================

async function deleteCompany(id) {
  const response = await fetch(
    `/api/companies/${id}`,
    {
      method: 'DELETE'
    }
  );

  return readApiResponse(
    response,
    'Unable to delete company'
  );
}

// =====================================================
// SECTION 8 — COMPANY VALIDATION
// =====================================================

function useCompanyValidation(form) {
  const [submitted, setSubmitted] = useState(false);

  const errors = useMemo(() => {
    const nextErrors = {};

    const value = (field) =>
      String(form[field] ?? '').trim();

    // Company Code
    if (!value('code')) {
      nextErrors.code = 'Company Code is required.';
    }

    // Company Name
    if (!value('name')) {
      nextErrors.name = 'Company Name is required.';
    }

    // Organization
    if (
      !/^\d+$/.test(value('organizationId')) ||
      Number(value('organizationId')) <= 0
    ) {
      nextErrors.organizationId =
        'Please select an Organization.';
    }

    // Status
    if (!['Active', 'Inactive'].includes(form.status)) {
      nextErrors.status =
        'Please select a valid Status.';
    }

    // Optional foreign key IDs
    for (const field of [
      'reportingCurrencyId',
      'stateId',
      'cityId'
    ]) {
      if (
        value(field) &&
        (
          !/^\d+$/.test(value(field)) ||
          Number(value(field)) <= 0
        )
      ) {
        nextErrors[field] = 'Invalid selection.';
      }
    }

    // City requires State
    if (value('cityId') && !value('stateId')) {
      nextErrors.stateId =
        'Please select State before City.';
    }

    return nextErrors;
  }, [form]);

  const validate = () => {
    setSubmitted(true);
    return Object.keys(errors).length === 0;
  };

  return {
    errors: submitted ? errors : {},
    validate
  };
}

// =====================================================
// SECTION 9 — REUSABLE COMPANY LOOKUP
// =====================================================

async function getCompanyLookup(kind, params = {}) {
  const searchParams = new URLSearchParams({
    kind,
    ...params
  });

  const response = await fetch(
    `/api/companies/lookups?${searchParams}`
  );

  const result = await readApiResponse(
    response,
    'Unable to load Company lookup records'
  );

  if (!Array.isArray(result.rows)) {
    throw new Error(
      'Invalid lookup response: expected rows array.'
    );
  }

  return result.rows;
}

// =====================================================
// SECTION 10 — ORGANIZATION LOOKUP
// =====================================================

async function getOrganizationsLookup() {
  return getCompanyLookup('organizations');
}

// =====================================================
// SECTION 11 — REPORTING CURRENCY LOOKUP
// =====================================================

async function getCurrenciesLookup() {
  return getCompanyLookup('currencies');
}

// =====================================================
// SECTION 12 — STATE LOOKUP
// =====================================================

async function getStatesLookup() {
  return getCompanyLookup('states');
}

// =====================================================
// SECTION 13 — CITY LOOKUP
// =====================================================

async function getCitiesLookup(stateId) {
  if (!stateId) return [];

  return getCompanyLookup('cities', {
    stateId: String(stateId)
  });
}

// =====================================================
// SECTION 14 — EXPORTS
// =====================================================

export {
  emptySearch,
  emptyCompany,
  readApiResponse,
  getCompanies,
  createCompany,
  saveCompany,
  getCompany,
  deleteCompany,
  useCompanyValidation,
  getCompanyLookup,
  getOrganizationsLookup,
  getCurrenciesLookup,
  getStatesLookup,
  getCitiesLookup
};
