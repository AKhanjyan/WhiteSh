'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth/AuthContext';
import { Card, Button, Input } from '@shop/ui';
import { apiClient } from '../../../lib/api-client';

interface User {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  roles: string[];
  blocked: boolean;
  createdAt: string;
}

interface UsersResponse {
  data: User[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function UsersPage() {
  const { isLoggedIn, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<UsersResponse['meta'] | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'customer'>('all');

  useEffect(() => {
    if (!isLoading) {
      if (!isLoggedIn || !isAdmin) {
        router.push('/admin');
        return;
      }
    }
  }, [isLoggedIn, isAdmin, isLoading, router]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      console.log('👥 [ADMIN] Fetching users...', { page, search, roleFilter });
      
      const response = await apiClient.get<UsersResponse>('/api/v1/admin/users', {
        params: {
          page: page.toString(),
          limit: '20',
          search: search || '',
          role: roleFilter === 'all' ? '' : roleFilter,
        },
      });

      console.log('✅ [ADMIN] Users fetched:', response);
      setUsers(response.data || []);
      setMeta(response.meta || null);
    } catch (err) {
      console.error('❌ [ADMIN] Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => {
    if (isLoggedIn && isAdmin) {
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, isAdmin, page, search, roleFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    // Ընտրում ենք միայն այն օգտատերերին, որոնք տեսանելի են ընթացիկ ֆիլտրով
    const visibleUsers =
      roleFilter === 'all'
        ? users
        : users.filter((u) =>
            roleFilter === 'admin'
              ? u.roles?.includes('admin')
              : u.roles?.includes('customer')
          );

    if (visibleUsers.length === 0) return;

    setSelectedIds((prev) => {
      const allIds = visibleUsers.map((u) => u.id);
      const hasAll = allIds.every((id) => prev.has(id));
      return hasAll ? new Set() : new Set(allIds);
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected users?`)) return;
    setBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const results = await Promise.allSettled(
        ids.map(id => apiClient.delete(`/api/v1/admin/users/${id}`))
      );
      const failed = results.filter(r => r.status === 'rejected');
      setSelectedIds(new Set());
      await fetchUsers();
      alert(`Bulk delete finished. Success: ${ids.length - failed.length}/${ids.length}`);
    } catch (err) {
      console.error('❌ [ADMIN] Bulk delete users error:', err);
      alert('Failed to delete selected users');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleToggleBlocked = async (userId: string, currentStatus: boolean, userName: string) => {
    try {
      const newStatus = !currentStatus;
      await apiClient.put(`/api/v1/admin/users/${userId}`, {
        blocked: newStatus,
      });
      
      console.log(`✅ [ADMIN] User ${newStatus ? 'blocked' : 'unblocked'} successfully`);
      
      // Refresh users list
      fetchUsers();
      
      if (newStatus) {
        alert(`User "${userName}" is now blocked and cannot login!`);
      } else {
        alert(`User "${userName}" is now active and can login.`);
      }
    } catch (err: any) {
      console.error('❌ [ADMIN] Error updating user status:', err);
      alert(`Error updating user status: ${err.message || 'Unknown error'}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn || !isAdmin) {
    return null;
  }

  // Տեսանելի օգտատերերի filter Admin / Customer ֆիլտրով
  const filteredUsers =
    roleFilter === 'all'
      ? users
      : users.filter((user) =>
          roleFilter === 'admin'
            ? user.roles?.includes('admin')
            : user.roles?.includes('customer')
        );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Admin Panel
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Manage Users</h1>
        </div>

        {/* Search */}
        <Card className="p-4 mb-6">
          <form onSubmit={handleSearch} className="flex flex-col gap-4">
            <div className="flex gap-4">
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email, phone, name..."
                className="flex-1"
              />
              <Button type="submit" variant="primary">
                Search
              </Button>
            </div>

            {/* Admin / Customer filter */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Admin / Customer
              </span>
              <div className="inline-flex rounded-full bg-gray-100 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setRoleFilter('all');
                    setPage(1);
                    console.log('👥 [ADMIN] Role filter changed to: all');
                  }}
                  className={`px-3 py-1 rounded-full transition-all ${
                    roleFilter === 'all'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRoleFilter('admin');
                    setPage(1);
                    console.log('👥 [ADMIN] Role filter changed to: admin');
                  }}
                  className={`px-3 py-1 rounded-full transition-all ${
                    roleFilter === 'admin'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Admins
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRoleFilter('customer');
                    setPage(1);
                    console.log('👥 [ADMIN] Role filter changed to: customer');
                  }}
                  className={`px-3 py-1 rounded-full transition-all ${
                    roleFilter === 'customer'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Customers
                </button>
              </div>
            </div>
          </form>
        </Card>

        {/* Users Table */}
        <Card className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No users found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label="Select all users"
                          checked={users.length > 0 && users.every(u => selectedIds.has(u.id))}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Roles
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            aria-label={`Select user ${user.email}`}
                            checked={selectedIds.has(user.id)}
                            onChange={() => toggleSelect(user.id)}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{user.id}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.email}</div>
                          {user.phone && (
                            <div className="text-sm text-gray-500">{user.phone}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-2">
                            {user.roles?.map((role) => (
                              <span
                                key={role}
                                className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                              >
                                {role}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.blocked ? (
                            <span
                              onClick={() => handleToggleBlocked(user.id, user.blocked, `${user.firstName} ${user.lastName}`)}
                              className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full cursor-pointer transition-all duration-200 hover:bg-red-200"
                              title="Click to unblock user"
                            >
                              Blocked
                            </span>
                          ) : (
                            <span
                              onClick={() => handleToggleBlocked(user.id, user.blocked, `${user.firstName} ${user.lastName}`)}
                              className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full cursor-pointer transition-all duration-200 hover:bg-green-200"
                              title="Click to block user"
                            >
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {meta && meta.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing page {meta.page} of {meta.totalPages} ({meta.total} total)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                      disabled={page === meta.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-700">Selected {selectedIds.size} users</div>
                <Button
                  variant="outline"
                  onClick={handleBulkDelete}
                  disabled={selectedIds.size === 0 || bulkDeleting}
                >
                  {bulkDeleting ? 'Deleting...' : 'Delete selected'}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

