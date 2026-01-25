import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Home from './pages/Home'
import NewReport from './pages/NewReport'


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />        
        <Route path="/home" element={<Home />} />
        <Route path="/reports/new" element={<NewReport />} />
      </Routes>
    </BrowserRouter>
  )
}
