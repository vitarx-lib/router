import { createVNode, type Element, Widget } from 'vitarx'

export interface RouteOptions {}

/**
 * 路由定义小部件
 *
 * 用于在`<Router/>`中定义路由
 */
export class RouterView extends Widget<RouteOptions> {
  constructor(props: RouteOptions) {
    super(props)
  }

  protected build(): Element {
    return createVNode('div')
  }
}
