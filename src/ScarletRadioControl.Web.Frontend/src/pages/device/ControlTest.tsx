import { useEffect, useRef, useState } from "react";
import countdown from "../../assets/countdown.mp4";
import { useParams } from "react-router-dom";
import useApiClient from "../../hooks/useApiClient";
import useRtcPeerConnection from "../../hooks/useRtcPeerConnection";
import useHubConnection from "../../hooks/useHubConnection";

export default function ControlTest() {
	const [rtcConfiguration, setRtcConfiguration] = useState<RTCConfiguration | null>(null);

	const apiClient = useApiClient();
	const hubConnectionRefObject = useHubConnection();
	const { deviceId } = useParams<{deviceId: string}>();
	const htmlVideElementRefObject = useRef<HTMLVideoElement>(null);
	const rtcIceCandiateInitsRefObject = useRef<RTCIceCandidateInit[]>([]);
	const rtcPeerConnectionRefObject = useRtcPeerConnection(rtcConfiguration);

    //const [status, setStatus] = useState<"undefined">("undefined");

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
			hubConnectionRefObject.current!.on("ReceiveAnswer", async (remoteConnectionId: string, rtcSessionDescriptionInit: RTCSessionDescriptionInit) => {
				await rtcPeerConnectionRefObject.current!.setRemoteDescription(rtcSessionDescriptionInit);
			});
			hubConnectionRefObject.current!.on("ReceiveIceCandidate", async (remoteConnectionId: string, rtcIceCandidateInit: RTCIceCandidateInit) => {
				await rtcPeerConnectionRefObject.current!.addIceCandidate(rtcIceCandidateInit);
			});
			hubConnectionRefObject.current!.on("ReceiverJoin", async (remoteConnectionId: string) => {});

			hubConnectionRefObject.current!.start();
			hubConnectionRefObject.current!.send("SenderJoined", deviceId!);

			const mediaStream = (htmlVideElementRefObject.current as any).captureStream() as MediaStream;
			for (const mediaStreamTrack of mediaStream.getTracks()) {
				rtcPeerConnectionRefObject.current!.addTransceiver(mediaStreamTrack, {direction: "sendonly", streams: [mediaStream]});
			}

			const localOfferRtcSessionDescriptionInit = await rtcPeerConnectionRefObject.current!.createOffer();
			await rtcPeerConnectionRefObject.current!.setLocalDescription(localOfferRtcSessionDescriptionInit);
			hubConnectionRefObject.current!.send("SendOffer", deviceId!, localOfferRtcSessionDescriptionInit);
		}

        useEffectAsync().catch((reason) => {console.error(reason)});
        return () => {};
	}, [deviceId, rtcConfiguration]);

	return (
		<div style={{ display: "flex", flex: 1, flexDirection: "column", width: "100%" }}>
            {/* <p style={{ margin: "auto 1rem" }}>Id: {deviceId} - Status: {status} - RTC Mode: {"unknown"}</p> */}
            <video autoPlay loop muted playsInline ref={htmlVideElementRefObject} src={countdown} style={{ backgroundColor: "#000000", height: "100%", width: "100%" }} />
        </div>
	);
}
