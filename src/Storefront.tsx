import { FormEvent, useState } from "react";

type StorefrontProps = {
  view: "product" | "checkout";
};

const productImages = [
  {
    id: "hero",
    label: "The evidence",
    alt: "One weathered brown right-foot sandal with visible creek dirt",
    basename: "last-one-standing",
  },
  {
    id: "signed",
    label: "Signed proof",
    alt: "The same right-foot sandal signed 2026, The one that got away",
    basename: "signed-proof",
  },
] as const;

const storeAssetBase = `${import.meta.env.BASE_URL}store`;

function ProductPicture({
  basename,
  alt,
  eager = false,
}: {
  basename: string;
  alt: string;
  eager?: boolean;
}) {
  const assetPath = `${storeAssetBase}/${basename}`;

  return (
    <picture>
      <source
        type="image/avif"
        srcSet={`${assetPath}-800.avif 800w, ${assetPath}-1600.avif 1600w`}
        sizes="(max-width: 760px) 92vw, 46vw"
      />
      <img
        src={`${assetPath}-800.jpg`}
        srcSet={`${assetPath}-800.jpg 800w, ${assetPath}-1600.jpg 1600w`}
        sizes="(max-width: 760px) 92vw, 46vw"
        width="1200"
        height="1600"
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        decoding="async"
      />
    </picture>
  );
}

function StoreHeader() {
  return (
    <header className="shop-header">
      <a className="shop-brand" href="#/store" aria-label="Riverwise Curios shop home">
        <span className="shop-brand-mark">R!</span>
        <span>
          <strong>Riverwise Curios</strong>
          <small>Objects the creek declined to keep</small>
        </span>
      </a>
      <nav aria-label="Store navigation">
        <a href="#top">← Float report</a>
        <a href="#/store">The one item</a>
        <span className="shop-stock-pill">1 extremely left</span>
      </nav>
    </header>
  );
}

function StoreFooter() {
  return (
    <footer className="shop-footer">
      <div>
        <span className="shop-brand-mark inverse">R!</span>
        <p><strong>Riverwise Curios</strong><br />Expensive things found near free water.</p>
      </div>
      <p>No sandals, money, or creek sediment will change hands. This storefront is a joke. The dirt is emotionally real.</p>
    </footer>
  );
}

