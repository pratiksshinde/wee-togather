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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 sm:p-6">
      <button
        onClick={onClose}
        className="absolute top-4 sm:top-6 right-4 sm:right-6 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-red-500/30 bg-black/80 text-gray-400 backdrop-blur-xl transition-all hover:border-red-500 hover:text-white hover:shadow-[0_0_20px_rgba(255,0,0,0.4)] cursor-pointer z-10"
      >
        <IoClose className="text-lg sm:text-xl" />
      </button>

      <div className="w-full sm:w-5/6 md:w-[600px] lg:w-[650px] max-h-[90vh] overflow-y-auto overflow-hidden rounded-2xl sm:rounded-3xl md:rounded-[35px] border border-red-500/30 bg-black/80 shadow-[0_0_60px_rgba(255,0,0,0.25)] backdrop-blur-xl relative">

        <div className="absolute -top-24 sm:-top-28 md:-top-39 left-1/2 h-20 sm:h-24 md:h-32 w-[120%] -translate-x-1/2 rounded-full border-t-4 border-red-500 shadow-[0_-10px_60px_rgba(255,0,0,0.8)]"></div>

        <div className="relative z-10 flex flex-col gap-4 sm:gap-6 md:gap-8 p-4 sm:p-6 md:p-10">

          <div className="text-center">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-snug">
              Join Room {code}
            </h2>
            <p className="mt-2 sm:mt-3 text-xs sm:text-sm md:text-base text-gray-400">
              Set your profile before entering the watch party
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:gap-3">
            <label className="text-gray-300 text-sm sm:text-base md:text-lg">Display Name</label>
            <input
              type="text"
              placeholder="Enter your name"
              className="w-full cursor-pointer rounded-2xl border border-red-500/20 bg-white/5 px-3 sm:px-4 md:px-5 py-2 sm:py-3 md:py-4 text-sm sm:text-base text-white outline-none transition-all placeholder:text-gray-500 focus:border-red-500 focus:shadow-[0_0_20px_rgba(255,0,0,0.4)]"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 md:gap-6">
            <button
              onClick={() => setMicOn(!micOn)}
              className={`w-full sm:w-auto flex items-center cursor-pointer gap-2 sm:gap-3 rounded-2xl border px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-xs sm:text-sm md:text-lg transition-all ${
                micOn
                  ? "border-gray-500/30 bg-gray-500/10 text-gray-400"
                  : "border-red-500/30 bg-red-500/10 text-red-400"
              }`}
            >
              {micOn ? <IoIosMic className="text-xl sm:text-2xl md:text-3xl" /> : <IoIosMicOff className="text-xl sm:text-2xl md:text-3xl" />}
              <span className="font-medium">{micOn ? "Mic On" : "Mic Off"}</span>
            </button>

            <button
              onClick={() => setSpeakerOn(!speakerOn)}
              className={`w-full sm:w-auto flex items-center gap-2 sm:gap-3 cursor-pointer rounded-2xl border px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-xs sm:text-sm md:text-lg transition-all ${
                speakerOn
                  ? "border-gray-500/30 bg-gray-500/10 text-gray-400"
                  : "border-red-500/30 bg-red-500/10 text-red-400"
              }`}
            >
              {speakerOn ? <HiSpeakerWave className="text-xl sm:text-2xl md:text-3xl" /> : <HiSpeakerXMark className="text-xl sm:text-2xl md:text-3xl" />}
              <span className="font-medium">{speakerOn ? "Speaker On" : "Speaker Off"}</span>
            </button>
          </div>

          <button
            onClick={join}
            className="flex cursor-pointer items-center justify-center gap-2 sm:gap-3 rounded-2xl bg-red-600 py-2 sm:py-3 md:py-4 px-4 sm:px-6 text-sm sm:text-base md:text-xl font-semibold text-white shadow-[0_0_30px_rgba(255,0,0,0.5)] transition-all hover:bg-red-500 w-full"
          >
            <IoExit className="text-lg sm:text-xl md:text-2xl" />
            Join Room
          </button>

        </div>
      </div>
    </div>
  )
}

export default Profile_Form