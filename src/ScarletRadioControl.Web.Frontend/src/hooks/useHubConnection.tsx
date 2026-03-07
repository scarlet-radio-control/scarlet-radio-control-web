import { useRef, useEffect } from "react";
import { HubConnectionBuilder, type HubConnection } from "@microsoft/signalr";

export default function useHubConnection() {
    const hubConnectionRefObject = useRef<HubConnection>(null);

    useEffect(() => {
        const useEffectAsync = async () => { 
            const hubConnection = new HubConnectionBuilder()				
                .withUrl("/hubs/web-rtc-hub")
                .withAutomaticReconnect()
                .build()
            await hubConnection.start();

            hubConnectionRefObject.current = hubConnection;
        };


        useEffectAsync().catch((reason) => { console.error(reason) });
        return () => { 
            if (hubConnectionRefObject.current === null) { return;}
            hubConnectionRefObject.current.stop();
        };
    }, []);
    return hubConnectionRefObject;
}