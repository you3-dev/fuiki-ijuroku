import { HashRouter } from 'react-router'
import { AppRouter } from './app/AppRouter'
import { GameSessionProvider } from './app/GameSessionProvider'
import { PwaUpdatePrompt } from './app/PwaUpdatePrompt'

function App() {
  return (
    <HashRouter>
      <GameSessionProvider>
        <AppRouter />
        <PwaUpdatePrompt />
      </GameSessionProvider>
    </HashRouter>
  )
}

export default App
