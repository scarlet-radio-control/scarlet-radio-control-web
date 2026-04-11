import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { HubConnection, HubConnectionBuilder } from "@microsoft/signalr";

interface SignalRContextValue {
	connected: boolean;
	hubConnection: HubConnection | null;
}

export const SignalRContext = createContext<SignalRContextValue>({
	connected: false,
	hubConnection: null,
});

export const useSignalRContext = () => useContext(SignalRContext);

interface SignalRProviderProps {
	children: ReactNode;
}

export const SignalRProvider = ({ children }: SignalRProviderProps) => {
	const [connected, setConnected] = useState(false);
	const [hubConnection, setHubConnection] = useState<HubConnection | null>(null);

	useEffect(() => {
		let disposed = false;

		const newHubConnection = new HubConnectionBuilder()
			.withUrl("/hubs/web-rtc-hub")
			.withAutomaticReconnect()
			.build();

		newHubConnection.onclose(() => {
			if (!disposed) {
				setConnected(false);
			}
		});

		newHubConnection.onreconnected(() => {
			if (!disposed) {
				setConnected(true);
			}
		});

		newHubConnection.onreconnecting(() => {
			if (!disposed) {
				setConnected(false);
			}
		});

		newHubConnection
			.start()
			.then(() => {
				if (!disposed) {
					setConnected(true);
					console.log("SignalR Connected");
				}
			})
			.catch(reason => {
				if (!disposed) {
					setConnected(false);
					console.error(reason);
				}
			});

		setHubConnection(newHubConnection);

		return () => {
			disposed = true;
			newHubConnection.stop()
				.catch(reason => console.error(reason));
		};
	}, []);

	return (
		<SignalRContext.Provider value={{ connected, hubConnection }}>
			{children}
		</SignalRContext.Provider>
	);
};
