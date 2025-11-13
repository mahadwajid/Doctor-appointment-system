"use client";

import { useState, useEffect } from "react";
import Layout from "@/Components/Layout";
import { useAuth } from "@/middleware/auth";
import { labAPI, patientsAPI } from "@/lib/api";
import { Upload, FileText, Search } from "lucide-react";

export default function LabDashboard() {
  const { user, loading } = useAuth("LAB_STAFF");
  const [reports, setReports] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [formData, setFormData] = useState({
    testName: "",
    testType: "",
    results: "",
    notes: "",
  });
  const [file, setFile] = useState(null);
  const [loadingState, setLoadingState] = useState(false);

  useEffect(() => {
    if (user) {
      loadReports();
    }
  }, [user]);

  const loadReports = async () => {
    try {
      const data = await labAPI.getAll();
      setReports(data);
    } catch (error) {
      console.error("Failed to load reports:", error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const results = await patientsAPI.search(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error("Search failed:", error);
    }
  };

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setSearchQuery("");
    setSearchResults([]);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      alert("Please select a patient first");
      return;
    }

    setLoadingState(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("patientId", selectedPatient.id);
      formDataToSend.append("testName", formData.testName);
      formDataToSend.append("testType", formData.testType);
      formDataToSend.append("results", formData.results);
      formDataToSend.append("notes", formData.notes);
      if (file) {
        formDataToSend.append("file", file);
      }

      await labAPI.upload(formDataToSend);
      setShowForm(false);
      setSelectedPatient(null);
      setFormData({
        testName: "",
        testType: "",
        results: "",
        notes: "",
      });
      setFile(null);
      loadReports();
      alert("Lab report uploaded successfully!");
    } catch (error) {
      alert("Failed to upload report: " + error.message);
    } finally {
      setLoadingState(false);
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-blue-600">Laboratory Dashboard</h2>

        {/* Upload Form */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-semibold">Upload Lab Report</h3>
            <button
              onClick={() => {
                setShowForm(!showForm);
                if (!showForm) {
                  setSelectedPatient(null);
                  setFormData({
                    testName: "",
                    testType: "",
                    results: "",
                    notes: "",
                  });
                  setFile(null);
                }
              }}
              className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              <Upload size={20} />
              {showForm ? "Cancel" : "New Report"}
            </button>
          </div>

          {showForm && (
            <div className="space-y-4">
              {/* Patient Search */}
              {!selectedPatient ? (
                <div>
                  <label className="mb-2 block text-sm font-medium">Search Patient</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                      placeholder="Search by name, phone, or email"
                      className="flex-1 rounded border px-3 py-2"
                    />
                    <button
                      type="button"
                      onClick={handleSearch}
                      className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                    >
                      <Search size={20} />
                      Search
                    </button>
                  </div>
                  {searchResults.length > 0 && (
                    <div className="mt-2 max-h-48 overflow-y-auto rounded border">
                      {searchResults.map((patient) => (
                        <div
                          key={patient.id}
                          onClick={() => handleSelectPatient(patient)}
                          className="cursor-pointer border-b p-3 hover:bg-gray-50"
                        >
                          <p className="font-semibold">{patient.name}</p>
                          <p className="text-sm text-gray-600">
                            {patient.phone || patient.email || "No contact info"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded bg-blue-50 p-3">
                  <p className="font-semibold">Selected Patient: {selectedPatient.name}</p>
                  <button
                    onClick={() => setSelectedPatient(null)}
                    className="mt-2 text-sm text-blue-600 hover:underline"
                  >
                    Change Patient
                  </button>
                </div>
              )}

              {/* Report Form */}
              {selectedPatient && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Test Name *</label>
                      <input
                        type="text"
                        value={formData.testName}
                        onChange={(e) => setFormData({ ...formData, testName: e.target.value })}
                        required
                        className="w-full rounded border px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Test Type</label>
                      <input
                        type="text"
                        value={formData.testType}
                        onChange={(e) => setFormData({ ...formData, testType: e.target.value })}
                        className="w-full rounded border px-3 py-2"
                        placeholder="e.g., Blood Test, X-Ray"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Results</label>
                    <textarea
                      value={formData.results}
                      onChange={(e) => setFormData({ ...formData, results: e.target.value })}
                      rows={5}
                      className="w-full rounded border px-3 py-2"
                      placeholder="Enter test results..."
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Upload File (Optional)</label>
                    <input
                      type="file"
                      onChange={(e) => setFile(e.target.files[0])}
                      className="w-full rounded border px-3 py-2"
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full rounded border px-3 py-2"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loadingState}
                    className="rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loadingState ? "Uploading..." : "Upload Report"}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Reports List */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h3 className="mb-4 text-xl font-semibold">Recent Lab Reports</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Patient</th>
                  <th className="px-4 py-2 text-left">Test Name</th>
                  <th className="px-4 py-2 text-left">Test Type</th>
                  <th className="px-4 py-2 text-left">File</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id} className="border-b">
                    <td className="px-4 py-2">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">{report.patient.name}</td>
                    <td className="px-4 py-2">{report.testName}</td>
                    <td className="px-4 py-2">{report.testType || "-"}</td>
                    <td className="px-4 py-2">
                      {report.fileUrl ? (
                        <a
                          href={report.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          <FileText size={16} className="inline" />
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                      No lab reports yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
