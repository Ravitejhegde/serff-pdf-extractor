import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const USER_KEY = "serff-auth-user";
const LAST_RESULT_KEY = "serff-last-result";

const EXPECTED_FIELDS = [
  ["filingCompany", "Filing company"],
  ["state", "State"],
  ["productName", "Product name"],
  ["serffTracking", "SERFF tracking"],
  ["filingStatus", "Filing status"],
  ["stateStatus", "State status"],
  ["submissionType", "Submission type"],
  ["toiSubToi", "TOI / Sub-TOI"],
  ["effectiveDate", "Effective date"],
  ["receivedDate", "Received date"],
  ["dispositionDate", "Disposition date"],
];

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
    menu: <><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></>,
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9" /><path d="M9 20v-6h6v6" /></>,
    file: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5" /><path d="M9 13h6" /><path d="M9 17h6" /></>,
    review: <><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>,
    upload: <><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 20h14" /></>,
    download: <><path d="M12 4v12" /><path d="m7 11 5 5 5-5" /><path d="M5 20h14" /></>,
    eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
    sparkle: <><path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5Z" /><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7Z" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    alert: <><path d="M12 3 22 20H2L12 3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>,
    close: <><path d="m6 6 12 12" /><path d="m18 6-12 12" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    back: <><path d="M19 12H5" /><path d="m11 18-6-6 6-6" /></>,
    external: <><path d="M14 5h5v5" /><path d="M19 5 10 14" /><path d="M19 13v6H5V5h6" /></>,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    user: <><circle cx="12" cy="8" r="3" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
    logout: <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M21 4v16" /></>,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14.8-4L3 9" /><path d="M3 4v5h5" /><path d="M4 13a8 8 0 0 0 14.8 4L21 15" /><path d="M21 20v-5h-5" /></>,
  };

  return <svg {...common}>{paths[name] || paths.file}</svg>;
}

function getText(section) {
  return String(section?.text || "").trim();
}

function normalise(value) {
  return String(value || "").trim().toLowerCase();
}

