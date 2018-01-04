const Layer = require('./layer')

module.exports = class BitmapLayer extends Layer {
  constructor (width, height) {
    super()

    this.type = 'b'
    this.opacity = 1

    this._width = width || 0
    this._height = height || 0

    this.image = document.createElement('canvas')
    this.ctx = this.image.getContext('2d')

    if (width && height) {
      this.image.width = width
      this.image.height = height
    }

    // cache
    this.dirty = false
  }

  get width () { return this._width }
  set width (v) {
    let imageData = this.ctx.getImageData(0, 0, this.image.width, this.image.height)
    this._width = this.image.width = v
    this.ctx.putImageData(imageData, 0, 0)
  }

  get height () { return this._height }
  set height (v) {
    let imageData = this.ctx.getImageData(0, 0, this.image.width, this.image.height)
    this._height = this.image.height = v
    this.ctx.putImageData(imageData, 0, 0)
  }

  loadImage (imageData, mime) {
    let binaryString = ''
    for (let i = 0; i < imageData.length; i++) binaryString += String.fromCharCode(imageData[i])
    let imageURL = `data:${mime};base64,${window.btoa(binaryString)}`
    let image = new window.Image()
    image.addEventListener('load', e => {
      this.ctx.drawImage(image, 0, 0)
    })
    image.addEventListener('error', e => {
      this.ctx.fillStyle = '#f00'
      this.ctx.textBaseline = 'top'
      this.ctx.fillText('Failed to load image', 0, 0)
    })
    image.src = imageURL
  }

  addRoughPoint (x, y, left, right, start) {
    // approximate left/right
    const size = left + right

    this.ctx.fillStyle = this.ctx.strokeStyle = this.roughColor || '#000'

    if (start) {
      this.ctx.beginPath()
      this.ctx.arc(x, y, size / 2, 0, 2 * Math.PI)
      this.ctx.fill()
    } else {
      this.ctx.lineCap = 'round'
      this.ctx.beginPath()
      this.ctx.lineWidth = size
      this.ctx.moveTo(...this._lastRoughPoint)
      this.ctx.lineTo(x, y)
      this.ctx.stroke()
    }

    this._lastRoughPoint = [x, y]
    this.dirty = true
  }

  render (ctx, transform, context) {
    ctx.setTransform(...transform)

    ctx.globalAlpha = this.opacity
    ctx.drawImage(this.image, 0, 0)
    ctx.globalAlpha = 1

    // do something with dirty
    this.dirty = false
  }

  serialize () {
    let dataURL = this.image.toDataURL().replace(/^data:/, '')
    let mime = dataURL.substr(0, dataURL.indexOf(';'))
    let binaryString = window.atob(dataURL.replace(/^.+(;|,)/, ''))
    let bytes = []
    for (let i = 0; i < binaryString.length; i++) {
      bytes.push(binaryString.charCodeAt(i))
    }
    let binary = new Uint8Array(bytes)

    return Object.assign(super.serialize(), {
      w: this.width,
      h: this.height,
      o: this.opacity,
      m: mime,
      d: binary
    })
  }

  static deserialize (data) {
    let layer = new BitmapLayer()
    Layer.deserializeLayerData(layer, data)

    layer.width = data.w
    layer.height = data.h
    layer.opacity = data.o
    layer.loadImage(data.d, data.m)

    return layer
  }
}
