import { useEffect, useRef, useState } from "react";
import countdown from "../../assets/countdown.mp4";
import { useParams } from "react-router-dom";
import useApiClient from "../../hooks/useApiClient";
import useRtcPeerConnection from "../../hooks/useRtcPeerConnection";
import type { HubConnection } from "@microsoft/signalr";

export default function ControlTest() {
	const [rtcConfiguration, setRtcConfiguration] = useState<RTCConfiguration | null>(null);

	const apiClient = useApiClient();
	const { deviceId } = useParams<{deviceId: string}>();
	const htmlVideElementRefObject = useRef<HTMLVideoElement>(null);
	const hubConnectionRefObject = useRef<HubConnection>(null);
	const rtcIceCandiateInitsRefObject = useRef<RTCIceCandidateInit[]>([]);
	const rtcPeerConnectionRefObject = useRtcPeerConnection(rtcConfiguration);

    const [status, setStatus] = useState<"undefined" | "signalr-connected" | "signalr-error" | "offer-sent" | "connected">("undefined");

    useEffect(() => {
        const useEffectAsync = async () => {
            const rtcConfiguration = await apiClient.current!.api.v1.stun.rtcConfiguration.get();
            setRtcConfiguration(rtcConfiguration as RTCConfiguration);
        }

        useEffectAsync().catch((reason) => {console.error(reason)});
        return () => {};
    }, [deviceId]);

	useEffect(() => {
        const useEffectAsync = async () => {
			const mediaStream = (htmlVideElementRefObject.current as any).captureStream() as MediaStream;
			for (const mediaStreamTrack of mediaStream.getTracks()) {
				rtcPeerConnectionRefObject.current!.addTrack(mediaStreamTrack, mediaStream);
			}

			const localOfferRtcSessionDescriptionInit = await rtcPeerConnectionRefObject.current!.createOffer();
			await rtcPeerConnectionRefObject.current!.setLocalDescription(localOfferRtcSessionDescriptionInit);
			/* SEND OFFER */
        }

        useEffectAsync().catch((reason) => {console.error(reason)});
        return () => {};
	}, [deviceId, rtcConfiguration]);










	type SignalMessage =
		| { type: "offer"; sdp: RTCSessionDescriptionInit }
		| { type: "answer"; sdp: RTCSessionDescriptionInit }
		| { type: "ice"; candidate: RTCIceCandidateInit }
		| { type: "reset" };

	const [started, setStarted] = useState(false);
	const [error, setError] = useState("");

	const pcRef = useRef<RTCPeerConnection | null>(null);
	const localStreamRef = useRef<MediaStream | null>(null);
	const channelRef = useRef<BroadcastChannel | null>(null);

	const remoteDescSetRef = useRef(false);
	const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);

	function ensureChannel() {
		if (!channelRef.current) {
			channelRef.current = new BroadcastChannel("webrtc-demo");
		}
		return channelRef.current;
	}

	function post(msg: SignalMessage) {
		ensureChannel().postMessage(msg);
	}

	async function createPeerConnection() {
		const pc = new RTCPeerConnection({
			iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
		});

		pc.onicecandidate = (e) => {
			if (e.candidate) post({ type: "ice", candidate: e.candidate.toJSON() });
		};

		pc.onconnectionstatechange = () => {
			if (pc.connectionState === "connected") setStatus("connected");
		};

		pcRef.current = pc;
		return pc;
	}

	async function start() {
		setError("");
		if (started) return;

		try {
			const ch = ensureChannel();

			ch.onmessage = async (ev) => {
				const msg = ev.data as SignalMessage;
				const pc = pcRef.current;
				if (!pc) return;

				try {
					if (msg.type === "answer") {
						await pc.setRemoteDescription(msg.sdp);
						remoteDescSetRef.current = true;

						for (const c of pendingIceRef.current) await pc.addIceCandidate(c);
						pendingIceRef.current = [];
						setStatus("connected");
					}

					if (msg.type === "ice") {
						if (remoteDescSetRef.current) {
							await pc.addIceCandidate(msg.candidate);
						} else {
							pendingIceRef.current.push(msg.candidate);
						}
					}

					if (msg.type === "reset") stop();
				} catch (e: any) {
					setError(e?.message || String(e));
				}
			};

			//setStatus("getting-media");
			const stream = (htmlVideElementRefObject.current! as any).captureStream();

			const pc = await createPeerConnection();
			for (const t of stream.getTracks()) pc.addTrack(t, stream);

			//setStatus("creating-offer");
			const offer = await pc.createOffer();
			await pc.setLocalDescription(offer);
			post({ type: "offer", sdp: offer });

			//setStatus("waiting-answer");
			setStarted(true);
		} catch (e: any) {
			setError(e?.message || String(e));
		}
	}

	function stop() {
		remoteDescSetRef.current = false;
		pendingIceRef.current = [];
		setStatus("idle");
		setError("");

		pcRef.current?.close();
		pcRef.current = null;

		if (localStreamRef.current) {
			for (const t of localStreamRef.current.getTracks()) t.stop();
			localStreamRef.current = null;
		}

		if (htmlVideElementRefObject.current) htmlVideElementRefObject.current.srcObject = null;

		setStarted(false);
	}

	function resetBothTabs() {
		post({ type: "reset" });
		stop();
	}

	useEffect(() => {
		return () => {
			channelRef.current?.close();
			channelRef.current = null;
			stop();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<video autoPlay loop muted playsInline ref={htmlVideElementRefObject} src={countdown} style={{height: "80vh", margin: "auto", width: "80vw"}} />
	);
}
