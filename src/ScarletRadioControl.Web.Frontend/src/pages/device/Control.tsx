import { useRef } from "react";
import { useParams } from "react-router-dom";

export default function Control() {
    const { id } = useParams<{id: string}>();

    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

    return (
        <div>
            <h1>Device Control</h1>
            <p>Controlling device with ID: {id}</p>

            <section>
                <h2>Remote Stream</h2>
                <video autoPlay playsInline ref={remoteVideoRef} style={{ width: "320px", height: "240px", background: "#000" }} />
            </section>

            <p>(WebRTC connection logic to hook streams into the videos goes here.)</p>
        </div>
    );
}
