import React, { useState } from "react";
import { monaco } from "../Editor/customMocaco";

const DarkMode = () => {
    const setDarkMode = () => {
        document.querySelector('body').setAttribute('data-theme', 'dark')
    }
    const setLigthMode = () => {
        document.querySelector('body').setAttribute('data-theme', 'light')
    }
    const [toggle, setToggle] = useState(true);
    function Light() {
        return (
            <>
                <i onClick={toggler} class="bi bi-moon-stars-fill" style={{ fontSize: "1em", color: "#00AEC7" }}></i>
            </>
        )

    }
    function Dark() {
        return (
            <>
                <i onClick={toggler} class="bi bi-brightness-high-fill" style={{ fontSize: "1em", color: "#00AEC7" }}></i>
            </>
        )

    }
    const toggler = () => {
        if (toggle) {
            setToggle(false)
            setDarkMode()
            monaco.editor.setTheme('vs-dark');
        } else {
            setToggle(true)
            setLigthMode()
            monaco.editor.setTheme('vs-light');
        }
    }
    return (
        <div className='dark_mode'>
            {
                toggle ? <Light /> : <Dark />
            }
        </div>
    );
};

export default DarkMode;
