//Holds all of the memes
import React, { Component } from 'react';
import Meme from './Meme.js';

import axios from 'axios';

// const tempData =
// {
// "data":[{"id":1697460986976046,"message":"http://eoto.tech/report-google-acquire-snapchat-snap-2016/\n\nWTF! $30 BILLION!!! :o","created_time":"2017-08-03T23:52:56.000Z","likes":20,"from_id":1480572802004561,"type":"link","full_picture":"https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png"},{"id":1697367703652041,"message":"Obviously a different type of hackers, but really interesting analysis: ","created_time":"2017-08-03T22:19:04.000Z","likes":7,"from_id":10154487140621612,"type":"link","full_picture":""},{"id":1697381863650625,"message":"WannaCry hero arrested by FBI and the bitcoin wallets that were used emptied... Very curious to see what's going on here\n\nhttp://www.reuters.com/article/us-usa-cyber-arrest-idUSKBN1AJ2IC\n\nhttp:/…ney.cnn.com/2017/08/03/technology/wannacry-bitcoin-ransom-moved/index.html","created_time":"2017-08-03T22:35:06.000Z","likes":6,"from_id":10156405304254992,"type":"link","full_picture":""},{"id":1697420970313381,"message":null,"created_time":"2017-08-03T23:12:04.000Z","likes":6,"from_id":1882236665439129,"type":"link","full_picture":""},{"id":1697321573656654,"message":"Will be taking a webinar on \"Introduction to Decentralized Applications\" on 13th August.\nInterested ones can fill the form.\nForm Link : ","created_time":"2017-08-03T21:23:32.000Z","likes":3,"from_id":1386247811423662,"type":"link","full_picture":""},{"id":1697428180312660,"message":"GrizzHacks is up there on my list of hype hackathons!\n\nRegistration is now open, so check them out and apply!\nhttp://grizzhacks.com/\n\nIf you're interested in sponsoring, email grizzhacksou@gmail.com!","created_time":"2017-08-03T23:22:18.000Z","likes":3,"from_id":1593432327341785,"type":"link","full_picture":""},{"id":1697409600314518,"message":null,"created_time":"2017-08-03T22:57:01.000Z","likes":3,"from_id":10209442623893512,"type":"link","full_picture":""},{"id":1697341363654675,"message":"Which one? Tensorflow or AWS-ML?","created_time":"2017-08-03T21:50:01.000Z","likes":1,"from_id":10159038747275336,"type":"status","full_picture":""},{"id":1697374260318052,"message":"Does anyone have any experience with payment processors that can be easily integrated into mobile? Paypal, Stripe, etc. Looking to pick brains on a couple key issues. Ease of use and implementation (and low fees!) are top priorities","created_time":"2017-08-03T22:28:23.000Z","likes":0,"from_id":10155542255644244,"type":"status","full_picture":""},{"id":1697386940316784,"message":"Downtime cost businesses an estimated $1.7 trillion each year. Think about it, is your company safe? #jamesbondIT #shadowIT #IT #computers #hacking #cynexlink","created_time":"2017-08-03T22:38:39.000Z","likes":0,"from_id":10213958601108596,"type":"link","full_picture":""},{"id":1697512776970867,"message":"Where were you when Appirio gave out 500 personal emails (including a group of people who were never even interviewed)","created_time":"2017-08-04T00:38:39.000Z","likes":0,"from_id":10213636253409204,"type":"photo","full_picture":"https://scontent.xx.fbcdn.net/v/t1.0-9/s720x720/20525273_10213758957116721_8791565099051961263_n.jpg?oh=ba625011a647076c3bc29a8b01895965&oe=59F78B12"},{"id":1697454550310023,"message":"Huge fan of #react router v4! So I made a super concise intro video. Check it out!\n","created_time":"2017-08-03T23:48:03.000Z","likes":0,"from_id":10214028470815916,"type":"video","full_picture":"https://external.xx.fbcdn.net/safe_image.php?d=AQDIwFPXyYwlSkeh&w=1280&h=72….com%2Fvi%2FAzlpRbziyZQ%2Fmaxresdefault.jpg&crop&_nc_hash=AQCLhiSJE_iw1rTy"}]

// };

class MemesList extends Component {
    constructor(props){
        super(props);
        this.state = {
            data: [],
            skip:0
        };
    }

    componentDidMount(){
        axios.get('http://localhost:8080/data')
            .then(res => {
                console.log(res);
                const data = res.data.data;
                this.setState({data});
            });
            //TODO ERROR HANDLING
        // const data = tempData.data;
        // this.setState({data});

    }


    render(){
        var memeComponents = '';
        if(this.state.data.length == 0){
            memeComponents = 'Loading...';
        } else{
            memeComponents = this.state.data.map((memeItem) => (
            <Meme
                key={memeItem.id}
                message={memeItem.message}
                created_time={memeItem.created_time}
                likes={memeItem.likes}
                from_id={memeItem.from_id}
                type={memeItem.type}
                full_picture={memeItem.full_picture}
            />
        ));
        }
        
        return (
            <div>
                {memeComponents}
            </div>
            
        );
    }
}

export default MemesList;