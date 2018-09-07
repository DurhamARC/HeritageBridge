import React from 'react';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import Checkbox from '@material-ui/core/Checkbox';
import {capitalize} from '../../utils/utils'

export default class extends React.Component {
    static defaultProps = {
        resources: [],
    }

    constructor(props) {
        super(props)
        this.state = {
            selected: null
        }
    }

    handleToggle = (resource) => {
        const {selected} = this.state
        if (selected === resource) {
            this.setState({selected: null})
        } else {
            this.setState({selected: resource})
        }
    };

    render() {
        const {selected} = this.state
        return (
            <List>
                {this.props.resources.map((resource, index) => (
                    <ListItem key={resource.id}>
                        <span style={{
                            background: '#FFFFFF',
                            border: '3px solid #008DF0',
                            borderRadius: 32,
                            color: '#008DF0',
                            fontFamily: 'Helvetica',
                            fontWeight: 'bold',
                            padding: '8px 12px'
                        }}>{index + 1}</span>
                        <ListItemText primary={resource.name}/>
                        <ListItemText primary={capitalize(resource.type)} style={{textAlign: 'right'}}/>
                        <ListItemSecondaryAction>
                            <Checkbox
                                color="primary"
                                onChange={this.handleToggle.bind(this, resource)}
                                checked={selected === resource}
                            />
                        </ListItemSecondaryAction>
                    </ListItem>
                ))}
            </List>
        )
    }
}