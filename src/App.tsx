import {
  createBrowserRouter,
  Link,
  RouterProvider,
  Outlet
} from "react-router";

const Header = () => {
  return (
    <nav className='fixed top-0 left-0 right-0 bg-gray-900 p-4'>
      <div className='flex gap-4 text-white'>
        <Link to="/" className="hover:text-gray-300">Home</Link>
        <Link to="/about" className="hover:text-gray-300">About</Link>
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
    <div className='flex flex-col justify-center items-center h-screen w-screen bg-black antialiased'>
      <h1 className='text-3xl font-bold underline text-white'>Hello World</h1>
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
