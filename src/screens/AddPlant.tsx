import { Camera, Keyboard, BookOpen, Sparkles } from "lucide-react";
import { Screen } from "../components/Screen";
import "./screens.css";

export function AddPlant() {
  return (
    <Screen>
      <h1 className="screen-title">Add a plant</h1>
      <p className="sub">
        New plants are added through a short chat in the Claude&nbsp;Code app on
        your phone — that's where the photo, the web search and the avatar happen.
        The app then updates itself.
      </p>

      <div className="choice-card">
        <div className="choice-card__icon">
          <Sparkles size={22} aria-hidden />
        </div>
        <div className="settings-item__text">
          <div className="choice-card__t">Open Claude Code</div>
          <div className="choice-card__d">
            Say “add a new plant”, then send a photo or type its name.
          </div>
        </div>
      </div>

      <div className="choice-card">
        <div className="choice-card__icon">
          <Camera size={22} aria-hidden />
        </div>
        <div className="settings-item__text">
          <div className="choice-card__t">Send a photo</div>
          <div className="choice-card__d">
            Point at the whole plant. Claude identifies the species from
            Wikipedia &amp; Wikispecies.
          </div>
        </div>
      </div>

      <div className="choice-card">
        <div className="choice-card__icon">
          <Keyboard size={22} aria-hidden />
        </div>
        <div className="settings-item__text">
          <div className="choice-card__t">…or just the name</div>
          <div className="choice-card__d">
            A common or scientific name is enough. Claude fills in origin, care
            and curiosities.
          </div>
        </div>
      </div>

      <div className="note">
        <BookOpen size={15} aria-hidden />
        <span>
          Identification and care notes always come from Wikipedia &amp;
          Wikispecies. Claude commits the new plant and its avatar to the app's
          repository; it appears here within a minute.
        </span>
      </div>
    </Screen>
  );
}
