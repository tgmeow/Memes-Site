import React, { Component } from 'react';
import MemesList from './MemesList.js';

import MyMenuButton from './MyMenuButton';

const recentMenuName = 'Top posts in the last...'
const recentMenu = ['hour', 'day', 'week', 'month', 'year', 'all'];

const boundMenuName = 'Dankest Memes of...'
const boundMenu = ['2016', '2017'];

class App extends Component {
  constructor(props){
    super(props);
    this.state = {
      selection:'day'
    }
  }

  render() {

    //TODO generate header buttons
    const nowViewing = recentMenu.includes(this.state.selection)?('top memes of the past ' + this.state.selection.toLowerCase()) : ('Dankest Memes of ' + this.state.selection);

    return (
      <div className="App">
        <div className="App-header">
          <h2>WeLcOmEtOrEaCt</h2>
          <h2>{nowViewing}</h2>
          <MyMenuButton
            menuItems={recentMenu}
            menuName={recentMenuName}
            onSelect={setAppState.bind(this)}
          />
          <MyMenuButton
            menuItems={boundMenu}
            menuName={boundMenuName}
            onSelect={setAppState.bind(this)}
          />

        </div>
        <div className="App-body">
          <MemesList
            selection={this.state.selection}
          >Loading...</MemesList>
        </div>
      </div>
    );
  }
}

function setAppState(name){
  //TODO UPDATE STATE REGARDLESS OF CURRENT, RESET LIST AND PASS STATE DOWN
  console.log('App state change');
  this.setState({'selection':name});

}

export default App;
