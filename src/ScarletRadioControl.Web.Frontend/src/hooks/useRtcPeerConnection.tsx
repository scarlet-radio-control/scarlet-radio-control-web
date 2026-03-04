import { useEffect, useRef } from "react";

export default function useRtcPeerConnection(rtcConfiguration: RTCConfiguration) {
    const rtcPeerConnectionRefObject = useRef<RTCPeerConnection>(null);

    useEffect(() => {
        rtcPeerConnectionRefObject.current = new RTCPeerConnection(rtcConfiguration);

        return () => {
            rtcPeerConnectionRefObject.current?.close();
            rtcPeerConnectionRefObject.current = null;
        };
    }, [rtcConfiguration]);
    return rtcPeerConnectionRefObject;
}