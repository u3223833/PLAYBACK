/* =========================================================
   PLAY BACK — Australian Television (NFSA API)
   ========================================================= */

const NFSA_BASE_URL = "https://api.collection.nfsa.gov.au";
const NFSA_ITEM_URL = "https://www.nfsa.gov.au/collection/item";
const NFSA_MEDIA_URL = "https://media.nfsacollection.net";
const RESULTS_PER_REQUEST = 25;
const MAX_PAGES = 10;

const DECADES = ["1950s", "1960s", "1970s", "1980s", "1990s", "2000s", "2010s"];

const DEFAULT_DESCRIPTION =
    "Explore Australian game shows from this decade through the NFSA collection.";

const DECADE_DESCRIPTIONS = {
    "1950s": "The beginning of Australian television and the first generation of local game and quiz shows.",
    "1960s": "Discover the game shows, presenters and formats that shaped Australian television in the 1960s.",
    "1970s": "Browse a decade of changing game show formats, entertainment and Australian culture.",
    "1980s": "Explore the game shows and television formats that defined Australian popular culture in the 1980s.",
    "1990s": "Discover the programmes, presenters and formats that filled Australian screens in the 1990s.",
    "2000s": "Browse Australian game shows as new formats and production styles changed the viewing experience.",
    "2010s": "Explore Australian game shows across entertainment, competition and reality television.",
    "2020s": "Discover recent Australian game shows represented in the NFSA collection."
};

/*
 * NFSA records are all classified as "Game show", so the genre chips
 * are matched against title / genre / description keywords instead.
 */
const GENRE_KEYWORDS = {
    quiz: ["quiz", "trivia", "question", "questions", "answer", "answers", "knowledge",
           "contestant", "millionaire", "jeopardy", "wheel", "mastermind", "quizmaster"],
    dating: ["dating", "date", "romance", "love", "marriage", "married", "husband",
             "wife", "relationship", "bachelor", "bachelorette", "blind date"],
    physical: ["physical", "action", "challenge", "competition", "race", "stunt",
               "obstacle", "sport", "sports", "strength", "speed"],
    panel: ["panel", "bluff", "celebrity", "celebrit", "guess", "discussion",
            "personality", "hosted by"],
    racing: ["racing", "race", "price", "consumer", "shopping", "shop", "buy",
             "sale", "money", "prize", "prizes"]
};

