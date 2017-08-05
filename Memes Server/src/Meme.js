//Holds one meme

import React, { Component } from 'react';

const wholeDivS = {margin: '10px', clear:'both', backgroundColor:'#ddd',
    overflow:'hidden' //temp fix for div size
    };

const left = {float:'left', padding: '10px'};

const right = {float:'left', padding: '10px', width:'75%'};

const paraS = {margin:'0', padding:'10px', paddingTop:'0px'};

const imgS = {height:'300px'};


class Meme extends Component{
    constructor(props){
        super(props);
    }

    render(){
        let image = '';
        if(this.props.full_picture){
            image = <img
                        style = {imgS}
                        src = {this.props.full_picture}
                        alt = {"No image provided."}
                    />
        }
        return(
            <div style={wholeDivS}>
                <div style={left}>
                    {this.props.likes}
                </div>

                <div  style={right}>
                    <p style={paraS}>
                        {this.props.message}
                    </p>
                    {image}
                </div>
                
            </div>
        );
    }

}

export default Meme;