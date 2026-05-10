import { useEffect, useRef, useState } from "react";

export default function useRtcPeerConnection(rtcConfiguration: RTCConfiguration | undefined) {
    const [rtcPeerConnection, setRtcPeerConnection] = useState<RTCPeerConnection | undefined>(undefined);

    useEffect(() => {
        const newRtcPeerConnection = new RTCPeerConnection(rtcConfiguration ?? undefined);
        setRtcPeerConnection(newRtcPeerConnection);

        return () => {
            newRtcPeerConnection.close();
            setRtcPeerConnection(undefined);
        };
    }, [rtcConfiguration]);
    return rtcPeerConnection;
}