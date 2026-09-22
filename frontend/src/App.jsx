import { useMemo, useRef, useState } from "react";
import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const EMPTY_RESULT = null;

function Icon({ name, size = 18 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const paths = {
    home: (
      <>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5.5 9.5V21h13V9.5" />
        <path d="M9.5 21v-6h5v6" />
      </>
    ),

    file: (
      <>
        <path d="M6 3h8l4 4v14H6z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6" />
        <path d="M9 17h6" />
      </>
    ),

    menu: (
      <>
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h16" />
      </>
    ),

    search: (
      <>
        <circle cx="10.8" cy="10.8" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),

    download: (
      <>
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M4 20h16" />
      </>
    ),

    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),

    arrowLeft: (
      <path d="m15 18-6-6 6-6" />
    ),

    arrowRight: (
      <path d="m9 18 6-6-6-6" />
    ),

    check: (
      <path d="m5 12 4 4L19 6" />
    ),

    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),

    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V20h-2.6v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1A1.7 1.7 0 0 0 8 15a1.7 1.7 0 0 0-1.6-1H6v-2.6h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V5h2.6v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1V14h-.1a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),

    external: (
      <>
        <path d="M14 5h5v5" />
        <path d="m19 5-8 8" />
        <path d="M19 13v5H6V5h5" />
      </>
    ),

    x: (
      <>
        <path d="m6 6 12 12" />
        <path d="m18 6-12 12" />
      </>
    ),

    chevronDown: (
      <path d="m6 9 6 6 6-6" />
    ),

    list: (
      <>
        <path d="M8 6h12" />
        <path d="M8 12h12" />
        <path d="M8 18h12" />
        <circle
          cx="4"
          cy="6"
          r=".7"
          fill="currentColor"
        />
        <circle
          cx="4"
          cy="12"
          r=".7"
          fill="currentColor"
        />
        <circle
          cx="4"
          cy="18"
          r=".7"
          fill="currentColor"
        />
      </>
    ),
  };

  return (
    <svg {...common}>
      {paths[name]}
    </svg>
  );
}

function normalize(value = "") {
  return value
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
}

function findValue(text, labels) {
  const source = text || "";

  for (const label of labels) {
    const escaped = label.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const regex = new RegExp(
      `${escaped}\\s*:?\\s*([^\\n|]+)`,
      "i"
    );

    const match = source.match(regex);

    if (match?.[1]) {
      const value = normalize(match[1]);

      if (value && value.length < 180) {
        return value;
      }
    }
  }

  return "Not available";
}

function buildFilingInfo(result) {
  const allText = result.sections
    .map(
      (section) =>
        `${section.heading}\n${section.text}`
    )
    .join("\n");

  const atAGlance =
    result.sections.find((section) =>
      section.heading
        .toLowerCase()
        .includes("filing at a glance")
    )?.text || "";

  const general =
    result.sections.find((section) =>
      section.heading
        .toLowerCase()
        .includes("general information")
    )?.text || "";

  const company =
    result.sections.find((section) =>
      section.heading
        .toLowerCase()
        .includes("company and contact")
    )?.text || "";

  const combined = `${atAGlance}\n${general}\n${company}\n${allText}`;

  return {
    filingType: findValue(combined, [
      "Filing Type",
      "Submission Type",
      "FilingType",
    ]),

    filingCompany: findValue(combined, [
      "Filing Company",
      "Company Name",
      "FilingCompany",
    ]),

    state: findValue(combined, [
      "State",
      "State Name",
    ]),

    productName: findValue(combined, [
      "Product Name",
      "ProductName",
    ]),

    serffTracking: findValue(combined, [
      "SERFF Tracking #",
      "SERFF Tracking Number",
    ]),

    filingStatus: findValue(combined, [
      "SERFF Status",
      "Filing Status",
      "Status",
    ]),

    stateStatus: findValue(combined, [
      "State Status",
    ]),

    submissionType: findValue(combined, [
      "Submission Type",
      "SubmissionType",
    ]),

    toi: findValue(combined, [
      "TOI/Sub-TOI",
      "TOI",
    ]),

    effectiveDate: findValue(combined, [
      "Effective Date",
      "Proposed Effective Date",
    ]),

    receivedDate: findValue(combined, [
      "Received Date",
      "Date Received",
    ]),

    dispositionDate: findValue(combined, [
      "Disposition Date",
    ]),
  };
}

