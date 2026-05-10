import React, { useRef, useState } from 'react'
import Navbar from '../componants/Navbar'
import bgImage from "../assets/background/bg1.jpg"
import Profile_Form from '../componants/popup/Profile_Form'

function Home() {

    const [code, setCode] = useState(["", "", "", ""])
    const inputs = useRef([])
    const [profileOpen, setProfileOpen] = useState(false);

    const handleJoinClick = () => {
    inputs.current[0]?.focus();
    };
    const handleChange = (value, index) => {
    if (!/^\d?$/.test(value)) return
    const updatedCode = [...code]
    updatedCode[index] = value
    setCode(updatedCode)
    if (value && index < 3) {
        inputs.current[index + 1].focus()
    }
     const joinedCode = updatedCode.join("")
     if(joinedCode.length===4){
        setProfileOpen(true);
     }
    }
    const handleKeyDown = (e, index) => {
    if (
        e.key === "Backspace" &&
        !code[index] &&
        index > 0
    ) {
        inputs.current[index - 1].focus()
    }
    }
  return (
    <div className="min-h-screen bg-cover bg-no-repeat bg-center"
      style={{
        backgroundImage: `url(${bgImage})`,
      }}>
        <Navbar onJoinClick={handleJoinClick} />
    <div    
      className="flex flex-col justify-center items-center min-h-screen bg-black/50"
    >
     

      <div className="flex flex-col justify-center items-center min-h-screen">
        <div className="p-8 -mt-98 w-180 flex flex-col justify-center items-center text-center">
            <h1 className='text-white bold text-6xl'>
                Create a Room. Start Watching Together.
            </h1>
            <p className="text-gray-300 text-lg mt-5 text-center max-w-lg">
            Create private streaming rooms and enjoy movies in perfect sync with friends in real time.
            </p>
            <div className="flex gap-4 mt-14">

            {code.map((digit, index) => (

                <input
                key={index}
                ref={(el) => (inputs.current[index] = el)}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) =>
                    handleChange(e.target.value, index)
                }
                onKeyDown={(e) =>
                    handleKeyDown(e, index)
                }
                className="w-16 h-18 cursor-pointer rounded-2xl bg-white/10 border border-red-500/40 text-white text-3xl text-center outline-none backdrop-blur-md focus:border-red-500 focus:shadow-[0_0_20px_rgba(255,0,0,0.8)] transition-all"
                />
            ))}

            </div>
        </div>
      <div className="absolute bottom-0 left-0 w-full self-end h-40 border-t-4 border-red-500 bg-transparent rounded-t-[50%] shadow-[0_-15px_50px_rgba(255,0,0,0.9)] bg-black">
</div>
      </div>
    </div>

            {profileOpen && <Profile_Form code={code.join("")} onClose={() => {setProfileOpen(false);  setCode(["","","",""])   }} />}
    </div>
  )
}

export default Home