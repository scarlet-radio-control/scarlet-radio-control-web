import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {HubConnection, HubConnectionBuilder} from "@microsoft/signalr";

export const SignalRContext = createContext<HubConnection | null>(null);

export const useSignalR = () => useContext(SignalRContext);

interface SignalRProviderProps {
	children: ReactNode;
}

export const SignalRProvider = ({ children }: SignalRProviderProps) => {
	const [connection, setConnection] = useState<HubConnection | null>(null);

	useEffect(() => {
		const hubConnection = new HubConnectionBuilder()
			.withUrl("/hubs/web-rtc-hub")
			.withAutomaticReconnect()
			.build();

		setConnection(hubConnection);
  	}, []);

  	useEffect(() => {
		if (!connection) return;

		connection
			.start()
			.then(() => console.log("SignalR Connected"))
			.catch(err => console.error("Connection failed: ", err));
		return () => {
			connection.stop();
		};
  	}, [connection]);

	return (
		<SignalRContext.Provider value={connection}>
			{children}
		</SignalRContext.Provider>
	);
};