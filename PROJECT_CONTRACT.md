# SERFF PDF Extraction Pipeline — Project Contract

**Document type:** Product + Technical Contract  
**Status:** Baseline / Development Contract  
**Version:** 1.0  
**Purpose:** Freeze the product scope, user perspective, architecture, output contract, UI behavior, and acceptance criteria before implementation.

---

# 1. Product Definition

## 1.1 Product name

**SERFF Filing Extractor**

Working description:

> A clean, production-ready web application that converts SERFF filing PDFs into structured, searchable, human-readable information.

## 1.2 Core problem

SERFF filing PDFs contain a mixture of:

- filing identity and metadata
- general information
- company/contact information
- fees
- forms and schedules
- supporting documents
- correspondence
- objections and responses
- filing notes
- repeated page metadata
- narrative text
- tables
- cross-references and document references

The user should not have to manually scan a long PDF to understand the filing.

## 1.3 Core value proposition

> **Upload a SERFF filing PDF → extract its structure → understand the filing quickly → search and export the structured result.**

The application is an **information extraction and review tool**, not an insurance purchasing application and not a generic PDF reader.

---

# 2. Primary User

## 2.1 Primary perspective

The product is designed primarily from the perspective of a:

**Filing Analyst / Regulatory Compliance Professional**

Typical needs:

- identify the filing quickly
- understand company, state, product, and filing status
- inspect major filing sections
- review forms and supporting documents
- find objections and responses
- search extracted content
- export structured data
- avoid manually scanning the entire PDF

## 2.2 Secondary consumer

The extracted JSON is also intended to be usable by:

- another backend service
- an internal application
- an analytics/search system
- a future automation workflow

Therefore:

> **JSON is the source-of-truth output. React is the human presentation layer.**

---

# 3. Product Principles

These principles are mandatory for the project.

## 3.1 Clean over clever

The application must be:

- simple
- professional
- fast to understand
- visually calm
- easy to navigate

Do not add features merely because they are technically possible.

## 3.2 Structure over raw text

The product must organize extracted content into meaningful sections.

Do not present the PDF as one giant text block.

## 3.3 Preserve source meaning

The extractor must not:

- summarize source content
- invent information
- rewrite regulatory language
- infer missing facts
- invent URLs
- silently remove meaningful source content

The first version is an extraction system, not an AI summarizer.

## 3.4 Human-readable + machine-readable

The same extracted information must serve two purposes:

1. Human review in the web UI.
2. Machine consumption through JSON.

## 3.5 Extraction before presentation

Architecture must keep the extraction engine independent from React.

```text
PDF
 ↓
PyMuPDF
 ↓
PDF text/layout elements
 ↓
Structure detection
 ↓
Heading detection
 ↓
Section grouping
 ↓
Structured JSON
 ↓
FastAPI
 ↓
React presentation
```

---

# 4. What the Sample SERFF PDFs Establish

The sample filings demonstrate recurring SERFF concepts including:

- Filing at a Glance
- General Information
- Company and Contact
- Filing Fees
- Correspondence Summary
- Filing Notes
- Form Schedule
- Supporting Document Schedule
- Objection Letter
- Response Letter
- supporting-document attachment references
- repeated SERFF tracking/state/company/product metadata

The samples also show that filings can differ in exact content and status. Therefore the extractor must not depend on one PDF's exact wording or one fixed page layout.

The application must handle variation while preserving the original content.

---

# 5. Information Priority

Not every piece of extracted text has equal importance.

## Priority 1 — Filing Identity

Highest priority.

Examples:

- Company
- State
- Product Name
- SERFF Tracking Number
- Filing Type
- TOI
- Sub-TOI
- Submission date
- SERFF status
- State status
- Disposition status
- Effective date when present

Purpose:

> Answer: **"What filing am I looking at?"**

---

## Priority 2 — Filing Structure

Major section headings such as:

- Filing at a Glance
- General Information
- Company and Contact
- Filing Fees
- Form Schedule
- Supporting Document Schedule
- Correspondence Summary
- Filing Notes
- Objection Letter
- Response Letter

Purpose:

> Answer: **"What information exists in this filing?"**

---

## Priority 3 — Regulatory Correspondence

Important content includes:

- objection status
- objection date
- reviewer comments
- requested changes
- response status
- response date
- company response
- related objection
- changed items
- supporting document changes

