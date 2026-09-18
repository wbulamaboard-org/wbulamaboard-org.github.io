# Existing workflow audit

- registration.html: visible UI previously redirected to a Google Form; a hidden JSON POST form also existed.
- verification.html: existing GET ?id= integration existed but exposed mobile and application data publicly; this PR removes those fields from public verification.
- wazeen-id.html: existing client-side generator allowed arbitrary IDs and local photos; it is now an approval-driven viewer that fetches a public approved record before rendering an ID.
- wazeen-profile.html: contains hard-coded demo profile data and is not an authoritative member profile.
- wazeens.html: previously combined localStorage records with a hard-coded demo member; this PR removes fake/local records from the public directory.
- admin.html: previously a localStorage demo; this PR removes the fake approval dashboard.
- assets/site.css and assets/site.js: retained and reused.
- Repository tree contains no Google Apps Script source (.gs) file.

## Important backend finding
The Google Apps Script source is outside the repository, and the live endpoint could not be verified from this environment. Therefore server-side authorization, duplicate-ID guarantees, approval actions, and privacy behavior cannot be certified from repository code alone.

The frontend now fails closed for member status/profile/verification when the required backend action is unavailable. No client-side approval or Member-ID issuance was added.
