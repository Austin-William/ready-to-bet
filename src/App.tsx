import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { normalizeLanguage, translations, type Language } from "./i18n";

type Player = { name: string; choice: string };
type Bet = {
  id: string;
  title: string;
  context: string;
  players: Player[];
  deadline: string;
  tags: string[];
  createdAt: string;
  status: "open" | "settled";
  result?: string;
};

const today = new Date();
const dateIn = (days: number) => {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const paths: Record<string, ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    tag: (
      <>
        <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
        <circle cx="7.5" cy="7.5" r=".8" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 11h18" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    check: (
      <>
        <path d="m5 12 4 4L19 6" />
      </>
    ),
    close: (
      <>
        <path d="m18 6-12 12M6 6l12 12" />
      </>
    ),
    chevron: (
      <>
        <path d="m9 18 6-6-6-6" />
      </>
    ),
    sparkle: (
      <>
        <path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" />
        <path d="m19 14 1 2.5 2.5 1-2.5 1L19 21l-1-2.5-2.5-1 2.5-1L19 14Z" />
      </>
    ),
  };
  return (
    <svg {...common} aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

const colors = [
  "#e8efff",
  "#fbe9df",
  "#e9f3e8",
  "#f8ebf1",
  "#f5efd9",
  "#e6f0f0",
];
const avatarColor = (name: string) =>
  colors[name.charCodeAt(0) % colors.length];
const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
const prettyDate = (date: string, language: Language) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(
    language === "fr" ? "fr-FR" : language === "ko" ? "ko-KR" : "en-US",
    { year: "numeric", month: "short", day: "numeric" },
  );
const dayDiff = (date: string) =>
  Math.ceil((new Date(`${date}T23:59:00`).getTime() - Date.now()) / 86400000);

type LocalSaveState = "saved" | "error";

function useLocalStorageState<T>(
  key: string,
  initialValue: T,
  normalize: (value: T) => T = (value) => value,
) {
  const [value, setValue] = useState<T>(() => {
    try {
      const storedValue = window.localStorage.getItem(key);
      return storedValue
        ? normalize(JSON.parse(storedValue) as T)
        : initialValue;
    } catch {
      return initialValue;
    }
  });
  const [saveState, setSaveState] = useState<LocalSaveState>("saved");

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, [key, value]);

  return [value, setValue, saveState] as const;
}

const removeOldExampleBets = (bets: Bet[]) =>
  bets.filter((bet) => !/^b[1-4]$/.test(bet.id));
const removeOldExampleTags = (tags: string[]) =>
  tags.filter(
    (tag) => !["Friends", "Weekend", "Football", "Food", "Local"].includes(tag),
  );

