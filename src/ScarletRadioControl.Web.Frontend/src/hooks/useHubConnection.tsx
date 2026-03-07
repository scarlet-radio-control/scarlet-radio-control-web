import { useRef, useEffect } from "react";
import { HubConnectionBuilder, type HubConnection } from "@microsoft/signalr";

export default function useHubConnection() {
    const hubConnectionRefObject = useRef<HubConnection>(null);

    useEffect(() => {    
        hubConnectionRefObject.current = new HubConnectionBuilder()				
            .withUrl("/hubs/web-rtc-hub")
            .withAutomaticReconnect()
            .build()

        return () => { };
    }, []);
    return hubConnectionRefObject;
}