import {
  TAGS,
  isTag,
  shownCount,
  todayISO,
  validateEntry,
  visibleEntries,
  type TagFilter,
} from "./lib/entries";
import { addEntry, deleteEntry, loadEntries, saveEntries } from "./lib/storage";

function required<T extends Element>(element: T | null, name: string): T {
  if (!element) throw new Error(`Ship Log markup is missing ${name}.`);
  return element;
}

const form = required(document.querySelector<HTMLFormElement>("#entry-form"), "form");
const titleInput = required(document.querySelector<HTMLInputElement>("#title"), "title");
const linkInput = required(document.querySelector<HTMLInputElement>("#link"), "link");
const tagInput = required(document.querySelector<HTMLSelectElement>("#tag"), "tag");
const dateInput = required(document.querySelector<HTMLInputElement>("#date"), "date");
const formError = required(document.querySelector<HTMLParagraphElement>("#form-error"), "form error");
const filterInput = required(document.querySelector<HTMLSelectElement>("#tag-filter"), "tag filter");
const countEl = required(document.querySelector<HTMLParagraphElement>("#shown-count"), "count");
const listEl = required(document.querySelector<HTMLUListElement>("#entry-list"), "list");
const emptyEl = required(document.querySelector<HTMLParagraphElement>("#empty-state"), "empty state");

for (const tag of TAGS) {
  const option = document.createElement("option");
  option.value = tag;
  option.textContent = tag;
  tagInput.append(option);

  const filterOption = document.createElement("option");
  filterOption.value = tag;
  filterOption.textContent = tag;
  filterInput.append(filterOption);
}

dateInput.value = todayISO();

let entries = loadEntries(localStorage);
let filter: TagFilter = "all";

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function render(): void {
  const shown = visibleEntries(entries, filter);
  const count = shownCount(entries, filter);
  countEl.textContent = `${count} ${count === 1 ? "entry" : "entries"}`;
  listEl.replaceChildren();

  for (const entry of shown) {
    const item = document.createElement("li");
    item.className = "entry";

    const body = document.createElement("div");
    const heading = document.createElement("h3");
    heading.textContent = entry.title;
    const meta = document.createElement("p");
    meta.className = "meta";

    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = entry.tag;
    const date = document.createElement("span");
    date.textContent = formatDate(entry.date);
    meta.append(tag, date);

    if (entry.link) {
      const link = document.createElement("a");
      link.href = entry.link;
      link.textContent = entry.link;
      link.target = "_blank";
      link.rel = "noreferrer";
      meta.append(link);
    }

    body.append(heading, meta);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete";
    remove.textContent = "Delete";
    remove.setAttribute("aria-label", `Delete ${entry.title}`);
    remove.addEventListener("click", () => {
      entries = deleteEntry(entries, entry.id);
      saveEntries(localStorage, entries);
      render();
    });

    item.append(body, remove);
    listEl.append(item);
  }

  emptyEl.hidden = shown.length > 0;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const result = validateEntry({
    title: titleInput.value,
    link: linkInput.value,
    tag: tagInput.value,
    date: dateInput.value,
  });

  if (!result.ok) {
    formError.hidden = false;
    formError.textContent = result.errors.map((error) => error.message).join(" ");
    return;
  }

  formError.hidden = true;
  formError.textContent = "";
  entries = addEntry(entries, {
    ...result.value,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  });
  saveEntries(localStorage, entries);
  form.reset();
  tagInput.value = TAGS[0];
  dateInput.value = todayISO();
  render();
});

filterInput.addEventListener("change", () => {
  const value = filterInput.value;
  filter = value === "all" || isTag(value) ? value : "all";
  render();
});

render();
