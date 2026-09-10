import { BookOpen } from "lucide-react";
import { Screen } from "../components/Screen";
import { Toggle } from "../components/ui";
import { useStore } from "../state/store";
import { useToast } from "../components/Toast";
import "./screens.css";

const RECIPIENT = "cocchialorenzo@gmail.com";

export function Settings() {
  const { connected, reminderEnabled, setReminderEnabled } = useStore();
  const toast = useToast();

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
              onChange={(v) =>
                setReminderEnabled(v).catch((e) =>
                  toast.show({
                    message: e instanceof Error ? e.message : "Could not save",
                    tone: "error",
                  }),
                )
              }
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
        <h2 className="section__heading">Sync</h2>
        <div className="settings-group">
          <div className="settings-item">
            <div className="settings-item__text">
              <div className="settings-item__n">Shared watering log</div>
              <div className="settings-item__s">
                {connected
                  ? "Connected. Waterings sync across every device on the household URL."
                  : "Offline demo mode — waterings are stored only on this device."}
              </div>
            </div>
            <div className="settings-item__v">
              {connected ? "Firebase" : "Local"}
            </div>
          </div>
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
