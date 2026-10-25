
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./ManagerUser.css";
import API_BASE_URL from "../api";
const API_URL = `${API_BASE_URL}/users`;

const ManagerUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [deletingId, setDeletingId] = useState(null);
  const [pagination, setPagination] = useState({
  totalUsers: 0,
  currentPage: 1,
  totalPages: 0,
  pageSize: 10,
  hasNextPage: false,
  hasPreviousPage: false,
});

const [page, setPage] = useState(1);
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const response = await axios.get(API_URL, {
        params: {
          search: search.trim() || undefined,
          role: role === "all" ? undefined : role,
          page,
        limit: pagination.pageSize,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUsers(response.data.users || []);
      setPagination(response.data.pagination || {
    totalUsers: 0,
    currentPage: 1,
    totalPages: 0,
    pageSize: 10,
    hasNextPage: false,
    hasPreviousPage: false,
  });
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load users."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, role,page]);

  const handleDelete = async (user) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${user.name || user.email}?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(user._id);
      setError("");

      const token = localStorage.getItem("token");

      await axios.delete(`${API_URL}/${user._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (users.length === 1 && page > 1) {
  setPage((currentPage) => currentPage - 1);
} else {
  fetchUsers();
}
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to delete user."
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (loading && users.length === 0) {
    return <div className="manage-users-page">Loading users...</div>;
  }

  return (
    <section className="manage-users-page">
      <div className="manage-users-header">
        <div>
          <p className="manage-users-eyebrow">ADMINISTRATION</p>
          <h1>Manage Users</h1>
          <p>View and manage registered accounts.</p>
        </div>

        <div className="manage-users-total">
          <span>Total Users</span>
          <strong>{pagination.totalUsers}</strong>
        </div>
      </div>

      <div className="manage-users-toolbar">
        <input
          type="search"
          placeholder="Search by name or email..."
          value={search}
          onChange={(event) => {setSearch(event.target.value)
          setPage(1)}
          }
          aria-label="Search users"
        />

        <select
          value={role}
          onChange={(event) =>{ setRole(event.target.value)
            setPage(1)
          }}
          aria-label="Filter users by role"
        >
          <option value="all">All roles</option>
          <option value="user">Users</option>
          <option value="admin">Admins</option>
        </select>

        <button type="button" onClick={fetchUsers}>
          Refresh
        </button>
      </div>

      {error && (
        <p className="manage-users-error" role="alert">
          {error}
        </p>
      )}

      <div className="manage-users-table-wrapper">
        <table className="manage-users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Registered</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {users.map((user) => (
              <tr key={user._id}>
                <td>{user.name || "Unnamed"}</td>
                <td>{user.email}</td>
                <td>
                  <span
                    className={`manage-users-role ${
                      user.role === "admin" ? "admin" : "user"
                    }`}
                  >
                    {user.role || "user"}
                  </span>
                </td>
                <td>
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString()
                    : "N/A"}
                </td>
                <td>
                  <button
                    type="button"
                    className="manage-users-delete"
                    disabled={
                      deletingId === user._id ||
                      user._id ===
                        JSON.parse(
                          localStorage.getItem("user") || "null"
                        )?._id
                    }
                    onClick={() => handleDelete(user)}
                  >
                    {deletingId === user._id
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                </td>
              </tr>
            ))}

            {!loading && users.length === 0 && (
              <tr>
                <td colSpan="5" className="manage-users-empty">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        


      </div>
      <div className="pagination">
  <p>
    Total users: <strong>{pagination.totalUsers}</strong>
    {" | "}
    Page <strong>{pagination.totalPages === 0 ? 0 : pagination.currentPage}</strong>
    {" of "}
    <strong>{pagination.totalPages}</strong>
  </p>

  <div className="pagination-buttons">
    <button
      type="button"
      onClick={() => setPage((current) => current - 1)}
      disabled={!pagination.hasPreviousPage || loading}
    >
      Previous
    </button>

    <button
      type="button"
      onClick={() => setPage((current) => current + 1)}
      disabled={!pagination.hasNextPage || loading}
    >
      Next
    </button>
  </div>
</div>
    </section>
  );
};

export default ManagerUsers;
