import { useState, useRef, useEffect, useCallback } from "react";
import { Pencil, Trash2, Eye, EyeOff, RefreshCcw, Search } from "lucide-react";
import { useClickOutside } from "@/hooks/use-click-outside";
import AddClient from "../../components/add-client";
import { useAuth } from "@/context/auth-context";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const Client = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // redirect paralegals
    useEffect(() => {
        if (!user) return; // wait until auth state is known
        if (user.user_role === "Paralegal") {
            navigate("/unauthorized");
        }
    }, [user, navigate]);

    const [tableData, setTableData] = useState([]);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [users, setUsers] = useState([]);
    const [clientContacts, setClientContacts] = useState([]);

    const [showAllClients, setShowAllClients] = useState(false);

    const handleClientAdded = (newClient) => {
        setTableData((prev) => [newClient, ...prev]); // put new client on top
    };

    // Fetching clients, users, and contacts data for their relations
    const fetchAll = useCallback(async () => {
        try {
            const clients_endpoint =
                user?.user_role === "Admin" || user?.user_role === "Staff"
                    ? showAllClients
                        ? "http://localhost:3000/api/all-clients"
                        : "http://localhost:3000/api/clients"
                    : `http://localhost:3000/api/clients/${user.user_id}`;

            const [clientsRes, usersRes, contactsRes] = await Promise.all([
                fetch(clients_endpoint, { credentials: "include" }),
                fetch("http://localhost:3000/api/users", { credentials: "include" }),
                fetch("http://localhost:3000/api/client-contacts", { credentials: "include" }),
            ]);

            if (!clientsRes.ok || !usersRes.ok || !contactsRes.ok) throw new Error("Failed to fetch one or more resources");

            const [clients, users, contacts] = await Promise.all([clientsRes.json(), usersRes.json(), contactsRes.json()]);

            setTableData(clients);
            setUsers(users);
            setClientContacts(contacts);
        } catch (err) {
            console.error("Fetching error:", err);
            setError(err + ". You might want to check you server connection.");
        }
    }, [user, showAllClients]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const getUserFullName = (userId) => {
        const user = users.find((u) => u.user_id === userId);
        return user
            ? user.user_role === "Admin" || user.user_role === "Lawyer"
                ? `Atty. ${user.user_fname || ""} ${user.user_mname ? user.user_mname[0] + "." : ""} ${user.user_lname || ""}`
                      .replace(/\s+/g, " ")
                      .trim()
                : `${user.user_fname || ""} ${user.user_mname ? user.user_mname[0] + "." : ""} ${user.user_lname || ""}`.replace(/\s+/g, " ").trim()
            : "Unknown";
    };

    const [AddClients, setAddClients] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewClient, setViewClient] = useState(null);
    const [editClient, setEditClient] = useState(null);
    const [userToBeRemoved, setUserToBeRemoved] = useState(null);
    const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);

    const modalRef = useRef(null);
    useClickOutside([modalRef], () => {
        if (isModalOpen) setIsModalOpen(false);
    });

    const handleClientInfoUpdate = async (client) => {
        const toastId = toast.loading(`Updating client: ${client.client_fullname}`, {
            duration: Infinity,
        });

        try {
            const res = await fetch(`http://localhost:3000/api/clients/${client.client_id}`, {
                method: "PUT",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ ...editClient, client_last_updated_by: user.user_id }),
            });

            if (!res.ok) {
                throw new Error("Failed to update client");
            }

            toast.success("Client updated successfully!", { id: toastId, duration: 4000 });

            // Refresh data
            await fetchAll();

            // Close modal
            setEditClient(null);
        } catch (err) {
            console.error(err);
            toast.error("Error updating client information", { id: toastId, duration: 4000 });
        }
    };

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 5;

    const filteredClients = tableData.filter(
        (client) =>
            client.client_fullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.client_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.client_phonenum.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.client_date_created.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.client_status.toLowerCase().includes(searchTerm.toLowerCase()) ||
            getUserFullName(client.created_by).toLowerCase().includes(searchTerm.toLowerCase()),
    );

    // Legend counts (based on all clients, not just filtered)
    const activeCount = tableData.filter((c) => c.client_status.toLowerCase() === "active").length;
    const inactiveCount = tableData.filter((c) => c.client_status.toLowerCase() === "inactive").length;
    const removedCount = tableData.filter((c) => c.client_status.toLowerCase() === "removed").length;

    const totalPages = Math.ceil(filteredClients.length / rowsPerPage);
    const paginatedClients = filteredClients.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    const handleRestoreClient = async (client) => {
        const confirmRestore = window.confirm(`Are you sure you want to restore ${client.client_fullname}?`);

        if (confirmRestore) {
            const toastId = toast.loading(`Restoring client: ${client.client_fullname}`, {
                duration: 4000,
            });

            try {
                const res = await fetch(`http://localhost:3000/api/clients/${client.client_id}`, {
                    method: "PUT",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ ...client, client_status: "Active", client_last_updated_by: user.user_id }),
                });

                if (!res.ok) {
                    throw new Error("Failed to restore client");
                }

                toast.success("Client restored successfully!", { id: toastId, duration: 4000 });

                await fetchAll();
            } catch (err) {
                console.error(err);
                toast.error("Error restoring client", { id: toastId });
            }
        }
    };

    const openRemoveModal = (client) => {
        setUserToBeRemoved(client);
        setIsRemoveModalOpen(true);
    };

    const closeRemoveModal = () => {
        setUserToBeRemoved(null);
        setIsRemoveModalOpen(false);
    };

    const confirmRemoveClient = async (client) => {
        const toastId = toast.loading(`Removing client: ${client.client_fullname}`, {
            duration: Infinity,
        });

        try {
            const res = await fetch(`http://localhost:3000/api/clients/${client.client_id}`, {
                method: "PUT",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ ...client, client_status: "Removed", client_last_updated_by: user.user_id }),
            });

            if (!res.ok) {
                throw new Error("Failed to remove client");
            }

            toast.success("Client removed successfully!", { id: toastId, duration: 4000 });

            // Refresh data
            await fetchAll();

            closeRemoveModal();
        } catch (err) {
            console.error(err);
            toast.error("Error removing client", { id: toastId, duration: 4000 });
        }
    };

    return (
        <div className="bg-blue rounded-xl">
            {error && <div className="mb-4 w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-red-50 shadow">{error}</div>}

            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="title">Clients</h1>
                    <p className="text-sm text-gray-500">Manage all client information here.</p>
                </div>
            </div>

            <div className="card mb-6 flex flex-col items-center gap-4 rounded-lg bg-white p-4 shadow-md md:flex-row">
                <div className="focus:ring-0.5 flex flex-grow items-center gap-2 rounded-md border border-gray-300 bg-transparent px-3 py-2 focus-within:border-blue-600 focus-within:ring-blue-400 dark:border-slate-600 dark:focus-within:border-blue-600">
                    <Search
                        size={18}
                        className="text-gray-600 dark:text-gray-400"
                    />
                    <input
                        type="text"
                        placeholder="Search clients by name, company, email, phone or created by..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-transparent text-gray-900 placeholder-gray-500 outline-none dark:text-white dark:placeholder-gray-400"
                    />
                </div>

                {user?.user_role === "Admin" && (
                    <button
                        className="btn-ghost flex items-center gap-2"
                        onClick={() => setShowAllClients((prev) => !prev)}
                        title={showAllClients ? "Show Clients" : "Show All Clients"}
                    >
                        {showAllClients ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                )}

                <button
                    onClick={() => setAddClients(true)}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
                >
                    Add Client
                </button>
            </div>

            <div className="card w-full overflow-x-auto">
                <table className="min-w-full table-auto text-left text-sm">
                    <thead className="card-title text-xs uppercase">
                        <tr>
                            <th className="whitespace-nowrap px-4 py-3">Name / Company</th>
                            <th className="whitespace-nowrap px-4 py-3">Email</th>
                            <th className="whitespace-nowrap px-4 py-3">Phone</th>
                            <th className="whitespace-nowrap px-4 py-3">Date Created</th>
                            {user?.user_role !== "Lawyer" && <th className="whitespace-nowrap px-4 py-3">Lawyer</th>}
                            <th className="whitespace-nowrap px-4 py-3">Action</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700 dark:text-white">
                        {paginatedClients.length > 0 ? (
                            paginatedClients.map((client) => (
                                <tr
                                    key={client.client_id}
                                    className="border-t border-gray-200 transition hover:bg-blue-50 dark:border-gray-700 dark:hover:bg-slate-800"
                                >
                                    <td className="whitespace-nowrap px-4 py-3">
                                        <span
                                            className={`mr-2 inline-block h-2 w-4 rounded-full ${
                                                client.client_status === "Active"
                                                    ? "bg-green-500"
                                                    : client.client_status === "Inactive"
                                                      ? "bg-gray-400"
                                                      : "bg-red-500"
                                            }`}
                                        ></span>
                                        {client.client_fullname}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3">{client.client_email}</td>
                                    <td className="whitespace-nowrap px-4 py-3">{client.client_phonenum}</td>
                                    <td className="whitespace-nowrap px-4 py-3">{new Date(client.client_date_created).toLocaleDateString()}</td>
                                    {user?.user_role !== "Lawyer" && (
                                        <td className="whitespace-nowrap px-4 py-3">{getUserFullName(client.user_id)}</td>
                                    )}
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                className="p-1.5 text-blue-600 hover:text-blue-800"
                                                onClick={() => setViewClient(client)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            <button
                                                className="p-1.5 text-yellow-500 hover:text-yellow-700"
                                                onClick={() => setEditClient({ ...client })}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>

                                            {user.user_role !== "Staff" && client.client_status !== "Removed" ? (
                                                <button
                                                    className="p-1.5 text-red-600 hover:text-red-800"
                                                    onClick={() => openRemoveModal(client)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            ) : (
                                                client.client_status === "Removed" &&
                                                user.user_role !== "Staff" && (
                                                    <button
                                                        className="p-1.5 text-green-600 hover:text-green-800"
                                                        onClick={() => handleRestoreClient(client)}
                                                    >
                                                        <RefreshCcw className="h-4 w-4" />
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td
                                    colSpan="6"
                                    className="px-4 py-6 text-center text-slate-500 dark:text-slate-400"
                                >
                                    No clients found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-2 flex items-center justify-between px-4 py-3 text-sm text-gray-700 dark:text-white">
                {/* Legend */}
                <div className="mb-4 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
                        <span className="text-xs text-slate-500 dark:text-slate-300">Active ({activeCount})</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="inline-block h-3 w-3 rounded-full bg-gray-400" />
                        <span className="text-xs text-slate-500 dark:text-slate-300">Inactive ({inactiveCount})</span>
                    </div>
                    {user?.user_role === "Admin" && showAllClients && (
                        <div className="flex items-center gap-2">
                            <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
                            <span className="text-xs text-slate-500 dark:text-slate-300">Removed ({removedCount})</span>
                        </div>
                    )}
                </div>

                {totalPages > 1 && (
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
                )}
            </div>

            {/* Client Contacts link */}
            <div className="mt-4">
                <a
                    href="/clients/contacts"
                    className="text-blue-600 hover:underline"
                >
                    Go to Client Contacts {">"}
                </a>
            </div>

            {/* View Client Modal */}
            {viewClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="w-full max-w-screen-md rounded-xl bg-white p-8 shadow-lg dark:bg-slate-800">
                        <h3 className="mb-4 text-xl font-bold text-blue-900 dark:text-slate-200">
                            Client Information <span className="text-lg font-semibold text-slate-500">(Client ID: {viewClient.client_id})</span>{" "}
                        </h3>
                        <div className="grid grid-cols-1 gap-4 text-sm text-blue-900 sm:grid-cols-2">
                            <div>
                                <p className="font-semibold dark:text-blue-700">Name / Company</p>
                                <p className="text-gray-600 dark:text-slate-200">{viewClient.client_fullname}</p>
                            </div>
                            <div>
                                <p className="font-semibold dark:text-blue-700">Email</p>
                                <p className="text-gray-600 dark:text-slate-200">{viewClient.client_email || "-"}</p>
                            </div>
                            <div>
                                <p className="font-semibold dark:text-blue-700">Phone</p>
                                <p className="text-gray-600 dark:text-slate-200">{viewClient.client_phonenum || "-"}</p>
                            </div>

                            <div>
                                <p className="font-semibold dark:text-blue-700">Address</p>
                                <p className="text-gray-600 dark:text-slate-200">{viewClient.client_address || "-"}</p>
                            </div>

                            <div>
                                <p className="font-semibold dark:text-blue-700">Created by</p>
                                <p className="text-gray-600 dark:text-slate-200">{getUserFullName(viewClient.created_by)}</p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <p className="font-semibold dark:text-blue-700">Date Added</p>
                                    <p className="text-gray-600 dark:text-slate-200">
                                        {new Date(viewClient.client_date_created).toLocaleDateString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="font-semibold dark:text-blue-700">Status</p>
                                    <p className="text-gray-600 dark:text-slate-200">
                                        <span
                                            className={`rounded-full px-3 py-0.5 text-xs text-white ${
                                                viewClient.client_status === "Active"
                                                    ? "bg-green-600"
                                                    : viewClient.client_status === "Inactive"
                                                      ? "bg-gray-500"
                                                      : "bg-red-500"
                                            }`}
                                        >
                                            {viewClient.client_status}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            <div>
                                <p className="font-semibold dark:text-blue-700">Lawyer</p>
                                <p className="text-gray-600 dark:text-slate-200">{getUserFullName(viewClient.user_id)}</p>
                            </div>

                            <div>
                                <p className="font-semibold dark:text-blue-700">Last Updated by</p>
                                <p className="text-gray-600 dark:text-slate-200">
                                    {viewClient.client_last_updated_by ? getUserFullName(viewClient.client_last_updated_by) : "-"}
                                </p>
                            </div>

                            <div className="col-span-2 mt-4 w-full">
                                <p className="mb-2 font-semibold dark:text-blue-700">Contact(s)</p>
                                <table className="min-w-full table-auto overflow-x-auto text-left text-sm">
                                    <thead className="text-xs uppercase text-slate-500 dark:text-slate-400">
                                        <tr>
                                            <th className="whitespace-nowrap px-4 py-3">Name</th>
                                            <th className="whitespace-nowrap px-4 py-3">Email</th>
                                            <th className="whitespace-nowrap px-4 py-3">Phone</th>
                                            <th className="whitespace-nowrap px-4 py-3">Role / Relation</th>
                                            <th className="whitespace-nowrap px-4 py-3">Address</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-gray-600 dark:text-slate-200">
                                        {clientContacts.filter((contact) => contact.client_id === viewClient.client_id).length > 0 ? (
                                            clientContacts
                                                .filter((contact) => contact.client_id === viewClient.client_id)
                                                .map((contact) => (
                                                    <tr key={contact.contact_id}>
                                                        <td className="whitespace-nowrap px-4 py-2">{contact.contact_fullname}</td>
                                                        <td className="whitespace-nowrap px-4 py-2">{contact.contact_email}</td>
                                                        <td className="whitespace-nowrap px-4 py-2">{contact.contact_phone}</td>
                                                        <td className="whitespace-nowrap px-4 py-2">{contact.contact_role}</td>
                                                        <td className="whitespace-nowrap px-4 py-2">{contact.contact_address || "-"}</td>
                                                    </tr>
                                                ))
                                        ) : (
                                            <tr>
                                                <td
                                                    colSpan="5"
                                                    className="py-3 text-center text-gray-500"
                                                >
                                                    No contacts available for this client.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                onClick={() => setViewClient(null)}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-100"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Client Modal */}
            {editClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="w-full max-w-screen-md rounded-xl bg-white p-8 shadow-lg dark:bg-slate-800">
                        <h3 className="mb-4 text-xl font-bold text-blue-900 dark:text-slate-200">Edit Client Info</h3>
                        <div className="grid grid-cols-1 gap-4 text-sm text-blue-900 sm:grid-cols-2">
                            <div>
                                <p className="font-semibold dark:text-blue-700">Name / Company</p>
                                <input
                                    type="text"
                                    value={editClient.client_fullname}
                                    onChange={(e) => setEditClient({ ...editClient, client_fullname: e.target.value })}
                                    className="w-full rounded-md border px-3 py-2 text-slate-900 dark:bg-slate-700 dark:text-slate-50"
                                />
                            </div>
                            <div>
                                <p className="font-semibold dark:text-blue-700">Email</p>
                                <input
                                    type="email"
                                    value={editClient.client_email}
                                    onChange={(e) => setEditClient({ ...editClient, client_email: e.target.value })}
                                    className="w-full rounded-md border px-3 py-2 text-slate-900 dark:bg-slate-700 dark:text-slate-50"
                                />
                            </div>
                            <div>
                                <p className="font-semibold dark:text-blue-700">Phone</p>
                                <input
                                    type="text"
                                    value={editClient.client_phonenum}
                                    onChange={(e) => {
                                        // Remove non-digit characters
                                        const onlyNumbers = e.target.value.replace(/\D/g, "");
                                        // Limit to 11 digits
                                        if (onlyNumbers.length <= 11) {
                                            setEditClient({ ...editClient, client_phonenum: onlyNumbers });
                                        }
                                    }}
                                    className="w-full rounded-md border px-3 py-2 text-slate-900 dark:bg-slate-700 dark:text-slate-50"
                                />
                            </div>
                            <div>
                                <p className="font-semibold dark:text-blue-700">Status</p>
                                <select
                                    value={editClient.client_status}
                                    onChange={(e) => setEditClient({ ...editClient, client_status: e.target.value })}
                                    className="w-full rounded-md border px-3 py-2 text-slate-900 dark:bg-slate-700 dark:text-slate-50"
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                    {showAllClients && <option value="Removed">Removed</option>}
                                </select>
                            </div>
                            <div className="col-span-2">
                                <p className="font-semibold dark:text-blue-700">Address</p>
                                <input
                                    value={editClient.client_address}
                                    onChange={(e) => setEditClient({ ...editClient, client_address: e.target.value })}
                                    className="w-full rounded-md border px-3 py-2 text-slate-900 dark:bg-slate-700 dark:text-slate-50"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                onClick={() => setEditClient(null)}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleClientInfoUpdate(editClient)}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Remove Modal */}
            {isRemoveModalOpen && userToBeRemoved && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="relative w-full max-w-sm rounded-lg bg-white p-6 shadow-lg dark:bg-slate-800">
                        <h2 className="mb-4 text-lg font-semibold dark:text-white">Confirm Client Removal</h2>
                        <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">
                            Are you sure you want to remove <span className="font-semibold underline">{userToBeRemoved.client_fullname}</span>?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={closeRemoveModal}
                                className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => confirmRemoveClient(userToBeRemoved)}
                                className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                            >
                                Remove
                            </button>
                        </div>
                        <button
                            onClick={closeRemoveModal}
                            className="absolute right-2 top-2 text-xl text-gray-400 hover:text-gray-600"
                        ></button>
                    </div>
                </div>
            )}

            {AddClients && (
                <AddClient
                    AddClients={AddClients}
                    setAddClients={setAddClients}
                    onClientAdded={handleClientAdded}
                />
            )}
        </div>
    );
};

export default Client;
