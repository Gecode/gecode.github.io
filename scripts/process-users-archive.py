#!/usr/bin/env python3
"""Build consolidated thread pages and navigation data from the frozen archive."""

from __future__ import annotations

from collections import defaultdict
from email import policy
from email.parser import BytesHeaderParser
from html import escape, unescape
from pathlib import Path
import gzip
import json
import re
import shutil


ROOT = Path(__file__).resolve().parent.parent
ARCHIVE = ROOT / "users-archive"
THREADS = ARCHIVE / "threads"
MONTH_ORDER = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]
MESSAGE_FILE = re.compile(r"\d{6}\.html$")
MESSAGE_ID = re.compile(r"<[^>]+>")


class UnionFind:
    def __init__(self) -> None:
        self.parent: dict[str, str] = {}

    def find(self, item: str) -> str:
        self.parent.setdefault(item, item)
        if self.parent[item] != item:
            self.parent[item] = self.find(self.parent[item])
        return self.parent[item]

    def union(self, left: str, right: str) -> None:
        left_root, right_root = self.find(left), self.find(right)
        if left_root != right_root:
            self.parent[right_root] = left_root


def mbox_headers(path: Path) -> list:
    messages: list[bytes] = []
    current: list[bytes] = []
    for line in gzip.open(path, "rb"):
        if line.startswith(b"From "):
            if current:
                messages.append(b"".join(current))
                current = []
        else:
            current.append(line)
    if current:
        messages.append(b"".join(current))
    parser = BytesHeaderParser(policy=policy.default)
    return [parser.parsebytes(message) for message in messages]


def header_ids(value: object) -> list[str]:
    return [match.group(0).lower() for match in MESSAGE_ID.finditer(str(value or ""))]


def clean_subject(value: str) -> str:
    subject = unescape(value).strip()
    previous = None
    while subject != previous:
        previous = subject
        subject = re.sub(r"^\s*(?:re|fw|fwd)\s*:\s*", "", subject, flags=re.I)
        subject = re.sub(r"^\s*\[gecode-users\]\s*", "", subject, flags=re.I)
    return subject or "Untitled thread"


def subject_key(value: str) -> str:
    return " ".join(clean_subject(value).lower().split())


def align_headers(html_files: list[Path], headers: list) -> list:
    aligned = []
    header_index = 0
    header_subjects = [subject_key(str(header.get("Subject") or "")) for header in headers]
    for html_file in html_files:
        source = html_file.read_text()
        html_subject = subject_key(extract(
            r'<h1 data-pagefind-meta="title">([\s\S]*?)</h1>', source, f"subject in {html_file}"
        ))
        match = next(
            (index for index in range(header_index, len(headers)) if header_subjects[index] == html_subject),
            None,
        )
        if match is None:
            aligned.append(headers[header_index] if header_index < len(headers) else None)
            header_index += 1
        else:
            aligned.append(headers[match])
            header_index = match + 1
    return aligned


def extract(pattern: str, source: str, label: str) -> str:
    match = re.search(pattern, source, flags=re.S | re.I)
    if not match:
        raise RuntimeError(f"Could not extract {label}")
    return match.group(1)


def thread_shell(title: str, months: list[str], messages: list[dict]) -> str:
    month_label = months[0] if len(months) == 1 else f"{months[0]}–{months[-1]}"
    count = len(messages)
    message_label = f"{count} message{'s' if count != 1 else ''}"
    articles = []
    for index, message in enumerate(messages, 1):
        articles.append(f'''<section class="archive-thread-message" id="message-{message['id']}">
        <header class="archive-thread-message-heading">
          <div><span>{index:02d}</span><h2>{escape(message['author'])}</h2></div>
          <p><time>{escape(message['date'])}</time><small>{escape(message['month_label'])}</small></p>
        </header>
        {message['article']}
      </section>''')
    return f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="{escape(title)} — {message_label} in the Gecode users mailing-list archive.">
  <link rel="icon" href="/images/gecode-logo.ico" sizes="any">
  <link rel="stylesheet" href="/users-archive/archive.css">
  <script src="/users-archive/archive.js" defer></script>
  <title>{escape(title)} | Gecode</title>
