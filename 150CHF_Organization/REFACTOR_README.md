# 150CHF Organization — reusable component extraction

This package is derived from the supplied working `150CHF-main(3).zip`, building on Stage 1. It preserves the existing JSX/React, Vite, Express/PostgreSQL backend and CSS (no TypeScript migration).

## Reusable components
- `src/components/layout/AppHeader.jsx` — branded header, unchanged appearance.
- `src/components/layout/TopNavigation.jsx` — shared navigation extracted from OrganizationShared.
- `src/components/master/MasterListScreen.jsx` — configurable search, table, sorting and paging.
- `src/components/master/MasterFormScreen.jsx` — shared header, action bar, summary/form panel layout.
- `src/components/master/MasterLookupModal.jsx` — shared currency/country/state/city popup filtering and paging.
- `src/components/master/MasterCRUDScreen.jsx` — reusable mode controller for list/create/edit/view/copy.
- `src/components/master/MasterDeleteDialog.jsx` — inactive/delete prompt.
- `src/components/master/MasterConfirmDialog.jsx` — save, discard, error prompts.

## Organization-specific
- `src/features/organizations/OrganizationPage.jsx` — list data querying, selection, export, organization-specific mutations.
- `src/features/organizations/organization.js` — list configuration.
- `src/components/OrganizationForm.jsx` — organization-specific fields, validation, currency/location APIs, form data workflow.
- `src/components/organizationService.js` — existing data fetching and validation.

## Run
From `150CHF_Organization`, run `npm ci` then `npm run dev`. For frontend build run `npm run build`. Set up PostgreSQL/environment as described in the original README. Do not overwrite the working project before verifying against its data.

## Scope and known limits
Organization is wired to the shared components. Existing endpoints and database SQL remain unchanged. Existing Industry/Organization Type search-button handlers and field validation limitations are inherited from the original code, not new master-data integrations. Data-backed browser CRUD tests require access to the user's PostgreSQL database; building alone does not validate those flows. Company/Department/Country are not migrated in this package.

## Verification performed for this deliverable
- Latest uploaded `150CHF-main(3).zip` was confirmed byte-identical to `150CHF-main(2).zip` (SHA-256).
- All relative imports in the refactored `src` tree resolve to existing source files (static check).
- Fixed an invalid shared navigation import; corrected Currency lookup retry to force a fresh request.
- Build and browser/runtime integration **not verified**: offline `npm ci` could not install all packages because some dependencies are not cached.
- The original Organization backend SQL, Express API and CSS were carried over unchanged.
- Some original feature limitations remain, including unimplemented Industry and Organization Type lookup buttons. Copy-mode may require a unique organization code before saving.
