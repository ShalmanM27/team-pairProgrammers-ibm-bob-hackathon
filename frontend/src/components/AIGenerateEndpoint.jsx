import { useEffect, useState } from 'react';
import { requestEndpointGeneration } from '../lib/apiClient';

const HTTP_METHODS = {
  GET:    { color: '#22c55e', soft: 'rgba(34,197,94,0.13)',  border: 'rgba(34,197,94,0.32)'  },
  POST:   { color: '#0f62fe', soft: 'rgba(15,98,254,0.13)',  border: 'rgba(15,98,254,0.32)'  },
  PUT:    { color: '#f59e0b', soft: 'rgba(245,158,11,0.13)', border: 'rgba(245,158,11,0.32)' },
  DELETE: { color: '#ef4444', soft: 'rgba(239,68,68,0.13)',  border: 'rgba(239,68,68,0.32)'  },
  PATCH:  { color: '#a855f7', soft: 'rgba(168,85,247,0.13)', border: 'rgba(168,85,247,0.32)' },
};

export default function AIGenerateEndpoint({ isOpen, onClose, onGenerated, defaultTargetFile, selectedModelId }) {
  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState('/api/v1/');
  const [description, setDescription] = useState('');
  const [targetFile, setTargetFile] = useState(defaultTargetFile || 'backend/main.py');
  const [includeTests, setIncludeTests] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setTargetFile(defaultTargetFile || 'backend/main.py');
  }, [isOpen, defaultTargetFile]);

  const generateEndpoint = async () => {
    if (!path.trim() || !description.trim()) return;
    setIsGenerating(true);
    setResult(null);
    try {
      const data = await requestEndpointGeneration({
        method,
        path: path.trim(),
        description: description.trim(),
        target_file: targetFile.trim() || null,
        include_tests: includeTests,
        model_id: selectedModelId || undefined,
      });
      setResult(data);
      if (onGenerated) onGenerated(data);
    } catch (error) {
      setResult({ success: false, explanation: `Error: ${error.message}. Make sure the backend is running on port 5000.` });
    } finally {
      setIsGenerating(false);
    }
  };

  const resetForm = () => { setPath('/api/v1/'); setDescription(''); setResult(null); };

  if (!isOpen) return null;

  const ms = HTTP_METHODS[method];

  return (
    <div className="modal-overlay">
      <div className="modal-panel" style={{ width: 900, height: 680, display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{
          padding: '15px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(15,98,254,0.05) 0%, rgba(34,211,238,0.05) 100%)',
            pointerEvents: 'none',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
            <div style={{
              width: 42, height: 42, borderRadius: 14,
              background: 'linear-gradient(135deg, #0f62fe 0%, #22d3ee 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, boxShadow: 'var(--shadow-glow-cyan)', flexShrink: 0,
            }}>
              ✨
            </div>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
                AI Endpoint Generator
              </h2>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Natural language → REST API
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
              transition: 'all var(--transition-fast)', position: 'relative',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-red-soft)'; e.currentTarget.style.color = 'var(--accent-red)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Left panel — form */}
          <div style={{
            width: '44%',
            padding: '18px 20px',
            overflowY: 'auto',
            borderRight: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}>

            {/* HTTP Method picker */}
            <div>
              <Label>HTTP Method</Label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Object.keys(HTTP_METHODS).map((m) => {
                  const s = HTTP_METHODS[m];
                  const active = method === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid',
                        borderColor: active ? s.color : s.border,
                        background: active ? s.color : s.soft,
                        color: active ? '#ffffff' : s.color,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                        transform: active ? 'scale(1.06)' : 'scale(1)',
                        boxShadow: active ? `0 4px 12px ${s.border}` : 'none',
                        letterSpacing: '0.03em',
                      }}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Path */}
            <div>
              <Label>Endpoint Path</Label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{
                  padding: '0 9px', height: 36, lineHeight: '36px',
                  background: ms.soft, color: ms.color,
                  border: `1px solid ${ms.border}`,
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                  letterSpacing: '0.03em',
                }}>
                  {method}
                </span>
                <input
                  type="text"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="/api/v1/users"
                  className="input-base"
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <Label>Description (Natural Language)</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this endpoint should do — inputs, outputs, validation, error cases, business logic…"
                rows={6}
                style={{
                  width: '100%', resize: 'none',
                  background: 'var(--bg-input)', color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
                  padding: '10px 12px', fontSize: 13, lineHeight: 1.55, outline: 'none',
                  fontFamily: 'inherit', transition: 'border-color var(--transition-fast)',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-default)'}
              />
              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                Be specific about inputs, outputs, and error cases.
              </p>
            </div>

            {/* Target file */}
            <div>
              <Label>Target File</Label>
              <input
                type="text"
                value={targetFile}
                onChange={(e) => setTargetFile(e.target.value)}
                placeholder="backend/main.py"
                className="input-base"
                style={{ width: '100%' }}
              />
            </div>

            {/* Options */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeTests}
                onChange={(e) => setIncludeTests(e.target.checked)}
                style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--accent-blue)' }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Generate unit tests</span>
            </label>

            {/* Generate button */}
            <button
              onClick={generateEndpoint}
              disabled={isGenerating || !path.trim() || !description.trim()}
              className="btn-primary"
              style={{
                width: '100%', height: 42, fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              }}
            >
              {isGenerating
                ? <><span className="animate-spin" style={{ fontSize: 14 }}>⟳</span> Generating…</>
                : <><span>✨</span> Generate Endpoint</>
              }
            </button>
          </div>

          {/* Right panel — result */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {result ? (
              <div className="animate-fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Result header */}
                <div style={{
                  padding: '11px 18px',
                  borderBottom: '1px solid var(--border-subtle)',
                  background: result.success ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div>
                    <h3 style={{
                      fontSize: 13, fontWeight: 700, margin: 0,
                      color: result.success ? '#22c55e' : '#ef4444',
                    }}>
                      {result.success ? '✅ Generated Successfully' : '❌ Generation Failed'}
                    </h3>
                    {result.file_path && (
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '2px 0 0', fontFamily: 'monospace' }}>
                        {result.file_path}
                      </p>
                    )}
                  </div>
                  {result.success && (
                    <button
                      onClick={() => navigator.clipboard.writeText(result.generated_code || '')}
                      className="btn-ghost"
                      style={{ height: 28, fontSize: 11 }}
                    >
                      📋 Copy
                    </button>
                  )}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
                  {result.explanation && (
                    <div style={{
                      marginBottom: 14,
                      padding: '10px 14px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                    }}>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                        {result.explanation}
                      </p>
                    </div>
                  )}

                  {result.generated_code && (
                    <div style={{ marginBottom: 14 }}>
                      <SectionLabel>Generated Code</SectionLabel>
                      <div className="code-block" style={{ maxHeight: 260, overflowY: 'auto' }}>
                        <pre style={{ margin: 0 }}><code>{result.generated_code}</code></pre>
                      </div>
                    </div>
                  )}

                  {result.suggestions?.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <SectionLabel color="var(--accent-cyan)">💡 Suggestions</SectionLabel>
                      {result.suggestions.map((s, i) => (
                        <p key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '3px 0' }}>• {s}</p>
                      ))}
                    </div>
                  )}

                  {result.warnings?.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <SectionLabel color="var(--accent-amber)">⚠ Warnings</SectionLabel>
                      {result.warnings.map((w, i) => (
                        <p key={i} style={{ fontSize: 12, color: '#fbbf24', margin: '3px 0' }}>• {w}</p>
                      ))}
                    </div>
                  )}

                  {result.success && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                      <button onClick={resetForm} className="btn-ghost" style={{ height: 36, fontSize: 12 }}>
                        Generate Another
                      </button>
                      <button onClick={onClose} className="btn-primary" style={{ height: 36, fontSize: 12 }}>
                        Done
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
                <div className="animate-float" style={{ fontSize: 58, marginBottom: 18 }}>🎯</div>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600, margin: '0 0 6px' }}>
                  Ready to Generate
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.65 }}>
                  Fill in the form and click<br />
                  <strong style={{ color: 'var(--accent-blue)' }}>Generate Endpoint</strong> to create your API
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Label({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)',
      textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 7,
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children, color }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: color || 'var(--text-muted)',
      textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 7,
    }}>
      {children}
    </div>
  );
}

// Made with Bob