Purpose:

> Answer: **"What happened during review?"**

---

## Priority 4 — Forms and Supporting Documents

Preserve:

- item number
- schedule item
- status
- form name
- form number
- form type
- form action
- action-specific data
- readability score when present
- attachment references
- supporting-document names
- public-access/status information when present

Purpose:

> Answer: **"What forms/documents are part of the filing?"**

---

## Priority 5 — General / Administrative Information

Examples:

- filing mode
- market type
- submission type
- filing description
- company contact information
- filing fees
- processing information

Important, but secondary to filing identity and correspondence.

---

## Priority 6 — Repeated Boilerplate / Page Metadata

Examples:

- repeated SERFF Tracking #
- repeated State
- repeated Filing Company
- repeated TOI/Sub-TOI
- repeated Product Name
- generated PDF pipeline footer/header

These must be recognized as repeated page metadata.

They must not become dozens of false sections.

They should be preserved only when meaningful, or normalized into document metadata where appropriate.

---

# 6. Data Classification

The extractor must recognize that PDF content is not one uniform type.

## 6.1 Heading

A section title that starts a logical block.

Examples:

```text
Filing at a Glance
General Information
Company and Contact
Filing Fees
Form Schedule
Objection Letter
Response Letter
```

## 6.2 Key-value data

Example:

```text
State: Arkansas
Product Name: AR - 2026 INCOME CHASSIS
Filing Type: Form
```

## 6.3 Narrative text

Examples:

- Filing Description
- Objection comments
- Response comments
- Notes
- regulatory correspondence

## 6.4 Table data

Examples:

- Form Schedule
- Supporting Document Schedule
- Filing Fees
- Correspondence Summary
- disposition tables

Table relationships should not be destroyed unnecessarily.

## 6.5 Reference / cross-reference text

Examples:

- "See Supporting Documentation tab"
- attachment names
- references to another filing
- references to a Form Schedule item

These are references unless the PDF contains an actual hyperlink.

## 6.6 Repeated metadata

Repeated page headers/footers and generated PDF metadata.

These must be handled separately from semantic content.

---

# 7. Heading Detection Contract

Heading detection is the core extraction challenge.

The implementation must NOT rely on a single rule such as:

> "Large font = heading"

Heading detection should use multiple available PDF signals, including where useful:

- font size
- font weight/boldness
- text position
- spacing before/after
- capitalization
- line structure
- repeated section patterns
- page position
- known SERFF section patterns
- surrounding text
- repeated header/footer detection

The implementation should be deterministic and explainable.

No LLM is required for the core heading detector.

---

# 8. Required Output Contract

The API must return structured JSON.

Minimum conceptual structure:

```json
{
  "filename": "UNAM-135051123.pdf",
  "sections": [
    {
      "heading": "Filing at a Glance",
      "text": "..."
    },
    {
      "heading": "General Information",
      "text": "..."
    },
    {
      "heading": "Company and Contact",
      "text": "..."
    }
  ]
}
```

The implementation may include useful document-level metadata such as:

```json
{
  "filename": "...",
  "page_count": 42,
  "section_count": 12,
  "sections": [...]
}
```

However, metadata must remain simple and must not unnecessarily complicate the core assignment contract.

---

# 9. Source-of-Truth Rule

The extraction JSON is the authoritative result.

React must not independently parse the PDF.

Correct:

```text
PDF
 ↓
Backend extraction
 ↓
JSON
 ↓
React renders JSON
```

Incorrect:

```text
PDF
 ↓
Backend
 ↓
React performs another extraction/parsing process
```

This keeps the system testable and scalable.

---

# 10. Backend Contract

## 10.1 Technology

Required:

- Python
- FastAPI
- PyMuPDF (`fitz`)

## 10.2 Required endpoint

```http
POST /api/extract
```

Input:

- PDF file upload

Output:

- structured JSON

## 10.3 Required behavior

The endpoint must:

1. accept a PDF upload
2. validate that the uploaded file is a PDF
3. extract text/layout information
4. detect logical headings
5. group content under headings
6. return structured JSON
7. return useful errors for invalid input

## 10.4 CORS

CORS must be configured so the React frontend can call the FastAPI backend during development and deployment.

---

# 11. Frontend Contract

## 11.1 Technology

