import { HubConnectionBuilder, type HubConnection } from "@microsoft/signalr";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import useRtcPeerConnection from "../../hooks/useRtcPeerConnection";

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

export default function Control() {
    const { deviceId } = useParams<{deviceId: string}>();

    const htmlVideoElementRefObject = useRef<HTMLVideoElement>(null);
    const hubConnectionRefObject = useRef<HubConnection>(null);
    const rtcIceCandiateInitsRefObject = useRef<RTCIceCandidateInit[]>([]);
    const rtcPeerConnectionRefObject = useRtcPeerConnection(RTC_CONFIG);

    const [status, setStatus] = useState<"undefined" | "signalr-connected" | "signalr-error" | "offer-sent" | "connected">("undefined");

    useEffect(() => {
        startHubConnection()
            .catch((reason) => {
                console.error(reason);
                setStatus("signalr-error")
            });

        return () => {
            try {
                rtcPeerConnectionRefObject.current?.close();
                rtcPeerConnectionRefObject.current = null;
            } catch { }
            try {
				hubConnectionRefObject.current?.stop();
                hubConnectionRefObject.current = null;
			} catch { }
        };
    }, [deviceId]);

    const startHubConnection = async () => {
        hubConnectionRefObject.current = new HubConnectionBuilder()				
            .withUrl("/hubs/web-rtc-hub")
            .withAutomaticReconnect()
            .build();

            hubConnectionRefObject.current.on("PeerJoined", async (connectionId: string) => { 
                /* Other Side called "JoinRoom" */
                console.log("PeerJoined", connectionId);

                rtcPeerConnectionRefObject.current = new RTCPeerConnection(RTC_CONFIG);
                rtcPeerConnectionRefObject.current.onicecandidate = async (rtcPeerConnectionIceEvent) => {
                    console.log(rtcPeerConnectionIceEvent);
                };
                rtcPeerConnectionRefObject.current.ontrack = async (rtcPeerConnectionTrackEvent) => {
                    console.log(rtcPeerConnectionTrackEvent);       
                };

                const rtcSessionDescriptionInit = await rtcPeerConnectionRefObject.current.createOffer();
                await rtcPeerConnectionRefObject.current.setLocalDescription(rtcSessionDescriptionInit);
                await hubConnectionRefObject.current!.invoke("SendOffer", deviceId, connectionId, rtcSessionDescriptionInit);
				setStatus("offer-sent");
            });

            hubConnectionRefObject.current.on("ReceiveAnswer", async (connectionId: string, rtcSessionDescriptionInit: RTCSessionDescriptionInit) => { 
                /* Other Side called "SendAnswer" */
                console.log("ReceiveAnswer", connectionId, rtcSessionDescriptionInit);

                await rtcPeerConnectionRefObject.current!.setRemoteDescription(rtcSessionDescriptionInit);

                setStatus("connected");
            });

            hubConnectionRefObject.current.on("ReceiveIceCandidate", async (connectionId: string, rtcIceCandidateInit: RTCIceCandidateInit) => { 
                /* Other Side called "SendOffer" */
                console.log("ReceiveIceCandidate", connectionId, rtcIceCandidateInit);

                if (rtcPeerConnectionRefObject.current!.remoteDescription !== null) {
                    rtcPeerConnectionRefObject.current!.addIceCandidate(rtcIceCandidateInit);
                } else {
                    rtcIceCandiateInitsRefObject.current.push(rtcIceCandidateInit);
                }
            });

            hubConnectionRefObject.current.on("ReceiveOffer", async (connectionId: string, rtcSessionDescriptionInit: RTCSessionDescriptionInit) => { 
                /* Other Side called "SendIceCandidate" */
                console.log("ReceiveOffer", connectionId, rtcSessionDescriptionInit);
            });

            await hubConnectionRefObject.current.start();
            await hubConnectionRefObject.current.invoke("JoinRoom", deviceId);
            setStatus("signalr-connected");
    };

    return (
        <div style={{ display: "flex", flex: 1, flexDirection: "column", width: "100%" }}>
            <p style={{ margin: "auto 1rem" }}>Id: {deviceId} - Status: {status} - RTC Mode: {"unknown"}</p>
            <video autoPlay playsInline ref={htmlVideoElementRefObject} style={{ backgroundColor: "#000000", height: "100%", width: "100%" }} />
        </div>
    );
}
