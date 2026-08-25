import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './Layout'
import { DatasetProvider } from './DatasetContext'
import { DisplayProvider } from './DisplayContext'
import Flashcards from '../pages/Flashcards'
import Drills from '../pages/Drills'

export default function App() {
  return (
    <BrowserRouter>
      <DisplayProvider>
        <DatasetProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Navigate to="/drills" replace />} />
              <Route path="/flashcards" element={<Flashcards />} />
              <Route path="/drills" element={<Drills />} />
            </Route>
          </Routes>
        </DatasetProvider>
      </DisplayProvider>
    </BrowserRouter>
  )
}
