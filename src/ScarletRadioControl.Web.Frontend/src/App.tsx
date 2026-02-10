import { Routes, Route } from 'react-router-dom'
import GamepadTest from './pages/GamepadTest.tsx'
import Index from './pages/Index.tsx'
import WebRtcTest from './pages/WebRtcTest.tsx'

export default function App() {
	return (
		<Routes>
			<Route path="/" element={<Index />} />
			<Route path="/gamepad-test" element={<GamepadTest />} />
			<Route path="/web-rtc-test" element={<WebRtcTest />} />
		</Routes>
	)
}
