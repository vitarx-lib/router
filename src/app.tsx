import { Router,Route } from '../lib/index.js'
export default function App() {
  return <Router>
    <Route path="/" component={()=>import('./Home.tsx')}></Route>
  </Router>
}
