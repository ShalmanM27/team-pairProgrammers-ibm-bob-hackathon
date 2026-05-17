import { useState, memo, useContext } from 'react';
import { Handle, Position } from '@xyflow/react';
import { GraphCtx } from '../lib/graphContext';

const KIND = {
  router: {
    color: '#4F8EF7',
    label: 'ROUTER',
    grad: 'linear-gradient(145deg, rgba(79,142,247,0.13) 0%, rgba(79,142,247,0.03) 100%)',
    handleColor: '#4F8EF7',
  },
  function: {
    color: '#B06EF7',
    label: 'FN',
    grad: 'linear-gradient(145deg, rgba(176,110,247,0.13) 0%, rgba(176,110,247,0.03) 100%)',
    handleColor: '#B06EF7',
  },
  input: {
    color: '#2ED8F0',
    label: 'INPUT',
    grad: 'linear-gradient(145deg, rgba(46,216,240,0.13) 0%, rgba(46,216,240,0.03) 100%)',
    handleColor: '#2ED8F0',
  },
  output: {
    color: '#1AE0A0',
    label: 'OUTPUT',
    grad: 'linear-gradient(145deg, rgba(26,224,160,0.13) 0%, rgba(26,224,160,0.03) 100%)',
    handleColor: '#1AE0A0',
  },
  default: {
    color: '#7C7F9A',
    label: 'NODE',
    grad: 'linear-gradient(145deg, rgba(124,127,154,0.10) 0%, rgba(124,127,154,0.03) 100%)',
    handleColor: '#7C7F9A',
  },
};

/* Stable shadow values — set via JS, never via CSS class transforms */
const shadow = {
  base:    '0 2px 10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
  hovered: '0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
  selected:'0 0 0 3px rgba(79,142,247,0.22), 0 6px 24px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)',
};

export const ApiNode = memo(function ApiNode({ id, data, selected, isConnectable }) {
  const [hovered, setHovered] = useState(false);
  const { connectedNodeIds } = useContext(GraphCtx);
  const isConnected = !selected && connectedNodeIds.has(id);

  const kind = data?.kind || 'default';
  const cfg  = KIND[kind] || KIND.default;

  const hasTarget = kind !== 'input';
  const hasSource = kind !== 'output';

  const borderColor = isConnected && !selected
    ? 'rgba(79,142,247,0.55)'
    : selected
      ? `${cfg.color}BB`
      : hovered
        ? `${cfg.color}55`
        : 'rgba(255,255,255,0.07)';

  /* when connected (and not selected), let CSS @keyframes handle box-shadow */
  const boxShadow = (isConnected && !selected)
    ? undefined
    : selected ? shadow.selected : hovered ? shadow.hovered : shadow.base;

  const label = data.title || data.label || 'Unnamed';
  const fileLabel = data.file ? data.file.split('/').slice(-1)[0] : null;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={isConnected ? 'node-connected-glow' : undefined}
      style={{
        position: 'relative',
        minWidth: 200,
        maxWidth: 240,
        background: 'var(--bg-card)',
        backgroundImage: cfg.grad,
        border: `1.5px solid ${borderColor}`,
        borderRadius: 12,
        padding: '10px 14px 10px 18px',
        /* CRITICAL: no transform/size changes in hover — only shadow and border */
        boxShadow,
        borderColor,
        transition: 'box-shadow 160ms ease, border-color 160ms ease',
      }}
    >
      {/* Left accent bar */}
      <div style={{
        position: 'absolute',
        left: 0, top: 7, bottom: 7,
        width: 3,
        borderRadius: '0 3px 3px 0',
        background: `linear-gradient(180deg, ${cfg.color} 0%, ${cfg.color}44 100%)`,
        opacity: selected || hovered ? 1 : 0.6,
        transition: 'opacity 160ms ease',
      }} />

      {/* Kind badge row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        marginBottom: 6,
      }}>
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: cfg.color,
          flexShrink: 0,
          boxShadow: `0 0 6px ${cfg.color}88`,
        }} />
        <span style={{
          fontSize: 8.5, fontWeight: 700, color: cfg.color,
          textTransform: 'uppercase', letterSpacing: '0.12em',
          fontFamily: "'JetBrains Mono', monospace",
          lineHeight: 1,
        }}>
          {cfg.label}
        </span>
      </div>

      {/* Main label */}
      <div style={{
        fontSize: 12.5, fontWeight: 600,
        color: selected ? 'var(--text-primary)' : hovered ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontFamily: "'JetBrains Mono', monospace",
        lineHeight: 1.4,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        transition: 'color 160ms ease',
      }}>
        {label}
      </div>

      {/* File info */}
      {fileLabel && (
        <div style={{
          fontSize: 9.5, color: 'var(--text-muted)',
          fontFamily: "'JetBrains Mono', monospace",
          marginTop: 4,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          lineHeight: 1.4,
        }}>
          {fileLabel}
        </div>
      )}

      {/* Handles — always rendered, never cause hover shifts */}
      {hasTarget && (
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={isConnectable}
          style={{
            width: 8, height: 8,
            background: cfg.handleColor,
            border: '2px solid var(--bg-card)',
            borderRadius: '50%',
            left: -4,
          }}
        />
      )}
      {hasSource && (
        <Handle
          type="source"
          position={Position.Right}
          isConnectable={isConnectable}
          style={{
            width: 8, height: 8,
            background: cfg.handleColor,
            border: '2px solid var(--bg-card)',
            borderRadius: '50%',
            right: -4,
          }}
        />
      )}
    </div>
  );
});
