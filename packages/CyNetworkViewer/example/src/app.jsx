/**
 *
 * Sample web app using two types of renderers
 *
 */
import ReactDOM from 'react-dom'
import CyNetworkViewer from 'cy-network-viewer'
import {CytoscapeJsRenderer, SigmaRenderer} from 'cytoscapejs-renderer'


/**
 * Custom functions to handle selection events in the renderer
 */
function selectNodes(nodeIds, nodeProps) {
  console.log('====== Custom node select function called! ========');
  console.log('Selected Node ID: ' + nodeIds)
  console.log(nodeProps)
  console.log(nodeProps[nodeIds[0]])

}

function selectEdges(edgeIds, edgeProps) {
  console.log('====== Custom edge select function called! ========');
  console.log('Selected Edge ID: ' + edgeIds)
  console.log(edgeProps)
}

// Then use it as a custom handler
const customEventHandlers = {
  selectNodes: selectNodes,
  selectEdges: selectEdges
};

// Styles
const appStyle = {
  backgroundColor: '#eeeeee',
  color: '#EEEEEE',
  width: '100%',
  height: '100%',
};

const styleCyjs = {
  position: 'fixed',
  left: 0,
  width: '50%',
  height: '100%',
  backgroundColor: '#EEEEEE'
};

const styleSigma = {
  width: '50%',
  height: '100%',
  backgroundColor: '#AAAAFF',
  right: 0,
  position: 'fixed'
};

const titleStyle = {
  height: '2em',
  margin: 0,
  fontWeight: 100,
  color: '#777777',
  paddingTop: '0.2em',
  paddingLeft: '0.8em',
};

const subTitle = {
  position: 'fixed',
  top: '3em',
  width: '50%',
  fontSize: '2em',
  zOrder: '1000',
  backgroundColor: 'red'
}

// CyNetworkViewer is a higher-order component,
// taking low-level renderer as its argument.

const CyJsNetworkViewer = CyNetworkViewer(CytoscapeJsRenderer)
const SigmaNetworkViewer = CyNetworkViewer(SigmaRenderer)


// React Application implemented as a stateless functional component
const App = props =>
  <section style={props.appStyle}>

    <h2 style={props.titleStyle}>CyNetworkViewer Demo</h2>

    <CyJsNetworkViewer
      {...props}
      style={styleCyjs}
    />

    <SigmaNetworkViewer
      {...props}
      style={styleSigma}
    />

  </section>;


const sizeCalculator = ele => {
  const size = ele.data('Size')
  if (size !== undefined) {
    return Math.log(size) * 30
  } else {
    return 10
  }
}

const fontSizeCalculator = ele => {
  const size = ele.data('Size')
  if (size !== undefined) {
    const fontSize = Math.log(size) / 2
    return fontSize + 'em'
  } else {
    return '1em'
  }
}

const edgeColor = '#AAAAAA'

const visualStyle = {
  style: [
    {
      "selector": "node",
      "css": {
        "font-family": "SansSerif",
        "shape": "ellipse",
        "background-color": 'mapData(score, 0, 1, white, #0033FF)',
        "width": sizeCalculator,
        "text-margin-x": '1em',
        "text-valign": "center",
        "text-halign": "right",
        "color": 'white',
        "min-zoomed-font-size": '1em',
        "font-size": fontSizeCalculator,
        "height": sizeCalculator,
        "content": "data(name)",
        "text-wrap": 'wrap',
        "text-max-width": '40em'
      }
    },
    {
      "selector": "node:selected",
      "css": {
        "background-color": "red",
        "color": "red"
      }
    },
    {
      "selector": "edge",
      "css": {
        "opacity": 0.5,
        "line-color": edgeColor,
        "source-arrow-shape": 'triangle',
        "mid-source-arrow-shape": 'triangle',
        "source-arrow-color": edgeColor,
        "mid-source-arrow-color": edgeColor,
        "color": "white"
      }
    },
    {
      "selector": "edge:selected",
      "css": {
        "line-color": "red",
        "color": "white",
        "source-arrow-color": "red",
        "mid-source-arrow-color": "red",
        "width": '1em'
      }
    },
  ]
}

const renderPage = network => {
  ReactDOM.render(
    <App
      network={network}
      style={styleCyjs}
      eventHandlers={customEventHandlers}
      appStyle={appStyle}
      titleStyle={titleStyle}
      networkStyle={visualStyle}
    />,
    document.getElementById(TAG)
  );
};

const cyjsUrl = 'https://raw.githubusercontent.com/idekerlab/ontology-data-generators/master/atgo.cyjs'
const largeGo = 'http://v1.cxtool.cytoscape.io/ndex2cyjs/20bcb48f-3e6b-11e7-baf1-0660b7976219?server=test'
const huge = 'https://gist.githubusercontent.com/keiono/edec04ea9940863094c0d7b398026ee9/raw/740c10cdcbf7ea2f20b097b8340be560b19ee1e6/hivew-sample1.cyjs'
// HTML section to be used for rendering component
const TAG = 'viewer'

const cyjs2 = 'https://gist.githubusercontent.com/keiono/7a31466d20684875dc1738c9dee77f3b/raw/dc3172a1e95d1bc90cfd0092f7fd4981c9a428cb/yeastHighQualitySubnet.cyjs'
const cyjs3 = 'https://gist.githubusercontent.com/keiono/cfc025bfba493f59718f9d52064978ea/raw/2092dc86f574ea905910b6675c2edb6b3c7bd912/cyjs3.cyjs'

const goFull = 'https://gist.githubusercontent.com/keiono/cf4a2347b705e7406269eaf8821e84bd/raw/3d8095c416bdf519d3c7c583078040101d1b0ae7/gotreeFull.cyjs'

// Download the data and run the app
fetch(cyjs3)
  .then(response => (response.json()))
  .then(network => {
    renderPage(network)
  });
