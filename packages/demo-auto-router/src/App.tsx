import { View } from 'vitarx'
import { RouterView } from 'vitarx-router'

export default function App(): View {
  return <RouterView />
  // return (
  //   <Transition>
  //     <RouterView>{(component, props) => <Freeze is={component} props={props} />}</RouterView>
  //   </Transition>
  // )
}
