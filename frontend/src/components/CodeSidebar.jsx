export default function CodeSidebar({
  selectedTitle,
  filePath,
  functionCode,
  onFunctionCodeChange,
  onSaveFunction,
  isSaving,
  isFunctionNode,
  syntaxErrors,
}) {
  return (
    <aside className="w-[460px] border-l border-[#2f2f3d] bg-[#1a1d2b] p-4">
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-slate-100">{selectedTitle || 'Selected Node'}</h4>
        <p className="mt-1 text-xs text-slate-400">{filePath || ''}</p>
      </div>

      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-400">Function content only. Edit and sync.</p>
        <button
          type="button"
          onClick={onSaveFunction}
          disabled={!isFunctionNode || isSaving}
          className="h-8 rounded-md bg-[#0f62fe] px-3 text-xs font-semibold text-white transition hover:bg-[#0353e9] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving ? 'Saving...' : 'Save Function'}
        </button>
      </div>

      <textarea
        value={functionCode}
        onChange={(event) => onFunctionCodeChange(event.target.value)}
        className="h-[calc(100%-170px)] w-full resize-none rounded-md border border-[#3a3a4a] bg-[#10131d] p-3 font-mono text-xs leading-relaxed text-slate-200 outline-none focus:border-[#0f62fe]"
        spellCheck={false}
        placeholder="# Select a function node to edit its function content."
        readOnly={!isFunctionNode}
      />

      {syntaxErrors?.length ? (
        <div className="mt-3 rounded-md border border-rose-500/40 bg-rose-900/25 p-2">
          <p className="text-xs font-semibold text-rose-200">Syntax Errors</p>
          <div className="mt-2 max-h-28 overflow-auto text-[11px] leading-relaxed text-rose-100">
            {syntaxErrors.map((error, index) => (
              <p key={`${error.file}-${error.line}-${index}`}>
                {error.file}:{error.line}:{error.column} - {error.message}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
