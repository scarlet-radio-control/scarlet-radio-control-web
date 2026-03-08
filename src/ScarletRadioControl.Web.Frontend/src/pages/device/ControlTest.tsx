import { useEffect, useRef, useState } from "react";
import countdown from "../../assets/countdown.mp4";
import { useParams } from "react-router-dom";
import useApiClient from "../../hooks/useApiClient";
import useRtcPeerConnection from "../../hooks/useRtcPeerConnection";
import {useHubConnection} from "../../context/SignalRContext";

export default function ControlTest() {
	const [remoteConnectionId, setRemoteConnectionId] = useState<string | null>(null);
	const [rtcConfiguration, setRtcConfiguration] = useState<RTCConfiguration | null>(null);
	const [status, setStatus] = useState<"undefined" |"rtc-configuration-received">("undefined");

	const apiClient = useApiClient();
	const hubConnection = useHubConnection();
	const { deviceId } = useParams<{deviceId: string}>();
	const htmlVideElementRefObject = useRef<HTMLVideoElement>(null);
	//const rtcIceCandiateInitsRefObject = useRef<RTCIceCandidateInit[]>([]);
	const rtcPeerConnectionRefObject = useRtcPeerConnection(rtcConfiguration);

    useEffect(() => {
        const useEffectAsync = async () => {
			if (apiClient.current === null) { return; }
            const rtcConfiguration = await apiClient.current.api.v1.stun.rtcConfiguration.get();
            setRtcConfiguration(rtcConfiguration as RTCConfiguration);
			setStatus("rtc-configuration-received");
        }

        useEffectAsync().catch((reason) => {console.error(reason)});
        return () => {};
    }, [deviceId]);

	useEffect(() => {
		hubConnection.on("ReceiverJoined", async (remoteConnectionId: string) => {
			setRemoteConnectionId(remoteConnectionId);
		});
		hubConnection.send("SenderJoin", deviceId!)
			.catch((reason) => console.error(reason));

		return () => {
			hubConnection.off("ReceiverJoined");
		};
	}, [deviceId]);

	useEffect(() => {
		const useEffectAsync = async () => {
			hubConnection.on("ReceiveAnswer", async (remoteConnectionId: string, rtcSessionDescriptionInit: RTCSessionDescriptionInit) => {
				console.log("ReceiveAnswer", remoteConnectionId, rtcSessionDescriptionInit);
				await rtcPeerConnectionRefObject.current!.setRemoteDescription(rtcSessionDescriptionInit);
			});
			hubConnection.on("ReceiveIceCandidate", async (remoteConnectionId: string, rtcIceCandidateInit: RTCIceCandidateInit) => {
				console.log("ReceiveIceCandidate", remoteConnectionId, rtcIceCandidateInit);
				await rtcPeerConnectionRefObject.current!.addIceCandidate(rtcIceCandidateInit);
			});
			hubConnection.on("ReceiverJoin", async (remoteConnectionId: string) => {
				console.log("ReceiverJoin", remoteConnectionId);
			});

			//hubConnectionRefObject.current!.start();
			//hubConnectionRefObject.current!.send("SenderJoin", deviceId!);

			const mediaStream = (htmlVideElementRefObject.current as any).captureStream() as MediaStream;
			for (const mediaStreamTrack of mediaStream.getTracks()) {
				rtcPeerConnectionRefObject.current!.addTransceiver(mediaStreamTrack, {direction: "sendonly", streams: [mediaStream]});
			}

			const localOfferRtcSessionDescriptionInit = await rtcPeerConnectionRefObject.current!.createOffer();
			await rtcPeerConnectionRefObject.current!.setLocalDescription(localOfferRtcSessionDescriptionInit);
			//hubConnectionRefObject.current!.send("SendOffer", deviceId!, localOfferRtcSessionDescriptionInit);
		}

		useEffectAsync().catch((reason) => {console.error(reason)});
		return () => {};
	}, [deviceId, rtcConfiguration]);

	return (
		<div style={{ display: "flex", flex: 1, flexDirection: "column", width: "100%" }}>
             <p style={{ margin: "auto 1rem" }}>Id: {deviceId} - Status: {status} - RTC Mode: {"unknown"}</p> 
            <video autoPlay loop muted playsInline ref={htmlVideElementRefObject} src={countdown} style={{ backgroundColor: "#000000", height: "100%", width: "100%" }} />
        </div>
	);
}
