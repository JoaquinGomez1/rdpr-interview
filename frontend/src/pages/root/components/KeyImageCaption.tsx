import { useState } from "react";

export function KeyImageCaption({
  position,
  caption,
  onChange,
}: {
  position: number;
  caption: string;
  onChange: (caption: string) => void;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <input
        autoFocus
        aria-label={`Caption for key image ${position}`}
        placeholder="Add a short caption…"
        maxLength={160}
        value={caption}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => setEditing(false)}
      />
    );
  }

  return (
    <p
      className="key-caption"
      role="button"
      tabIndex={0}
      aria-label={`Edit caption for key image ${position}`}
      onClick={() => setEditing(true)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setEditing(true);
        }
      }}
    >
      {caption || "Add a short caption…"}
    </p>
  );
}
