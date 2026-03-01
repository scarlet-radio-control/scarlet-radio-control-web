import { useEffect, useRef, useState } from "react";
import {
	HubConnection,
	HubConnectionBuilder,
	HubConnectionState,
} from "@microsoft/signalr";

type SignalOffer = RTCSessionDescriptionInit;
type SignalAnswer = RTCSessionDescriptionInit;
type SignalCandidate = RTCIceCandidateInit;

const RTC_CONFIG: RTCConfiguration = {
	iceServers: [
		{
			urls: "stun:stun.relay.metered.ca:80",
		},
		{
			urls: "turn:global.relay.metered.ca:80",
			username: "b6e796d3b6bc333d4bf58b84",
			credential: "xkw2mfGQr0ZAODKl",
		},
		{
			urls: "turn:global.relay.metered.ca:80?transport=tcp",
			username: "b6e796d3b6bc333d4bf58b84",
			credential: "xkw2mfGQr0ZAODKl",
		},
		{
			urls: "turn:global.relay.metered.ca:443",
			username: "b6e796d3b6bc333d4bf58b84",
			credential: "xkw2mfGQr0ZAODKl",
		},
		{
			urls: "turns:global.relay.metered.ca:443?transport=tcp",
			username: "b6e796d3b6bc333d4bf58b84",
			credential: "xkw2mfGQr0ZAODKl",
		},
	],
};

type Props = { roomId: string };

export default function SignalRVideoSender({ roomId }: Props) {
	const localVideoRef = useRef<HTMLVideoElement | null>(null);
	const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

	const connRef = useRef<HubConnection | null>(null);
	const pcRef = useRef<RTCPeerConnection | null>(null);
	const targetIdRef = useRef<string | null>(null);

	const pendingCandidatesRef = useRef<SignalCandidate[]>([]);
	const localStreamRef = useRef<MediaStream | null>(null);

	const [status, setStatus] = useState<
		| "init"
		| "connecting"
		| "waiting"
		| "offer-sent"
		| "answer-sent"
		| "connected"
		| "error"
	>("init");

	const ensurePeerConnection = async (): Promise<RTCPeerConnection> => {
		if (pcRef.current) return pcRef.current;

		const pc = new RTCPeerConnection(RTC_CONFIG);

		pc.onicecandidate = async (e: RTCPeerConnectionIceEvent) => {
			if (!e.candidate) return;
			const conn = connRef.current;
			const targetId = targetIdRef.current;
			if (!conn || conn.state !== HubConnectionState.Connected || !targetId) return;

			// Send ICE candidates as they’re found
			await conn.invoke("SendIceCandidate", roomId, targetId, e.candidate.toJSON());
		};

		pc.ontrack = (e: RTCTrackEvent) => {
			const [remoteStream] = e.streams;
			if (remoteVideoRef.current && remoteStream) {
				remoteVideoRef.current.srcObject = remoteStream;
			}
		};

		pcRef.current = pc;
		return pc;
	};

	const ensureLocalMedia = async (pc: RTCPeerConnection): Promise<MediaStream> => {
		if (localStreamRef.current) return localStreamRef.current;

		const stream = await navigator.mediaDevices.getUserMedia({
			audio: true,
			video: true,
		});

		localStreamRef.current = stream;

		if (localVideoRef.current) localVideoRef.current.srcObject = stream;

		for (const track of stream.getTracks()) {
			pc.addTrack(track, stream);
		}

		return stream;
	};

	const flushPendingCandidates = async (): Promise<void> => {
		const pc = pcRef.current;
		if (!pc?.remoteDescription) return;

		const queued = pendingCandidatesRef.current;
		pendingCandidatesRef.current = [];

		for (const c of queued) {
			// addIceCandidate accepts RTCIceCandidateInit
			await pc.addIceCandidate(c);
		}
	};

	useEffect(() => {
		let stopped = false;

		const run = async () => {
			setStatus("connecting");

			const conn = new HubConnectionBuilder()
				.withUrl("/hubs/web-rtc-hub") // adjust as needed
				.withAutomaticReconnect()
				.build();

			connRef.current = conn;

			// Someone joined the room; we become caller and send an offer to them.
			conn.on("PeerJoined", async (peerConnectionId: string) => {
				if (stopped) return;

				targetIdRef.current = peerConnectionId;

				const pc = await ensurePeerConnection();
				await ensureLocalMedia(pc);

				const offer = await pc.createOffer();
				await pc.setLocalDescription(offer);

				await conn.invoke("SendOffer", roomId, peerConnectionId, offer);
				setStatus("offer-sent");
			});

			// We received an offer; we are callee, send answer.
			conn.on(
				"ReceiveOffer",
				async (fromConnectionId: string, offer: SignalOffer) => {
					if (stopped) return;

					targetIdRef.current = fromConnectionId;

					const pc = await ensurePeerConnection();
					await ensureLocalMedia(pc);

					await pc.setRemoteDescription(offer);

					const answer = await pc.createAnswer();
					await pc.setLocalDescription(answer);

					await conn.invoke("SendAnswer", roomId, fromConnectionId, answer);

					await flushPendingCandidates();
					setStatus("answer-sent");
				}
			);

			// We received an answer; finalize connection.
			conn.on(
				"ReceiveAnswer",
				async (_fromConnectionId: string, answer: SignalAnswer) => {
					if (stopped) return;

					const pc = pcRef.current;
					if (!pc) return;

					await pc.setRemoteDescription(answer);
					await flushPendingCandidates();
					setStatus("connected");
				}
			);

			// We received an ICE candidate.
			conn.on(
				"ReceiveIceCandidate",
				async (_fromConnectionId: string, candidate: SignalCandidate) => {
					if (stopped) return;

					const pc = pcRef.current ?? (await ensurePeerConnection());

					// If remoteDescription isn't set yet, queue candidates.
					if (!pc.remoteDescription) {
						pendingCandidatesRef.current.push(candidate);
						return;
					}

					await pc.addIceCandidate(candidate);
				}
			);

			await conn.start();
			await conn.invoke("JoinRoom", roomId);

			setStatus("waiting");
		};

		run().catch((e) => {
			console.error(e);
			setStatus("error");
		});

		return () => {
			stopped = true;

			// Stop SignalR
			try {
				connRef.current?.stop();
			} catch { }

			// Close RTCPeerConnection
			try {
				pcRef.current?.close();
			} catch { }

			// Stop local tracks (camera/mic)
			try {
				localStreamRef.current?.getTracks().forEach((t) => t.stop());
			} catch { }

			connRef.current = null;
			pcRef.current = null;
			localStreamRef.current = null;
			targetIdRef.current = null;
			pendingCandidatesRef.current = [];
		};
	}, [roomId]);

	return (
		<div>
			<div>Status: {status}</div>
			<div style={{ display: "flex", gap: 12 }}>
				<video ref={localVideoRef} autoPlay playsInline muted style={{ width: 320 }} />
				<video ref={remoteVideoRef} autoPlay playsInline style={{ width: 320 }} />
			</div>
		</div>
	);
}
