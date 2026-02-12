import { Routes, Route } from 'react-router-dom'
import GamepadTest from './pages/GamepadTest.tsx'
import Index from './pages/Index.tsx'
import Basic from './pages/WebRtcTests/Basic.tsx'
import Callee from './pages/WebRtcTests/Callee.tsx'
import Caller from './pages/WebRtcTests/Caller.tsx'

export default function App() {
	return (
		<Routes>
			<Route path="/" element={<Index />} />
			<Route path="/gamepad-test" element={<GamepadTest />} />
			<Route path="/web-rtc-tests/basic" element={<Basic />} />
			<Route path="/web-rtc-tests/callee" element={<Callee />} />
			<Route path="/web-rtc-tests/caller" element={<Caller />} />
		</Routes>
	)
}
