export default function NotFound() {
  return (
    <html>
      <body>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center',
          height: '100vh',
          textAlign: 'center',
          padding: '0 2rem',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>404 - Page Not Found</h1>
          <p style={{ marginBottom: '1.5rem' }}>The page you are looking for does not exist.</p>
          <a href="/" style={{ color: '#0070f3', textDecoration: 'underline' }}>
            Return to Home
          </a>
        </div>
      </body>
    </html>
  );
}