/* Noise stripped from record titles to get the programme name. */
const TITLE_NOISE = [
    /\s+EPS?\s+[\w?]+(?:\s*-\s*[\w?]+)?$/i,
    /\s+(EPISODE|EP\.?)\s*[\w?-]+.*$/i,
    /\s+(SERIES|SEASON)\s*\d+.*$/i,
    /\s+C?\d{4}(?:\.\d{2}(?:\.\d{2})?)?.*$/i,
    /\s*:\s*\[.*$/,
    /\s*\[.*?\]\s*$/,
    /\s+['"]?SPECIAL['"]?.*$/i,
    /\s+1000TH SHOW.*$/i,
    /\s+(FINAL PROGRAM|FINAL EPISODE|EXCERPT|EXTRACT).*$/i,
    /\s+\d{4}$/
];

const UNTITLED = "Untitled NFSA Record";

/* =========================================================
   STATE
   ========================================================= */

let currentDecade = "1950s";
let currentResults = [];
let currentSearchTerm = "";
let currentGenre = "all";
let requestNumber = 0;

const recordCache = new Map();

/* =========================================================
   DOM
   ========================================================= */

const $ = id => document.getElementById(id);

const objectsContainer = $("objectsContainer");
const timeline = $("timeline");
const decadeTitle = $("decade-title");
const decadeDescription = $("decade-description");
const showCount = $("show-count");
const recordCount = $("record-count");
const showSearch = $("show-search");
const searchClear = $("search-clear");
const surpriseButton = $("surprise-button");

const overlay = $("recordOverlay");
const closeButton = overlay?.querySelector(".record-close");
const recordMedia = $("recordMedia");
const recordYear = $("recordYear");
const recordTitle = $("recordTitle");
const recordDescription = $("recordDescription");
const recordGenre = $("recordGenre");
const recordMedium = $("recordMedium");
const recordId = $("recordId");
const recordLink = $("recordLink");

/* =========================================================
   API
   ========================================================= */

async function fetchJSON(url) {
    let response;

    try {
        response = await fetch(url);
    } catch {
        throw Object.assign(new Error("Unable to connect to the NFSA API."), {
            type: "network"
        });
    }

    if (!response.ok) {
        const type =
            response.status === 429 ? "rate-limit" :
            response.status >= 500 ? "server" :
            "api";

        throw Object.assign(new Error(`NFSA API returned ${response.status}.`), {
            type,
            status: response.status
        });
    }

    return response.json();
}

async function getFullRecord(id) {
    if (!id) return null;

    if (!recordCache.has(id)) {
        recordCache.set(id, await fetchJSON(`${NFSA_BASE_URL}/title/${id}`));
    }

    return recordCache.get(id);
}

function searchGameShowsDecade(startYear, endYear, page) {
    const params = new URLSearchParams({
        "parentTitle.genres": "Game show",
        subMedium: "Television",
        forms: "Series",
        countries: "Australia",
        year: `${startYear}-${endYear}`,
        limit: String(RESULTS_PER_REQUEST),
        page: String(page)
    });

    return fetchJSON(`${NFSA_BASE_URL}/search?${params}`);
}

/* =========================================================
   TEXT / RECORD HELPERS
   ========================================================= */

function escapeHTML(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getProgrammeTitle(record) {
    let title = String(
        record?.parentTitle?.seriesTitle ||
        record?.parentTitle?.title ||
        record?.title ||
        record?.name ||
        ""
    ).trim();

    for (const pattern of TITLE_NOISE) {
        title = title.replace(pattern, "");
    }

    title = title
        .replace(/\s+/g, " ")
        .replace(/[.,:;\\-]+$/, "")
        .trim();

    return title || UNTITLED;
}

/* Key used to group records of the same programme together. */
function getProgrammeKey(title) {
    return title
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, " ")
        .trim();
}

function getYear(record, fallback = currentDecade) {
    const values = [
        record?.productionDates?.[0]?.fromYear,
        record?.year,
        record?.productionYear,
        record?.startYear,
        record?.parentTitle?.startYear
    ];

    for (const value of values) {
        const match = String(value ?? "").match(/\b(19|20)\d{2}\b/);
        if (match) return match[0];
    }

    return fallback;
}

function getDescription(record) {
    return (
        record?.parentTitle?.seriesSummary ||
        record?.summary ||
        record?.description ||
        record?.scopeAndContent ||
        "Archival television record from the National Film and Sound Archive collection."
    );
}

function getGenre(record) {
    const genres = record?.parentTitle?.genres || record?.genres;

    if (Array.isArray(genres) && genres.length) return genres.join(" · ");
    if (typeof genres === "string" && genres.trim()) return genres;

    return "Game show";
}

function getMedium(record) {
    return record?.subMedium || record?.parentTitle?.medium || "Television";
}

/* =========================================================
   IMAGES
   ========================================================= */

const BROWSE_USAGES = ["Access/Browse", "Access/Browsing copy"];

function getImageMedia(record) {
    const media = Array.isArray(record?.media) ? record.media : [];
    const isBrowse = item => BROWSE_USAGES.includes(item?.itemUsage);

    return (
        media.find(item => item?.mediaType === "Digital Image File" && isBrowse(item)) ||
        media.find(item => item?.fileType === "Image" && isBrowse(item)) ||
        null
    );
}

function buildNFSAImageUrl(record) {
    const imageId = getImageMedia(record)?.id || getImageMedia(record)?.mediaId;

    return record?.id && imageId
        ? `${NFSA_MEDIA_URL}/${record.id}/${imageId}/thumbnail.jpg`
        : "";
}

/* =========================================================
   GROUPING
   ========================================================= */

function addRecordToGroups(groups, record) {
    const title = getProgrammeTitle(record);
    if (title === UNTITLED) return;

    const key = getProgrammeKey(title);
    const group = groups.get(key);

    if (group) {
        group.records.push(record);
    } else {
        groups.set(key, { title, representative: record, records: [record] });
    }
}

/* =========================================================
   LOAD A DECADE
   ========================================================= */

function resetFilters() {
    currentSearchTerm = "";
    currentGenre = "all";

    if (showSearch) showSearch.value = "";
    if (searchClear) searchClear.hidden = true;

    updateFilterButtons();
}

async function getDecadeShows(decade) {
    const startYear = Number.parseInt(decade.substring(0, 4), 10);
    const endYear = startYear + 9;
    const thisRequest = ++requestNumber;
    const isStale = () => thisRequest !== requestNumber;

    currentDecade = decade;

    resetFilters();
    setActiveDecade(decade);
    setLoadingState();
    updateDecadeHeading(decade);

    const groups = new Map();

    try {
        for (let page = 1; page <= MAX_PAGES; page++) {
            const searchData = await searchGameShowsDecade(startYear, endYear, page);
            if (isStale()) return;

            const results = Array.isArray(searchData?.results) ? searchData.results : [];
            if (!results.length) break;

            /* Full records give access to summaries, images and metadata. */
            const fullRecords = await Promise.allSettled(
                results
                    .filter(record => record?.id)
                    .map(record => getFullRecord(record.id))
            );
            if (isStale()) return;

            for (const result of fullRecords) {
                if (result.status === "fulfilled" && result.value) {
                    addRecordToGroups(groups, result.value);
                }
            }

            if (results.length < RESULTS_PER_REQUEST) break;
        }

        currentResults = [...groups.values()].sort((a, b) =>
            a.title.localeCompare(b.title)
        );

        if (!currentResults.length) {
            setEmptyState();
            return;
        }

        displayResults(currentResults);
        objectsContainer.setAttribute("aria-busy", "false");
    } catch (error) {
        console.error("NFSA collection error:", error);
        if (!isStale()) setErrorState(error);
    }
}

/* =========================================================
   UI STATES
   ========================================================= */

function setStats(shows, records) {
    showCount.textContent = shows;
    recordCount.textContent = records;
}

function showMessage(html, { loading = false } = {}) {
    objectsContainer.setAttribute("aria-busy", String(loading));
    objectsContainer.innerHTML = html;
}

function setLoadingState() {
    showMessage(
        `<div class="api-loading" role="status">
            Loading Australian game shows from the NFSA collection…
        </div>`,
        { loading: true }
    );
    setStats("—", "—");
}

function setEmptyState() {
    showMessage(`
        <div class="api-message">
            <strong>No programmes found</strong>
            <p>No Australian television game shows were found for this decade in the NFSA collection.</p>
        </div>
    `);
    setStats(0, 0);
}

const ERROR_MESSAGES = {
    "rate-limit": {
        title: "Too many requests",
        message: "The NFSA collection has temporarily limited requests. Please wait a moment and try again."
    },
    network: {
        title: "Connection problem",
        message: "PLAY BACK could not connect to the NFSA collection. Check your connection and try again."
    },
    server: {
        title: "NFSA temporarily unavailable",
        message: "The NFSA collection is currently unavailable. Please try again shortly."
    },
    default: {
        title: "Unable to load collection",
        message: "Something went wrong while retrieving the NFSA collection. Please try again."
    }
};

function setErrorState(error) {
    const { title, message } = ERROR_MESSAGES[error?.type] || ERROR_MESSAGES.default;

    showMessage(`
        <div class="api-message" role="alert">
            <strong>${escapeHTML(title)}</strong>
            <p>${escapeHTML(message)}</p>
            <button class="api-retry" type="button" data-action="retry">TRY AGAIN</button>
        </div>
    `);
}

/* =========================================================
   HEADINGS / TIMELINE
   ========================================================= */

function updateDecadeHeading(decade) {
    decadeTitle.textContent = `GAME SHOWS OF THE ${decade}`;
    decadeDescription.textContent = DECADE_DESCRIPTIONS[decade] || DEFAULT_DESCRIPTION;
}

function buildTimeline() {
    timeline.innerHTML = DECADES.map(decade => `
        <button class="timeline-item" type="button" data-decade="${decade}"
                aria-label="Browse game shows from the ${decade}">
            <span class="timeline-label">${decade}</span>
            <span class="timeline-dot"></span>
        </button>
    `).join("");
}

function setActiveDecade(decade) {
    timeline.querySelectorAll(".timeline-item").forEach(button =>
        button.classList.toggle("active", button.dataset.decade === decade)
    );
}

/* =========================================================
   FILTERING
   ========================================================= */

function updateFilterButtons() {
    document.querySelectorAll(".filter-chip").forEach(button =>
        button.classList.toggle("active", button.dataset.genre === currentGenre)
    );
}

function matchesGenre(group, genre) {
    if (!genre || genre === "all") return true;

    const record = group.representative;
    const text = [group.title, getGenre(record), getDescription(record)]
        .join(" ")
        .toLowerCase();

    return (GENRE_KEYWORDS[genre] || []).some(keyword => text.includes(keyword));
}

function filterShows() {
    const term = currentSearchTerm.trim().toLowerCase();

    displayResults(
        currentResults.filter(group =>
            (!term || group.title.toLowerCase().includes(term)) &&
            matchesGenre(group, currentGenre)
        )
    );
}

function setSearchTerm(value) {
    currentSearchTerm = value;
    if (searchClear) searchClear.hidden = !value.trim();
    filterShows();
}

/* =========================================================
   SHOW CARDS
   ========================================================= */

function createShowCard(group) {
    const record = group.representative;
    const title = getProgrammeTitle(record);
    const card = document.createElement("article");

    card.className = "show-card tv-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `View details for ${title}`);
    card.dataset.id = record.id || "";

    card.innerHTML = `
        <div class="tv-card-topline">
            <span>PLAY BACK / NFSA</span>
            <span>${escapeHTML(getYear(record))}</span>
        </div>

        <div class="tv-set" aria-hidden="true">
            <div class="tv-screen">
                <span class="tv-screen-label">AUSTRALIAN TELEVISION</span>
                <h3 class="show-card-title">${escapeHTML(title)}</h3>
                <span class="tv-screen-rule"></span>
            </div>

            <div class="tv-controls">
                <span class="tv-knob"></span>
                <span class="tv-knob"></span>
                <span class="tv-speakers"><i></i><i></i><i></i><i></i><i></i></span>
            </div>
        </div>

        <div class="tv-card-footer">
            <span>GAME SHOW</span>
            <span class="tv-card-arrow" aria-hidden="true">↗</span>
        </div>
    `;

    return card;
}

function displayResults(groups) {
    setStats(
        groups.length,
        groups.reduce((total, group) => total + group.records.length, 0)
    );

    if (!groups.length) {
        objectsContainer.innerHTML = `<div class="empty-state"><p>NO PROGRAMMES FOUND</p></div>`;
        return;
    }

    objectsContainer.replaceChildren(...groups.map(createShowCard));
}

function surpriseMe() {
    if (!currentResults.length) return;

    const randomShow =
        currentResults[Math.floor(Math.random() * currentResults.length)];

    /* Clear filters so the full list is showing behind the overlay. */
    resetFilters();
    filterShows();

    openNFSARecord(randomShow.representative.id);
}

/* =========================================================
   RECORD OVERLAY
   ========================================================= */

const mediaPlaceholder = text =>
    `<div class="record-media-placeholder"><p>${text}</p></div>`;

function setOverlayOpen(isOpen) {
    overlay.classList.toggle("is-open", isOpen);
    overlay.setAttribute("aria-hidden", String(!isOpen));
    document.body.style.overflow = isOpen ? "hidden" : "";
}

function renderRecordImage(record, title) {
    const imageURL = buildNFSAImageUrl(record);

    if (!imageURL) {
        recordMedia.innerHTML = "";
        return;
    }

    recordMedia.innerHTML =
        `<img src="${escapeHTML(imageURL)}" alt="${escapeHTML(title)} archival image">`;

    recordMedia.querySelector("img").addEventListener(
        "error",
        () => { recordMedia.innerHTML = mediaPlaceholder("ARCHIVAL IMAGE UNAVAILABLE"); },
        { once: true }
    );
}

async function openNFSARecord(id) {
    if (!id || !overlay) return;

    setOverlayOpen(true);

    /* Loading state */
    recordMedia.innerHTML = mediaPlaceholder("LOADING ARCHIVAL RECORD…");
    recordTitle.textContent = "LOADING…";
    recordDescription.textContent = "Retrieving the full NFSA archival record.";
    recordYear.textContent = "";
    recordGenre.textContent = "Television";
    recordMedium.textContent = "Television";
    recordId.textContent = id;
    recordLink.hidden = true;

    try {
        const record = await getFullRecord(id);
        if (!record) throw new Error("Record unavailable.");

        const title = getProgrammeTitle(record);

        recordYear.textContent = getYear(record);
        recordTitle.textContent = title;
        recordDescription.textContent = getDescription(record);
        recordGenre.textContent = getGenre(record);
        recordMedium.textContent = getMedium(record);
        recordId.textContent = record.id || id;

        renderRecordImage(record, title);

        recordLink.href = "https://www.nfsa.gov.au/collection/curated/australian-tv-game-shows-1950s-now";
        recordLink.hidden = !record.id;
    } catch (error) {
        console.error("Could not open NFSA record:", error);

        recordTitle.textContent = "RECORD UNAVAILABLE";
        recordDescription.textContent =
            "The full archival record could not be loaded. Please try again.";
        recordMedia.innerHTML = mediaPlaceholder("UNABLE TO LOAD RECORD");
    }

    requestAnimationFrame(() => closeButton?.focus());
}

const closeOverlay = () => overlay && setOverlayOpen(false);

/* =========================================================
   EVENTS
   ========================================================= */

/* One delegated click handler: decades, cards, retry. */
document.addEventListener("click", event => {
    const decadeButton = event.target.closest(".timeline-item");
    if (decadeButton?.dataset.decade) {
        getDecadeShows(decadeButton.dataset.decade);
        return;
    }

    const card = event.target.closest(".show-card");
    if (card) {
        openNFSARecord(card.dataset.id);
        return;
    }

    if (event.target.closest("[data-action='retry']")) {
        getDecadeShows(currentDecade);
    }
});

document.addEventListener("keydown", event => {
    const card = event.target.closest(".show-card");

    if (card && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        openNFSARecord(card.dataset.id);
    }

    if (event.key === "Escape" && overlay?.classList.contains("is-open")) {
        closeOverlay();
    }
});

closeButton?.addEventListener("click", closeOverlay);

overlay?.addEventListener("click", event => {
    if (event.target === overlay) closeOverlay();
});

showSearch?.addEventListener("input", event => setSearchTerm(event.target.value));

searchClear?.addEventListener("click", () => {
    showSearch.value = "";
    setSearchTerm("");
    showSearch.focus();
});

document.querySelectorAll(".filter-chip").forEach(button =>
    button.addEventListener("click", () => {
        currentGenre = button.dataset.genre || "all";
        updateFilterButtons();
        filterShows();
    })
);

surpriseButton?.addEventListener("click", surpriseMe);

/* =========================================================
   START
   ========================================================= */

buildTimeline();
getDecadeShows(currentDecade);