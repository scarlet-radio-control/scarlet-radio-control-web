import { HubConnectionBuilder, HubConnectionState, type HubConnection } from "@microsoft/signalr";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import useApiClient from "../../hooks/useApiClient";
import useRtcPeerConnection from "../../hooks/useRtcPeerConnection";

interface RTCWellKnownStats {
	localCandidateType?: string;
	remoteCandidateType?: string;
}

type Status = "loading" | "connecting" | "waiting-for-offer" | "answer-sent" | "connected" | "error";

export default function Control() {
	const { deviceId } = useParams<{ deviceId: string }>();
	const apiClient = useApiClient();

	const [rtcConfiguration, setRtcConfiguration] = useState<RTCConfiguration | null>(null);
	const [status, setStatus] = useState<Status>("loading");
	const [rtcWellKnownStats, setRtcWellKnownStats] = useState<RTCWellKnownStats | null>(null)
	const [localCandidateType, setLocalCandidateType] = useState<string | null>(null);
	const [remoteCandidateType, setRemoteCandidateType] = useState<string | null>(null);

	const htmlVideoElementRefObject = useRef<HTMLVideoElement>(null);
	const hubConnectionRefObject = useRef<HubConnection>(null);
	const rtcIceCandidateInitsRefObject = useRef<RTCIceCandidateInit[]>([]);
	const remotePeerConnectionIdRefObject = useRef<string | null>(null);
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
		if (!deviceId || !rtcConfiguration || !rtcPeerConnectionRefObject.current) {
			return;
		}

		let disposed = false;
		const peerConnection = rtcPeerConnectionRefObject.current;

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

			hubConnectionRefObject.current = new HubConnectionBuilder()
				.withUrl("/hubs/web-rtc-hub")
				.withAutomaticReconnect()
				.build();

			peerConnection.onicecandidate = async (rtcPeerConnectionIceEvent) => {
				const localCandidate = rtcPeerConnectionIceEvent.candidate;
				const hubConnection = hubConnectionRefObject.current;
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

			hubConnectionRefObject.current.on(
				"ReceiveOffer",
				async (connectionId: string, rtcSessionDescriptionInit: RTCSessionDescriptionInit) => {
					remotePeerConnectionIdRefObject.current = connectionId;

					await peerConnection.setRemoteDescription(rtcSessionDescriptionInit);

					const rtcAnswer = await peerConnection.createAnswer();
					await peerConnection.setLocalDescription(rtcAnswer);

					await hubConnectionRefObject.current!.invoke("SendAnswer", deviceId, connectionId, rtcAnswer);
					await flushPendingIceCandidates();

					if (!disposed) {
						setStatus("answer-sent");
					}
				}
			);

			hubConnectionRefObject.current.on(
				"ReceiveIceCandidate",
				async (connectionId: string, rtcIceCandidateInit: RTCIceCandidateInit) => {
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

			await hubConnectionRefObject.current.start();
			await hubConnectionRefObject.current.invoke("JoinDevice", deviceId);

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

			try {
				hubConnectionRefObject.current?.stop();
			} catch { }

			hubConnectionRefObject.current = null;
		};
	}, [deviceId, rtcConfiguration, rtcPeerConnectionRefObject]);

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
