import React, { useState, useEffect } from 'react'
import Navbar from '../componants/Navbar'
import bgImage from "../assets/background/bg2.jpg"
import Upload from '../componants/popup/Upload'
import Window from '../componants/Window'
import { IoIosMic, IoIosMicOff } from "react-icons/io"
import { HiSpeakerWave, HiSpeakerXMark } from "react-icons/hi2"
import { useRoomStore } from '../zustand/useRoomStore'
import { useParams } from 'react-router-dom'
import { useVoiceCall } from '../hooks/useVoiceCall'
import { socket } from '../socket'

function Stream() {
  const setIsHost = useRoomStore((state) => state.setIsHost)
  const isHost    = useRoomStore((state) => state.isHost)
  const users     = useRoomStore((state) => state.users)
  const setUsers  = useRoomStore((state) => state.setUsers)

  const { portal: roomId } = useParams()
  const [videoUrl, setVideoUrl] = useState(null)

  const { micOn, toggleMic, mutedPeers, togglePeerAudio } = useVoiceCall(roomId)

  // ── FIX: room-users listener lives here, not in Profile_Form ──────────
  // Profile_Form unmounts after navigation so its listener dies.
  // This one stays alive for the entire session in the room.
  // It also fires on every join/leave, keeping the list fresh.
  useEffect(() => {
    const handler = (updatedUsers) => setUsers(updatedUsers)
    socket.on("room-users", handler)
    return () => socket.off("room-users", handler)
  }, [setUsers])

  // ── Filter self out of the users list ─────────────────────────────────
  // The server broadcasts ALL users including the current socket, so
  // socket.id is used to remove "you" from the "others" list.
  const otherUsers = users.filter((u) => u.id !== socket.id)

  return (
    <div
      className="min-h-screen bg-cover bg-no-repeat bg-center"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <Navbar />
      <div className="flex flex-col justify-center items-center min-h-screen bg-black/50">

        {!videoUrl ? (
          <div className="-mt-20 sm:-mt-32 md:-mt-49 w-full sm:w-3/4 md:w-180 px-4 sm:px-6 flex flex-col justify-center items-center text-center">
            <Upload
              roomId={roomId}
              onReady={(url, isUploader) => {
                setIsHost(isUploader)
                setVideoUrl(url)
              }}
            />
          </div>

        ) : (
          <div className="text-white text-lg sm:text-xl md:text-2xl -mt-32 sm:-mt-56 md:-mt-94 w-full sm:w-3/4 md:w-180 px-4 sm:px-6 flex flex-col justify-center items-center text-center">
            <Window
              videoUrl={videoUrl}
              isHost={isHost}
              roomId={roomId}
            />

            {/* ── Members sidebar ──────────────────────────────────────── */}
            <div className="absolute right-1 sm:right-2 md:right-4 p-2 sm:p-3 md:p-5 rounded max-h-[40vh] sm:max-h-[45vh] md:max-h-[50vh] overflow-y-auto top-16 sm:top-20 md:top-32 flex flex-col gap-2 sm:gap-3">
              <p className="text-gray-500 text-xs sm:text-sm mb-1">In this room</p>

              {/* ── YOU — mic toggle ──────────────────────────────────── */}
              <button
                onClick={toggleMic}
                title={micOn ? "Click to mute yourself" : "Click to unmute yourself"}
                className={`flex items-center gap-1 sm:gap-2 md:gap-3 border px-2 sm:px-3 md:px-5 py-1 sm:py-2 text-xs sm:text-sm md:text-lg rounded-full cursor-pointer transition-all
                  ${micOn
                    ? "border-red-500/30 text-white/70 hover:border-red-500/60"
                    : "border-red-500/60 text-red-400/80 opacity-70"
                  }`}
              >
                {micOn
                  ? <IoIosMic    className="text-green-400 text-lg sm:text-xl md:text-2xl" />
                  : <IoIosMicOff className="text-red-400   text-lg sm:text-xl md:text-2xl" />
                }
                <span className="hidden sm:inline">You</span>
                {!micOn && <span className="text-xs text-red-400/70">(muted)</span>}
              </button>

              {/* ── OTHER USERS — speaker toggle ──────────────────────── */}
              {otherUsers.map((user) => {
                const isMuted = !!mutedPeers[user.id]
                return (
                  <button
                    key={user.id}
                    onClick={() => togglePeerAudio(user.id)}
                    title={isMuted ? `Unmute ${user.name}` : `Mute ${user.name} for yourself`}
                    className={`flex items-center gap-1 sm:gap-2 md:gap-3 border px-2 sm:px-3 md:px-5 py-1 sm:py-2 text-xs sm:text-sm md:text-lg rounded-full cursor-pointer transition-all
                      ${isMuted
                        ? "border-red-500/60 text-red-400/80 opacity-70"
                        : "border-gray-700 text-white/50 hover:border-gray-500"
                      }`}
                  >
                    {isMuted
                      ? <HiSpeakerXMark className="text-red-400   text-sm sm:text-base md:text-xl" />
                      : <HiSpeakerWave  className="text-green-400 text-sm sm:text-base md:text-xl" />
                    }
                    <span className="hidden sm:inline max-w-[60px] truncate">{user.name}</span>
                    {isMuted && <span className="text-xs text-red-400/70">(muted)</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default Stream