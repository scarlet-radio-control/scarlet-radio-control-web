import { HubConnectionState } from "@microsoft/signalr";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import useApiClient from "../../hooks/useApiClient";
import useRtcPeerConnection from "../../hooks/useRtcPeerConnection";
import { useSignalRContext } from "../../contexts/SignalRContext";

interface RTCWellKnownStats {
	localCandidateType?: string;
	remoteCandidateType?: string;
}

type Status = "unknown" | "rtc-connection-loaded" | "signal-r-loaded" | "loading" | "connecting" | "waiting-for-offer" | "answer-sent" | "connected" | "error";

export default function Control() {
	const apiClient = useApiClient();
	const { deviceId } = useParams<{ deviceId: string }>();
	const {connected, hubConnection}= useSignalRContext();

	const [rtcConfiguration, setRtcConfiguration] = useState<RTCConfiguration | undefined>(undefined);
	const [status, setStatus] = useState<Status>("unknown");
	const [rtcWellKnownStats, setRtcWellKnownStats] = useState<RTCWellKnownStats | undefined>(undefined);

	const htmlVideoElementRefObject = useRef<HTMLVideoElement>(null);
	const rtcIceCandidateInitsRefObject = useRef<RTCIceCandidateInit[]>([]);
	const remotePeerConnectionIdRefObject = useRef<string | null>(null);
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

		hubConnection.on("DeviceJoined", async (connectionId: string) => {
			console.log(`Device joined with connection id ${connectionId}`);
		});
		setStatus("signal-r-loaded");
		
		return () => {};
	}, [connected, hubConnection]);

	useEffect(() => {
		if (!connected || !hubConnection) { return; }

		if (!deviceId || !rtcConfiguration || !rtcPeerConnectionRefObject) {
			return;
		}

		let disposed = false;
		const peerConnection = rtcPeerConnectionRefObject;

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

			peerConnection.ontrack = (rtcPeerConnectionTrackEvent) => {
				const mediaStream = rtcPeerConnectionTrackEvent.streams[0];
				if (htmlVideoElementRefObject.current && mediaStream) {
					htmlVideoElementRefObject.current.srcObject = mediaStream;
					void htmlVideoElementRefObject.current.play().catch((reason) => {
						console.error("Failed to autoplay remote stream", reason);
					});
				}
			};

			hubConnection.on("ReceiveOffer", async (connectionId: string, rtcSessionDescriptionInit: RTCSessionDescriptionInit) => {
					remotePeerConnectionIdRefObject.current = connectionId;

					await peerConnection.setRemoteDescription(rtcSessionDescriptionInit);

					const rtcAnswer = await peerConnection.createAnswer();
					await peerConnection.setLocalDescription(rtcAnswer);

					await hubConnection!.invoke("SendAnswer", deviceId, connectionId, rtcAnswer);
					await flushPendingIceCandidates();

					if (!disposed) {
						setStatus("answer-sent");
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

			peerConnection.onconnectionstatechange = () => {
				if (!disposed && peerConnection.connectionState === "connected") {
					setStatus("connected");
					peerConnection.getStats()
						.then((x)=> { 
							x.forEach((report) => {
								if (report.type === "transport" && report.selectedCandidatePairId !== null){
									const selectedPair =x.get(report.selectedCandidatePairId);

									const local = x.get(selectedPair.localCandidateId);
  									const remote = x.get(selectedPair.remoteCandidateId);
									setRtcWellKnownStats({
										localCandidateType: local.candidateType,
										remoteCandidateType: remote.candidateType,
									});
								}
								console.log(report)
							});
						});
				}
			};

			await hubConnection.invoke("JoinAsClient", deviceId);

			if (!disposed) {
				setStatus("waiting-for-offer");
			}
		};

		startHubConnection().catch((reason) => {
			console.error(reason);
			if (!disposed) {
				setStatus("error");
			}
		});

		return () => {
			disposed = true;
			rtcIceCandidateInitsRefObject.current = [];
			remotePeerConnectionIdRefObject.current = null;

			if (htmlVideoElementRefObject.current) {
				htmlVideoElementRefObject.current.srcObject = null;
			}

			try {
				peerConnection.onicecandidate = null;
				peerConnection.ontrack = null;
				peerConnection.onconnectionstatechange = null;
			} catch { }
		};
	}, [connected, deviceId, hubConnection, rtcConfiguration, rtcPeerConnectionRefObject]);

	return (
		<div style={{ display: "flex", flex: 1, flexDirection: "column", width: "100%" }}>
			<p style={{ margin: "auto 1rem" }}>Id: {deviceId} - Status: {status} - Local Candidate Type: {rtcWellKnownStats?.localCandidateType} - Remote Candidate Type: {rtcWellKnownStats?.remoteCandidateType}</p>
			<video
				autoPlay
				muted
				playsInline
				ref={htmlVideoElementRefObject}
				style={{ backgroundColor: "#000000", height: "95vh" }}
			/>
		</div>
	);
}
