import { useState, useRef, useEffect, use } from "react";
import { Filter, X } from "lucide-react";
import { useClickOutside } from "@/hooks/use-click-outside";
import ViewModal from "../../components/view-case";
import { useAuth } from "@/context/auth-context";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

const Archives = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // redirect non-admins
    useEffect(() => {
        if (!user) return;
        if (user.user_role !== "Admin" && user.user_role !== "Lawyer") {
            navigate("/unauthorized", { replace: true });
        }
    }, [user, navigate]);

    const [search, setSearch] = useState("");
    const [selectedCase, setSelectedCase] = useState(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [clientFilter, setClientFilter] = useState("");
    const [archivedDateFilter, setArchivedDateFilter] = useState("");

    const [archivedCases, setArchivedCases] = useState([]);
    const [lawyers, setLawyers] = useState([]);

    const filterModalRef = useRef();
    useClickOutside([filterModalRef], () => setIsFilterOpen(false));

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Fetch archived cases
    useEffect(() => {
        const fetchArchivedCases = async () => {
            try {
                const endpoint =
                    user.user_role === "Admin" ? "http://localhost:3000/api/cases" : `http://localhost:3000/api/cases/user/${user.user_id}`;

                const res = await fetch(endpoint, {
                    method: "GET",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                const contentType = res.headers.get("content-type");
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }

                if (!contentType || !contentType.includes("application/json")) {
                    const text = await res.text();
                    console.error("Server returned non-JSON:", text.slice(0, 200));
                    throw new Error("Invalid JSON response from server");
                }

                const data = await res.json();

                // Filter archived only
                const archived = data.filter(
                    (item) =>
                        (item.case_status && item.case_status.toLowerCase() === "archived (completed)") ||
                        item.case_status.toLowerCase() === "archived (dismissed)",
                );

                setArchivedCases(archived);
            } catch (err) {
                console.error("Fetch archived cases error:", err);
            }
        };
        fetchArchivedCases();
    }, []);

    // Fetching users to identify the name of the lawyer
    useEffect(() => {
        const fetchLawyers = async () => {
            try {
                const res = await fetch("http://localhost:3000/api/users", {
                    method: "GET",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                if (!res.ok) throw new Error("Failed to fetch lawyers");
                const data = await res.json();
                setLawyers(data);
            } catch (err) {
                console.error("Fetch lawyers error:", err);
            }
        };
        fetchLawyers();
    }, []);

    const getLawyerFullName = (lawyerId) => {
        const lawyer = lawyers.find((u) => u.user_id === lawyerId);
        return lawyer
            ? `${lawyer.user_fname || ""} ${lawyer.user_mname ? lawyer.user_mname[0] + "." : ""} ${lawyer.user_lname || ""}`
                  .replace(/\s+/g, " ")
                  .trim()
            : "Unassigned";
    };

    // Unarchive case
    const handleUnarchive = async (caseToBeUnarchived) => {
        const confirm = window.confirm("Are you sure you want to unarchive this case?");
        if (!confirm) return;

        const toastId = toast.loading("Unarchiving case...", { duration: 4000 });

        try {
            const res = await fetch(`http://localhost:3000/api/cases/${caseToBeUnarchived.case_id}`, {
                method: "PUT",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ ...caseToBeUnarchived, case_status: "Completed", last_updated_by: user.user_id }),
            });

            if (!res.ok) throw new Error("Failed to unarchive case");
            setArchivedCases((prev) => prev.filter((item) => item.case_id !== caseToBeUnarchived.case_id));

            toast.success("Case unarchived successfully.", { id: toastId, duration: 4000 });
        } catch (err) {
            console.error("Error unarchiving case:", err);
            toast.error("Error unarchiving case", { id: toastId, duration: 4000 });
        }
    };

    // Apply filters
    const filteredCases = archivedCases.filter((item) => {
        const matchesSearch =
            item.cc_name?.toLowerCase().includes(search.toLowerCase()) ||
            item.ct_name?.toLowerCase().includes(search.toLowerCase()) ||
            item.client_fullname?.toLowerCase().includes(search.toLowerCase()) ||
            item.case_status?.toLowerCase().includes(search.toLowerCase()) ||
            formatDateTime(item.case_date_created).toLowerCase().includes(search.toLowerCase()) ||
            formatDateTime(item.case_last_updated).toLowerCase().includes(search.toLowerCase()) ||
            item.case_id.toString().includes(search);

        const matchesClient = clientFilter ? item.client_fullname?.toLowerCase().includes(clientFilter.toLowerCase()) : true;

        const matchesArchivedDate = archivedDateFilter
            ? formatDateTime(item.case_last_updated).toLowerCase().includes(archivedDateFilter.toLowerCase())
            : true;

        return matchesSearch && matchesClient && matchesArchivedDate;
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredCases.length / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedCases = filteredCases.slice(startIndex, startIndex + itemsPerPage);

    // Refresh after case update from modal
    const handleCaseUpdated = (updatedCase) => {
        setArchivedCases((prev) => prev.map((c) => (c.case_id === updatedCase.case_id ? updatedCase : c)));
    };

    return (
        <div className="mx-auto">
            <div className="mb-6">
                <h2 className="title">Archived Cases</h2>
                <p className="text-sm text-gray-500">Browse and search all archived cases.</p>
            </div>

            {/* Search and Filter */}
            <div className="card mb-5 flex flex-col gap-3 overflow-x-auto p-4 shadow-md md:flex-row md:items-center md:gap-x-3">
                <input
                    type="text"
                    placeholder="Search archived cases..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:placeholder:text-slate-400"
                />
                <button
                    onClick={() => setIsFilterOpen(true)}
                    className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                    <Filter size={18} />
                    Filter
                </button>
            </div>

            {/* Table */}
            <div className="card overflow-x-auto shadow-md">
                <table className="min-w-full table-auto text-left text-sm">
                    <thead className="text-xs uppercase dark:text-slate-300">
                        <tr>
                            <th className="px-4 py-3">Case ID</th>
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Client</th>
                            {user.user_role === "Admin" && <th className="px-4 py-3">Lawyer</th>}
                            <th className="px-4 py-3">Date Filed</th>
                            <th className="px-4 py-3">Archived Date</th>
                            <th className="px-4 py-3">Actions</th>
                        </tr>
                    </thead>

                    <tbody className="text-slate-950 dark:text-white">
                        {paginatedCases.length > 0 ? (
                            paginatedCases.map((item) => (
                                <tr
                                    key={item.case_id}
                                    className="border-t border-gray-200 transition hover:bg-blue-100 dark:border-gray-700 dark:hover:bg-blue-950"
                                >
                                    <td className="px-4 py-3">
                                        <span
                                            className={`mr-2 inline-block h-3 w-3 rounded-full ${
                                                item.case_status === "Archived (Completed)"
                                                    ? "bg-green-500"
                                                    : item.case_status === "Archived (Dismissed)"
                                                      ? "bg-gray-400"
                                                      : "bg-red-500"
                                            }`}
                                        ></span>
                                        {item.case_id}
                                    </td>
                                    <td className="px-4 py-3">{item.ct_name}</td>
                                    <td className="px-4 py-3">{item.client_fullname}</td>
                                    {user.user_role === "Admin" && <td className="px-4 py-3">Atty. {getLawyerFullName(item.user_id)}</td>}
                                    <td className="px-4 py-3">{formatDateTime(item.case_date_created)}</td>
                                    <td className="px-4 py-3">{formatDateTime(item.case_last_updated)}</td>
                                    <td className="space-x-3 px-4 py-3 text-blue-600">
                                        <button
                                            onClick={() => setSelectedCase(item)}
                                            className="hover:underline"
                                        >
                                            View
                                        </button>
                                        <button
                                            onClick={() => handleUnarchive(item)}
                                            className="text-red-600 hover:underline"
                                        >
                                            Unarchive
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td
                                    colSpan="7"
                                    className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400"
                                >
                                    No archived cases found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
                    <span className="text-xs text-slate-500 dark:text-slate-300">Completed Case</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full bg-gray-400" />
                    <span className="text-xs text-slate-500 dark:text-slate-300">Dismissed Case</span>
                </div>
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

            {/* Filter Modal */}
            {isFilterOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div
                        ref={filterModalRef}
                        className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-slate-800"
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filter Archives</h2>
                            <X
                                className="cursor-pointer text-slate-500 hover:text-slate-800 dark:text-slate-300"
                                onClick={() => setIsFilterOpen(false)}
                            />
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Client</label>
                                <input
                                    type="text"
                                    value={clientFilter}
                                    onChange={(e) => setClientFilter(e.target.value)}
                                    className="w-full rounded border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                                    placeholder="Enter client name"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Archived Date</label>
                                <input
                                    type="text"
                                    value={archivedDateFilter}
                                    onChange={(e) => setArchivedDateFilter(e.target.value)}
                                    className="w-full rounded border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                                    placeholder="e.g. Sep 25, 2025"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button
                                    onClick={() => {
                                        setClientFilter("");
                                        setArchivedDateFilter("");
                                        setIsFilterOpen(false);
                                    }}
                                    className="rounded bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
                                >
                                    Clear
                                </button>
                                <button
                                    onClick={() => setIsFilterOpen(false)}
                                    className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                                >
                                    Apply
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Case Viewer Modal */}
            <ViewModal
                selectedCase={selectedCase}
                setSelectedCase={setSelectedCase}
                tableData={archivedCases}
                onCaseUpdated={handleCaseUpdated}
            />
        </div>
    );
};

export default Archives;
