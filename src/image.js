const Layer = require('./layer')

const version = '0.0.0'

module.exports = class Image extends Layer {
  constructor () {
    super()

    // TODO: don't hardcode
    this.version = version
    this.width = 100
    this.height = 100
  }

  serialize () {
    return {
      version: this.version,
      w: this.width,
      h: this.height,
      c: this.children.map(child => child.serialize())
    }
  }

  render (ctx, transform, context) {
    ctx.setTransform(...transform)
    ctx.clearRect(0, 0, this.width, this.height)

    this.renderChildren(ctx, transform, context)
  }

  static deserialize (data) {
    if (data.version !== version) throw new Error('Version does not match: ' + data.version)

    let image = new Image()
    image.width = data.w
    image.height = data.h
    image.children = Layer.deserializeChildren(data.c, image)

    return image
  }
}
