import React, { useState, useEffect } from 'react'
import { socket } from '../../socket'

const CHUNK_SIZE = 5 * 1024 * 1024

function Upload({ roomId, onReady }) {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState("idle")
  const [iAmUploading, setIAmUploading] = useState(false) // ← track if THIS user uploaded

  const handleFileChange = async (e) => {
  const file = e.target.files[0]
  if (!file) return

  // Get extension: "video/x-matroska" → "mkv", "video/mp4" → "mp4"
  const fileExt = file.name.split(".").pop().toLowerCase() // "mkv" or "mp4"

  setIAmUploading(true)
  setStatus("uploading")
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)

  for (let i = 0; i < totalChunks; i++) {
    const chunk = file.slice(i * CHUNK_SIZE, Math.min((i + 1) * CHUNK_SIZE, file.size))
    const formData = new FormData()
    formData.append("chunk", chunk)
    formData.append("roomId", roomId)
    formData.append("index", i)
    formData.append("totalChunks", totalChunks)
    formData.append("fileExt", fileExt) // ← send this so server knows MKV vs MP4

    await fetch("http://localhost:3000/upload-chunk", { method: "POST", body: formData })
    setProgress(Math.round(((i + 1) / totalChunks) * 100))
  }

  setStatus("processing")
  setProgress(0)
}

  useEffect(() => {
    socket.on("video-status", ({ status: s, percent, url }) => {
      if (s === "processing") {
        setStatus("processing")
        setProgress(percent || 0)
      }
      if (s === "ready") {
        setStatus("ready")
        // ✅ Only the uploader becomes host — everyone else is viewer
        onReady(url, iAmUploading)
      }
    })
    return () => socket.off("video-status")
  }, [iAmUploading]) // ← iAmUploading in deps so closure gets latest value

  return (
    <div className="flex flex-col items-center gap-6 text-white">
      <h2 className="text-2xl font-bold text-white">Upload a Movie</h2>
      <p className="text-gray-400 text-sm">Others will join once video is ready</p>

      {status === "idle" && (
        <label className="cursor-pointer px-10 py-5 rounded-2xl border border-red-500/30 bg-white/5 hover:border-red-500 transition-all text-lg">
          Choose Movie File
          <input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
        </label>
      )}

      {(status === "uploading" || status === "processing") && (
        <div className="flex flex-col items-center gap-3 w-80">
          <p className="text-gray-400">
            {status === "uploading" ? `⬆️ Uploading... ${progress}%` : `⚙️ Processing... ${progress}%`}
          </p>
          <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${status === "uploading" ? "bg-red-500" : "bg-yellow-500"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {status === "ready" && <p className="text-green-400 text-xl">✅ Video ready!</p>}
    </div>
  )
}

export default Upload