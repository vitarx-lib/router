import { RouterLink, RouterView } from '../lib/index.js'

export default function App() {
  return (
    <div>
      <h1>APP++</h1>
      <RouterLink to="home">home</RouterLink>
      <br />
      <RouterLink to="page1">page1</RouterLink>
      <br />
      <RouterLink to="404">404</RouterLink>
      <RouterView></RouterView>
    </div>
  )
}
