import { useState, useEffect } from "react";
import { Eye, Trash2, Search } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import toast from "react-hot-toast";

export const Payments = () => {
    const { user } = useAuth();
    const [error, setError] = useState("");
    const [paymentsData, setPaymentsData] = useState([]);
    const [cases, setCases] = useState([]);
    const [selectedCaseBalance, setSelectedCaseBalance] = useState(null);

    const bankBranchOptions = [
        "BDO",
        "BPI",
        "Metrobank",
        "Landbank",
        "PNB",
        "Security Bank",
        "RCBC",
        "China Bank",
        "UnionBank",
        "EastWest Bank",
    ];

    const branchLocationOptions = [
        "Makati",
        "Quezon City",
        "Cebu",
        "Davao",
        "Pasig",
        "Taguig",
        "Pasig City",
        "Mandaluyong",
        "Ortigas",
        "Alabang",
        "iloilo",
        "Bacolod",
        "Cagayan de Oro",
        "Baguio",
        "Dumaguete",
        "Zamboanga",
        "General Santos",
        "Butuan",
        "Iligan",
        "Marawi",
        "Samar",
        "Tarlac",
    ];


    // Helpers
    const formatCurrency = (amount) =>
        new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
        }).format(amount);

    const formatDateTime = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    };

    // fetching here the cases for the add payment modal
    useEffect(() => {
        const fetchCases = async () => {
            try {
                const cases_endpoint = user.user_role === "Admin" ? "cases" : "cases/user/" + user.user_id;
                const res = await fetch("http://localhost:3000/api/" + cases_endpoint, {
                    method: "GET",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                const data = await res.json();
                if (res.ok) {
                    // setCases(data);
                    setCases(data.filter((c) => c.case_balance > 0));
                } else {
                    console.error("Failed to fetch cases:", data.error);
                }
            } catch (err) {
                console.error("Error fetching cases:", err);
            }
        };

        fetchCases();
    }, []);

    // fetching here the payments
    useEffect(() => {
        const fetchPayments = async () => {
            try {
                const payment_endpoint = user.user_role === "Admin" ? "payments" : "payments/lawyer/" + user.user_id;

                const response = await fetch(`http://localhost:3000/api/${payment_endpoint}`, {
                    method: "GET",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                if (!response.ok) {
                    throw new Error("Failed to fetch payments");
                }

                const data = await response.json();
                setPaymentsData(data);
            } catch (err) {
                console.error(err);
                setError("Failed to fetch payments. Please try again later.");
            }
        };

        fetchPayments();
    }, []);

    const [searchTerm, setSearchTerm] = useState("");
    const [paymentTypeFilter, setPaymentTypeFilter] = useState("All");
    const [currentPage, setCurrentPage] = useState(1);
    const [addPayment, setAddPayment] = useState(null);
    const [chequeDetails, setChequeDetails] = useState({
        cheque_name: "",
        cheque_number: "",
        cheque_branch: "",
        cheque_location: "",
    });
    const [selectedCheque, setSelectedCheque] = useState(null);
    const [selectedCash, setSelectedCash] = useState(null);

    const filteredPayments = paymentsData.filter((p) => {
        const matchesSearch =
            p.payment_id.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.client_fullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.case_id.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.ct_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.payment_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
            formatDateTime(p.payment_date).toLowerCase().includes(searchTerm.toLowerCase());

        const matchesPaymentType = paymentTypeFilter === "All" || p.payment_type === paymentTypeFilter;

        return matchesSearch && matchesPaymentType;
    });

    // Only show account columns when specifically filtering by "Cheque"
    const hasVisibleCheques = paymentTypeFilter === "Cheque";

    // Pagination
    const rowsPerPage = 10;
    const totalPages = Math.ceil(filteredPayments.length / rowsPerPage);
    const paginatedPayments = filteredPayments.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    // Add Payment
    const handleAddPayment = async () => {
        if (!addPayment) return;

        const bal = Number(selectedCaseBalance);
        const amt = Number(addPayment.payment_amount);

        if (!addPayment.case_id) {
            toast.error("Please select a case.");
            return;
        }
        if (!addPayment.payment_type) {
            toast.error("Please select a payment type.");
            return;
        }
        if (Number.isNaN(amt) || amt <= 0) {
            toast.error("Enter a valid payment amount.");
            return;
        }
        if (Number.isNaN(bal)) {
            toast.error("Unable to validate case balance.");
            return;
        }
        if (amt !== bal) {
            toast.error(`Payment must be exactly ${formatCurrency(bal)}.`);
            return;
        }

        const toastId = toast.loading("Adding payment...", { duration: 4000 });
        try {
            const paymentData = {
                ...addPayment,
                payment_amount: amt.toFixed(2),
            };

            // Add cheque details if payment type is Cheque
            if (addPayment.payment_type === "Cheque") {
                if (!chequeDetails.cheque_name.trim()) {
                    toast.error("Cheque name is required for cheque payments.", { id: toastId });
                    return;
                }
                if (!chequeDetails.cheque_number.trim()) {
                    toast.error("Cheque number is required for cheque payments.", { id: toastId });
                    return;
                }
                if (!chequeDetails.cheque_branch?.trim()) {
                    toast.error("Cheque branch is required for cheque payments.", { id: toastId });
                    return;
                }
                if (!chequeDetails.cheque_location?.trim()) {
                    toast.error("Cheque branch location is required for cheque payments.", { id: toastId });
                    return;
                }

                // Send both formats to ensure compatibility
                paymentData.check_name = chequeDetails.cheque_name.trim();
                paymentData.check_number = chequeDetails.cheque_number.trim();
                paymentData.cheque_name = chequeDetails.cheque_name.trim();
                paymentData.cheque_number = chequeDetails.cheque_number.trim();
                paymentData.cheque_branch = chequeDetails.cheque_branch.trim();
                paymentData.cheque_location = chequeDetails.cheque_location.trim();
            }

            console.log("Sending payment data:", paymentData); // Debug log

            const res = await fetch("http://localhost:3000/api/payments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(paymentData),
            });

            const data = await res.json();
            console.log("Response status:", res.status); // Debug log
            console.log("Response data:", data); // Debug log

            if (res.ok) {
                setPaymentsData((prev) => [...prev, data]);
                toast.success("Payment added successfully!", { id: toastId, duration: 4000 });
                setAddPayment(null);
                setChequeDetails({ cheque_name: "", cheque_number: "", cheque_branch: "", cheque_location: "" });
            } else {
                console.error("Payment failed:", data); // Debug log
                toast.error(data.error || data.message || "Failed to add payment", { id: toastId });
            }
        } catch (err) {
            console.error("Error adding payment:", err);
            toast.error("Network error: " + err.message, { id: toastId });
        }
    };

    const handleDeletePayment = (payment) => {
        if (window.confirm(`Are you sure you want to delete payment ID ${payment.payment_id}? This action cannot be undone.`)) {
            const toastId = toast.loading("Deleting payment...", { duration: 4000 });

            try {
                fetch(`http://localhost:3000/api/payments/${payment.payment_id}`, {
                    method: "DELETE",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }).then((res) => {
                    if (!res.ok) {
                        throw new Error("Failed to delete payment");
                    }
                });

                setPaymentsData((prev) => prev.filter((p) => p.payment_id !== payment.payment_id));
                toast.success("Payment deleted successfully!", { id: toastId, duration: 4000 });
            } catch (err) {
                console.error(err);
                setError("Failed to delete payment. Please try again later.");
                toast.error("Failed to delete payment.", { id: toastId, duration: 4000 });
                return;
            }
        }
    };

    return (
        <div className="bg-blue rounded-xl">
            {error && <div className="mb-4 w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-red-50 shadow">{error}</div>}
            {/* Header */}
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="title">Payments</h1>
                    <p className="text-sm text-gray-500">Track and manage all payment records.</p>
                </div>
            </div>

            {/* Search + Filters */}
            <div className="card mb-6 flex flex-col items-center gap-3 rounded-lg bg-white p-4 shadow-md dark:bg-slate-800 md:flex-row">
                <div className="focus:ring-0.5 flex flex-grow items-center gap-2 rounded-md border border-gray-300 bg-transparent px-3 py-2 focus-within:border-blue-600 focus-within:ring-blue-400 dark:border-slate-600 dark:focus-within:border-blue-600">
                    <Search
                        size={18}
                        className="text-gray-600 dark:text-gray-400"
                    />
                    <input
                        type="text"
                        placeholder="Search payments by client, case or date..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-transparent text-gray-900 placeholder-gray-500 outline-none dark:text-white dark:placeholder-gray-400"
                    />
                </div>

                <select
                    value={paymentTypeFilter}
                    onChange={(e) => setPaymentTypeFilter(e.target.value)}
                    className="rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-gray-900 outline-none focus:border-blue-600 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:border-blue-600"
                >
                    <option value="All">All Types</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                </select>
                <button
                    onClick={() => {
                        setAddPayment({ case_id: "", user_id: user.user_id, payment_amount: "", payment_type: "" });
                        setChequeDetails({ cheque_name: "", cheque_number: "", cheque_branch: "", cheque_location: "" });
                    }}
                    className="flex h-10 items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white shadow hover:bg-green-700"
                >
                    Add Payment
                </button>
            </div>

            {/* Payments Table */}
            <div className="card w-full overflow-x-auto">
                <div className="overflow-y-auto">
                    <table className="min-w-full table-auto text-left text-sm">
                        <thead className="card-title z-100 sticky top-0 bg-white text-xs uppercase dark:bg-slate-900">
                            <tr>
                                <th className="px-4 py-3">Payment ID</th>
                                <th className="px-4 py-3">Client</th>
                                <th className="px-4 py-3">Case ID</th>
                                <th className="px-4 py-3">Amount</th>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Payment Type</th>
                                <th className="px-4 py-3">Processed By</th>
                                <th className="px-4 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-700 dark:text-white">
                            {paginatedPayments.length > 0 ? (
                                paginatedPayments.map((p) => (
                                    <tr
                                        key={p.payment_id}
                                        className="border-t border-gray-200 transition hover:bg-blue-50 dark:border-gray-700 dark:hover:bg-slate-800"
                                    >
                                        <td className="px-4 py-3">{p.payment_id}</td>
                                        <td className="px-4 py-3">{p.client_fullname}</td>
                                        <td
                                            className="max-w-xs truncate px-4 py-3 text-center font-medium"
                                            title={p.case_id}
                                        >
                                            {p.case_id}
                                        </td>
                                        <td className="px-4 py-3 font-bold text-green-600 dark:text-green-400">{formatCurrency(p.payment_amount)}</td>
                                        <td className="px-4 py-3">{formatDateTime(p.payment_date)}</td>
                                        <td className="px-4 py-3">
                                            {p.payment_type === "Cheque" ? (
                                                <span
                                                    className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
                                                    onClick={() => setSelectedCheque(p)}
                                                    title="Click to view cheque details"
                                                >
                                                    💳 Cheque
                                                </span>
                                            ) : (
                                                <span
                                                    className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800"
                                                    onClick={() => setSelectedCash(p)}
                                                    title="Click to view cash payment details"
                                                >
                                                    💵 Cash
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {p.user_fname} {p.user_mname ? p.user_mname[0] + "." : ""} {p.user_lname}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                className="p-1.5 text-red-600 hover:text-red-800"
                                                onClick={() => handleDeletePayment(p)}
                                                title="Delete Payment"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan="8"
                                        className="px-4 py-6 text-center text-slate-500 dark:text-slate-400"
                                    >
                                        No payments found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="mt-2 flex justify-end px-4 py-3 text-sm text-gray-700 dark:text-white">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                            disabled={currentPage === 1}
                            className="rounded border border-gray-300 bg-white px-3 py-1 hover:bg-gray-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
                        >
                            &lt;
                        </button>
                        <span>
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="rounded border border-gray-300 bg-white px-3 py-1 hover:bg-gray-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
                        >
                            &gt;
                        </button>
                    </div>
                </div>
            )}

            {/* Add Payment Modal */}
            {addPayment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="w-full max-w-2xl rounded-xl bg-white p-8 shadow-lg dark:bg-slate-800">
                        <h3 className="mb-6 text-xl font-bold text-blue-900 dark:text-slate-200">Add Payment</h3>
                        {/* ...existing code... */}
                        <div className="grid grid-cols-1 gap-4 text-sm text-blue-900 sm:grid-cols-2">
                            <div>
                                <label className="font-semibold dark:text-blue-700">Case</label>
                                <select
                                    value={addPayment.case_id}
                                    onChange={(e) => {
                                        const caseId = parseInt(e.target.value, 10);
                                        const selected = cases.find((c) => c.case_id === caseId);

                                        setAddPayment({ ...addPayment, case_id: e.target.value });
                                        setSelectedCaseBalance(selected ? selected.case_balance : null);
                                    }}
                                    className="w-full rounded-md border px-3 py-2 dark:bg-slate-700 dark:text-slate-50"
                                >
                                    <option
                                        value=""
                                        disabled
                                    >
                                        Select Case
                                    </option>
                                    {cases
                                        .filter((c) => c.case_status === "Processing")
                                        .map((c) => (
                                            <option
                                                key={c.case_id}
                                                value={c.case_id}
                                            >
                                                {c.case_id} – {c.client_fullname} ({c.ct_name})
                                            </option>
                                        ))}
                                </select>
                            </div>
                            <div>
                                <label className="font-semibold dark:text-blue-700">Lawyer</label>
                                <input
                                    type="text"
                                    value={addPayment.user_id}
                                    readOnly
                                    className="w-full rounded-md border px-3 py-2 dark:bg-slate-700 dark:text-slate-50"
                                />
                                <p className="mt-1 text-xs text-gray-500">(Your User ID)</p>
                            </div>

                            <div>
                                <label className="font-semibold dark:text-blue-700">Amount</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={addPayment.payment_amount}
                                    onChange={(e) => {
                                        const value = e.target.value;

                                        // Allow empty string for editing
                                        if (value === "") {
                                            setAddPayment({
                                                ...addPayment,
                                                payment_amount: "",
                                            });
                                            return;
                                        }

                                        // Prevent negative values
                                        if (parseFloat(value) < 0) {
                                            alert("Amount cannot be negative!");
                                            return;
                                        }

                                        setAddPayment({
                                            ...addPayment,
                                            payment_amount: value,
                                        });
                                    }}
                                    onBlur={() => {
                                        if (addPayment.payment_amount === "") return; // don't alert if user cleared it

                                        if (parseFloat(addPayment.payment_amount) >= 0) {
                                            setAddPayment({
                                                ...addPayment,
                                                payment_amount: parseFloat(addPayment.payment_amount).toFixed(2),
                                            });
                                        } else {
                                            alert("Invalid amount! Resetting to 0.00");
                                            setAddPayment({
                                                ...addPayment,
                                                payment_amount: "0.00",
                                            });
                                        }
                                    }}
                                    className="w-full rounded-md border px-3 py-2 dark:bg-slate-700 dark:text-slate-50"
                                    placeholder="0.00"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    {selectedCaseBalance !== null
                                        ? `Total Case Fee: ${formatCurrency(selectedCaseBalance)}`
                                        : "Select a case to see fee / balance."}
                                </p>
                            </div>

                            <div>
                                <label className="font-semibold dark:text-blue-700">Payment Type</label>
                                <select
                                    value={addPayment.payment_type}
                                    onChange={(e) => {
                                        setAddPayment({ ...addPayment, payment_type: e.target.value });
                                        // Reset cheque details when payment type changes
                                        if (e.target.value !== "Cheque") {
                                            setChequeDetails({ cheque_name: "", cheque_number: "", cheque_branch: "", cheque_location: "" });
                                        }
                                    }}
                                    className="w-full rounded-md border px-3 py-2 dark:bg-slate-700 dark:text-slate-50"
                                >
                                    <option
                                        value=""
                                        disabled
                                    >
                                        Select Payment Type
                                    </option>
                                    <option value="Cheque">Cheque</option>
                                    <option value="Cash">Cash</option>
                                </select>
                            </div>

                            {/* Cheque Details - Only show when Cheque is selected */}
                            {addPayment.payment_type === "Cheque" && (
                                <>
                                    <div>
                                        <label className="font-semibold dark:text-blue-700">Cheque Name *</label>
                                        <input
                                            type="text"
                                            value={chequeDetails.cheque_name}
                                            onChange={(e) => setChequeDetails({ ...chequeDetails, cheque_name: e.target.value })}
                                            className="w-full rounded-md border px-3 py-2 dark:bg-slate-700 dark:text-slate-50"
                                            placeholder="Enter cheque name"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-semibold dark:text-blue-700">Cheque Number *</label>
                                        <input
                                            type="text"
                                            value={chequeDetails.cheque_number}
                                            onChange={(e) => {
                                                // Allow only numbers and limit to 10 digits
                                                const value = e.target.value.replace(/[^0-9]/g, "").slice(0, 10);
                                                setChequeDetails({ ...chequeDetails, cheque_number: value });
                                            }}
                                            className="w-full rounded-md border px-3 py-2 dark:bg-slate-700 dark:text-slate-50"
                                            placeholder="Enter cheque number"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-semibold dark:text-blue-700">Bank Branch *</label>
                                        <select
                                            value={chequeDetails.cheque_branch}
                                            onChange={(e) => setChequeDetails({ ...chequeDetails, cheque_branch: e.target.value })}
                                            className="w-full rounded-md border px-3 py-2 dark:bg-slate-700 dark:text-slate-50"
                                        >
                                            <option value="" disabled>Select Bank Branch</option>
                                            {bankBranchOptions.map((branch) => (
                                                <option
                                                    key={branch}
                                                    value={branch}
                                                >
                                                    {branch}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="font-semibold dark:text-blue-700"> Branch Location *</label>
                                        <select
                                            value={chequeDetails.cheque_location}
                                            onChange={(e) => setChequeDetails({ ...chequeDetails, cheque_location: e.target.value })}
                                            className="w-full rounded-md border px-3 py-2 dark:bg-slate-700 dark:text-slate-50"
                                        >
                                            <option value="" disabled>Select Branch Location</option>
                                            {branchLocationOptions.map((location) => (
                                                <option
                                                    key={location}
                                                    value={location}
                                                >
                                                    {location}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setAddPayment(null);
                                    setChequeDetails({ cheque_name: "", cheque_number: "" });
                                }}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleAddPayment()}
                                className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                            >
                                Add Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cheque Details Modal */}
            {selectedCheque && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="relative w-full max-w-md overflow-hidden rounded-2xl border-2 border-dashed border-blue-300 bg-gradient-to-br from-blue-50 to-white p-6 shadow-2xl dark:border-blue-700 dark:from-blue-900/20 dark:to-gray-800">
                        {/* Close button */}
                        <button
                            onClick={() => setSelectedCheque(null)}
                            className="absolute right-4 top-4 rounded-full bg-gray-200 p-2 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                        >
                            ✕
                        </button>

                        {/* Cheque Header */}
                        <div className="mb-6 flex items-center gap-3">
                            <div className="rounded-full bg-blue-600 p-3">
                                <span className="text-xl text-white">💳</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100">CHEQUE</h3>
                                <p className="text-sm text-blue-600 dark:text-blue-300">Payment ID: {selectedCheque.payment_id}</p>
                            </div>
                        </div>

                        {/* Cheque Details */}
                        <div className="space-y-4">
                            {/* Pay To */}
                            <div className="rounded-lg bg-white/80 p-4 dark:bg-gray-700/50">
                                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">PAY TO THE ORDER OF</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedCheque.client_fullname}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Case #{selectedCheque.case_id}</p>
                            </div>

                            {/* Amount */}
                            <div className="rounded-lg bg-green-50 p-4 text-center dark:bg-green-900/20">
                                <p className="text-sm font-medium text-green-700 dark:text-green-300">AMOUNT</p>
                                <p className="text-3xl font-bold text-green-800 dark:text-green-200">
                                    {formatCurrency(selectedCheque.payment_amount)}
                                </p>
                            </div>

                            {/* Account Details */}
                            <div className="grid grid-cols-1 gap-3">
                                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">CHEQUE NAME</p>
                                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {selectedCheque.cheque_name || selectedCheque.check_name || "N/A"}
                                    </p>
                                </div>
                                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">CHEQUE NUMBER</p>
                                    <p className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                                        {selectedCheque.cheque_number || selectedCheque.check_number || "N/A"}
                                    </p>
                                </div>
                                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">BANK BRANCH</p>
                                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {selectedCheque.cheque_branch || selectedCheque.check_branch || "N/A"}
                                    </p>
                                </div>
                                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">BRANCH LOCATION</p>
                                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {selectedCheque.cheque_location || selectedCheque.check_location || "N/A"}
                                    </p>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="border-t pt-4 text-center text-sm text-gray-600 dark:text-gray-400">
                                <p>Date: {formatDateTime(selectedCheque.payment_date)}</p>
                                <p>
                                    Processed by: {selectedCheque.user_fname} {selectedCheque.user_mname} {selectedCheque.user_lname}
                                </p>
                            </div>
                        </div>

                        {/* Decorative Elements */}
                        <div className="absolute -right-8 -top-8 h-16 w-16 rounded-full bg-blue-200/30 dark:bg-blue-800/20"></div>
                        <div className="absolute -bottom-4 -left-4 h-8 w-8 rounded-full bg-blue-300/40 dark:bg-blue-700/30"></div>
                    </div>
                </div>
            )}

            {/* Cash Payment Details Modal */}
            {selectedCash && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="relative w-full max-w-md overflow-hidden rounded-2xl border-2 border-dashed border-green-300 bg-gradient-to-br from-green-50 to-white p-6 shadow-2xl dark:border-green-700 dark:from-green-900/20 dark:to-gray-800">
                        {/* Close button */}
                        <button
                            onClick={() => setSelectedCash(null)}
                            className="absolute right-4 top-4 rounded-full bg-gray-200 p-2 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                        >
                            ✕
                        </button>

                        {/* Cash Header */}
                        <div className="mb-6 flex items-center gap-3">
                            <div className="rounded-full bg-green-600 p-3">
                                <span className="text-xl text-white">💵</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-green-900 dark:text-green-100">CASH PAYMENT</h3>
                                <p className="text-sm text-green-600 dark:text-green-300">Payment ID: {selectedCash.payment_id}</p>
                            </div>
                        </div>

                        {/* Cash Payment Details */}
                        <div className="space-y-4">
                            {/* Pay To */}
                            <div className="rounded-lg bg-white/80 p-4 dark:bg-gray-700/50">
                                <p className="text-sm font-medium text-green-700 dark:text-green-300">PAYMENT MADE TO</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedCash.client_fullname}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Case #{selectedCash.case_id}</p>
                            </div>

                            {/* Amount */}
                            <div className="rounded-lg bg-green-50 p-4 text-center dark:bg-green-900/20">
                                <p className="text-sm font-medium text-green-700 dark:text-green-300">AMOUNT PAID</p>
                                <p className="text-3xl font-bold text-green-800 dark:text-green-200">{formatCurrency(selectedCash.payment_amount)}</p>
                            </div>

                            {/* Payment Method */}
                            <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-700/50">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">PAYMENT METHOD</p>
                                <div className="mt-2 flex items-center justify-center gap-2">
                                    <span className="text-2xl">💵</span>
                                    <p className="text-lg font-bold text-green-800 dark:text-green-200">CASH</p>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="border-t pt-4 text-center text-sm text-gray-600 dark:text-gray-400">
                                <p>Date: {formatDateTime(selectedCash.payment_date)}</p>
                                <p>
                                    Processed by: {selectedCash.user_fname} {selectedCash.user_mname} {selectedCash.user_lname}
                                </p>
                            </div>
                        </div>

                        {/* Decorative Elements */}
                        <div className="absolute -right-8 -top-8 h-16 w-16 rounded-full bg-green-200/30 dark:bg-green-800/20"></div>
                        <div className="absolute -bottom-4 -left-4 h-8 w-8 rounded-full bg-green-300/40 dark:bg-green-700/30"></div>
                    </div>
                </div>
            )}
        </div>
    );
};
