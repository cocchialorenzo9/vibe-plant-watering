// 7pm evening reminder. Run by .github/workflows/reminder.yml on a cron.
//
// Reads the authored plant list from this repo and the watering log from the
// shared Firebase Realtime Database (REST API), computes what is due/overdue
// today (Europe/Berlin), and emails a nudge via Resend if anything is still
// unwatered.
//
// Requires Node >= 22 (imports the TypeScript domain modules directly via
// type-stripping). Env:
//   FIREBASE_DB_URL  Realtime Database base URL, e.g.
//                    https://personal-website-abda6-default-rtdb.europe-west1.firebasedatabase.app
//   FIREBASE_DB_AUTH optional ?auth= token, only if the rules stop allowing
//                    anonymous read/write on the plantWatering subtree
//   RESEND_API_KEY
//   REMINDER_TO      recipient address
//   REMINDER_FROM    verified sender (default: onboarding@resend.dev)
//   DATA_FILE        local JSON file to read instead of Firebase (testing)
//   DRY_RUN=1        print instead of sending

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { computeSchedule } from "../src/domain/schedule.ts";
import { wateredOn } from "../src/domain/schedule.ts";
import { todayInBerlin } from "../src/lib/date.ts";

const here = dirname(fileURLToPath(import.meta.url));
const env = process.env;

function required(name) {
  const v = env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

async function loadPlants() {
  const raw = await readFile(
    resolve(here, "../public/data/plants.json"),
    "utf8",
  );
  return JSON.parse(raw);
}

function dbUrl(suffix) {
  const base = required("FIREBASE_DB_URL").replace(/\/$/, "");
  const auth = env.FIREBASE_DB_AUTH ? `?auth=${env.FIREBASE_DB_AUTH}` : "";
  return `${base}/plantWatering${suffix}.json${auth}`;
}

/** Realtime Database stores events as an object keyed by `plantId__date`. */
function normalise(raw) {
  const rawEvents = raw?.events;
  const events = Array.isArray(rawEvents)
    ? rawEvents
    : rawEvents && typeof rawEvents === "object"
      ? Object.values(rawEvents)
      : [];
  return {
    events,
    overrides:
      raw?.overrides && typeof raw.overrides === "object" ? raw.overrides : {},
    settings: raw?.settings && typeof raw.settings === "object" ? raw.settings : {},
  };
}

async function loadWatering() {
  if (env.DATA_FILE) {
    const raw = JSON.parse(
      await readFile(resolve(process.cwd(), env.DATA_FILE), "utf8"),
    );
    return normalise(raw);
  }
  const res = await fetch(dbUrl(""));
  if (!res.ok) throw new Error(`Database read failed (${res.status})`);
  return normalise(await res.json());
}

async function markReminded(today) {
  if (env.DATA_FILE) return; // local test file: nothing to persist
  const res = await fetch(dbUrl("/settings"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lastRemindedOn: today }),
  });
  if (!res.ok) {
    console.warn(`Could not record reminder marker (${res.status})`);
  }
}

function pluralDays(n) {
  return `${n} day${n === 1 ? "" : "s"}`;
}

async function main() {
  const today = todayInBerlin();
  const [plants, watering] = await Promise.all([loadPlants(), loadWatering()]);

  if (watering.settings.reminderEnabled === false) {
    console.log(`[${today}] Evening reminder disabled in settings — no email.`);
    return;
  }

  if (watering.settings.lastRemindedOn === today && env.DRY_RUN !== "1") {
    console.log(`[${today}] Already reminded today — skipping.`);
    return;
  }

  const outstanding = plants
    .map((p) => ({
      plant: p,
      schedule: computeSchedule(p, watering.overrides[p.id], watering.events, today),
    }))
    .filter(
      ({ plant, schedule }) =>
        (schedule.status === "due" || schedule.status === "overdue") &&
        !wateredOn(watering.events, plant.id, today),
    )
    .sort((a, b) => a.schedule.daysUntilDue - b.schedule.daysUntilDue);

  if (outstanding.length === 0) {
    console.log(`[${today}] Nothing outstanding — no email.`);
    return;
  }

  const lines = outstanding.map(({ plant, schedule }) => {
    const d = schedule.daysUntilDue;
    const when =
      d === 0 ? "due today" : `${pluralDays(Math.abs(d))} overdue`;
    return `• ${plant.nickname} — ${when}`;
  });

  const subject =
    outstanding.length === 1
      ? `${outstanding[0].plant.nickname} needs water`
      : `${outstanding.length} plants need water`;

  const appUrl = env.APP_URL || "https://cocchialorenzo.github.io/vibe-plant-watering/#/water-check";
  const text = `Still thirsty this evening:\n\n${lines.join("\n")}\n\nLog them: ${appUrl}\n`;
  const html =
    `<p>Still thirsty this evening:</p><ul>` +
    outstanding
      .map(({ plant, schedule }) => {
        const d = schedule.daysUntilDue;
        const when = d === 0 ? "due today" : `${pluralDays(Math.abs(d))} overdue`;
        return `<li><strong>${plant.nickname}</strong> — ${when}</li>`;
      })
      .join("") +
    `</ul><p><a href="${appUrl}">Log the waterings →</a></p>`;

  if (env.DRY_RUN === "1") {
    console.log(`[${today}] DRY RUN\nSubject: ${subject}\n${text}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${required("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.REMINDER_FROM || "Plant Watering <onboarding@resend.dev>",
      to: [required("REMINDER_TO")],
      subject,
      text,
      html,
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend failed (${res.status}): ${await res.text()}`);
  }
  await markReminded(today);
  console.log(`[${today}] Sent: ${subject}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
