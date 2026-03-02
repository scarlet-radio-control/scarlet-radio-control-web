import { useRef } from "react";
import { useParams } from "react-router-dom";

export default function Control() {
    const { id } = useParams<{id: string}>();

    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

    return (
        <div>
            <p>Id: {id}</p>
            <video autoPlay playsInline ref={remoteVideoRef} style={{ background: "#000", height: "auto", width: "100%" }} />
            <section>
                <h2>Remote Stream</h2>
            </section>

            <p>(WebRTC connection logic to hook streams into the videos goes here.)</p>
        </div>
    );
}
