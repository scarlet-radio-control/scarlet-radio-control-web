import { useEffect, useRef, useState } from "react";
import countdown from "../../assets/countdown.mp4";

type SignalMessage =
  | { type: "offer"; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; candidate: RTCIceCandidateInit }
  | { type: "reset" };

export default function Caller() {


  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const [started, setStarted] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "getting-media" | "creating-offer" | "waiting-answer" | "connected"
  >("idle");
  const [error, setError] = useState("");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const remoteDescSetRef = useRef(false);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);

  function ensureChannel() {
    if (!channelRef.current) {
      channelRef.current = new BroadcastChannel("webrtc-demo");
    }
    return channelRef.current;
  }

  function post(msg: SignalMessage) {
    ensureChannel().postMessage(msg);
  }

  async function createPeerConnection() {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.onicecandidate = (e) => {
      if (e.candidate) post({ type: "ice", candidate: e.candidate.toJSON() });
    };

    pc.ontrack = (e) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") setStatus("connected");
    };

    pcRef.current = pc;
    return pc;
  }

  async function start() {
    setError("");
    if (started) return;

    try {
      const ch = ensureChannel();

      ch.onmessage = async (ev) => {
        const msg = ev.data as SignalMessage;
        const pc = pcRef.current;
        if (!pc) return;

        try {
          if (msg.type === "answer") {
            await pc.setRemoteDescription(msg.sdp);
            remoteDescSetRef.current = true;

            for (const c of pendingIceRef.current) await pc.addIceCandidate(c);
            pendingIceRef.current = [];
            setStatus("connected");
          }

          if (msg.type === "ice") {
            if (remoteDescSetRef.current) {
              await pc.addIceCandidate(msg.candidate);
            } else {
              pendingIceRef.current.push(msg.candidate);
            }
          }

          if (msg.type === "reset") stop();
        } catch (e: any) {
          setError(e?.message || String(e));
        }
      };

      setStatus("getting-media");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = await createPeerConnection();
      for (const t of stream.getTracks()) pc.addTrack(t, stream);

      setStatus("creating-offer");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      post({ type: "offer", sdp: offer });

      setStatus("waiting-answer");
      setStarted(true);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  function stop() {
    remoteDescSetRef.current = false;
    pendingIceRef.current = [];
    setStatus("idle");
    setError("");

    pcRef.current?.close();
    pcRef.current = null;

    if (localStreamRef.current) {
      for (const t of localStreamRef.current.getTracks()) t.stop();
      localStreamRef.current = null;
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    setStarted(false);
  }

  function resetBothTabs() {
    post({ type: "reset" });
    stop();
  }

  useEffect(() => {
    return () => {
      channelRef.current?.close();
      channelRef.current = null;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ fontFamily: "system-ui", padding: 16, maxWidth: 980 }}>
      <h2>Caller</h2>

      <div style={{ marginBottom: 12 }}>
        <b>Status:</b> {status}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div>Local</div>
          <video
            src={countdown}
            ref={localVideoRef}
            autoPlay
            loop
            playsInline
            muted
            style={{ width: 460, background: "#111" }}
          />
        </div>

        <div>
          <div>Remote</div>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{ width: 460, background: "#111" }}
          />
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button onClick={start} disabled={started}>
          Start (create offer)
        </button>
        <button onClick={stop} disabled={!started}>
          Stop (this tab)
        </button>
        <button onClick={resetBothTabs}>Reset (both tabs)</button>
      </div>

      {error && (
        <pre style={{ marginTop: 12, color: "crimson", whiteSpace: "pre-wrap" }}>
          {error}
        </pre>
      )}

      <p style={{ marginTop: 12, color: "#444" }}>
        Open Callee in another tab (same origin). Start Callee first or after—either
        is fine. Caller sends the offer when started.
      </p>
    </div>
  );
}
