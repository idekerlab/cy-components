import React, { Component } from 'react'
import Immutable from 'immutable'
import PropTypes from 'prop-types'

const DEF_EVENT_HANDLERS = Immutable.fromJS({
  selectNode: (nodeId, properties = {}, zoom = true) => {
    console.log('selectNode called.')
    console.log(nodeId)
    console.log(properties)
  },
  selectNodes: (nodeIds, properties = {}) => {
    console.log('Select multiple nodes called.')
    console.log(nodeIds)
    console.log(properties)
  },

  hoverOnNode: (nodeId, properties = {}, parent) => {
    console.log('hover called.', nodeId, properties, parent)
  },

  hoverOutNode: (nodeId, properties = {}) => {
    console.log('hover out called.')
    console.log(nodeId)
  },

  deselectNode: (nodeId, properties = {}) => {
    console.log('deselectNode called.')
  },

  deselectNodes: (nodeIds, properties = {}) => {
    console.log('Deselect multiple nodes called.')
    console.log(nodeIds)
    console.log(properties)
  },

  commandFinished: (lastCommand, status = {}) => {
    console.log('Command Finished: ' + lastCommand)
    console.log(status)
  }
})

const CyTreeViewer = RendererComponent => {
  class Viewer extends Component {
    constructor(props) {
      super(props)
      this.state = {}
    }

    render() {
      const { tree } = this.props
      const handlers = this.buildEventHandlers()

      // If tree data is not available, simply return empty tag
      if (tree === undefined || tree === null) {
        return <div />
      }

      return <RendererComponent {...this.props} eventHandlers={handlers} />
    }

    buildEventHandlers = () => {
      const handlers = this.props.eventHandlers
      if (handlers === undefined || handlers === null) {
        return DEF_EVENT_HANDLERS.toJS()
      }

      // Use default + user provided handlers.
      return DEF_EVENT_HANDLERS.mergeDeep(handlers).toJS()
    }
  }

  Viewer.propTypes = {
    // Tree data in renderer's format
    tree: PropTypes.object,

    // Event handlers for actions for the network, such as selection.
    eventHandlers: PropTypes.object.isRequired,

    // Style for the tree visualization, which is RENDERER DEPENDENT, not CSS
    treeStyle: PropTypes.object,

    // Optional parameters for the renderer
    rendererOptions: PropTypes.object,

    // Command for renderer to be executed next.
    // This is null except when something is actually running in renderer
    command: PropTypes.object
  }

  Viewer.defaultProps = {
    tree: null,
    command: null,
    eventHandlers: DEF_EVENT_HANDLERS.toJS(),
    rendererOptions: {}
  }

  Viewer.displayName = `Viewer(${getDisplayName(RendererComponent)})`

  return Viewer
}

const getDisplayName = RendererComponent =>
  RendererComponent.displayName || RendererComponent.name || 'Component'

export default CyTreeViewer
