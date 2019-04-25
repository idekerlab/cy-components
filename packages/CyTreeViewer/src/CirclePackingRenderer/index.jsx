import React, { Component, useEffect, useRef } from 'react'
import CirclePacking, {
  selectNodes,
  highlightNode,
  fit,
  clear
} from './d3-circle-packing'

/**
 * React component version of circle packing
 */
const CirclePackingRenderer = props => {
  const treeRef = useRef()

  // For initialization
  useEffect(() => {
    console.log('trying to mount:', props, treeRef)
    CirclePacking(props.tree, treeRef.current, props.width, props.height, props)
    console.log('hooks! called---------')
  }, [])

  useEffect(() => {
    console.log('hooks! COMMAND---------')

    const command = props.command
    if (command.command === 'fit') {
      fit()
    } else if (command.command === 'reset') {
      clear()
    }
  }, [props.command])

  useEffect(() => {

    console.log('hooks! Selection---------')
    selectNodes(props.selected)
  }, [props.selected])

  useEffect(() => {

    console.log('hooks! Highlight---------')
    highlightNode(props.highlight)
  }, [props.highlight])

  // componentWillReceiveProps(nextProps) {
  //
  //   console.log('Will CP rendering!!!:', nextProps)
  //
  //   const rootColor = this.props.rendererOptions.rootColor
  //   const leafColor = this.props.rendererOptions.leafColor
  //   const newRootColor = nextProps.rendererOptions.rootColor
  //   const newLeafColor = nextProps.rendererOptions.leafColor
  //
  //   const newHeight = nextProps.height
  //
  //   if (
  //     this.props.height !== newHeight ||
  //     rootColor !== newRootColor ||
  //     leafColor !== newLeafColor
  //   ) {
  //     console.log('CP rendering!!!:', nextProps)
  //     CirclePacking(
  //       nextProps.tree,
  //       this.tree,
  //       nextProps.width,
  //       nextProps.height,
  //       nextProps
  //     )
  //   }
  //
  //   const command = nextProps.command
  //   if(command !== null && command !== this.props.command) {
  //     if(command.command === 'fit') {
  //       fit()
  //     } else if(command.command === 'reset') {
  //       clear()
  //     }
  //   }
  //
  //   if (nextProps.selected !== this.props.selected) {
  //     console.log('SELECT called:', nextProps)
  //     selectNodes(nextProps.selected)
  //   }
  //
  //   if(!nextProps.highlight && nextProps.highlight !== this.props.highlight) {
  //     console.log('HIGHLIGHT: ', this.props.highlight)
  //     highlightNode(this.props.highlight)
  //   }
  // }

  return <div ref={treeRef} />
}

export default CirclePackingRenderer
