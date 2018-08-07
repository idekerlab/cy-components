import React, {Component} from 'react'
import PropTypes from 'prop-types'
import Immutable from 'immutable'
import shortid from 'shortid'

/**
 *
 * These handlers provide access to renderer's internal state.
 * For example, you can implement your own function responds to
 * the node selection event in Cytoscape.js
 *
 * (If you are a Redux user, these are actions for Redux's
 * network data store)
 *
 * Default event handlers below are empty functions.
 * You SHOULD provide actual implementations of these functions
 * if you want to respond to these events from the network renderer.
 *
 */
const DEF_EVENT_HANDLERS = Immutable.fromJS({

  /**
   * Node(s) are selected in the view
   *
   * @param nodeIds - Array of selected node IDs
   * @param properties - Optional:
   *   Object contains node properties. (Key is ID)
   */
  selectNodes: (nodeIds, properties = {}) => {
    console.log('selectNodes called.')
    console.log(nodeIds)
  },

  /**
   * Edge(s) are selected in the view
   *
   * @param edgeIds - Array of selected edge IDs
   * @param properties - Optional:
   *   Object contains edge properties. (Key is ID)
   */
  selectEdges: (edgeIds, properties = {}) => {
    console.log('selectEdges called.')
  },

  /**
   * Node(s) are deselected in the view
   *
   * @param nodeIds - Array of unselected node IDs
   */
  deselectNodes: (nodeIds) => {
    console.log('deselectNodes called.')
  },

  /**
   * Edge(s) are deselected in the view
   *
   * @param edgeIds - Array of unselected edge IDs
   */
  deselectEdges: (edgeIds) => {
    console.log('deselectEdges called.')
  },

  /**
   * Position of nodes are changed by user actions
   * (usually done by mouse drag)
   *
   * @param nodePositions - Object that has (x, y) positions of nodes.
   *   e.g. { id1: [x1-pos, y1-pos], id2: [x2-pos, y2-pos],...}
   *   where xn-pos and yn-pos
   *   are numbers represent (x,y) position of node with ID n.
   */
  changeNodePositions: nodePositions => {
    console.log('changeNodePositions called.')
  },

  hoverOnNode: (nodeId, nodeProps) => {
    console.log("Hover:")
    console.log(nodeId, nodeProps)
  },

  hoverOutNode: (nodeId, nodeProps) => {
    console.log("Hover out:")
    console.log(nodeId, nodeProps)
  },

  /**
   * This will be called after executing renderer native commands,
   * such as automatic layout or animation.
   *
   * @param lastCommand - command executed (Command name as String)
   * @param status - Optional: result of the command execution
   */
  //
  commandFinished: (lastCommand, status = {}) => {
    console.log('Command Finished: ' + lastCommand);
    console.log(status);
  },

  // Are there any other important events we should handle...?
});


/**
 * Higher Order Component taking renderer component as a parameter.
 *
 * This encapsulate the actual renderer component and
 * hides their raw API.
 */

const CyNetworkViewer = RendererComponent => {
  class Viewer extends Component {

    constructor(props) {
      super(props);

      this.state = {
        networkId: null
      }
    }

    componentWillMount() {
      this.setState({
        networkId: shortid.generate()
      })
    }

    componentWillReceiveProps(nextProps) {

      if (nextProps.network !== this.props.network) {
        this.setState({
          networkId: shortid.generate()
        })
      }
    }

    render() {
      const {network} = this.props

      // If network data is not available, simply return empty tag
      if (network === null || network === undefined) {
        return (<div/>)
      }

      const handlers = this.buildEventHandlers()

      return (
        <RendererComponent
          {...this.props}
          networkId={this.state.networkId}
          eventHandlers={handlers}
        />
      )
    }

    buildEventHandlers = () => {
      const handlers = this.props.eventHandlers;
      if (handlers === undefined || handlers === null) {
        return DEF_EVENT_HANDLERS.toJS()
      }

      // Use default + user provided handlers.
      return DEF_EVENT_HANDLERS.mergeDeep(handlers).toJS()
    }
  }

  Viewer.propTypes = {

    // Network data in renderer's format
    network: PropTypes.object,

    // Event handlers for actions for the network, such as selection.
    eventHandlers: PropTypes.object.isRequired,

    // Style of the area used by the renderer
    style: PropTypes.object,

    // Style for the network, which is RENDERER DEPENDENT, not CSS
    networkStyle: PropTypes.object,

    // Optional parameters for the renderer
    rendererOptions: PropTypes.object,

    // Command for renderer to be executed next.
    // This is null except when something is actually running in renderer
    command: PropTypes.object,
  }

  Viewer.defaultProps = {
    network: null,
    command: null,
    style: {
      width: '100%',
      height: '100%'
    },
    eventHandlers: DEF_EVENT_HANDLERS.toJS(),
    rendererOptions: {
      layout: 'preset' // For Cytoscape.js
    }
  }

  Viewer.displayName = `Viewer(${getDisplayName(RendererComponent)})`

  return Viewer
}

const getDisplayName = RendererComponent => (
  RendererComponent.displayName || RendererComponent.name || 'Component'
)

export default CyNetworkViewer
