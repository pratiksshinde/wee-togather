import { useEffect, useRef, useState } from "react";
import { socket } from "../socket";

const ICE_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function useVoiceCall(roomId) {
  const [micOn, setMicOn]           = useState(true);
  const [mutedPeers, setMutedPeers] = useState({}); // { [socketId]: bool }

  const localStream   = useRef(null);
  const peers         = useRef({});
  const audioEls      = useRef({});
  const streamReady   = useRef(false);
  const pendingOffers = useRef([]);

  // ── 1. Get microphone ─────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;

    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then((stream) => {
        localStream.current = stream;
        streamReady.current = true;

        // ✅ FIX: if any peer connection was created before the mic was ready
        // (getUserMedia is async, peers can arrive in the meantime),
        // add the tracks now so those connections actually carry audio.
        Object.values(peers.current).forEach((pc) => {
          stream.getTracks().forEach((track) => {
            // addTrack throws if the track is already added — guard it
            const alreadyAdded = pc.getSenders().some((s) => s.track === track);
            if (!alreadyAdded) pc.addTrack(track, stream);
          });
        });

        // Drain offers that arrived before the mic was ready
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

    const pc = new RTCPeerConnection(ICE_CONFIG);
    peers.current[remoteId] = pc;

    // Add tracks if stream is already available; otherwise the getUserMedia
    // .then() above will add them once it resolves.
    if (localStream.current) {
      localStream.current
        .getTracks()
        .forEach((track) => pc.addTrack(track, localStream.current));
    }

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

  // ── Public API ────────────────────────────────────────────────────────

  /**
   * Mute / unmute YOUR microphone.
   * Sets track.enabled = false which makes the track send silence to all peers.
   */
  const toggleMic = () => {
    const track = localStream.current?.getAudioTracks()[0];
    if (!track) {
      console.warn("toggleMic: no audio track found — mic may still be loading");
      return;
    }
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  };

  /**
   * Mute / unmute a SPECIFIC peer's audio — local only.
   * Sets audio.muted on their hidden <audio> element.
   * The other person is unaware; everyone else still hears them.
   */
  const togglePeerAudio = (userId) => {
    const audio = audioEls.current[userId];
    if (!audio) return;
    audio.muted = !audio.muted;
    setMutedPeers((prev) => ({ ...prev, [userId]: audio.muted }));
  };

  return { micOn, toggleMic, mutedPeers, togglePeerAudio };
}