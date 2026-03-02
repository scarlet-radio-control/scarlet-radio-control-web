import { useRef } from "react";
import { useParams } from "react-router-dom";

export default function Control() {
    const { id } = useParams<{id: string}>();

    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

    return (
        <div style={{ display: "flex", flex: 1, flexDirection: "column", width: "100%" }}>
            <p style={{ margin: "auto 1rem" }}>Id: {id} - Status: {"unknown"} - RTC Mode: {"unknown"}</p>
            <video autoPlay playsInline ref={remoteVideoRef} style={{ backgroundColor: "#000000", height: "100%", width: "100%" }} />
        </div>
    );
}
