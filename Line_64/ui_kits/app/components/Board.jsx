function Board({ squares, onSelect, guideSquares = [], selected = "" }) {
  const guide = new Set(guideSquares);
  return (
    <div className="board" role="group" aria-label="Chess board">
      {squares.map(({ square, piece }) => (
        <button
          className={`square${guide.has(square) ? " is-route" : ""}${selected === square ? " is-selected" : ""}`}
          data-square={square}
          aria-label={`${square}, ${piece ? `piece ${piece}` : "empty"}`}
          onClick={() => onSelect(square)}
          type="button"
          key={square}
        >
          {piece && <span className="piece" aria-hidden="true">{piece}</span>}
        </button>
      ))}
    </div>
  );
}

Object.assign(window, { Board });
