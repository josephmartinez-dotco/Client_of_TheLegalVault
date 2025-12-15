import { useState, useEffect } from "react";
import { Trash2, FileText, Search, Filter, X } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import AddDocument from "@/components/add-document.jsx";
import toast from "react-hot-toast";

const Documents = () => {
    const { user } = useAuth();

    const [error, setError] = useState("");
    const [documents, setDocuments] = useState([]);
    const [search, setSearch] = useState("");
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [docToDelete, setDocToDelete] = useState(null);
    const [users, setUsers] = useState([]);

    // NEW: Cases + right panel state (design from Tasks page)
    const [cases, setCases] = useState([]);
    const [casesLoading, setCasesLoading] = useState(false);
    const [casesError, setCasesError] = useState("");
    const [selectedCaseId, setSelectedCaseId] = useState("");
    const [showAddPanel, setShowAddPanel] = useState(true);
    const [addDocCaseId, setAddDocCaseId] = useState(null);
    const [statusFilter, setStatusFilter] = useState("All");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Fetch documents from backend (refactored so we can refresh after add)
    const fetchDocs = async () => {
        setError("");
        try {
            const doc_endpoint =
                user.user_role === "Admin"
                    ? "http://localhost:3000/api/documents"
                    : user.user_role === "Lawyer"
                      ? `http://localhost:3000/api/documents/lawyer/${user.user_id}`
                      : `http://localhost:3000/api/documents/submitter/${user.user_id}`;

            const res = await fetch(doc_endpoint, {
                credentials: "include",
            });
            if (!res.ok) throw new Error(`Failed to load documents (${res.status})`);
            const data = await res.json();
            setDocuments(Array.isArray(data) ? data : []);
        } catch (e) {
            setError(e.message || "Failed to load documents");
            setDocuments([]);
        }
    };

    useEffect(() => {
        fetchDocs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fetch users for submitter names
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await fetch("http://localhost:3000/api/users", { credentials: "include" });
                if (!res.ok) throw new Error("Failed to load users");
                const data = await res.json();
                setUsers(Array.isArray(data) ? data : []);
            } catch {
                setUsers([]);
            }
        };
        fetchUsers();
    }, []);

    // Fetch cases for Staff (for right-side add document panel)
    useEffect(() => {
        const fetchCases = async () => {
            setCasesError("");
            setCasesLoading(true);
            try {
                const res = await fetch("http://localhost:3000/api/cases", {
                    method: "GET",
                    credentials: "include",
                });
                if (!res.ok) throw new Error("Failed to load cases");
                const data = await res.json();
                setCases(Array.isArray(data) ? data : []);
            } catch (e) {
                setCasesError(e.message || "Unable to load cases");
            } finally {
                setCasesLoading(false);
            }
        };
        if (user?.user_role === "Staff") fetchCases();
    }, [user?.user_role]);

    const toggleFilterModal = () => setShowFilterModal(!showFilterModal);

    const confirmDelete = (doc) => {
        setDocToDelete(doc);
        setShowDeleteModal(true);
    };

    // Trash / delete document handler (no direct physical file deletion for safety)
    const handleDelete = () => {
        if (docToDelete) {
            try {
                const now = new Date();
                const formatted =
                    now.getFullYear() +
                    "-" +
                    String(now.getMonth() + 1).padStart(2, "0") +
                    "-" +
                    String(now.getDate()).padStart(2, "0") +
                    " " +
                    String(now.getHours()).padStart(2, "0") +
                    ":" +
                    String(now.getMinutes()).padStart(2, "0") +
                    ":" +
                    String(now.getSeconds()).padStart(2, "0") +
                    "." +
                    String(now.getMilliseconds()).padStart(3, "0") +
                    "000";

                const deleteDocument = async () => {
                    const res = await fetch(`http://localhost:3000/api/documents/${docToDelete.doc_id}`, {
                        method: "PUT",
                        credentials: "include",
                        body: JSON.stringify({
                            is_trashed: true,
                            doc_trashed_by: user.user_id,
                            doc_trashed_date: formatted,
                            doc_last_updated_by: user.user_id,
                        }),
                    });
                    if (!res.ok) throw new Error(`Failed to trash document (${res.status})`);
                    // Refresh document list
                    fetchDocs();
                    setDocuments(documents.map((doc) => (doc.doc_id === docToDelete.doc_id ? { ...doc, is_deleted: true } : doc)));
                    setDocToDelete(null);
                    setShowDeleteModal(false);
                    toast.success("Document moved to Recently Deleted", { duration: 4000 });
                };
                deleteDocument();
            } catch (e) {
                setError(e.message || "Failed to delete document");
                toast.error("Failed to delete document");
                console.error(e);
            }
        }
    };

    // Helper to display submitter's name or fallback
    const getSubmitterName = (submittedById) => {
        if (!submittedById) return "-";
        const u = users.find((x) => x.user_id === submittedById);
        if (!u) return String(submittedById);
        const m = u.user_mname ? `${u.user_mname[0]}.` : "";
        if (u.user_role === "Staff" || u.user_role === "Paralegal") return `${u.user_fname} ${m} ${u.user_lname}`.replace(/\s+/g, " ").trim();
        return `Atty. ${u.user_fname} ${m} ${u.user_lname}`.replace(/\s+/g, " ").trim();
    };

    // Filtered list (by name, type, case id, submitted/tasked by)
    const filteredDocs = documents.filter((doc) => {
        if (doc.is_deleted) return false; // Hide deleted docs from main list
        // Tab filtering by
        if (statusFilter === "All") return true;
        if (statusFilter === "Task" && doc.doc_type !== "Task") return false;
        if ((statusFilter === "Support" || statusFilter === "") && doc.doc_type !== "Support") return false;
        const term = search.toLowerCase();
        const fields = [
            doc.doc_name,
            doc.doc_type,
            doc.doc_tag,
            String(doc.case_id ?? ""),
            getSubmitterName(doc.doc_submitted_by),
            String(doc.doc_tasked_by ?? ""),
        ].map((v) => String(v || "").toLowerCase());
        return fields.some((f) => f.includes(term));
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredDocs.length / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedDocs = filteredDocs.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="space-y-6 text-black dark:text-white">
            {error && <div className="mb-4 w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-red-50 shadow">{error}</div>}

            {/* Header with toggle (design from Tasks) */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white sm:text-2xl">Documents</h2>
                    <p className="text-sm text-gray-500">Manage and organize case-related documents</p>
                </div>
                <div className="flex gap-2">
                    {user.user_role === "Staff" && (
                        <button
                            type="button"
                            onClick={() => setShowAddPanel((v) => !v)}
                            className="inline-flex h-9 items-center rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 dark:hover:bg-slate-700"
                        >
                            {showAddPanel ? "Hide panel" : "Show panel"}
                        </button>
                    )}
                    <button
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-blue-600 bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
                        onClick={toggleFilterModal}
                        type="button"
                    >
                        <Filter size={16} /> Filters
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="mb-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    {/* Status Buttons */}
                    <div className="flex gap-2">
                        {["All", "Support", "Task"].map((tab) => {
                            const baseColors = {
                                All: "bg-blue-500 text-white font-semibold",
                                Support: "bg-blue-500 text-white font-semibold",
                                Task: "bg-yellow-500 text-white font-semibold",
                            };

                            const active = statusFilter === tab || (tab === "All" && statusFilter === "");

                            return (
                                <button
                                    key={tab}
                                    onClick={() => setStatusFilter(tab === "All" ? "" : tab)}
                                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                                        active ? baseColors[tab] : "bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-200"
                                    }`}
                                >
                                    {tab}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main content area (search, table, pagination) */}
            <div className="space-y-4">
                {/* Search Input */}
                <div className="card shadow-md">
                    <div className="focus:ring-0.5 flex flex-grow items-center gap-2 rounded-md border border-gray-300 bg-transparent px-3 py-2 focus-within:border-blue-600 focus-within:ring-blue-400 dark:border-slate-600 dark:focus-within:border-blue-600">
                        <Search
                            size={18}
                            className="text-gray-600 dark:text-gray-400"
                        />
                        <input
                            type="text"
                            placeholder="Search documents by name, type, tag, or case..."
                            className="focus:ring-0.5 w-full bg-transparent text-gray-900 placeholder-gray-500 outline-none dark:text-white dark:placeholder-gray-400"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* Document Table */}
                <div className="card overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-800 dark:text-white">
                        <thead className="text-xs uppercase dark:text-slate-300">
                            <tr>
                                <th className="px-4 py-3">Document ID</th>
                                <th className="px-4 py-3">Name</th>
                                <th className="px-4 py-3">Case ID</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Date Submitted</th>
                                <th className="px-4 py-3">Submitted By</th>
                                <th className="px-4 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedDocs.filter((doc) => doc.doc_file).length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={10}
                                        className="px-4 py-3 text-center text-gray-400"
                                    >
                                        No documents with files to display.
                                    </td>
                                </tr>
                            ) : (
                                paginatedDocs
                                    .filter((doc) => doc.doc_file)
                                    .map((doc) => (
                                        <tr
                                            key={doc.doc_id}
                                            className="border-t border-gray-200 transition hover:bg-blue-100 dark:border-gray-700 dark:hover:bg-blue-950"
                                        >
                                            <td className="px-4 py-3">{doc.doc_id}</td>
                                            <td className="flex items-center gap-2 px-4 py-4 font-medium text-blue-800">
                                                {doc.doc_name || "Untitled"}
                                            </td>
                                            <td className="px-4 py-3">{doc.case_id}</td>
                                            <td className="px-4 py-3">{doc.doc_type}</td>
                                            <td className="px-4 py-3">
                                                {doc.doc_type === "Support"
                                                    ? new Date(doc.doc_date_created).toLocaleDateString()
                                                    : new Date(doc.doc_date_submitted).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3">{getSubmitterName(doc.doc_submitted_by)}</td>
                                            <td className="flex justify-center gap-4 px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <a
                                                        href={`http://localhost:3000${doc.doc_file}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 rounded-md border border-blue-600 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800"
                                                    >
                                                        <FileText size={14} />
                                                        View
                                                    </a>
                                                </div>
                                                {(user.user_role !== "Staff" || user.user_role !== "Paralegal") && (
                                                    <button
                                                        className="text-red-500 hover:text-red-700"
                                                        onClick={() => confirmDelete(doc)}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="mt-2 flex items-center justify-end px-4 py-3 text-sm text-gray-700 dark:text-white">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="rounded border border-gray-300 bg-white px-3 py-1 hover:bg-gray-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
                            >
                                &lt;
                            </button>

                            <div>
                                Page {currentPage} of {totalPages}
                            </div>

                            <button
                                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="rounded border border-gray-300 bg-white px-3 py-1 hover:bg-gray-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
                            >
                                &gt;
                            </button>
                        </div>
                    </div>
                )}
            </div>
            {/* Bottom add document panel (Staff) */}
            {user.user_role === "Staff" && (
                <div className={showAddPanel ? "block" : "hidden"}>
                    <div className="rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-md backdrop-blur-sm transition-all dark:border-slate-700 dark:bg-slate-800/80">
                        {/* Header */}
                        <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3 dark:border-slate-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">📎 Add Supporting Document</h3>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Staff Upload Panel</span>
                        </div>

                        {/* Form Section */}
                        <div className="grid gap-4 sm:grid-cols-[2fr,auto] sm:items-end">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Select Case</label>
                                <select
                                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-gray-700 dark:bg-slate-900 dark:text-gray-100"
                                    value={selectedCaseId}
                                    onChange={(e) => setSelectedCaseId(e.target.value)}
                                    disabled={casesLoading}
                                >
                                    <option value="">{casesLoading ? "Loading cases..." : "-- Choose a case --"}</option>
                                    {casesError && (
                                        <option
                                            value=""
                                            disabled
                                        >
                                            Failed to load cases
                                        </option>
                                    )}
                                    {cases
                                        .filter((c) => c.case_status === "Processing")
                                        .map((c) => (
                                            <option
                                                key={c.case_id}
                                                value={c.case_id}
                                            >
                                                #{c.case_id} — {c.ct_name || c.case_remarks || "Untitled Case"} ({c.client_fullname})
                                            </option>
                                        ))}
                                </select>
                                {casesError && <p className="mt-1 text-xs text-red-600">{casesError}</p>}
                            </div>

                            <button
                                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={!selectedCaseId || !!casesError || casesLoading}
                                onClick={() => setAddDocCaseId(selectedCaseId)}
                            >
                                + Add Document
                            </button>
                        </div>

                        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                            Select a case first, then click <span className="font-medium text-blue-600 dark:text-blue-400">“Add Document”</span> to
                            upload your supporting files.
                        </p>
                    </div>
                </div>
            )}

            {/* Filter Modal */}
            {showFilterModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
                    onClick={() => setShowFilterModal(false)}
                >
                    <div
                        className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={toggleFilterModal}
                            className="absolute right-3 top-3 text-gray-500 hover:text-black"
                        >
                            <X size={20} />
                        </button>
                        <h2 className="mb-4 text-lg font-semibold text-gray-800">Filter Options</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Document Type</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Task, Supporting"
                                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Uploaded By</label>
                                <input
                                    type="text"
                                    placeholder="User id"
                                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                                />
                            </div>
                            <div className="mt-4 flex justify-end gap-3">
                                <button
                                    onClick={toggleFilterModal}
                                    className="rounded bg-gray-300 px-4 py-2 hover:bg-gray-400"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={toggleFilterModal}
                                    className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                                >
                                    Apply Filters
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
                    onClick={() => setShowDeleteModal(false)}
                >
                    <div
                        className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowDeleteModal(false)}
                            className="absolute right-3 top-3 text-gray-500 hover:text-black"
                        >
                            <X size={20} />
                        </button>
                        <h2 className="text-lg font-semibold text-gray-800">Are you sure you want to delete this document?</h2>
                        <p className="mb-4 text-slate-500">This action cannot be undone.</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="rounded bg-gray-300 px-4 py-2 hover:bg-gray-400"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AddDocument overlay */}
            {addDocCaseId && (
                <AddDocument
                    caseId={addDocCaseId}
                    onClose={() => {
                        setAddDocCaseId(null);
                    }}
                    onAdded={() => {
                        setAddDocCaseId(null);
                        fetchDocs();
                    }}
                />
            )}
        </div>
    );
};

export default Documents;
