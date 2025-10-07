import Hero from "@/components/Hero";
import AdSlot from "@/components/AdSlot";
import AffiliateDisclosure from "@/components/AffiliateDisclosure";
import { products } from "@/data/products";
import ProductCard from "@/components/ProductCard";

export default function Home() {
  return (
    <>
      <Hero />
      <section className="container mt-10">
        <h2 className="mb-4 text-2xl font-bold">High‑Impact Starter Picks</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.slice(0,3).map(p => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>

      <AdSlot />

      <AffiliateDisclosure />
    </>
  );
}
