# SERFF PDF Extractor

> A document intelligence web application for extracting, structuring, reviewing, and understanding information from SERFF filing PDFs.

**Live Application:** https://serff-pdf-extractor.vercel.app/  
**API Documentation:** https://serff-pdf-extractor.onrender.com/docs

---

## Overview

SERFF PDF Extractor is a full-stack web application designed to make large and complex SERFF filing documents easier to inspect and understand.

Instead of treating a filing PDF as a single block of text, the application processes the document into structured information such as:

- Filing metadata
- Sections
- Headings
- Body content
- Documents
- Page information
- Review signals

The application also provides an optional AI-assisted understanding layer that helps users interpret a selected section without replacing the original extracted source.

The core design principle is:

> **Extraction first. AI second.**

The extracted document remains the source of truth, while AI is used as an additional interpretation layer.

---

## Problem

SERFF filings can contain large amounts of information distributed across many pages and sections.

A user reviewing a filing may need to:

1. Open a large PDF.
2. Locate important sections.
3. Identify headings and relevant content.
4. Understand what information is present.
5. Review the filing systematically.
6. Refer back to the original document.

Doing this manually can be time-consuming and difficult to navigate.

SERFF PDF Extractor addresses this by turning the filing into a structured, searchable workspace.

---

## Solution

The application provides a workflow where a user can:

```text
Upload Filing PDF
       ↓
Extract Document Structure
       ↓
Identify Filing Information
       ↓
Organize Sections
       ↓
Review Extracted Content
       ↓
Select a Section
       ↓
Optional AI Understanding
       ↓
Review / Export / View Original
