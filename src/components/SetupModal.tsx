import { useTranslation } from "../hooks/useTranslation";
import { getPlayerBoardHeading, type Setup, type ValidationResult } from "../utils/gameLogic";

interface SetupModalProps {
  setup: Setup;
  onChange: React.Dispatch<React.SetStateAction<Setup>>;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  validation: ValidationResult;
}

export default function SetupModal({ setup, onChange, onSubmit, validation }: SetupModalProps) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/65 px-4 py-4 sm:flex sm:items-center sm:justify-center sm:py-6">
      <form
        onSubmit={onSubmit}
        className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)]"
      >
        <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 sm:max-h-[calc(100dvh-3rem)]">
          <h2 className="text-2xl font-bold">{t("setup.startNewGame")}</h2>
          <p className="mt-2 text-sm text-slate-400">{t("setup.subtitle")}</p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-300">
                {t("setup.player1")}
              </label>
              <input
                type="text"
                value={setup.player1}
                onChange={(e) =>
                  onChange((prev) => ({ ...prev, player1: e.target.value }))
                }
                enterKeyHint="next"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-400"
                placeholder={t("setup.player1Placeholder")}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">
                {t("setup.player2")}
              </label>
              <input
                type="text"
                value={setup.player2}
                onChange={(e) =>
                  onChange((prev) => ({ ...prev, player2: e.target.value }))
                }
                enterKeyHint="next"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-400"
                placeholder={t("setup.player2Placeholder")}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="flex items-center gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={setup.separateBoards}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    separateBoards: e.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-slate-600 bg-slate-950"
              />
              {t("setup.separateBoards")}
            </label>
          </div>

          <div className="mt-6">
            <label className="mb-1 block text-sm text-slate-300">
              {t("setup.bestOf")}
            </label>
            <input
              type="number"
              min="0"
              value={setup.bestOf}
              onChange={(e) =>
                onChange((prev) => ({ ...prev, bestOf: e.target.value }))
              }
              enterKeyHint="next"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-400"
              placeholder={t("setup.bestOfPlaceholder")}
            />
            {validation.errors.bestOf && (
              <p className="mt-1 text-xs text-rose-400">
                {validation.errors.bestOf}
              </p>
            )}
            {!validation.errors.bestOf && (
              <p className="mt-1 text-xs text-slate-400">
                {t("setup.bestOfHint")}
              </p>
            )}
          </div>

          {!setup.separateBoards && (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-slate-300">
                  {t("setup.minValue")}
                </label>
                <input
                  type="number"
                  value={setup.min}
                  onChange={(e) =>
                    onChange((prev) => ({ ...prev, min: e.target.value }))
                  }
                  enterKeyHint="next"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-400"
                  placeholder={t("setup.minPlaceholder")}
                />
                {validation.errors.min && (
                  <p className="mt-1 text-xs text-rose-400">
                    {validation.errors.min}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-300">
                  {t("setup.maxValue")}
                </label>
                <input
                  type="number"
                  value={setup.max}
                  onChange={(e) =>
                    onChange((prev) => ({ ...prev, max: e.target.value }))
                  }
                  enterKeyHint="done"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-400"
                  placeholder={t("setup.maxPlaceholder")}
                />
                {validation.errors.max && (
                  <p className="mt-1 text-xs text-rose-400">
                    {validation.errors.max}
                  </p>
                )}
              </div>
            </div>
          )}

          {setup.separateBoards && (
            <div className="mt-6 grid grid-cols-1 gap-6">
              <div className="rounded-2xl border border-cyan-500/20 p-4">
                <h3 className="mb-4 text-lg font-semibold text-cyan-300">
                  {getPlayerBoardHeading(setup.player1, t)}
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm text-slate-300">
                      {t("setup.minValue")}
                    </label>
                    <input
                      type="number"
                      value={setup.player1Min}
                      onChange={(e) =>
                        onChange((prev) => ({
                          ...prev,
                          player1Min: e.target.value,
                        }))
                      }
                      enterKeyHint="next"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-400"
                      placeholder={t("setup.minPlaceholder")}
                    />
                    {validation.errors.player1Min && (
                      <p className="mt-1 text-xs text-rose-400">
                        {validation.errors.player1Min}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-300">
                      {t("setup.maxValue")}
                    </label>
                    <input
                      type="number"
                      value={setup.player1Max}
                      onChange={(e) =>
                        onChange((prev) => ({
                          ...prev,
                          player1Max: e.target.value,
                        }))
                      }
                      enterKeyHint="next"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-400"
                      placeholder={t("setup.maxPlaceholder")}
                    />
                    {validation.errors.player1Max && (
                      <p className="mt-1 text-xs text-rose-400">
                        {validation.errors.player1Max}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-pink-500/20 p-4">
                <h3 className="mb-4 text-lg font-semibold text-pink-300">
                  {getPlayerBoardHeading(setup.player2, t)}
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm text-slate-300">
                      {t("setup.minValue")}
                    </label>
                    <input
                      type="number"
                      value={setup.player2Min}
                      onChange={(e) =>
                        onChange((prev) => ({
                          ...prev,
                          player2Min: e.target.value,
                        }))
                      }
                      enterKeyHint="next"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-400"
                      placeholder={t("setup.minPlaceholder")}
                    />
                    {validation.errors.player2Min && (
                      <p className="mt-1 text-xs text-rose-400">
                        {validation.errors.player2Min}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-300">
                      {t("setup.maxValue")}
                    </label>
                    <input
                      type="number"
                      value={setup.player2Max}
                      onChange={(e) =>
                        onChange((prev) => ({
                          ...prev,
                          player2Max: e.target.value,
                        }))
                      }
                      enterKeyHint="done"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-400"
                      placeholder={t("setup.maxPlaceholder")}
                    />
                    {validation.errors.player2Max && (
                      <p className="mt-1 text-xs text-rose-400">
                        {validation.errors.player2Max}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {validation.errors.players && (
            <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
              <div>{validation.errors.players}</div>
            </div>
          )}

          <button
            type="submit"
            disabled={!validation.valid}
            className={[
              "mt-6 w-full rounded-xl px-4 py-3 font-semibold transition",
              validation.valid
                ? "bg-cyan-400 text-slate-950 hover:opacity-90"
                : "cursor-not-allowed bg-slate-700 text-slate-400",
            ].join(" ")}
          >
            {t("actions.startGame")}
          </button>
        </div>
      </form>
    </div>
  );
}
