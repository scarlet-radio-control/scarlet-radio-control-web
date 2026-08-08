import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import useApiClient from "../hooks/useApiClient"
import { type Device } from "../kiota/output/models/index.ts"

type Status = "loading" | "loaded" | "error";
type Connection = "connecting" | "live" | "reconnecting" | "offline";

const REFRESH_INTERVAL_MS = 10_000;

const connectionPills: Record<Connection, { className: string; dotClassName: string; label: string }> = {
	connecting: {
		className: "border-neutral-300 bg-neutral-500/10 text-neutral-500 dark:border-neutral-700 dark:text-neutral-400",
		dotClassName: "animate-pulse bg-neutral-400",
		label: "Connecting…",
	},
	live: {
		className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
		dotClassName: "animate-pulse bg-emerald-500",
		label: "Live",
	},
	offline: {
		className: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
		dotClassName: "bg-red-500",
		label: "Offline",
	},
	reconnecting: {
		className: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
		dotClassName: "animate-pulse bg-amber-500",
		label: "Reconnecting…",
	},
};

export default function Index() {
	const apiClient = useApiClient();
	const [devices, setDevices] = useState<Device[]>([]);
	const [status, setStatus] = useState<Status>("loading");
	const [stale, setStale] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [reloadToken, setReloadToken] = useState(0);

	useEffect(() => {
		let disposed = false;

		const loadDevices = () => {
			apiClient.api.v1.devices.get()
				.then((response) => {
					if (disposed) { return; }
					const loadedDevices = [...(response ?? [])]
						.sort((a, b) => (a.name ?? a.id ?? "").localeCompare(b.name ?? b.id ?? ""));
					setDevices(loadedDevices);
					setStatus("loaded");
					setStale(false);
					setRefreshing(false);
				})
				.catch((reason) => {
					if (disposed) { return; }
					console.error(reason);
					setStatus((current) => (current === "loaded" ? current : "error"));
					setStale(true);
					setRefreshing(false);
				});
		};

		loadDevices();
		const intervalId = window.setInterval(loadDevices, REFRESH_INTERVAL_MS);

		return () => {
			disposed = true;
			window.clearInterval(intervalId);
		};
	}, [apiClient, reloadToken]);

	const refresh = () => {
		setRefreshing(true);
		setReloadToken((token) => token + 1);
	};

	const retry = () => {
		setStatus("loading");
		setReloadToken((token) => token + 1);
	};

	const connection: Connection =
		status === "error" ? "offline"
		: stale ? "reconnecting"
		: status === "loaded" ? "live"
		: "connecting";
	const connectionPill = connectionPills[connection];

	return (
		<main className="relative min-h-screen w-full">
			<div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-rose-500/10 via-rose-500/[0.03] to-transparent" />

			<header className="relative flex items-center justify-between border-b border-neutral-200/70 px-6 py-4 dark:border-white/10">
				<div className="flex items-center gap-3">
					<span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-700 text-white shadow-md shadow-rose-500/25">
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9" />
							<path d="M7.8 4.7a6.14 6.14 0 0 0-.8 7.5" />
							<circle cx="12" cy="9" r="2" />
							<path d="M16.2 4.8c2 2 2.26 5.11.8 7.47" />
							<path d="M19.1 1.9a9.96 9.96 0 0 1 0 14.1" />
							<path d="M9.5 18h5" />
							<path d="m8 22 4-11 4 11" />
						</svg>
					</span>
					<span className="font-semibold tracking-tight">Scarlet Radio Control</span>
				</div>
				<span className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${connectionPill.className}`}>
					<span className={`h-1.5 w-1.5 rounded-full ${connectionPill.dotClassName}`} />
					{connectionPill.label}
				</span>
			</header>

			<section className="relative mx-auto w-full max-w-2xl px-6 py-12">
				<div className="mb-8 flex items-end justify-between gap-4">
					<div>
						<h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
							Devices
							{status === "loaded" && (
								<span className="rounded-full bg-neutral-900/5 px-2.5 py-0.5 text-xs font-medium text-neutral-500 dark:bg-white/10 dark:text-neutral-300">
									{devices.length}
								</span>
							)}
						</h1>
						<p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
							Select a device to open its control panel.
						</p>
					</div>
					{status === "loaded" && (
						<button
							onClick={refresh}
							disabled={refreshing}
							aria-label="Refresh devices"
							title="Refresh"
							className="cursor-pointer rounded-xl border border-neutral-200 bg-white p-2.5 text-neutral-500 shadow-sm transition hover:border-rose-300 hover:text-rose-500 disabled:cursor-default disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-neutral-400 dark:shadow-none dark:hover:border-rose-400/50 dark:hover:text-rose-300"
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={refreshing ? "animate-spin" : undefined}>
								<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
								<path d="M21 3v5h-5" />
								<path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
								<path d="M8 16H3v5" />
							</svg>
						</button>
					)}
				</div>

				{status === "loading" && (
					<ul className="flex flex-col gap-3">
						{[0, 1, 2].map((index) => (
							<li
								key={index}
								className="h-19 animate-pulse rounded-2xl border border-neutral-200/60 bg-neutral-200/50 dark:border-white/5 dark:bg-white/5"
							/>
						))}
					</ul>
				)}

				{status === "error" && (
					<div className="rounded-2xl border border-red-500/30 bg-red-500/5 px-8 py-12 text-center dark:bg-red-500/10">
						<p className="font-semibold text-red-700 dark:text-red-300">Failed to load devices</p>
						<p className="mt-1 text-sm text-red-600/80 dark:text-red-400/80">
							Check that the API is reachable. Retrying automatically…
						</p>
						<button
							onClick={retry}
							className="mt-5 cursor-pointer rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-red-600/25 transition hover:bg-red-500"
						>
							Retry now
						</button>
					</div>
				)}

				{status === "loaded" && devices.length === 0 && (
					<div className="rounded-2xl border border-dashed border-neutral-300 bg-white/50 px-8 py-14 text-center dark:border-white/15 dark:bg-white/[0.02]">
						<span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900/5 text-neutral-400 dark:bg-white/5 dark:text-neutral-500">
							<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<circle cx="12" cy="12" r="2" />
								<path d="M7.76 16.24a6 6 0 0 1 0-8.48" />
								<path d="M16.24 7.76a6 6 0 0 1 0 8.48" />
								<path d="M4.93 19.07a10 10 0 0 1 0-14.14" />
								<path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
							</svg>
						</span>
						<p className="mt-4 font-semibold">No devices found</p>
						<p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
							Waiting for devices to register — this list refreshes automatically.
						</p>
					</div>
				)}

				{status === "loaded" && devices.length > 0 && (
					<ul className="flex flex-col gap-3">
						{devices.map((device) => (
							<li
								key={device.id}
								className="flex flex-wrap items-center gap-4 rounded-2xl border border-neutral-200/80 bg-white px-5 py-4 shadow-sm transition hover:border-neutral-300 dark:border-white/10 dark:bg-white/5 dark:shadow-none dark:hover:border-white/20"
							>
								<span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-700 text-white shadow-sm shadow-rose-500/30">
									<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
										<line x1="6" x2="10" y1="11" y2="11" />
										<line x1="8" x2="8" y1="9" y2="13" />
										<line x1="15" x2="15.01" y1="12" y2="12" />
										<line x1="18" x2="18.01" y1="10" y2="10" />
										<path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" />
									</svg>
								</span>
								<span className="min-w-0 flex-1">
									<span className="block truncate font-semibold">{device.name ?? "Unnamed device"}</span>
									<span className="mt-0.5 block truncate font-mono text-xs text-neutral-500 dark:text-neutral-400">{device.id}</span>
								</span>
								<span className="flex shrink-0 items-center gap-2">
									<Link
										to={`/device/${device.id}/control`}
										aria-label={`Connect to ${device.name ?? device.id}`}
										className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm shadow-rose-600/25 transition hover:bg-rose-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
									>
										<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
											<path d="M12 22v-5" />
											<path d="M9 8V2" />
											<path d="M15 8V2" />
											<path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" />
										</svg>
										Connect
									</Link>
									<Link
										to={`/device/${device.id}/control-test`}
										aria-label={`Simulate ${device.name ?? device.id}`}
										className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3.5 py-2 text-sm font-medium text-neutral-600 transition hover:border-rose-300 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 dark:border-white/10 dark:text-neutral-300 dark:hover:border-rose-400/50 dark:hover:text-rose-300"
									>
										<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
											<path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
											<path d="M8.5 2h7" />
											<path d="M7 16h10" />
										</svg>
										Simulate
									</Link>
								</span>
							</li>
						))}
					</ul>
				)}
			</section>
		</main>
	);
}
