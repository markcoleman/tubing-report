import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { Storefront } from "./Storefront";
import "./styles.css";
import "./store.css";

function Root() {
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    const storeRoute = hash === "#/store" || hash === "#/checkout";
    document.title = storeRoute
      ? "The Last One Standing — Riverwise Curios"
      : "Riverwise! — Is It a Float Day?";

    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) {
      description.content = storeRoute
        ? "A one-of-one right-foot sandal with authentic creek dirt, priced with absolutely unjustified confidence."
        : "A fun Maple Shade-style weather and water report powered by Hudak Outfitters.";
    }
  }, [hash]);

  if (hash === "#/checkout") return <Storefront view="checkout" />;
  if (hash === "#/store") return <Storefront view="product" />;
  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
