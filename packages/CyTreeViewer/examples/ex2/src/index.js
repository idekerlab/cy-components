import React from 'react'
import ReactDOM from 'react-dom'

import './index.css'
import App from './App'
import registerServiceWorker from './registerServiceWorker'

import cyjs2tree from './cyjs2tree'

const TAG = 'root'
const smallTree =
  'https://gist.githubusercontent.com/keiono/2e9dee7cdedc5fce548acad71e21e052/raw/215cb50e7b0e71fb7200a846b551c31683a21e97/data1.json'

const goCyjs =
  'https://gist.githubusercontent.com/keiono/cf4a2347b705e7406269eaf8821e84bd/raw/3d8095c416bdf519d3c7c583078040101d1b0ae7/gotreeFull.cyjs'

//Large
const uuid1 = '7ae8907a-b395-11e7-b629-0660b7976219'
const uuid2 = 'c84ec0b0-02f4-11e8-bd69-0660b7976219'
const uuidFan = '68f1cbdf-fb58-11e7-9efe-0660b7976219'

const uuidHuge = '86ef5567-fced-11e7-bd69-0660b7976219'

const CXTOOL_URL = 'http://35.203.154.74:3001/ndex2cyjs/'

// Styles
const appStyle = {
  color: '#EEEEEE',
  width: '100%',
  height: '100%',
  padding: '2em'
}

const style = {
  height: '100%',
  justifyContent: 'center'
}

const titleStyle = {
  height: '2em',
  margin: 0,
  fontWeight: 100,
  color: '#555555',
  paddingTop: '0.2em',
  paddingLeft: '0.8em'
}

const renderPage = tree => {
  ReactDOM.render(
    <App
      tree={tree}
      style={style}
      appStyle={appStyle}
      titleStyle={titleStyle}
      uuid={uuid1}
    />,
    document.getElementById(TAG)
  )
}

// Download the data and run the app
fetch(CXTOOL_URL + uuid2 + '?server=test')
  .then(response => response.json())
  .then(cyjs => {
    console.log(cyjs)
    const root = cyjs2tree(cyjs)
    console.log(root)
    return root
  })
  .then(root => {
    renderPage(root)
  })

registerServiceWorker()
