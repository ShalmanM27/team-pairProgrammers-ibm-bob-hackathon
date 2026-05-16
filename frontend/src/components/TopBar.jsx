export default function TopBar({
  mainFilePath,
  onMainFilePathChange,
  onLoadGraph,
  isLoading,
  status,
  loadedFilePath,
}) {
  return (
    <header className="border-b border-[#2f2f3d] bg-[#1e1e2e] px-4 py-3">
      <h3 className="text-base font-semibold text-[#0f62fe]">IBM Bob API Architect Canvas Bridge</h3>
      <div className="mt-3 flex items-center gap-2">
        <input
          type="text"
          value={mainFilePath}
          onChange={(event) => onMainFilePathChange(event.target.value)}
          placeholder="D:/projects/IBM/testing/sample_api.py"
          className="h-9 flex-1 rounded-md border border-[#3a3a4a] bg-[#161b28] px-3 text-sm text-slate-100 outline-none transition focus:border-[#0f62fe]"
        />
        <button
          type="button"
          onClick={onLoadGraph}
          disabled={isLoading}
          className="h-9 rounded-md bg-[#0f62fe] px-4 text-sm font-semibold text-white transition hover:bg-[#0353e9] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? 'Loading...' : 'Load Graph'}
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-400">{status}</p>
      {loadedFilePath ? <p className="mt-1 text-xs text-slate-500">{loadedFilePath}</p> : null}
    </header>
  );
}
