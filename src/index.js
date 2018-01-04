const Bitmap = require('./bitmap')
const Canvas = require('./canvas')
const Color = require('./color')
const Editor = require('./editor')
const Image = require('./image')
const Layer = require('./layer')

const graphb = {
  Bitmap,
  Canvas,
  Color,
  Editor,
  Image,
  Layer
}

module.exports = window.graphb = graphb
