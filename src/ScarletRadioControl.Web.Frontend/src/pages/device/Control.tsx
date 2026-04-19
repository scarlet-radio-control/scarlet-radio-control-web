import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useSignalRContext } from "../../contexts/SignalRContext";
import useApiClient from "../../hooks/useApiClient";
import useRtcPeerConnection from "../../hooks/useRtcPeerConnection";

interface RTCWellKnownStats {
	localCandidateType?: string;
	remoteCandidateType?: string;
}

type Status = "unknown" | "rtc-configuration-loaded" | "waiting-for-offer" | "answer-sent" | "connected" | "error";

export default function Control() {
	const apiClient = useApiClient();
	const { deviceId } = useParams<{ deviceId: string }>();
	const { connected, hubConnection } = useSignalRContext();

	const [rtcConfiguration, setRtcConfiguration] = useState<RTCConfiguration | null>(null);
	const [status, setStatus] = useState<Status>( "unknown");
	const [rtcWellKnownStats, setRtcWellKnownStats] = useState<RTCWellKnownStats | null>(null)

	const htmlVideoElementRefObject = useRef<HTMLVideoElement>(null);
	const rtcIceCandidateInitsRefObject = useRef<RTCIceCandidateInit[]>([]);
	const remotePeerConnectionIdRefObject = useRef<string | null>(null);
	const rtcPeerConnectionRefObject = useRtcPeerConnection(rtcConfiguration);
	const gamepadPollHandleRefObject = useRef<number | null>(null);
	const previousGamepadsRefObject = useRef<Record<number, { axes: number[]; buttons: number[] }>>({});

	useEffect(() => {
		apiClient.current!.api.v1.stun.rtcConfiguration.get()
			.then(x => {
				setRtcConfiguration(x as RTCConfiguration);
				setStatus("rtc-configuration-loaded");
			})
			.catch(reason => {
				console.error(reason);
				setStatus("error");
			});
	}, [apiClient]);

	useEffect(() => {
		const logGamepadChanges = () => {
			const gamepads = navigator.getGamepads?.();
			if (gamepads) {
				for (const gamepad of gamepads) {
					if (!gamepad) {
						continue;
					}

					const axes = gamepad.axes.map((value) => Number(value.toFixed(4)));
					const buttons = gamepad.buttons.map((button) => Number(button.value.toFixed(4)));
					const previous = previousGamepadsRefObject.current[gamepad.index];

					const axisMoved = !previous || axes.some((value, index) => Math.abs(value - (previous.axes[index] ?? 0)) > 0.02);
					const buttonChanged = !previous || buttons.some((value, index) => value !== (previous.buttons[index] ?? 0));

					if (axisMoved || buttonChanged) {
						console.log(`Gamepad ${gamepad.index} moved:`, {
							id: gamepad.id,
							axes,
							buttons,
							connected: gamepad.connected,
						});
					}

					previousGamepadsRefObject.current[gamepad.index] = { axes, buttons };
				}
			}

			gamepadPollHandleRefObject.current = requestAnimationFrame(logGamepadChanges);
		};

		const onGamepadConnected = (event: GamepadEvent) => {
			console.log("Gamepad connected:", event.gamepad.id);
			previousGamepadsRefObject.current[event.gamepad.index] = {
				axes: event.gamepad.axes.map((value) => Number(value.toFixed(4))),
				buttons: event.gamepad.buttons.map((button) => Number(button.value.toFixed(4))),
			};
		};

		const onGamepadDisconnected = (event: GamepadEvent) => {
			console.log("Gamepad disconnected:", event.gamepad.id);
			delete previousGamepadsRefObject.current[event.gamepad.index];
		};

		if (typeof navigator.getGamepads === "function") {
			logGamepadChanges();
			window.addEventListener("gamepadconnected", onGamepadConnected);
			window.addEventListener("gamepaddisconnected", onGamepadDisconnected);
		}

		return () => {
			if (gamepadPollHandleRefObject.current !== null) {
				cancelAnimationFrame(gamepadPollHandleRefObject.current);
				gamepadPollHandleRefObject.current = null;
			}
			window.removeEventListener("gamepadconnected", onGamepadConnected);
			window.removeEventListener("gamepaddisconnected", onGamepadDisconnected);
		};
	}, []);

	useEffect(() => {
		if (rtcPeerConnectionRefObject.current === null) { return; }

		rtcPeerConnectionRefObject.current.onconnectionstatechange = () => {
			if (rtcPeerConnectionRefObject.current === null) { return; }

			if (rtcPeerConnectionRefObject.current.connectionState === "connected") {
				rtcPeerConnectionRefObject.current.getStats()
					.then((x)=> { 
						x.forEach((report) => {
							if (report.type === "transport" && report.selectedCandidatePairId !== null){
								const selectedPair = x.get(report.selectedCandidatePairId);

								const local = x.get(selectedPair.localCandidateId);
								const remote = x.get(selectedPair.remoteCandidateId);
								setRtcWellKnownStats({
									localCandidateType: local.candidateType,
									remoteCandidateType: remote.candidateType,
								});
							}
						});
					});
				setStatus("connected");
			}

			if (rtcPeerConnectionRefObject.current.connectionState === "disconnected"){
				setStatus("rtc-configuration-loaded");
			}
		};

		rtcPeerConnectionRefObject.current.ondatachannel = (rtcDataChannelEvent) => { 
			console.log(rtcDataChannelEvent.channel);
		};

		rtcPeerConnectionRefObject.current.onicecandidate = async (rtcPeerConnectionIceEvent) => {
			const localCandidate = rtcPeerConnectionIceEvent.candidate;
			const remotePeerConnectionId = remotePeerConnectionIdRefObject.current;

			if (!localCandidate || connected || hubConnection === null || !remotePeerConnectionId) {
				return;
			}

			await hubConnection.invoke("SendIceCandidate", deviceId, remotePeerConnectionId, localCandidate);
		};

		rtcPeerConnectionRefObject.current.ontrack = (rtcTrackEvent) => {
			if (htmlVideoElementRefObject.current === null) {return;}
			
			const mediaStream = rtcTrackEvent.streams[0];
			if (mediaStream !== null) {
				htmlVideoElementRefObject.current.srcObject = mediaStream;
				htmlVideoElementRefObject.current.play()
					.catch((reason) => {
						console.error(reason);
						setStatus("error");
					});
			}
		};
	}, [connected, deviceId, hubConnection, remotePeerConnectionIdRefObject, rtcPeerConnectionRefObject]);

	useEffect(() => {
		if(!connected || hubConnection === null || rtcPeerConnectionRefObject.current === null) {return; }

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
				await rtcPeerConnectionRefObject.current!.addIceCandidate(queuedCandidate);
			}
		};

		hubConnection.on("ReceiveIceCandidate", async (fromConnectionId: string, rtcIceCandidateInit: RTCIceCandidateInit) => {
			remotePeerConnectionIdRefObject.current ??= fromConnectionId;

			if (peerConnection.remoteDescription) {
				await rtcPeerConnectionRefObject.current!.addIceCandidate(rtcIceCandidateInit);
				return;
			}

			rtcIceCandidateInitsRefObject.current.push(rtcIceCandidateInit);
		});

		hubConnection.on("ReceiveOffer", async (fromConnectionId: string, rtcSessionDescriptionInit: RTCSessionDescriptionInit) => {
			remotePeerConnectionIdRefObject.current = fromConnectionId;

			await peerConnection.setRemoteDescription(rtcSessionDescriptionInit);

			const rtcAnswer = await peerConnection.createAnswer();
			await peerConnection.setLocalDescription(rtcAnswer);

			await hubConnection.invoke("SendAnswer", deviceId, fromConnectionId, rtcAnswer);
			await flushPendingIceCandidates();

			if (!disposed) {
				setStatus("answer-sent");
			}
		});

		hubConnection.invoke("JoinDevice", deviceId)
			.then(() => {
				setStatus("waiting-for-offer");
			})
			.catch((reason) => {
				console.error(reason);
				setStatus("error");
			});

		return () => {
			disposed = true;
			rtcIceCandidateInitsRefObject.current = [];
			remotePeerConnectionIdRefObject.current = null;

			if (htmlVideoElementRefObject.current) {
				htmlVideoElementRefObject.current.srcObject = null;
			}

			peerConnection.onicecandidate = null;
			peerConnection.ontrack = null;
			peerConnection.onconnectionstatechange = null;
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
