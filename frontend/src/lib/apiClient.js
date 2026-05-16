const BRIDGE_BASE_URL = 'http://localhost:5000';

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.detail || payload?.message || `HTTP ${response.status}`;
    throw new Error(detail);
  }
  return payload;
}

export async function loadMainFileGraph(path) {
  const response = await fetch(`${BRIDGE_BASE_URL}/api/load-main-file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
  return parseResponse(response);
}

export async function fetchFileContent(path) {
  const url = new URL(`${BRIDGE_BASE_URL}/api/file-content`);
  url.searchParams.set('path', path);
  const response = await fetch(url.toString());
  return parseResponse(response);
}

export async function saveFileContent(path, content) {
  const response = await fetch(`${BRIDGE_BASE_URL}/api/save-file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, content }),
  });
  return parseResponse(response);
}

export async function saveFunctionContent(functionId, content) {
  const response = await fetch(`${BRIDGE_BASE_URL}/api/save-function-content`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ function_id: functionId, content }),
  });
  return parseResponse(response);
}
