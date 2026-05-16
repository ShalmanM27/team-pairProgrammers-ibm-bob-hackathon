import { useCallback, useMemo, useState } from 'react';
import { Background, Controls, MiniMap, ReactFlow, useEdgesState, useNodesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const BRIDGE_BASE_URL = 'http://localhost:5000';

export default function IbmBobApiArchitectCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [mainFilePath, setMainFilePath] = useState('');
  const [loadedFilePath, setLoadedFilePath] = useState('');
  const [status, setStatus] = useState('Enter a main Python file path and click Load Graph.');
  const [selectedNode, setSelectedNode] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const selectedCode = useMemo(() => {
    if (!selectedNode?.data?.code) {
      return '# Click an endpoint or function node to view code.';
    }
    return selectedNode.data.code;
  }, [selectedNode]);

  const loadMainFileGraph = useCallback(async () => {
    const trimmedPath = mainFilePath.trim();
    if (!trimmedPath) {
      setStatus('Error: Main Python file path is required.');
      return;
    }

    setIsLoading(true);
    setStatus('Loading graph from backend...');

    try {
      const response = await fetch(`${BRIDGE_BASE_URL}/api/load-main-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: trimmedPath }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload.detail || `Load failed (HTTP ${response.status})`);
      }

      const payload = await response.json();
      const graphNodes = payload.nodes || [];
      const graphEdges = payload.edges || [];

      setNodes(graphNodes);
      setEdges(graphEdges);
      setSelectedNode(graphNodes[0] || null);
      setLoadedFilePath(payload.main_file_path || trimmedPath);
      setStatus(`Loaded ${graphNodes.length} nodes from ${payload.main_file_path || trimmedPath}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected loading error';
      setStatus(`Error: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }, [mainFilePath, setEdges, setNodes]);

  const onNodeClick = useCallback((_, node) => {
    setSelectedNode(node);
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col bg-[#161616] text-slate-100">
      <header className="border-b border-[#2f2f3d] bg-[#1e1e2e] px-4 py-3">
        <h3 className="text-base font-semibold text-[#0f62fe]">IBM Bob API Architect Canvas Bridge</h3>
        <div className="mt-3 flex items-center gap-2">
          <input
            type="text"
            value={mainFilePath}
            onChange={(event) => setMainFilePath(event.target.value)}
            placeholder="D:/projects/IBM/testing/sample_api.py"
            className="h-9 flex-1 rounded-md border border-[#3a3a4a] bg-[#161b28] px-3 text-sm text-slate-100 outline-none transition focus:border-[#0f62fe]"
          />
          <button
            type="button"
            onClick={loadMainFileGraph}
            disabled={isLoading}
            className="h-9 rounded-md bg-[#0f62fe] px-4 text-sm font-semibold text-white transition hover:bg-[#0353e9] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? 'Loading...' : 'Load Graph'}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">{status}</p>
        {loadedFilePath ? <p className="mt-1 text-xs text-slate-500">{loadedFilePath}</p> : null}
      </header>

      <main className="flex min-h-0 flex-1">
        <section className="min-h-0 flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            fitView
            className="bg-[#161616]"
          >
            <MiniMap
              pannable
              zoomable
              nodeColor={(node) => {
                if (node.data?.kind === 'input') {
                  return '#0f62fe';
                }
                if (node.data?.kind === 'output') {
                  return '#0f62fe';
                }
                return '#697077';
              }}
              maskColor="rgba(12, 12, 16, 0.65)"
              className="!bg-[#1a1d2b]"
            />
            <Controls className="!border-[#3a3a4a] !bg-[#1a1d2b] !text-slate-200" />
            <Background variant="dots" gap={12} size={1} color="#2d3f66" />
          </ReactFlow>
        </section>

        <aside className="w-[420px] border-l border-[#2f2f3d] bg-[#1a1d2b] p-4">
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-slate-100">
              {selectedNode?.data?.title || 'Selected Node'}
            </h4>
            <p className="mt-1 text-xs text-slate-400">{selectedNode?.data?.file || ''}</p>
          </div>

          <pre className="h-[calc(100%-56px)] overflow-auto rounded-md border border-[#3a3a4a] bg-[#10131d] p-3 text-xs leading-relaxed text-slate-200">
            <code>{selectedCode}</code>
          </pre>
        </aside>
      </main>
    </div>
  );
}
