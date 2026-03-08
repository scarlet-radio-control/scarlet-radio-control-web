import { Routes, Route } from "react-router-dom"
import GamepadTest from "./pages/GamepadTest.tsx"
import {HubConnectionProvider} from "./context/HubConnectionContext.tsx"
import Index from "./pages/Index.tsx"
import Basic from "./pages/WebRtcTests/Basic.tsx"
import Control from "./pages/device/Control.tsx"
import TabCallee from "./pages/WebRtcTests/TabCallee.tsx"
import TabCaller from "./pages/WebRtcTests/TabCaller.tsx"
import VideoReceiver from "./pages/WebRtcTests/VideoReceiver.tsx"
import SignalRVideoReceiver from "./pages/WebRtcTests/SignalRVideoReceiver.tsx"
import SignalRVideoSender from "./pages/WebRtcTests/SignalRVideoSender.tsx"
import ControlTest from "./pages/device/ControlTest.tsx"

export default function App() {
	return (
		<HubConnectionProvider>
			<Routes>
				<Route path="/" element={<Index />} />
				<Route path="/device/:deviceId/control" element={<Control />} />
				<Route path="/device/:deviceId/control-test" element={<ControlTest />} />
				<Route path="/gamepad-test" element={<GamepadTest />} />
				<Route path="/web-rtc-tests/basic" element={<Basic />} />
				<Route path="/web-rtc-tests/tab-callee" element={<TabCallee />} />
				<Route path="/web-rtc-tests/tab-caller" element={<TabCaller />} />
				<Route path="/web-rtc-tests/signalr-video-receiver" element={<SignalRVideoReceiver roomId="test-room" />} />
				<Route path="/web-rtc-tests/signalr-video-sender" element={<SignalRVideoSender roomId="test-room" />} />
				<Route path="/web-rtc-tests/video-receiver" element={<VideoReceiver />} />
				<Route path="*" element={<h1>404 Not Found</h1>} />
			</Routes>
		</HubConnectionProvider>
	)
}
