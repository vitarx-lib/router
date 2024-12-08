import { type Element, Widget } from 'vitarx'
interface Props {
  path:string,
  component:Element|(()=>Promise<any>)
}
export default class Route extends Widget<Props>{
  protected build(): Element {
    return <div></div>
  }
}
