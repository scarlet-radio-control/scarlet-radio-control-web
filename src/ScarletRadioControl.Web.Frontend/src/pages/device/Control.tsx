import type { HubConnection } from "@microsoft/signalr";
import { useEffect, useRef } from "react";
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

    const htmlVideoElement = useRef<HTMLVideoElement>(null);
    const hubConnection = useRef<HubConnection>(null);
    const rtcPeerConnection = useRef<RTCPeerConnection>(null);

    useEffect(() => {

        return () => {};
    }, [id]);

    return (
        <div style={{ display: "flex", flex: 1, flexDirection: "column", width: "100%" }}>
            <p style={{ margin: "auto 1rem" }}>Id: {id} - Status: {"unknown"} - RTC Mode: {"unknown"}</p>
            <video autoPlay playsInline ref={htmlVideoElement} style={{ backgroundColor: "#000000", height: "100%", width: "100%" }} />
        </div>
    );
}
