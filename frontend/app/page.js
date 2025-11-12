import Link from "next/link";

export default function Home() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-gray-100">
      <h1 className="mb-6 text-4xl font-bold text-blue-600">
        Doctor Appointment System
      </h1>
      <div className="flex gap-4">
        <Link href="/admin" className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
