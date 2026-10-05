import { addEntry, countLabel, deleteEntry, visibleEntries, type TagFilter } from "./lib/entries";
import { loadEntries, saveEntries } from "./lib/storage";
import { TAGS, type ShipEntry, type Tag } from "./lib/types";
import { todayISO } from "./lib/validate";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app");

let entries = loadEntries(localStorage);
let filter: TagFilter = "all";

const tagOptions = TAGS.map(
  (tag) => `<option value="${tag}">${labelFor(tag)}</option>`,
).join("");

app.innerHTML = `
  <main class="log">
    <header class="mast">
      <p class="eyebrow">Daily builder log</p>
      <h1>Ship Log</h1>
      <p class="lede">Write down what left the dock. Titles are required. Links, when you have them, need to be http or https.</p>
    </header>

    <form id="entry-form" class="card" novalidate>
      <div class="fields">
        <label class="field title-field">
          <span>Title</span>
          <input name="title" type="text" maxlength="160" autocomplete="off" placeholder="What shipped?" />
        </label>
        <label class="field">
          <span>Link</span>
          <input name="link" type="text" inputmode="url" autocomplete="off" placeholder="https://" />
        </label>
        <label class="field">
          <span>Tag</span>
          <select name="tag">${tagOptions}</select>
        </label>
        <label class="field">
          <span>Date</span>
          <input name="date" type="date" />
        </label>
      </div>
      <div class="form-row">
        <button type="submit">Log ship</button>
        <p id="form-error" class="error" role="alert" hidden></p>
      </div>
    </form>

    <section class="board" aria-labelledby="board-title">
      <div class="board-head">
        <h2 id="board-title">Log</h2>
        <label class="filter">
          <span>Show</span>
          <select id="tag-filter">
            <option value="all">All tags</option>
            ${tagOptions}
          </select>
        </label>
        <p id="count" class="count"></p>
      </div>
      <ul id="list" class="list"></ul>
      <p id="empty" class="empty" hidden>Nothing under this filter yet.</p>
    </section>
  </main>
`;

const form = app.querySelector<HTMLFormElement>("#entry-form")!;
const titleInput = form.elements.namedItem("title") as HTMLInputElement;
const linkInput = form.elements.namedItem("link") as HTMLInputElement;
const tagInput = form.elements.namedItem("tag") as HTMLSelectElement;
const dateInput = form.elements.namedItem("date") as HTMLInputElement;
const errorEl = app.querySelector<HTMLParagraphElement>("#form-error")!;
const filterEl = app.querySelector<HTMLSelectElement>("#tag-filter")!;
const countEl = app.querySelector<HTMLParagraphElement>("#count")!;
const listEl = app.querySelector<HTMLUListElement>("#list")!;
const emptyEl = app.querySelector<HTMLParagraphElement>("#empty")!;

dateInput.value = todayISO();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const result = addEntry(entries, {
    title: titleInput.value,
    link: linkInput.value,
    tag: tagInput.value,
    date: dateInput.value,
  });
  if (!result.ok) {
    showError(result.errors.join(" "));
    return;
  }
  entries = result.entries;
  saveEntries(localStorage, entries);
  titleInput.value = "";
  linkInput.value = "";
  dateInput.value = todayISO();
  showError("");
  render();
  titleInput.focus();
});

filterEl.addEventListener("change", () => {
  filter = filterEl.value as TagFilter;
  render();
});

listEl.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  const id = target.dataset.id;
  if (!id) return;
  entries = deleteEntry(entries, id);
  saveEntries(localStorage, entries);
  render();
});

render();

function render(): void {
  const shown = visibleEntries(entries, filter);
  countEl.textContent = countLabel(shown.length);
  emptyEl.hidden = shown.length > 0;
  listEl.innerHTML = shown.map(renderEntry).join("");
}

function renderEntry(entry: ShipEntry): string {
  const link = entry.link
    ? `<a class="entry-link" href="${escapeAttr(entry.link)}" target="_blank" rel="noreferrer">${escapeHtml(entry.link)}</a>`
    : "";
  return `
    <li class="entry">
      <div class="entry-meta">
        <time datetime="${escapeAttr(entry.date)}">${escapeHtml(formatDate(entry.date))}</time>
        <span class="tag tag-${entry.tag}">${escapeHtml(labelFor(entry.tag))}</span>
      </div>
      <h3>${escapeHtml(entry.title)}</h3>
      ${link}
      <button type="button" class="delete" data-id="${escapeAttr(entry.id)}">Delete</button>
    </li>
  `;
}

function showError(message: string): void {
  errorEl.textContent = message;
  errorEl.hidden = message.length === 0;
}

function labelFor(tag: Tag): string {
  return tag.charAt(0).toUpperCase() + tag.slice(1);
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replaceAll("'", "&#39;");
}
