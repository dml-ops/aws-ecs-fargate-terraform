import { useEffect, useState } from 'react';

const API_BASE = (typeof window !== 'undefined' && window.API_BASE_URL) || '';

function App() {
  const [url, setUrl] = useState('');
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState('');

  const loadLinks = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/links`);
      if (!res.ok) return;
      const data = await res.json();
      setLinks(data);
    } catch {
      // Silently ignore — the form still works even if the list can't load.
    }
  };

  useEffect(() => {
    loadLinks();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/shorten`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
        return;
      }

      setUrl('');
      await loadLinks();
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (shortUrl, code) => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(''), 1500);
    } catch {
      // Clipboard API may be unavailable (e.g. non-HTTPS); fail quietly.
    }
  };

  return (
    <div className="page">
      <div className="card">
        <h1>Snipp</h1>
        <p className="subtitle">Paste a long link, get a short one.</p>

        <form onSubmit={handleSubmit} className="form">
          <input
            type="text"
            placeholder="https://example.com/a/very/long/path"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Shortening…' : 'Shorten'}
          </button>
        </form>

        {error && <p className="error">{error}</p>}

        <div className="links">
          {links.length === 0 && <p className="empty">No links yet — create your first one above.</p>}
          {links.map((link) => (
            <div className="link-row" key={link.code}>
              <div className="link-info">
                <a href={link.shortUrl} target="_blank" rel="noreferrer" className="short-url">
                  {link.shortUrl}
                </a>
                <span className="target-url" title={link.targetUrl}>
                  {link.targetUrl}
                </span>
              </div>
              <div className="link-meta">
                <span className="clicks">{link.clicks} clicks</span>
                <button className="copy-btn" onClick={() => handleCopy(link.shortUrl, link.code)}>
                  {copiedCode === link.code ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
