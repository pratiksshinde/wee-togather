import React, { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import { socket } from '../socket'
import {
  BsFillPlayFill, BsPauseFill,
  BsFullscreen, BsFullscreenExit,
  BsVolumeUpFill, BsVolumeMuteFill
} from "react-icons/bs" // npm install react-icons (already have it)

function Window({ videoUrl, isHost, roomId }) {
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [progress, setProgress] = useState(0)      // 0-100
  const [duration, setDuration] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const hideTimer = useRef(null)

  // ── Load HLS ──
  useEffect(() => {
    if (!videoUrl || !videoRef.current) return
    const video = videoRef.current

    if (Hls.isSupported()) {
      const hls = new Hls()
      hls.loadSource(`${process.env.VITE_SOCKET_URL}${videoUrl}`)
      hls.attachMedia(video)
    }

    // Track duration and progress
    video.onloadedmetadata = () => setDuration(video.duration)
    video.ontimeupdate = () => {
      setProgress((video.currentTime / video.duration) * 100)
    }
    video.onplay = () => setPlaying(true)
    video.onpause = () => setPlaying(false)
  }, [videoUrl])

  // ── Auto-hide controls after 3s of no movement ──
  const resetHideTimer = () => {
    setShowControls(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setShowControls(false), 3000)
  }

  // ── Host controls: emit sync to others ──
  const togglePlay = () => {
    const video = videoRef.current
    if (!isHost) return
    if (video.paused) {
      video.play()
      socket.emit("sync", { roomId, action: "play", time: video.currentTime })
    } else {
      video.pause()
      socket.emit("sync", { roomId, action: "pause", time: video.currentTime })
    }
  }

  const handleSeek = (e) => {
    if (!isHost) return
    const video = videoRef.current
    const newTime = (e.target.value / 100) * video.duration
    video.currentTime = newTime
    socket.emit("sync", { roomId, action: "seek", time: newTime })
  }

  // ── Volume (everyone can control their own) ──
  const handleVolume = (e) => {
    const val = parseFloat(e.target.value)
    setVolume(val)
    videoRef.current.volume = val
    setMuted(val === 0)
  }

  const toggleMute = () => {
    const video = videoRef.current
    video.muted = !video.muted
    setMuted(video.muted)
  }

  // ── Fullscreen ──
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
      setFullscreen(true)
    } else {
      document.exitFullscreen()
      setFullscreen(false)
    }
  }

  // ── Viewer: listen for host sync ──
  useEffect(() => {
    if (isHost) return
    const handler = ({ action, time }) => {
      const video = videoRef.current
      if (!video) return
      video.currentTime = time
      if (action === "play") video.play()
      if (action === "pause") video.pause()
    }
    socket.on("sync", handler)
    return () => socket.off("sync", handler)
  }, [isHost])

  // ── Format time: 83.4 → "1:23" ──
  const fmt = (s) => {
    if (!s || isNaN(s)) return "0:00"
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60).toString().padStart(2, "0")
    return `${m}:${sec}`
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full sm:w-5/6 md:w-3/4 lg:w-180 h-48 sm:h-64 md:h-80 lg:h-100 bg-black rounded-lg sm:rounded-xl md:rounded-2xl overflow-hidden group"
      onMouseMove={resetHideTimer}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Video */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        onClick={togglePlay}
      />

      {/* Controls overlay — fades in/out */}
      <div className={`absolute bottom-0 left-0 right-0 px-2 sm:px-3 md:px-4 pb-2 sm:pb-3 md:pb-4 pt-6 sm:pt-8 md:pt-10
        bg-gradient-to-t from-black/90 to-transparent
        transition-opacity duration-300
        ${showControls ? "opacity-100" : "opacity-0"}`}
      >

        {/* Progress bar — only host can seek */}
        <input
          type="range" min="0" max="100" step="0.1"
          value={progress}
          onChange={handleSeek}
          disabled={!isHost}
          className={`w-full h-0.5 sm:h-1 mb-2 sm:mb-3 rounded-full appearance-none outline-none
            bg-white/20 accent-red-500
            ${isHost ? "cursor-pointer" : "cursor-default"}`}
        />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 w-full sm:w-auto">

            {/* Play/Pause — host only */}
            <button
              onClick={togglePlay}
              disabled={!isHost}
              className={`text-white text-lg sm:text-xl md:text-2xl transition flex-shrink-0
                ${isHost ? "hover:text-red-400 cursor-pointer" : "opacity-30 cursor-default"}`}
            >
              {playing ? <BsPauseFill /> : <BsFillPlayFill />}
            </button>

            {/* Volume — everyone */}
            <button onClick={toggleMute} className="text-white text-base sm:text-lg md:text-xl hover:text-red-400 cursor-pointer flex-shrink-0">
              {muted || volume === 0 ? <BsVolumeMuteFill /> : <BsVolumeUpFill />}
            </button>
            <input
              type="range" min="0" max="1" step="0.05"
              value={muted ? 0 : volume}
              onChange={handleVolume}
              className="w-12 sm:w-16 md:w-20 accent-red-500 cursor-pointer flex-shrink-0"
            />

            {/* Time */}
            <span className="text-white/70 text-xs sm:text-sm md:text-base whitespace-nowrap">
              {fmt(videoRef.current?.currentTime)} / {fmt(duration)}
            </span>

          </div>

          {/* Fullscreen — everyone */}
          <button onClick={toggleFullscreen} className="text-white text-base sm:text-lg md:text-xl hover:text-red-400 cursor-pointer flex-shrink-0">
            {fullscreen ? <BsFullscreenExit /> : <BsFullscreen />}
          </button>
        </div>
      </div>

      {/* Big play button in center when paused */}
      <button
  onClick={togglePlay}
  disabled={!isHost}
  title={!isHost ? "Only host can control playback" : ""}
  className={`text-white text-2xl transition
    ${isHost ? "hover:text-red-400 cursor-pointer" : "opacity-30 cursor-not-allowed"}`}
>
  {playing ? <BsPauseFill /> : <BsFillPlayFill />}
</button>

// Seek bar — block viewer clicks:
<input
  type="range" min="0" max="100" step="0.1"
  value={progress}
  onChange={handleSeek}
  disabled={!isHost}
  className={`w-full h-1 mb-3 rounded-full appearance-none outline-none
    bg-white/20 accent-red-500
    ${isHost ? "cursor-pointer" : "cursor-not-allowed opacity-40"}`}
/>

      {/* Viewer badge */}
      {!isHost && (
        <div className="absolute top-3 right-3 text-xs text-white/50 bg-black/50 px-3 py-1 rounded-full">
           Viewer — host controls playback
        </div>
      )}
    </div>
  )
}

export default Window