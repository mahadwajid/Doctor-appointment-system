import Layout from "@/components/Layout";

export default function DisplayScreen() {
  return (
    <Layout>
      <h2 className="text-2xl font-bold text-blue-600 mb-4">
        Patient Display Screen
      </h2>
      <div className="mt-8 text-center">
        <h3 className="text-4xl font-extrabold text-green-600">Now Serving: #25</h3>
        <p className="text-xl text-gray-600 mt-2">Next: #26</p>
      </div>
    </Layout>
  );
}