function getSectionGroup(section) {
  const heading = section.heading.toLowerCase();

  if (
    heading.includes("objection") ||
    heading.includes("response") ||
    heading.includes("correspondence") ||
    heading.includes("disposition") ||
    heading.includes("amendment") ||
    heading.includes("note to reviewer") ||
    heading.includes("note to filer")
  ) {
    return "correspondence";
  }

  if (
    heading.includes("form") ||
    heading.includes("supporting document") ||
    heading.includes("superseded")
  ) {
    return "documents";
  }

  return "sections";
}

function HomeScreen({
  onFileSelected,
  selectedFile,
  onExtract,
  loading,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const chooseFile = (file) => {
    if (!file) {
      return;
    }

    if (file.type !== "application/pdf") {
      alert("Please select a PDF file.");
      return;
    }

    onFileSelected(file);
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);

    chooseFile(
      event.dataTransfer.files?.[0]
    );
  };

  return (
    <div className="home-page">
      <div className="home-content">
        <div className="home-title-block">
          <div className="home-eyebrow">
            SERFF FILING ANALYSIS
          </div>

          <h1>
            Extract SERFF filings with ease
          </h1>

          <p>
            Upload a filing PDF and turn its
            contents into structured,
            searchable information for review.
          </p>
        </div>

        <div
          className={`upload-card ${
            dragging ? "dragging" : ""
          }`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() =>
            setDragging(false)
          }
          onDrop={onDrop}
        >
          <div className="upload-icon">
            <Icon
              name="download"
              size={22}
            />
          </div>

          <h2>
            {selectedFile
              ? selectedFile.name
              : "Drop your SERFF filing here"}
          </h2>

          <p>
            {selectedFile
              ? `${(
                  selectedFile.size /
                  1024 /
                  1024
                ).toFixed(2)} MB`
              : "Drag and drop a PDF into this area, or choose one from your computer."}
          </p>

          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            hidden
            onChange={(event) =>
              chooseFile(
                event.target.files?.[0]
              )
            }
          />

          <button
            className="primary-button"
            onClick={() =>
              inputRef.current?.click()
            }
            type="button"
          >
            Choose PDF
          </button>

          {selectedFile && (
            <button
              className="extract-button"
              disabled={loading}
              onClick={onExtract}
              type="button"
            >
              {loading
                ? "Extracting..."
                : "Extract Filing"}
            </button>
          )}

          <span className="upload-hint">
            PDF files only
          </span>
        </div>

        <div className="simple-features">
          <div>
            <strong>
              Fast extraction
            </strong>
            <span>
              Structured filing data in
              seconds
            </span>
          </div>

          <div>
            <strong>
              Source-preserving
            </strong>
            <span>
              Content is extracted without
              rewriting
            </span>
          </div>

          <div>
            <strong>
              Machine readable
            </strong>
            <span>
              Same result available as JSON
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilingInfo({ info }) {
  const rows = [
    ["Filing", info.filingType],
    ["Main actor", info.filingCompany],
    ["State", info.state],
    ["Product", info.productName],
    [
      "SERFF Tracking",
      info.serffTracking,
    ],
    [
      "Filing status",
      info.filingStatus,
    ],
    [
      "State status",
      info.stateStatus,
    ],
    [
      "Submission type",
      info.submissionType,
    ],
    [
      "TOI / Sub-TOI",
      info.toi,
    ],
    [
      "Effective date",
      info.effectiveDate,
    ],
    [
      "Received date",
      info.receivedDate,
    ],
    [
      "Disposition date",
      info.dispositionDate,
    ],
  ];

  return (
    <div className="card filing-information">
      <div className="card-header">
        <div>
          <h2>
            Filing Information
          </h2>

          <p>
            Key information identified
            from the filing.
          </p>
        </div>

        <span className="completed-badge">
          <span />
          Completed
        </span>
      </div>

      <div className="info-table">
        {rows.map(
          ([label, value]) => (
            <div
              className="info-row"
              key={label}
            >
              <span>{label}</span>
              <strong>
                {value}
              </strong>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function SectionsPanel({
  sections,
  search,
  onSearchChange,
  activeSection,
  onSectionClick,
}) {
  const filtered =
    sections.filter(
      (section) =>
        `${section.heading} ${section.text}`
          .toLowerCase()
          .includes(
            search.toLowerCase()
          )
    );

  return (
    <div className="card sections-card">
      <div className="card-header">
        <div>
          <h2>
            Extracted Sections
          </h2>

          <p>
            Navigate the structured
            filing data.
          </p>
        </div>

        <span className="result-count">
          {filtered.length} shown
        </span>
      </div>

      <div className="section-search">
        <Icon
          name="search"
          size={17}
        />

        <input
          value={search}
          onChange={(event) =>
            onSearchChange(
              event.target.value
            )
          }
          placeholder="Search sections..."
        />
      </div>

      <div className="section-list">
        {filtered.length === 0 ? (
          <div className="empty-state">
            No sections match your
            search.
          </div>
        ) : (
          filtered.map(
            (section, index) => (
              <button
                type="button"
                className={`section-item ${
                  activeSection ===
                  index
                    ? "active"
                    : ""
                }`}
                key={`${section.heading}-${index}`}
                onClick={() =>
                  onSectionClick(
                    index
                  )
                }
              >
                <span className="section-number">
                  {index + 1}
                </span>

                <span className="section-main">
                  <strong>
                    {section.heading}
                  </strong>

                  <small>
                    {section.text
                      ? normalize(
                          section.text
                        ).slice(
                          0,
                          115
                        )
                      : "No extracted text available."}
                  </small>
                </span>

                <Icon
                  name="arrowRight"
                  size={17}
                />
              </button>
            )
          )
        )}
      </div>
    </div>
  );
}

function SectionViewer({
  section,
  onUnderstand,
  understanding,
  understandingLoading,
  understandingError,
}) {
  if (!section) {
    return (
      <div className="section-viewer empty-viewer">
        <p>
          Select a section to review
          its extracted content.
        </p>
      </div>
    );
  }

  return (
    <div className="section-viewer">
      <div className="viewer-header">
        <div>
          <span>
            Selected section
          </span>

          <h2>
            {section.heading}
          </h2>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={onUnderstand}
          disabled={
            understandingLoading ||
            !section.text?.trim()
          }
        >
          {understandingLoading
            ? "Understanding..."
            : "Understand with AI"}
        </button>
      </div>

      {understandingError && (
        <div className="ai-error">
          <strong>
            AI understanding failed
          </strong>

          <span>
            {understandingError}
          </span>
        </div>
      )}

      {understanding && (
        <div className="ai-understanding">
          <div className="ai-header">
            <div>
              <span>
                AI Understanding
              </span>

              <small>
                Based on extracted
                source text
              </small>
            </div>
          </div>

          {understanding.overview && (
            <div className="ai-overview">
              <h3>
                Overview
              </h3>

              <p>
                {understanding.overview}
              </p>
            </div>
          )}

          {understanding
            .key_information
            ?.length > 0 && (
            <div className="ai-key-information">
              <h3>
                Key Information
              </h3>

              {understanding.key_information.map(
                (item, index) => (
                  <div
                    className="ai-info-row"
                    key={`${item.label}-${index}`}
                  >
                    <span>
                      {item.label}
                    </span>

                    <strong>
                      {item.value}
                    </strong>
                  </div>
                )
              )}
            </div>
          )}

          {understanding
            .important_points
            ?.length > 0 && (
            <div className="ai-important-points">
              <h3>
                Important Points
              </h3>

              <ul>
                {understanding.important_points.map(
                  (
                    point,
                    index
                  ) => (
                    <li
                      key={index}
                    >
                      {point}
                    </li>
                  )
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="viewer-content">
        <div className="source-header">
          <div>
            <span>
              Source text
            </span>

            <h3>
              Original Extracted
              Content
            </h3>
          </div>

          <span className="source-badge">
            Source of truth
          </span>
        </div>

        {section.text ? (
          section.text
            .split("\n")
            .map(
              (line, index) => (
                <p key={index}>
                  {line}
                </p>
              )
            )
        ) : (
          <p className="muted">
            No extracted text
            available for this
            section.
          </p>
        )}
      </div>
    </div>
  );
}

function ResultsScreen({
  result,
  onNewFiling,
  onHome,
  onDownload,
}) {
  const [menuOpen, setMenuOpen] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [tab, setTab] =
    useState("overview");

  const [activeSection, setActiveSection] =
    useState(0);

  const [understanding, setUnderstanding] =
    useState(null);

  const [
    understandingLoading,
    setUnderstandingLoading,
  ] = useState(false);

  const [
    understandingError,
    setUnderstandingError,
  ] = useState("");

  const info = useMemo(
    () => buildFilingInfo(result),
    [result]
  );

  const filteredByTab =
    useMemo(() => {
      if (
        tab ===
        "correspondence"
      ) {
        return result.sections.filter(
          (section) =>
            getSectionGroup(
              section
            ) ===
            "correspondence"
        );
      }

      if (
        tab === "documents"
      ) {
        return result.sections.filter(
          (section) =>
            getSectionGroup(
              section
            ) === "documents"
        );
      }

      return result.sections;
    }, [result, tab]);

  const selectedSection =
    filteredByTab[
      activeSection
    ] || filteredByTab[0];

  const handleUnderstandSection =
    async () => {
      if (!selectedSection) {
        return;
      }

      if (
        !selectedSection.text?.trim()
      ) {
        setUnderstanding(null);

        setUnderstandingError(
          "This section has no extracted text to understand."
        );

        return;
      }

      setUnderstanding(null);
      setUnderstandingError("");
      setUnderstandingLoading(true);

      try {
        const response =
          await fetch(
            `${API_URL}/api/understand-section`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                heading:
                  selectedSection.heading,
                text:
                  selectedSection.text,
              }),
            }
          );

        let data;

        try {
          data =
            await response.json();
        } catch {
          data = {};
        }

        if (!response.ok) {
          throw new Error(
            data.detail ||
              "Could not understand this section."
          );
        }

        setUnderstanding(data);
      } catch (error) {
        setUnderstandingError(
          error.message ||
            "Could not connect to the AI service."
        );
      } finally {
        setUnderstandingLoading(
          false
        );
      }
    };

  const handleSectionClick =
    (index) => {
      setActiveSection(index);
      setUnderstanding(null);
      setUnderstandingError("");
    };

  const changeTab =
    (nextTab) => {
      setTab(nextTab);
      setActiveSection(0);
      setSearch("");
      setUnderstanding(null);
      setUnderstandingError("");
    };

  return (
    <div className="workspace">
      <header className="topbar">
        <div className="topbar-left">
          <button
            type="button"
            className="menu-button"
            onClick={() =>
              setMenuOpen(
                (value) =>
                  !value
              )
            }
            aria-label="Toggle navigation"
          >
            <Icon
              name="menu"
              size={21}
            />
          </button>

          <span className="topbar-description">
            Turn complex SERFF
            filings into
            structured data.
          </span>
        </div>

        <div className="topbar-right">
          <div className="global-search">
            <Icon
              name="search"
              size={17}
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search sections or keywords..."
            />
          </div>

          <button
            type="button"
            className="icon-button"
            title="Notifications"
          >
            <Icon
              name="bell"
              size={19}
            />

            <span className="notification-dot" />
          </button>

          <div className="user-profile">
            <span className="avatar">
              R
            </span>

            <div>
              <strong>
                Raviteja
              </strong>

              <small>
                Filing Analyst
              </small>
            </div>

            <Icon
              name="chevronDown"
              size={15}
            />
          </div>
        </div>
      </header>

      {menuOpen && (
        <div
          className="mobile-menu-backdrop"
          onClick={() =>
            setMenuOpen(false)
          }
        />
      )}

      <aside
        className={`sidebar ${
          menuOpen
            ? "open"
            : ""
        }`}
      >
        <div className="brand-mark">
          <div className="brand-icon">
            <Icon
              name="file"
              size={20}
            />
          </div>

          {menuOpen && (
            <div className="brand-text">
              <strong>
                SERFF
              </strong>

              <span>
                Filing Extractor
              </span>
            </div>
          )}
        </div>

        <nav className="side-nav">
          <button
            type="button"
            onClick={onHome}
            className="side-item"
            title="Home"
          >
            <Icon
              name="home"
              size={18}
            />

            {menuOpen && (
              <span>
                Home
              </span>
            )}
          </button>

          <button
            type="button"
            className="side-item active"
            title="Current Filing"
          >
            <Icon
              name="file"
              size={18}
            />

            {menuOpen && (
              <span>
                Current Filing
              </span>
            )}
          </button>

          <button
            type="button"
            className="side-item"
            title="Settings"
          >
            <Icon
              name="settings"
              size={18}
            />

            {menuOpen && (
              <span>
                Settings
              </span>
            )}
          </button>
        </nav>

        <div className="sidebar-footer">
          <span>?</span>

          {menuOpen && (
            <div>
              <strong>
                Need help?
              </strong>

              <small>
                Filing extraction
                workspace
              </small>
            </div>
          )}
        </div>
      </aside>

      <main className="main-content">
        <div className="content-container">
          <div className="page-toolbar">
            <button
              type="button"
              className="back-button"
              onClick={onHome}
            >
              <Icon
                name="arrowLeft"
                size={17}
              />

              Back to Home
            </button>

            <div className="toolbar-actions">
              <div className="success-message">
                <span className="success-icon">
                  <Icon
                    name="check"
                    size={15}
                  />
                </span>

                <div>
                  <strong>
                    File processed
                    successfully
                  </strong>

                  <small>
                    Ready for review
                  </small>
                </div>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={
                  onDownload
                }
              >
                <Icon
                  name="download"
                  size={17}
                />

                Download JSON
              </button>

              <button
                type="button"
                className="primary-button new-filing"
                onClick={
                  onNewFiling
                }
              >
                <Icon
                  name="plus"
                  size={17}
                />

                New Filing
              </button>
            </div>
          </div>

          <div className="file-heading">
            <div className="pdf-icon">
              PDF
            </div>

            <div>
              <h1>
                {result.filename}
              </h1>

              <div className="file-meta">
                <span>
                  {result.page_count}{" "}
                  pages
                </span>

                <i>•</i>

                <span>
                  {result.section_count}{" "}
                  sections
                </span>

                <i>•</i>

                <span>
                  Processed
                  successfully
                </span>
              </div>
            </div>
          </div>

          <div className="success-banner">
            <Icon
              name="check"
              size={16}
            />

            <span>
              File processed
              successfully.
            </span>
          </div>

          <div className="tabs">
            <button
              type="button"
              className={
                tab ===
                "overview"
                  ? "active"
                  : ""
              }
              onClick={() =>
                changeTab(
                  "overview"
                )
              }
            >
              Overview
            </button>

            <button
              type="button"
              className={
                tab ===
                "sections"
                  ? "active"
                  : ""
              }
              onClick={() =>
                changeTab(
                  "sections"
                )
              }
            >
              Sections
            </button>

            <button
              type="button"
              className={
                tab ===
                "correspondence"
                  ? "active"
                  : ""
              }
              onClick={() =>
                changeTab(
                  "correspondence"
                )
              }
            >
              Correspondence
            </button>

            <button
              type="button"
              className={
                tab ===
                "documents"
                  ? "active"
                  : ""
              }
              onClick={() =>
                changeTab(
                  "documents"
                )
              }
            >
              Documents
            </button>

            <button
              type="button"
              className={
                tab === "json"
                  ? "active"
                  : ""
              }
              onClick={() =>
                changeTab(
                  "json"
                )
              }
            >
              Raw JSON
            </button>
          </div>

          {tab === "json" ? (
            <div className="card raw-json-card">
              <div className="card-header">
                <div>
                  <h2>
                    Raw JSON
                  </h2>

                  <p>
                    The exact
                    structured
                    result returned
                    by the API.
                  </p>
                </div>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    onDownload
                  }
                >
                  <Icon
                    name="download"
                    size={16}
                  />

                  Download
                </button>
              </div>

              <pre>
                {JSON.stringify(
                  result,
                  null,
                  2
                )}
              </pre>
            </div>
          ) : (
            <div className="results-grid">
              <div className="left-column">
                {tab ===
                  "overview" && (
                  <FilingInfo
                    info={info}
                  />
                )}

                {tab !==
                  "overview" && (
                  <div className="card compact-info-card">
                    <div className="card-header">
                      <div>
                        <h2>
                          {tab ===
                          "correspondence"
                            ? "Correspondence"
                            : tab ===
                              "documents"
                              ? "Forms & Documents"
                              : "All Sections"}
                        </h2>

                        <p>
                          Review the
                          extracted
                          filing
                          content.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="middle-column">
                <SectionsPanel
                  sections={
                    filteredByTab
                  }
                  search={search}
                  onSearchChange={
                    setSearch
                  }
                  activeSection={
                    activeSection
                  }
                  onSectionClick={
                    handleSectionClick
                  }
                />
              </div>

              <div className="right-column">
                <SectionViewer
                  section={
                    selectedSection
                  }
                  onUnderstand={
                    handleUnderstandSection
                  }
                  understanding={
                    understanding
                  }
                  understandingLoading={
                    understandingLoading
                  }
                  understandingError={
                    understandingError
                  }
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] =
    useState("home");

  const [
    selectedFile,
    setSelectedFile,
  ] = useState(null);

  const [result, setResult] =
    useState(EMPTY_RESULT);

  const [loading, setLoading] =
    useState(false);

  const handleExtract =
    async () => {
      if (!selectedFile) {
        return;
      }

      setLoading(true);

      try {
        const formData =
          new FormData();

        formData.append(
          "file",
          selectedFile
        );

        const response =
          await fetch(
            `${API_URL}/api/extract`,
            {
              method: "POST",
              body: formData,
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail ||
              "Failed to extract the PDF."
          );
        }

        setResult(data);
        setScreen("results");
      } catch (error) {
        alert(
          error.message ||
            "Could not connect to the extraction backend."
        );
      } finally {
        setLoading(false);
      }
    };

  const handleNewFiling =
    () => {
      setSelectedFile(null);
      setResult(null);
      setScreen("home");
    };

  const handleDownload =
    () => {
      if (!result) {
        return;
      }

      const json =
        JSON.stringify(
          result,
          null,
          2
        );

      const blob =
        new Blob([json], {
          type: "application/json",
        });

      const url =
        URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          "a"
        );

      link.href = url;

      link.download =
        result.filename.replace(
          /\.pdf$/i,
          ".json"
        );

      document.body.appendChild(
        link
      );

      link.click();
      link.remove();

      URL.revokeObjectURL(
        url
      );
    };

  if (screen === "home") {
    return (
      <HomeScreen
        selectedFile={
          selectedFile
        }
        onFileSelected={
          setSelectedFile
        }
        onExtract={
          handleExtract
        }
        loading={loading}
      />
    );
  }

  return (
    <ResultsScreen
      result={result}
      onNewFiling={
        handleNewFiling
      }
      onHome={() =>
        setScreen("home")
      }
      onDownload={
        handleDownload
      }
    />
  );
}