import React from 'react'
import ReactDOM from 'react-dom'
import { CirclePackingRenderer, CyTreeViewer } from 'cy-tree-viewer'

// Styles
const appStyle = {
  backgroundColor: '#eeeeee',
  color: '#EEEEEE',
  width: '100%',
  height: '100%'
}

const style = {
  width: '100%',
  height: '100%',
  backgroundColor: '#404040'
}

const titleStyle = {
  height: '2em',
  margin: 0,
  fontWeight: 100,
  color: '#777777',
  paddingTop: '0.2em',
  paddingLeft: '0.8em'
}

const TreeViewer = CyTreeViewer(CirclePackingRenderer)

console.log(TreeViewer)

// React Application implemented as a stateless functional component
const App = props => (
  <section style={props.appStyle}>
    <h2 style={props.titleStyle}>CyTreeViewer Demo</h2>

    <TreeViewer {...props} />
  </section>
)

const renderPage = tree => {
  ReactDOM.render(
    <App
      tree={tree}
      style={style}
      appStyle={appStyle}
      titleStyle={titleStyle}
    />,
    document.getElementById(TAG)
  )
}

const TAG = 'viewer'

const goFull =
  'https://gist.githubusercontent.com/keiono/cf4a2347b705e7406269eaf8821e84bd/raw/3d8095c416bdf519d3c7c583078040101d1b0ae7/gotreeFull.cyjs'

const smallTree =
  'https://gist.githubusercontent.com/keiono/2e9dee7cdedc5fce548acad71e21e052/raw/215cb50e7b0e71fb7200a846b551c31683a21e97/data1.json'

// Download the data and run the app
fetch(smallTree)
  .then(response => response.json())
  .then(tree => {
    renderPage(tree)
  })