Required:

- React
- Vite

The UI should remain simple and maintainable.

## 11.2 Required user flow

```text
Login
  ↓
Upload filing
  ↓
Click Extract
  ↓
Loading
  ↓
Structured result
  ↓
Search / review
  ↓
Export JSON
```

## 11.3 Mock Login

A lightweight mock login screen is sufficient for the assignment.

There is no requirement for real authentication in the baseline project.

The login exists to demonstrate a realistic product flow.

---

# 12. UI Information Architecture

The result screen should be organized around the analyst's questions.

## Level 1 — Filing Overview

Immediately visible:

- filename
- company
- state
- product
- SERFF tracking number
- status
- key dates where available

## Level 2 — Section Navigation

A compact section list/sidebar or equivalent navigation.

Example:

```text
Filing at a Glance
General Information
Company & Contact
Filing Fees
Form Schedule
Supporting Documents
Correspondence
Filing Notes
```

## Level 3 — Section Content

Display extracted content in readable cards/blocks.

## Level 4 — Special Content

Correspondence should receive clearer visual separation.

Example:

```text
Objection Letter
───────────────
Status
Date
Reviewer
Comments
Related items

Response Letter
───────────────
Status
Date
Company response
Related objection
```

---

# 13. Search Contract

The result screen must provide search/filter capability.

Search should operate on extracted section content.

Minimum behavior:

- type a keyword
- filter matching sections/content
- show which section contains the match
- allow clearing search

Search is for review speed, not semantic AI search.

---

# 14. Export Contract

Provide:

**Export JSON**

The exported JSON must represent the same structured extraction result returned by the API.

The UI must not create a different data model for export.

---

# 15. Upload UX Contract

The upload experience must include:

- drag-and-drop area
- file picker fallback
- selected filename
- clear invalid-file feedback
- Extract button
- loading state
- extraction error state

Do not create unnecessary multi-step upload screens.

---

# 16. Error States

The application must handle at minimum:

### Invalid file

```text
Please upload a PDF file.
```

### No file selected

```text
Select a PDF before extracting.
```

### Extraction failure

Show a clear user-facing message without exposing a Python traceback.

### Empty extraction

If no meaningful text can be extracted:

```text
No readable content was found in this PDF.
```

### Backend unavailable

Show a simple connection/error state.

---

# 17. Visual Design Contract

The product should feel like a professional internal SaaS tool.

Desired characteristics:

- clean
- minimal
- strong hierarchy
- generous spacing
- readable typography
- restrained colors
- clear cards
- subtle borders
- obvious primary action
- no visual clutter

Avoid:

- excessive gradients
- unnecessary animations
- dashboard overload
- giant decorative illustrations
- excessive icons
- fake AI branding
- unnecessary charts
- unnecessary pages

The user should feel that the tool is designed for serious document review.

---

# 18. AI Scope

## Core version

AI is NOT required for:

- PDF text extraction
- heading detection
- section grouping
- JSON generation

The baseline system should work deterministically with PyMuPDF and application logic.

## Future AI opportunities

Possible future additions:

- filing summary
- issue summary
- objection/response explanation
- semantic search
- document classification
- anomaly detection

These are explicitly outside the baseline contract.

---

# 19. "Links" and References Contract

The system must distinguish:

### Actual hyperlink

If the PDF contains a real hyperlink, preserve its URL/destination where practical.

### Document reference

Example:

```text
See Supporting Documentation tab.
```

This is not automatically a URL.

### Attachment reference

Example:

```text
AR-CertificationofCompliance_signed.pdf
```

This should be preserved as an attachment/document reference.

### Cross-filing reference

Example:

```text
SERFF Tracking Number AMGN-133229794
```

This is a reference to another filing.

### Rule

> Never invent a URL from plain reference text.

---

# 20. Tables Contract

Tables must be treated as structured content.

At minimum, the extraction pipeline must preserve enough ordering and text to keep table information understandable.

Where implementation permits, internal extraction may represent table data structurally.

Example future-friendly representation:

```json
{
  "type": "table",
  "headers": ["Item", "Status", "Form Name", "Form Number"],
  "rows": [
    ["1", "Approved", "...", "..."]
  ]
}
```

However, the assignment's required `{heading, text}` contract remains the baseline public output unless the implementation deliberately extends it without breaking compatibility.

