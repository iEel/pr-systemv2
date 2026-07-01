# Phase 3.4 Cancel/Reissue Design

## Goal

Add controlled cancellation and reissue workflows for generated purchase requests without mutating or deleting existing generated/signed document files.

## Policy

- Cancel is allowed only for controlled PR records in `GENERATED`, `PRINTED`, or `SIGNED`.
- Cancel requires a non-empty reason from the user.
- Cancel updates the original PR to `CANCELLED`, sets `cancelledAt`, and writes a `Cancelled` audit event with the reason.
- Reissue is allowed only from `CANCELLED`.
- Reissue creates a new `DRAFT` PR copied from the cancelled original.
- The new draft has no `prNo`, no generated/printed/signed/cancelled timestamps, no generated snapshot, and no attachments.
- The new draft keeps `reissuedFromId` pointing to the cancelled original.
- The cancelled original keeps all generated and signed attachments untouched.
- After a replacement draft is created, the original PR status becomes `REISSUED` so it cannot be reissued repeatedly.

## UI

- PR detail shows `Cancel` for `Generated`, `Printed`, and `Signed`.
- PR detail shows `Reissue` for `Cancelled`.
- `/pr/[id]/cancel` renders a reason form only when the PR can be cancelled.
- Submitting cancel redirects back to the original PR detail.
- Reissue is a server action from PR detail that redirects to the new draft detail.

## Data Flow

1. User opens a controlled PR.
2. User clicks `Cancel`.
3. Server validates status and reason.
4. Server updates the PR and creates an audit log in one transaction.
5. User clicks `Reissue` on the cancelled PR.
6. Server copies header fields and line items into a new draft with today's document date, links `reissuedFromId`, writes audit logs, marks the original as `REISSUED`, and redirects to the new draft.

## Error Handling

- Missing PR ids throw `Purchase request not found`.
- Invalid cancel statuses throw `Only generated, printed, or signed purchase requests can be cancelled`.
- Empty cancel reasons throw `Cancel reason is required`.
- Invalid reissue statuses throw `Only cancelled purchase requests can be reissued`.
- Missing active admin user throws an explicit admin-user setup error.

## Testing

- Unit tests cover cancel status guards, reissue status guards, and reason normalization.
- Runtime verification covers real cancel and reissue against SQL Server through the Next.js app/server actions.
