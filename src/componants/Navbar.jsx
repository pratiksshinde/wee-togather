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
        <nav className="navbar h-26 bg-black/50 text-red-500 flex items-center justify-between px-24">
            <img src={logo} height="40" alt="Logo" className="h-70 w-fit" /> 
            <ul className="flex space-x-4">
                
                <span className={`flex gap-2 rounded-full items-center`}>

                <button onClick={onJoinClick} className="select-none outline-none focus:outline-none px-4 py-2 bg-red-800 cursor-pointer text-white rounded hover:bg-red-600 transition">
                    {(!portal) ? "Join Stream" : "PORT :"+portal}
                </button>

                {(portal) && 
                <button onClick={onExitClick} className="select-none outline-none focus:outline-none px-4  py-2 bg-red-800 cursor-pointer text-white rounded hover:bg-red-600 transition">
                    <IoExit className='text-2xl' />
                </button>
                }
                </span>
                
            </ul>
        </nav>
  )
}

export default Navbar