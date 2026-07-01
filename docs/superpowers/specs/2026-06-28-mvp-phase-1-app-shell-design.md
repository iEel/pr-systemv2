# MVP Phase 1 App Shell Design

## Summary

Build a production-ready Next.js app shell for the IT PR Document Management System. The shell covers the authenticated product frame and first-pass MVP surfaces: login placeholder, left sidebar, topbar, breadcrumb, dashboard, PR list, PR new/edit/detail, upload signed document, and placeholder modules for templates, master data, settings, running numbers, users/roles, and audit logs.

This phase is UI shell and realistic sample data only. It does not connect to SQL Server, Prisma, Carbone, local file storage, or real authentication yet.

## Users And Context

Primary users are IT department staff, IT administrators, and document owners working inside the company network. They need to create PR documents, understand document status, generate or preview PDF actions conceptually, upload signed documents, and track document progress without the interface feeling like an old government form.

The product mood is modern premium enterprise: calm, precise, dense enough for daily work, and polished enough to inspire confidence.

## Approved Direction

Use the approved **Sidebar Console** direction:

- Fixed deep navy left sidebar with compact icon-plus-label navigation.
- Restrained topbar with breadcrumb, notifications, and user menu placeholder.
- White work surfaces on a cool slate background.
- Blue primary actions and semantic status chips.
- Layout density inspired by the supplied reference image.
- No marketing hero, consumer-app styling, or legacy government-form visual language.

## Primary User Action

The app shell should make it obvious what state each PR document is in and what action should happen next: save draft, generate PDF, preview/download PDF, mark printed, upload signed document, or inspect audit/timeline activity.

## Surfaces

The MVP shell includes:

- `/login` local-auth placeholder screen.
- `/dashboard` budget and PR status overview using sample metrics.
- `/pr` PR document list with filters, search, table rows, status chips, and row actions.
- `/pr/new` create PR form shell with company, branch, department, purpose, purchase method, item rows, remark, summary panel, save draft, and generate PDF actions.
- `/pr/:id` PR detail shell with document header, action bar, metadata, item table, attachments, timeline, and status-aware actions.
- `/pr/:id/edit` edit shell for draft documents.
- `/pr/:id/upload-signed` drag-and-drop signed document upload shell with versioning copy.
- `/templates`, `/masters/companies`, `/masters/budgets`, `/settings/users`, `/settings/running-numbers`, and `/audit-logs` as navigable placeholder pages with realistic structure.

## Layout Strategy

Use a persistent app frame:

- Sidebar owns module navigation and active route state.
- Topbar owns breadcrumb, global utility controls, notification placeholder, and user identity.
- Main workspace uses route-specific density: dashboards use summaries and charts; list pages use filters and tables; detail pages use a document header, main content, and right-side action/summary panel only where useful.
- Mobile collapses the sidebar into a drawer or compact rail while keeping primary page actions reachable.

## Component And State Requirements

Core component vocabulary:

- App frame, sidebar, topbar, breadcrumb.
- Buttons: primary, secondary, ghost, destructive, disabled/loading.
- Status chips for Draft, Generated, Printed, Signed, Cancelled, Reissued.
- Tables with filters, pagination affordance, empty state, and row actions.
- Forms with labels, validation text, disabled states, and long Thai/English text support.
- Attachment cards and drag-and-drop upload zone with filename, file size, type, progress/status, and error message.
- Timeline with document lifecycle events.
- Skeleton loading states for dashboard, list, and detail surfaces.

Required states:

- Default.
- Loading skeleton.
- Empty list.
- Form validation error.
- Upload error.
- Disabled actions for non-draft workflow states.
- Long company names, PR numbers, mixed Thai/English labels.
- Mobile collapsed navigation.

## Sample Data

Use realistic sample values from the product brief:

- Companies and branches: Grandlink, Sonic_HQ, Sonic_04, IT City.
- PR number format: `ITPR_2606001`.
- Departments: IT Operation, Infrastructure, Helpdesk.
- Items: server, storage, UPS battery, network cable, software license.
- Statuses: Draft, Generated, Printed, Signed, Cancelled, Reissued.
- Template examples: `PR_STANDARD`, `PR_GRANDLINK`, `PR_SONIC`.

## Interaction Model

Interactions are UI-complete but locally simulated:

- Sidebar route changes navigate between shell pages.
- Filters and search run client-side against the sample PR rows so the table visibly changes without backend calls.
- Generate PDF, Mark Printed, Upload Signed, and Download buttons exist as state-aware shell actions without backend calls.
- Drag-and-drop upload zone shows ready, dragging, selected file, progress, success, and error styling.
- Non-draft document states should not look freely editable; edit actions should be disabled or redirected conceptually toward cancel/reissue.

## Accessibility

Use WCAG 2.2 AA as the baseline:

- Visible focus states.
- Keyboard-accessible navigation and controls.
- Status labels must include text, not color alone.
- Body text, placeholder-like helper text, and chips must meet contrast requirements.
- Touch targets should remain usable on mobile.
- Motion must respect reduced-motion preferences.

## Technical Direction

Use the requested stack:

- Next.js app project.
- TypeScript.
- Tailwind CSS.
- Local Tailwind component primitives that follow shadcn/ui vocabulary for buttons, inputs, cards, tables, badges, dropdown-like menus, and dialogs. Do not depend on the shadcn CLI in this shell pass unless the project already has it available.
- `lucide-react` for icons.
- Local sample data modules.
- No real backend, database, auth, Carbone, or file persistence in this shell pass.

If the workspace is empty, scaffold the app directly in this project root and preserve `PRODUCT.md` and `DESIGN.md`.

## Verification

Before presenting as complete:

- Run install/build/lint checks available in the generated project.
- Start the local dev server.
- Inspect at least desktop and mobile viewports.
- Check for text clipping, broken layout, unreadable contrast, missing focus states, and incoherent responsive behavior.
- Report any command that could not run.
