import { Routes, Route } from 'react-router-dom'
import Index from './pages/Index.tsx'
import GamepadTest from './pages/GamepadTest.tsx'

export default function App() {
  return (
	<Routes>
		<Route path="/" element={<Index />} />
		<Route path="/gamepad-test" element={<GamepadTest />} />
	</Routes>
  )
}
