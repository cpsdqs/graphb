const registry = {
  types: {},
  define (type, typeClass) {
    if (this.types[type]) {
      throw new Error(`Layer type registry: ${type} already exists`)
    }
    this.types[type] = typeClass
    return typeClass
  }
}

module.exports = registry.types.g = class Layer {
  constructor () {
    this.type = Layer.types.GROUP
    this.children = []
    this.parentNode = null
    this.isPreview = false
  }

  serialize () {
    return {
      t: this.type,
      c: this.children.map(child => child.serialize())
    }
  }

  getContext () {
    if (!this.parentNode) throw new Error('Failed to get context: no parent node')
    return this.parentNode.getContext()
  }

  render (ctx, transform, context) {
    this.renderChildren(ctx, transform, context)
  }

  renderChildren (ctx, transform, context) {
    this.children.forEach(child => child.render(ctx, transform, context))
  }

  appendChild (child) {
    if (!child.parentNode) {
      this.children.push(child)
      child.parentNode = this
    } else {
      throw new Error('Cannot add child to multiple parents')
    }
  }

  removeChild (child) {
    if (child.parentNode === this) {
      this.children.splice(this.children.indexOf(child), 1)
      child.parentNode = null
    }
  }

  get [Symbol.toStringTag] () {
    return this.constructor.name
  }

  static deserializeLayerData (layer, data) {
    layer.transform = Transform.deserialize(data.a)
    layer.children = Layer.deserializeChildren(data.c, layer)
  }

  static deserialize (data) {
    let group = new Layer()
    if (data.t !== Layer.types.GROUP) {
      throw new Error(`Tried to deserialize layer of type ${data.t} as g`)
    }
    group.transform = Transform.deserialize(data.a)
    group.children = Layer.deserializeChildren(data.c, group)

    return group
  }

  static registry = registry

  static deserializeChildren (data, parentNode) {
    if (!data) return []
    let children = []

    for (let item of data) {
      if (registry.types[item.t]) {
        let child = registry.types[item.t].deserialize(item)
        child.parentNode = parentNode
        children.push(child)
      } else {
        throw new Error(`Unknown layer type: ${item.t}`)
      }
    }

    return children
  }

  static types = {
    GROUP: 'g',
    RASTER_IMAGE: 'b'
  }
}