---

# 21. Correspondence Contract

Correspondence is important because it describes review history.

The system must preserve distinctions between:

- Objection Letter
- Response Letter
- Note to Filer
- Note to Reviewer
- Correspondence Summary
- Disposition

Do not merge all correspondence into one undifferentiated paragraph.

Where possible, preserve:

- status
- date
- author/recipient
- subject
- comments/body
- related objection
- changed items
- attachments/references

---

# 22. Repeated Header/Footer Contract

Repeated SERFF metadata should not create false sections.

For example, repeated content such as:

```text
SERFF Tracking #: ...
State: ...
Filing Company: ...
Product Name: ...
```

appearing on many pages must be recognized as repeated document metadata.

The system should normalize or suppress repeated boilerplate in section grouping while preserving important source information.

---

# 23. Architecture

Target structure:

```text
serff-pdf-extractor/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── extractor.py
│   │   ├── models.py
│   │   └── services/
│   ├── tests/
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
├── README.md
└── PROJECT_CONTRACT.md
```

This is a target structure, not a reason to create unnecessary abstraction.

If a file is not needed, do not create it merely to make the tree look sophisticated.

---

# 24. Clean Code Rules

## Backend

- small functions
- clear naming
- typed models where useful
- no duplicated extraction logic
- no hardcoded sample PDF content
- no UI logic in extraction code
- useful exceptions
- testable functions

## Frontend

- reusable components only where they genuinely reduce duplication
- simple state management
- no unnecessary global state library
- API communication isolated from presentation
- no PDF parsing in React
- no hardcoded sample result as the production data source

---

# 25. Configuration

Do not hardcode deployment-specific backend URLs inside components.

Use environment configuration where appropriate.

Example:

```text
VITE_API_BASE_URL
```

Backend CORS origins should also be configurable where practical.

---

# 26. Security Baseline

The assignment does not require full enterprise authentication.

Still:

- validate file type
- enforce reasonable upload size
- never execute uploaded files
- process uploads as untrusted input
- avoid exposing filesystem paths in API errors
- do not log sensitive file content unnecessarily
- clean temporary files after processing if temporary storage is used

---

# 27. Performance Baseline

The first version should be designed to process normal SERFF PDFs efficiently.

Requirements:

- do not load unnecessary duplicate data
- process page-by-page where practical
- avoid repeated full-document scans
- keep frontend rendering reasonable for large extracted results

No distributed processing system is required for the baseline.

---

# 28. Testing Contract

Minimum backend tests:

1. valid PDF extraction
2. heading detection
3. section grouping
4. repeated header handling
5. empty/poor extraction handling
6. invalid file handling
7. API response shape

Minimum frontend verification:

1. login flow
2. upload flow
3. loading state
4. extraction result rendering
5. search
6. JSON export
7. error state

At least one real sample SERFF PDF must be used for integration verification.

Recommended sample set:

- `UNAM-135051123.pdf`
- `NYLM-134614243.pdf`
- `AMGN-135003565.pdf`

These samples demonstrate that the structure is not identical across all filings.

---

# 29. Acceptance Criteria

The project is considered complete only when all of the following work:

## Backend

- [ ] FastAPI starts successfully.
- [ ] `POST /api/extract` accepts a PDF.
- [ ] PDF text is extracted with PyMuPDF.
- [ ] Logical headings are detected.
- [ ] Content is grouped under headings.
- [ ] Structured JSON is returned.
- [ ] Invalid uploads return useful errors.
- [ ] Repeated SERFF metadata does not create false sections.
- [ ] Core extraction logic has tests.

## Frontend

- [ ] React/Vite application starts.
- [ ] Mock login works.
- [ ] Drag-and-drop upload works.
- [ ] File picker works.
- [ ] Extract action works.
- [ ] Loading state works.
- [ ] Error state works.
- [ ] Filing overview is clearly visible.
- [ ] Sections are easy to navigate.
- [ ] Search works.
- [ ] JSON export works.

## Product

- [ ] UI is clean and professional.
- [ ] User can understand a filing without reading the raw PDF line-by-line.
- [ ] Correspondence is easy to distinguish.
- [ ] Tables/forms remain understandable.
- [ ] References are preserved without invented URLs.
- [ ] No unnecessary product features have been added.

---

# 30. Out of Scope for Version 1

