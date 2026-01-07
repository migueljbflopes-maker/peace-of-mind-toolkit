import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AmazonProductsSection from "@/components/AmazonProductsSection";

const Products = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        <AmazonProductsSection />
      </main>
      <Footer />
    </div>
  );
};

export default Products;
