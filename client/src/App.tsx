import { useState } from 'react';
import './App.css';

interface HelloResponse {
  message: string;
  timestamp: string;
}

function App() {
  const [response, setResponse] = useState<HelloResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHello = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('http://localhost:8000/api/hello');
      
      if (!res.ok) {
        throw new Error('Failed to fetch');
      }
      
      const data: HelloResponse = await res.json();
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <h1>Full Stack TypeScript App</h1>
      
      <button onClick={fetchHello} disabled={loading}>
        {loading ? 'Loading...' : 'Call Hello API'}
      </button>

      {error && (
        <div className="error">
          <p>Error: {error}</p>
          <p>Make sure the backend server is running on port 3001</p>
        </div>
      )}

      {response && (
        <div className="response">
          <h2>Response from Backend:</h2>
          <p className="message">{response.message}</p>
          <p className="timestamp">Timestamp: {new Date(response.timestamp).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}

export default App;