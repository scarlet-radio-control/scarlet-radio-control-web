import { useEffect, useRef } from "react";

export default function useRtcPeerConnection(rtcConfiguration: RTCConfiguration | null) {
    const rtcPeerConnectionRefObject = useRef<RTCPeerConnection>(null);

    useEffect(() => {
        rtcPeerConnectionRefObject.current = new RTCPeerConnection(rtcConfiguration ?? undefined);

        return () => {
            rtcPeerConnectionRefObject.current?.close();
            rtcPeerConnectionRefObject.current = null;
        };
    }, [rtcConfiguration]);
    return rtcPeerConnectionRefObject;
}