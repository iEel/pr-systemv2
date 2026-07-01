<!-- SEED: re-run $impeccable document once there's code to capture the actual tokens and components. -->
---
name: IT PR Document Management System
description: A modern premium enterprise interface for controlled IT Purchase Request documents.
---

# Design System: IT PR Document Management System

## 1. Overview

**Creative North Star: "The Executive Document Console"**

The interface should feel like a modern premium enterprise console for official purchasing documents: calm, precise, and easy to trust. It uses a deep navy application shell, crisp white work surfaces, cool slate backgrounds, controlled blue primary actions, and clear semantic status colors. The product should look more polished than a legacy back-office system while staying dense enough for daily IT operations.

The system rejects the feel of an old government form: no cramped visual rhythm, no heavy box grids, no stale gray-on-gray fields, and no overloaded borders. Official document work should feel controlled and audit-ready, but never visually exhausting.

**Key Characteristics:**
- Deep navy navigation shell with white content surfaces.
- Clear task hierarchy across dashboards, tables, detail pages, forms, and upload panels.
- Compact enterprise density with generous breathing room around grouped work.
- Status-first UI language for Draft, Generated, Printed, Signed, Cancelled, Reissued, and validation states.
- Restrained motion and predictable component behavior.

## 2. Colors

The palette should follow the supplied dashboard reference: navy-led, cool, crisp, and enterprise-polished.

### Primary
- **Executive Navy** ([to be resolved during implementation]): Used for the left sidebar, top-level navigation identity, selected navigation, and high-confidence primary actions when a strong command is needed.

### Secondary
- **Document Blue** ([to be resolved during implementation]): Used for links, generated states, chart accents, active filters, and secondary emphasis.
- **Audit Teal** ([to be resolved during implementation]): Used sparingly for signed/uploaded confirmation and trustworthy completion states.

### Neutral
- **Cool Slate Background** ([to be resolved during implementation]): The main application background behind content surfaces.
- **White Work Surface** ([to be resolved during implementation]): The default page, card, table, form, and modal surface.
- **Ink Navy** ([to be resolved during implementation]): Primary body text and important labels.
- **Muted Slate** ([to be resolved during implementation]): Secondary text, metadata, disabled helper text, and table subtext.
- **Soft Gray Border** ([to be resolved during implementation]): Dividers, field borders, table rows, and subtle panel separation.

### Named Rules

**The Navy Shell Rule.** Navy belongs to the application frame, selected navigation, and decisive actions; it must not flood every card or table.

**The Status Clarity Rule.** Status colors are semantic, not decorative: Draft is gray, Generated is blue, Printed is amber, Signed is green, Cancelled is red, and validation warnings must remain distinct from errors.

## 3. Typography

**Display Font:** Single sans family, chosen during implementation.
**Body Font:** Single sans family, chosen during implementation.
**Label/Mono Font:** Optional mono only for IDs, PR numbers, timestamps, file hashes, or technical audit fields.

**Character:** The typography should feel clear, modern, and operational. It should support Thai and English mixed text, compact forms, dense tables, and official document labels without looking like a government form.

### Hierarchy
- **Display** (semibold, fixed rem scale): Page-level dashboard and module titles only.
- **Headline** (semibold, fixed rem scale): Section headers, form page titles, detail page titles.
- **Title** (semibold, compact): Cards, table groups, side panels, validation result blocks.
- **Body** (regular, readable): Form instructions, row descriptions, timeline notes, and document metadata.
- **Label** (medium, compact): Field labels, column headers, badges, tabs, and navigation items.

### Named Rules

**The Mixed-Language Rule.** Thai and English text must not clip, overlap, or depend on narrow uppercase styling. Labels should wrap cleanly where needed.

## 4. Elevation

The system should use a hybrid of tonal layering and restrained elevation. Most surfaces are white panels separated by soft borders on a cool slate background. Shadows are allowed only when they clarify stacking or affordance: dropdowns, modals, sticky panels, active upload zones, and focused interactive surfaces.

### Shadow Vocabulary
- **Panel Lift** ([to be resolved during implementation]): Used for primary page panels and dashboard surfaces when a border alone is not enough.
- **Popover Lift** ([to be resolved during implementation]): Used for menus, dropdowns, date pickers, and command overlays.
- **Modal Lift** ([to be resolved during implementation]): Used only for blocking workflows and document-critical confirmations.

### Named Rules

**The Quiet Elevation Rule.** Surfaces should feel organized, not floaty. Never combine heavy borders with large soft shadows as decoration.

## 5. Components

### Buttons
- **Shape:** Gently squared enterprise controls, likely small-to-medium radius once implemented.
- **Primary:** Navy fill with white text for decisive actions such as Generate PDF, Mark Printed, Upload Signed, Save, and Create PR.
- **Hover / Focus:** Visible focus ring and slight tonal shift; no decorative animation.
- **Secondary / Ghost:** Used for Preview PDF, Download, Cancel, Copy tag, and table row utilities.

### Chips
- **Style:** Compact status chips with semantic color, readable text, and clear borders or light fills.
- **State:** Status chips must remain readable without relying on color alone; labels stay explicit.

### Cards / Containers
- **Corner Style:** Tight, professional radius rather than oversized rounded cards.
- **Background:** White work surfaces on cool slate background.
- **Shadow Strategy:** Subtle lift only for important panels; tables can use borders and dividers.
- **Border:** Soft gray, consistent across tables, forms, and panels.
- **Internal Padding:** Compact but not cramped, with denser table interiors and more generous detail-page grouping.

### Inputs / Fields
- **Style:** White fields with clear borders, visible labels, and predictable validation messaging.
- **Focus:** Navy or blue focus treatment that meets contrast requirements.
- **Error / Disabled:** Errors use red with readable explanation text; disabled fields must remain legible.

### Navigation
- **Style:** Persistent left sidebar with navy background, clear active state, compact icon plus label rows, and a restrained topbar for breadcrumb, notifications, and user controls.
- **Mobile Treatment:** Collapse navigation into a drawer or compact rail; primary document actions remain reachable.

### Upload Zones
- **Style:** Drag-and-drop surfaces should show accepted file types, file name, size, progress, status, and error messages.
- **Behavior:** Signed document uploads must communicate versioning clearly, especially for signed_v1, signed_v2, and re-upload flows.

## 6. Do's and Don'ts

### Do:
- **Do** use the uploaded navy dashboard reference as the initial visual direction.
- **Do** keep official document workflows calm, precise, and auditable.
- **Do** make PR number, status, company/branch, generated PDF, signed upload, and timeline information visible on detail pages.
- **Do** design dense tables, filters, and forms for repeated IT operations work.
- **Do** meet WCAG 2.2 AA for text contrast, focus visibility, keyboard use, and reduced motion.

### Don't:
- **Don't** make the product feel like an old government form: cramped, stale, border-heavy, or hard to scan.
- **Don't** use consumer-app styling, playful colors, social-app patterns, or oversized marketing-page sections.
- **Don't** use color as the only status signal.
- **Don't** over-decorate with glass effects, gradient text, oversized rounded cards, or decorative motion.
- **Don't** let generated/printed/signed document states look editable in the same way as Draft.
