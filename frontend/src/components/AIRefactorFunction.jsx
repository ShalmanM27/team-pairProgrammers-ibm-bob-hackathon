import { useState } from 'react';
import { requestFunctionRefactor } from '../lib/apiClient';

export default function AIRefactorFunction({
  isOpen,
  onClose,
  selectedNode,
  onRefactored,
  onApplyRefactor,
  workspacePath,
  selectedModelId,
  availableModels,
  isLoadingModels,
  modelsSource,
  modelsError,
}) {
  const [refactorGoal, setRefactorGoal] = useState('');
  const [preserveSignature, setPreserveSignature] = useState(true);
  const [isRefactoring, setIsRefactoring] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [result, setResult] = useState(null);

  const refactorGoals = [
    { value: 'optimize performance', label: 'Optimize Performance', description: 'Improve execution speed and efficiency' },
    { value: 'add error handling', label: 'Add Error Handling', description: 'Enhance error handling and validation' },
    { value: 'improve readability', label: 'Improve Readability', description: 'Make code clearer and more maintainable' },
    { value: 'add type safety', label: 'Add Type Safety', description: 'Add comprehensive type hints' },
    { value: 'enhance documentation', label: 'Enhance Documentation', description: 'Add detailed docstrings and comments' },
  ];

  const functionId = selectedNode?.data?.function_id;
  const functionName = functionId?.split('::')[1] || 'Unknown';
  const currentCode = selectedNode?.data?.code || '';
  const modelReady = Boolean(selectedModelId);

  const refactorFunction = async () => {
    if (!functionId || !refactorGoal.trim()) {
      alert('Please select a refactoring goal');
      return;
    }
    if (!modelReady) {
      alert('Please select a model from the main page first');
      return;
    }

    setIsRefactoring(true);
    setResult(null);

    try {
      const data = await requestFunctionRefactor({
        function_id: functionId,
        refactor_goal: refactorGoal.trim(),
        preserve_signature: preserveSignature,
        model_id: selectedModelId || undefined,
        workspace_path: workspacePath || undefined,
      });
      setResult(data);

      if (onRefactored) {
        await onRefactored(data);
      }
    } catch (error) {
      const message = error?.message || 'Refactoring failed';
      const hint = message.includes('Failed to fetch')
        ? ' Make sure the unified backend is running on port 5000.'
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
      alert('Refactored code copied to clipboard');
    }
  };

  const applyRefactoredChanges = async () => {
    if (!result?.generated_code) return;
    if (!onApplyRefactor) {
      onClose?.();
      return;
    }

    setIsApplying(true);
    try {
      await onApplyRefactor({
        functionId,
        generatedCode: result.generated_code,
        modelId: selectedModelId,
        rawResult: result,
      });
      onClose?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown apply error';
      alert(`Failed to apply refactored function: ${message}`);
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;

  if (!functionId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="w-[500px] rounded-lg bg-[#1a1d2b] p-6 shadow-2xl">
          <h2 className="mb-4 text-lg font-semibold text-slate-100">No Function Selected</h2>
          <p className="mb-4 text-sm text-slate-300">Please select a function node from the canvas to refactor it.</p>
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
        <div className="flex items-center justify-between border-b border-[#3a3a4a] p-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">AI Function Refactoring</h2>
            <p className="text-xs text-slate-400">Refactoring: {functionName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-[#2a2d3b] hover:text-slate-200"
          >
            x
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/3 overflow-y-auto border-r border-[#3a3a4a] p-6">
            <div className="space-y-4">
              <div className="rounded-lg bg-[#2a2d3b] p-3">
                <div className="mb-1 text-xs font-medium text-slate-400">Current Function</div>
                <div className="text-sm font-medium text-slate-100">{functionName}</div>
                <div className="mt-1 text-xs text-slate-400">{functionId}</div>
              </div>

              <div className="rounded-lg bg-[#2a2d3b] p-3">
                <div className="mb-1 text-xs font-medium text-slate-400">Selected Model (Main Page)</div>
                <div className="text-sm text-slate-100">{selectedModelId || 'No model selected'}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {isLoadingModels ? 'Loading models...' : `Source: ${modelsSource || 'unknown'}`}
                </div>
                {modelsError ? <div className="mt-1 text-xs text-amber-400">{modelsError}</div> : null}
                <div className="mt-1 text-xs text-slate-500">
                  Available models: {(availableModels || []).length}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Refactoring Goal</label>
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

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Or Enter Custom Goal</label>
                <textarea
                  value={refactorGoal}
                  onChange={(e) => setRefactorGoal(e.target.value)}
                  placeholder="Describe what you want to improve..."
                  className="w-full resize-none rounded-lg border border-[#3a3a4a] bg-[#2a2d3b] p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-[#0f62fe] focus:outline-none"
                  rows={3}
                />
              </div>

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
              </div>

              <button
                onClick={refactorFunction}
                disabled={isRefactoring || !refactorGoal.trim() || !modelReady}
                className="w-full rounded-lg bg-[#0f62fe] py-3 text-sm font-medium text-white hover:bg-[#0353e9] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRefactoring ? 'Refactoring...' : 'Refactor Function'}
              </button>
            </div>
          </div>

          <div className="flex w-2/3 flex-col overflow-hidden">
            {result ? (
              <>
                <div className="border-b border-[#3a3a4a] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-slate-100">
                        {result.success ? 'Refactored Successfully' : 'Refactoring Failed'}
                      </h3>
                      <p className="text-xs text-slate-400">{result.explanation}</p>
                    </div>
                    {result.success ? (
                      <button
                        onClick={copyToClipboard}
                        className="rounded bg-[#2a2d3b] px-3 py-1 text-xs text-slate-300 hover:bg-[#3a3d4b]"
                      >
                        Copy
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  <div className="mb-4">
                    <div className="mb-2 text-xs font-medium text-slate-400">Original Code</div>
                    <pre className="overflow-x-auto rounded-lg bg-[#161616] p-4 text-xs text-slate-100">
                      <code>{currentCode}</code>
                    </pre>
                  </div>

                  {result.generated_code ? (
                    <div className="mb-4">
                      <div className="mb-2 text-xs font-medium text-green-400">Refactored Code</div>
                      <pre className="overflow-x-auto rounded-lg bg-[#161616] p-4 text-xs text-slate-100">
                        <code>{result.generated_code}</code>
                      </pre>
                    </div>
                  ) : null}

                  {result.success ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setResult(null)}
                        className="rounded bg-[#2a2d3b] px-4 py-2 text-sm text-slate-300 hover:bg-[#3a3d4b]"
                      >
                        Try Different Goal
                      </button>
                      <button
                        onClick={applyRefactoredChanges}
                        disabled={isApplying}
                        className="rounded bg-[#0f62fe] px-4 py-2 text-sm text-white hover:bg-[#0353e9] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isApplying ? 'Applying...' : 'Apply Changes'}
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <h3 className="mb-2 text-lg font-medium text-slate-100">Ready to Refactor</h3>
                <p className="mb-4 text-sm text-slate-400">
                  Select a refactoring goal and click the button to improve your function
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
