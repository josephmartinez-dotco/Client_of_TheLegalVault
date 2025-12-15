import React, { useEffect, useState, useRef } from "react";
import PropTypes from "prop-types";
import { Mail, Phone, UserCheck, Building2, Pencil, Save, X, User, LockIcon, Clock, Image } from "lucide-react";
import toast from "react-hot-toast";
import default_avatar from "@/assets/default-avatar.png";

import { useClickOutside } from "@/hooks/use-click-outside";
import { useAuth } from "@/context/auth-context";

export const ProfileModal = ({ onClose }) => {
    const { user, setUser } = useAuth();

    const [preview, setPreview] = useState(user?.user_profile ? `http://localhost:3000${user.user_profile}` : default_avatar);
    const [newProfile, setNewProfile] = useState(null); // for file upload

    const [formData, setFormData] = useState(user || {});
    const [isEditing, setIsEditing] = useState(false);
    const [branchName, setBranchName] = useState("Loading...");
    const [loadingBranch, setLoadingBranch] = useState(true);

    const formatDateTime = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
        });
    };

    const modalRef = useRef(null);
    useClickOutside([modalRef], onClose);

    // Keep form data in sync with user
    useEffect(() => {
        setFormData(user || {});
    }, [user]);

    // Fetch branch name
    useEffect(() => {
        if (!user?.branch_id) return;

        const fetchBranchName = async () => {
            try {
                const res = await fetch("http://localhost:3000/api/branches", {
                    method: "GET",
                    credentials: "include",
                });
                const data = await res.json();
                const branch = data.find((b) => b.branch_id === user.branch_id);
                setBranchName(branch?.branch_name || "Unknown");
            } catch (error) {
                console.error("Failed to fetch branches:", error);
                setBranchName("Error");
            } finally {
                setLoadingBranch(false);
            }
        };

        fetchBranchName();
    }, [user?.branch_id]);

    // Conditional outline color for profile image
    const outlineColor =
        {
            Active: "outline-green-600",
            Pending: "outline-yellow-500",
            Suspended: "outline-red-500",
        }[formData.user_status] || "outline-gray-300";

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        if (name === "user_phonenum") {
            // Remove non-digit characters
            const onlyNumbers = value.replace(/\D/g, "");
            // Limit to 11 digits
            if (onlyNumbers.length <= 11) {
                setFormData((prev) => ({ ...prev, [name]: onlyNumbers }));
            }
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleSave = async () => {
        const toastId = toast.loading("Updating profile...", { duration: 4000 });

        try {
            let response;
            if (newProfile) {
                const form = new FormData();
                Object.entries(formData).forEach(([key, value]) => {
                    form.append(key, value);
                });
                form.append("user_profile", newProfile);
                form.append("user_last_updated_by", user.user_id);

                response = await fetch(`http://localhost:3000/api/users/${user.user_id}`, {
                    method: "PUT",
                    credentials: "include",
                    body: form,
                });
            } else {
                const formDataWithUpdater = { ...formData, user_last_updated_by: user.user_id };
                response = await fetch(`http://localhost:3000/api/users/${user.user_id}`, {
                    method: "PUT",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formDataWithUpdater),
                });
            }

            if (!response.ok) throw new Error("Failed to update user");

            const verifyRes = await fetch("http://localhost:3000/api/verify", {
                credentials: "include",
            });

            const { user: updatedUser } = await verifyRes.json();
            setUser(updatedUser);

            toast.success("Profile updated successfully.", { id: toastId, duration: 4000 });
            setIsEditing(false);
        } catch (err) {
            console.error(err);
            toast.error("Profile update failed!");
        }
    };

    const infoItems = [
        [
            { label: "User ID", name: "user_id", icon: <User size={16} />, editable: false },
            {
                label: "Date Created",
                name: "user_date_created",
                icon: <Clock size={16} />,
                editable: false,
                value: formatDateTime(formData.user_date_created),
            },
        ],
        { label: "Email", name: "user_email", icon: <Mail size={16} />, editable: true },
        { label: "Password", name: "user_password", icon: <LockIcon size={16} />, editable: true },
        { label: "Phone", name: "user_phonenum", icon: <Phone size={16} />, editable: true },
        { label: "Status", name: "user_status", icon: <UserCheck size={16} />, editable: false },
        {
            label: "Branch",
            name: "branchName",
            icon: <Building2 size={16} />,
            editable: false,
            value: branchName,
        },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div
                ref={modalRef}
                className="relative w-full max-w-md rounded-xl bg-white p-4 shadow-xl dark:bg-slate-900 sm:p-6 md:p-8"
            >
                {/* Close Button */}
                <button
                    className="btn-ghost absolute right-2 top-2"
                    onClick={onClose}
                >
                    <X size={20} />
                </button>

                {/* Profile Header */}
                <div className="flex flex-col items-center">
                    {isEditing ? (
                        <div className="mb-3 flex flex-col items-center">
                            <img
                                src={preview}
                                alt="Preview"
                                className={`mb-3 h-32 w-32 rounded-full object-cover p-1 outline outline-4 ${outlineColor}`}
                            />
                            <label className="text-gray flex cursor-pointer items-center gap-2 hover:underline">
                                <Image className="h-4 w-4 dark:text-slate-200" />
                                <span className="text-xs dark:text-slate-200 dark:hover:underline">Upload new profile</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            setNewProfile(file);
                                            setPreview(URL.createObjectURL(file));
                                        }
                                    }}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    ) : (
                        <img
                            src={user?.user_profile ? `http://localhost:3000${user.user_profile}` : default_avatar}
                            alt="Profile"
                            className={`mb-3 h-32 w-32 rounded-full object-cover p-1 outline outline-4 ${outlineColor}`}
                        />
                    )}

                    {/* User's Fullname */}
                    <h2 className="text-center text-lg font-bold text-gray-800 dark:text-white">
                        {[formData.user_fname, formData.user_mname, formData.user_lname].filter(Boolean).join(" ")}
                    </h2>
                    {/* User's Role */}
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formData.user_role === "Ad" ? "Super Lawyminer / Admin" : formData.user_role}
                    </p>
                </div>

                {/* Info List */}
                <div className="mt-6 space-y-3">
                    {infoItems.map((item, idx) =>
                        Array.isArray(item) ? (
                            <div
                                key={idx}
                                className="grid grid-cols-2 gap-3"
                            >
                                {item.map(({ label, name, icon, editable, value }) => (
                                    <div
                                        key={label}
                                        className="flex items-start gap-3 rounded bg-gray-100 px-3 py-2 text-xs text-gray-700 dark:bg-slate-800 dark:text-gray-200"
                                    >
                                        <div className="mt-1 text-blue-600 dark:text-blue-400">{icon}</div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
                                            {isEditing && editable ? (
                                                <input
                                                    type={name === "user_password" ? "password" : "text"}
                                                    name={name}
                                                    value={formData[name] || ""}
                                                    onChange={handleInputChange}
                                                    className="rounded bg-white px-2 py-1 text-gray-800 outline-none dark:bg-slate-700 dark:text-white"
                                                />
                                            ) : (
                                                <span>{name === "user_password" ? "●●●●●●●●" : (value ?? formData[name] ?? "")}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div
                                key={item.label}
                                className="flex items-start gap-3 rounded bg-gray-100 px-3 py-2 text-xs text-gray-700 dark:bg-slate-800 dark:text-gray-200"
                            >
                                <div className="mt-1 text-blue-600 dark:text-blue-400">{item.icon}</div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{item.label}</span>
                                    {isEditing && item.editable ? (
                                        <input
                                            type={item.name === "user_password" ? "password" : "text"}
                                            name={item.name}
                                            value={formData[item.name] || ""}
                                            onChange={handleInputChange}
                                            className="rounded bg-white px-2 py-1 text-sm text-gray-800 outline-1 dark:bg-slate-700 dark:text-white"
                                        />
                                    ) : (
                                        <span>{item.name === "user_password" ? "●●●●●●●●" : (item.value ?? formData[item.name] ?? "")}</span>
                                    )}
                                </div>
                            </div>
                        ),
                    )}
                </div>

                {/* Actions */}
                <div className="mt-6 flex justify-center gap-4">
                    {isEditing ? (
                        <>
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                            >
                                <Save size={16} /> Save
                            </button>
                            <button
                                onClick={() => {
                                    setIsEditing(false);
                                    setFormData(user || {});
                                    setPreview(user?.user_profile ? `http://localhost:3000${user.user_profile}` : default_avatar);
                                }}
                                className="flex items-center gap-2 rounded bg-gray-400 px-4 py-2 text-sm font-medium text-white hover:bg-gray-500"
                            >
                                <X size={16} /> Cancel
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="flex items-center gap-2 rounded bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            <Pencil size={16} /> Edit
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

ProfileModal.propTypes = {
    onClose: PropTypes.func.isRequired,
};
