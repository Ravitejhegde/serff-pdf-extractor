import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

/* ============================================================
   01. CONFIGURATION
   ============================================================ */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const AUTH_STORAGE_KEY = "serff_auth_session";
const USER_STORAGE_KEY = "serff_users";

const EMPTY_RESULT = {
  filename: "",
  page_count: 0,
  section_count: 0,
  sections: [],
};


/* ============================================================
   02. GENERIC HELPERS
   ============================================================ */

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

function cleanValue(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function firstNonEmpty(...values) {
  return values.find((value) => cleanValue(value) !== "") || "";
}

function formatError(error, fallback = "Something went wrong.") {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function isRealDate(value) {
  return /^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(cleanValue(value));
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}


/* ============================================================
   03. FILING FIELD PARSING
   ============================================================ */

const FILING_GLANCE_LABELS = [
  "Company",
  "Product Name",
  "State",
  "TOI",
  "Sub-TOI",
  "Filing Type",
  "Date Submitted",
  "SERFF Tr Num",
  "SERFF Status",
  "State Tr Num",
  "State Status",
  "Co Tr Num",
  "Effective Date Requested",
  "Author(s)",
  "Reviewer(s)",
  "Disposition Date",
  "Disposition Status",
  "Effective Date",
];

const GENERAL_LABELS = [
  "Submission Type",
  "Market Type",
  "Requested Filing Mode",
  "Filing Description",
  "Filing Company Name",
];

const COMPANY_LABELS = [
  "Project Name",
  "Project Number",
  "Submission Type",
  "Filing Company Name",
  "State of Domicile",
  "Market Type",
  "Requested Filing Mode",
];

function findExactField(text, label, knownLabels = []) {
  const source = normalizeText(text);
  if (!source) return "";

  const otherLabels = knownLabels
    .filter((item) => item !== label)
    .sort((a, b) => b.length - a.length)
    .map((item) => `${escapeRegex(item)}\\s*:`)
    .join("|");

  const boundary = otherLabels
    ? `(?=\\n\\s*(?:${otherLabels})|$)`
    : "(?=$)";

  const pattern = new RegExp(
    `(?:^|\\n)\\s*${escapeRegex(label)}\\s*:\\s*([\\s\\S]*?)${boundary}`,
    "i"
  );

  const match = source.match(pattern);
  if (match) return cleanValue(match[1]);

  const flattened = cleanValue(source);
  const flatPattern = new RegExp(
    `${escapeRegex(label)}\\s*:\\s*([^\\n]*?)(?=\\s+(?:${otherLabels})|$)`,
    "i"
  );

  const flatMatch = flattened.match(flatPattern);
  return flatMatch ? cleanValue(flatMatch[1]) : "";
}

function findSectionText(result, heading) {
  const section = result.sections?.find(
    (item) => cleanValue(item.heading).toLowerCase() === cleanValue(heading).toLowerCase()
  );

  return section?.text || "";
}

function buildFilingInfo(result) {
  const glance = findSectionText(result, "Filing at a Glance");
  const general = findSectionText(result, "General Information");
  const company = findSectionText(result, "Company and Contact");

  const getGlance = (label) =>
    findExactField(glance, label, FILING_GLANCE_LABELS);

  const filingType = firstNonEmpty(getGlance("Filing Type"), "Not available");

  const effectiveDateRaw = getGlance("Effective Date");
  const effectiveDate = isRealDate(effectiveDateRaw)
    ? effectiveDateRaw
    : "Not available";

  const submissionType = firstNonEmpty(
    findExactField(general, "Submission Type", GENERAL_LABELS),
    findExactField(company, "Submission Type", COMPANY_LABELS),
    "Not available"
  );

  return {
    filing: filingType,
    mainActor: firstNonEmpty(
      getGlance("Company"),
      "Not available"
    ),
    state: firstNonEmpty(getGlance("State"), "Not available"),
    product: firstNonEmpty(getGlance("Product Name"), "Not available"),
    serffTracking: firstNonEmpty(
      getGlance("SERFF Tr Num"),
      "Not available"
    ),
    filingStatus: firstNonEmpty(
      getGlance("SERFF Status"),
      "Not available"
    ),
    stateStatus: firstNonEmpty(
      getGlance("State Status"),
      "Not available"
    ),
    submissionType,
    toi: firstNonEmpty(
      getGlance("TOI"),
      "Not available"
    ),
    subToi: firstNonEmpty(
      getGlance("Sub-TOI"),
      "Not available"
    ),
    effectiveDate,
    receivedDate: "Not available",
    dispositionDate: firstNonEmpty(
      getGlance("Disposition Date"),
      "Not available"
    ),
  };
}


/* ============================================================
   04. SECTION CLASSIFICATION
   ============================================================ */

const CORE_HEADINGS = new Set([
  "Table of Contents",
  "Filing at a Glance",
  "General Information",
  "Company and Contact",
  "Filing Fees",
  "State Fees",
  "Correspondence Summary",
  "Dispositions",
  "Amendments",
  "Filing Notes",
  "Disposition",
]);

function getSectionGroup(section) {
  const heading = cleanValue(section.heading).toLowerCase();

  if (
    heading.includes("objection") ||
    heading.includes("response letter") ||
    heading.includes("correspondence") ||
    heading.includes("note to reviewer")
  ) {
    return "Correspondence";
  }

  if (
    heading.includes("supporting document") ||
    heading.includes("schedule") ||
    heading.includes("form schedule") ||
    heading.includes("superseded")
  ) {
    return "Documents";
  }

  if (CORE_HEADINGS.has(section.heading)) {
    return "Core";
  }

  return "Core";
}


/* ============================================================
   05. ATTACHED DOCUMENT LINK EXTRACTION
   ============================================================ */

function extractUrlsFromText(text) {
  const source = normalizeText(text);
  const matches =
    source.match(
      /\bhttps?:\/\/[^\s<>"')]+/gi
    ) || [];

  return [...new Set(matches)];
}

function buildDocumentLinks(result) {
  const explicit = Array.isArray(result.document_links)
    ? result.document_links
    : [];

  const links = [...explicit];

  result.sections?.forEach((section, sectionIndex) => {
    extractUrlsFromText(section.text).forEach((url) => {
      links.push({
        label: section.heading || `Document ${sectionIndex + 1}`,
        url,
        section_heading: section.heading,
      });
    });
  });

  const unique = [];
  const seen = new Set();

  links.forEach((item) => {
    if (!item?.url) return;

    const key = item.url.trim();
    if (seen.has(key)) return;

    seen.add(key);

    unique.push({
      label: item.label || "Attached document",
      url: key,
      section_heading: item.section_heading || "",
      page_number: item.page_number || null,
    });
  });

  return unique;
}


/* ============================================================
   06. AUTHENTICATION - FRONTEND DEMO LAYER
   ============================================================ */

function readStoredUsers() {
  try {
    return JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveStoredUsers(users) {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
}

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function saveSession(user) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

function makeUserId() {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function hashPassword(password) {
  if (window.crypto?.subtle) {
    const encoded = new TextEncoder().encode(password);
    const buffer = await crypto.subtle.digest("SHA-256", encoded);
    return [...new Uint8Array(buffer)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  return btoa(unescape(encodeURIComponent(password)));
}


/* ============================================================
   07. ICONS
   ============================================================ */

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
    menu: (
      <>
        <path d="M4 6h16" />
        <path d="M4 12h16" />
        <path d="M4 18h16" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
    file: (
      <>
        <path d="M6 3.5h8l4 4V20.5H6z" />
        <path d="M14 3.5v4h4" />
        <path d="M9 12h6" />
        <path d="M9 16h6" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4" />
        <path d="m7 9 5-5 5 5" />
        <path d="M5 20h14" />
      </>
    ),
    download: (
      <>
        <path d="M12 4v12" />
        <path d="m7 11 5 5 5-5" />
        <path d="M5 20h14" />
      </>
    ),
    arrowLeft: (
      <>
        <path d="M19 12H5" />
        <path d="m11 18-6-6 6-6" />
      </>
    ),
    arrowRight: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    external: (
      <>
        <path d="M14 5h5v5" />
        <path d="M10 14 19 5" />
        <path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
      </>
    ),
    sparkles: (
      <>
        <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2z" />
        <path d="m19 13 .7 2.3L22 16l-2.3.7L19 19l-.7-2.3L16 16l2.3-.7z" />
      </>
    ),
    eye: (
      <>
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12" />
        <path d="m18 6-12 12" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    user: (
      <>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 20c.8-3.6 3.2-5.5 7-5.5s6.2 1.9 7 5.5" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    mail: (
      <>
        <rect x="4" y="6" width="16" height="12" rx="2" />
        <path d="m5 8 7 5 7-5" />
      </>
    ),
    logout: (
      <>
        <path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4" />
        <path d="M14 8l4 4-4 4" />
        <path d="M18 12H9" />
      </>
    ),
  };

  return <svg {...common}>{paths[name]}</svg>;
}


/* ============================================================
   08. AUTH SCREEN
   ============================================================ */

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError("Email and password are required.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const users = readStoredUsers();

      if (mode === "signup") {
        if (!name.trim()) {
          setError("Please enter your name.");
          return;
        }

        if (users.some((user) => user.email === normalizedEmail)) {
          setError("An account with this email already exists.");
          return;
        }

        const passwordHash = await hashPassword(password);

        const user = {
          id: makeUserId(),
          name: name.trim(),
          email: normalizedEmail,
          company: company.trim() || "Insurance Organization",
          passwordHash,
          role: "Filing Analyst",
        };

        saveStoredUsers([...users, user]);

        const session = {
          id: user.id,
          name: user.name,
          email: user.email,
          company: user.company,
          role: user.role,
        };

        saveSession(session);
        onAuthenticated(session);
      } else {
        const user = users.find(
          (item) => item.email === normalizedEmail
        );

        if (!user) {
          setError("No account was found for this email.");
          return;
        }

        const passwordHash = await hashPassword(password);

        if (user.passwordHash !== passwordHash) {
          setError("Incorrect email or password.");
          return;
        }

        const session = {
          id: user.id,
          name: user.name,
          email: user.email,
          company: user.company,
          role: user.role,
        };

        saveSession(session);
        onAuthenticated(session);
      }
    } catch (authError) {
      setError(formatError(authError, "Authentication failed."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-brand">
        <div className="brand-mark">
          <Icon name="file" size={20} />
        </div>

        <div>
          <strong>SERFF FILING ANALYSIS</strong>
          <span>Filing review workspace</span>
        </div>
      </div>

      <main className="auth-main">
        <section className="auth-intro">
          <div className="auth-eyebrow">INSURANCE FILING WORKSPACE</div>

          <h1>
            Understand complex SERFF filings
            <span> with confidence.</span>
          </h1>

          <p>
            Extract structured filing information, review source content,
            and use grounded AI understanding without losing the original
            filing context.
          </p>

          <div className="auth-points">
            <div>
              <Icon name="check" size={17} />
              <span>Source-preserving PDF extraction</span>
            </div>

            <div>
              <Icon name="check" size={17} />
              <span>Structured filing review</span>
            </div>

            <div>
              <Icon name="check" size={17} />
              <span>AI grounded in extracted source text</span>
            </div>
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-card-header">
            <div>
              <h2>
                {mode === "login" ? "Welcome back" : "Create your account"}
              </h2>

              <p>
                {mode === "login"
                  ? "Sign in to continue to your filing workspace."
                  : "Set up your filing analyst workspace."}
              </p>
            </div>
          </div>

          <div className="auth-tabs">
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              Sign in
            </button>

            <button
              type="button"
              className={mode === "signup" ? "active" : ""}
              onClick={() => {
                setMode("signup");
                setError("");
              }}
            >
              Sign up
            </button>
          </div>

          <form className="auth-form" onSubmit={submit}>
            {mode === "signup" && (
              <>
                <label>
                  Full name
                  <div className="field-with-icon">
                    <Icon name="user" size={17} />
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Your name"
                      autoComplete="name"
                    />
                  </div>
                </label>

                <label>
                  Organization
                  <div className="field-with-icon">
                    <Icon name="file" size={17} />
                    <input
                      value={company}
                      onChange={(event) => setCompany(event.target.value)}
                      placeholder="Insurance organization"
                      autoComplete="organization"
                    />
                  </div>
                </label>
              </>
            )}

            <label>
              Work email
              <div className="field-with-icon">
                <Icon name="mail" size={17} />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@company.com"
                  autoComplete="email"
                />
              </div>
            </label>

            <label>
              Password
              <div className="field-with-icon">
                <Icon name="lock" size={17} />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                />
              </div>
            </label>

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="primary-button auth-submit"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                ? "Sign in"
                : "Create account"}
            </button>
          </form>

          <p className="auth-footnote">
            Demo authentication is stored locally in this browser. Connect
            these actions to the production auth API before deployment.
          </p>
        </section>
      </main>
    </div>
  );
}


/* ============================================================
   09. UPLOAD SCREEN
   ============================================================ */

function UploadScreen({ user, onFileSelected, error }) {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const chooseFile = () => inputRef.current?.click();

  const acceptFile = (file) => {
    if (!file) return;
    onFileSelected(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);

    const file = event.dataTransfer.files?.[0];
    acceptFile(file);
  };

  return (
    <div className="upload-workspace">
      <header className="upload-topbar">
        <div className="brand-block">
          <div className="brand-mark">
            <Icon name="file" size={20} />
          </div>

          <div>
            <strong>SERFF FILING ANALYSIS</strong>
            <span>Secure filing review workspace</span>
          </div>
        </div>

        <div className="user-menu-static">
          <div className="avatar">{user.name?.charAt(0)?.toUpperCase()}</div>
          <div>
            <strong>{user.name}</strong>
            <span>{user.role}</span>
          </div>
        </div>
      </header>

      <main className="upload-main">
        <section className="upload-hero">
          <div className="upload-eyebrow">FILING REVIEW WORKSPACE</div>

          <h1>Extract SERFF filings with ease</h1>

          <p>
            Upload a filing PDF and turn its contents into structured,
            searchable information for review.
          </p>
        </section>

        <section
          className={`upload-dropzone ${dragActive ? "drag-active" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={chooseFile}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              chooseFile();
            }
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            hidden
            onChange={(event) => acceptFile(event.target.files?.[0])}
          />

          <div className="upload-icon">
            <Icon name="upload" size={34} />
          </div>

          <h2>Drop your SERFF filing here</h2>

          <p>
            Drag and drop a PDF into this area, or choose one from your
            computer.
          </p>

          <div className="upload-action-row">
            <button
              type="button"
              className="primary-button upload-button"
              onClick={(event) => {
                event.stopPropagation();
                chooseFile();
              }}
            >
              <Icon name="upload" size={17} />
              Choose PDF
            </button>

            <span>PDF files only</span>
          </div>

          {error && <div className="upload-error">{error}</div>}
        </section>

        <section className="upload-capabilities">
          <div className="capability-card">
            <span className="capability-number">01</span>
            <strong>Fast extraction</strong>
            <p>Structured filing data in seconds.</p>
          </div>

          <div className="capability-card">
            <span className="capability-number">02</span>
            <strong>Source-preserving</strong>
            <p>Content is extracted without rewriting.</p>
          </div>

          <div className="capability-card">
            <span className="capability-number">03</span>
            <strong>Machine-readable</strong>
            <p>The same result is available as JSON.</p>
          </div>
        </section>
      </main>
    </div>
  );
}


/* ============================================================
   10. TOP APPLICATION BAR
   ============================================================ */

function AppTopbar({ user, search, onSearch, onLogout, onMenu }) {
  return (
    <header className="app-topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="icon-button"
          onClick={onMenu}
          aria-label="Toggle navigation"
        >
          <Icon name="menu" size={18} />
        </button>

        <div className="topbar-brand">
          <strong>SERFF FILING ANALYSIS</strong>
          <span>Structured filing review workspace</span>
        </div>
      </div>

      <div className="topbar-right">
        <div className="global-search">
          <Icon name="search" size={16} />
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search sections or keywords..."
            aria-label="Search filing"
          />
        </div>

        <div className="topbar-user">
          <div className="avatar">
            {user.name?.charAt(0)?.toUpperCase()}
          </div>

          <div className="topbar-user-text">
            <strong>{user.name}</strong>
            <span>{user.role}</span>
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={onLogout}
            title="Sign out"
          >
            <Icon name="logout" size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}


/* ============================================================
   11. FILING INFORMATION PANEL
   ============================================================ */

function FilingInformation({ info }) {
  const rows = [
    ["Filing", info.filing],
    ["Main actor", info.mainActor],
    ["State", info.state],
    ["Product", info.product],
    ["SERFF Tracking", info.serffTracking],
    ["Filing status", info.filingStatus],
    ["State status", info.stateStatus],
    ["Submission type", info.submissionType],
    [
      "TOI / Sub-TOI",
      `${info.toi} / ${info.subToi}`,
    ],
    ["Effective date", info.effectiveDate],
    ["Received date", info.receivedDate],
    ["Disposition date", info.dispositionDate],
  ];

  return (
    <section className="panel filing-panel">
      <div className="panel-header">
        <div>
          <div className="panel-eyebrow">FILING</div>
          <h2>Filing Information</h2>
          <p>Key information identified from the filing.</p>
        </div>

        <span className="status-pill">
          <span />
          Completed
        </span>
      </div>

      <div className="panel-scroll filing-scroll">
        {rows.map(([label, value]) => (
          <div className="info-row" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}


/* ============================================================
   12. SECTION TABS
   ============================================================ */

function SectionTabs({ activeTab, onTabChange }) {
  const tabs = ["All", "Core", "Correspondence", "Documents"];

  return (
    <div className="section-tabs">
      {tabs.map((tab) => (
        <button
          type="button"
          key={tab}
          className={activeTab === tab ? "active" : ""}
          onClick={() => onTabChange(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}


/* ============================================================
   13. SECTION NAVIGATION PANEL
   ============================================================ */

function SectionsPanel({
  sections,
  activeSectionId,
  onSectionClick,
  search,
  onSearchChange,
}) {
  const filteredSections = useMemo(() => {
    const query = cleanValue(search).toLowerCase();

    if (!query) return sections;

    return sections.filter((section) => {
      const haystack =
        `${section.heading} ${section.text}`.toLowerCase();

      return haystack.includes(query);
    });
  }, [sections, search]);

  return (
    <section className="panel sections-panel">
      <div className="panel-header compact">
        <div>
          <div className="panel-eyebrow">NAVIGATION</div>
          <h2>Sections</h2>
          <p>Navigate the structured filing data.</p>
        </div>

        <span className="count-pill">{sections.length}</span>
      </div>

      <div className="section-search">
        <Icon name="search" size={16} />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search sections..."
        />
      </div>

      <div className="panel-scroll section-list-scroll">
        {filteredSections.length === 0 ? (
          <div className="empty-state compact-empty">
            <strong>No matching sections</strong>
            <span>Try a different search term.</span>
          </div>
        ) : (
          <div className="section-list">
            {filteredSections.map((section) => (
              <button
                type="button"
                className={`section-list-item ${
                  activeSectionId === section.id ? "active" : ""
                }`}
                key={section.id}
                onClick={() => onSectionClick(section.id)}
              >
                <span className="section-number">
                  {section.id + 1}
                </span>

                <span className="section-item-copy">
                  <strong>{section.heading}</strong>

                  <small>
                    {cleanValue(section.text).slice(0, 110) ||
                      "No extracted text available."}
                  </small>
                </span>

                <Icon name="arrowRight" size={15} />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}


/* ============================================================
   14. DOCUMENTS PANEL
   ============================================================ */

function DocumentsPanel({ links, onOpenPdf }) {
  return (
    <section className="panel documents-panel">
      <div className="panel-header compact">
        <div>
          <div className="panel-eyebrow">DOCUMENTS</div>
          <h2>Attached documents</h2>
          <p>Links identified from the filing source.</p>
        </div>

        <span className="count-pill">{links.length}</span>
      </div>

      <div className="panel-scroll documents-scroll">
        <button
          type="button"
          className="document-card original-pdf-card"
          onClick={onOpenPdf}
        >
          <span className="document-icon">
            <Icon name="file" size={17} />
          </span>

          <span className="document-copy">
            <strong>Original PDF</strong>
            <small>Open the uploaded filing source.</small>
          </span>

          <Icon name="external" size={15} />
        </button>

        {links.length === 0 ? (
          <div className="empty-state">
            <strong>No attached links detected</strong>
            <span>
              PDF link annotations can be added to the backend extraction
              contract later.
            </span>
          </div>
        ) : (
          <div className="document-list">
            {links.map((document, index) => (
              <a
                key={`${document.url}-${index}`}
                href={document.url}
                target="_blank"
                rel="noreferrer"
                className="document-card"
              >
                <span className="document-icon">
                  <Icon name="external" size={16} />
                </span>

                <span className="document-copy">
                  <strong>{document.label}</strong>
                  <small>
                    {document.section_heading ||
                      "Attached document"}
                    {document.page_number
                      ? ` · Page ${document.page_number}`
                      : ""}
                  </small>
                </span>

                <Icon name="arrowRight" size={15} />
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}


/* ============================================================
   15. SELECTED SECTION CONTENT
   ============================================================ */

function KeyInformationTable({ items }) {
  if (!items?.length) return null;

  return (
    <div className="ai-block">
      <h3>Key Information</h3>

      <div className="key-info-table">
        {items.map((item, index) => (
          <div className="key-info-row" key={`${item.label}-${index}`}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImportantPoints({ points }) {
  if (!points?.length) return null;

  return (
    <div className="ai-block">
      <h3>Important Points</h3>

      <ul className="important-points">
        {points.map((point, index) => (
          <li key={`${point}-${index}`}>
            <span>
              <Icon name="check" size={13} />
            </span>
            <p>{point}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SourceText({ text }) {
  if (!cleanValue(text)) {
    return (
      <div className="empty-source">
        No extracted text is available for this section.
      </div>
    );
  }

  return <pre className="source-text">{normalizeText(text)}</pre>;
}

function SelectedSectionPanel({
  section,
  aiState,
  onUnderstand,
  onRefresh,
  onViewSource,
  showingSource,
}) {
  if (!section) {
    return (
      <section className="panel selected-panel">
        <div className="empty-state large-empty">
          <strong>Select a section</strong>
          <span>Choose a section from the navigation panel.</span>
        </div>
      </section>
    );
  }

  const aiData = aiState?.data;
  const aiLoading = aiState?.loading;
  const aiError = aiState?.error;

  return (
    <section className="panel selected-panel">
      <div className="selected-header">
        <div>
          <div className="panel-eyebrow">SELECTED SECTION</div>
          <h2>{section.heading}</h2>
          <p>Section {section.id + 1} of the filing</p>
        </div>

        <div className="selected-actions">
          {aiData && (
            <button
              type="button"
              className="secondary-button"
              onClick={onViewSource}
            >
              <Icon name="eye" size={15} />
              {showingSource ? "View AI" : "View source"}
            </button>
          )}

          <button
            type="button"
            className="primary-button"
            onClick={aiData ? onRefresh : onUnderstand}
            disabled={aiLoading || !cleanValue(section.text)}
          >
            <Icon name="sparkles" size={16} />
            {aiLoading
              ? "Understanding..."
              : aiData
              ? "Refresh AI"
              : "Understand with AI"}
          </button>
        </div>
      </div>

      <div className="selected-content-scroll">
        {aiLoading ? (
          <div className="ai-loading">
            <div className="loading-orbit">
              <span />
              <span />
              <span />
            </div>

            <strong>Understanding this section...</strong>

            <p>
              AI is working only from the extracted source text.
            </p>
          </div>
        ) : aiError ? (
          <div className="ai-error-card">
            <strong>AI understanding failed</strong>
            <p>{aiError}</p>

            <button
              type="button"
              className="secondary-button"
              onClick={onUnderstand}
            >
              Try again
            </button>
          </div>
        ) : aiData && !showingSource ? (
          <div className="ai-content">
            <div className="ai-label">
              <Icon name="sparkles" size={14} />
              AI Understanding
            </div>

            <p className="ai-grounding">
              Based only on the extracted source text.
            </p>

            <div className="ai-block">
              <h3>Overview</h3>
              <p className="overview-text">{aiData.overview}</p>
            </div>

            <KeyInformationTable items={aiData.key_information} />

            <ImportantPoints points={aiData.important_points} />
          </div>
        ) : (
          <div className="source-content">
            <div className="source-label">
              Original extracted source
            </div>

            <p className="source-grounding">
              This is the exact structured text returned by the extraction
              pipeline for this section.
            </p>

            <SourceText text={section.text} />
          </div>
        )}
      </div>
    </section>
  );
}


/* ============================================================
   16. ORIGINAL PDF MODAL
   ============================================================ */

function PdfViewerModal({
  file,
  pdfUrl,
  isOpen,
  onClose,
}) {
  // The original PDF must NEVER open automatically.
  // It is rendered only after the user explicitly clicks
  // "View original PDF" or the Documents-panel PDF action.
  if (!isOpen || !pdfUrl) return null;

  return (
    <div
      className="pdf-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Original PDF viewer"
    >
      <div className="pdf-modal">
        <div className="pdf-modal-header">
          <div>
            <div className="panel-eyebrow">ORIGINAL DOCUMENT</div>
            <h2>{file?.name || "Original filing.pdf"}</h2>
            <p>Original uploaded PDF · source of truth</p>
          </div>

          <div className="pdf-modal-actions">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="secondary-button"
            >
              <Icon name="external" size={15} />
              Open in new tab
            </a>

            <button
              type="button"
              className="icon-button"
              onClick={onClose}
              aria-label="Close PDF viewer"
            >
              <Icon name="close" size={19} />
            </button>
          </div>
        </div>

        <div className="pdf-modal-body">
          <iframe
            key={pdfUrl}
            src={pdfUrl}
            title="Original uploaded PDF"
            className="pdf-frame"
          />
        </div>
      </div>
    </div>
  );
}


/* ============================================================
   17. LIVE FILING REVIEW
   ============================================================ */

function buildReviewReport(result) {
  const glance = findSectionText(result, "Filing at a Glance");
  const general = findSectionText(result, "General Information");
  const company = findSectionText(result, "Company and Contact");
  const allText = normalizeText(
    (result.sections || []).map((section) => section.text || "").join("\n")
  );

  const getGlance = (label) =>
    findExactField(glance, label, FILING_GLANCE_LABELS);

  const checks = [
    {
      key: "company",
      label: "Filing company",
      value: getGlance("Company"),
      source: "Filing at a Glance",
      category: "Filing identity",
    },
    {
      key: "state",
      label: "State",
      value: getGlance("State"),
      source: "Filing at a Glance",
      category: "Filing identity",
    },
    {
      key: "product",
      label: "Product name",
      value: getGlance("Product Name"),
      source: "Filing at a Glance",
      category: "Filing identity",
    },
    {
      key: "serff",
      label: "SERFF tracking number",
      value: getGlance("SERFF Tr Num"),
      source: "Filing at a Glance",
      category: "Filing identity",
    },
    {
      key: "filing-status",
      label: "SERFF filing status",
      value: getGlance("SERFF Status"),
      source: "Filing at a Glance",
      category: "Workflow",
    },
    {
      key: "state-status",
      label: "State status",
      value: getGlance("State Status"),
      source: "Filing at a Glance",
      category: "Workflow",
    },
    {
      key: "submission",
      label: "Submission type",
      value: firstNonEmpty(
        findExactField(general, "Submission Type", GENERAL_LABELS),
        findExactField(company, "Submission Type", COMPANY_LABELS)
      ),
      source: "General Information / Company and Contact",
      category: "Filing setup",
    },
    {
      key: "toi",
      label: "TOI / Sub-TOI",
      value: [
        getGlance("TOI"),
        getGlance("Sub-TOI"),
      ].filter(Boolean).join(" / "),
      source: "Filing at a Glance",
      category: "Filing setup",
    },
    {
      key: "submitted",
      label: "Date submitted",
      value: getGlance("Date Submitted"),
      source: "Filing at a Glance",
      category: "Dates",
    },
    {
      key: "effective-requested",
      label: "Effective date requested",
      value: getGlance("Effective Date Requested"),
      source: "Filing at a Glance",
      category: "Dates",
    },
    {
      key: "effective",
      label: "Effective date",
      value: getGlance("Effective Date"),
      source: "Filing at a Glance",
      category: "Dates",
      reviewIf: (value) =>
        Boolean(value) && !isRealDate(value) && value.toLowerCase() !== "not available",
    },
    {
      key: "disposition-date",
      label: "Disposition date",
      value: getGlance("Disposition Date"),
      source: "Filing at a Glance",
      category: "Dates",
    },
    {
      key: "disposition-status",
      label: "Disposition status",
      value: getGlance("Disposition Status"),
      source: "Filing at a Glance",
      category: "Workflow",
    },
  ];

  const normalizedChecks = checks.map((item) => {
    const value = cleanValue(item.value);
    let status = "missing";

    if (value) {
      status = item.reviewIf?.(value) ? "review" : "found";
    }

    return {
      ...item,
      value: value || "Not found in extracted text",
      status,
    };
  });

  const sections = result.sections || [];
  const headings = sections.map((section) => cleanValue(section.heading).toLowerCase());
  const lowerText = allText.toLowerCase();

  const documentChecks = [
    {
      key: "supporting-schedule",
      label: "Supporting document schedule",
      description: "A section or extracted text referring to supporting documents.",
      found:
        headings.some((heading) => heading.includes("supporting document")) ||
        lowerText.includes("supporting document"),
      evidence:
        sections.find((section) =>
          cleanValue(section.heading).toLowerCase().includes("supporting document")
        )?.heading || "No supporting-document section detected",
    },
    {
      key: "attachments",
      label: "Attachments / attached documents",
      description: "Attachment references detected in the extracted filing text.",
      found: lowerText.includes("attachment"),
      evidence: lowerText.includes("attachment")
        ? "Attachment reference found in extracted text"
        : "No attachment reference detected",
    },
    {
      key: "document-links",
      label: "Document links",
      description: "Explicit web/document links detected in the filing.",
      found: buildDocumentLinks(result).length > 0,
      evidence: `${buildDocumentLinks(result).length} link${
        buildDocumentLinks(result).length === 1 ? "" : "s"
      } detected`,
    },
    {
      key: "correspondence",
      label: "Correspondence / response material",
      description: "Objection, response, disposition or reviewer correspondence sections.",
      found: sections.some((section) => getSectionGroup(section) === "Correspondence"),
      evidence: `${
        sections.filter((section) => getSectionGroup(section) === "Correspondence").length
      } correspondence section${
        sections.filter((section) => getSectionGroup(section) === "Correspondence").length === 1
          ? ""
          : "s"
      } detected`,
    },
  ];

  const foundCount = normalizedChecks.filter((item) => item.status === "found").length;
  const reviewCount = normalizedChecks.filter((item) => item.status === "review").length;
  const missingCount = normalizedChecks.filter((item) => item.status === "missing").length;
  const documentsFound = documentChecks.filter((item) => item.found).length;

  return {
    checks: normalizedChecks,
    documentChecks,
    counts: {
      found: foundCount,
      review: reviewCount,
      missing: missingCount,
      documentsFound,
      total: normalizedChecks.length,
    },
  };
}

function ReviewStatusBadge({ status }) {
  const config = {
    found: { label: "Found", icon: "check" },
    review: { label: "Needs review", icon: "eye" },
    missing: { label: "Missing", icon: "close" },
  };

  const item = config[status] || config.missing;

  return (
    <span className={`review-status review-status-${status}`}>
      <Icon name={item.icon} size={13} />
      {item.label}
    </span>
  );
}

function ReviewScreen({ result, onGoToFiling, onGoHome }) {
  const hasFiling = Boolean(result?.filename);
  const report = useMemo(
    () => (hasFiling ? buildReviewReport(result) : null),
    [result, hasFiling]
  );

  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const filteredChecks = useMemo(() => {
    if (!report) return [];

    return report.checks.filter((item) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "found" && item.status === "found") ||
        (filter === "review" && item.status === "review") ||
        (filter === "missing" && item.status === "missing");

      const needle = query.trim().toLowerCase();
      const matchesQuery =
        !needle ||
        item.label.toLowerCase().includes(needle) ||
        item.value.toLowerCase().includes(needle) ||
        item.category.toLowerCase().includes(needle);

      return matchesFilter && matchesQuery;
    });
  }, [report, filter, query]);

  if (!hasFiling || !report) {
    return (
      <div className="review-screen">
        <div className="review-empty-card">
          <div className="review-empty-icon">
            <Icon name="file" size={24} />
          </div>
          <div className="panel-eyebrow">FILING REVIEW</div>
          <h1>No filing to review</h1>
          <p>
            Upload and extract a SERFF filing from Home. The review results will
            populate automatically as soon as extraction completes.
          </p>
          <button
            type="button"
            className="primary-button"
            onClick={onGoHome}
          >
            <Icon name="upload" size={16} />
            Upload a filing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="review-screen review-screen-live">
      <div className="review-header">
        <div>
          <div className="panel-eyebrow">FILING REVIEW</div>
          <h1>Review results</h1>
          <p>
            Live checks generated from the extracted filing. This is an
            information review, not a legal or compliance determination.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={onGoToFiling}
        >
          <Icon name="arrowLeft" size={15} />
          Current filing
        </button>
      </div>

      <div className="review-filing-bar">
        <div>
          <span>Current filing</span>
          <strong>{result.filename}</strong>
        </div>
        <div className="review-filing-meta">
          <span>{result.page_count || 0} pages</span>
          <span>{result.section_count || result.sections?.length || 0} sections</span>
          <span className="live-indicator">
            <i />
            Live
          </span>
        </div>
      </div>

      <div className="review-summary-grid">
        <div className="review-summary-card">
          <span>Found</span>
          <strong>{report.counts.found}</strong>
          <small>details present</small>
        </div>
        <div className="review-summary-card review-summary-card-warning">
          <span>Needs review</span>
          <strong>{report.counts.review}</strong>
          <small>ambiguous values</small>
        </div>
        <div className="review-summary-card review-summary-card-danger">
          <span>Missing</span>
          <strong>{report.counts.missing}</strong>
          <small>not found in text</small>
        </div>
        <div className="review-summary-card">
          <span>Document signals</span>
          <strong>{report.counts.documentsFound}</strong>
          <small>of {report.documentChecks.length} detected</small>
        </div>
      </div>

      <div className="review-content-grid">
        <section className="review-panel">
          <div className="review-panel-header">
            <div>
              <div className="panel-eyebrow">FILING DETAILS</div>
              <h2>Information check</h2>
            </div>
            <span className="review-count-pill">
              {filteredChecks.length}/{report.counts.total}
            </span>
          </div>

          <div className="review-toolbar">
            <div className="review-search">
              <Icon name="search" size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search review items..."
                aria-label="Search review items"
              />
            </div>

            <div className="review-filter-tabs">
              {[
                ["all", "All"],
                ["found", "Found"],
                ["review", "Review"],
                ["missing", "Missing"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={filter === value ? "active" : ""}
                  onClick={() => setFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="review-list">
            {filteredChecks.map((item) => (
              <div className="review-row" key={item.key}>
                <div className={`review-row-icon review-row-icon-${item.status}`}>
                  <Icon
                    name={
                      item.status === "found"
                        ? "check"
                        : item.status === "review"
                        ? "eye"
                        : "close"
                    }
                    size={16}
                  />
                </div>

                <div className="review-row-main">
                  <div className="review-row-top">
                    <strong>{item.label}</strong>
                    <ReviewStatusBadge status={item.status} />
                  </div>
                  <div className="review-row-value">{item.value}</div>
                  <div className="review-row-source">
                    {item.category} · Source: {item.source}
                  </div>
                </div>
              </div>
            ))}

            {filteredChecks.length === 0 && (
              <div className="review-no-results">
                No review items match the current filter.
              </div>
            )}
          </div>
        </section>

        <section className="review-panel review-documents-panel">
          <div className="review-panel-header">
            <div>
              <div className="panel-eyebrow">DOCUMENT SIGNALS</div>
              <h2>Files & references</h2>
            </div>
            <span className="review-count-pill">
              {report.counts.documentsFound}/{report.documentChecks.length}
            </span>
          </div>

          <div className="review-document-list">
            {report.documentChecks.map((item) => (
              <div className="review-document-item" key={item.key}>
                <div className={item.found ? "document-signal found" : "document-signal missing"}>
                  <Icon name={item.found ? "check" : "close"} size={15} />
                </div>
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.description}</p>
                  <small>{item.evidence}</small>
                </div>
              </div>
            ))}
          </div>

          <div className="review-note">
            <Icon name="eye" size={16} />
            <div>
              <strong>Human review stays in control</strong>
              <p>
                These signals are derived only from the extracted PDF text.
                Missing here means “not detected,” not “not legally required.”
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ============================================================
   17. RESULTS SCREEN
   ============================================================ */

function ResultsScreen({
  user,
  result,
  file,
  pdfUrl,
  onNewFiling,
  onLogout,
  onGoHome,
  onOpenReview,
}) {
  const [activeTab, setActiveTab] = useState("All");
  const [sectionSearch, setSectionSearch] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [activeSectionId, setActiveSectionId] = useState(0);
  const [aiState, setAiState] = useState({
    loading: false,
    data: null,
    error: "",
  });
  const [showingSource, setShowingSource] = useState(false);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const requestIdRef = useRef(0);

  const sections = useMemo(
    () =>
      (result.sections || []).map((section, index) => ({
        ...section,
        id: index,
      })),
    [result.sections]
  );

  const filingInfo = useMemo(
    () => buildFilingInfo(result),
    [result]
  );

  const documentLinks = useMemo(
    () => buildDocumentLinks(result),
    [result]
  );

  const tabSections = useMemo(() => {
    if (activeTab === "All") return sections;

    return sections.filter(
      (section) => getSectionGroup(section) === activeTab
    );
  }, [sections, activeTab]);

  const searchedSections = useMemo(() => {
    const query = cleanValue(sectionSearch).toLowerCase();

    if (!query) return tabSections;

    return tabSections.filter((section) => {
      const haystack =
        `${section.heading} ${section.text}`.toLowerCase();

      return haystack.includes(query);
    });
  }, [tabSections, sectionSearch]);

  const selectedSection = useMemo(() => {
    return (
      sections.find((section) => section.id === activeSectionId) ||
      searchedSections[0] ||
      tabSections[0] ||
      sections[0] ||
      null
    );
  }, [
    sections,
    activeSectionId,
    searchedSections,
    tabSections,
  ]);

  const selectedSectionInCurrentList = searchedSections.some(
    (section) => section.id === selectedSection?.id
  );

  useEffect(() => {
    if (!sections.length) return;

    if (!selectedSectionInCurrentList) {
      const fallback =
        searchedSections[0] ||
        tabSections[0] ||
        sections[0];

      if (fallback && fallback.id !== activeSectionId) {
        setActiveSectionId(fallback.id);
      }
    }
  }, [
    sections,
    searchedSections,
    tabSections,
    selectedSectionInCurrentList,
    activeSectionId,
  ]);

  useEffect(() => {
    setAiState({
      loading: false,
      data: null,
      error: "",
    });
    setShowingSource(false);
    requestIdRef.current += 1;
  }, [activeSectionId]);

  const selectSection = (sectionId) => {
    setActiveSectionId(sectionId);
  };

  const changeTab = (tab) => {
    setActiveTab(tab);

    const nextSections =
      tab === "All"
        ? sections
        : sections.filter(
            (section) => getSectionGroup(section) === tab
          );

    const query = cleanValue(sectionSearch).toLowerCase();

    const nextVisible = query
      ? nextSections.filter((section) =>
          `${section.heading} ${section.text}`
            .toLowerCase()
            .includes(query)
        )
      : nextSections;

    if (nextVisible[0]) {
      setActiveSectionId(nextVisible[0].id);
    }
  };

  const changeSectionSearch = (value) => {
    setSectionSearch(value);

    const query = cleanValue(value).toLowerCase();

    const visible = tabSections.filter((section) =>
      query
        ? `${section.heading} ${section.text}`
            .toLowerCase()
            .includes(query)
        : true
    );

    if (visible[0]) {
      setActiveSectionId(visible[0].id);
    }
  };

  const understandSection = async () => {
    if (!selectedSection || !cleanValue(selectedSection.text)) return;

    const requestId = ++requestIdRef.current;

    setAiState({
      loading: true,
      data: null,
      error: "",
    });

    setShowingSource(false);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/understand`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            heading: selectedSection.heading,
            text: selectedSection.text,
          }),
        }
      );

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload.detail ||
            `AI request failed with status ${response.status}.`
        );
      }

      if (requestId !== requestIdRef.current) return;

      setAiState({
        loading: false,
        data: payload,
        error: "",
      });
    } catch (error) {
      if (requestId !== requestIdRef.current) return;

      setAiState({
        loading: false,
        data: null,
        error: formatError(
          error,
          "Unable to understand this section."
        ),
      });
    }
  };

  const exportJson = () => {
    const payload = JSON.stringify(result, null, 2);

    downloadBlob(
      new Blob([payload], {
        type: "application/json;charset=utf-8",
      }),
      `${result.filename || "serff-filing"}.json`
    );
  };

  return (
    <div
      className={`application-shell ${
        sidebarCollapsed ? "sidebar-collapsed" : ""
      }`}
    >
      <aside className="app-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="brand-mark">
              <Icon name="file" size={19} />
            </div>

            <div className="sidebar-brand-copy">
              <strong>SERFF</strong>
              <span>Filing Workspace</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          <button
            type="button"
            className="sidebar-nav-item"
            onClick={onGoHome}
            title="Home"
          >
            <Icon name="file" size={18} />
            <span>Home</span>
          </button>

          <button
            type="button"
            className="sidebar-nav-item active"
            title="Current Filing"
          >
            <Icon name="file" size={18} />
            <span>Current Filing</span>
          </button>

          <button
            type="button"
            className="sidebar-nav-item"
            onClick={onOpenReview}
            title="Review"
          >
            <Icon name="check" size={18} />
            <span>Review</span>
          </button>
        </nav>

        <div className="sidebar-filing">
          <span>Current filing</span>
          <strong>{result.filename || "No filing loaded"}</strong>
        </div>
      </aside>

      <AppTopbar
        user={user}
        search={globalSearch}
        onSearch={(value) => {
          setGlobalSearch(value);
          setSectionSearch(value);
        }}
        onLogout={onLogout}
        onMenu={() => setSidebarCollapsed((value) => !value)}
      />

      <main className="results-workspace">
        <div className="results-toolbar">
          <div className="filing-title">
            <div className="filing-title-icon">
              <Icon name="file" size={21} />
            </div>

            <div>
              <h1>{result.filename}</h1>
              <p>
                {result.page_count} pages ·{" "}
                {result.section_count ?? sections.length} sections extracted
              </p>
            </div>
          </div>

          <div className="results-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onNewFiling}
            >
              <Icon name="arrowLeft" size={15} />
              New filing
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={exportJson}
            >
              <Icon name="download" size={15} />
              Export JSON
            </button>
          </div>
        </div>

        <div className="workspace-tabs-row">
          <SectionTabs
            activeTab={activeTab}
            onTabChange={changeTab}
          />

          <button
            type="button"
            className="secondary-button original-pdf-button"
            onClick={() => setShowPdfViewer(true)}
            disabled={!pdfUrl}
          >
            <Icon name="eye" size={15} />
            View original PDF
          </button>
        </div>

        <div className="workspace-grid">
          <FilingInformation info={filingInfo} />

          {activeTab === "Documents" ? (
            <DocumentsPanel
              links={documentLinks}
              onOpenPdf={() => setShowPdfViewer(true)}
            />
          ) : (
            <SectionsPanel
              sections={tabSections}
              activeSectionId={selectedSection?.id ?? null}
              onSectionClick={selectSection}
              search={sectionSearch}
              onSearchChange={changeSectionSearch}
            />
          )}

          <SelectedSectionPanel
            section={selectedSection}
            aiState={aiState}
            onUnderstand={understandSection}
            onRefresh={understandSection}
            onViewSource={() =>
              setShowingSource((value) => !value)
            }
            showingSource={showingSource}
          />
        </div>
      </main>

      <PdfViewerModal
        file={file}
        pdfUrl={pdfUrl}
        isOpen={showPdfViewer}
        onClose={() => setShowPdfViewer(false)}
      />
    </div>
  );
}


/* ============================================================
   18. ROOT APPLICATION
   ============================================================ */

export default function App() {
  const [user, setUser] = useState(() => readSession());
  const [screen, setScreen] = useState(
    () => (readSession() ? "upload" : "auth")
  );

  const [file, setFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const pdfUrlRef = useRef("");

  const [result, setResult] = useState(EMPTY_RESULT);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
        pdfUrlRef.current = "";
      }
    };
  }, []);

  const createPdfUrl = (nextFile) => {
    if (pdfUrlRef.current) {
      URL.revokeObjectURL(pdfUrlRef.current);
    }

    const nextUrl = URL.createObjectURL(nextFile);

    pdfUrlRef.current = nextUrl;
    setPdfUrl(nextUrl);

    return nextUrl;
  };

  const handleAuthenticated = (session) => {
    setUser(session);
    setScreen("upload");
    setError("");
  };

  const handleLogout = () => {
    clearSession();

    setUser(null);
    setScreen("auth");
    setFile(null);
    setResult(EMPTY_RESULT);
    setError("");
  };

  const handleFileSelected = async (nextFile) => {
    if (!nextFile) return;

    if (
      nextFile.type !== "application/pdf" &&
      !nextFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Please select a PDF file.");
      return;
    }

    if (nextFile.size === 0) {
      setError("The selected PDF is empty.");
      return;
    }

    setError("");
    setFile(nextFile);

    // IMPORTANT:
    // Keep the browser object URL alive for the entire review session.
    // This powers the original-PDF viewer.
    createPdfUrl(nextFile);

    try {
      const formData = new FormData();
      formData.append("file", nextFile);

      const response = await fetch(
        `${API_BASE_URL}/api/extract`,
        {
          method: "POST",
          body: formData,
        }
      );

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload.detail ||
            `Extraction failed with status ${response.status}.`
        );
      }

      setResult(payload);
      setScreen("results");
    } catch (uploadError) {
      setError(
        formatError(
          uploadError,
          "Unable to extract the PDF."
        )
      );
    }
  };

  const handleNewFiling = () => {
    setResult(EMPTY_RESULT);
    setFile(null);
    setError("");
    setScreen("upload");
  };

  if (!user || screen === "auth") {
    return (
      <AuthScreen
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  if (screen === "upload") {
    return (
      <UploadScreen
        user={user}
        onFileSelected={handleFileSelected}
        error={error}
      />
    );
  }

  if (screen === "review") {
    return (
      <div className="application-shell review-application-shell">
        <aside className="app-sidebar">
          <div className="sidebar-header">
            <div className="sidebar-brand">
              <div className="brand-mark">
                <Icon name="file" size={19} />
              </div>

              <div className="sidebar-brand-copy">
                <strong>SERFF</strong>
                <span>Filing Workspace</span>
              </div>
            </div>
          </div>

          <nav className="sidebar-nav" aria-label="Primary navigation">
            <button
              type="button"
              className="sidebar-nav-item"
              onClick={() => setScreen("upload")}
              title="Home"
            >
              <Icon name="file" size={18} />
              <span>Home</span>
            </button>

            <button
              type="button"
              className="sidebar-nav-item"
              onClick={() => setScreen("results")}
              title="Current Filing"
            >
              <Icon name="file" size={18} />
              <span>Current Filing</span>
            </button>

            <button
              type="button"
              className="sidebar-nav-item active"
              title="Review"
            >
              <Icon name="check" size={18} />
              <span>Review</span>
            </button>
          </nav>

          <div className="sidebar-filing">
            <span>Current filing</span>
            <strong>{result.filename || "No filing loaded"}</strong>
          </div>
        </aside>

        <main className="review-main">
          <ReviewScreen
            result={result}
            onGoToFiling={() => setScreen("results")}
            onGoHome={() => setScreen("upload")}
          />
        </main>
      </div>
    );
  }

  return (
    <ResultsScreen
      user={user}
      result={result}
      file={file}
      pdfUrl={pdfUrl}
      onNewFiling={handleNewFiling}
      onLogout={handleLogout}
      onGoHome={() => setScreen("upload")}
      onOpenReview={() => setScreen("review")}
    />
  );
}