</head>
<body class="archive-page archive-thread-page">
  <a class="archive-skip" href="#archive-main">Skip to content</a>
  <header class="archive-mobile-header" data-pagefind-ignore>
    <a href="/users-archive/">Gecode users archive</a>
    <div><a class="archive-mobile-home" href="/">Gecode home</a><button type="button" data-search-open aria-keyshortcuts="Meta+K Control+K">Search</button><button type="button" data-nav-open aria-controls="archive-navigation">Browse</button></div>
  </header>
  <aside class="archive-sidebar" id="archive-navigation" aria-label="Archive navigation" data-pagefind-ignore>
    <button class="archive-nav-close" type="button" data-nav-close>Close navigation</button>
    <div class="archive-sidebar-heading"><a class="archive-title" href="/users-archive/">Gecode users archive</a><span>{message_label}</span></div>
    <button class="archive-search-trigger" type="button" data-search-open aria-keyshortcuts="Meta+K Control+K"><span>Search messages</span><kbd>⌘ K</kbd></button>
    <nav class="archive-primary-navigation" aria-label="Gecode and archive"><a class="archive-home-link" href="/"><span aria-hidden="true">←</span> Gecode home</a><a href="/users-archive/">Archive overview</a></nav>
    <p class="archive-calendar-heading">Browse by date</p>
    <div class="archive-calendar-navigation" data-archive-calendar aria-label="Browse archive by year and month"><p class="archive-calendar-loading">Loading archive…</p></div>
    <noscript><p class="archive-calendar-noscript"><a href="/users-archive/">Browse all archive months</a></p></noscript>
    <p class="archive-sidebar-note">A read-only record of the Gecode users mailing list, 2003–2018.</p>
  </aside>
  <div class="archive-shade" data-nav-close></div>
  <div class="archive-column">
    <a class="archive-logo" href="/" aria-label="Gecode home" data-pagefind-ignore><img src="/images/gecode-logo-120.png" alt="" width="98" height="63"></a>
    <main class="archive-main" id="archive-main" tabindex="-1" data-pagefind-body>
      <header class="archive-page-heading"><p>Mailing-list thread · {escape(month_label)}</p><h1 data-pagefind-meta="title">{escape(title)}</h1></header>
      <p class="archive-thread-summary">{message_label} · {escape(month_label)}</p>
      <div class="archive-thread">{''.join(articles)}</div>
    </main>
    <footer data-pagefind-ignore>Gecode users archive · preserved from Mailman</footer>
  </div>
  <dialog class="archive-search-dialog" id="archive-search-dialog" aria-labelledby="archive-search-title">
    <div class="archive-search-header"><h2 id="archive-search-title">Search the archive</h2><button class="archive-search-close" type="button" data-search-close aria-label="Close search">Close</button></div>
    <form class="archive-search-form" role="search" data-search-form><label for="archive-search-input">Subject, author, or message text</label><div class="archive-search-field"><input id="archive-search-input" type="search" autocomplete="off" placeholder="Try “branching” or an author’s name" data-search-input><button type="submit">Search</button></div></form>
    <p class="archive-search-status" aria-live="polite" data-search-status>Start typing to search messages from 2003–2018.</p><ol class="archive-search-results" data-search-results></ol>
  </dialog>
