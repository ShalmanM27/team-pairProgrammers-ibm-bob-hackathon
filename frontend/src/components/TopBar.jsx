export default function TopBar({
  mainFilePath,
  onMainFilePathChange,
  onLoadGraph,
  newNodeLabel,
  onNewNodeLabelChange,
  newNodeKind,
  onNewNodeKindChange,
  onAddNode,
  onQuickAddRouter,
  onDeleteSelectedNode,
  hasSelectedNode,
  isLoading,
  status,
  loadedFilePath,
  onOpenChatbot,
  onOpenGenerateEndpoint,
  onOpenRefactorFunction,
  availableModels,
  selectedModelId,
  onSelectedModelIdChange,
  isLoadingModels,
  modelsSource,
  modelsError,
}) {
  return (
    <header className="border-b border-[#2f2f3d] bg-[#1e1e2e] px-4 py-3">
      <h3 className="text-base font-semibold text-[#0f62fe]">IBM Bob API Architect Canvas Bridge</h3>

      <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex items-center gap-2">
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

        <div className="flex flex-wrap items-center gap-2 rounded-md border border-[#2f2f3d] bg-[#161b28] p-2">
          <input
            type="text"
            value={newNodeLabel}
            onChange={(event) => onNewNodeLabelChange(event.target.value)}
            placeholder="Node label"
            className="h-8 w-40 rounded-md border border-[#3a3a4a] bg-[#10131d] px-2 text-xs text-slate-100 outline-none transition focus:border-[#0f62fe]"
          />

          <select
            value={newNodeKind}
            onChange={(event) => onNewNodeKindChange(event.target.value)}
            className="h-8 rounded-md border border-[#3a3a4a] bg-[#10131d] px-2 text-xs text-slate-100 outline-none transition focus:border-[#0f62fe]"
          >
            <option value="router">Router</option>
            <option value="function">Function</option>
            <option value="input">Input</option>
            <option value="output">Output</option>
            <option value="default">Default</option>
          </select>

          <button
            type="button"
            onClick={onAddNode}
            className="h-8 rounded-md border border-[#0f62fe] px-3 text-xs font-semibold text-[#d0e2ff] transition hover:bg-[#0f62fe]/15"
          >
            Add Node
          </button>

          <button
            type="button"
            onClick={onQuickAddRouter}
            className="h-8 rounded-md bg-[#0f62fe] px-3 text-xs font-semibold text-white transition hover:bg-[#0353e9]"
          >
            + New Router
          </button>

          <button
            type="button"
            onClick={onDeleteSelectedNode}
            disabled={!hasSelectedNode}
            className="h-8 rounded-md border border-[#6f6f82] px-3 text-xs font-semibold text-slate-200 transition hover:bg-[#2a2a3a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Delete Selected
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-md border border-[#0f62fe] bg-[#0f62fe]/10 p-2">
          <span className="text-xs font-medium text-[#78a9ff]">AI Features:</span>

          <select
            value={selectedModelId}
            onChange={(event) => onSelectedModelIdChange?.(event.target.value)}
            disabled={isLoadingModels || !(availableModels || []).length}
            className="h-8 min-w-[260px] rounded-md border border-[#3a3a4a] bg-[#10131d] px-2 text-xs text-slate-100 outline-none transition focus:border-[#0f62fe] disabled:cursor-not-allowed disabled:opacity-60"
            title="Global model for Chat, Generate Endpoint, and Refactor Function"
          >
            {(availableModels || []).map((modelId) => (
              <option key={modelId} value={modelId}>
                {modelId}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onOpenChatbot}
            className="h-8 rounded-md bg-[#0f62fe] px-3 text-xs font-semibold text-white transition hover:bg-[#0353e9]"
            title="Open AI assistant chatbot"
          >
            Chat
          </button>

          <button
            type="button"
            onClick={onOpenGenerateEndpoint}
            className="h-8 rounded-md bg-[#0f62fe] px-3 text-xs font-semibold text-white transition hover:bg-[#0353e9]"
            title="Generate new endpoint with AI"
          >
            Generate Endpoint
          </button>

          <button
            type="button"
            onClick={onOpenRefactorFunction}
            disabled={!hasSelectedNode}
            className="h-8 rounded-md bg-[#0f62fe] px-3 text-xs font-semibold text-white transition hover:bg-[#0353e9] disabled:cursor-not-allowed disabled:opacity-50"
            title="Refactor selected function with AI"
          >
            Refactor Function
          </button>
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-400">{status}</p>
      <p className="mt-1 text-xs text-slate-500">
        {isLoadingModels ? 'Loading models...' : `Model source: ${modelsSource || 'unknown'}`}
      </p>
      {modelsError ? <p className="mt-1 text-xs text-amber-400">{modelsError}</p> : null}
      {loadedFilePath ? <p className="mt-1 text-xs text-slate-500">{loadedFilePath}</p> : null}
    </header>
  );
}
