import { useCallback, useRef, useState } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import CodeSidebar from './components/CodeSidebar';
import TopBar from './components/TopBar';
import { loadMainFileGraph, saveFunctionContent } from './lib/apiClient';

export default function IbmBobApiArchitectCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const nodeIdCounterRef = useRef(1);

  const [mainFilePath, setMainFilePath] = useState('');
  const [newNodeLabel, setNewNodeLabel] = useState('Router Node');
  const [newNodeKind, setNewNodeKind] = useState('router');
  const [loadedFilePath, setLoadedFilePath] = useState('');
  const [status, setStatus] = useState('Enter a main Python file path and click Load Graph.');
  const [selectedNode, setSelectedNode] = useState(null);
  const [functionCode, setFunctionCode] = useState('');
  const [activeFunctionId, setActiveFunctionId] = useState('');
  const [syntaxErrors, setSyntaxErrors] = useState([]);

  const [isLoadingGraph, setIsLoadingGraph] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const createNodeVisual = useCallback((kind, label) => {
    if (kind === 'input') {
      return {
        type: 'input',
        style: {
          background: '#1f2433',
          color: '#f4f4f4',
          border: '1px solid #0f62fe',
          borderRadius: 10,
          padding: 10,
          width: 240,
        },
      };
    }
    if (kind === 'output') {
      return {
        type: 'output',
        style: {
          background: '#1f2433',
          color: '#f4f4f4',
          border: '1px solid #0f62fe',
          borderRadius: 10,
          padding: 10,
          width: 240,
        },
      };
    }
    if (kind === 'router') {
      return {
        type: 'default',
        style: {
          background: '#1f2433',
          color: '#f4f4f4',
          border: '1px solid #0f62fe',
          borderRadius: 10,
          padding: 10,
          width: 240,
        },
        defaultLabel: label || 'Express Router',
      };
    }
    if (kind === 'function') {
      return {
        type: 'default',
        style: {
          background: '#20202f',
          color: '#f4f4f4',
          border: '1px solid #39394c',
          borderRadius: 10,
          padding: 10,
          width: 240,
        },
      };
    }
    return {
      type: 'default',
      style: {
        background: '#20202f',
        color: '#f4f4f4',
        border: '1px solid #39394c',
        borderRadius: 10,
        padding: 10,
        width: 240,
      },
    };
  }, []);

  const getNodePosition = useCallback(() => {
    if (selectedNode?.position) {
      return {
        x: selectedNode.position.x + 260,
        y: selectedNode.position.y + 40,
      };
    }

    const index = nodes.length;
    const col = index % 5;
    const row = Math.floor(index / 5);
    return {
      x: 80 + col * 250,
      y: 90 + row * 140,
    };
  }, [nodes.length, selectedNode]);

  const onConnect = useCallback(
    (connection) => {
      setEdges((currentEdges) =>
        addEdge(
          {
            ...connection,
            animated: true,
            style: { stroke: '#0f62fe' },
          },
          currentEdges,
        ),
      );
    },
    [setEdges],
  );

  const addManualNode = useCallback(
    (requestedKind, requestedLabel) => {
      const kind = requestedKind || newNodeKind;
      const rawLabel = (requestedLabel ?? newNodeLabel).trim();
      const visual = createNodeVisual(kind, rawLabel);
      const label = visual.defaultLabel || rawLabel || 'New Node';
      const nodeId = `manual-${Date.now()}-${nodeIdCounterRef.current++}`;
      const position = getNodePosition();

      const newNode = {
        id: nodeId,
        type: visual.type,
        position,
        data: {
          label,
          kind,
          title: label,
          file: '',
          function_id: '',
          code: kind === 'function' ? `def ${label.replace(/\s+/g, '_').toLowerCase()}():\n    pass` : '',
        },
        style: visual.style,
      };

      setNodes((currentNodes) => [...currentNodes, newNode]);
      setStatus(`Added ${kind} node: ${label}`);
    },
    [createNodeVisual, getNodePosition, newNodeKind, newNodeLabel, setNodes],
  );

  const addQuickRouter = useCallback(() => {
    addManualNode('router', 'Express Router');
  }, [addManualNode]);

  const deleteSelectedNode = useCallback(() => {
    if (!selectedNode?.id) {
      return;
    }
    const selectedId = selectedNode.id;
    setNodes((currentNodes) => currentNodes.filter((node) => node.id !== selectedId));
    setEdges((currentEdges) =>
      currentEdges.filter((edge) => edge.source !== selectedId && edge.target !== selectedId),
    );
    setSelectedNode(null);
    setFunctionCode('');
    setActiveFunctionId('');
    setStatus('Deleted selected node.');
  }, [selectedNode, setEdges, setNodes]);

  const applyGraphPayload = useCallback(
    (graphPayload, nextStatus) => {
      const graphNodes = graphPayload?.nodes || [];
      const graphEdges = graphPayload?.edges || [];

      setNodes(graphNodes);
      setEdges(graphEdges);
      setSelectedNode((currentNode) => {
        if (currentNode?.id) {
          const retainedNode = graphNodes.find((node) => node.id === currentNode.id);
          if (retainedNode) {
            return retainedNode;
          }
        }
        return graphNodes[0] || null;
      });

      if (nextStatus) {
        setStatus(nextStatus);
      }
    },
    [setEdges, setNodes],
  );

  const loadGraph = useCallback(async () => {
    const trimmedPath = mainFilePath.trim();
    if (!trimmedPath) {
      setStatus('Error: Main Python file path is required.');
      return;
    }

    setIsLoadingGraph(true);
    setStatus('Loading graph from backend...');

    try {
      const payload = await loadMainFileGraph(trimmedPath);
      applyGraphPayload(payload, `Loaded ${payload.nodes?.length || 0} nodes from ${payload.main_file_path || trimmedPath}`);
      setLoadedFilePath(payload.main_file_path || trimmedPath);
      setSyntaxErrors([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected loading error';
      setStatus(`Error: ${message}`);
    } finally {
      setIsLoadingGraph(false);
    }
  }, [applyGraphPayload, mainFilePath]);

  const onNodeClick = useCallback((_, node) => {
    setSelectedNode(node);
    if (node?.data?.kind === 'function') {
      setFunctionCode(node?.data?.code || '');
      setActiveFunctionId(node?.data?.function_id || '');
    } else {
      setFunctionCode('');
      setActiveFunctionId('');
    }
  }, []);

  const saveCurrentFunction = useCallback(async () => {
    if (!activeFunctionId) {
      setStatus('Error: Select a function node before saving.');
      return;
    }

    setIsSaving(true);
    setStatus('Saving function content...');

    try {
      const payload = await saveFunctionContent(activeFunctionId, functionCode);
      const returnedErrors = payload.syntax_errors || [];
      setSyntaxErrors(returnedErrors);

      if (payload.has_syntax_errors) {
        setStatus(`Saved with ${returnedErrors.length} syntax error(s).`);
        return;
      }

      if (payload.graph) {
        applyGraphPayload(payload.graph, 'Function saved and graph refreshed.');
        const refreshedNode = payload.graph.nodes?.find(
          (node) => node?.data?.function_id === activeFunctionId,
        );
        if (refreshedNode) {
          setSelectedNode(refreshedNode);
          setFunctionCode(refreshedNode?.data?.code || '');
        }
      } else {
        setStatus('Function saved.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected save error';
      setStatus(`Error: ${message}`);
    } finally {
      setIsSaving(false);
    }
  }, [activeFunctionId, applyGraphPayload, functionCode]);

  const isFunctionNode = selectedNode?.data?.kind === 'function';
  const canSaveFunction = isFunctionNode && Boolean(selectedNode?.data?.function_id);

  return (
    <div className="flex h-screen w-screen flex-col bg-[#161616] text-slate-100">
      <TopBar
        mainFilePath={mainFilePath}
        onMainFilePathChange={setMainFilePath}
        onLoadGraph={loadGraph}
        newNodeLabel={newNodeLabel}
        onNewNodeLabelChange={setNewNodeLabel}
        newNodeKind={newNodeKind}
        onNewNodeKindChange={setNewNodeKind}
        onAddNode={() => addManualNode()}
        onQuickAddRouter={addQuickRouter}
        onDeleteSelectedNode={deleteSelectedNode}
        hasSelectedNode={Boolean(selectedNode?.id)}
        isLoading={isLoadingGraph}
        status={status}
        loadedFilePath={loadedFilePath}
      />

      <main className="flex min-h-0 flex-1">
        <section className="min-h-0 flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            connectionLineStyle={{ stroke: '#0f62fe' }}
            defaultEdgeOptions={{ animated: true, style: { stroke: '#0f62fe' } }}
            snapToGrid
            snapGrid={[20, 20]}
            fitView
            className="bg-[#161616]"
          >
            <MiniMap
              pannable
              zoomable
              nodeColor={(node) => {
                if (
                  node.data?.kind === 'input' ||
                  node.data?.kind === 'output' ||
                  node.data?.kind === 'router'
                ) {
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

        <CodeSidebar
          selectedTitle={selectedNode?.data?.title}
          filePath={selectedNode?.data?.file || ''}
          functionCode={functionCode}
          onFunctionCodeChange={setFunctionCode}
          onSaveFunction={saveCurrentFunction}
          isSaving={isSaving}
          isFunctionNode={canSaveFunction}
          syntaxErrors={syntaxErrors}
        />
      </main>
    </div>
  );
}
