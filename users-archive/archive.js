const dialog = document.querySelector("#archive-search-dialog");
const input = dialog?.querySelector("[data-search-input]");
const status = dialog?.querySelector("[data-search-status]");
const results = dialog?.querySelector("[data-search-results]");
let pagefind;
let request = 0;

const escapeHtml = (value) => {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
};

async function search(query) {
  const current = ++request;
  if (!query.trim()) {
    status.textContent = "Start typing to search messages from 2003–2018.";
    results.replaceChildren();
    return;
  }
  status.textContent = "Searching…";
  try {
    pagefind ??= await import("/users-archive/pagefind/pagefind.js");
    await pagefind.options({ baseUrl: "/users-archive/", ranking: { termFrequency: 0 } });
    const response = await pagefind.search(query);
    const entries = await Promise.all(response.results.slice(0, 30).map((result) => result.data()));
    if (current !== request) return;
    const shown = Math.min(response.results.length, 30);
    status.textContent = response.results.length > shown
      ? `Showing ${shown} of ${response.results.length} results for “${query}”`
      : `${response.results.length} result${response.results.length === 1 ? "" : "s"} for “${query}”`;
    results.innerHTML = entries.map((entry) => {
      const url = entry.url.startsWith("/users-archive/") ? entry.url : `/users-archive${entry.url}`;
      return `<li><a href="${url}">${escapeHtml(entry.meta.title || "Archive message")}</a>${entry.meta.author ? `<p class="archive-result-meta">${escapeHtml(entry.meta.author)}${entry.meta.date ? ` · ${escapeHtml(entry.meta.date)}` : ""}</p>` : ""}<p>${entry.excerpt || ""}</p></li>`;
    }).join("");
  } catch (error) {
    console.error(error);
    status.textContent = "Search could not be loaded. Please try again.";
  }
}

document.querySelectorAll("[data-search-open]").forEach((button) => button.addEventListener("click", () => {
  dialog.showModal();
  requestAnimationFrame(() => input.focus());
}));
dialog?.querySelector("[data-search-close]")?.addEventListener("click", () => dialog.close());
dialog?.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
dialog?.querySelector("[data-search-form]")?.addEventListener("submit", (event) => { event.preventDefault(); search(input.value); });
let inputTimer;
input?.addEventListener("input", () => { clearTimeout(inputTimer); inputTimer = setTimeout(() => search(input.value), 140); });

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    if (!dialog.open) dialog.showModal();
    input.focus();
  }
});

const navigation = document.querySelector("#archive-navigation");
document.querySelector("[data-nav-open]")?.addEventListener("click", () => navigation.classList.add("is-open"));
document.querySelectorAll("[data-nav-close]").forEach((element) => element.addEventListener("click", () => navigation.classList.remove("is-open")));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && navigation.classList.contains("is-open")) navigation.classList.remove("is-open");
});

renderArchiveCalendar();

async function renderArchiveCalendar() {
  const container = document.querySelector("[data-archive-calendar]");
  if (!container) return;

  const viewedMonth = location.pathname.match(/\/users-archive\/(\d{4}-[A-Za-z]+)/)?.[1];
  const viewedYear = viewedMonth?.slice(0, 4);
  const viewedMessage = location.pathname.match(/\/(\d+)\.html\/?$/)?.[1];
  const viewedThread = location.pathname.match(/\/threads\/(\d+)\.html\/?$/)?.[1];
  let years;
  try {
    const response = await fetch("/users-archive/archive-index.json");
    if (!response.ok) throw new Error(`Archive index returned ${response.status}`);
    years = await response.json();
  } catch (error) {
    console.error(error);
    container.innerHTML = '<p class="archive-nav-thread-status">Archive navigation could not be loaded.</p>';
    return;
  }
  const threadMonths = new Set();
  if (viewedThread) {
    for (const year of years) {
      for (const month of year.months) {
        if (month.threads.some((thread) => thread.href.endsWith(`/${viewedThread}.html`))) threadMonths.add(month.slug);
      }
    }
  }
  container.replaceChildren();
  updateArchiveOverview(years);

  years.forEach((year, yearIndex) => {
    const yearDetails = document.createElement("details");
    yearDetails.className = "archive-nav-year";
    yearDetails.open = year.year === viewedYear || year.months.some((month) => threadMonths.has(month.slug)) || (!viewedYear && !viewedThread && yearIndex === 0);

    const yearSummary = document.createElement("summary");
    yearSummary.append(year.year, Object.assign(document.createElement("small"), { textContent: formatThreadCount(year.threadCount) }));
    yearSummary.setAttribute("aria-label", `${year.year}, ${formatThreadCount(year.threadCount)}`);
    yearDetails.append(yearSummary);

    const monthList = document.createElement("div");
    monthList.className = "archive-nav-months";
    year.months.forEach((month) => {
      const monthDetails = document.createElement("details");
      monthDetails.className = "archive-nav-month";
      monthDetails.open = month.slug === viewedMonth || threadMonths.has(month.slug);
      if (monthDetails.open && (viewedMonth || viewedThread)) monthDetails.classList.add("contains-viewed-page");

      const monthSummary = document.createElement("summary");
      monthSummary.append(month.name, Object.assign(document.createElement("small"), { textContent: formatThreadCount(month.threadCount) }));
      monthSummary.setAttribute("aria-label", `${month.name}, ${formatThreadCount(month.threadCount)}`);
      monthDetails.append(monthSummary);

      const threadPanel = document.createElement("div");
      threadPanel.className = "archive-nav-thread-panel";
      const threadList = document.createElement("ol");
      threadList.className = "archive-nav-threads";
      for (const thread of month.threads) {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = thread.href.startsWith("/") ? thread.href : `/users-archive/${month.slug}/${thread.href}`;
        const title = Object.assign(document.createElement("span"), { textContent: thread.title });
        const messageCount = Object.assign(document.createElement("small"), {
          textContent: formatMessageCount(thread.messages.length),
        });
        link.append(title, messageCount);
        link.title = thread.title;
        link.setAttribute("aria-label", `${thread.title}, ${formatMessageCount(thread.messages.length)}`);
        if (thread.messages.includes(viewedMessage) || thread.href.endsWith(`/${viewedThread}.html`)) link.setAttribute("aria-current", "page");
        item.append(link);
        threadList.append(item);
      }
      threadPanel.append(threadList);
      monthDetails.append(threadPanel);

      monthList.append(monthDetails);
    });
    yearDetails.append(monthList);
    container.append(yearDetails);
  });

  const viewed = container.querySelector(".contains-viewed-page");
  if (viewed) {
    const top = viewed.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
    container.scrollTop = Math.max(0, top - container.clientHeight / 3);
  }
}

function formatThreadCount(count) {
  return `${count} thread${count === 1 ? "" : "s"}`;
}

function formatMessageCount(count) {
  return `${count} message${count === 1 ? "" : "s"}`;
}

function updateArchiveOverview(years) {
  for (const yearSection of document.querySelectorAll(".archive-year")) {
    const yearName = yearSection.querySelector("summary span")?.textContent.trim();
    const year = years.find((entry) => entry.year === yearName);
    if (!year) continue;
    const yearCount = yearSection.querySelector("summary small");
    if (yearCount) yearCount.textContent = formatThreadCount(year.threadCount);

    for (const monthSection of yearSection.querySelectorAll(".archive-month")) {
      const heading = monthSection.querySelector("h2");
      const month = year.months.find((entry) => entry.name === heading?.textContent.trim());
      if (!heading || !month) continue;
      heading.append(Object.assign(document.createElement("small"), { textContent: formatThreadCount(month.threadCount) }));
    }
  }
}
