"use client";
import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { DEFAULT_SETTINGS } from "@/lib/store";

export default function SettingsDialog() {
  const { settingsOpen, setSettingsOpen, settings, setSettings, darkMode } = useAppStore();

  const [stopWordsText, setStopWordsText] = useState(
    settings.stopWords.sort().join("\n")
  );
  const [synonymsText, setSynonymsText] = useState(
    Object.entries(settings.synonymMap)
      .map(([k, v]) => `${k} → ${v}`)
      .join("\n")
  );
  const [phrasesText, setPhrasesText] = useState(settings.phrases.join("\n"));
  const [urlTemplate, setUrlTemplate] = useState(settings.urlTemplate);

  if (!settingsOpen) return null;

  const save = () => {
    const stopWords = stopWordsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const synonymMap: Record<string, string> = {};
    for (const line of synonymsText.split("\n")) {
      const [k, ...rest] = line.split("→");
      if (k && rest.length) {
        synonymMap[k.trim().toLowerCase()] = rest.join("→").trim();
      }
    }

    const phrases = phrasesText
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);

    setSettings({ stopWords, synonymMap, phrases, urlTemplate });
    setSettingsOpen(false);
  };

  const reset = () => {
    setStopWordsText(DEFAULT_SETTINGS.stopWords.sort().join("\n"));
    setSynonymsText(
      Object.entries(DEFAULT_SETTINGS.synonymMap)
        .map(([k, v]) => `${k} → ${v}`)
        .join("\n")
    );
    setPhrasesText(DEFAULT_SETTINGS.phrases.join("\n"));
    setUrlTemplate(DEFAULT_SETTINGS.urlTemplate);
  };

  const overlay = "fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4";
  const dialog = `w-full max-w-2xl rounded-xl shadow-2xl ${
    darkMode ? "bg-gray-800 text-gray-100" : "bg-white text-gray-900"
  }`;
  const label = `block text-xs font-semibold mb-1 ${darkMode ? "text-gray-300" : "text-gray-600"}`;
  const textarea = `w-full rounded border text-xs font-mono p-2 resize-y ${
    darkMode
      ? "bg-gray-700 border-gray-600 text-gray-200"
      : "bg-gray-50 border-gray-300 text-gray-800"
  }`;
  const input = `w-full rounded border text-sm p-2 ${
    darkMode
      ? "bg-gray-700 border-gray-600 text-gray-200"
      : "bg-gray-50 border-gray-300 text-gray-800"
  }`;

  return (
    <div className={overlay} onClick={() => setSettingsOpen(false)}>
      <div className={dialog} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200/20">
          <h2 className="font-bold text-lg">Settings</h2>
          <button onClick={() => setSettingsOpen(false)} className="text-gray-400 hover:text-red-500 text-xl">✕</button>
        </div>

        <div className="p-4 grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
          {/* Stop words */}
          <div>
            <label className={label}>Stop words (one per line)</label>
            <textarea
              className={textarea}
              rows={14}
              value={stopWordsText}
              onChange={(e) => setStopWordsText(e.target.value)}
            />
          </div>

          {/* Synonyms */}
          <div className="space-y-4">
            <div>
              <label className={label}>
                Synonyms (one per line: <code>from → to</code>)
              </label>
              <textarea
                className={textarea}
                rows={8}
                value={synonymsText}
                onChange={(e) => setSynonymsText(e.target.value)}
              />
            </div>

            {/* Phrases */}
            <div>
              <label className={label}>Phrases (one per line)</label>
              <textarea
                className={textarea}
                rows={6}
                value={phrasesText}
                onChange={(e) => setPhrasesText(e.target.value)}
              />
            </div>
          </div>

          {/* URL template — full width */}
          <div className="col-span-2">
            <label className={label}>
              Ticket URL template (use <code>{"{ticket_id}"}</code>)
            </label>
            <input
              type="text"
              className={input}
              placeholder="https://servicenow.mycorp.com/incident.do?sysparm_query=number={ticket_id}"
              value={urlTemplate}
              onChange={(e) => setUrlTemplate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-between p-4 border-t border-gray-200/20">
          <button
            onClick={reset}
            className="text-sm text-gray-400 hover:text-gray-600 underline"
          >
            Reset to defaults
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setSettingsOpen(false)}
              className={`px-4 py-2 rounded text-sm border ${
                darkMode ? "border-gray-600 text-gray-300" : "border-gray-300 text-gray-600"
              } hover:bg-gray-100/10`}
            >
              Cancel
            </button>
            <button
              onClick={save}
              className="px-4 py-2 rounded text-sm bg-blue-600 text-white hover:bg-blue-700"
            >
              Save &amp; Recompute
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
