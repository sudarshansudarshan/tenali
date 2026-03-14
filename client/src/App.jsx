import './App.css'

function App() {
  const host = window.location.hostname
  const protocol = window.location.protocol

  const apps = [
    {
      name: 'General Knowledge',
      subtitle: 'Chitragupta quiz',
      color: 'purple',
      url: `${protocol}//${host}:4001/`,
    },
    {
      name: 'Addition',
      subtitle: '20-question addition practice',
      color: 'blue',
      url: `${protocol}//${host}:4002/`,
    },
    {
      name: 'Square Root',
      subtitle: 'Nearest-integer square root drill',
      color: 'green',
      url: `${protocol}//${host}:4003/`,
    },
  ]

  return (
    <div className="app-shell">
      <div className="card">
        <h1>Tenali</h1>
        <p className="subtitle">Choose a learning game to begin</p>

        <div className="menu-grid">
          {apps.map((app) => (
            <button
              key={app.name}
              className={`menu-card ${app.color}`}
              onClick={() => {
                window.location.href = app.url
              }}
            >
              <span className="menu-title">{app.name}</span>
              <span className="menu-subtitle">{app.subtitle}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App
