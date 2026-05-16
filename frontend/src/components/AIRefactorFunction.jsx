import { useState } from 'react';

export default function AIRefactorFunction({
  isOpen,
  onClose,
  selectedNode,
  onRefactored,
  workspacePath,
}) {
  const [refactorGoal, setRefactorGoal] = useState('');
  const [preserveSignature, setPreserveSignature] = useState(true);
  const [isRefactoring, setIsRefactoring] = useState(false);
  const [result, setResult] = useState(null);

  const refactorGoals = [
    { value: 'optimize performance', label: '⚡ Optimize Performance', description: 'Improve execution speed and efficiency' },
    { value: 'add error handling', label: '🛡️ Add Error Handling', description: 'Enhance error handling and validation' },
    { value: 'improve readability', label: '📖 Improve Readability', description: 'Make code clearer and more maintainable' },
    { value: 'add type safety', label: '🔒 Add Type Safety', description: 'Add comprehensive type hints' },
    { value: 'enhance documentation', label: '📝 Enhance Documentation', description: 'Add detailed docstrings and comments' },
  ];

  const functionId = selectedNode?.data?.function_id;
  const functionName = functionId?.split('::')[1] || 'Unknown';
  const currentCode = selectedNode?.data?.code || '';

  const refactorFunction = async () => {
    if (!functionId || !refactorGoal.trim()) {
      alert('Please select a refactoring goal');
      return;
    }

    setIsRefactoring(true);
    setResult(null);

    try {
      const response = await fetch('http://localhost:5001/mcp/refactor-function', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          function_id: functionId,
          refactor_goal: refactorGoal.trim(),
          preserve_signature: preserveSignature,
          workspace_path: workspacePath || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Refactoring failed');
      }

      const data = await response.json();
      setResult(data);
      
      if (onRefactored) {
        onRefactored(data);
      }
    } catch (error) {
      const message = error?.message || 'Refactoring failed';
      const hint = message.includes('Failed to fetch')
        ? ' Make sure the MCP server is running on port 5001.'
        : '';
      setResult({
        success: false,
        explanation: `Error: ${message}.${hint}`,
      });
    } finally {
      setIsRefactoring(false);
    }
  };

  const copyToClipboard = () => {
    if (result?.generated_code) {
      navigator.clipboard.writeText(result.generated_code);
      alert('Refactored code copied to clipboard!');
    }
  };

  const compareCode = () => {
    // In a real implementation, this would show a side-by-side diff
    alert('Code comparison feature coming soon!');
  };

  if (!isOpen) return null;

  if (!functionId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="w-[500px] rounded-lg bg-[#1a1d2b] p-6 shadow-2xl">
          <h2 className="mb-4 text-lg font-semibold text-slate-100">No Function Selected</h2>
          <p className="mb-4 text-sm text-slate-300">
            Please select a function node from the canvas to refactor it.
          </p>
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-[#0f62fe] py-2 text-sm font-medium text-white hover:bg-[#0353e9]"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="flex h-[700px] w-[1000px] flex-col rounded-lg bg-[#1a1d2b] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#3a3a4a] p-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔧</span>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">AI Function Refactoring</h2>
              <p className="text-xs text-slate-400">Refactoring: {functionName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-[#2a2d3b] hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Options */}
          <div className="w-1/3 overflow-y-auto border-r border-[#3a3a4a] p-6">
            <div className="space-y-4">
              {/* Current Function Info */}
              <div className="rounded-lg bg-[#2a2d3b] p-3">
                <div className="mb-2 text-xs font-medium text-slate-400">Current Function:</div>
                <div className="text-sm font-medium text-slate-100">{functionName}</div>
                <div className="mt-1 text-xs text-slate-400">{functionId}</div>
              </div>

              {/* Refactoring Goals */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Refactoring Goal
                </label>
                <div className="space-y-2">
                  {refactorGoals.map((goal) => (
                    <button
                      key={goal.value}
                      onClick={() => setRefactorGoal(goal.value)}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        refactorGoal === goal.value
                          ? 'border-[#0f62fe] bg-[#0f62fe] bg-opacity-10'
                          : 'border-[#3a3a4a] bg-[#2a2d3b] hover:border-[#4a4a5a]'
                      }`}
                    >
                      <div className="text-sm font-medium text-slate-100">{goal.label}</div>
                      <div className="mt-1 text-xs text-slate-400">{goal.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Goal */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Or Enter Custom Goal
                </label>
                <textarea
                  value={refactorGoal}
                  onChange={(e) => setRefactorGoal(e.target.value)}
                  placeholder="Describe what you want to improve..."
                  className="w-full resize-none rounded-lg border border-[#3a3a4a] bg-[#2a2d3b] p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-[#0f62fe] focus:outline-none"
                  rows={3}
                />
              </div>

              {/* Options */}
              <div>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={preserveSignature}
                    onChange={(e) => setPreserveSignature(e.target.checked)}
                    className="h-4 w-4 rounded border-[#3a3a4a] bg-[#2a2d3b] text-[#0f62fe] focus:ring-[#0f62fe]"
                  />
                  Preserve function signature
                </label>
                <p className="ml-6 mt-1 text-xs text-slate-500">
                  Keep parameter names and types unchanged
                </p>
              </div>

              {/* Refactor Button */}
              <button
                onClick={refactorFunction}
                disabled={isRefactoring || !refactorGoal.trim()}
                className="w-full rounded-lg bg-[#0f62fe] py-3 text-sm font-medium text-white hover:bg-[#0353e9] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRefactoring ? 'Refactoring...' : '🔧 Refactor Function'}
              </button>
            </div>
          </div>

          {/* Right Panel - Code Comparison */}
          <div className="flex w-2/3 flex-col overflow-hidden">
            {result ? (
              <>
                <div className="border-b border-[#3a3a4a] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-slate-100">
                        {result.success ? '✅ Refactored Successfully' : '❌ Refactoring Failed'}
                      </h3>
                      <p className="text-xs text-slate-400">{result.explanation}</p>
                    </div>
                    {result.success && (
                      <div className="flex gap-2">
                        <button
                          onClick={compareCode}
                          className="rounded bg-[#2a2d3b] px-3 py-1 text-xs text-slate-300 hover:bg-[#3a3d4b]"
                        >
                          🔍 Compare
                        </button>
                        <button
                          onClick={copyToClipboard}
                          className="rounded bg-[#2a2d3b] px-3 py-1 text-xs text-slate-300 hover:bg-[#3a3d4b]"
                        >
                          📋 Copy
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {/* Original Code */}
                  <div className="mb-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-xs font-medium text-slate-400">Original Code:</div>
                      <div className="text-xs text-slate-500">{currentCode.split('\n').length} lines</div>
                    </div>
                    <pre className="overflow-x-auto rounded-lg bg-[#161616] p-4 text-xs text-slate-100">
                      <code>{currentCode}</code>
                    </pre>
                  </div>

                  {/* Refactored Code */}
                  {result.generated_code && (
                    <div className="mb-4">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-xs font-medium text-green-400">Refactored Code:</div>
                        <div className="text-xs text-slate-500">{result.generated_code.split('\n').length} lines</div>
                      </div>
                      <pre className="overflow-x-auto rounded-lg bg-[#161616] p-4 text-xs text-slate-100">
                        <code>{result.generated_code}</code>
                      </pre>
                    </div>
                  )}

                  {/* Suggestions */}
                  {result.suggestions?.length > 0 && (
                    <div className="mb-4 rounded-lg bg-[#2a2d3b] p-3">
                      <div className="mb-2 text-xs font-medium text-slate-400">💡 Suggestions:</div>
                      <ul className="space-y-1">
                        {result.suggestions.map((suggestion, i) => (
                          <li key={i} className="text-xs text-slate-300">
                            • {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {result.success && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setResult(null)}
                        className="rounded bg-[#2a2d3b] px-4 py-2 text-sm text-slate-300 hover:bg-[#3a3d4b]"
                      >
                        Try Different Goal
                      </button>
                      <button
                        onClick={onClose}
                        className="rounded bg-[#0f62fe] px-4 py-2 text-sm text-white hover:bg-[#0353e9]"
                      >
                        Apply Changes
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <div className="mb-6 text-6xl">🎯</div>
                <h3 className="mb-2 text-lg font-medium text-slate-100">Ready to Refactor</h3>
                <p className="mb-4 text-sm text-slate-400">
                  Select a refactoring goal and click the button to improve your function
                </p>
                <div className="w-full max-w-md rounded-lg bg-[#2a2d3b] p-4">
                  <div className="mb-2 text-xs font-medium text-slate-400">Current Function Preview:</div>
                  <pre className="overflow-x-auto text-left text-xs text-slate-300">
                    <code>{currentCode.split('\n').slice(0, 10).join('\n')}
{currentCode.split('\n').length > 10 ? '\n...' : ''}</code>
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Made with Bob
