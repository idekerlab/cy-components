import { packEnclose } from './siblings'
import { optional } from '../accessors'
import constant, { constantZero } from '../constant'

function defaultRadius(d) {
  return Math.sqrt(d.value)
}

let childrenMap = new Map()

const getChildMap = (root, childrenMap) => {
  const children = root.children
  const alias = root.data.data.alias
  const nodeType = root.data.data.NodeType

  if(!alias && nodeType === 'Term') {
    childrenMap.set(root.data.id, children)
  }

  if(children) {

    let len = children.length
    while(len--) {
      const child = children[len]
      getChildMap(child, childrenMap)
    }
  } else {
    return childrenMap
  }
}

const addChildren = root => {
  const children = root.children
  const alias = root.data.data.alias
  const nodeType = root.data.data.NodeType
  const originalId = root.data.data.props.originalId


  if(!children) {
    if(alias && nodeType === 'Term') {
      const parentsChildren = childrenMap.get(originalId)
      root.children = parentsChildren

      // Adjust height
      console.log('@@@@@@@@@@@@@added: ', root)
      const childHeight = adjustHeight(root.children)

      console.log(childHeight)
      root.height = childHeight + 1
    }
  } else {
    let len = children.length
    while(len--) {
      const child = children[len]
      addChildren(child)
    }
  }

}

const adjustHeight = (children) => {
  const height = children.map(child => (child.height))
  return Math.max(...height)
}

export default function() {
  var radius = null,
    dx = 1,
    dy = 1,
    padding = constantZero

  function pack(root) {

    childrenMap = new Map()
    getChildMap(root, childrenMap)
    addChildren(root)

    ;(root.x = dx / 2), (root.y = dy / 2)

    if (radius) {
      root
        .eachBefore(radiusLeaf(radius))
        .eachAfter(packChildren(padding, 0.5))
        .eachBefore(translateChild(1))
    } else {
      root
        .eachBefore(radiusLeaf(defaultRadius))
        .eachAfter(packChildren(constantZero, 1))
        .eachAfter(packChildren(padding, root.r / Math.min(dx, dy)))
        .eachBefore(translateChild(Math.min(dx, dy) / (2 * root.r)))
    }
    return root
  }

  pack.radius = function(x) {
    return arguments.length ? ((radius = optional(x)), pack) : radius
  }

  pack.size = function(x) {
    return arguments.length ? ((dx = +x[0]), (dy = +x[1]), pack) : [dx, dy]
  }

  pack.padding = function(x) {
    return arguments.length
      ? ((padding = typeof x === 'function' ? x : constant(+x)), pack)
      : padding
  }

  return pack
}

function radiusLeaf(radius) {
  return function(node) {
    if (!node.children) {
      node.r = Math.max(0, +radius(node) || 0)
    }
  }
}

function packChildren(padding, k) {

  return function(node) {
    if ((children = node.children)) {

      var children,
        i,
        n = children.length,
        r = padding(node) * k || 0,
        e


      if (r) for (i = 0; i < n; ++i) children[i].r += r
      e = packEnclose(children)
      if (r) for (i = 0; i < n; ++i) children[i].r -= r
      node.r = e + r
    } else {
      if(node.data.data.NodeType === 'Term')

      console.log("ERRRRRRRRRRRRRRRRR This should be gene", node.data.data)
      // const nodeData = node.data.data
      // if(nodeData.NodeType === 'Term' && nodeData.alias) {
      //
      //   const originalId = nodeData.props.originalId
      //
      //   console.log('HASKEY ==>', childrenMap.has('471'))
      //
      //   const parentsChildren = childrenMap.get(originalId)
      //   console.log('TERM+++++++++++', originalId, parentsChildren)
      //   try {
      //     packing(parentsChildren, node, padding, k)
      //   } catch(e) {
      //     console.log('ERR:', parentsChildren)
      //   }
      // }
    }
  }
}

const packing = (children, node, padding, k) => {

  var i,
    n = children.length,
    r = padding(node) * k || 0,
    e

  if (r) for (i = 0; i < n; ++i) children[i].r += r
  e = packEnclose(children)
  if (r) for (i = 0; i < n; ++i) children[i].r -= r
  node.r = e + r
}

function translateChild(k) {
  return function(node) {
    var parent = node.parent
    node.r *= k
    if (parent) {
      node.x = parent.x + k * node.x
      node.y = parent.y + k * node.y
    }
  }
}
