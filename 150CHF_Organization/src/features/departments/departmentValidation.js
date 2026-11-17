
/* =========================================================
   150CHF — DEPARTMENT MODULE
   SECTION: DEPARTMENT FORM VALIDATION

   Independent validation for Department.
   Organization and Company are not affected.
   ========================================================= */

export function validateDepartment(form) {
  const errors = {};

  const value = (field) =>
    String(form[field] ?? '').trim();

  // SECTION 1: Required Fields
  if (!value('code')) {
    errors.code = 'Department Code is required.';
  }

  if (!value('name')) {
    errors.name = 'Department Name is required.';
  }

  if (!value('organizationId')) {
    errors.organizationId = 'Organization is required.';
  }

  if (!value('companyId')) {
    errors.companyId = 'Company is required.';
  }

  if (!value('status')) {
    errors.status = 'Status is required.';
  }

  // SECTION 2: Email Validation
  if (
    value('headEmail') &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value('headEmail'))
  ) {
    errors.headEmail = 'Enter a valid email address.';
  }

  // SECTION 3: Phone Validation
  if (
    value('headPhone') &&
    !/^\+?[\d\s()-]{7,20}$/.test(value('headPhone'))
  ) {
    errors.headPhone = 'Enter a valid phone number.';
  }

  return errors;
}
