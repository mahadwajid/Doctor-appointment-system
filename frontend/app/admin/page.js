import Layout from "@/components/Layout";

export default function AdminDashboard() {
  return (
    <Layout>
      <h2 className="text-2xl font-bold text-blue-600 mb-4">
        Super Admin Dashboard
      </h2>
      <p className="text-gray-700">Manage clinics, doctors, and labs here.</p>
    </Layout>
  );
}
