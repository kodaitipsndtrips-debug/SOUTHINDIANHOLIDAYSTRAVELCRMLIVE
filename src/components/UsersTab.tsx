import React, { useState } from "react";
import * as Lucide from "lucide-react";
import { User } from "../types";

interface UsersTabProps {
  users: User[];
  onAddUser: (user: Partial<User>) => void;
  onUpdateUser: (id: string, user: Partial<User>) => void;
  onDeleteUser: (id: string) => void;
}

export default function UsersTab({
  users = [],
  onAddUser,
  onUpdateUser,
  onDeleteUser
}: UsersTabProps) {
  const safeUsers = Array.isArray(users) ? users : [];

  const [showForm, setShowForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("sales");

  // Custom granular permission states
  const [canView, setCanView] = useState(true);
  const [canAdd, setCanAdd] = useState(true);
  const [canEdit, setCanEdit] = useState(true);
  const [canDelete, setCanDelete] = useState(false);
  const [canModifyRights, setCanModifyRights] = useState(false);

  const handleRoleChange = (selectedRole: string) => {
    setRole(selectedRole);
    const isAdmin = selectedRole === "admin" || selectedRole === "superadmin";
    setCanView(true);
    setCanAdd(true);
    setCanEdit(true);
    setCanDelete(isAdmin);
    setCanModifyRights(isAdmin);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const permissions = {
      view: canView,
      add: canAdd,
      edit: canEdit,
      delete: canDelete,
      modifyRights: canModifyRights
    };

    if (editingUserId) {
      onUpdateUser(editingUserId, {
        fullName,
        mobile,
        email,
        username,
        password,
        role,
        permissions
      });
      setEditingUserId(null);
    } else {
      onAddUser({
        fullName,
        mobile,
        email,
        username,
        password,
        role,
        status: "Active",
        permissions
      });
    }
    setFullName("");
    setMobile("");
    setEmail("");
    setUsername("");
    setPassword("");
    setRole("sales");
    setCanView(true);
    setCanAdd(true);
    setCanEdit(true);
    setCanDelete(false);
    setCanModifyRights(false);
    setShowForm(false);
  };

  const handleEditClick = (u: User) => {
    setEditingUserId(u.id);
    setFullName(u.fullName);
    setMobile(u.mobile);
    setEmail(u.email || "");
    setUsername(u.username);
    setPassword(u.password || "");
    setRole(u.role);
    
    // Set custom permissions if defined, else fallback to defaults
    setCanView(u.permissions ? u.permissions.view : true);
    setCanAdd(u.permissions ? u.permissions.add : true);
    setCanEdit(u.permissions ? u.permissions.edit : true);
    setCanDelete(u.permissions ? u.permissions.delete : (u.role === "admin" || u.role === "superadmin"));
    setCanModifyRights(u.permissions ? u.permissions.modifyRights : (u.role === "admin" || u.role === "superadmin"));
    
    setShowForm(true);
  };

  const handleCancel = () => {
    setEditingUserId(null);
    setFullName("");
    setMobile("");
    setEmail("");
    setUsername("");
    setPassword("");
    setRole("sales");
    setCanView(true);
    setCanAdd(true);
    setCanEdit(true);
    setCanDelete(false);
    setCanModifyRights(false);
    setShowForm(false);
  };

  const toggleStatus = (user: User) => {
    const nextStatus = user.status === "Active" ? "Inactive" : "Active";
    onUpdateUser(user.id, { status: nextStatus });
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
            <Lucide.Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Staff Accounts & Security</h3>
            <p className="text-[10px] text-slate-500 font-semibold">Track active login authorizations, role mappings, and password parameters</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-600/10"
        >
          <Lucide.Plus className="w-4 h-4" />
          Create Team Profile
        </button>
      </div>

      {/* Staff profile addition form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4 text-xs animate-fadeIn">
          <div>
            <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Selva Kumar"
              className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Mobile Contact *</label>
            <input
              type="tel"
              required
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="9442310456"
              className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-white focus:outline-none font-mono"
            />
          </div>
          <div>
            <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Corporate Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="selva@southindianholidays.com"
              className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Login Username *</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="selvak"
              className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-white focus:outline-none font-mono"
            />
          </div>
          <div>
            <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Secure Password *</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-white focus:outline-none font-mono"
            />
          </div>
          <div>
            <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Assigned CRM Role</label>
            <select
              value={role}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-slate-300 focus:outline-none"
            >
              <option value="superadmin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="sales">Sales Representative Desk</option>
              <option value="operations">Operations Coordinator</option>
              <option value="accounts">Accounts & Finance Desk</option>
              <option value="accountant">Accountant</option>
            </select>
          </div>

          <div className="md:col-span-3 bg-slate-950/40 p-4 border border-slate-850 rounded-xl space-y-3">
            <h5 className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Granular Staff Permissions Checklists</h5>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <label className="flex items-center gap-2 text-slate-300 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={canView}
                  onChange={(e) => setCanView(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 cursor-pointer w-4 h-4"
                />
                <span>View Workspace</span>
              </label>
              <label className="flex items-center gap-2 text-slate-300 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={canAdd}
                  onChange={(e) => setCanAdd(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 cursor-pointer w-4 h-4"
                />
                <span>Add Record</span>
              </label>
              <label className="flex items-center gap-2 text-slate-300 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={canEdit}
                  onChange={(e) => setCanEdit(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 cursor-pointer w-4 h-4"
                />
                <span>Edit Record</span>
              </label>
              <label className="flex items-center gap-2 text-slate-300 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={canDelete}
                  onChange={(e) => setCanDelete(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 cursor-pointer w-4 h-4"
                />
                <span>Delete Record</span>
              </label>
              <label className="flex items-center gap-2 text-slate-300 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={canModifyRights}
                  onChange={(e) => setCanModifyRights(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 cursor-pointer w-4 h-4"
                />
                <span>Modify Rights</span>
              </label>
            </div>
          </div>
          <div className="md:col-span-3 flex justify-end gap-2 pt-1 border-t border-slate-850 mt-2">
            <button type="button" onClick={handleCancel} className="px-3 py-1.5 text-slate-400">Cancel</button>
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-1.5 rounded-lg">
              {editingUserId ? "Update Team Profile" : "Save Team Profile"}
            </button>
          </div>
        </form>
      )}

      {/* Staff lists table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg text-xs animate-fadeIn">
        <table className="w-full text-left">
          <thead className="bg-slate-950/40 text-[9px] uppercase font-black tracking-wider text-slate-400 border-b border-slate-850">
            <tr>
              <th className="p-3.5">Staff Member</th>
              <th className="p-3.5">CRM Role Assigned</th>
              <th className="p-3.5">Mobile Contact</th>
              <th className="p-3.5">Email Address</th>
              <th className="p-3.5">Login Username</th>
              <th className="p-3.5">Last Login Time</th>
              <th className="p-3.5 text-center">Deactivate</th>
              <th className="p-3.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {safeUsers.map(u => (
              <tr key={u.id} className="hover:bg-slate-950/20">
                <td className="p-3.5 font-black text-white">
                  <p>{u.fullName}</p>
                  <span className="text-[9px] text-slate-500 font-mono font-bold uppercase">{u.id}</span>
                </td>
                <td className="p-3.5 capitalize font-bold text-indigo-400">
                  <p>{u.role === "superadmin" ? "Super Admin" : u.role === "accounts" ? "Accounts" : u.role === "accountant" ? "Accounts" : u.role} Desk</p>
                  <div className="flex gap-1 mt-1.5 font-mono text-[8px] tracking-tight uppercase select-none">
                    <span className={`px-1 rounded border ${u.permissions?.view !== false ? "text-emerald-400 bg-emerald-950/45 border-emerald-900/30" : "text-slate-600 bg-slate-900/10 border-slate-800"}`} title="View Workspace">V</span>
                    <span className={`px-1 rounded border ${u.permissions?.add !== false ? "text-emerald-400 bg-emerald-950/45 border-emerald-900/30" : "text-slate-600 bg-slate-900/10 border-slate-800"}`} title="Add Record">A</span>
                    <span className={`px-1 rounded border ${u.permissions?.edit !== false ? "text-emerald-400 bg-emerald-950/45 border-emerald-900/30" : "text-slate-600 bg-slate-900/10 border-slate-800"}`} title="Edit Record">E</span>
                    <span className={`px-1 rounded border ${u.permissions?.delete ? "text-emerald-400 bg-emerald-950/45 border-emerald-900/30" : "text-slate-600 bg-slate-900/10 border-slate-800"}`} title="Delete Record">D</span>
                    <span className={`px-1 rounded border ${u.permissions?.modifyRights ? "text-indigo-400 bg-indigo-950/45 border-indigo-900/30" : "text-slate-600 bg-slate-900/10 border-slate-800"}`} title="Modify Rights">M</span>
                  </div>
                </td>
                <td className="p-3.5 font-mono font-medium text-slate-300">{u.mobile}</td>
                <td className="p-3.5 text-slate-400 font-medium">{u.email}</td>
                <td className="p-3.5 font-mono text-slate-400">{u.username}</td>
                <td className="p-3.5 text-slate-500 font-medium">{u.lastLogin || "Never"}</td>
                <td className="p-3.5 text-center">
                  <button
                    onClick={() => toggleStatus(u)}
                    className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase border cursor-pointer ${
                      u.status === "Active"
                        ? "bg-emerald-950 text-emerald-400 border-emerald-900/30"
                        : "bg-rose-950 text-rose-500 border-rose-900/30"
                    }`}
                  >
                    {u.status}
                  </button>
                </td>
                <td className="p-3.5 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleEditClick(u)}
                      className="text-slate-400 hover:text-indigo-400 p-1.5 rounded-lg hover:bg-indigo-500/10 transition-all cursor-pointer inline-flex items-center justify-center"
                      title="Edit User Account"
                    >
                      <Lucide.Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to permanently delete user account: ${u.fullName || u.username}?`)) {
                          onDeleteUser(u.id);
                        }
                      }}
                      className="text-slate-500 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-500/10 transition-all cursor-pointer inline-flex items-center justify-center"
                      title="Delete User Account"
                    >
                      <Lucide.Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
