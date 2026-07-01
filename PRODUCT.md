# Product

## Register

product

## Users

IT department staff, IT administrators, and assigned document owners use this system inside the company network to create, generate, print, upload, and track Purchase Request documents for the IT department. Users are usually in an operational workflow: preparing PR data, checking document status, validating generated PDFs, uploading signed scans, or auditing document history.

## Product Purpose

IT PR Document Management is an internal document management system for creating Purchase Request documents that match the company's official PR form exactly. The application owns business rules, data validation, running numbers, document status, stored generated PDFs, signed document uploads, template versions, company and branch master data, and audit trails. Carbone is used only as an internal private-network rendering service for DOCX/XLSX templates.

Success means IT staff can create accurate PR documents quickly, generate print-ready PDFs, avoid duplicate PR numbers, preserve immutable snapshots of generated documents, and trace every important document action without relying on manual spreadsheet tracking.

## Brand Personality

Modern premium enterprise: polished, confident, precise, and calm. The interface should feel more refined than a legacy back-office system while still behaving like a dependable internal operations tool. It should prioritize clarity, status visibility, and trust over decoration.

## Anti-references

This product should not look or feel like an old government form: cramped, visually stale, hard to scan, or overloaded with borders and raw fields. It should also avoid consumer-app styling, playful colors, oversized marketing sections, and generic startup landing-page patterns. The system should not make official document work feel casual or ambiguous.

## Design Principles

1. Make document state unmistakable: PR status, generated files, signed uploads, template validation, and audit history must be easy to understand at a glance.
2. Preserve official document truth: generated output, data snapshots, template versions, and running numbers are treated as controlled records, not editable drafts.
3. Keep workflows calm and direct: primary actions should be obvious, destructive actions should be deliberate, and post-generation edits should guide users toward cancel/reissue rules.
4. Support repeated daily work: tables, filters, forms, upload flows, and detail pages should be dense enough for operational use without becoming visually heavy.
5. Separate business logic from rendering: Node.js owns calculations, formatting, validation, and auditability; Carbone only renders approved templates.

## Accessibility & Inclusion

Use WCAG 2.2 AA as the baseline. Body text and form labels must meet contrast requirements, focus states must be visible, all core workflows must be keyboard accessible, status cannot rely on color alone, upload errors must be readable and actionable, and motion should respect reduced-motion preferences. Because the product uses Thai and English labels, layouts must handle mixed-language text without clipping or awkward wrapping.
