import { Routes, Route } from 'react-router-dom'
import GamepadTest from './pages/GamepadTest.tsx'
import Index from './pages/Index.tsx'
import Basic from './pages/WebRtcTests/Basic.tsx'

export default function App() {
	return (
		<Routes>
			<Route path="/" element={<Index />} />
			<Route path="/gamepad-test" element={<GamepadTest />} />
			<Route path="/web-rtc-tests/basic" element={<Basic />} />
		</Routes>
	)
}
