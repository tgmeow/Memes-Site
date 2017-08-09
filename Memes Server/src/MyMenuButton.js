import React, {Component} from 'react';
import { Wrapper, Button, Menu, MenuItem } from 'react-aria-menubutton';

class MyMenuButton extends Component{
    constructor(props){
        super(props);
    }

    componentDidMount(){

    }

    render(){
        const menuItems = this.props.menuItems.map((word, i) => {
            return(
                <li key={i}>
                    <MenuItem className='MyMenuButton-menuItem'>
                        {word}
                    </MenuItem>
                </li>
            );
        });
        
    return (
        <Wrapper
            className='MyMenuButton'
            onSelection={handleSelection.bind({onSelect:this.props.onSelect})}
        >
            <Button className='MyMenuButton-button'>
                {this.props.menuName}
            </Button>
            <Menu className='MyMenuButton-menu'>
                <ul>{menuItems}</ul>
            </Menu>
        </Wrapper>
        );
    }

}

function handleSelection(value, event) {
  event.stopPropagation();
  console.log(value);
  this.onSelect(value);
}

export default MyMenuButton;