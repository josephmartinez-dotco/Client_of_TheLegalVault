import React, { useEffect, useState } from "react";
import defaultAvatar from "../../assets/default-avatar.png";
import { FileText, Archive, User, Scale, LogIn, LogOut, AlertTriangle, Activity, Search, ListCheck, FilePlus2, BadgeCent } from "lucide-react";
import { useAuth } from "@/context/auth-context";

const Userlogs = () => {
    const { user } = useAuth();

    const [userLogs, setUserLogs] = useState([]);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [selectedDate, setSelectedDate] = useState("");

    const [visibleCount, setVisibleCount] = useState(5); // default number of logs to show

    // fetching user logs
    useEffect(() => {
        const fetchUserLogs = async () => {
            try {
                const endpoint =
                    user?.user_role === "Admin" ? "http://localhost:3000/api/user-logs" : `http://localhost:3000/api/user-logs/${user.user_id}`;

                const res = await fetch(endpoint, {
                    method: "GET",
                    credentials: "include",
                });

                if (!res.ok) throw new Error("Failed to fetch user logs");

                const data = await res.json();
                setUserLogs(data);
            } catch (error) {
                console.error("Failed to fetch user logs:", error);
                setError(error.message || "An error occurred while fetching logs.");
            }
        };

        fetchUserLogs();
    }, []);

    const getLogIcon = (log) => {
        const type = log.user_log_type?.toLowerCase();
        const action = log.user_log_action?.toLowerCase();

        if (type === "user log") return <User className="h-5 w-5" />;
        if (type === "client log") return <User className="h-5 w-5" />;
        if (type === "document log") return <FileText className="h-5 w-5" />;
        if (type === "case log") return <Scale className="h-5 w-5" />;
        if (type === "archive log") return <Archive className="h-5 w-5" />;
        if (type === "task log") return <ListCheck className="h-5 w-5" />;
        if (type === "support document log") return <FilePlus2 className="h-5 w-5" />;
        if (type === "payment log") return <BadgeCent className="h-5 w-5" />;

        if (/login/.test(action)) return <LogIn className="h-5 w-5" />;
        if (/logout/.test(action)) return <LogOut className="h-5 w-5" />;
        if (/fail|error/.test(action)) return <AlertTriangle className="h-5 w-5 text-red-500" />;

        return <Activity className="h-5 w-5" />;
    };

    const getTagColor = (action) => {
        if (/login/i.test(action)) return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
        if (/logout/i.test(action)) return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
        if (/User account update/i.test(action)) return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
        if (/Updated Profile Information/i.test(action)) return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
        if (/client/i.test(action)) return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
        if (/contact/i.test(action)) return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
        if (/archived/i.test(action)) return "bg-slate-700 text-white dark:bg-white dark:text-black";
        if (/case/i.test(action)) return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
        if (/task/i.test(action)) return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
        if (/support document/i.test(action)) return "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300";
        if (/fail|error/i.test(action)) return "bg-red-100 text-red-700";
        if (/payment/i.test(action)) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
        return "bg-gray-100 text-gray-700 dark:bg-gray-700/20 dark:text-gray-300";
    };

    const getLogTag = (action) => {
        if (/login/i.test(action)) return "Login";
        if (/logout/i.test(action)) return "Logout";
        if (/User account update/i.test(action)) return "User Update";
        if (/update profile information/i.test(action)) return "User Profile Update";
        if (/new client/i.test(action)) return "New Client Added";
        if (/new contact/i.test(action)) return "New Client Contact Added";
        if (/updated client/i.test(action)) return "Client Update";
        if (/removed client/i.test(action)) return "Client Removed";
        if (/restored client/i.test(action)) return "Client Restored";
        if (/updated contact/i.test(action)) return "Client Contact Update";
        if (/removed contact/i.test(action)) return "Client Contact Removed";
        if (/new case/i.test(action)) return "New Case Added";
        if (/new allowed viewer/i.test(action)) return "Archive Access Granted";
        if (/archived/i.test(action)) return "Case Archived";
        if (/status: completed/i.test(action)) return "Case Closed / Completed";
        if (/status: dismissed/i.test(action)) return "Case Dismissed";
        if (/updated case/i.test(action)) return "Case Update";
        if (/task added/i.test(action)) return "New Task Added";
        if (/task updated/i.test(action)) return "Task Update";
        if (/new support document/i.test(action)) return "New Support Document Added";
        if (/support document updated/i.test(action)) return "Support Document Update";
        if (/fail|error/i.test(action)) return "Error";
        if (/payment/i.test(action)) return "Payment";
        return "Action";
    };

    // // Pagination
    // const [currentPage, setCurrentPage] = useState(1);
    // const itemsPerPage = 3;

    // Filtered directly in render
    const filteredLogs = userLogs.filter((log) => {
        const matchSearch =
            log.user_fullname?.toLowerCase().includes(search.toLowerCase()) ||
            log.user_log_type?.toLowerCase().includes(search.toLowerCase()) ||
            log.user_log_action?.toLowerCase().includes(search.toLowerCase());

        const matchDate = !selectedDate || log.user_log_time?.startsWith(selectedDate);

        return matchSearch && matchDate;
    });

    // // Pagination logic
    // const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
    // const startIndex = (currentPage - 1) * itemsPerPage;
    // const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="min-h-screen">
            {error && (
                <div className="mb-4 w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-red-50 shadow">
                    <div>
                        <span>{error}</span>
                    </div>
                </div>
            )}

            <div className="mb-6 flex flex-col gap-y-1">
                <h2 className="title">Activity Logs</h2>
                <p className="text-sm text-gray-500">Track and monitor user activities across the platform.</p>
            </div>

            {/* Filter Section */}
            <div className="mb-8 flex flex-wrap items-center gap-4 rounded-lg bg-white p-4 shadow-md dark:bg-slate-900">
                {/* Search input with icon */}
                <div className="relative flex-grow">
                    <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400"
                    />
                    <input
                        type="text"
                        placeholder="Search logs..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="focus:ring-0.5 h-10 w-full rounded-md border border-slate-300 bg-transparent pl-10 pr-3 text-slate-900 placeholder:text-slate-500 focus:border-blue-600 focus:outline-none focus:ring-blue-600 dark:border-slate-700 dark:text-slate-50 dark:placeholder:text-slate-400 dark:focus:border-blue-600 dark:focus:ring-blue-600"
                    />
                </div>

                {/* Date input */}
                <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="focus:ring-0.5 h-10 w-[150px] rounded-md border border-slate-300 bg-transparent px-2 py-1 text-sm text-slate-900 placeholder:text-slate-500 focus:border-blue-600 focus:outline-none focus:ring-blue-600 dark:border-slate-700 dark:text-slate-50 dark:placeholder:text-slate-400 dark:focus:border-blue-600 dark:focus:ring-blue-600"
                />
            </div>

            {/* Logs Section */}
            {filteredLogs.length > 0 ? (
                <div className="space-y-4">
                    {filteredLogs.slice(0, visibleCount).map((log, index) => {
                        const fullName = `${log.user_fullname ? log.user_fullname : "Unknown User"}`;
                        const avatar = log.user_profile ? `http://localhost:3000${log.user_profile}` : defaultAvatar;
                        const icon = getLogIcon(log);
                        const tag = getLogTag(log.user_log_action);
                        const tagColor = getTagColor(log.user_log_action);
                        const formattedTime = new Date(log.user_log_time).toLocaleString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                        });

                        return (
                            <div
                                key={index}
                                className="flex items-start rounded-lg bg-white p-4 text-black shadow-sm hover:shadow-md dark:bg-slate-800 dark:text-white"
                            >
                                {/* Avatar */}
                                <img
                                    src={avatar}
                                    alt={fullName}
                                    className="mr-4 h-12 w-12 rounded-full border"
                                />

                                {/* Details */}
                                <div className="flex-1">
                                    <div className="mb-1 flex items-center gap-3">
                                        <span className="font-semibold">{fullName}</span>
                                        <span className={`rounded px-2 py-1 text-xs font-medium ${tagColor}`}>{tag}</span>
                                    </div>
                                    <div className="text-dark-700 mb-1 flex items-center gap-2 text-sm">
                                        {icon}
                                        {log.user_log_type || "Unknown Type"}
                                        <span className="text-slate-400">{log.user_log_action}</span>
                                    </div>
                                </div>

                                {/* Timestamp and IP Address*/}
                                <div className="ml-4 text-right text-xs text-slate-500">
                                    <div>{formattedTime}</div>
                                    {user.user_role === "Admin" && log.user_ip_address && <div>IP: {log.user_ip_address}</div>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className="text-center text-gray-300">No logs available.</p>
            )}

            {visibleCount < filteredLogs.length && (
                <div className="mt-6 text-center">
                    <button
                        className="text-gray-800 underline hover:text-blue-300 dark:text-white dark:hover:text-blue-400"
                        onClick={() => setVisibleCount((prev) => prev + 5)}
                    >
                        Load More
                    </button>
                </div>
            )}

            {/*  Pagination Controls */}
            {/* {totalPages > 1 && (
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
            )} */}
            
        </div>
    );
};

export default Userlogs;
