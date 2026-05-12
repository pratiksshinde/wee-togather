import { useEffect, useRef, useState } from "react";
import { socket } from "../socket";

export function useVoiceCall(roomId) {
  const [micOn, setMicOn]           = useState(true);
  const [mutedPeers, setMutedPeers] = useState({});

  const localStream      = useRef(null);
  const peers            = useRef({});
  const audioEls         = useRef({});
  const streamReady      = useRef(false);
  const pendingOffers    = useRef([]);
  const iceConfig        = useRef(null);
  const iceConfigReady   = useRef(false);
  const pendingPeerCalls = useRef([]); // { userId } waiting for ICE config

  // ── 0. Fetch ICE config (STUN + TURN) from your server ───────────────
  useEffect(() => {
    if (!roomId) return;

    fetch(`${import.meta.env.VITE_SOCKET_URL}/ice-servers`)
      .then((r) => r.json())
      .then((servers) => {
        iceConfig.current      = { iceServers: servers };
        iceConfigReady.current = true;
        console.log("✅ ICE servers loaded:", servers.map((s) => s.urls));

        // Flush any peers that tried to connect before ICE config was ready
        pendingPeerCalls.current.forEach(({ userId }) => {
          _createOfferForPeer(userId);
        });
        pendingPeerCalls.current = [];
      })
      .catch(() => {
        console.warn("⚠️ Could not fetch ICE servers, falling back to STUN only");
        iceConfig.current      = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
        iceConfigReady.current = true;

        // Still flush pending peers even on fallback
        pendingPeerCalls.current.forEach(({ userId }) => {
          _createOfferForPeer(userId);
        });
        pendingPeerCalls.current = [];
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

        // Add track to any peers already created
        Object.values(peers.current).forEach((pc) => {
          stream.getTracks().forEach((track) => {
            const alreadyAdded = pc.getSenders().some((s) => s.track === track);
            if (!alreadyAdded) pc.addTrack(track, stream);
          });
        });

        // Handle offers that arrived before mic was ready
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

    const onUserJoined = ({ userId }) => {
      // If ICE config hasn't loaded yet, queue this peer and handle it once ready
      if (!iceConfigReady.current) {
        pendingPeerCalls.current.push({ userId });
        return;
      }
      _createOfferForPeer(userId);
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

  // Separated into its own function so both onUserJoined and the flush loop can call it
  const _createOfferForPeer = async (userId) => {
    const pc    = _getOrCreatePeer(userId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("rtc-offer", { to: userId, offer });
  };

  const _handleOffer = async (from, offer) => {
    const pc = _getOrCreatePeer(from);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("rtc-answer", { to: from, answer });
  };

  const _getOrCreatePeer = (remoteId) => {
    if (peers.current[remoteId]) return peers.current[remoteId];

    // ICE config is guaranteed ready here — either real TURN+STUN or STUN fallback
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

    // Log ICE state for debugging — "relay" candidates = TURN is working
    pc.oniceconnectionstatechange = () => {
      console.log(`ICE [${remoteId}]:`, pc.iceConnectionState);
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        console.log(`ICE candidate type for [${remoteId}]:`, candidate.type);
        // If you see "relay" here across networks → TURN is working ✅
        // If you only see "host" / "srflx" and call fails → TURN credentials issue
        socket.emit("rtc-ice", { to: remoteId, candidate });
      }
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