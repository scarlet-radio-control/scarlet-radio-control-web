import { HubConnectionState } from "@microsoft/signalr";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import countdown from "../../assets/countdown.mp4";
import useApiClient from "../../hooks/useApiClient";
import useRtcPeerConnection from "../../hooks/useRtcPeerConnection";
import { useSignalRContext } from "../../contexts/SignalRContext";

//interface RTCWellKnownStats {
//	localCandidateType?: string;
//	remoteCandidateType?: string;
//}

type Status = "unknown" | "rtc-connection-loaded" |"signal-r-loaded" | "loading" | "ready" | "connecting" | "waiting-for-receiver" | "offer-sent" | "connected" | "error";

export default function ControlTest() {
	const apiClient = useApiClient();
	const { deviceId } = useParams<{ deviceId: string }>();
	const {connected, hubConnection}= useSignalRContext();

	const [rtcConfiguration, setRtcConfiguration] = useState<RTCConfiguration | undefined>(undefined);
	const [status, setStatus] = useState<Status>("unknown");
	//const [rtcWellKnownStats, setRtcWellKnownStats] = useState<RTCWellKnownStats | undefined>(undefined);

	const htmlVideoElementRefObject = useRef<HTMLVideoElement>(null);
	const rtcIceCandidateInitsRefObject = useRef<RTCIceCandidateInit[]>([]);
	const remotePeerConnectionIdRefObject = useRef<string | null>(null);
	const tracksAddedRefObject = useRef(false);
	const rtcPeerConnectionRefObject = useRtcPeerConnection(rtcConfiguration);

	useEffect(() => {
		if (!apiClient) { return; }

		apiClient!.api.v1.stun.rtcConfiguration.get()
			.then((response) => {
				setRtcConfiguration(response as RTCConfiguration);
				setStatus("rtc-connection-loaded");
			}
		).catch((reason) => {
			console.error(reason); 
			setStatus("error"); 
		});

		return () => {};
	}, [apiClient]);

	useEffect(() => {
		if (!connected || !hubConnection) { return; }

		hubConnection.on("ClientJoined", async (connectionId: string) => {
			console.log(`Client joined with connection id ${connectionId}`);
		});
		setStatus("signal-r-loaded");
		
		return () => {};
	}, [connected, hubConnection]);

	useEffect(() => {
		if (!connected || !hubConnection) { return; }

		if (!deviceId || !rtcConfiguration || !rtcPeerConnectionRefObject || !htmlVideoElementRefObject.current) {
			return;
		}

		let disposed = false;
		const peerConnection = rtcPeerConnectionRefObject;
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

		const startHubConnection = async () => {
			await ensureLocalTracks();
			setStatus("connecting");

			peerConnection.onicecandidate = async (rtcPeerConnectionIceEvent) => {
				const localCandidate = rtcPeerConnectionIceEvent.candidate;
				const remotePeerConnectionId = remotePeerConnectionIdRefObject.current;

				if (
					!localCandidate ||
					!hubConnection ||
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

			hubConnection.on("ClientJoined", async (connectionId: string) => {
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
			});

			hubConnection.on("ReceiveAnswer", async (connectionId: string, rtcSessionDescriptionInit: RTCSessionDescriptionInit) => {
					remotePeerConnectionIdRefObject.current ??= connectionId;

					await peerConnection.setRemoteDescription(rtcSessionDescriptionInit);
					await flushPendingIceCandidates();

					if (!disposed) {
						setStatus("connected");
					}
				}
			);

			hubConnection.on("ReceiveIceCandidate", async (connectionId: string, rtcIceCandidateInit: RTCIceCandidateInit) => {
					remotePeerConnectionIdRefObject.current ??= connectionId;

					if (peerConnection.remoteDescription) {
						await peerConnection.addIceCandidate(rtcIceCandidateInit);
						return;
					}

					rtcIceCandidateInitsRefObject.current.push(rtcIceCandidateInit);
				}
			);

			await hubConnection.invoke("JoinAsDevice", deviceId);

			if (!disposed) {
				setStatus("waiting-for-receiver");
			}
		};

		if (htmlVideoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
			setStatus("ready");
			startHubConnection().catch((reason) => {
				console.error(reason);
				if (!disposed) {
					setStatus("error");
				}
			});
		} else {
			const handleLoadedData = () => {
				setStatus("ready");
				startHubConnection().catch((reason) => {
					console.error(reason);
					if (!disposed) {
						setStatus("error");
					}
				});
			};

			htmlVideoElement.addEventListener("loadeddata", handleLoadedData, { once: true });

			return () => {
				disposed = true;
				htmlVideoElement.removeEventListener("loadeddata", handleLoadedData);
			};
		}

		return () => {
			disposed = true;
			rtcIceCandidateInitsRefObject.current = [];
			remotePeerConnectionIdRefObject.current = null;
			tracksAddedRefObject.current = false;

			try {
				peerConnection.onicecandidate = null;
				peerConnection.onconnectionstatechange = null;
			} catch { }
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
