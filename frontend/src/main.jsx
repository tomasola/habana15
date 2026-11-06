import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './themes.css'
import './megaluxury.css'
import App from './App.jsx'
import EntranceTablet from './components/EntranceTablet.jsx'

const isEntrada = window.location.pathname === '/entrada';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isEntrada ? <EntranceTablet /> : <App />}
  </StrictMode>,
)
