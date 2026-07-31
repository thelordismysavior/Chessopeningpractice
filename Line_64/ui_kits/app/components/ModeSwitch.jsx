function ModeSwitch({ mode, onChange }) {
  return (
    <div className="mode-switch" role="tablist" aria-label="Practice mode">
      {["learn", "drill"].map((value) => (
        <button
          role="tab"
          aria-selected={mode === value}
          onClick={() => onChange(value)}
          type="button"
          key={value}
        >
          {value[0].toUpperCase() + value.slice(1)}
        </button>
      ))}
    </div>
  );
}

Object.assign(window, { ModeSwitch });
