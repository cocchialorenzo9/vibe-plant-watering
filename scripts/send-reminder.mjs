// 7pm evening reminder. Run by .github/workflows/reminder.yml on a cron.
//
// Reads the authored plant list from this repo and the watering log from the
// private data repo, computes what is due/overdue today (Europe/Berlin), and
// emails a nudge via Resend if anything is still unwatered.
//
// Requires Node >= 22 (imports the TypeScript domain modules directly via
// type-stripping). Env:
//   DATA_TOKEN   fine-grained PAT with contents:read+write on the data repo
//               (write is used only to stamp settings.lastRemindedOn so the
//                same evening is never emailed twice)
//   DATA_OWNER   e.g. cocchialorenzo
//   DATA_REPO    e.g. plant-watering-data
//   DATA_PATH    e.g. watering.json
//   RESEND_API_KEY
//   REMINDER_TO      recipient address
//   REMINDER_FROM    verified sender (default: onboarding@resend.dev)
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

function dataApiUrl() {
  const owner = required("DATA_OWNER");
  const repo = required("DATA_REPO");
  const path = env.DATA_PATH || "watering.json";
  return `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
}

function ghHeaders() {
  return {
    Authorization: `Bearer ${required("DATA_TOKEN")}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function normalise(raw) {
  return {
    events: Array.isArray(raw?.events) ? raw.events : [],
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
    return { data: normalise(raw), sha: null };
  }
  const res = await fetch(dataApiUrl(), { headers: ghHeaders() });
  if (res.status === 404) return { data: normalise(null), sha: null };
  if (!res.ok) throw new Error(`Data repo read failed (${res.status})`);
  const body = await res.json();
  return {
    data: normalise(JSON.parse(Buffer.from(body.content, "base64").toString("utf8"))),
    sha: body.sha,
  };
}

async function markReminded(data, sha, today) {
  if (env.DATA_FILE || !sha) return; // local / not-yet-created file: nothing to persist
  const next = {
    ...data,
    settings: { ...data.settings, lastRemindedOn: today },
  };
  const res = await fetch(dataApiUrl(), {
    method: "PUT",
    headers: { ...ghHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `Reminder sent ${today}`,
      content: Buffer.from(JSON.stringify(next, null, 2) + "\n").toString("base64"),
      sha,
    }),
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
  const [plants, loaded] = await Promise.all([loadPlants(), loadWatering()]);
  const { data: watering, sha } = loaded;

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
  await markReminded(watering, sha, today);
  console.log(`[${today}] Sent: ${subject}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
