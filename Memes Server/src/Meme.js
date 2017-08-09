//Holds one meme

import React, { Component } from 'react';

const wholeDivS = {margin: '10px', clear:'both', backgroundColor:'#eee',
    overflow:'hidden' //temp fix for div size
    };

const left = {float:'left', padding: '20px'};

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
                        alt = {"No meme provided."}
                    />
        }
        
        let today = new Date();
        let postDT = this.props.created_time.split('.')[0].split('T');
        let postDate = postDT[0].split('-');
        let postTime = postDT[1].split(':');

        //UTC date construction needs a month on 0 based indexing
        let postActualDate = new Date(Date.UTC(postDate[0], postDate[1]-1, postDate[2], postTime[0], postTime[1], postTime[2]));

        var stringDiff = '';
        let diffHours = Math.round((today - postActualDate)/3600000);
        if(diffHours <= 24) stringDiff = diffHours + ' hours ago'
        
        let link = 'https://www.facebook.com/' + this.props.id;

        return(
            <div style={wholeDivS}>
                <div style={left}>
                    <b>{this.props.likes}</b>
                </div>

                <div  style={right}>
                    <span>
                        <a href={link} rel='noopener noreferrer' target='_blank'>Open in Facebook</a>
                        
                    </span>
                    <p style={paraS}>
                        {this.props.message}
                    </p>
                    <span>{stringDiff}</span>
                    <br/>
                    <span>{postActualDate.toString()}</span>
                    <div style={{clear:'both'}}>
                        {image}
                    </div>
                </div>
                
            </div>
        );
    }

}

export default Meme;