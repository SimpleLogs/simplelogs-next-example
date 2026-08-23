import CheckoutButton from "./CheckoutButton.jsx";

export default function Home() {
  return (
    <main>
      <h1>Next.js</h1>
      <p>
        The provider in <code>app/layout.jsx</code> covers the client and the
        server. Page views and Web Vitals are already being captured — open the
        network tab and look for requests to <code>/enqueue</code>.
      </p>
      <CheckoutButton />
    </main>
  );
}