export default function App() {
  const [bets, setBets, betsSaveState] = useLocalStorageState<Bet[]>(
    "sidebet-bets",
    [],
    removeOldExampleBets,
  );
  const [knownTags, setKnownTags, tagsSaveState] = useLocalStorageState<
    string[]
  >("sidebet-tags", [], removeOldExampleTags);
  const [language, setLanguage, languageSaveState] =
    useLocalStorageState<Language>(
      "ready-to-bet-language",
      "en",
      normalizeLanguage,
    );
  const [filter, setFilter] = useState("All bets");
  const [sortOrder, setSortOrder] = useState("newest");
  const [activeTag, setActiveTag] = useState("");
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const tagFilterRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [playerCount, setPlayerCount] = useState(2);
  const [detailsBet, setDetailsBet] = useState<Bet | null>(null);
  const [settleBet, setSettleBet] = useState<Bet | null>(null);
  const [resultChoice, setResultChoice] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!showCreate) setPlayerCount(2);
  }, [showCreate]);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!tagMenuOpen) return;

    function closeMenu(event: PointerEvent) {
      if (!tagFilterRef.current?.contains(event.target as Node)) {
        setTagMenuOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setTagMenuOpen(false);
    }

    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [tagMenuOpen]);

  const openBets = bets.filter((bet) => bet.status === "open");
  const settledBets = bets.filter((bet) => bet.status === "settled");
  const playerTotal = new Set(
    bets.flatMap((bet) => bet.players.map((player) => player.name)),
  ).size;
  const localSaveFailed =
    betsSaveState === "error" ||
    tagsSaveState === "error" ||
    languageSaveState === "error";
  const t = (phrase: string) =>
    language === "en" ? phrase : (translations[language][phrase] ?? phrase);
  const visibleBets = useMemo(
    () =>
      bets
        .filter((bet) => {
          if (filter === "Open" && bet.status !== "open") return false;
          if (filter === "Settled" && bet.status !== "settled") return false;
          if (activeTag && !bet.tags.includes(activeTag)) return false;
          const text =
            `${bet.title} ${bet.context} ${bet.tags.join(" ")} ${bet.players.map((p) => `${p.name} ${p.choice}`).join(" ")}`.toLowerCase();
          return text.includes(query.toLowerCase());
        })
        .map((bet, index) => ({ bet, index }))
        .sort((a, b) => {
          const field =
            sortOrder === "newest" || sortOrder === "oldest"
              ? "createdAt"
              : "deadline";
          const direction =
            sortOrder === "newest" || sortOrder === "latest" ? -1 : 1;
          const dateDifference =
            (Date.parse(a.bet[field]) || 0) - (Date.parse(b.bet[field]) || 0);
          if (dateDifference !== 0) return dateDifference * direction;
          if (field === "createdAt" && sortOrder === "oldest") {
            return b.index - a.index;
          }
          return a.index - b.index;
        })
        .map(({ bet }) => bet),
    [bets, filter, activeTag, query, sortOrder],
  );

  function createBet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title")).trim();
    const context = String(form.get("context")).trim();
    const deadline = String(form.get("deadline"));
    const players: Player[] = [];
    for (let i = 0; i < 8; i++) {
      const name = String(form.get(`player-${i}`) ?? "").trim();
      const choice = String(form.get(`choice-${i}`) ?? "").trim();
      if (name && choice) players.push({ name, choice });
    }
    if (players.length < 2) {
      setToast(t("Add at least two players and their choices."));
      return;
    }
    const selectedTags = form.getAll("tags").map(String);
    const newTag = String(form.get("newTag") ?? "").trim();
    const tags = [...new Set([...selectedTags, ...(newTag ? [newTag] : [])])];
    if (newTag) setKnownTags((current) => [...new Set([...current, newTag])]);
    setBets((current) => [
      {
        id: crypto.randomUUID(),
        title,
        context,
        deadline,
        players,
        tags,
        createdAt: new Date().toISOString(),
        status: "open",
      },
      ...current,
    ]);
    setFilter("All bets");
    setActiveTag("");
    setQuery("");
    setSortOrder("newest");
    setShowCreate(false);
    setToast(t("Your bet is live. Let the predictions begin!"));
  }

  function saveResult() {
    if (!settleBet || !resultChoice) return;
    setBets((current) =>
      current.map((bet) =>
        bet.id === settleBet.id
          ? { ...bet, status: "settled", result: resultChoice }
          : bet,
      ),
    );
    setSettleBet(null);
    setResultChoice("");
    setToast(t("Bet settled. The group can see who called it."));
  }

  const tabs = ["All bets", "Open", "Settled"];
  const counts = [bets.length, openBets.length, settledBets.length];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home">
          <span className="brand-mark">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span>Ready To Bet</span>
        </a>
        <div className="sidebar-stats" aria-label={t("Bet counters")}>
          <div>
            <strong>{openBets.length}</strong>
            <span>{t("Open")}</span>
          </div>
          <div>
            <strong>{playerTotal}</strong>
            <span>{t("Players")}</span>
          </div>
          <div>
            <strong>{knownTags.length}</strong>
            <span>{t("Tags")}</span>
          </div>
        </div>
        <div className="side-label">{t("WORKSPACE")}</div>
        <button
          className="sidebar-create"
          aria-label={t("Create a bet")}
          onClick={() => setShowCreate(true)}
        >
          <Icon name="plus" size={17} />
          <span>{t("Create bet")}</span>
        </button>
        <button className="nav-item selected">
          <Icon name="grid" size={18} />
          <span>{t("All bets")}</span>
          <span className="nav-count">{bets.length}</span>
        </button>
        <button
          className="nav-item"
          onClick={() => {
            setFilter("Open");
            setActiveTag("");
          }}
        >
          <Icon name="clock" size={18} />
          <span>{t("Open bets")}</span>
          <span className="nav-count">{openBets.length}</span>
        </button>
        <button
          className="nav-item"
          onClick={() => {
            setFilter("Settled");
            setActiveTag("");
          }}
        >
          <Icon name="check" size={18} />
          <span>{t("Settled")}</span>
          <span className="nav-count">{settledBets.length}</span>
        </button>
        <div className="side-label tags-label">
          {t("YOUR TAGS")}{" "}
          <button
            className="tiny-add"
            aria-label={t("Add a tag")}
            onClick={() => {
              const tag = window.prompt(t("Name your new tag"));
              if (tag?.trim())
                setKnownTags((old) => [...new Set([...old, tag.trim()])]);
            }}
          >
            <Icon name="plus" size={14} />
          </button>
        </div>
        <div className="tag-nav">
          {knownTags.map((tag, i) => (
            <button
              key={tag}
              className={`tag-nav-item ${activeTag === tag ? "tag-nav-active" : ""}`}
              onClick={() => {
                setActiveTag(activeTag === tag ? "" : tag);
                setFilter("All bets");
              }}
            >
              <span
                className="tag-dot"
                style={{ background: colors[i % colors.length] }}
              />
              {tag}
              <span className="tag-num">
                {bets.filter((bet) => bet.tags.includes(tag)).length}
              </span>
            </button>
          ))}
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <span className="breadcrumb-mark" />
            {t("Your friendly bets, all in one place")}
          </div>
          <div className="top-actions" aria-live="polite">
            <span
              className={`live-dot ${localSaveFailed ? "save-error" : ""}`}
            />
            {localSaveFailed
              ? t("Local save unavailable")
              : t("Saved on this device")}
            <label className="language-picker">
              <span className="sr-only">{t("Language")}</span>
              <select
                aria-label={t("Language")}
                value={language}
                onChange={(event) =>
                  setLanguage(normalizeLanguage(event.target.value as Language))
                }
              >
                <option value="fr">FR</option>
                <option value="ko">KR</option>
                <option value="en">EN</option>
              </select>
            </label>
          </div>
        </header>
        <div className="content">
          <section className="welcome-row">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-line" />
                {t("YOUR LITTLE CORNER OF FRIENDLY COMPETITION")}
              </div>
              <h1>
                {t("Good bets.")} <span>{t("Good company.")}</span>
              </h1>
              <p className="welcome-sub">
                {t(
                  "Keep track of the things you’re sure about (and the things you’re not).",
                )}
              </p>
            </div>
            <button
              className="primary-button"
              onClick={() => setShowCreate(true)}
            >
              <Icon name="plus" size={18} /> {t("Make a bet")}
            </button>
          </section>
          <section className="stats-grid" aria-label={t("Bet summary")}>
            <div className="stat-card stat-open">
              <div className="stat-top">
                <span>{t("IN PLAY")}</span>
                <span className="stat-symbol">
                  <Icon name="clock" size={17} />
                </span>
              </div>
              <div className="stat-value">
                {openBets.length}
                <span className="stat-caption">{t("bets to settle")}</span>
              </div>
              <div className="stat-foot">
                <span className="stat-indicator green" />
                {t("Still anyone’s game")}
              </div>
              <div className="stat-decoration decoration-rings" />
            </div>
            <div className="stat-card stat-people">
              <div className="stat-top">
                <span>{t("YOUR CREW")}</span>
                <span className="stat-symbol">
                  <Icon name="users" size={17} />
                </span>
              </div>
              <div className="stat-value">
                {playerTotal}
                <span className="stat-caption">{t("players involved")}</span>
              </div>
              <div className="stat-foot">
                <div className="mini-avatars">
                  {Array.from(
                    new Set(
                      bets.flatMap((bet) => bet.players.map((p) => p.name)),
                    ),
                  )
                    .slice(0, 4)
                    .map((name) => (
                      <span
                        key={name}
                        style={{ background: avatarColor(name) }}
                      >
                        {initials(name)}
                      </span>
                    ))}
                </div>
                <span>{t("Making things interesting")}</span>
              </div>
              <div className="stat-decoration decoration-people">✳</div>
            </div>
            <div className="stat-card stat-tags">
              <div className="stat-top">
                <span>{t("YOUR WAY")}</span>
                <span className="stat-symbol">
                  <Icon name="tag" size={17} />
                </span>
              </div>
              <div className="stat-value">
                {knownTags.length}
                <span className="stat-caption">{t("handy tags")}</span>
              </div>
              <div className="stat-foot">
                <span className="tag-preview">
                  {knownTags
                    .slice(0, 3)
                    .map((tag) => `#${tag}`)
                    .join("   ")}
                </span>
              </div>
              <div className="stat-decoration decoration-star">✳</div>
            </div>
          </section>

          <section className="bets-section">
            <div className="section-heading section-heading-controls">
              <div className="heading-controls">
                <label className="search-box">
                  <Icon name="search" size={17} />
                  <input
                    aria-label={t("Search bets")}
                    placeholder={t("Search bets...")}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  <kbd>⌘ K</kbd>
                </label>
                <div className="tag-filter" ref={tagFilterRef}>
                  <button
                    className="filter-button"
                    aria-haspopup="menu"
                    aria-expanded={tagMenuOpen}
                    onClick={() => setTagMenuOpen((open) => !open)}
                  >
                    <Icon name="tag" size={16} /> {activeTag || t("Tags")}{" "}
                    <span className="filter-caret">⌄</span>
                  </button>
                  {tagMenuOpen && (
                    <div
                      className="tag-dropdown"
                      role="menu"
                      aria-label={t("Filter by tag")}
                    >
                      {knownTags.length === 0 ? (
                        <p className="tag-dropdown-empty">
                          {t("No tags available")}
                        </p>
                      ) : (
                        <>
                          <button
                            className={`tag-dropdown-option ${activeTag ? "" : "selected"}`}
                            role="menuitemradio"
                            aria-selected={!activeTag}
                            onClick={() => {
                              setActiveTag("");
                              setFilter("All bets");
                              setTagMenuOpen(false);
                            }}
                          >
                            {t("All bets filter")}
                          </button>
                          {knownTags.map((tag) => (
                            <button
                              key={tag}
                              className={`tag-dropdown-option ${activeTag === tag ? "selected" : ""}`}
                              role="menuitemradio"
                              aria-selected={activeTag === tag}
                              onClick={() => {
                                setActiveTag(tag);
                                setFilter("All bets");
                                setTagMenuOpen(false);
                              }}
                            >
                              <span>#{tag}</span>
                              <span className="tag-dropdown-count">
                                {
                                  bets.filter((bet) => bet.tags.includes(tag))
                                    .length
                                }
                              </span>
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="list-toolbar">
              <div className="tabs">
                {tabs.map((tab, i) => (
                  <button
                    key={tab}
                    className={`tab ${filter === tab ? "tab-active" : ""}`}
                    onClick={() => setFilter(tab)}
                  >
                    {t(tab)}
                    <span>{counts[i]}</span>
                  </button>
                ))}
              </div>
              <div className="list-sort">
                <span>
                  {activeTag ? (
                    <>
                      <span className="filter-note">{t("Filtered by")}</span>{" "}
                      <button
                        onClick={() => setActiveTag("")}
                        className="active-tag"
                      >
                        #{activeTag} <span>×</span>
                      </button>
                    </>
                  ) : (
                    t("Showing")
                  )}{" "}
                  <strong>
                    {visibleBets.length} {t("bets")}
                  </strong>
                </span>
                <label className="sort-by">
                  <span>{t("Sort by")}</span>
                  <select
                    aria-label={t("Sort bets")}
                    value={sortOrder}
                    onChange={(event) => setSortOrder(event.target.value)}
                  >
                    <option value="newest">{t("Newest first")}</option>
                    <option value="oldest">{t("Oldest first")}</option>
                    <option value="soonest">{t("Closing soon")}</option>
                    <option value="latest">{t("Closing latest")}</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="bet-list">
              {visibleBets.map((bet, index) => (
                <article
                  className={`bet-card ${bet.status === "settled" ? "settled-card" : ""}`}
                  key={bet.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${bet.title} — ${t("Open bet summary")}`}
                  onClick={() => setDetailsBet(bet)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setDetailsBet(bet);
                    }
                  }}
                  style={{ animationDelay: `${index * 45}ms` }}
                >
                  <div className="bet-main">
                    <div className={`bet-status ${bet.status}`}>
                      <span />
                      {t(bet.status === "open" ? "OPEN" : "SETTLED")}
                    </div>
                    <h3>{bet.title}</h3>
                    <p className="bet-context">{bet.context}</p>
                    <div className="bet-tags">
                      {bet.tags.map((tag, i) => (
                        <button
                          key={tag}
                          className={`bet-tag tag-tone-${i % 6}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setActiveTag(tag);
                            setFilter("All bets");
                          }}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="bet-aside">
                    <div className="players-line">
                      <div className="avatar-stack">
                        {bet.players.map((player) => (
                          <span
                            key={player.name}
                            className="avatar"
                            style={{ background: avatarColor(player.name) }}
                            title={player.name}
                          >
                            {initials(player.name)}
                          </span>
                        ))}
                      </div>
                      <div className="player-total">
                        <strong>{bet.players.length}</strong>
                        <span>{t("players label")}</span>
                      </div>
                    </div>
                    <div className="choice-preview">
                      {bet.players.slice(0, 2).map((player) => (
                        <div className="choice-line" key={player.name}>
                          <span className="choice-name">
                            {player.name.split(" ")[0]}
                          </span>
                          <span className="choice-divider">·</span>
                          <span className="choice-text">{player.choice}</span>
                        </div>
                      ))}
                      {bet.players.length > 2 && (
                        <span className="extra-players">
                          +{bet.players.length - 2} {t("more")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="bet-footer">
                    <div className="deadline">
                      <Icon name="calendar" size={15} />
                      <span>
                        {bet.status === "settled" ? (
                          `${t("Closed")} ${prettyDate(bet.deadline, language)}`
                        ) : (
                          <>
                            {t("Closes")}{" "}
                            <strong>
                              {prettyDate(bet.deadline, language)}
                            </strong>
                          </>
                        )}
                      </span>
                      {bet.status === "open" && (
                        <span
                          className={`days-left ${dayDiff(bet.deadline) <= 2 ? "urgent" : ""}`}
                        >
                          {dayDiff(bet.deadline) < 0
                            ? t("Overdue")
                            : dayDiff(bet.deadline) === 0
                              ? t("Today")
                              : `${dayDiff(bet.deadline)} ${t("days left")}`}
                        </span>
                      )}
                    </div>
                    <div className="card-action">
                      {bet.status === "settled" ? (
                        <span className="result-text">
                          <span className="result-check">
                            <Icon name="check" size={12} />
                          </span>{" "}
                          {bet.result} {t("won")}
                        </span>
                      ) : (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setSettleBet(bet);
                            setResultChoice("");
                          }}
                        >
                          {t("Settle bet")} <Icon name="arrow" size={15} />
                        </button>
                      )}
                      <span className="card-arrow">
                        <Icon name="chevron" size={16} />
                      </span>
                    </div>
                  </div>
                </article>
              ))}
              {visibleBets.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">
                    <Icon
                      name={bets.length === 0 ? "plus" : "search"}
                      size={22}
                    />
                  </div>
                  <h3>
                    {bets.length === 0
                      ? t("Start with your first bet")
                      : t("No bets found")}
                  </h3>
                  <p>
                    {bets.length === 0
                      ? t(
                          "Set the scene, add your players, and make your picks.",
                        )
                      : t("Try another search or clear your filters.")}
                  </p>
                  <button
                    className="text-button"
                    onClick={() => {
                      if (bets.length === 0) {
                        setShowCreate(true);
                      } else {
                        setQuery("");
                        setActiveTag("");
                        setFilter("All bets");
                      }
                    }}
                  >
                    {bets.length === 0 ? t("Create a bet") : t("Clear filters")}{" "}
                    <Icon name="arrow" size={15} />
                  </button>
                </div>
              )}
            </div>
            <div className="list-end">
              <span />
              {t("That’s the whole lineup")} <span />
            </div>
          </section>
          <footer className="page-footer">
            <span>{t("Made for the “I bet you won’t” moments.")}</span>
            <span>
              {t("Keep it friendly")} <b>✳</b>
            </span>
          </footer>
        </div>
      </main>

      {showCreate && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowCreate(false);
          }}
        >
          <section
            className="modal create-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-title"
          >
            <div className="modal-head">
              <div>
                <div className="section-kicker">
                  {t("LET’S MAKE IT INTERESTING")}
                </div>
                <h2 id="create-title">
                  {t("Make a bet")}
                  <span>.</span>
                </h2>
                <p>
                  {t("Set the scene, make your picks, and settle it later.")}
                </p>
              </div>
              <button
                className="icon-button"
                onClick={() => setShowCreate(false)}
                aria-label={t("Close")}
              >
                <span className="close-mark" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={createBet} className="create-form">
              <label className="field-label">
                {t("WHAT’S THE BET?")}
                <input
                  name="title"
                  required
                  maxLength={90}
                  placeholder={t("e.g. Will it rain at the picnic?")}
                />
              </label>
              <label className="field-label">
                {t("THE CONTEXT")}
                <textarea
                  name="context"
                  required
                  rows={3}
                  maxLength={400}
                  placeholder={t(
                    "Add a little background. What are you betting on, and why?",
                  )}
                />
              </label>
              <div className="players-header">
                <div className="field-label">
                  {t("WHO’S PICKING WHAT?")}
                  <span className="field-hint">
                    {t("Add 2 or more players and their choices.")}
                  </span>
                </div>
                <span className="players-count">
                  {playerCount} {t("players label")}
                </span>
              </div>
              <div className="player-rows">
                {Array.from({ length: playerCount }, (_, index) => (
                  <PlayerFields
                    key={index}
                    index={index}
                    translate={t}
                    removable={index === playerCount - 1 && index >= 2}
                    onRemove={() => setPlayerCount((count) => count - 1)}
                  />
                ))}
              </div>
              <button
                type="button"
                className="add-player"
                disabled={playerCount >= 8}
                onClick={() =>
                  setPlayerCount((count) => Math.min(count + 1, 8))
                }
              >
                <Icon name="plus" size={15} /> {t("Add another player")}
              </button>
              <div className="form-row">
                <label className="field-label date-field">
                  {t("WHEN DOES IT CLOSE?")}
                  <span className="date-input">
                    <Icon name="calendar" size={16} />
                    <input
                      type="date"
                      name="deadline"
                      required
                      min={new Date().toISOString().slice(0, 10)}
                      defaultValue={dateIn(7)}
                    />
                  </span>
                </label>
                <label className="field-label">
                  {t("Tags")}
                  <span className="field-hint">
                    {t("Pick existing or add your own.")}
                  </span>
                  <div className="tag-picker">
                    {knownTags.map((tag, i) => (
                      <label
                        key={tag}
                        className={`tag-option tag-tone-${i % 6}`}
                      >
                        <input type="checkbox" name="tags" value={tag} />
                        <span>#{tag}</span>
                      </label>
                    ))}
                  </div>
                  <div className="new-tag-input">
                    <span>#</span>
                    <input
                      name="newTag"
                      maxLength={24}
                      placeholder={t("Add a new tag")}
                    />
                  </div>
                </label>
              </div>
              <div className="modal-actions">
                <span className="private-note">
                  <Icon name="users" size={15} /> {t("Just between your crew")}
                </span>
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowCreate(false)}
                >
                  {t("Cancel")}
                </button>
                <button type="submit" className="primary-button">
                  {t("Make it official")} <Icon name="arrow" size={16} />
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {detailsBet && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDetailsBet(null);
          }}
        >
          <section
            className="modal summary-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="summary-title"
          >
            <div className="modal-head">
              <div>
                <div className="section-kicker">{t("Summary")}</div>
                <h2 id="summary-title">{detailsBet.title}</h2>
                <p>{detailsBet.status === "open" ? t("OPEN") : t("SETTLED")}</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setDetailsBet(null)}
                aria-label={t("Close")}
              >
                <span className="close-mark" aria-hidden="true" />
              </button>
            </div>
            <div className="summary-section">
              <h3>{t("Context")}</h3>
              <p>{detailsBet.context}</p>
            </div>
            <div className="summary-section">
              <h3>{t("Players")}</h3>
              <div className="summary-players">
                {detailsBet.players.map((player) => (
                  <div className="summary-player" key={player.name}>
                    <span
                      className="avatar"
                      style={{ background: avatarColor(player.name) }}
                    >
                      {initials(player.name)}
                    </span>
                    <strong>{player.name}</strong>
                    <span className="summary-choice">{player.choice}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="summary-meta">
              <div className="summary-section">
                <h3>{t("Closing date")}</h3>
                <p>{prettyDate(detailsBet.deadline, language)}</p>
              </div>
              {detailsBet.tags.length > 0 && (
                <div className="summary-section">
                  <h3>{t("Tags")}</h3>
                  <div className="bet-tags">
                    {detailsBet.tags.map((tag, index) => (
                      <button
                        key={tag}
                        className={`bet-tag tag-tone-${index % 6}`}
                        onClick={() => {
                          setActiveTag(tag);
                          setFilter("All bets");
                          setDetailsBet(null);
                        }}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {detailsBet.status === "settled" && detailsBet.result && (
              <div className="summary-result">
                <span>{t("Result")}</span>
                <strong>{detailsBet.result}</strong>
              </div>
            )}
            <div className="modal-actions">
              <button
                className="cancel-button"
                onClick={() => setDetailsBet(null)}
              >
                {t("Close")}
              </button>
              {detailsBet.status === "open" && (
                <button
                  className="primary-button"
                  onClick={() => {
                    setSettleBet(detailsBet);
                    setDetailsBet(null);
                    setResultChoice("");
                  }}
                >
                  {t("Settle bet")}
                </button>
              )}
            </div>
          </section>
        </div>
      )}

      {settleBet && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSettleBet(null);
          }}
        >
          <section
            className="modal settle-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settle-title"
          >
            <div className="modal-head">
              <div>
                <div className="section-kicker">{t("CALL IT")}</div>
                <h2 id="settle-title">{t("How did it go?")}</h2>
                <p>{settleBet.title}</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setSettleBet(null)}
                aria-label={t("Close")}
              >
                <span className="close-mark" aria-hidden="true" />
              </button>
            </div>
            <p className="settle-prompt">
              {t("Choose the winning call to close out this bet.")}
            </p>
            <div className="result-options">
              {[
                ...new Set(settleBet.players.map((player) => player.choice)),
              ].map((choice) => {
                const player = settleBet.players.find(
                  (p) => p.choice === choice,
                )!;
                return (
                  <button
                    key={choice}
                    className={`result-option ${resultChoice === choice ? "result-selected" : ""}`}
                    onClick={() => setResultChoice(choice)}
                  >
                    <span
                      className="avatar"
                      style={{ background: avatarColor(player.name) }}
                    >
                      {initials(player.name)}
                    </span>
                    <span>
                      <strong>{choice}</strong>
                      <small>
                        {settleBet.players
                          .filter((p) => p.choice === choice)
                          .map((p) => p.name)
                          .join(", ")}
                      </small>
                    </span>
                    <span className="radio-check">
                      {resultChoice === choice && (
                        <Icon name="check" size={14} />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="modal-actions">
              <button
                className="cancel-button"
                onClick={() => setSettleBet(null)}
              >
                {t("Cancel")}
              </button>
              <button
                className="primary-button"
                disabled={!resultChoice}
                onClick={saveResult}
              >
                {t("Settle this bet")} <Icon name="check" size={16} />
              </button>
            </div>
          </section>
        </div>
      )}
      {toast && (
        <div role="status" className="toast">
          <span>
            <Icon name="check" size={15} />
          </span>
          {toast}
        </div>
      )}
    </div>
  );
}

function PlayerFields({
  index,
  removable,
  onRemove,
  translate,
}: {
  index: number;
  removable: boolean;
  onRemove: () => void;
  translate: (phrase: string) => string;
}) {
  return (
    <div className="player-row" data-index={index}>
      <span className="player-number">0{index + 1}</span>
      <input
        name={`player-${index}`}
        required
        placeholder={translate("Player name")}
        aria-label={`${translate("Player")} ${index + 1}`}
      />
      <span className="player-picks">{translate("picks")}</span>
      <input
        name={`choice-${index}`}
        required
        placeholder={translate("Their choice")}
        aria-label={`${translate("Choice")} ${index + 1}`}
      />
      {removable && (
        <button
          type="button"
          className="remove-player"
          aria-label={translate("Remove player")}
          onClick={onRemove}
        >
          ×
        </button>
      )}
    </div>
  );
}
