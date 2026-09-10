import { useState } from "react";
import { BookOpen } from "lucide-react";
import { Screen } from "../components/Screen";
import { Toggle } from "../components/ui";
import { useStore } from "../state/store";
import { useToast } from "../components/Toast";
import "./screens.css";

const RECIPIENT = "cocchialorenzo@gmail.com";

export function Settings() {
  const {
    config,
    connected,
    updateConfig,
    reload,
    reminderEnabled,
    setReminderEnabled,
  } = useStore();
  const toast = useToast();
  const [token, setToken] = useState(config.token);
  const [owner, setOwner] = useState(config.owner);
  const [repo, setRepo] = useState(config.repo);

  function saveConnection() {
    updateConfig({ token: token.trim(), owner: owner.trim(), repo: repo.trim() });
    toast.show({ message: "Connection saved" });
    reload();
  }

  return (
    <Screen>
      <h1 className="screen-title">Settings</h1>

      <section className="section">
        <h2 className="section__heading">Reminders</h2>
        <div className="settings-group">
          <div className="settings-item">
            <div className="settings-item__text">
              <div className="settings-item__n">Evening reminder</div>
              <div className="settings-item__s">
                If plants are still unwatered, we email you at 7:00 PM.
              </div>
            </div>
            <Toggle
              label="Evening reminder"
              checked={reminderEnabled}
              onChange={(v) => {
                updateConfig({ reminderEnabled: v });
                setReminderEnabled(v).catch((e) =>
                  toast.show({
                    message: e instanceof Error ? e.message : "Could not save",
                    tone: "error",
                  }),
                );
              }}
            />
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="section__heading">Delivery</h2>
        <div className="settings-group">
          <div className="settings-item">
            <div className="settings-item__text">
              <div className="settings-item__n">Email address</div>
            </div>
            <div className="settings-item__v">{RECIPIENT}</div>
          </div>
          <div className="settings-item">
            <div className="settings-item__text">
              <div className="settings-item__n">Reminder time</div>
            </div>
            <div className="settings-item__v">7:00 PM · Europe/Berlin</div>
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="section__heading">Connection</h2>
        <p className="settings-item__s" style={{ padding: "0 2px" }}>
          {connected
            ? "Connected — waterings you log are saved to the data repository."
            : "Not connected — the app is read-only until you add a data-repo token."}
        </p>
        <div className="settings-group" style={{ padding: 14, gap: 10, background: "var(--card)" }}>
          <label className="sheet__field">
            <span>Repo owner</span>
            <input
              className="settings-input"
              style={{ fontFamily: "var(--font-body)" }}
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="cocchialorenzo"
            />
          </label>
          <label className="sheet__field">
            <span>Data repo name</span>
            <input
              className="settings-input"
              style={{ fontFamily: "var(--font-body)" }}
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="plant-watering-data"
            />
          </label>
          <label className="sheet__field">
            <span>Personal access token</span>
            <input
              className="settings-input"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="github_pat_…"
              autoComplete="off"
            />
          </label>
          <button className="btn btn--primary" type="button" onClick={saveConnection}>
            Save connection
          </button>
        </div>
      </section>

      <section className="section">
        <h2 className="section__heading">Sources</h2>
        <div className="settings-group">
          <div className="settings-item">
            <BookOpen size={16} style={{ color: "var(--accent)" }} aria-hidden />
            <div className="settings-item__text">
              <div className="settings-item__n">Plant identification &amp; care</div>
            </div>
            <div className="settings-item__v">Wikipedia · Wikispecies</div>
          </div>
        </div>
      </section>
    </Screen>
  );
}
