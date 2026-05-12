import { useEffect, useRef, useState } from "react";
import { socket } from "../socket";

// ── No hardcoded ICE config here anymore ──────────────────────────────
// Fetched from /ice-servers so credentials stay on the server.

export function useVoiceCall(roomId) {
  const [micOn, setMicOn]           = useState(true);
  const [mutedPeers, setMutedPeers] = useState({});

  const localStream   = useRef(null);
  const peers         = useRef({});
  const audioEls      = useRef({});
  const streamReady   = useRef(false);
  const pendingOffers = useRef([]);
  const iceConfig     = useRef(null);          // ← fetched once, reused

  // ── 0. Fetch ICE config (STUN + TURN) from your server ───────────────
  useEffect(() => {
    if (!roomId) return;
    fetch(`${import.meta.env.VITE_SOCKET_URL}/ice-servers`)
      .then((r) => r.json())
      .then((servers) => {
        iceConfig.current = { iceServers: servers };
        console.log("✅ ICE servers loaded:", servers.map((s) => s.urls));
      })
      .catch(() => {
        // Fallback to STUN-only if fetch fails (same-network will still work)
        console.warn("⚠️ Could not fetch ICE servers, falling back to STUN only");
        iceConfig.current = {
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        };
      });
  }, [roomId]);

  // ── 1. Get microphone ─────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;

    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then((stream) => {
        localStream.current = stream;
        streamReady.current = true;

        Object.values(peers.current).forEach((pc) => {
          stream.getTracks().forEach((track) => {
            const alreadyAdded = pc.getSenders().some((s) => s.track === track);
            if (!alreadyAdded) pc.addTrack(track, stream);
          });
        });

        pendingOffers.current.forEach(({ from, offer }) => _handleOffer(from, offer));
        pendingOffers.current = [];
      })
      .catch((err) => console.warn("Mic access denied:", err));

    return () => {
      Object.values(peers.current).forEach((pc) => pc.close());
      Object.values(audioEls.current).forEach((el) => el.remove());
      localStream.current?.getTracks().forEach((t) => t.stop());
      peers.current    = {};
      audioEls.current = {};
    };
  }, [roomId]);

  // ── 2. Signaling ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;

    const onUserJoined = async ({ userId }) => {
      const pc    = _getOrCreatePeer(userId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("rtc-offer", { to: userId, offer });
    };

    const onOffer = ({ from, offer }) => {
      if (!streamReady.current) {
        pendingOffers.current.push({ from, offer });
        return;
      }
      _handleOffer(from, offer);
    };

    const onAnswer = ({ from, answer }) => {
      peers.current[from]
        ?.setRemoteDescription(new RTCSessionDescription(answer))
        .catch(console.error);
    };

    const onIce = ({ from, candidate }) => {
      if (candidate) {
        peers.current[from]
          ?.addIceCandidate(new RTCIceCandidate(candidate))
          .catch(() => {});
      }
    };

    const onUserLeft = ({ userId }) => {
      peers.current[userId]?.close();
      delete peers.current[userId];
      audioEls.current[userId]?.remove();
      delete audioEls.current[userId];
      setMutedPeers((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    };

    socket.on("user-joined-call", onUserJoined);
    socket.on("rtc-offer",        onOffer);
    socket.on("rtc-answer",       onAnswer);
    socket.on("rtc-ice",          onIce);
    socket.on("user-left-call",   onUserLeft);

    return () => {
      socket.off("user-joined-call", onUserJoined);
      socket.off("rtc-offer",        onOffer);
      socket.off("rtc-answer",       onAnswer);
      socket.off("rtc-ice",          onIce);
      socket.off("user-left-call",   onUserLeft);
    };
  }, [roomId]);

  // ── Helpers ───────────────────────────────────────────────────────────
  const _handleOffer = async (from, offer) => {
    const pc = _getOrCreatePeer(from);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("rtc-answer", { to: from, answer });
  };

  const _getOrCreatePeer = (remoteId) => {
    if (peers.current[remoteId]) return peers.current[remoteId];

    // ── Use fetched ICE config (STUN + TURN), fall back if not ready yet ──
    const config = iceConfig.current ?? {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };

    const pc = new RTCPeerConnection(config);
    peers.current[remoteId] = pc;

    if (localStream.current) {
      localStream.current
        .getTracks()
        .forEach((track) => pc.addTrack(track, localStream.current));
    }

    // ── Optional: log ICE connection state for debugging ──────────────
    pc.oniceconnectionstatechange = () => {
      console.log(`ICE [${remoteId}]:`, pc.iceConnectionState);
      // "connected" or "completed" = working
      // "failed" = TURN isn't helping either (check credentials)
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socket.emit("rtc-ice", { to: remoteId, candidate });
    };

    pc.ontrack = ({ streams: [stream] }) => {
      if (audioEls.current[remoteId]) {
        audioEls.current[remoteId].srcObject = stream;
        return;
      }
      const audio         = document.createElement("audio");
      audio.autoplay      = true;
      audio.srcObject     = stream;
      audio.style.display = "none";
      document.body.appendChild(audio);
      audioEls.current[remoteId] = audio;
    };

    return pc;
  };

  const toggleMic = () => {
    const track = localStream.current?.getAudioTracks()[0];
    if (!track) {
      console.warn("toggleMic: no audio track found");
      return;
    }
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  };

  const togglePeerAudio = (userId) => {
    const audio = audioEls.current[userId];
    if (!audio) return;
    audio.muted = !audio.muted;
    setMutedPeers((prev) => ({ ...prev, [userId]: audio.muted }));
  };

  return { micOn, toggleMic, mutedPeers, togglePeerAudio };
}