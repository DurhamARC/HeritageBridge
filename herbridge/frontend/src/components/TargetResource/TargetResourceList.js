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
    onDeselect: (resource) => {},
    onSelect: (resource) => {},
    selectedResource: null,
  }
  
  handleToggle = (resource) => {
    const {selectedResource} = this.props
    if (selectedResource === resource) {
      this.props.onDeselect(selectedResource)
    } else {
      this.props.onSelect(resource)
    }
  }
  
  render() {
    const {selectedResource} = this.props
    return (
      <List style={{ maxHeight: 350, overflowY: 'scroll' }}>
        {this.props.resources.map((resource, index) => (
          <ListItem key={resource.resource_id} style={{ paddingLeft: 12 }}>
            <span style={{
              background: '#FFFFFF',
              border: '3px solid #008DF0',
              borderRadius: 32,
              color: '#008DF0',
              fontFamily: 'Helvetica',
              fontWeight: 'bold',
              padding: '8px 12px',
            }}>{index + 1}</span>
            <ListItemText primary={resource.resource_name} secondary={capitalize(resource.resource_description)}/>
            <ListItemSecondaryAction>
              <Checkbox
                color="primary"
                onChange={this.handleToggle.bind(this, resource)}
                checked={selectedResource === resource}
              />
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    )
  }
}