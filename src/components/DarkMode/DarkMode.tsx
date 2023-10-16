import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faToggleOn } from "@fortawesome/free-solid-svg-icons/faToggleOn";
import { faToggleOff } from "@fortawesome/free-solid-svg-icons";
import { monaco } from "../Editor/customMocaco";

const DarkMode = () => {
    const setDarkMode = () => {
        document.querySelector('body').setAttribute('data-theme', 'dark')
    }
    const setLigthMode = () => {
        document.querySelector('body').setAttribute('data-theme', 'light')
    }
    const [toggle, setToggle] = useState(true);
    const toggler = () => {
        if (toggle) {
            setToggle(false)
            setDarkMode()
            monaco.editor.setTheme('vs-dark');
            console.log(document.body.getAttribute('data-theme'));
        } else {
            setToggle(true)
            setLigthMode()
            monaco.editor.setTheme('vs-light');
        }

    }
    return (
        <div className='dark_mode'>
            {
                toggle ?
                    <FontAwesomeIcon onClick={toggler} icon={faToggleOff} size="xl" style={{ color: "#00AEC7", }} /> :
                    <FontAwesomeIcon onClick={toggler} icon={faToggleOn} size="xl" style={{ color: "#00AEC7", }} />
            }
        </div>
    );
};

export default DarkMode;
