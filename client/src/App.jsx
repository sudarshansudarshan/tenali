import './App.css'

function App() {
  const apps = [
    {
      name: 'General Knowledge',
      subtitle: 'Chitragupta quiz',
      color: 'purple',
      url: '/general-knowledge/',
    },
    {
      name: 'Addition',
      subtitle: '20-question addition practice',
      color: 'blue',
      url: '/addition/',
    },
    {
      name: 'Square Root',
      subtitle: 'Nearest-integer square root drill',
      color: 'green',
      url: '/squareroot/',
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
