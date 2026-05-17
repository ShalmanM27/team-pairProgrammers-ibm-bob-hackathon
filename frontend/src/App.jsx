import { useState } from 'react';
import HomePage from './pages/HomePage';
import IbmBobApiArchitectCanvas from './IbmBobApiArchitectCanvas';

export default function App() {
  const [page, setPage] = useState('home');
  const [mode, setMode] = useState('local');     // 'github' | 'local'
  const [initialPath, setInitialPath] = useState('');
  const [theme, setTheme] = useState('light');

  const goToWorkspace = (newMode, path) => {
    setMode(newMode);
    setInitialPath(path);
    setPage('workspace');
  };

  const goHome = () => setPage('home');
  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  if (page === 'workspace') {
    return (
      <IbmBobApiArchitectCanvas
        mode={mode}
        initialPath={initialPath}
        onBack={goHome}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return <HomePage onLaunch={goToWorkspace} theme={theme} onToggleTheme={toggleTheme} />;
}
