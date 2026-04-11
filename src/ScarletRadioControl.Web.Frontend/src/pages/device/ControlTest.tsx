import { HubConnectionState } from "@microsoft/signalr";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import countdown from "../../assets/countdown.mp4";
import { useSignalRContext } from "../../contexts/SignalRContext";
import useApiClient from "../../hooks/useApiClient";
import useRtcPeerConnection from "../../hooks/useRtcPeerConnection";

type Status = "loading" | "ready" | "connecting" | "waiting-for-receiver" | "offer-sent" | "connected" | "error";

export default function ControlTest() {
	const apiClient = useApiClient();
	const { deviceId } = useParams<{ deviceId: string }>();
	const { connected, hubConnection } = useSignalRContext();

	const [rtcConfiguration, setRtcConfiguration] = useState<RTCConfiguration | null>(null);
	const [status, setStatus] = useState<Status>("loading");

	const htmlVideoElementRefObject = useRef<HTMLVideoElement>(null);
	const rtcIceCandidateInitsRefObject = useRef<RTCIceCandidateInit[]>([]);
	const remotePeerConnectionIdRefObject = useRef<string | null>(null);
	const tracksAddedRefObject = useRef(false);
	const rtcPeerConnectionRefObject = useRtcPeerConnection(rtcConfiguration);

	useEffect(() => {
		let cancelled = false;

		const loadRtcConfiguration = async () => {
			setStatus("loading");
			const response = await apiClient.current!.api.v1.stun.rtcConfiguration.get();
			if (!cancelled) {
				setRtcConfiguration(response as RTCConfiguration);
			}
		};

		loadRtcConfiguration().catch((reason) => {
			console.error(reason);
			if (!cancelled) {
				setStatus("error");
			}
		});

		return () => {
			cancelled = true;
		};
	}, [apiClient, deviceId]);

	useEffect(() => {
		if (!deviceId || !rtcConfiguration || !rtcPeerConnectionRefObject.current || !htmlVideoElementRefObject.current || !hubConnection) {
			return;
		}

		let disposed = false;
		const peerConnection = rtcPeerConnectionRefObject.current;
		const htmlVideoElement = htmlVideoElementRefObject.current;

		const ensureLocalTracks = async () => {
			if (tracksAddedRefObject.current) {
				return;
			}

			const playPromise = htmlVideoElement.play();
			if (playPromise) {
				await playPromise;
			}

			const mediaStream = (htmlVideoElement as HTMLVideoElement & { captureStream(): MediaStream }).captureStream();
			for (const mediaStreamTrack of mediaStream.getVideoTracks()) {
				peerConnection.addTrack(mediaStreamTrack, mediaStream);
			}

			tracksAddedRefObject.current = true;
		};

		const flushPendingIceCandidates = async () => {
			if (!peerConnection.remoteDescription) {
				return;
			}

			const queuedCandidates = rtcIceCandidateInitsRefObject.current;
			rtcIceCandidateInitsRefObject.current = [];

			for (const queuedCandidate of queuedCandidates) {
				await peerConnection.addIceCandidate(queuedCandidate);
			}
		};

		const initializePeerConnection = async () => {
			await ensureLocalTracks();

			if (!disposed) {
				setStatus("ready");
			}

			peerConnection.onicecandidate = async (rtcPeerConnectionIceEvent) => {
				const localCandidate = rtcPeerConnectionIceEvent.candidate;
				const remotePeerConnectionId = remotePeerConnectionIdRefObject.current;

				if (
					!localCandidate ||
					hubConnection.state !== HubConnectionState.Connected ||
					!remotePeerConnectionId
				) {
					return;
				}

				await hubConnection.invoke(
					"SendIceCandidate",
					deviceId,
					remotePeerConnectionId,
					localCandidate.toJSON()
				);
			};

			peerConnection.onconnectionstatechange = () => {
				if (!disposed && peerConnection.connectionState === "connected") {
					setStatus("connected");
				}
			};

			const handlePeerJoined = async (connectionId: string) => {
				if (remotePeerConnectionIdRefObject.current === connectionId) {
					return;
				}

				remotePeerConnectionIdRefObject.current = connectionId;

				const rtcOffer = await peerConnection.createOffer();
				await peerConnection.setLocalDescription(rtcOffer);
				await hubConnection.invoke("SendOffer", deviceId, connectionId, rtcOffer);

				if (!disposed) {
					setStatus("offer-sent");
				}
			};

			const handleReceiveAnswer = async (
				connectionId: string,
				rtcSessionDescriptionInit: RTCSessionDescriptionInit
			) => {
				remotePeerConnectionIdRefObject.current ??= connectionId;

				await peerConnection.setRemoteDescription(rtcSessionDescriptionInit);
				await flushPendingIceCandidates();

				if (!disposed) {
					setStatus("connected");
				}
			};

			const handleReceiveIceCandidate = async (
				connectionId: string,
				rtcIceCandidateInit: RTCIceCandidateInit
			) => {
				remotePeerConnectionIdRefObject.current ??= connectionId;

				if (peerConnection.remoteDescription) {
					await peerConnection.addIceCandidate(rtcIceCandidateInit);
					return;
				}

				rtcIceCandidateInitsRefObject.current.push(rtcIceCandidateInit);
			};

			hubConnection.on("PeerJoined", handlePeerJoined);
			hubConnection.on("ReceiveAnswer", handleReceiveAnswer);
			hubConnection.on("ReceiveIceCandidate", handleReceiveIceCandidate);

			return () => {
				hubConnection.off("PeerJoined", handlePeerJoined);
				hubConnection.off("ReceiveAnswer", handleReceiveAnswer);
				hubConnection.off("ReceiveIceCandidate", handleReceiveIceCandidate);
			};
		};

		let cleanupHubHandlers: (() => void) | undefined;

		const initialize = async () => {
			if (htmlVideoElement.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
				await new Promise<void>((resolve) => {
					const handleLoadedData = () => {
						htmlVideoElement.removeEventListener("loadeddata", handleLoadedData);
						resolve();
					};

					htmlVideoElement.addEventListener("loadeddata", handleLoadedData);
				});
			}

			if (disposed) {
				return;
			}

			cleanupHubHandlers = await initializePeerConnection();
		};

		initialize().catch((reason) => {
			console.error(reason);
			if (!disposed) {
				setStatus("error");
			}
		});

		return () => {
			disposed = true;
			rtcIceCandidateInitsRefObject.current = [];
			remotePeerConnectionIdRefObject.current = null;

			try {
				peerConnection.onicecandidate = null;
				peerConnection.onconnectionstatechange = null;
			} catch { }

			cleanupHubHandlers?.();
		};
	}, [deviceId, hubConnection, rtcConfiguration, rtcPeerConnectionRefObject]);

	useEffect(() => {
		if (!deviceId || !rtcConfiguration || !rtcPeerConnectionRefObject.current || !htmlVideoElementRefObject.current || !hubConnection) {
			return;
		}

		let cancelled = false;

		if (!connected) {
			setStatus((currentStatus) => currentStatus === "loading" ? currentStatus : "connecting");
			return () => {
				cancelled = true;
			};
		}

		hubConnection.invoke("JoinDevice", deviceId)
			.then(() => {
				if (!cancelled) {
					setStatus("waiting-for-receiver");
				}
			})
			.catch((reason) => {
				console.error(reason);
				if (!cancelled) {
					setStatus("error");
				}
			});

		return () => {
			cancelled = true;
		};
	}, [connected, deviceId, hubConnection, rtcConfiguration, rtcPeerConnectionRefObject]);

	return (
		<div style={{ display: "flex", flex: 1, flexDirection: "column", width: "100%" }}>
			<p style={{ margin: "1rem" }}>Id: {deviceId} - Status: {status} - Mode: sender</p>
			<video
				autoPlay
				loop
				muted
				playsInline
				ref={htmlVideoElementRefObject}
				src={countdown}
				style={{ height: "80vh", margin: "auto", width: "80vw" }}
			/>
		</div>
	);
}
