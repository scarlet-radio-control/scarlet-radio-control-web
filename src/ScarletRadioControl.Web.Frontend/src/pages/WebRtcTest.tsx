import { useEffect, useRef, useState } from "react";

export default function GamepadTest() {
	const localVideoRef = useRef<HTMLVideoElement | null>(null);
	const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

	const [started, setStarted] = useState(false);
  	const [error, setError] = useState("");

	const pc1Ref = useRef<RTCPeerConnection | null>(null); // "caller"
	const pc2Ref = useRef<RTCPeerConnection | null>(null); // "callee"
	const localStreamRef = useRef<MediaStream | null>(null);

	async function start() {
		setError("");

		try {
			// 1) Get camera/mic
			const stream = await navigator.mediaDevices.getUserMedia({
				video: true,
				audio: true,
			});
	  		localStreamRef.current = stream;
			if (localVideoRef.current) localVideoRef.current.srcObject = stream;

			// 2) Create two peer connections (loopback in same tab)
			const pc1 = new RTCPeerConnection();
			const pc2 = new RTCPeerConnection();
			pc1Ref.current = pc1;
			pc2Ref.current = pc2;

			// 3) ICE candidate exchange
			pc1.onicecandidate = (e) => {
				if (e.candidate) pc2.addIceCandidate(e.candidate).catch(console.error);
			};
			pc2.onicecandidate = (e) => {
				if (e.candidate) pc1.addIceCandidate(e.candidate).catch(console.error);
			};

			// 4) Remote track handling
			pc2.ontrack = (e) => {
				// e.streams[0] is the remote MediaStream
				if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
			};

			// 5) Add local tracks to pc1
			for (const track of stream.getTracks()) {
				pc1.addTrack(track, stream);
			}

			// 6) Offer/answer handshake
			const offer = await pc1.createOffer();
			await pc1.setLocalDescription(offer);
			await pc2.setRemoteDescription(offer);

			const answer = await pc2.createAnswer();
			await pc2.setLocalDescription(answer);
			await pc1.setRemoteDescription(answer);

	  		setStarted(true);
		} catch (err: any) {
	  		setError(err?.message || String(err));
	  		console.error(err);
		}
	}

	function stop() {
		setError("");

		// Close peer connections
		pc1Ref.current?.close();
		pc2Ref.current?.close();
		pc1Ref.current = null;
		pc2Ref.current = null;

		// Stop media tracks
		if (localStreamRef.current) {
			for (const t of localStreamRef.current.getTracks()) t.stop();
			localStreamRef.current = null;
		}

		// Clear video elements
		if (localVideoRef.current) localVideoRef.current.srcObject = null;
		if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

		setStarted(false);
  	}

	// Cleanup on unmount
	useEffect(() => {
		return () => stop();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div style={{ fontFamily: "system-ui", padding: 16, maxWidth: 900 }}>
	  		<h2>React + WebRTC loopback</h2>

	  		<div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
				<div>
		  			<div>Local</div>
					<video
						ref={localVideoRef}
						autoPlay
						playsInline
						muted
						style={{ width: 420, background: "#111" }}
					/>
				</div>

				<div>
		  			<div>Remote</div>
					<video
						ref={remoteVideoRef}
						autoPlay
						playsInline
						style={{ width: 420, background: "#111" }}
					/>
				</div>
	  		</div>

	  		<div style={{ marginTop: 12, display: "flex", gap: 8 }}>
				<button onClick={start} disabled={started}>Start</button>
				<button onClick={stop} disabled={!started}>Stop</button>
	  		</div>

			{error && (
				<pre style={{ marginTop: 12, color: "crimson", whiteSpace: "pre-wrap" }}>
				{error}
				</pre>
			)}

			<p style={{ marginTop: 12, color: "#444" }}>
				Notes: Remote video is what pc2 receives from pc1. This is a single-tab loopback to
				demonstrate offer/answer + ICE + tracks without a signaling server.
			</p>
		</div>
	);
}