</body>
</html>
'''


def main() -> None:
    month_dirs = sorted(
        path for path in ARCHIVE.iterdir()
        if path.is_dir() and re.fullmatch(r"\d{4}-[A-Za-z]+", path.name)
    )
    union = UnionFind()
    messages: dict[str, dict] = {}
    mismatched_months = 0

    for month in month_dirs:
        html_files = sorted(path for path in month.iterdir() if MESSAGE_FILE.fullmatch(path.name))
        headers = mbox_headers(ARCHIVE / f"{month.name}.txt.gz")
        if len(html_files) != len(headers):
            mismatched_months += 1
        aligned_headers = align_headers(html_files, headers)

        for html_file, header in zip(html_files, aligned_headers, strict=True):
            message_id = html_file.stem
            node = f"html:{message_id}"
            source = html_file.read_text()
            subject_html = extract(r'<h1 data-pagefind-meta="title">([\s\S]*?)</h1>', source, f"subject in {html_file}")
            author_html = extract(r'<div class="archive-message-meta"><p><strong>([\s\S]*?)</strong>', source, f"author in {html_file}")
            date_html = extract(r'<time>([\s\S]*?)</time>', source, f"date in {html_file}")
            article = extract(r'(<article class="archive-message"[\s\S]*?</article>)', source, f"body in {html_file}")
            messages[message_id] = {
                "id": message_id,
                "slug": month.name,
                "month_label": f"{month.name[5:]} {month.name[:4]}",
                "subject": clean_subject(subject_html),
                "author": unescape(re.sub(r"<[^>]+>", "", author_html)).strip(),
                "date": unescape(re.sub(r"<[^>]+>", "", date_html)).strip(),
                "article": article,
                "path": html_file,
            }
            ids = header_ids(header.get("Message-ID")) if header else []
            replies = header_ids(header.get("In-Reply-To")) if header else []
            references = header_ids(header.get("References")) if header else []
            for identifier in ids + replies + references:
                union.union(node, f"mail:{identifier}")
            union.find(node)

        thread_html = (month / "thread.html").read_text()
        listing = extract(r'<ol class="archive-list">([\s\S]*?)</ol>', thread_html, f"thread list in {month}")
        root = None
        for class_name, href in re.findall(r'<li(?: id="\d+")?(?: class="([^"]*)")?><a href="(\d+\.html)">', listing):
            message_id = Path(href).stem
            if "is-reply" not in class_name.split():
                root = message_id
            elif root:
                union.union(f"html:{root}", f"html:{message_id}")

    components: dict[str, list[dict]] = defaultdict(list)
    for message in messages.values():
        components[union.find(f"html:{message['id']}")].append(message)
    for members in components.values():
        members.sort(key=lambda message: int(message["id"]))

    thread_records = []
    for members in sorted(components.values(), key=lambda group: int(group[0]["id"])):
        thread_id = members[0]["id"]
        months = list(dict.fromkeys(message["slug"] for message in members))
        thread_records.append({
            "id": thread_id,
            "href": f"/users-archive/threads/{thread_id}.html",
            "title": members[0]["subject"],
            "messages": [message["id"] for message in members],
            "months": months,
            "members": members,
        })

    if THREADS.exists():
        shutil.rmtree(THREADS)
    THREADS.mkdir()
    for thread in thread_records:
        labels = [f"{slug[5:]} {slug[:4]}" for slug in thread["months"]]
        (THREADS / f"{thread['id']}.html").write_text(
            thread_shell(thread["title"], labels, thread["members"])
        )

    month_threads: dict[str, list[dict]] = defaultdict(list)
    for thread in thread_records:
        public_thread = {key: thread[key] for key in ("href", "title", "messages")}
        for month in thread["months"]:
            month_threads[month].append(public_thread)

    years: dict[str, list[dict]] = defaultdict(list)
    for month in month_dirs:
        threads = month_threads[month.name]
        years[month.name[:4]].append({
            "slug": month.name,
            "name": month.name[5:],
            "threadCount": len(threads),
            "threads": threads,
        })

    index = []
    for year in sorted(years, reverse=True):
        months = sorted(years[year], key=lambda item: MONTH_ORDER.index(item["name"]), reverse=True)
        unique_threads = {thread["href"] for month in months for thread in month["threads"]}
        index.append({"year": year, "threadCount": len(unique_threads), "months": months})
    (ARCHIVE / "archive-index.json").write_text(json.dumps(index, separators=(",", ":")) + "\n")

    for message in messages.values():
        source = message["path"].read_text()
        source = re.sub(
            r'<div class="archive-message-meta">(<p>[\s\S]*?</p>)<div>[\s\S]*?</div></div>',
            r'<div class="archive-message-meta">\1</div>', source, count=1,
        )
        source = re.sub(r'<nav class="archive-message-nav"[\s\S]*?</nav>', "", source, count=1)
        source = source.replace('data-pagefind-body>', 'data-pagefind-ignore>', 1)
        message["path"].write_text(source)

    cross_month = sum(1 for thread in thread_records if len(thread["months"]) > 1)
    print(f"Generated {len(thread_records)} threads; {cross_month} span multiple months; cleaned {len(messages)} message pages; aligned {mismatched_months} mismatched mboxes.")


if __name__ == "__main__":
    main()
