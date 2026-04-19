import { Routes, Route } from "react-router-dom"
import Index from "./pages/Index.tsx"
import Control from "./pages/device/Control.tsx"
import ControlTest from "./pages/device/ControlTest.tsx"
import { SignalRProvider } from "./contexts/SignalRContext.tsx"

export default function App() {
	return (
		<SignalRProvider>
			<Routes>
				<Route path="/" element={<Index />} />
				<Route path="/device/:deviceId/control" element={<Control />} />
				<Route path="/device/:deviceId/control-test" element={<ControlTest />} />
				<Route path="*" element={<h1>404 Not Found</h1>} />
			</Routes>
		</SignalRProvider>
	)
}
