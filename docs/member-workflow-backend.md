# Backend work required before real approval is enabled

Keep the existing Google Apps Script endpoint and compatible POST behavior, but upgrade its server-side contract.

## POST /exec
Create an application only. Generate application_no on the server. Set status to Application Received or Under Review. Never accept member_id, approved, verified, or admin fields from the browser. Add server-side idempotency/duplicate-submission protection.

Return: { ok: true, application_no, status }.

## GET application_status
Support action=application_status with application_no and registered mobile. Return only application_no, status, and a safe message. Do not return phone, address, DOB, documents, passwords, or internal notes.

## GET member_profile
Support action=member_profile with application_no and registered mobile. Only an approved record may be returned. Return member_id, approved public name, designation, district/block if public, photo_url if safely hosted, and validity. Never return private application fields.

## GET public verification
The existing ?id=Member-ID endpoint should return only public approved verification data. Invalid IDs must return found=false. Suspended/revoked/expired states should be explicit if supported.

## Secure admin
Do not place an admin password in GitHub Pages JavaScript. Use an authenticated administrator-only backend surface (for example a separate Google-authenticated Apps Script deployment with an allowlist of authorized Google accounts, or a proper backend with OAuth/session authorization). Approval, rejection, correction requests, audit timestamps, approver identity, and Member-ID creation must occur server-side.

## Data model
Use separate fields for stable internal application ID, Application Number, application status, official Member ID, verification status, created/updated timestamps, approval timestamp, approver identity, private rejection/correction notes, and an idempotency key.

Member ID must be generated server-side only after approval and must be checked for uniqueness transactionally/atomically.

## Photo
The repository's existing photo input was local-only. This PR does not upload photos to the existing endpoint. Add photo upload only after the backend provides authenticated storage and safe public URLs.

## Deployment
1. Update the existing Apps Script source outside this repository.
2. Test in a separate Google Sheet/test deployment.
3. Confirm public responses contain no private fields.
4. Confirm only authenticated admins can approve/reject.
5. Confirm server-side unique Member IDs.
6. Deploy the updated Apps Script.
7. Run end-to-end tests against the production endpoint.
8. Only then enable real approvals.
