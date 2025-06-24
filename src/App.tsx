import {
  createBrowserRouter,
  Link,
  RouterProvider,
  Outlet
} from "react-router-dom";
import AuthPage from "./pages/auth";

const Header = () => {
  return (
    <nav className='fixed top-0 left-0 right-0 bg-gray-900 p-4'>
      <div className='flex gap-4 text-white'>
        <Link to="/" className="hover:text-gray-300">Home</Link>
        <Link to="/about" className="hover:text-gray-300">About</Link>
        <Link to="/auth" className="hover:text-gray-300">Login</Link>
      </div>
    </nav>
  )
}

const Layout = ({ hasHeader }: { hasHeader: boolean }) => {
  return (
    <>
      {hasHeader && <Header />}
      <Outlet />
    </>
  )
}

const Home = () => {
  return (
    <div className='flex flex-col justify-center items-center h-screen w-screen antialiased'>
      <h1 className='text-3xl font-bold'>Welcome to TravelEx</h1>
      <p className="text-muted-foreground">The best way to travel.</p>
    </div>
  )
}

const About = () => {
  return (
    <div className='flex flex-col justify-center items-center h-screen w-screen bg-black antialiased'>
      <h1 className='text-3xl font-bold underline text-white'>About</h1>
    </div>
  )
}

const router = createBrowserRouter([
  {
    element: <Layout hasHeader={true} />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/about",
        element: <About />,
      },
      {
        path: "/auth",
        element: <AuthPage />,
      },
    ]
  },
]);

function App() {
  return (
    <div>
      <RouterProvider router={router} /> 
    </div>
  )
}

export default App
