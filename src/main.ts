import { addEntry, countLabel, deleteEntry, visibleEntries, type TagFilter } from "./lib/entries";
import { loadEntries, saveEntries } from "./lib/storage";
import { TAGS, type ShipEntry } from "./lib/types";
import { todayISO } from "./lib/validate";

const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("Missing #app");

let entries = loadEntries(localStorage);
let filter: TagFilter = "all";

const mark = document.createElement("div");
mark.className = "mark";
mark.textContent = "SL";

const heading = document.createElement("h1");
heading.textContent = "Ship Log";

const lede = document.createElement("p");
lede.className = "lede";
lede.textContent = "A daily record of what you shipped.";

const headingWrap = document.createElement("div");
headingWrap.append(heading, lede);

const masthead = document.createElement("header");
masthead.className = "masthead";
masthead.append(mark, headingWrap);

const titleInput = field("Title", "text", "What shipped?");
titleInput.input.required = true;
titleInput.input.autocomplete = "off";

const linkInput = field("Link", "text", "https://");
linkInput.input.inputMode = "url";
linkInput.input.autocomplete = "off";

const tagInput = document.createElement("select");
for (const tag of TAGS) {
  const option = document.createElement("option");
  option.value = tag;
  option.textContent = tag;
  tagInput.append(option);
}

const tagLabel = labeled("Tag", tagInput);

const dateInput = document.createElement("input");
dateInput.type = "date";
dateInput.value = todayISO();
const dateLabel = labeled("Date", dateInput);

const grid = document.createElement("div");
grid.className = "grid";
grid.append(tagLabel, dateLabel);

const submit = document.createElement("button");
submit.type = "submit";
submit.textContent = "Add entry";

const actions = document.createElement("div");
actions.className = "actions";
actions.append(submit);

const form = document.createElement("form");
form.noValidate = true;
form.append(titleInput.label, linkInput.label, grid, actions);

const error = document.createElement("p");
error.className = "error";
error.setAttribute("role", "alert");

const sheet = document.createElement("section");
sheet.className = "sheet";
sheet.append(form, error);

const filterSelect = document.createElement("select");
const allOption = document.createElement("option");
allOption.value = "all";
allOption.textContent = "All tags";
filterSelect.append(allOption);
for (const tag of TAGS) {
  const option = document.createElement("option");
  option.value = tag;
  option.textContent = tag;
  filterSelect.append(option);
}

const filterLabel = labeled("Show", filterSelect);
const count = document.createElement("p");
count.className = "count";
count.setAttribute("aria-live", "polite");

const toolbar = document.createElement("div");
toolbar.className = "toolbar";
toolbar.append(filterLabel, count);

const list = document.createElement("ul");
list.className = "list";

const empty = document.createElement("p");
empty.className = "empty";
empty.hidden = true;

app.append(masthead, sheet, toolbar, list, empty);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const result = addEntry(entries, {
    title: titleInput.input.value,
    link: linkInput.input.value,
    tag: tagInput.value,
    date: dateInput.value,
  });
  if (!result.ok) {
    error.textContent = result.errors.join(" ");
    return;
  }
  entries = result.entries;
  persist();
  titleInput.input.value = "";
  linkInput.input.value = "";
  error.textContent = "";
  titleInput.input.focus();
  render();
});

filterSelect.addEventListener("change", () => {
  filter = isTagFilter(filterSelect.value) ? filterSelect.value : "all";
  render();
});

list.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  const id = target.dataset.id;
  if (!id) return;
  entries = deleteEntry(entries, id);
  persist();
  render();
});

render();

function persist(): void {
  try {
    saveEntries(localStorage, entries);
  } catch {
    error.textContent = "Could not save entries in this browser.";
  }
}

function render(): void {
  const shown = visibleEntries(entries, filter);
  count.textContent = countLabel(shown.length);
  list.replaceChildren();

  if (shown.length === 0) {
    empty.hidden = false;
    empty.textContent =
      entries.length === 0
        ? "Nothing here yet. Log the first thing you ship."
        : "No entries for this tag.";
    return;
  }

  empty.hidden = true;

  for (const entry of shown) {
    list.append(renderEntry(entry));
  }
}

function renderEntry(entry: ShipEntry): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "entry";

  const date = document.createElement("time");
  date.dateTime = entry.date;
  date.textContent = formatDate(entry.date);

  const tag = document.createElement("span");
  tag.className = `tag tag-${entry.tag}`;
  tag.textContent = entry.tag;

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.append(date, tag);

  const title = document.createElement("h2");
  title.textContent = entry.title;

  const body = document.createElement("div");
  body.append(meta, title);

  if (entry.link) {
    const link = document.createElement("a");
    link.href = entry.link;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = entry.link;
    body.append(link);
  }

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "delete";
  remove.dataset.id = entry.id;
  remove.textContent = "Delete";
  remove.setAttribute("aria-label", `Delete ${entry.title}`);

  item.append(body, remove);
  return item;
}

function field(name: string, type: string, placeholder: string): {
  label: HTMLLabelElement;
  input: HTMLInputElement;
} {
  const input = document.createElement("input");
  input.type = type;
  input.placeholder = placeholder;
  return { label: labeled(name, input), input };
}

function labeled(name: string, control: HTMLElement): HTMLLabelElement {
  const label = document.createElement("label");
  const text = document.createElement("span");
  text.textContent = name;
  label.append(text, control);
  return label;
}

function isTagFilter(value: string): value is TagFilter {
  return value === "all" || (TAGS as readonly string[]).includes(value);
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
