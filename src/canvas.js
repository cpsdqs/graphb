const { mat2d } = require('gl-matrix')
const Image = require('./image')

module.exports = class Canvas {
  constructor (node) {
    this.node = node;

    this.canvas = document.createElement('canvas')
    this.ctx = this.canvas.getContext('2d')

    this.overlay = document.createElement('canvas')
    this.overlayCtx = this.overlay.getContext('2d')

    if (this.node) {
      this.node.appendChild(this.canvas);
      this.node.appendChild(this.overlay);
    }

    this.context = {
      width: 0,
      height: 0,
      transform: mat2d.create()
    }

    this._image = new Image()
    this.updateSize()
  }

  updateSize () {
    this.canvas.width = this.image.width * window.devicePixelRatio
    this.canvas.height = this.image.height * window.devicePixelRatio
    this.canvas.style.width = `${this.image.width}px`
    this.canvas.style.height = `${this.image.height}px`

    this.overlay.width = this.canvas.width
    this.overlay.height = this.canvas.height
    this.overlay.style.width = this.canvas.style.width
    this.overlay.style.height = this.canvas.style.height

    this.context.width = this.image.width
    this.context.height = this.image.height
  }

  get image () {
    return this._image
  }

  set image (v) {
    this._image = v
    this.node.dispatchEvent(new Event('image-change'))
    this.updateSize()
    this.render()
  }

  resetTransform () {
    this.context.transform = mat2d.create()
  }

  getTransform () {
    const scale = window.devicePixelRatio

    return mat2d.multiply(
      mat2d.create(),
      mat2d.fromScaling(mat2d.create(), [scale, scale]),
      this.context.transform
    )
  }

  render () {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.image.render(this.ctx, this.getTransform(), this.context)
  }
}

window.mat2d = mat2d
