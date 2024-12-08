import { type Element, Widget } from 'vitarx'
interface Props {
  children: Element|Element[]
  /**
   * 路由模式
   *
   * @default 'hash'
   */
  mode?:'hash'|'history'
}

/**
 * 路由器
 */
export default class Router extends Widget<Props>{
  constructor(props:Props){
    super(props)
  }
  protected build(): Element {
    return <div>测试</div>
  }
}
