import { HubConnectionBuilder, type HubConnection } from "@microsoft/signalr";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

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
    const { id } = useParams<{id: string}>();

    const htmlVideoElementRefObject = useRef<HTMLVideoElement>(null);
    const hubConnectionRefObject = useRef<HubConnection>(null);
    const rtcPeerConnectionRefObject = useRef<RTCPeerConnection>(null);

    const [status, setStatus] = useState<"undefined" | "signalr-connected" | "signalr-error">("undefined");

    useEffect(() => {
        startHubConnection()
            .catch((reason) => {
                console.error(reason);
                setStatus("signalr-error")
            });

        return () => {
            			try {
				hubConnectionRefObject.current?.stop();
                hubConnectionRefObject.current = null;
			} catch { }
        };
    }, [id]);

    const startHubConnection = async () => {
        hubConnectionRefObject.current = new HubConnectionBuilder()				
            .withUrl("/hubs/web-rtc-hub")
            .withAutomaticReconnect()
            .build();

            hubConnectionRefObject.current.on("PeerJoined", async (connectionId: string) => { });

            hubConnectionRefObject.current.on("ReceiveAnswer", async (connectionId: string, rtcSessionDescriptionInit: RTCSessionDescriptionInit) => { });

            hubConnectionRefObject.current.on("ReceiveCandidate", async (connectionId: string, rtcIceCandidateInit: RTCIceCandidateInit) => { });

            hubConnectionRefObject.current.on("ReceiveOffer", async (connectionId: string, rtcSessionDescriptionInit: RTCSessionDescriptionInit) => { });

            await hubConnectionRefObject.current.start();
            await hubConnectionRefObject.current.invoke("JoinRoom", id);
            setStatus("signalr-connected");
    };

    return (
        <div style={{ display: "flex", flex: 1, flexDirection: "column", width: "100%" }}>
            <p style={{ margin: "auto 1rem" }}>Id: {id} - Status: {status} - RTC Mode: {"unknown"}</p>
            <video autoPlay playsInline ref={htmlVideoElementRefObject} style={{ backgroundColor: "#000000", height: "100%", width: "100%" }} />
        </div>
    );
}
