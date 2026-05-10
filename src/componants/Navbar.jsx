import React from 'react'
import "../App.css"
import logo from "../assets/logo.png"
import {Link , useParams} from "react-router-dom"
import { IoExit } from "react-icons/io5";
import { socket } from "../socket";
function Navbar({onJoinClick}) {
    const params = useParams();
    const portal = params.portal;
    const onExitClick = () => {
        window.location.href = "/"
        socket.disconnect();
    }
  return (
        <nav className="navbar h-16 sm:h-20 md:h-26 bg-black/50 text-red-500 flex items-center justify-between px-4 sm:px-8 md:px-24">
            <img src={logo} height="40" alt="Logo" className="h-8 sm:h-10 md:h-12 w-fit" /> 
            <ul className="flex space-x-2 sm:space-x-3 md:space-x-4">
                
                <span className={`flex gap-1 sm:gap-2 rounded-full items-center`}>

                <button onClick={onJoinClick} className="select-none outline-none focus:outline-none px-2 sm:px-3 md:px-4 py-1 sm:py-2 bg-red-800 cursor-pointer text-white text-xs sm:text-sm md:text-base rounded hover:bg-red-600 transition">
                    {(!portal) ? "Join Stream" : "PORT :" + portal}
                </button>

                {(portal) && 
                <button onClick={onExitClick} className="select-none outline-none focus:outline-none px-2 sm:px-3 md:px-4 py-1 sm:py-2 bg-red-800 cursor-pointer text-white rounded hover:bg-red-600 transition">
                    <IoExit className='text-lg sm:text-xl md:text-2xl' />
                </button>
                }
                </span>
                
            </ul>
        </nav>
  )
}

export default Navbar