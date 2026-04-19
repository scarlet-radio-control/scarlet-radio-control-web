import { useState, useEffect } from "react";

export const useGamepad = (): Gamepad | undefined => {
    const [gamepad, setGamepad] = useState<Gamepad>();

	useEffect(() => {
		const handleGamepadConnected = (gamepadEvent: GamepadEvent) => {
			if (gamepad === undefined){ return;}
			console.log("GamepadConnected", gamepadEvent.gamepad);
			setGamepad(gamepadEvent.gamepad)
		};

		const handleGamepadDisconnected = (gamepadEvent: GamepadEvent) => {
			console.log("GamepadDisconnected", gamepadEvent.gamepad);
			setGamepad(undefined);
		};

		window.addEventListener("gamepadconnected", handleGamepadConnected);
		window.addEventListener("gamepaddisconnected", handleGamepadDisconnected);

		const gamepads = navigator.getGamepads();
		const firstGamepad = gamepads[0];
		setGamepad(firstGamepad ? firstGamepad : undefined);

		return () => {
			window.removeEventListener("gamepadconnected", handleGamepadConnected);
			window.removeEventListener("gamepaddisconnected", handleGamepadDisconnected);
		};
	}, []);

	return gamepad;
};
