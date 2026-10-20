import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './Layout'
import { DatasetProvider } from './DatasetContext'
import { DisplayProvider } from './DisplayContext'
import Flashcards from '../pages/Flashcards'
import Drills from '../pages/Drills'
import Agreement from '../pages/Agreement'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <DisplayProvider>
        <DatasetProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Navigate to="drills" replace />} />
              <Route path="flashcards" element={<Flashcards />} />
              <Route path="drills" element={<Drills />} />
              <Route path="agreement" element={<Agreement />} />
            </Route>
          </Routes>
        </DatasetProvider>
      </DisplayProvider>
    </BrowserRouter>
  )
}
