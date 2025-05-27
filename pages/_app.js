// pages/_app.js
import '../styles/globals.css' // This now imports the master file with all other imports

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />
}