The following are NOT required unless explicitly added later:

- real user authentication
- user accounts
- database
- billing
- payments
- cloud document storage
- multi-user collaboration
- OCR for scanned PDFs
- LLM summarization
- semantic AI search
- automatic legal/regulatory advice
- insurance recommendations
- external SERFF integration
- automatic document downloading from SERFF
- workflow approvals
- email notifications
- analytics dashboards
- advanced document comparison
- production-scale distributed processing

The goal is a strong, focused extraction product.

---

# 31. Bonus / Customer-Surprise Features

Bonus features must not compromise the core workflow.

Potential candidates, only after the baseline is complete:

### A. Section navigator

Quick jump to any detected section.

### B. Copy section

Copy one section's extracted content.

### C. Extraction quality indicator

Show basic extraction health based on measurable signals.

Do not invent an accuracy percentage.

### D. Processing summary

Example:

```text
42 pages
14 sections
3 correspondence items
18 supporting documents
```

Only show values actually derived from the extraction.

### E. Relevant-match search

Highlight matching terms inside extracted content.

The bonus philosophy:

> **Useful surprise, not feature overload.**

---

# 32. What the Product Must NOT Become

The application must not become:

- a generic PDF reader
- a document management system
- an insurance marketplace
- an AI chatbot
- a legal advice tool
- a giant analytics dashboard

The core product remains:

> **SERFF filing PDF → structured information → fast human review + JSON output**

---

# 33. Definition of Done

The project is done when a reviewer can clone the repository, start the backend and frontend, upload a real SERFF PDF, click Extract, and understand the filing through the resulting interface.

A successful demo should communicate the workflow in seconds:

```text
LOGIN
  ↓
UPLOAD PDF
  ↓
EXTRACT
  ↓
FILING OVERVIEW
  ↓
SECTIONS
  ↓
CORRESPONDENCE
  ↓
SEARCH
  ↓
EXPORT JSON
```

No manual code intervention should be required during the normal demo flow.

---

# 34. Development Order

Implementation must follow this order.

## Phase 1 — Project foundation

- create repository
- create backend
- create frontend
- configure local development
- create README
- create contract

## Phase 2 — Extraction engine

- PDF loading
- text blocks
- layout metadata
- heading detection
- repeated header/footer detection
- section grouping
- JSON output

## Phase 3 — API

- FastAPI
- upload endpoint
- validation
- error handling
- CORS
- tests

## Phase 4 — Frontend shell

- mock login
- application layout
- upload area
- loading/error states

## Phase 5 — Results UI

- filing overview
- section navigation
- section content
- correspondence presentation
- search
- export JSON

## Phase 6 — Real PDF validation

Test against:

- UNAM sample
- NYLM sample
- AMGN sample

Fix extraction/generalization issues discovered from real documents.

## Phase 7 — Polish

- spacing
- typography
- responsive behavior
- error messages
- empty states
- performance
- README
- final demo

## Phase 8 — Optional bonus

Only after all baseline acceptance criteria pass.

---

# 35. Final Product Contract

The entire project can be reduced to these rules:

### Rule 1
**Build for the Filing Analyst.**

### Rule 2
**The PDF is the source; extraction must preserve its meaning.**

### Rule 3
**JSON is the machine-readable source of truth.**

### Rule 4
**React presents the extracted result for humans.**

### Rule 5
**Headings and sections are the core extraction problem.**

### Rule 6
**Correspondence, forms, supporting documents, and references must not be lost.**

### Rule 7
**Repeated PDF boilerplate must not create false structure.**

### Rule 8
**Never invent information or URLs.**

### Rule 9
**Keep the product clean and focused.**

### Rule 10
**Do not add advanced AI/features before the basic extraction workflow is reliable.**

---

# 36. One-Sentence Product Contract

> **Build a clean, production-ready SERFF filing review tool that turns a complex insurance filing PDF into reliable structured sections, presents those sections clearly for a filing/compliance professional, and exposes the same structured result as JSON for other systems.**

---

## Contract Status

**This document is the baseline contract for implementation.**

Any future feature or architectural change should be evaluated against:

1. Primary user value
2. Extraction reliability
3. Simplicity
4. Existing API contract
5. UI clarity
6. Assignment requirements

If a proposed feature does not improve the core workflow, it should not be added by default.
