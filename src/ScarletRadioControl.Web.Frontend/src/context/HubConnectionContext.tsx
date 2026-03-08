import { HubConnection, HubConnectionBuilder } from "@microsoft/signalr";
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";

const HubConnectionContext = createContext<HubConnection | null>(null);

export function HubConnectionProvider({ children }: { children: ReactNode }) {
    const hubConnectionRefObject = useRef<HubConnection>(null);

    useEffect(() => {
        const hubConnection = new HubConnectionBuilder()
            .withUrl("/hubs/web-rtc-hub")
            .withAutomaticReconnect()
            .build();

        hubConnection.start()
            .then(() => hubConnectionRefObject.current = hubConnection)
            .catch((reason) => console.error(reason));

        return () => {
            if (hubConnectionRefObject.current === null) { return; }

            hubConnection.stop()
                .catch((reason) => console.error(reason))
                .finally(() => hubConnectionRefObject.current = null);
        };
    }, []);

    return (
        <HubConnectionContext.Provider value={hubConnectionRefObject.current}>
            {children}
        </HubConnectionContext.Provider>
    );
}

export function useHubConnection() {
    const context = useContext(HubConnectionContext);

    if (context === null) { throw new Error("useHubConnection must be used inside HubConnectionProvider"); }

    return context;
}
