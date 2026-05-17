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
  theme,
  onToggleTheme,
}) {
  return (
    <header style={{
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'relative',
      zIndex: 10,
      flexShrink: 0,
    }}>
      {/* Animated gradient accent stripe */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: 'var(--gradient-header-stripe)',
        backgroundSize: '300% 100%',
        animation: 'gradientShift 5s ease infinite',
      }} />

      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px 8px' }}>
        {/* Logo + brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #0f62fe 0%, #a855f7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 17,
            boxShadow: 'var(--shadow-glow-blue)',
            flexShrink: 0,
          }}>
            ⚡
          </div>
          <div>
            <h1
              className="gradient-text"
              style={{
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
                margin: 0,
              }}
            >
              IBM Bob API Architect
            </h1>
            <p style={{ fontSize: 9.5, color: 'var(--text-muted)', margin: 0, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Canvas Bridge
            </p>
          </div>
        </div>

        {/* Separator */}
        <div style={{ width: 1, height: 28, background: 'var(--border-subtle)', flexShrink: 0 }} />

        {/* Path / URL input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
          <input
            type="text"
            value={mainFilePath}
            onChange={(e) => onMainFilePathChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onLoadGraph()}
            placeholder="/path/to/main.py  ·  https://github.com/user/repo"
            className="input-base"
            style={{ flex: 1 }}
          />
          <button
            type="button"
            onClick={onLoadGraph}
            disabled={isLoading}
            className="btn-primary"
            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, height: 36 }}
          >
            {isLoading
              ? <><span className="animate-spin" style={{ fontSize: 13 }}>⟳</span> Loading…</>
              : <><span style={{ fontSize: 11 }}>◉</span> Load Graph</>
            }
          </button>
        </div>

        {/* Separator */}
        <div style={{ width: 1, height: 28, background: 'var(--border-subtle)', flexShrink: 0 }} />

        {/* Node controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <input
            type="text"
            value={newNodeLabel}
            onChange={(e) => onNewNodeLabelChange(e.target.value)}
            placeholder="Label"
            className="input-base"
            style={{ width: 108 }}
          />
          <select
            value={newNodeKind}
            onChange={(e) => onNewNodeKindChange(e.target.value)}
            style={{
              height: 36,
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              padding: '0 8px',
              fontSize: 12,
              outline: 'none',
              cursor: 'pointer',
              minWidth: 90,
            }}
          >
            <option value="router">Router</option>
            <option value="function">Function</option>
            <option value="input">Input</option>
            <option value="output">Output</option>
            <option value="default">Default</option>
          </select>

          <button type="button" onClick={onAddNode}
            className="btn-ghost"
            style={{ height: 36, fontSize: 12, padding: '0 10px' }}
          >
            + Add
          </button>

          <button
            type="button"
            onClick={onQuickAddRouter}
            style={{
              height: 36,
              padding: '0 10px',
              background: 'var(--accent-blue-soft)',
              border: '1px solid var(--border-accent)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--accent-blue)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(15,98,254,0.22)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent-blue-soft)'; }}
          >
            + Router
          </button>

          <button
            type="button"
            onClick={onDeleteSelectedNode}
            disabled={!hasSelectedNode}
            style={{
              height: 36,
              padding: '0 10px',
              background: hasSelectedNode ? 'var(--accent-red-soft)' : 'transparent',
              border: '1px solid',
              borderColor: hasSelectedNode ? 'rgba(239,68,68,0.3)' : 'var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: hasSelectedNode ? 'var(--accent-red)' : 'var(--text-muted)',
              fontSize: 12,
              cursor: hasSelectedNode ? 'pointer' : 'not-allowed',
              transition: 'all var(--transition-fast)',
              opacity: hasSelectedNode ? 1 : 0.5,
            }}
          >
            Delete
          </button>
        </div>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: 16,
            transition: 'all var(--transition-fast)',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.borderColor = 'var(--border-default)'; }}
        >
          {theme === 'dark' ? '☀' : '🌙'}
        </button>
      </div>

      {/* AI features row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 14px',
        background: 'var(--accent-blue-soft)',
        borderTop: '1px solid var(--border-accent)',
      }}>
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--accent-blue)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          flexShrink: 0,
        }}>
          ✦ AI
        </span>

        <select
          value={selectedModelId}
          onChange={(e) => onSelectedModelIdChange?.(e.target.value)}
          disabled={isLoadingModels || !(availableModels || []).length}
          style={{
            flex: 1,
            maxWidth: 264,
            height: 28,
            background: 'var(--bg-input)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            padding: '0 8px',
            fontSize: 11,
            outline: 'none',
            cursor: 'pointer',
          }}
          title="Active AI model"
        >
          {(availableModels || []).map((id) => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>

        {[
          { label: '💬 Chat',            onClick: onOpenChatbot,           disabled: false },
          { label: '✨ Generate',         onClick: onOpenGenerateEndpoint,  disabled: false },
          { label: '🔧 Refactor',         onClick: onOpenRefactorFunction,  disabled: !hasSelectedNode },
        ].map(({ label, onClick, disabled }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            disabled={disabled}
            style={{
              height: 28,
              padding: '0 10px',
              background: disabled ? 'transparent' : 'rgba(15,98,254,0.14)',
              border: '1px solid',
              borderColor: disabled ? 'var(--border-subtle)' : 'rgba(15,98,254,0.32)',
              borderRadius: 'var(--radius-sm)',
              color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
              fontSize: 11,
              fontWeight: 500,
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all var(--transition-fast)',
              flexShrink: 0,
              opacity: disabled ? 0.45 : 1,
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              if (!disabled) e.currentTarget.style.background = 'rgba(15,98,254,0.24)';
            }}
            onMouseLeave={(e) => {
              if (!disabled) e.currentTarget.style.background = 'rgba(15,98,254,0.14)';
            }}
          >
            {label}
          </button>
        ))}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            className="animate-status-pulse"
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: isLoading ? 'var(--accent-amber)' : 'var(--accent-green)',
              flexShrink: 0,
            }}
          />
          <span style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            maxWidth: 320,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {status}
          </span>
          {loadedFilePath && (
            <span style={{
              fontSize: 10,
              color: 'var(--text-muted)',
              maxWidth: 200,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              borderLeft: '1px solid var(--border-subtle)',
              paddingLeft: 6,
              fontFamily: 'monospace',
            }}>
              {loadedFilePath}
            </span>
          )}
          {modelsError && (
            <span style={{ fontSize: 10, color: 'var(--accent-amber)', flexShrink: 0 }}>⚠ fallback</span>
          )}
        </div>
      </div>
    </header>
  );
}
