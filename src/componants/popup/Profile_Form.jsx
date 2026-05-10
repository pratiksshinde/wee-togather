import React, { useState } from 'react'
import { IoExit } from "react-icons/io5";
import { IoIosMic, IoIosMicOff } from "react-icons/io";
import { HiSpeakerWave, HiSpeakerXMark } from "react-icons/hi2";
import { IoClose } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import { socket } from "../../socket";
import { useRoomStore } from "../../zustand/useRoomStore";

function Profile_Form({ code, onClose }) {
  const [micOn, setMicOn]         = useState(true)
  const [speakerOn, setSpeakerOn] = useState(true)
  const navigate                  = useNavigate()
  const [displayName, setDisplayName] = useState("");

  // ── room-users is now handled in Stream.jsx ───────────────────────────
  // Profile_Form unmounts immediately after navigation, so its socket
  // listener would die before any useful update. Stream.jsx owns that
  // listener for the full session duration.

  const join = () => {
    if (!displayName.trim()) {
      alert("Please enter your display name");
      return;
    }
    socket.emit("join-room", { roomId: code, userName: displayName });
    if (code.length === 4) {
      navigate(`/Stream/${code}`);
    }
  };

  return (
    <div className="absolute top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 flex flex-col items-end gap-3">
      <button
        onClick={onClose}
        className="flex items-center justify-center w-10 h-10 rounded-full border border-red-500/30 bg-black/80 text-gray-400 backdrop-blur-xl transition-all hover:border-red-500 hover:text-white hover:shadow-[0_0_20px_rgba(255,0,0,0.4)] cursor-pointer"
      >
        <IoClose className="text-xl" />
      </button>

      <div className="w-[650px] overflow-hidden rounded-[35px] border border-red-500/30 bg-black/80 shadow-[0_0_60px_rgba(255,0,0,0.25)] backdrop-blur-xl relative">

        <div className="absolute -top-39 left-1/2 h-32 w-[120%] -translate-x-1/2 rounded-full border-t-4 border-red-500 shadow-[0_-10px_60px_rgba(255,0,0,0.8)]"></div>

        <div className="relative z-10 flex flex-col gap-8 p-10">

          <div className="text-center">
            <h2 className="text-4xl font-bold text-white">
              Join Room {code}
            </h2>
            <p className="mt-3 text-gray-400">
              Set your profile before entering the watch party
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-gray-300 text-lg">Display Name</label>
            <input
              type="text"
              placeholder="Enter your name"
              className="w-full cursor-pointer rounded-2xl border border-red-500/20 bg-white/5 px-5 py-4 text-white outline-none transition-all placeholder:text-gray-500 focus:border-red-500 focus:shadow-[0_0_20px_rgba(255,0,0,0.4)]"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => setMicOn(!micOn)}
              className={`flex items-center cursor-pointer gap-3 rounded-2xl border px-6 py-4 transition-all ${
                micOn
                  ? "border-gray-500/30 bg-gray-500/10 text-gray-400"
                  : "border-red-500/30 bg-red-500/10 text-red-400"
              }`}
            >
              {micOn ? <IoIosMic className="text-3xl" /> : <IoIosMicOff className="text-3xl" />}
              <span className="text-lg font-medium">{micOn ? "Mic On" : "Mic Off"}</span>
            </button>

            <button
              onClick={() => setSpeakerOn(!speakerOn)}
              className={`flex items-center gap-3 cursor-pointer rounded-2xl border px-6 py-4 transition-all ${
                speakerOn
                  ? "border-gray-500/30 bg-gray-500/10 text-gray-400"
                  : "border-red-500/30 bg-red-500/10 text-red-400"
              }`}
            >
              {speakerOn ? <HiSpeakerWave className="text-3xl" /> : <HiSpeakerXMark className="text-3xl" />}
              <span className="text-lg font-medium">{speakerOn ? "Speaker On" : "Speaker Off"}</span>
            </button>
          </div>

          <button
            onClick={join}
            className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl bg-red-600 py-4 text-xl font-semibold text-white shadow-[0_0_30px_rgba(255,0,0,0.5)] transition-all hover:bg-red-500"
          >
            <IoExit className="text-2xl" />
            Join Room
          </button>

        </div>
      </div>
    </div>
  )
}

export default Profile_Form