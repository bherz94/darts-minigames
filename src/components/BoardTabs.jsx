export default function BoardTabs({ players, activeBoard, onChange }) {
  return (
    <div className="mb-5 flex rounded-2xl border border-slate-700 bg-slate-900 p-1">
      <button
        onClick={() => onChange("X")}
        className={[
          "rounded-xl px-5 py-3 font-semibold transition",
          activeBoard === "X"
            ? "bg-cyan-400 text-slate-950"
            : "text-cyan-300 hover:bg-slate-800",
        ].join(" ")}
      >
        {players.X}
      </button>
      <button
        onClick={() => onChange("O")}
        className={[
          "rounded-xl px-5 py-3 font-semibold transition",
          activeBoard === "O"
            ? "bg-pink-400 text-slate-950"
            : "text-pink-300 hover:bg-slate-800",
        ].join(" ")}
      >
        {players.O}
      </button>
    </div>
  );
}
