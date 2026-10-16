# MEMORY.md - Project Knowledge & Continuity

## Architecture & Data Model Notes

### Vulnerability Types & Owner Scoping
- The portal supports 4 primary vulnerability types:
  1. `CONTAINER`
  2. `CSPM`
  3. `SAST_DAST` (aliases: `SAST/DAST`, `sast_dast`)
  4. `VAPT`
- All 4 formats store the assigned owner in MongoDB `issues_collection` under `AssignedTo`.
- For SAST_DAST, fallback keys include `Assignee` and `ApplicationOwner`.
- For VAPT, fallback keys include `Application Owner`.
- `/api/db/metadata` returns:
  - `owners`: Distinct list of all owners across the entire database.
  - `owners_by_format`: Format-scoped map (`{ CONTAINER: [...], CSPM: [...], SAST_DAST: [...], VAPT: [...] }`) computing distinct owners who actually have issues assigned in each specific format.
- In the frontend (`src/App.tsx`):
  - `metadataOwnersByFormat` stores the format-to-owners mapping from `/api/db/metadata`.
  - `currentFormatOwners` resolves the active format's owners (from `metadataOwnersByFormat` with client-side fallback from `allIssues`), returning only owners with assigned issues in the selected format.
  - Auto-reset logic ensures switching tabs resets `assignedTo` to `"All Owners"` so users aren't left with an owner who has zero issues in the newly chosen format.
  - Custom glassmorphic `AssignUserDropdown` receives `currentFormatOwners` and displays format-accurate owner counts and names.
