import cyjs2tree from './cyjs2tree'

const SMALL_TREE_CY = {
  data: {
    name: 'test_tree'
  },
  elements: {
    nodes: [
      {
        data: {
          id: 'a'
        }
      },
      {
        data: {
          id: 'b'
        }
      },
      {
        data: {
          id: 'c'
        }
      },
      {
        data: {
          id: 'd'
        }
      },
      {
        data: {
          id: 'e'
        }
      }
    ],
    edges: [
      {
        data: {
          id: '1',
          source: 'a',
          target: 'b'
        }
      },
      {
        data: {
          id: '2',
          source: 'a',
          target: 'c'
        }
      },
      {
        data: {
          id: '3',
          source: 'b',
          target: 'd'
        }
      },
      {
        data: {
          id: '4',
          source: 'b',
          target: 'e'
        }
      }
    ]
  }
}

test('Cyjs will be converted into 2-level tree data', () => {
  const tree = cyjs2tree(SMALL_TREE_CY)

  console.log(tree)
  // expect(sum(1, 2)).toBe('a')
})