function ProductPage() {
  const [selectedImage, setSelectedImage] = useState<(typeof productImages)[number]>(productImages[0]);

  return (
    <>
      <a className="skip-link" href="#store-product">Skip to the sandal</a>
      <StoreHeader />
      <main id="store-product" className="store-main">
        <section className="product-hero" aria-labelledby="product-title">
          <div className="product-gallery">
            <div className="product-photo-stage">
              <span className="one-of-one-stamp" aria-hidden="true">1 / 1<br />in mud</span>
              <ProductPicture
                key={selectedImage.id}
                basename={selectedImage.basename}
                alt={selectedImage.alt}
                eager={selectedImage.id === "hero"}
              />
              <p className="photo-caption">Actual sandal shown. Dirt placement may remain exactly the same.</p>
            </div>
            <div className="product-thumbnails" aria-label="Product photos">
              {productImages.map((image) => (
                <button
                  className={selectedImage.id === image.id ? "active" : ""}
                  type="button"
                  key={image.id}
                  onClick={() => setSelectedImage(image)}
                  aria-pressed={selectedImage.id === image.id}
                  aria-label={`Show ${image.label.toLowerCase()} photo`}
                >
                  <ProductPicture basename={image.basename} alt="" />
                  <span>{image.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="product-copy">
            <p className="product-eyebrow">Hudak Outfitters · Archive drop 001</p>
            <h1 id="product-title">The Last One<br /><em>Standing.</em></h1>
            <p className="product-subtitle">Right foot only. Comes with authentic creek dirt.</p>

            <div className="product-price-row">
              <strong>$12,500.00</strong>
              <span>or 1,893 perfectly good inner tubes</span>
            </div>

            <p className="product-description">
              A singular artifact from the golden age of questionable creek footwear.
              Sun-faded, water-tested, and courageously separated from its left-footed colleague,
              this sandal brings museum-grade asymmetry to any foyer, vault, or extremely confident right foot.
            </p>

            <div className="product-callout">
              <span aria-hidden="true">✦</span>
              <p><strong>Signed provenance included.</strong> Hand-marked “2026 — The one that got away,” because even legends need paperwork.</p>
            </div>

            <a className="buy-button" href="#/checkout">
              Recklessly secure the sandal <span aria-hidden="true">→</span>
            </a>
            <p className="buy-note"><span aria-hidden="true">●</span> Only one exists. Thankfully, you probably only have one right foot.</p>

            <dl className="product-specs">
              <div><dt>Orientation</dt><dd>Right foot. Firmly.</dd></div>
              <div><dt>Condition</dt><dd>Creek-certified / lived-in</dd></div>
              <div><dt>Color</dt><dd>Wet toast with sediment</dd></div>
              <div><dt>Dirt origin</dt><dd>Authentic, exact pebble undisclosed</dd></div>
            </dl>
          </div>
        </section>

        <section className="luxury-proof" aria-labelledby="why-title">
          <div>
            <p className="product-eyebrow light">What $12,500 gets you</p>
            <h2 id="why-title">Unmatched.<br />Unpaired.<br /><em>Unwashed.</em></h2>
          </div>
          <ol>
            <li><span>01</span><div><strong>One genuine right sandal</strong><p>Not a rendering. Not a replica. Not, crucially, two sandals.</p></div></li>
            <li><span>02</span><div><strong>Original creek dirt</strong><p>Every speck preserved using our patented “we did not clean it” process.</p></div></li>
            <li><span>03</span><div><strong>Signed 2026 provenance</strong><p>A blue-marker inscription with the gravitas of a championship jersey and the resale certainty of a damp flip-flop.</p></div></li>
          </ol>
        </section>

        <section className="sandal-review" aria-label="Customer review">
          <p className="review-stars" aria-label="Five out of five stars">★★★★★</p>
          <blockquote>“At last, an heirloom that says: I own waterfront property, but only technically.”</blockquote>
          <p>— A totally anonymous left-shoe collector</p>
        </section>
      </main>
      <StoreFooter />
    </>
  );
}

function CheckoutPage() {
  const [complete, setComplete] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setComplete(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <a className="skip-link" href="#checkout-main">Skip to checkout</a>
      <StoreHeader />
      <main id="checkout-main" className="checkout-main">
        <div className="checkout-topline">
          <div>
            <p className="product-eyebrow">Very official acquisition desk</p>
            <h1>{complete ? "Nobody charged." : "Checkout-ish."}</h1>
          </div>
          <a href="#/store">← Return to sensible browsing</a>
        </div>

        {complete ? (
          <section className="fake-confirmation" aria-live="polite">
            <span aria-hidden="true">✓?</span>
            <p className="product-eyebrow">Order definitely not placed</p>
            <h2>Congratulations on your excellent pretend judgment.</h2>
            <p>
              No payment was processed, no information was sent anywhere, and the sandal remains under extremely casual security.
              Legal is still deciding whether creek dirt counts as agricultural cargo.
            </p>
            <a className="buy-button" href="#/store">Visit the artifact again →</a>
          </section>
        ) : (
          <div className="checkout-layout">
            <form className="checkout-form" onSubmit={handleSubmit}>
              <div className="fake-checkout-warning" role="note">
                <span aria-hidden="true">!</span>
                <p><strong>This is a prop checkout.</strong> Do not enter real payment details. Nothing here is transmitted, saved, charged, shipped, or gently rinsed.</p>
              </div>

              <fieldset>
                <legend><span>1</span> Museum contact</legend>
                <label>
                  Email for imaginary receipt
                  <input type="email" name="email" placeholder="curator@example.com" required />
                </label>
                <label>
                  Collector, custodian, or right-foot owner
                  <input type="text" name="name" placeholder="Your fanciest name" required />
                </label>
              </fieldset>

              <fieldset>
                <legend><span>2</span> Velvet-rope destination</legend>
                <label>
                  Street address
                  <input type="text" name="address" placeholder="123 Museum Wing" required />
                </label>
                <div className="form-row">
                  <label>City<input type="text" name="city" placeholder="Creekside" required /></label>
                  <label>Postal code<input type="text" name="postal" placeholder="WET-001" required /></label>
                </div>
              </fieldset>

              <fieldset>
                <legend><span>3</span> Pretend payment</legend>
                <label>
                  Definitely-not-a-card number
                  <input type="text" name="fake-card" placeholder="CREEK DIRT RIGHT FOOT" autoComplete="off" required />
                </label>
                <div className="form-row">
                  <label>Expires<input type="text" name="fake-expiry" placeholder="Never" autoComplete="off" required /></label>
                  <label>Creek code<input type="text" name="fake-code" placeholder="SOGGY" autoComplete="off" required /></label>
                </div>
              </fieldset>

              <button className="buy-button checkout-button" type="submit">Pretend to place order · $13,883.50</button>
              <p className="form-fineprint">By continuing, you agree that a single used sandal is not financial advice.</p>
            </form>

            <aside className="order-card" aria-label="Order summary">
              <div className="order-product">
                <ProductPicture basename="last-one-standing" alt="The Last One Standing right-foot sandal" />
                <div><span>Archive drop 001</span><strong>The Last One Standing</strong><small>Qty 1 · Right only · Dirt intact</small></div>
              </div>
              <dl className="order-totals">
                <div><dt>Historic footwear</dt><dd>$12,500.00</dd></div>
                <div><dt>Sediment preservation</dt><dd>$275.00</dd></div>
                <div><dt>Creek luxury tax</dt><dd>$1,108.50</dd></div>
                <div className="order-total"><dt>Pretend total</dt><dd>$13,883.50</dd></div>
              </dl>
              <p className="order-badge">Authenticity-ish guaranteed</p>
            </aside>
          </div>
        )}
      </main>
      <StoreFooter />
    </>
  );
}

export function Storefront({ view }: StorefrontProps) {
  return <div className="store-shell">{view === "checkout" ? <CheckoutPage /> : <ProductPage />}</div>;
}
