import { products } from "@/data/products";
import ProductCard from "@/components/ProductCard";

export const metadata = { title: "Shop" };

export default function Shop() {
  return (
    <section className="container py-10">
      <h1 className="text-3xl font-bold">Curated Shop</h1>
      <p className="mt-2 text-white/80">Best-in-class picks with short ingredients and solid build quality.</p>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map(p => <ProductCard key={p.id} p={p} />)}
      </div>
    </section>
  );
}
