function Feedback({ selected, expected = "Nf6" }) {
  const correct = selected === "f6";
  return (
    <div className={`feedback${correct ? " is-correct" : ""}`} role="status" aria-live="polite">
      <strong>{correct ? "The line is holding." : "The position remains."}</strong>
      <span>{correct ? `${expected} is correct. Bank the line.` : selected ? `${expected} was expected. Try the move again.` : "Select the knight on g8, then f6."}</span>
    </div>
  );
}

Object.assign(window, { Feedback });
