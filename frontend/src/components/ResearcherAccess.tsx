import { useState } from "react";
export function ResearcherAccess() {
  const [open, setOpen] = useState(false),
    [key, setKey] = useState(""),
    [saved, setSaved] = useState(
      !!sessionStorage.getItem("research-admin-key"),
    );
  return (
    <div>
      <button className="button secondary" onClick={() => setOpen(!open)}>
        Researcher access
      </button>
      {open && (
        <div
          className="card"
          style={{
            position: "absolute",
            right: 20,
            top: 70,
            zIndex: 60,
            maxWidth: 340,
          }}
        >
          <label>
            Admin key
            <input
              type="password"
              autoComplete="off"
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
          </label>
          <p className="help-text">
            Protects saved history, label reviews and research settings from
            public changes. Ordinary prompt analysis does not require a key.
            Stored in this tab’s session only.
          </p>
          <p className="help-text">
            Use ADMIN_API_KEY from your local backend/.env file. This is your
            private researcher key, not the Supabase anon key or database
            password. The deployed backend must have the same ADMIN_API_KEY
            configured in Vercel. Never share it publicly. Unlocking does not
            enable training on Vercel; training runs on your PC.
          </p>
          <button
            className="button primary"
            onClick={() => {
              sessionStorage.setItem("research-admin-key", key);
              setKey("");
              setSaved(true);
            }}
          >
            Unlock
          </button>
          <button
            className="button secondary"
            onClick={() => {
              sessionStorage.removeItem("research-admin-key");
              setSaved(false);
            }}
          >
            Lock
          </button>
          <p role="status">
            {saved
              ? "Key saved. Retry the protected panel to verify access."
              : "Locked"}
          </p>
        </div>
      )}
    </div>
  );
}
