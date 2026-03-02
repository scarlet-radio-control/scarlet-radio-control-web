import { useRef } from "react";
import { useParams } from "react-router-dom";

export default function Control() {
    const { id } = useParams<{id: string}>();

    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

    return (
        <div style={{ width: "100%" }}>
            <p style={{ margin: "auto 1rem" }}>Id: {id} - Status: {"unknown"} - RTC Mode: {"unknown"}</p>
            <video autoPlay playsInline ref={remoteVideoRef} style={{ background: "#000000", width: "100%" }} />
        </div>
    );
}