function findValue(sections, labels) {
  const joined = sections.map((s) => `${s.heading}\n${getText(s)}`).join("\n");
  for (const label of labels) {
    const pattern = new RegExp(`${label}\\s*[:\\-]?\\s*([^\\n]{2,120})`, "i");
    const match = joined.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function buildFilingInfo(result) {
  const sections = result?.sections || [];
  const text = sections.map(getText).join("\n");
  const headingText = sections.map((s) => `${s.heading}\n${getText(s)}`).join("\n");

  const valueOr = (labels, fallback = "") =>
    findValue(sections, labels) || fallback;

  const info = {
    filingCompany: valueOr(
      ["Filing Company", "Company Name", "Filing company name"],
      ""
    ),
    state: valueOr(["State", "State Name"], ""),
    productName: valueOr(["Product Name", "Product"], ""),
    serffTracking: valueOr(
      ["SERFF Tracking", "SERFF Tracking #", "SERFF Tracking Number"],
      ""
    ),
    filingStatus: valueOr(["Filing Status", "SERFF Status"], ""),
    stateStatus: valueOr(["State Status"], ""),
    submissionType: valueOr(["Submission Type"], ""),
    toiSubToi: valueOr(["TOI / Sub-TOI", "TOI/Sub-TOI", "TOI / Sub TOI"], ""),
    effectiveDate: valueOr(
      ["Effective Date", "Effective Date Requested"],
      ""
    ),
    receivedDate: valueOr(["Received Date", "Date Received"], ""),
    dispositionDate: valueOr(["Disposition Date"], ""),
  };

  // Common SERFF labels are often separated by whitespace in extracted PDFs.
  const fallbacks = [
    ["serffTracking", /SERFF\s+Tracking\s*(?:#|Number)?\s*[:\-]?\s*([A-Z0-9\-]+)/i],
    ["productName", /Product\s+Name\s*[:\-]?\s*([^\n]+)/i],
    ["state", /State\s*[:\-]?\s*([^\n]+)/i],
    ["filingStatus", /Filing\s+Status\s*[:\-]?\s*([^\n]+)/i],
    ["stateStatus", /State\s+Status\s*[:\-]?\s*([^\n]+)/i],
    ["submissionType", /Submission\s+Type\s*[:\-]?\s*([^\n]+)/i],
    ["effectiveDate", /Effective\s+Date(?:\s+Requested)?\s*[:\-]?\s*([^\n]+)/i],
    ["receivedDate", /Received\s+Date\s*[:\-]?\s*([^\n]+)/i],
    ["dispositionDate", /Disposition\s+Date\s*[:\-]?\s*([^\n]+)/i],
  ];

  for (const [key, regex] of fallbacks) {
    if (!info[key]) {
      const match = headingText.match(regex);
      if (match?.[1]) info[key] = match[1].trim();
    }
  }

  if (!info.filingCompany) {
    const companyMatch = text.match(
      /(?:Filing Company|Company Name)\s*[:\-]?\s*([^\n]+)/i
    );
    if (companyMatch) info.filingCompany = companyMatch[1].trim();
  }

  return info;
}

function classifySection(heading) {
  const h = normalise(heading);
  if (
    /correspondence|response letter|objection letter|amendment letter|note to reviewer|note to filer|disposition/.test(
      h
    )
  ) {
    return "Correspondence";
  }
  if (/supporting document|attachment|form|document|schedule/.test(h)) {
    return "Documents";
  }
  return "Core";
}

function buildDocumentLinks(sections) {
  const links = [];
  const urlRegex = /https?:\/\/[^\s<>"')]+/gi;

  sections.forEach((section, index) => {
    const text = getText(section);
    const urls = text.match(urlRegex) || [];
    urls.forEach((url) => {
      links.push({
        id: `${index}-${url}`,
        label: section.heading || "Document",
        url,
      });
    });
  });

  return links;
}

function buildReviewData(result, filingInfo) {
  const sections = result?.sections || [];
  const found = [];
  const missing = [];

  EXPECTED_FIELDS.forEach(([key, label]) => {
    const value = filingInfo[key];
    if (value && normalise(value) !== "not available") {
      found.push({ key, label, value });
    } else {
      missing.push({
        key,
        label,
        reason: "Not identified in the extracted filing data.",
      });
    }
  });

  const documentLinks = buildDocumentLinks(sections);
  const documentSections = sections.filter(
    (section) => classifySection(section.heading) === "Documents"
  );

  return {
    found,
    missing,
    documentLinks,
    documentSections,
    sectionCount: sections.length,
  };
}

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
  }

  function submit(event) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    if (mode === "signup") {
      if (!name.trim()) {
        setError("Enter your full name.");
        return;
      }
      if (password.length < 8) {
        setError("Password must contain at least 8 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    const demoUser = {
      name: name.trim() || email.split("@")[0],
      email: email.trim(),
      role: "Compliance Professional",
    };

    // Frontend-only demo authentication.
    // No email, OTP, or authentication API is called.
    localStorage.setItem(USER_KEY, JSON.stringify(demoUser));
    onAuthenticated("demo-access-token", null, demoUser);
  }

  const isSignup = mode === "signup";

  return (
    <main className="auth-screen">
      <section className="auth-card auth-card-wide">
        <div className="auth-brand">
          <div className="brand-mark"><Icon name="file" size={22} /></div>
          <div>
            <strong>SERFF Filing Analysis</strong>
            <span>Compliance intelligence workspace</span>
          </div>
        </div>

        <div className="auth-copy">
          <span className="eyebrow">COMPLIANCE WORKSPACE</span>
          <h1>{isSignup ? "Create your compliance workspace." : "Sign in to review filings."}</h1>
          <p>
            {isSignup
              ? "Create a demo account to access the filing analysis workspace."
              : "Access structured filing data, source text, AI understanding, and review results."}
          </p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {isSignup && (
            <label>
              Full name
              <div className="input-wrap">
                <Icon name="user" size={17} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                />
              </div>
            </label>
          )}

          <label>
            Work email
            <div className="input-wrap">
              <Icon name="user" size={17} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                autoComplete="email"
              />
            </div>
          </label>

          <label>
            Password
            <div className="input-wrap">
              <Icon name="lock" size={17} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                autoComplete={isSignup ? "new-password" : "current-password"}
              />
            </div>
          </label>

          {isSignup && (
            <label>
              Confirm password
              <div className="input-wrap">
                <Icon name="lock" size={17} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                />
              </div>
            </label>
          )}

          {error && <div className="form-error">{error}</div>}

          <button className="primary-button full-width" type="submit">
            {isSignup ? "Create account" : "Sign in"}
            <Icon name="arrow" size={16} />
          </button>

          <button
            type="button"
            className="auth-switch"
            onClick={() => switchMode(isSignup ? "login" : "signup")}
          >
            {isSignup
              ? "Already have an account? Sign in"
              : "New compliance professional? Create an account"}
          </button>
        </form>

        <div className="auth-security">
          <Icon name="lock" size={15} />
          <span>Demo authentication is enabled for the frontend prototype. No email verification is required.</span>
        </div>
      </section>
    </main>
  );
}

function Sidebar({
  screen,
  collapsed,
  onToggle,
  onHome,
  onCurrent,
  onReview,
  filename,
  user,
  onLogout,
}) {
  return (
    <aside className={`app-sidebar ${collapsed ? "is-collapsed" : ""}`}>
      <div className="sidebar-top">
        <div className="sidebar-brand">
          <div className="brand-mark"><Icon name="file" size={20} /></div>
          {!collapsed && (
            <div className="brand-copy">
              <strong>SERFF</strong>
              <span>Filing Workspace</span>
            </div>
          )}
        </div>
        <button className="sidebar-toggle" onClick={onToggle} aria-label="Collapse sidebar">
          <Icon name="menu" size={18} />
        </button>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`nav-item ${screen === "home" ? "active" : ""}`}
          onClick={onHome}
          title="Home"
        >
          <Icon name="home" size={18} />
          {!collapsed && <span>Home</span>}
        </button>

        <button
          className={`nav-item ${screen === "filing" ? "active" : ""}`}
          onClick={onCurrent}
          title="Current Filing"
        >
          <Icon name="file" size={18} />
          {!collapsed && <span>Current Filing</span>}
        </button>

        <button
          className={`nav-item ${screen === "results" ? "active" : ""}`}
          onClick={onReview}
          title="Results"
        >
          <Icon name="review" size={18} />
          {!collapsed && <span>Results</span>}
        </button>
      </nav>

      <div className="sidebar-bottom">
        {filename && !collapsed && (
          <div className="sidebar-filing">
            <span>CURRENT FILING</span>
            <strong title={filename}>{filename}</strong>
          </div>
        )}

        <button className="sidebar-user" onClick={onLogout} title="Sign out">
          <div className="avatar">{(user?.name || "C").slice(0, 1).toUpperCase()}</div>
          {!collapsed && (
            <div className="user-copy">
              <strong>{user?.name || "Compliance Professional"}</strong>
              <span>{user?.role || "Compliance Professional"}</span>
            </div>
          )}
          {!collapsed && <Icon name="logout" size={15} />}
        </button>
      </div>
    </aside>
  );
}

function HomeScreen({ onFile, loading, error }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function chooseFile(file) {
    if (file) onFile(file);
  }

  return (
    <section className="page home-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">FILING INTAKE</span>
          <h1>Start a filing review</h1>
          <p>Upload a SERFF PDF to extract structured filing information.</p>
        </div>
        <div className="secure-chip"><Icon name="lock" size={14} /> Secure workspace</div>
      </div>

      <div
        className={`upload-card ${dragging ? "dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          chooseFile(e.dataTransfer.files?.[0]);
        }}
      >
        <div className="upload-icon"><Icon name="upload" size={25} /></div>
        <h2>Upload a filing PDF</h2>
        <p>Drag and drop a SERFF filing here, or select a document from your computer.</p>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={(e) => chooseFile(e.target.files?.[0])}
        />

        <button
          className="primary-button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
        >
          {loading ? "Extracting filing..." : "Select PDF"}
          {!loading && <Icon name="arrow" size={16} />}
        </button>

        <div className="upload-note">
          <Icon name="check" size={15} />
          <span>PDF only · Source text is preserved for traceability</span>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <Icon name="alert" size={17} />
          <div>
            <strong>Extraction failed</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="home-features">
        <div><Icon name="file" size={17} /><span><strong>Structured extraction</strong>Headings and body text are separated.</span></div>
        <div><Icon name="search" size={17} /><span><strong>Fast navigation</strong>Search across extracted sections.</span></div>
        <div><Icon name="review" size={17} /><span><strong>Review results</strong>See found and missing filing details.</span></div>
      </div>
    </section>
  );
}

function FilingHeader({ result, onNew, onExport, onOriginal }) {
  function exportJson() {
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${result.filename || "filing"}-extraction.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    onExport?.();
  }

  return (
    <div className="filing-header">
      <div className="filing-heading">
        <div className="file-avatar"><Icon name="file" size={20} /></div>
        <div>
          <span className="eyebrow">CURRENT FILING</span>
          <h1>{result.filename}</h1>
          <p>{result.page_count || "—"} pages · {result.section_count || result.sections?.length || 0} sections extracted</p>
        </div>
      </div>

      <div className="header-actions">
        <button className="secondary-button" onClick={onNew}>
          <Icon name="back" size={16} /> New filing
        </button>
        <button className="secondary-button" onClick={onOriginal}>
          <Icon name="eye" size={16} /> View original
        </button>
        <button className="primary-button" onClick={exportJson}>
          <Icon name="download" size={16} /> Export JSON
        </button>
      </div>
    </div>
  );
}

function FilingInformation({ info, pageCount }) {
  const items = [
    ["Filing company", info.filingCompany],
    ["State", info.state],
    ["Product name", info.productName],
    ["SERFF tracking", info.serffTracking],
    ["Filing status", info.filingStatus],
    ["State status", info.stateStatus],
    ["Submission type", info.submissionType],
    ["TOI / Sub-TOI", info.toiSubToi],
    ["Effective date", info.effectiveDate],
    ["Received date", info.receivedDate],
    ["Disposition date", info.dispositionDate],
  ];

  return (
    <section className="panel filing-info-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">FILING INFORMATION</span>
          <h2>At a glance</h2>
        </div>
        <span className="status-badge"><span /> Extracted</span>
      </div>

      <div className="panel-scroll">
        <div className="info-grid">
          {items.map(([label, value]) => (
            <div className="info-cell" key={label}>
              <span>{label}</span>
              <strong className={!value ? "missing-value" : ""}>
                {value || "Not available"}
              </strong>
            </div>
          ))}
          <div className="info-cell">
            <span>Document size</span>
            <strong>{pageCount || "—"} pages</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionList({ sections, selectedId, onSelect }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const filtered = useMemo(() => {
    const q = normalise(query);
    return sections.filter((section) => {
      const group = classifySection(section.heading);
      const matchesFilter = filter === "All" || group === filter;
      const matchesQuery =
        !q ||
        normalise(section.heading).includes(q) ||
        normalise(getText(section)).includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [sections, query, filter]);

  return (
    <section className="panel sections-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">NAVIGATION</span>
          <h2>Extracted sections</h2>
        </div>
        <span className="count-pill">{sections.length}</span>
      </div>

      <div className="section-toolbar">
        <div className="search-input">
          <Icon name="search" size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sections..."
          />
        </div>

        <div className="filter-tabs">
          {["All", "Core", "Correspondence", "Documents"].map((item) => (
            <button
              key={item}
              className={filter === item ? "active" : ""}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="panel-scroll section-scroll">
        {filtered.length === 0 ? (
          <div className="empty-panel">
            <Icon name="search" size={20} />
            <strong>No matching sections</strong>
            <span>Try a different search term.</span>
          </div>
        ) : (
          <div className="section-list">
            {filtered.map((section) => {
              const id = section.id ?? section.original_index;
              const selected = id === selectedId;
              return (
                <button
                  key={id}
                  className={`section-item ${selected ? "selected" : ""}`}
                  onClick={() => onSelect(section, id)}
                >
                  <span className="section-number">
                    {String((section.original_index ?? sections.indexOf(section) + 1) + 1).padStart(2, "0")}
                  </span>
                  <span className="section-copy">
                    <strong>{section.heading || "Untitled section"}</strong>
                    <small>
                      {classifySection(section.heading)} ·{" "}
                      {getText(section)
                        ? `${getText(section).length.toLocaleString()} characters`
                        : "No extracted text"}
                    </small>
                  </span>
                  <Icon name="arrow" size={15} />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function SectionViewer({
  section,
  ai,
  aiLoading,
  aiError,
  onUnderstand,
  onResetAi,
}) {
  const [sourceMode, setSourceMode] = useState(true);

  useEffect(() => {
    setSourceMode(true);
  }, [section]);

  return (
    <section className="panel core-panel">
      <div className="panel-header selected-header">
        <div className="selected-title">
          <span className="eyebrow">SELECTED SECTION</span>
          <h2>{section?.heading || "No section selected"}</h2>
          <p>{classifySection(section?.heading)} · Source-grounded view</p>
        </div>

        <div className="viewer-actions">
          {ai && (
            <button
              className={`secondary-button compact ${sourceMode ? "active" : ""}`}
              onClick={() => setSourceMode(true)}
            >
              Source
            </button>
          )}
          {ai && (
            <button
              className={`secondary-button compact ${!sourceMode ? "active" : ""}`}
              onClick={() => setSourceMode(false)}
            >
              AI view
            </button>
          )}
          <button
            className="primary-button compact"
            onClick={async () => {
              const success = await onUnderstand();
              if (success) setSourceMode(false);
            }}
            disabled={aiLoading}
          >
            <Icon name={aiLoading ? "refresh" : "sparkle"} size={15} />
            {aiLoading ? "Understanding..." : ai ? "Refresh AI" : "Understand with AI"}
          </button>
        </div>
      </div>

      <div className="viewer-scroll">
        {aiError && (
          <div className="error-card">
            <Icon name="alert" size={18} />
            <div>
              <strong>AI understanding failed</strong>
              <span>{aiError}</span>
            </div>
            <button
              className="secondary-button compact"
              onClick={async () => {
                const success = await onUnderstand();
                if (success) setSourceMode(false);
              }}
            >
              Try again
            </button>
          </div>
        )}

        {!ai || sourceMode ? (
          <div className="source-view">
            <div className="source-banner">
              <div>
                <span className="eyebrow">ORIGINAL EXTRACTED SOURCE</span>
                <p>This is the structured text returned by the extraction pipeline.</p>
              </div>
              <span>{getText(section).length.toLocaleString()} chars</span>
            </div>
            <pre className="source-text">{getText(section) || "No extracted text available."}</pre>
          </div>
        ) : (
          <AIView ai={ai} />
        )}
      </div>
    </section>
  );
}

function AIView({ ai }) {
  return (
    <div className="ai-view">
      <div className="ai-overview">
        <span className="eyebrow">AI-GENERATED UNDERSTANDING</span>
        <h3>{ai.heading || "Section understanding"}</h3>
        <p>{ai.overview || "No overview returned."}</p>
      </div>

      {ai.key_information?.length > 0 && (
        <div className="ai-block">
          <div className="ai-block-heading"><strong>Key information</strong></div>
          <div className="key-grid">
            {ai.key_information.map((item, index) => (
              <div className="key-cell" key={`${item.label}-${index}`}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {ai.important_points?.length > 0 && (
        <div className="ai-block">
          <div className="ai-block-heading"><strong>Important points</strong></div>
          <ul className="important-list">
            {ai.important_points.map((point, index) => (
              <li key={index}><Icon name="check" size={15} /><span>{point}</span></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ReviewScreen({ result, filingInfo, onBackToFiling }) {
  const review = useMemo(
    () => buildReviewData(result, filingInfo),
    [result, filingInfo]
  );

  return (
    <section className="page review-page">
      <div className="page-heading review-heading">
        <div>
          <span className="eyebrow">REVIEW RESULTS</span>
          <h1>Filing completeness review</h1>
          <p>
            A structured inventory of information found in the extracted filing.
            Missing means <strong>not identified in the extracted data</strong> and
            should be verified by a compliance professional.
          </p>
        </div>
        <button className="secondary-button" onClick={onBackToFiling}>
          <Icon name="back" size={16} /> Current filing
        </button>
      </div>

      <div className="review-summary">
        <div className="summary-card found">
          <div className="summary-icon"><Icon name="check" size={20} /></div>
          <div><span>Found details</span><strong>{review.found.length}</strong></div>
          <small>Fields identified in extracted text</small>
        </div>
        <div className="summary-card missing">
          <div className="summary-icon"><Icon name="alert" size={20} /></div>
          <div><span>Needs verification</span><strong>{review.missing.length}</strong></div>
          <small>Fields not identified by the extractor</small>
        </div>
        <div className="summary-card docs">
          <div className="summary-icon"><Icon name="file" size={20} /></div>
          <div><span>Document references</span><strong>{review.documentLinks.length}</strong></div>
          <small>Explicit links found in extracted text</small>
        </div>
      </div>

      <div className="review-grid">
        <section className="panel review-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">FOUND</span>
              <h2>Identified filing details</h2>
            </div>
            <span className="status-badge"><span /> Verified from extraction</span>
          </div>

          <div className="review-list-scroll">
            {review.found.map((item) => (
              <div className="review-row found-row" key={item.key}>
                <div className="review-row-icon"><Icon name="check" size={15} /></div>
                <div>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel review-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">NOT IDENTIFIED</span>
              <h2>Details requiring verification</h2>
            </div>
            <span className="warning-badge"><Icon name="alert" size={13} /> Review</span>
          </div>

          <div className="review-list-scroll">
            {review.missing.map((item) => (
              <div className="review-row missing-row" key={item.key}>
                <div className="review-row-icon"><Icon name="alert" size={15} /></div>
                <div>
                  <span>{item.label}</span>
                  <strong>Not identified</strong>
                  <small>{item.reason}</small>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel documents-review-panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">FILES & REFERENCES</span>
            <h2>Document references detected</h2>
            <p>
              This list shows document/link references visible to the extractor.
              It does not prove that an attachment is physically present or absent.
            </p>
          </div>
        </div>

        <div className="document-review-list">
          {review.documentLinks.length > 0 ? (
            review.documentLinks.map((item) => (
              <a
                className="document-row"
                href={item.url}
                target="_blank"
                rel="noreferrer"
                key={item.id}
              >
                <div className="document-row-icon"><Icon name="file" size={17} /></div>
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.url}</span>
                </div>
                <Icon name="external" size={16} />
              </a>
            ))
          ) : (
            <div className="empty-document-state">
              <Icon name="file" size={19} />
              <div>
                <strong>No explicit document links detected</strong>
                <span>This is not the same as confirming that the filing has no attachments.</span>
              </div>
            </div>
          )}
        </div>
      </section>
    </section>
  );
}

function PDFModal({ open, url, filename, onClose }) {
  if (!open || !url) return null;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="pdf-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="pdf-modal-header">
          <div>
            <span className="eyebrow">SOURCE DOCUMENT</span>
            <strong>{filename}</strong>
          </div>
          <button className="icon-button" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>
        <iframe title={filename} src={url} />
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || "null");
    } catch {
      return null;
    }
  });
  const [accessToken, setAccessToken] = useState("");
  const [authRestoring, setAuthRestoring] = useState(false);

  const [screen, setScreen] = useState(() =>
    localStorage.getItem(LAST_RESULT_KEY) ? "filing" : "home"
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [result, setResult] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LAST_RESULT_KEY) || "null");
    } catch {
      return null;
    }
  });
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [ai, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [pdfOpen, setPdfOpen] = useState(false);

  const sections = result?.sections || [];
  const selectedSection =
    sections.find((section, index) => (section.id ?? index) === selectedId) ||
    sections[0] ||
    null;

  useEffect(() => {
    if (result && sections.length && selectedId === null) {
      setSelectedId(sections[0].id ?? 0);
    }
  }, [result, sections, selectedId]);

  function handleAuthenticated(token, _refreshToken, authenticatedUser) {
    setAccessToken(token);
    setUser(authenticatedUser);
    localStorage.setItem(USER_KEY, JSON.stringify(authenticatedUser));
    setScreen(localStorage.getItem(LAST_RESULT_KEY) ? "filing" : "home");
  }

  function resetWorkspace() {
    setResult(null);
    setSelectedId(null);
    setAi(null);
    setAiError("");
    setExtractError("");
    setPdfOpen(false);
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    localStorage.removeItem(LAST_RESULT_KEY);
    setScreen("home");
  }

  async function handleFile(file) {
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setExtractError("Please select a PDF filing.");
      return;
    }

    setLoading(true);
    setExtractError("");
    setAi(null);

    const localUrl = URL.createObjectURL(file);
    setPdfUrl(localUrl);

    try {
      const form = new FormData();
      form.append("file", file);

      const response = await fetch(`${API_BASE_URL}/api/extract`, {
        method: "POST",
        credentials: "include",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        body: form,
      });

      if (!response.ok) {
        let message = `Extraction failed (${response.status}).`;
        try {
          const body = await response.json();
          message = body.detail || message;
        } catch {}
        throw new Error(message);
      }

      const data = await response.json();

      const normalised = {
        ...data,
        sections: (data.sections || []).map((section, index) => ({
          ...section,
          original_index: section.original_index ?? index,
          id: section.id ?? index,
        })),
        section_count: data.section_count ?? data.sections?.length ?? 0,
      };

      setResult(normalised);
      localStorage.setItem(LAST_RESULT_KEY, JSON.stringify(normalised));
      setSelectedId(normalised.sections?.[0]?.id ?? 0);
      setScreen("filing");
    } catch (error) {
      setExtractError(error.message || "Could not extract this filing.");
      URL.revokeObjectURL(localUrl);
      setPdfUrl(null);
    } finally {
      setLoading(false);
    }
  }

  async function understandSelected() {
    if (!selectedSection) return;

    setAiLoading(true);
    setAiError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/understand`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          heading: selectedSection.heading,
          text: getText(selectedSection),
        }),
      });

      if (!response.ok) {
        let message = `AI request failed (${response.status}).`;
        try {
          const body = await response.json();
          message = body.detail || message;
        } catch {}
        throw new Error(message);
      }

      const data = await response.json();
      setAi(data);
      return true;
    } catch (error) {
      setAi(null);
      setAiError(error.message || "AI understanding failed.");
      return false;
    } finally {
      setAiLoading(false);
    }
  }

  function selectSection(section, id) {
    setSelectedId(id);
    setAi(null);
    setAiError("");
  }

  function logout() {
    localStorage.removeItem(USER_KEY);
    setAccessToken("");
    setUser(null);
    resetWorkspace();
  }

  if (authRestoring) {
    return (
      <main className="auth-screen">
        <section className="auth-card auth-loading-card">
          <div className="brand-mark"><Icon name="lock" size={20} /></div>
          <strong>Restoring secure session...</strong>
          <span>Please wait.</span>
        </section>
      </main>
    );
  }

  if (!user || !accessToken) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  const filingInfo = result ? buildFilingInfo(result) : {};

  return (
    <div className={`application-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <Sidebar
        screen={
          screen === "home"
            ? "home"
            : screen === "results"
            ? "results"
            : "filing"
        }
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((value) => !value)}
        onHome={() => setScreen("home")}
        onCurrent={() => {
          if (result) setScreen("filing");
          else setScreen("home");
        }}
        onReview={() => {
          if (result) setScreen("results");
          else setScreen("home");
        }}
        filename={result?.filename}
        user={user}
        onLogout={logout}
      />

      <main className="main-shell">
        {screen === "home" && (
          <HomeScreen
            onFile={handleFile}
            loading={loading}
            error={extractError}
          />
        )}

        {screen === "filing" && result && (
          <div className="filing-workspace">
            <FilingHeader
              result={result}
              onNew={resetWorkspace}
              onOriginal={() => setPdfOpen(true)}
            />

            <div className="workspace-tabs">
              <span className="active">All</span>
              <span>Core</span>
              <span>Correspondence</span>
              <span>Documents</span>
            </div>

            <div className="workspace-grid">
              <FilingInformation
                info={filingInfo}
                pageCount={result.page_count}
              />

              <SectionList
                sections={sections}
                selectedId={selectedId}
                onSelect={selectSection}
              />

              {selectedSection ? (
                <SectionViewer
                  section={selectedSection}
                  ai={ai}
                  aiLoading={aiLoading}
                  aiError={aiError}
                  onUnderstand={understandSelected}
                  onResetAi={() => setAi(null)}
                />
              ) : (
                <section className="panel core-panel empty-panel">
                  <Icon name="file" size={22} />
                  <strong>No section selected</strong>
                  <span>Select a section to inspect its source.</span>
                </section>
              )}
            </div>
          </div>
        )}

        {screen === "results" && result && (
          <ReviewScreen
            result={result}
            filingInfo={filingInfo}
            onBackToFiling={() => setScreen("filing")}
          />
        )}
      </main>

      <PDFModal
        open={pdfOpen}
        url={pdfUrl}
        filename={result?.filename || "Filing PDF"}
        onClose={() => setPdfOpen(false)}
      />
    </div>
  );
}
