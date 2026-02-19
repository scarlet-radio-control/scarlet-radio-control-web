import { Routes, Route } from "react-router-dom"
import GamepadTest from "./pages/GamepadTest.tsx"
import Index from "./pages/Index.tsx"
import Basic from "./pages/WebRtcTests/Basic.tsx"
import TabCallee from "./pages/WebRtcTests/TabCallee.tsx"
import TabCaller from "./pages/WebRtcTests/TabCaller.tsx"
import VideoReceiver from "./pages/WebRtcTests/VideoReceiver.tsx"
import VideoSender from "./pages/WebRtcTests/VideoSender.tsx"
import SignalRVideoReceiver from "./pages/WebRtcTests/SignalRVideoReceiver.tsx"
import SignalRVideoSender from "./pages/WebRtcTests/SignalRVideoSender.tsx"

export default function App() {
	return (
		<Routes>
			<Route path="/" element={<Index />} />
			<Route path="/gamepad-test" element={<GamepadTest />} />
			<Route path="/web-rtc-tests/basic" element={<Basic />} />
			<Route path="/web-rtc-tests/tab-callee" element={<TabCallee />} />
			<Route path="/web-rtc-tests/tab-caller" element={<TabCaller />} />
			<Route path="/web-rtc-tests/signalr-video-receiver" element={<SignalRVideoReceiver roomId="test-room" />} />
			<Route path="/web-rtc-tests/signalr-video-sender" element={<SignalRVideoSender roomId="test-room" />} />
			<Route path="/web-rtc-tests/video-receiver" element={<VideoReceiver />} />
			<Route path="/web-rtc-tests/video-sender" element={<VideoSender />} />
		</Routes>
	)
}
