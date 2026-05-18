export default function LeftPanel({
  mainFilePath,
  onMainFilePathChange,
  onLoadGraph,
  isLoading,
  loadedFilePath,
  newNodeLabel,
  onNewNodeLabelChange,
  newNodeKind,
  onNewNodeKindChange,
  onAddNode,
  onQuickAddRouter,
  onDeleteSelectedNode,
  hasSelectedNode,
  availableModels,
  selectedModelId,
  onSelectedModelIdChange,
  isLoadingModels,
  modelsError,
  onOpenChatbot,
  onOpenGenerateEndpoint,
  onOpenRefactorFunction,
  status,
  theme,
  onToggleTheme,
  mode,
  canEdit,
  onBack,
}) {
  const isGitHub    = mode === 'github';
  const accentColor = isGitHub ? '#22d3ee' : '#6366f1';
  const accentGrad  = isGitHub
    ? 'linear-gradient(135deg, #0f62fe 0%, #22d3ee 100%)'
    : 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)';

  return (
    <aside style={{
      width: 296,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-subtle)',
      flexShrink: 0,
      overflow: 'hidden',
    }}>

      {/* ── Brand header ── */}
      <div style={{
        padding: '14px 18px 12px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-card)',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Mode-colored top stripe */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: accentGrad,
        }} />

        {/* Back link */}
        {onBack && (
          <button
            onClick={onBack}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              marginBottom: 10,
              background: 'transparent', border: 'none',
              color: 'var(--text-muted)', fontSize: 11, fontWeight: 500,
              cursor: 'pointer', padding: 0,
              transition: 'color var(--transition-fast)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            ← Back to Home
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo + wordmark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: accentGrad,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 17, flexShrink: 0,
              boxShadow: `0 0 12px ${accentColor}35`,
            }}>
              ⚡
            </div>
            <div>
              <div className="gradient-text" style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                Bobcat
              </div>
            </div>
          </div>

          {/* Mode badge + theme toggle */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <span style={{
              fontSize: 9, fontWeight: 800,
              padding: '2px 8px', borderRadius: 100,
              background: accentColor + '18',
              border: `1px solid ${accentColor}44`,
              color: accentColor,
              textTransform: 'uppercase', letterSpacing: '0.07em',
            }}>
              {isGitHub ? 'GitHub' : 'Local'}
            </span>
            <button
              onClick={onToggleTheme}
              style={{
                width: 26, height: 26, borderRadius: 7,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 12,
                transition: 'all var(--transition-fast)',
              }}
            >
              {theme === 'dark' ? '☀' : '●'}
            </button>
          </div>
        </div>

        {/* View-only notice (GitHub only) */}
        {isGitHub && (
          <div style={{
            marginTop: 12,
            padding: '8px 12px',
            borderRadius: 8,
            background: 'rgba(34,211,238,0.07)',
            border: '1px solid rgba(34,211,238,0.18)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#22d3ee', marginBottom: 2 }}>
              View Only
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.55 }}>
              AI analysis available. Source edits cannot be saved to GitHub.
            </div>
          </div>
        )}
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* ── CODEBASE section ── */}
        <Section label="Codebase">
          <textarea
            value={mainFilePath}
            onChange={(e) => onMainFilePathChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onLoadGraph(); } }}
            placeholder={isGitHub ? 'https://github.com/user/repository' : '/path/to/project/main.py'}
            rows={2}
            style={{
              width: '100%', resize: 'none',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: 12, lineHeight: 1.5, outline: 'none',
              fontFamily: "'IBM Plex Mono', Consolas, monospace",
              transition: 'border-color var(--transition-fast)',
            }}
            onFocus={(e) => e.target.style.borderColor = accentColor}
            onBlur={(e)  => e.target.style.borderColor = 'var(--border-default)'}
          />

          <button
            type="button"
            onClick={onLoadGraph}
            disabled={isLoading}
            style={{
              width: '100%', height: 42, marginTop: 8,
              borderRadius: 8,
              background: isLoading ? 'var(--bg-elevated)' : accentGrad,
              color: '#fff', border: 'none',
              fontSize: 13, fontWeight: 700, letterSpacing: '0.01em',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              boxShadow: isLoading ? 'none' : `0 4px 14px ${accentColor}28`,
              transition: 'opacity var(--transition-fast), box-shadow var(--transition-fast)',
              opacity: isLoading ? 0.65 : 1,
            }}
            onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.boxShadow = `0 6px 20px ${accentColor}44`; }}
            onMouseLeave={(e) => { if (!isLoading) e.currentTarget.style.boxShadow = `0 4px 14px ${accentColor}28`; }}
          >
            {isLoading
              ? <><span className="animate-spin" style={{ fontSize: 14 }}>⟳</span> Analyzing…</>
              : 'Load Graph'
            }
          </button>

          {loadedFilePath && (
            <div className="animate-fade-in" style={{
              marginTop: 8, padding: '6px 10px',
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: 6,
              fontSize: 10.5, color: '#22c55e', fontFamily: 'monospace',
              display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden',
            }}>
              <span style={{ flexShrink: 0 }}>✓</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {loadedFilePath}
              </span>
            </div>
          )}
        </Section>

        {/* ── GRAPH section ── */}
        <Section label="Graph Controls">
          <div style={{ display: 'flex', gap: 6, marginBottom: 7 }}>
            <input
              type="text"
              value={newNodeLabel}
              onChange={(e) => onNewNodeLabelChange(e.target.value)}
              placeholder="Node label"
              style={{
                flex: 1, height: 32,
                background: 'var(--bg-input)', color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
                borderRadius: 6, padding: '0 10px',
                fontSize: 12, outline: 'none',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue)'}
              onBlur={(e)  => e.target.style.borderColor = 'var(--border-default)'}
            />
            <select
              value={newNodeKind}
              onChange={(e) => onNewNodeKindChange(e.target.value)}
              style={{
                height: 32, width: 84,
                background: 'var(--bg-input)', color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
                borderRadius: 6, padding: '0 6px',
                fontSize: 11, outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="router">Router</option>
              <option value="function">Function</option>
              <option value="input">Input</option>
              <option value="output">Output</option>
              <option value="default">Default</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <SmallBtn onClick={onAddNode}            color="#0f62fe"               flex>+ Add Node</SmallBtn>
            <SmallBtn onClick={onQuickAddRouter}     color="#6366f1"               flex>+ Router</SmallBtn>
            <SmallBtn onClick={onDeleteSelectedNode} color="#ef4444" disabled={!hasSelectedNode}>Del</SmallBtn>
          </div>
        </Section>

        {/* ── AI section ── */}
        <Section label="AI Assistant" accent>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>
              Model
            </label>
            <select
              value={selectedModelId}
              onChange={(e) => onSelectedModelIdChange?.(e.target.value)}
              disabled={isLoadingModels || !(availableModels || []).length}
              style={{
                width: '100%', height: 32,
                background: 'var(--bg-input)', color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
                borderRadius: 6, padding: '0 8px',
                fontSize: 11, outline: 'none', cursor: 'pointer',
              }}
            >
              {(availableModels || []).map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
            {modelsError && (
              <div style={{ fontSize: 10, color: 'var(--accent-amber)', marginTop: 4 }}>
                Using fallback model list
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <AIBtn onClick={onOpenChatbot} color="#0f62fe">Chat</AIBtn>
            <AIBtn onClick={onOpenGenerateEndpoint} color="#22d3ee">Generate Endpoint</AIBtn>
            <AIBtn
              onClick={onOpenRefactorFunction}
              color="#a855f7"
              disabled={!hasSelectedNode || !canEdit}
              note={!canEdit ? 'View only' : !hasSelectedNode ? 'Select a node' : null}
            >
              Refactor Function
            </AIBtn>
          </div>
        </Section>
      </div>

      {/* ── Status footer ── */}
      <div style={{
        padding: '8px 16px',
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-card)',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 7,
      }}>
        <span
          className="animate-status-pulse"
          style={{
            width: 6, height: 6, borderRadius: '50%',
            background: isLoading ? 'var(--accent-amber)' : 'var(--accent-green)',
            flexShrink: 0, display: 'inline-block',
          }}
        />
        <span style={{
          fontSize: 10, color: 'var(--text-muted)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {status}
        </span>
      </div>
    </aside>
  );
}

// ── Section divider ──
function Section({ label, children, accent }) {
  return (
    <div style={{
      padding: '20px 18px',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div style={{
        fontSize: 9.5, fontWeight: 700, letterSpacing: '0.09em',
        textTransform: 'uppercase',
        color: accent ? 'var(--accent-blue)' : 'var(--text-muted)',
        marginBottom: 14,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {label}
        <div style={{ flex: 1, height: 1, background: accent ? 'var(--border-accent)' : 'var(--border-subtle)' }} />
      </div>
      {children}
    </div>
  );
}

// ── Small inline button ──
function SmallBtn({ children, onClick, color, disabled, flex }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 30,
        flex: flex ? 1 : undefined,
        padding: '0 10px',
        borderRadius: 6,
        background: disabled ? 'transparent' : color + '14',
        border: '1px solid',
        borderColor: disabled ? 'var(--border-subtle)' : color + '42',
        color: disabled ? 'var(--text-muted)' : color,
        fontSize: 11, fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all var(--transition-fast)',
        opacity: disabled ? 0.38 : 1,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

// ── AI feature button ──
function AIBtn({ children, onClick, color, disabled, note }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%', height: 38,
        borderRadius: 8,
        background: disabled ? 'transparent' : color + '0e',
        border: '1px solid',
        borderColor: disabled ? 'var(--border-subtle)' : color + '32',
        color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
        fontSize: 12.5, fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px',
        transition: 'all var(--transition-fast)',
        opacity: disabled ? 0.46 : 1,
        textAlign: 'left',
      }}
      onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.background = color + '1c'; e.currentTarget.style.borderColor = color + '55'; } }}
      onMouseLeave={(e) => { if (!disabled) { e.currentTarget.style.background = color + '0e'; e.currentTarget.style.borderColor = color + '32'; } }}
    >
      <span>{children}</span>
      {note && <span style={{ fontSize: 9.5, color: 'var(--text-muted)', fontWeight: 400 }}>{note}</span>}
    </button>
  );
}
