import React, { Component } from 'react'
import { CirclePackingRenderer, CyTreeViewer } from 'cy-tree-viewer'
import ColorBar from './ColorBar'
import * as style from './style.css'

const TreeViewer = CyTreeViewer(CirclePackingRenderer)

const height = window.innerHeight * 0.9

const containerStyle = {
  height: height,
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center'
}

// React Application implemented as a stateless functional component

class App extends Component {
  state = {
    selected: '',
    hover: ''
  }

  componentDidMount() {}

  render() {
    return (
      <div style={this.props.appStyle}>
        <h2 style={this.props.titleStyle}>Selected: {this.state.selected}</h2>
        <h2 style={this.props.titleStyle}>Hover: {this.state.hover}</h2>

        <div style={containerStyle}>
          <TreeViewer
            {...this.props}
            eventHandlers={this.getEventHandlers()}
            size={height}
          />

          <ColorBar width={20} height={height} depth={2} tree={this.props.tree} />
        </div>
      </div>
    )
  }

  getEventHandlers = () => {
    const selectNode = (id, data) => {
      console.log('Seleected = ' + id)
      this.setState({
       selected: id
      })
    }

    const hoverOnNode = (id, data) => {
      console.log('hover = ' + id)
      this.setState({
        hover: id
      })

    }

    return {
      selectNode,
      hoverOnNode
    }
  }
}

export default App
