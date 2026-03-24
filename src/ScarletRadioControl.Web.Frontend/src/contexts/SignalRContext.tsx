import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { HubConnection, HubConnectionBuilder } from "@microsoft/signalr";

export const SignalRContext = createContext<HubConnection | null>(null);

export const useSignalRContext = () => useContext(SignalRContext);

interface SignalRProviderProps {
	children: ReactNode;
}

export const SignalRProvider = ({ children }: SignalRProviderProps) => {
	const [hubConnection, setHubConnection] = useState<HubConnection | null>(null);

	useEffect(() => {
		const newHubConnection = new HubConnectionBuilder()
			.withUrl("/hubs/web-rtc-hub")
			.withAutomaticReconnect()
			.build();

		setHubConnection(newHubConnection);
  	}, []);

  	useEffect(() => {
		if (hubConnection === null) { return; } 

		hubConnection
			.start()
			.then(() => console.log("SignalR Connected"))
			.catch(reason => console.error(reason));
		return () => {
			hubConnection.stop();
		};
  	}, [hubConnection]);

	return (
		<SignalRContext.Provider value={hubConnection}>
			{children}
		</SignalRContext.Provider>
	);
};