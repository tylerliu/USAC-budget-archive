import {Backdrop, BackdropProps, Paper, Typography} from "@material-ui/core";
import React from "react";
import MenuIcon from "@material-ui/icons/Menu"
import 'fontsource-roboto';

export default function InstructionBackProp(props: BackdropProps) {
    return (
        <Backdrop style={{zIndex: 10, color: '#fff'}}{...props}>
        </Backdrop>
    )
}
