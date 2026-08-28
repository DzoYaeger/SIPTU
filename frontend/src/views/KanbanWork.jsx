import { useCallback, useEffect, useState, useMemo } from 'react';
import {
    App as AntdApp,
    DatePicker,
    Input,
    Select,
    Table,
    Tooltip,
    Tag,
    Button,
    Modal,
    Form,
    Upload,
    Dropdown,
    Radio,
    Checkbox,
    Popconfirm,
    Empty,
    Badge,
    Tabs,
    Spin,
    Popover,
} from 'antd';
import {
    DownOutlined,
    UpOutlined,
    CompressOutlined,
    ExpandOutlined,
    WarningOutlined,
    FireOutlined,
    FilterOutlined,
    CloseOutlined,
    ArrowLeftOutlined,
    PlusOutlined,
    SearchOutlined,
    ReloadOutlined,
    AppstoreOutlined,
    UnorderedListOutlined,
    CalendarOutlined,
    PaperClipOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    EditOutlined,
    DeleteOutlined,
    UserOutlined,
    ClearOutlined,
    UploadOutlined,
    DownloadOutlined,
    FileTextOutlined,
    MoreOutlined,
    CheckOutlined,
    RightOutlined,
    SyncOutlined,
    TeamOutlined,
    LockOutlined,
    GlobalOutlined,
    FolderOutlined,
    ThunderboltOutlined,
    SafetyCertificateOutlined,
    CompassOutlined,
    SettingOutlined,
    UserAddOutlined,
    SendOutlined,
    HistoryOutlined,
    MessageOutlined,
    CommentOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { buildMessageAdapter } from '../utils/notify.js';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/id';
import './KanbanWork.css';

dayjs.locale('id');
dayjs.extend(relativeTime);

const DATE_API = 'YYYY-MM-DD';
const DATE_UI = 'DD/MM/YYYY';

const API_BASE = (import.meta.env.VITE_API_URL || 'https://siptu.bpompalopo.com/core_api/api').replace(/\/+$/, '');
const getSubtaskFileUrl = (subtaskId) => `${API_BASE}/public/kanban-tasks/subtasks/${subtaskId}/file?download=1`;
const getReportFileUrl = (reportId) => `${API_BASE}/public/kanban-tasks/reports/${reportId}/file?download=1`;

const ALLOWED_UPLOAD_ACCEPT = '.pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg';
const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'];
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];

const isAllowedFileType = (file) => {
    if (!file) return false;
    const fileName = (file.name || '').toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
    const hasValidMime = ALLOWED_MIME_TYPES.includes(file.type);
    return hasValidExt || hasValidMime;
};

const COLUMNS = [
    { key: 'todo', title: 'Belum Dimulai', dotClass: 'kanban-column-dot--todo' },
    { key: 'in_progress', title: 'Dalam Proses', dotClass: 'kanban-column-dot--in_progress' },
    { key: 'review', title: 'Review / Verifikasi', dotClass: 'kanban-column-dot--review' },
    { key: 'done', title: 'Selesai', dotClass: 'kanban-column-dot--done' },
];

const PRIORITY_CONFIG = {
    urgent: { label: 'Mendesak', className: 'kanban-badge-priority--urgent' },
    high: { label: 'Tinggi', className: 'kanban-badge-priority--high' },
    medium: { label: 'Sedang', className: 'kanban-badge-priority--medium' },
    low: { label: 'Rendah', className: 'kanban-badge-priority--low' },
};

const COLOR_PALETTE = [
    '#0F5B99', // Azure Blue
    '#0284c7', // Sky Blue
    '#10b981', // Emerald
    '#8b5cf6', // Violet
    '#f59e0b', // Amber
    '#ef4444', // Rose Red
    '#64748b', // Slate Gray
    '#0d9488', // Teal
];

function getInitials(name) {
    if (!name) return 'PG';
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'PG';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getGroupIcon(iconName) {
    switch (iconName) {
        case 'global': return <GlobalOutlined />;
        case 'lock': return <LockOutlined />;
        case 'user': return <UserOutlined />;
        case 'folder': return <FolderOutlined />;
        case 'thunderbolt': return <ThunderboltOutlined />;
        case 'safety': return <SafetyCertificateOutlined />;
        case 'compass': return <CompassOutlined />;
        default: return <TeamOutlined />;
    }
}

function formatChannelName(name) {
    if (!name || typeof name !== 'string') return 'channel';
    return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function KanbanWorkInner() {
    const { apiFetch, user } = useAuth();
    const navigate = useNavigate();

    const { message } = AntdApp.useApp();
    const notification = buildMessageAdapter(message);

    // ── Groupings / Workspaces State ──
    const [groups, setGroups] = useState([]);
    const [activeGroupId, setActiveGroupId] = useState('all');
    const [groupSearch, setGroupSearch] = useState('');
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [groupModalMode, setGroupModalMode] = useState('create');
    const [editingGroup, setEditingGroup] = useState(null);
    const [groupSubmitting, setGroupSubmitting] = useState(false);
    const [groupForm] = Form.useForm();
    const [selectedGroupColor, setSelectedGroupColor] = useState('#0F5B99');

    // ── Tasks & Filter State ──
    const [tasks, setTasks] = useState([]);
    const [categories, setCategories] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('board');

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [employeeFilter, setEmployeeFilter] = useState('all');
    const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);

    const hasActiveFilters = priorityFilter !== 'all' || categoryFilter !== 'all' || employeeFilter !== 'all';
    const activeFilterCount = (priorityFilter !== 'all' ? 1 : 0) + (categoryFilter !== 'all' ? 1 : 0) + (employeeFilter !== 'all' ? 1 : 0);
    const handleResetAllFilters = () => {
        setPriorityFilter('all');
        setCategoryFilter('all');
        setEmployeeFilter('all');
        setSearch('');
    };

    // Sidebar Collapsed / Expanded state (for maximizing board workspace)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Discord Sidebar Category Collapse state
    const [collapsedCategories, setCollapsedCategories] = useState(new Set());
    const toggleCategory = (catKey) => {
        setCollapsedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(catKey)) next.delete(catKey);
            else next.add(catKey);
            return next;
        });
    };

    // Minimize & Maximize Task Cards State (Default: Minimized / Empty Set)
    const [expandedTaskIds, setExpandedTaskIds] = useState(new Set());

    // Inline Card Subtask Adder
    const [addingSubtaskTaskId, setAddingSubtaskTaskId] = useState(null);
    const [cardSubtaskInput, setCardSubtaskInput] = useState('');
    const [cardSubtaskPic, setCardSubtaskPic] = useState(undefined);
    const [cardSubtaskDueDate, setCardSubtaskDueDate] = useState(null);
    const [uploadingSubtaskId, setUploadingSubtaskId] = useState(null);

    // Create / Edit Modal State
    const [form] = Form.useForm();
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [editingTask, setEditingTask] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [initialSubtasks, setInitialSubtasks] = useState([]);

    // Detail & Subtask Execution Modal State
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [detailTask, setDetailTask] = useState(null);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const [newSubtaskPic, setNewSubtaskPic] = useState(undefined);
    const [newSubtaskDueDate, setNewSubtaskDueDate] = useState(null);

    // Dedicated Report Modal State
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportingTask, setReportingTask] = useState(null);

    // Work Reports & History State
    const [reports, setReports] = useState([]);
    const [reportsLoading, setReportsLoading] = useState(false);
    const [reportContent, setReportContent] = useState('');
    const [reportStatusUpdate, setReportStatusUpdate] = useState(undefined);
    const [reportFile, setReportFile] = useState(null);
    const [reportSubmitting, setReportSubmitting] = useState(false);
    const [activeDetailTab, setActiveDetailTab] = useState('subtasks');

    // ── Unread Reports Red Bubble State & Helpers ──
    const [readReportIds, setReadReportIds] = useState(() => {
        try {
            const saved = localStorage.getItem('siptu_kanban_read_reports');
            return saved ? new Set(JSON.parse(saved)) : new Set();
        } catch {
            return new Set();
        }
    });

    const isTaskReportUnread = (task) => {
        if (!task || !task.reports_count || task.reports_count === 0) return false;
        if (!task.latest_report_id) return false;
        return !readReportIds.has(task.latest_report_id);
    };

    const markTaskReportsAsRead = (taskOrId) => {
        if (!taskOrId) return;
        const task = typeof taskOrId === 'object' ? taskOrId : (tasks || []).find((t) => t.id === taskOrId);
        setReadReportIds((prev) => {
            const next = new Set(prev);
            if (task?.latest_report_id) {
                next.add(task.latest_report_id);
            }
            if (task?.reports && Array.isArray(task.reports)) {
                task.reports.forEach((r) => next.add(r.id));
            }
            if (typeof taskOrId === 'number' || typeof taskOrId === 'string') {
                next.add(taskOrId);
            }
            try {
                localStorage.setItem('siptu_kanban_read_reports', JSON.stringify([...next]));
            } catch (e) {
                console.error('Failed to save read report IDs:', e);
            }
            return next;
        });
    };

    const markTaskReportRead = markTaskReportsAsRead;

    // Activity Logs Modal State
    const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
    const [activityLogs, setActivityLogs] = useState([]);
    const [activityLoading, setActivityLoading] = useState(false);
    const [activityFilter, setActivityFilter] = useState('all');

    const fetchActivityLogs = async (groupId = null) => {
        setActivityLoading(true);
        try {
            const url = groupId && groupId !== 'all'
                ? `/kanban-groups/${groupId}/activities`
                : '/kanban-tasks/activities';
            const res = await apiFetch(url);
            if (!res.ok) throw new Error('Gagal memuat riwayat log aktivitas');
            const body = await res.json();
            setActivityLogs(body.data ?? []);
        } catch (e) {
            notification.error({ message: 'Gagal', description: e.message });
        } finally {
            setActivityLoading(false);
        }
    };

    const handleOpenActivityLogs = (groupId) => {
        setIsActivityModalOpen(true);
        fetchActivityLogs(groupId);
    };

    const getActivityBadge = (action) => {
        switch (action) {
            case 'task_created':
                return { text: 'Tugas Baru', color: '#0F5B99', icon: <PlusOutlined /> };
            case 'task_updated':
                return { text: 'Edit Tugas', color: '#0284c7', icon: <EditOutlined /> };
            case 'status_changed':
                return { text: 'Ubah Status', color: '#8b5cf6', icon: <SyncOutlined /> };
            case 'task_deleted':
                return { text: 'Hapus Tugas', color: '#ef4444', icon: <DeleteOutlined /> };
            case 'subtask_added':
                return { text: 'Tambah Tahap', color: '#0F5B99', icon: <PlusOutlined /> };
            case 'subtask_completed':
                return { text: 'Tahap Selesai', color: '#10b981', icon: <CheckCircleOutlined /> };
            case 'evidence_uploaded':
                return { text: 'Upload Berkas', color: '#f59e0b', icon: <UploadOutlined /> };
            case 'report_added':
                return { text: 'Riwayat Laporan', color: '#0F5B99', icon: <CommentOutlined /> };
            case 'report_deleted':
                return { text: 'Hapus Laporan', color: '#ef4444', icon: <DeleteOutlined /> };
            case 'group_created':
                return { text: 'Ruang Kerja Baru', color: '#10b981', icon: <TeamOutlined /> };
            case 'group_updated':
                return { text: 'Kelola Ruang Kerja', color: '#0284c7', icon: <SettingOutlined /> };
            case 'group_deleted':
                return { text: 'Hapus Ruang Kerja', color: '#ef4444', icon: <DeleteOutlined /> };
            default:
                return { text: 'Aktivitas', color: '#64748b', icon: <HistoryOutlined /> };
        }
    };

    // Fetch Employees
    const fetchEmployees = useCallback(async () => {
        try {
            const res = await apiFetch('/kanban-tasks/employees');
            if (res.ok) {
                const body = await res.json();
                setEmployees(body.data ?? []);
            }
        } catch (e) {
            console.error('Failed to fetch employees:', e);
        }
    }, [apiFetch]);

    // Fetch Groups
    const fetchGroups = useCallback(async () => {
        try {
            const res = await apiFetch('/kanban-groups');
            if (res.ok) {
                const body = await res.json();
                const data = body.data ?? [];
                setGroups(data);
            }
        } catch (e) {
            console.error('Failed to fetch kanban groups:', e);
        }
    }, [apiFetch]);

    // Fetch Tasks
    const fetchTasks = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (activeGroupId !== 'all') params.append('group_id', activeGroupId);
            if (search) params.append('q', search);
            if (statusFilter !== 'all') params.append('status', statusFilter);
            if (priorityFilter !== 'all') params.append('priority', priorityFilter);
            if (categoryFilter !== 'all') params.append('category', categoryFilter);
            if (employeeFilter === 'my') {
                params.append('my_tasks', '1');
            } else if (employeeFilter !== 'all') {
                params.append('employee_id', employeeFilter);
            }

            const res = await apiFetch(`/kanban-tasks?${params.toString()}`);
            if (!res.ok) throw new Error('Gagal mengambil data tugas');
            const body = await res.json();
            setTasks(body.data ?? []);
            if (body.categories) setCategories(body.categories);
        } catch (e) {
            notification.error({ message: 'Gagal memuat tugas', description: e.message });
        } finally {
            setLoading(false);
        }
    }, [apiFetch, activeGroupId, search, statusFilter, priorityFilter, categoryFilter, employeeFilter, notification]);

    useEffect(() => {
        fetchEmployees();
        fetchGroups();
    }, [fetchEmployees, fetchGroups]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    // Active Group Data Object
    const activeGroupObj = useMemo(() => {
        if (activeGroupId === 'all') return null;
        return (groups || []).find((g) => String(g?.id) === String(activeGroupId)) || null;
    }, [groups, activeGroupId]);

    // Filtered Groups for Right Sidebar
    const filteredGroups = useMemo(() => {
        if (!Array.isArray(groups)) return [];
        if (!groupSearch.trim()) return groups;
        const q = groupSearch.toLowerCase();
        return groups.filter((g) => (g?.name || '').toLowerCase().includes(q) || ((g?.description || '').toLowerCase().includes(q)));
    }, [groups, groupSearch]);

    // Main & Project group channels memoized safely
    const mainChannels = useMemo(() => {
        return filteredGroups.filter(g => (g?.name || '').toLowerCase() === 'umum' || g?.is_public || g?.type === 'public');
    }, [filteredGroups]);

    const projectChannels = useMemo(() => {
        return filteredGroups.filter(g => (g?.name || '').toLowerCase() !== 'umum' && !g?.is_public && g?.type !== 'public');
    }, [filteredGroups]);

    // Helper to get allowed employees for a given group/workspace
    const getAvailableEmployeesForGroup = useCallback((groupId) => {
        if (!groupId || groupId === 'all') return employees;
        const targetGroup = groups.find((g) => String(g.id) === String(groupId));
        if (!targetGroup) return employees;
        // If workspace is public or Umum, all employees are eligible
        if (targetGroup.is_public || targetGroup.type === 'public' || targetGroup.slug === 'umum' || targetGroup.name?.toLowerCase() === 'umum') {
            return employees;
        }
        // If private or team workspace, include workspace members + creator
        const memberIds = new Set((targetGroup.members || []).map((m) => m.id));
        if (targetGroup.created_by_employee_id) {
            memberIds.add(targetGroup.created_by_employee_id);
        }
        const filtered = employees.filter((emp) => memberIds.has(emp.id));
        return filtered.length > 0 ? filtered : employees;
    }, [groups, employees]);

    // Helper to get all eligible PICs for a specific task (workspace members + task assignees + creator)
    const getAvailableEmployeesForTask = useCallback((task) => {
        if (!task) return employees;
        const groupEmployees = getAvailableEmployeesForGroup(task.group_id);
        const map = new Map();
        groupEmployees.forEach((emp) => map.set(emp.id, emp));
        if (task.assignees && Array.isArray(task.assignees)) {
            task.assignees.forEach((emp) => map.set(emp.id, emp));
        }
        if (task.created_by_employee_id) {
            const creator = employees.find((e) => e.id === task.created_by_employee_id);
            if (creator) map.set(creator.id, creator);
        }
        if (task.subtasks && Array.isArray(task.subtasks)) {
            task.subtasks.forEach((st) => {
                if (st.assigned_employee) {
                    map.set(st.assigned_employee.id, st.assigned_employee);
                }
            });
        }
        const result = Array.from(map.values());
        return result.length > 0 ? result : employees;
    }, [getAvailableEmployeesForGroup, employees]);

    // Authorization: only task creator or administrator can change PIC & deadline
    const canEditTaskPicAndDeadline = useCallback((task) => {
        if (!task || !user) return false;
        if (user.role === 'admin' || user.role === 'superadmin' || user.is_admin) return true;
        if (task.created_by_user_id && Number(task.created_by_user_id) === Number(user.id)) return true;
        if (user.employee_id && task.created_by_employee_id && Number(task.created_by_employee_id) === Number(user.employee_id)) return true;
        return false;
    }, [user]);

    // Toggle single task card expand/collapse
    const toggleTaskExpand = (taskId, e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        setExpandedTaskIds((prev) => {
            const next = new Set(prev);
            if (next.has(taskId)) {
                next.delete(taskId);
            } else {
                next.add(taskId);
            }
            return next;
        });
    };

    // Toggle expand/collapse all cards
    const handleToggleExpandAll = () => {
        if (expandedTaskIds.size > 0) {
            setExpandedTaskIds(new Set()); // Collapse all (default minimized)
        } else {
            setExpandedTaskIds(new Set(tasks.map((t) => t.id))); // Expand all
        }
    };

    // ── Group Modal Handlers ──
    const handleOpenCreateGroup = () => {
        setGroupModalMode('create');
        setEditingGroup(null);
        setSelectedGroupColor('#0F5B99');
        groupForm.resetFields();
        groupForm.setFieldsValue({
            type: 'team',
            color: '#0F5B99',
            icon: 'team',
            member_ids: user?.employee_id ? [user.employee_id] : [],
        });
        setIsGroupModalOpen(true);
    };

    const handleOpenEditGroup = (g, e) => {
        if (e) e.stopPropagation();
        setGroupModalMode('edit');
        setEditingGroup(g);
        setSelectedGroupColor(g.color || '#0F5B99');
        groupForm.setFieldsValue({
            name: g.name,
            description: g.description,
            type: g.type || (g.is_public ? 'public' : 'team'),
            color: g.color || '#0F5B99',
            icon: g.icon || 'team',
            member_ids: (g.members ?? []).map((m) => m.id),
        });
        setIsGroupModalOpen(true);
    };

    const handleSaveGroup = async (values) => {
        setGroupSubmitting(true);
        try {
            const payload = {
                name: values.name,
                description: values.description,
                type: values.type,
                color: selectedGroupColor,
                icon: values.icon || 'team',
                member_ids: values.type === 'public' ? [] : (values.member_ids || []),
            };

            if (groupModalMode === 'create') {
                const res = await apiFetch('/kanban-groups', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.message || 'Gagal membuat ruang kerja grouping.');
                }
                const resData = await res.json();
                notification.success({ message: `Grouping "${values.name}" berhasil dibuat!` });
                if (resData.data?.id) {
                    setActiveGroupId(String(resData.data.id));
                }
            } else {
                const res = await apiFetch(`/kanban-groups/${editingGroup.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.message || 'Gagal memperbarui grouping.');
                }
                notification.success({ message: `Grouping "${values.name}" berhasil diperbarui.` });
            }

            setIsGroupModalOpen(false);
            fetchGroups();
            fetchTasks();
        } catch (e) {
            notification.error({ message: 'Gagal', description: e.message });
        } finally {
            setGroupSubmitting(false);
        }
    };

    const handleDeleteGroup = async (g, e) => {
        if (e) e.stopPropagation();
        try {
            const res = await apiFetch(`/kanban-groups/${g.id}`, { method: 'DELETE' });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Gagal menghapus grouping.');
            }
            notification.success({ message: `Grouping "${g.name}" berhasil dihapus.` });
            if (String(activeGroupId) === String(g.id)) {
                setActiveGroupId('all');
            }
            fetchGroups();
            fetchTasks();
        } catch (e) {
            notification.error({ message: 'Gagal', description: e.message });
        }
    };

    // Fetch Reports for a Task
    const fetchReports = async (taskId) => {
        setReportsLoading(true);
        try {
            const res = await apiFetch(`/kanban-tasks/${taskId}/reports`);
            if (res.ok) {
                const body = await res.json();
                setReports(body.data ?? []);
            }
        } catch (e) {
            console.error('Failed to fetch task reports:', e);
        } finally {
            setReportsLoading(false);
        }
    };

    // Update Single Task Detail in State
    const refreshSingleTask = async (taskId) => {
        try {
            const res = await apiFetch(`/kanban-tasks/${taskId}`);
            if (res.ok) {
                const body = await res.json();
                const updated = body.data;
                if (detailTask && detailTask.id === taskId) {
                    setDetailTask(updated);
                    fetchReports(taskId);
                }
                if (reportingTask && reportingTask.id === taskId) {
                    setReportingTask(updated);
                    fetchReports(taskId);
                }
                setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
            }
        } catch (e) {
            console.error('Failed to refresh task:', e);
        }
    };

    // Open Create Task Modal
    const handleOpenCreate = (defaultStatus = 'todo') => {
        setModalMode('create');
        setEditingTask(null);
        setInitialSubtasks([
            { id: Date.now(), title: '', assigned_employee_id: undefined, due_date: null },
        ]);
        form.resetFields();
        const defaultGId = activeGroupId !== 'all' ? Number(activeGroupId) : (groups[0]?.id || null);
        form.setFieldsValue({
            group_id: defaultGId,
            status: defaultStatus,
            priority: 'medium',
            due_date: dayjs().add(3, 'day'),
        });
        setIsFormModalOpen(true);
    };

    // Open Edit Task Modal
    const handleOpenEdit = (task) => {
        setModalMode('edit');
        setEditingTask(task);
        const matchedGroup = groups.find((g) => g.id === task.group_id) || groups.find((g) => g.name === task.category) || groups[0];
        const currentGroupId = matchedGroup ? matchedGroup.id : null;
        form.setFieldsValue({
            group_id: currentGroupId,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            due_date: task.due_date ? dayjs(task.due_date) : null,
            assignee_ids: (task.assignees ?? []).map((a) => a.id),
        });
        setIsFormModalOpen(true);
    };

    // Open Detail Modal
    const handleOpenDetail = (task) => {
        markTaskReportRead(task);
        setDetailTask(task);
        setNewSubtaskTitle('');
        setNewSubtaskPic(undefined);
        setNewSubtaskDueDate(null);
        setReportContent('');
        setReportStatusUpdate(undefined);
        setReportFile(null);
        setActiveDetailTab('subtasks');
        setIsDetailOpen(true);
        fetchReports(task.id);
    };

    // Open Dedicated Reports Modal from Card Bottom-Right
    const handleOpenReportsModal = (task, e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        markTaskReportRead(task);
        setReportingTask(task);
        setReportContent('');
        setReportStatusUpdate(undefined);
        setReportFile(null);
        setIsReportModalOpen(true);
        fetchReports(task.id);
    };

    // Submit Work Progress Report
    const handleSubmitReport = async () => {
        const currentTask = reportingTask || detailTask;
        if (!reportContent || !reportContent.trim() || !currentTask) {
            notification.warning({ message: 'Tulis isi riwayat / laporan pengerjaan terlebih dahulu.' });
            return;
        }
        if (reportFile && !isAllowedFileType(reportFile)) {
            notification.error({
                message: 'Format Berkas Tidak Didukung',
                description: 'Hanya berkas berformat PDF, PNG, JPG, dan JPEG yang dapat diunggah.',
            });
            return;
        }

        setReportSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('content', reportContent.trim());
            if (reportStatusUpdate) {
                formData.append('status_update', reportStatusUpdate);
            }
            if (reportFile) {
                formData.append('attachment_file', reportFile);
            }

            const res = await apiFetch(`/kanban-tasks/${currentTask.id}/reports`, {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Gagal menyimpan riwayat pengerjaan.');
            }

            notification.success({ message: 'Riwayat pengerjaan berhasil dicatat!' });
            setReportContent('');
            setReportStatusUpdate(undefined);
            setReportFile(null);
            fetchReports(currentTask.id);
            refreshSingleTask(currentTask.id);
            fetchTasks();
        } catch (e) {
            notification.error({ message: 'Gagal', description: e.message });
        } finally {
            setReportSubmitting(false);
        }
    };

    // Delete Work Report
    const handleDeleteReport = async (reportId) => {
        const currentTask = reportingTask || detailTask;
        try {
            const res = await apiFetch(`/kanban-tasks/reports/${reportId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Gagal menghapus riwayat.');
            notification.success({ message: 'Riwayat pengerjaan berhasil dihapus.' });
            if (currentTask) {
                fetchReports(currentTask.id);
                refreshSingleTask(currentTask.id);
                fetchTasks();
            }
        } catch (e) {
            notification.error({ message: 'Gagal', description: e.message });
        }
    };

    // Submit Task Create / Edit
    const handleSaveTask = async (values) => {
        setSubmitting(true);
        try {
            const selectedGroup = groups.find((g) => g.id === values.group_id);
            const payload = {
                group_id: values.group_id || null,
                title: values.title,
                description: values.description,
                status: values.status,
                priority: values.priority,
                category: selectedGroup ? selectedGroup.name : 'Umum',
                due_date: values.due_date ? values.due_date.format(DATE_API) : null,
                assignee_ids: values.assignee_ids || [],
            };

            if (modalMode === 'create') {
                const validSubtasks = initialSubtasks
                    .filter((s) => s.title && s.title.trim() !== '')
                    .map((s) => ({
                        title: s.title.trim(),
                        assigned_employee_id: s.assigned_employee_id || null,
                        due_date: s.due_date ? dayjs(s.due_date).format(DATE_API) : null,
                    }));
                payload.subtasks = validSubtasks;

                const res = await apiFetch('/kanban-tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (!res.ok) throw new Error('Gagal membuat tugas baru.');
                notification.success({ message: 'Tugas berhasil dibuat.' });
            } else {
                const res = await apiFetch(`/kanban-tasks/${editingTask.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (!res.ok) throw new Error('Gagal memperbarui tugas.');
                notification.success({ message: 'Tugas berhasil diperbarui.' });
            }

            setIsFormModalOpen(false);
            fetchTasks();
            fetchGroups();
        } catch (e) {
            notification.error({ message: 'Gagal', description: e.message });
        } finally {
            setSubmitting(false);
        }
    };

    // Quick Change Task Status Column
    const handleMoveStatus = async (taskId, newStatus) => {
        try {
            const res = await apiFetch(`/kanban-tasks/${taskId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) throw new Error('Gagal memindahkan status tugas.');
            notification.success({ message: `Status dipindahkan ke ${COLUMNS.find(c => c.key === newStatus)?.title}` });
            fetchTasks();
            fetchGroups();
            if (detailTask && detailTask.id === taskId) {
                refreshSingleTask(taskId);
            }
        } catch (e) {
            notification.error({ message: 'Gagal', description: e.message });
        }
    };

    // Delete Task
    const handleDeleteTask = async (taskId) => {
        try {
            const res = await apiFetch(`/kanban-tasks/${taskId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Gagal menghapus tugas.');
            notification.success({ message: 'Tugas berhasil dihapus.' });
            if (isDetailOpen && detailTask?.id === taskId) {
                setIsDetailOpen(false);
            }
            fetchTasks();
            fetchGroups();
        } catch (e) {
            notification.error({ message: 'Gagal', description: e.message });
        }
    };

    // Toggle Subtask Completion (Works from Card & Modal)
    const handleToggleSubtask = async (subtask, taskId) => {
        const nextStatus = subtask.status === 'completed' ? 'pending' : 'completed';
        try {
            const res = await apiFetch(`/kanban-tasks/subtasks/${subtask.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus }),
            });
            if (!res.ok) throw new Error('Gagal memperbarui status tahapan.');
            refreshSingleTask(taskId);
        } catch (e) {
            notification.error({ message: 'Gagal', description: e.message });
        }
    };

    // Update Subtask field (PIC, due date, etc.)
    const handleUpdateSubtaskField = async (subtaskId, fieldData, taskId) => {
        try {
            const res = await apiFetch(`/kanban-tasks/subtasks/${subtaskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fieldData),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Gagal memperbarui rincian tahapan.');
            }
            refreshSingleTask(taskId);
        } catch (e) {
            notification.error({ message: 'Gagal', description: e.message });
        }
    };

    // Upload Evidence to Nextcloud (Works from Card & Modal)
    const handleUploadEvidence = async (subtaskId, file, taskId) => {
        if (!isAllowedFileType(file)) {
            notification.error({
                message: 'Format Berkas Tidak Didukung',
                description: 'Hanya berkas berformat PDF, PNG, JPG, dan JPEG yang dapat diunggah.',
            });
            return;
        }

        setUploadingSubtaskId(subtaskId);
        try {
            const formData = new FormData();
            formData.append('evidence_file', file);
            formData.append('mark_completed', '1');

            const res = await apiFetch(`/kanban-tasks/subtasks/${subtaskId}/evidence`, {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Gagal mengunggah bukti ke Nextcloud.');
            }

            notification.success({ message: 'Bukti proses berhasil diunggah ke Nextcloud!' });
            refreshSingleTask(taskId);
        } catch (e) {
            notification.error({ message: 'Gagal Upload', description: e.message });
        } finally {
            setUploadingSubtaskId(null);
        }
    };

    // Add Subtask from Card Directly
    const handleAddSubtaskFromCard = async (task) => {
        if (!cardSubtaskInput || !cardSubtaskInput.trim()) {
            setAddingSubtaskTaskId(null);
            return;
        }
        try {
            const payload = {
                title: cardSubtaskInput.trim(),
                assigned_employee_id: cardSubtaskPic || null,
                due_date: cardSubtaskDueDate ? dayjs(cardSubtaskDueDate).format(DATE_API) : null,
            };
            const res = await apiFetch(`/kanban-tasks/${task.id}/subtasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error('Gagal menambah tahapan.');
            setCardSubtaskInput('');
            setCardSubtaskPic(undefined);
            setCardSubtaskDueDate(null);
            setAddingSubtaskTaskId(null);
            refreshSingleTask(task.id);
        } catch (e) {
            notification.error({ message: 'Gagal', description: e.message });
        }
    };

    // Add Subtask in Detail Modal
    const handleAddSubtaskInDetail = async () => {
        if (!newSubtaskTitle || !newSubtaskTitle.trim() || !detailTask) return;
        try {
            const payload = {
                title: newSubtaskTitle.trim(),
                assigned_employee_id: newSubtaskPic || null,
                due_date: newSubtaskDueDate ? dayjs(newSubtaskDueDate).format(DATE_API) : null,
            };
            const res = await apiFetch(`/kanban-tasks/${detailTask.id}/subtasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error('Gagal menambah tahapan.');
            setNewSubtaskTitle('');
            setNewSubtaskPic(undefined);
            setNewSubtaskDueDate(null);
            refreshSingleTask(detailTask.id);
        } catch (e) {
            notification.error({ message: 'Gagal', description: e.message });
        }
    };

    // Delete Subtask
    const handleDeleteSubtask = async (subtaskId, taskId) => {
        try {
            const res = await apiFetch(`/kanban-tasks/subtasks/${subtaskId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Gagal menghapus rincian tahapan.');
            refreshSingleTask(taskId);
        } catch (e) {
            notification.error({ message: 'Gagal', description: e.message });
        }
    };

    // Delete Evidence File
    const handleDeleteEvidence = async (subtaskId, taskId) => {
        try {
            const res = await apiFetch(`/kanban-tasks/subtasks/${subtaskId}/evidence`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Gagal menghapus berkas.');
            notification.success({ message: 'Berkas bukti Nextcloud berhasil dihapus.' });
            refreshSingleTask(taskId);
        } catch (e) {
            notification.error({ message: 'Gagal', description: e.message });
        }
    };

    // Table View Columns Definition
    const tableColumns = [
        {
            title: 'TUGAS',
            key: 'title',
            render: (_, r) => (
                <div style={{ cursor: 'pointer' }} onClick={() => handleOpenDetail(r)}>
                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>{r.title}</div>
                    {r.description && (
                        <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>{r.description}</div>
                    )}
                </div>
            ),
        },
        {
            title: 'RUANG KERJA',
            key: 'group',
            width: 140,
            render: (_, r) => (
                <span style={{ fontSize: 12, fontWeight: 600, color: r.group?.color || '#0F5B99' }}>
                    {r.group?.name || 'Umum'}
                </span>
            ),
        },
        {
            title: 'STATUS',
            key: 'status',
            width: 150,
            render: (_, r) => {
                const col = COLUMNS.find((c) => c.key === r.status) || COLUMNS[0];
                return (
                    <Select
                        size="small"
                        value={r.status}
                        onChange={(val) => handleMoveStatus(r.id, val)}
                        style={{ width: '100%' }}
                        className="kanban-select"
                    >
                        {COLUMNS.map((c) => (
                            <Select.Option key={c.key} value={c.key}>
                                <span className={`kanban-column-dot ${c.dotClass}`} style={{ display: 'inline-block', marginRight: 6 }} />
                                {c.title}
                            </Select.Option>
                        ))}
                    </Select>
                );
            },
        },
        {
            title: 'PRIORITAS',
            key: 'priority',
            width: 110,
            render: (_, r) => {
                const p = PRIORITY_CONFIG[r.priority] || PRIORITY_CONFIG.medium;
                return <span className={`kanban-badge-priority ${p.className}`}>{p.label}</span>;
            },
        },
        {
            title: 'PEGAWAI DITUGASKAN',
            key: 'assignees',
            width: 180,
            render: (_, r) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {(r.assignees ?? []).length === 0 ? (
                        <span style={{ color: '#94a3b8', fontSize: 11.5 }}>-</span>
                    ) : (
                        r.assignees.map((emp) => (
                            <Tooltip key={emp.id} title={`${emp.name} (${emp.nip || 'Pegawai'})`}>
                                <div className="kanban-assignee-avatar">
                                    {getInitials(emp.name)}
                                </div>
                            </Tooltip>
                        ))
                    )}
                </div>
            ),
        },
        {
            title: 'PROGRES TAHAPAN',
            key: 'progress',
            width: 140,
            render: (_, r) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className="kanban-progress-bar-bg" style={{ width: 60 }}>
                        <div className="kanban-progress-bar-fill" style={{ width: `${r.progress_percentage}%` }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                        {r.completed_subtasks_count}/{r.subtasks_count}
                    </span>
                </div>
            ),
        },
        {
            title: 'DEADLINE',
            key: 'due_date',
            width: 120,
            render: (_, r) => {
                if (!r.due_date) return <span style={{ color: '#94a3b8', fontSize: 11.5 }}>-</span>;
                const isOverdue = dayjs(r.due_date).isBefore(dayjs(), 'day') && r.status !== 'done';
                return (
                    <span style={{ fontSize: 11.5, color: isOverdue ? '#ef4444' : '#64748b', fontWeight: isOverdue ? 700 : 500 }}>
                        {dayjs(r.due_date).format(DATE_UI)}
                    </span>
                );
            },
        },
        {
            title: 'RIWAYAT',
            key: 'reports',
            width: 130,
            render: (_, r) => (
                <button
                    type="button"
                    className="kanban-report-quick-btn"
                    onClick={(e) => handleOpenReportsModal(r, e)}
                    title="Buka riwayat pengerjaan & tambah laporan"
                >
                    <CommentOutlined style={{ fontSize: 11.5 }} />
                    <span>{r.reports_count > 0 ? `${r.reports_count} Riwayat` : '+ Riwayat'}</span>
                    {isTaskReportUnread(r) && (
                        <Tooltip title="Ada riwayat/laporan baru">
                            <span className="kanban-unread-dot" />
                        </Tooltip>
                    )}
                </button>
            ),
        },
        {
            title: 'AKSI',
            key: 'actions',
            width: 70,
            render: (_, r) => (
                <Dropdown
                    menu={{
                        items: [
                            {
                                key: 'edit',
                                label: 'Edit Tugas',
                                icon: <EditOutlined />,
                                onClick: () => handleOpenEdit(r),
                            },
                            { type: 'divider' },
                            {
                                key: 'delete',
                                label: <span style={{ color: '#ef4444' }}>Hapus Tugas</span>,
                                icon: <DeleteOutlined style={{ color: '#ef4444' }} />,
                                onClick: () => {
                                    Modal.confirm({
                                        title: 'Hapus Tugas',
                                        content: `Hapus tugas "${r.title}" beserta seluruh berkas bukti Nextcloud?`,
                                        okText: 'Hapus',
                                        cancelText: 'Batal',
                                        okButtonProps: { danger: true },
                                        onOk: () => handleDeleteTask(r.id),
                                    });
                                },
                            },
                        ],
                    }}
                    trigger={['click']}
                    placement="bottomRight"
                >
                    <Button type="text" shape="circle" size="small" icon={<MoreOutlined style={{ fontSize: 16 }} />} />
                </Dropdown>
            ),
        },
    ];

    return (
        <div className="flow-workspace-root">
            <div className="flow-workspace">
                {/* ── 1. UNIFIED COMMAND & NAVIGATION TOPBAR ── */}
                <header className="flow-topbar">
                    <div className="flow-topbar__left">
                        <Button
                            type="text"
                            icon={<ArrowLeftOutlined />}
                            onClick={() => navigate('/app/layanan-mandiri')}
                            className="flow-topbar__toggle-btn"
                            title="Kembali ke Layanan Mandiri"
                        />
                        <Button
                            type="text"
                            icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="flow-topbar__toggle-btn"
                            title={sidebarCollapsed ? "Buka Panel Saluran" : "Tutup Panel Saluran"}
                        />

                        {/* Workspace / Channel Switcher Dropdown */}
                        <Dropdown
                            menu={{
                                items: [
                                    {
                                        key: 'all',
                                        label: (
                                            <span style={{ fontWeight: activeGroupId === 'all' ? 700 : 500 }}>
                                                🌐 Semua Ruang Kerja (Global)
                                            </span>
                                        ),
                                        onClick: () => setActiveGroupId('all'),
                                    },
                                    { type: 'divider' },
                                    ...groups.map((g) => ({
                                        key: String(g.id),
                                        label: (
                                            <span style={{ fontWeight: String(activeGroupId) === String(g.id) ? 700 : 500 }}>
                                                {g.type === 'private' ? '🔒' : '#'} {g.name} ({g.tasks_count || 0})
                                            </span>
                                        ),
                                        onClick: () => setActiveGroupId(String(g.id)),
                                    })),
                                    { type: 'divider' },
                                    {
                                        key: 'create-group',
                                        label: '+ Buat Ruang Kerja Baru',
                                        icon: <PlusOutlined />,
                                        onClick: handleOpenCreateGroup,
                                    },
                                ],
                            }}
                            trigger={['click']}
                        >
                            <div className="flow-workspace-pill">
                                <span className="flow-workspace-pill__icon">
                                    {activeGroupObj ? (activeGroupObj.type === 'private' ? '🔒' : '#') : '🌐'}
                                </span>
                                <span className="flow-workspace-pill__name">
                                    {activeGroupObj ? formatChannelName(activeGroupObj.name) : 'semua-ruang-kerja'}
                                </span>
                                <DownOutlined className="flow-workspace-pill__arrow" />
                            </div>
                        </Dropdown>

                        <span className="flow-topbar__count-badge">
                            {tasks.length} Tugas
                        </span>
                    </div>

                    {/* Center: Sleek Unified Search Input */}
                    <div className="flow-topbar__center">
                        <Input
                            placeholder="Cari tugas, PIC, tahapan..."
                            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            allowClear
                            className="flow-search-input"
                        />
                    </div>

                    {/* Right: Smart Filter Popover, View Mode Switcher, Activity Log, and Primary CTA */}
                    <div className="flow-topbar__right">
                        {/* Smart Filter Popover */}
                        <Popover
                            trigger="click"
                            open={filterPopoverOpen}
                            onOpenChange={setFilterPopoverOpen}
                            placement="bottomRight"
                            content={
                                <div className="flow-filter-popover">
                                    <div className="flow-filter-popover__header">
                                        <strong>Filter Papan</strong>
                                        {hasActiveFilters && (
                                          <Button
                                              type="link"
                                              size="small"
                                              onClick={handleResetAllFilters}
                                              style={{ padding: 0, height: 'auto', color: '#ef4444' }}
                                          >
                                              Reset Semua
                                          </Button>
                                        )}
                                    </div>

                                    <div className="flow-filter-popover__field">
                                        <label>Prioritas</label>
                                        <Select
                                            value={priorityFilter}
                                            onChange={setPriorityFilter}
                                            style={{ width: '100%' }}
                                            size="small"
                                        >
                                            <Select.Option value="all">Semua Prioritas</Select.Option>
                                            <Select.Option value="urgent">🔴 Mendesak</Select.Option>
                                            <Select.Option value="high">🟠 Tinggi</Select.Option>
                                            <Select.Option value="medium">🟡 Sedang</Select.Option>
                                            <Select.Option value="low">⚪ Rendah</Select.Option>
                                        </Select>
                                    </div>

                                    <div className="flow-filter-popover__field">
                                        <label>Kategori</label>
                                        <Select
                                            value={categoryFilter}
                                            onChange={setCategoryFilter}
                                            style={{ width: '100%' }}
                                            size="small"
                                        >
                                            <Select.Option value="all">Semua Kategori</Select.Option>
                                            {categories.map((cat) => (
                                                <Select.Option key={cat} value={cat}>{cat}</Select.Option>
                                            ))}
                                        </Select>
                                    </div>

                                    <div className="flow-filter-popover__field">
                                        <label>Tugaskan Kepada / PIC</label>
                                        <Select
                                            value={employeeFilter}
                                            onChange={setEmployeeFilter}
                                            style={{ width: '100%' }}
                                            size="small"
                                            showSearch
                                            optionFilterProp="children"
                                        >
                                            <Select.Option value="all">Semua Pegawai</Select.Option>
                                            <Select.Option value="my">★ Tugas Saya</Select.Option>
                                            {employees.map((emp) => (
                                                <Select.Option key={emp.id} value={String(emp.id)}>{emp.name}</Select.Option>
                                            ))}
                                        </Select>
                                    </div>
                                </div>
                            }
                        >
                            <Button
                                icon={<FilterOutlined />}
                                className={`flow-topbar__btn ${hasActiveFilters ? 'flow-topbar__btn--active' : ''}`}
                            >
                                Filter {hasActiveFilters && <span className="flow-filter-count-badge">{activeFilterCount}</span>}
                            </Button>
                        </Popover>

                        {/* Segmented View Mode */}
                        <div className="flow-view-switcher">
                            <button
                                type="button"
                                className={`flow-view-btn ${viewMode === 'board' ? 'flow-view-btn--active' : ''}`}
                                onClick={() => setViewMode('board')}
                                title="Tampilan Papan Kanban"
                            >
                                <AppstoreOutlined />
                            </button>
                            <button
                                type="button"
                                className={`flow-view-btn ${viewMode === 'table' ? 'flow-view-btn--active' : ''}`}
                                onClick={() => setViewMode('table')}
                                title="Tampilan Tabel Database"
                            >
                                <UnorderedListOutlined />
                            </button>
                        </div>

                        {/* Expand / Minimize All */}
                        {viewMode === 'board' && (
                            <Tooltip title={expandedTaskIds.size > 0 ? "Tutup Semua Rincian Kartu" : "Buka Semua Rincian Kartu"}>
                                <Button
                                    type="text"
                                    icon={expandedTaskIds.size > 0 ? <CompressOutlined /> : <ExpandOutlined />}
                                    onClick={handleToggleExpandAll}
                                    className="flow-topbar__icon-btn"
                                />
                            </Tooltip>
                        )}

                        {/* Activity Logs */}
                        <Tooltip title="Log Aktivitas & Audit">
                            <Button
                                type="text"
                                icon={<HistoryOutlined />}
                                onClick={() => handleOpenActivityLogs(activeGroupId)}
                                className="flow-topbar__icon-btn"
                            />
                        </Tooltip>

                        {/* Reload */}
                        <Tooltip title="Segarkan Data">
                            <Button
                                type="text"
                                icon={<ReloadOutlined spin={loading} />}
                                onClick={() => { fetchTasks(); fetchGroups(); }}
                                className="flow-topbar__icon-btn"
                            />
                        </Tooltip>

                        {/* Primary Action Button */}
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => handleOpenCreate('todo')}
                            className="flow-btn-primary"
                        >
                            Tugas Baru
                        </Button>
                    </div>
                </header>

                {/* ── 2. WORKSPACE BODY (UNIFIED SIDEBAR + CANVAS) ── */}
                <div className="flow-workspace__body">
                    {/* Seamless Left Channel Sidebar */}
                    {!sidebarCollapsed && (
                        <aside className="flow-sidebar">
                            <div className="flow-sidebar__search">
                                <Input
                                    size="small"
                                    placeholder="Cari ruang kerja..."
                                    prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                                    value={groupSearch}
                                    onChange={(e) => setGroupSearch(e.target.value)}
                                    allowClear
                                    className="flow-sidebar__search-input"
                                />
                            </div>

                            <div className="flow-sidebar__scroll">
                                {/* Section 1: RUANG KERJA UTAMA */}
                                <div className="flow-sidebar__section">
                                    <div className="flow-sidebar__section-title">
                                        <span>RUANG KERJA UTAMA</span>
                                    </div>

                                    <div
                                        className={`flow-channel-item ${activeGroupId === 'all' ? 'flow-channel-item--active' : ''}`}
                                        onClick={() => setActiveGroupId('all')}
                                    >
                                        <div className="flow-channel-item__main">
                                            <span className="flow-channel-item__icon">🌐</span>
                                            <span className="flow-channel-item__name">semua-ruang-kerja</span>
                                        </div>
                                        <span className="flow-channel-item__count">{tasks.length}</span>
                                    </div>

                                    {mainChannels.map((g) => {
                                        const isActive = String(activeGroupId) === String(g.id);
                                        return (
                                            <div
                                                key={g.id}
                                                className={`flow-channel-item ${isActive ? 'flow-channel-item--active' : ''}`}
                                                onClick={() => setActiveGroupId(String(g.id))}
                                            >
                                                <div className="flow-channel-item__main">
                                                    <span className="flow-channel-item__hash">#</span>
                                                    <span className="flow-channel-item__name">{formatChannelName(g.name)}</span>
                                                </div>
                                                <div className="flow-channel-item__actions">
                                                    <span className="flow-channel-item__count">{g.tasks_count || 0}</span>
                                                    {g.is_creator && (
                                                        <Button
                                                            type="text"
                                                            size="small"
                                                            icon={<SettingOutlined />}
                                                            className="flow-channel-item__gear"
                                                            onClick={(e) => handleOpenEditGroup(g, e)}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Section 2: TIM & PROYEK */}
                                <div className="flow-sidebar__section">
                                    <div className="flow-sidebar__section-title">
                                        <span>TIM & PROYEK ({projectChannels.length})</span>
                                        <Tooltip title="Buat Ruang Kerja Baru">
                                            <Button
                                                type="text"
                                                size="small"
                                                icon={<PlusOutlined />}
                                                onClick={handleOpenCreateGroup}
                                                className="flow-sidebar__add-btn"
                                            />
                                        </Tooltip>
                                    </div>

                                    {projectChannels.map((g) => {
                                        const isActive = String(activeGroupId) === String(g.id);
                                        return (
                                            <div
                                                key={g.id}
                                                className={`flow-channel-item ${isActive ? 'flow-channel-item--active' : ''}`}
                                                onClick={() => setActiveGroupId(String(g.id))}
                                            >
                                                <div className="flow-channel-item__main">
                                                    <span className="flow-channel-item__hash">{g.type === 'private' ? '🔒' : '#'}</span>
                                                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                                        <span className="flow-channel-item__name">{formatChannelName(g.name)}</span>
                                                        <span className="flow-channel-item__sub">
                                                            {g.type === 'private' ? 'Pribadi' : `${(g.members ?? []).length} Anggota`}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flow-channel-item__actions">
                                                    <span className="flow-channel-item__count">{g.tasks_count || 0}</span>
                                                    {g.is_creator && (
                                                        <Dropdown
                                                            menu={{
                                                                items: [
                                                                    {
                                                                        key: 'edit',
                                                                        label: 'Kelola / Edit',
                                                                        icon: <EditOutlined />,
                                                                        onClick: (e) => handleOpenEditGroup(g, e),
                                                                    },
                                                                    { type: 'divider' },
                                                                    {
                                                                        key: 'delete',
                                                                        label: <span style={{ color: '#ef4444' }}>Hapus Ruang Kerja</span>,
                                                                        icon: <DeleteOutlined style={{ color: '#ef4444' }} />,
                                                                        onClick: () => {
                                                                            Modal.confirm({
                                                                                title: 'Hapus Ruang Kerja',
                                                                                content: `Hapus ruang kerja "${g.name}"? Tugas di dalamnya akan tetap aman.`,
                                                                                okText: 'Hapus',
                                                                                cancelText: 'Batal',
                                                                                okButtonProps: { danger: true },
                                                                                onOk: () => handleDeleteGroup(g),
                                                                            });
                                                                        },
                                                                    },
                                                                ],
                                                            }}
                                                            trigger={['click']}
                                                            placement="bottomRight"
                                                        >
                                                            <Button
                                                                type="text"
                                                                size="small"
                                                                shape="circle"
                                                                icon={<SettingOutlined />}
                                                                className="flow-channel-item__gear"
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        </Dropdown>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Sidebar Footer: User Profile */}
                            <div className="flow-sidebar__footer">
                                <div className="flow-sidebar__user-avatar">
                                    {getInitials(user?.name)}
                                </div>
                                <div className="flow-sidebar__user-meta">
                                    <span className="flow-sidebar__user-name">{user?.name || 'Pegawai'}</span>
                                    <span className="flow-sidebar__user-dept">{user?.position || user?.department || 'Staff'}</span>
                                </div>
                            </div>
                        </aside>
                    )}

                    {/* Main Board / Table Canvas */}
                    <main className="flow-canvas">
                        {viewMode === 'board' ? (
                            <div className="flow-board">
                                {COLUMNS.map((col) => {
                                    const colTasks = tasks.filter((t) => t.status === col.key);
                                    const totalColSubtasks = colTasks.reduce((acc, t) => acc + (t.subtasks_count || 0), 0);
                                    const completedColSubtasks = colTasks.reduce((acc, t) => acc + (t.completed_subtasks_count || 0), 0);

                                    return (
                                        <div key={col.key} className="flow-column">
                                            <div className="flow-column__header">
                                                <div className="flow-column__header-left">
                                                    <span className={`flow-column__dot flow-column__dot--${col.key}`} />
                                                    <span className="flow-column__title">{col.title}</span>
                                                    <span className="flow-column__badge">{colTasks.length}</span>
                                                </div>
                                                <div className="flow-column__header-right">
                                                    {totalColSubtasks > 0 && (
                                                        <Tooltip title={`${completedColSubtasks} dari ${totalColSubtasks} tahapan selesai`}>
                                                            <span className="flow-column__subtask-counter">
                                                                {completedColSubtasks}/{totalColSubtasks} ✓
                                                            </span>
                                                        </Tooltip>
                                                    )}
                                                    <Button
                                                        type="text"
                                                        size="small"
                                                        icon={<PlusOutlined />}
                                                        className="flow-column__quick-add"
                                                        onClick={() => handleOpenCreate(col.key)}
                                                        title={`Tambah tugas ke ${col.title}`}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flow-column__body">
                                                {colTasks.length === 0 ? (
                                                    <div className="flow-column__empty">
                                                        Belum ada tugas di kolom ini
                                                    </div>
                                                ) : (
                                                    colTasks.map((task) => {
                                                        const isExpanded = expandedTaskIds.has(task.id);
                                                        const pConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                                                        const isOverdue = task.due_date && dayjs(task.due_date).isBefore(dayjs(), 'day') && task.status !== 'done';
                                                        const isToday = task.due_date && dayjs(task.due_date).isSame(dayjs(), 'day') && task.status !== 'done';
                                                        const groupAvailableEmployees = getAvailableEmployeesForTask(task);

                                                        return (
                                                            <div
                                                                key={task.id}
                                                                className={`flow-card ${isExpanded ? 'flow-card--expanded' : ''}`}
                                                                onClick={() => handleOpenDetail(task)}
                                                            >
                                                                {/* Card Top: Priority, Category, and Action Menu */}
                                                                <div className="flow-card__top">
                                                                    <div className="flow-card__meta">
                                                                        <span className={`flow-priority-dot flow-priority-dot--${task.priority || 'medium'}`} />
                                                                        <span className="flow-priority-text">{pConfig.label}</span>
                                                                        {task.category && (
                                                                            <>
                                                                                <span className="flow-card__meta-sep">•</span>
                                                                                <span className="flow-category-text">{task.category}</span>
                                                                            </>
                                                                        )}
                                                                        {activeGroupId === 'all' && task.group && (
                                                                            <>
                                                                                <span className="flow-card__meta-sep">•</span>
                                                                                <span className="flow-group-text">#{formatChannelName(task.group.name)}</span>
                                                                            </>
                                                                        )}
                                                                    </div>

                                                                    <div className="flow-card__actions" onClick={(e) => e.stopPropagation()}>
                                                                        <Button
                                                                            type="text"
                                                                            size="small"
                                                                            icon={isExpanded ? <DownOutlined /> : <RightOutlined />}
                                                                            className="flow-card__toggle-btn"
                                                                            onClick={(e) => toggleTaskExpand(task.id, e)}
                                                                            title={isExpanded ? "Tutup Rincian" : "Buka Rincian"}
                                                                        />

                                                                        <Dropdown
                                                                            menu={{
                                                                                items: [
                                                                                    {
                                                                                        key: 'shift-header',
                                                                                        label: <strong style={{ fontSize: 11, color: '#64748b' }}>Pindahkan Status:</strong>,
                                                                                        disabled: true,
                                                                                    },
                                                                                    ...COLUMNS.map((c) => ({
                                                                                        key: c.key,
                                                                                        label: (
                                                                                            <span style={{ fontWeight: task.status === c.key ? 700 : 400 }}>
                                                                                                <span className={`flow-column__dot flow-column__dot--${c.key}`} style={{ display: 'inline-block', marginRight: 6 }} />
                                                                                                {c.title}
                                                                                            </span>
                                                                                        ),
                                                                                        onClick: () => handleMoveStatus(task.id, c.key),
                                                                                    })),
                                                                                    { type: 'divider' },
                                                                                    {
                                                                                        key: 'edit',
                                                                                        label: 'Edit Tugas',
                                                                                        icon: <EditOutlined />,
                                                                                        onClick: () => handleOpenEdit(task),
                                                                                    },
                                                                                    {
                                                                                        key: 'delete',
                                                                                        label: <span style={{ color: '#ef4444' }}>Hapus Tugas</span>,
                                                                                        icon: <DeleteOutlined style={{ color: '#ef4444' }} />,
                                                                                        onClick: () => {
                                                                                            Modal.confirm({
                                                                                                title: 'Hapus Tugas',
                                                                                                content: `Hapus tugas "${task.title}" beserta seluruh berkas bukti Nextcloud?`,
                                                                                                okText: 'Hapus',
                                                                                                cancelText: 'Batal',
                                                                                                okButtonProps: { danger: true },
                                                                                                onOk: () => handleDeleteTask(task.id),
                                                                                            });
                                                                                        },
                                                                                    },
                                                                                ],
                                                                            }}
                                                                            trigger={['click']}
                                                                            placement="bottomRight"
                                                                        >
                                                                            <Button
                                                                                type="text"
                                                                                size="small"
                                                                                shape="circle"
                                                                                icon={<MoreOutlined />}
                                                                                className="flow-card__menu-btn"
                                                                            />
                                                                        </Dropdown>
                                                                    </div>
                                                                </div>

                                                                {/* Card Title */}
                                                                <h4 className="flow-card__title">{task.title}</h4>

                                                                {/* Subtasks Progress Summary */}
                                                                {task.subtasks_count > 0 && (
                                                                    <div className="flow-card__progress">
                                                                        <div className="flow-card__progress-info" onClick={(e) => toggleTaskExpand(task.id, e)}>
                                                                            <span>{task.completed_subtasks_count}/{task.subtasks_count} Tahap Selesai</span>
                                                                            <span className="flow-progress-percent">{task.progress_percentage}%</span>
                                                                        </div>
                                                                        <div className="flow-progress-track">
                                                                            <div
                                                                                className={`flow-progress-fill ${task.progress_percentage === 100 ? 'flow-progress-fill--done' : ''}`}
                                                                                style={{ width: `${task.progress_percentage}%` }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Expanded Content: Subtask checklist & Form */}
                                                                {isExpanded && (
                                                                    <div className="flow-card__expanded" onClick={(e) => e.stopPropagation()}>
                                                                        {task.description && (
                                                                            <p className="flow-card__desc">{task.description}</p>
                                                                        )}

                                                                        <div className="flow-subtasks-list">
                                                                            {(task.subtasks ?? []).map((st) => {
                                                                                const isStOverdue = st.due_date && dayjs(st.due_date).isBefore(dayjs(), 'day') && st.status !== 'completed';
                                                                                const isStToday = st.due_date && dayjs(st.due_date).isSame(dayjs(), 'day') && st.status !== 'completed';
                                                                                const canEditThisTask = canEditTaskPicAndDeadline(task);

                                                                                return (
                                                                                    <div key={st.id} className="flow-subtask-row">
                                                                                        <Checkbox
                                                                                            checked={st.status === 'completed'}
                                                                                            onChange={() => handleToggleSubtask(st, task.id)}
                                                                                            className="flow-subtask-check"
                                                                                        />
                                                                                        <div className="flow-subtask-body">
                                                                                            <span className={`flow-subtask-text ${st.status === 'completed' ? 'flow-subtask-text--done' : ''}`}>
                                                                                                {st.title}
                                                                                            </span>

                                                                                            <div className="flow-subtask-meta">
                                                                                                {canEditThisTask ? (
                                                                                                    <>
                                                                                                        <Select
                                                                                                            size="small"
                                                                                                            placeholder="+ PIC"
                                                                                                            allowClear
                                                                                                            value={st.assigned_employee_id || undefined}
                                                                                                            onChange={(val) => handleUpdateSubtaskField(st.id, { assigned_employee_id: val || null }, task.id)}
                                                                                                            className="flow-subtask-pic-select"
                                                                                                            showSearch
                                                                                                            options={groupAvailableEmployees.map((emp) => ({
                                                                                                                value: emp.id,
                                                                                                                label: emp.name,
                                                                                                            }))}
                                                                                                        />
                                                                                                        <DatePicker
                                                                                                            size="small"
                                                                                                            placeholder="Deadline"
                                                                                                            format="DD/MM/YY"
                                                                                                            value={st.due_date ? dayjs(st.due_date) : null}
                                                                                                            onChange={(date) => handleUpdateSubtaskField(st.id, { due_date: date ? date.format(DATE_API) : null }, task.id)}
                                                                                                            className={`flow-subtask-date-select ${isStOverdue ? 'flow-subtask-date-select--overdue' : ''}`}
                                                                                                            allowClear
                                                                                                        />
                                                                                                    </>
                                                                                                ) : (
                                                                                                    <>
                                                                                                        {st.assigned_employee && (
                                                                                                            <span className="flow-subtask-readonly-chip">
                                                                                                                👤 {st.assigned_employee.name}
                                                                                                            </span>
                                                                                                        )}
                                                                                                        {st.due_date && (
                                                                                                            <span className={`flow-subtask-readonly-chip ${isStOverdue ? 'flow-subtask-readonly-chip--overdue' : ''}`}>
                                                                                                                📅 {dayjs(st.due_date).format('DD/MM/YY')}
                                                                                                            </span>
                                                                                                        )}
                                                                                                    </>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>

                                                                                        <div className="flow-subtask-actions">
                                                                                            {st.attachment_path ? (
                                                                                                <Tooltip title={`Bukti: ${st.attachment_name}`}>
                                                                                                    <Button
                                                                                                        type="text"
                                                                                                        size="small"
                                                                                                        icon={<PaperClipOutlined style={{ color: '#0284c7' }} />}
                                                                                                        onClick={() => window.open(getSubtaskFileUrl(st.id), '_blank')}
                                                                                                    />
                                                                                                </Tooltip>
                                                                                            ) : (
                                                                                                <Upload
                                                                                                    showUploadList={false}
                                                                                                    accept={ALLOWED_UPLOAD_ACCEPT}
                                                                                                    beforeUpload={(file) => {
                                                                                                        if (!isAllowedFileType(file)) {
                                                                                                            notification.error({
                                                                                                                message: 'Format Berkas Tidak Didukung',
                                                                                                                description: 'Hanya berkas berformat PDF, PNG, JPG, dan JPEG yang dapat diunggah.',
                                                                                                            });
                                                                                                            return Upload.LIST_IGNORE;
                                                                                                        }
                                                                                                        handleUploadEvidence(st.id, file, task.id);
                                                                                                        return false;
                                                                                                    }}
                                                                                                >
                                                                                                    <Tooltip title="Upload Bukti">
                                                                                                        <Button
                                                                                                            type="text"
                                                                                                            size="small"
                                                                                                            icon={<UploadOutlined />}
                                                                                                            loading={uploadingSubtaskId === st.id}
                                                                                                        />
                                                                                                    </Tooltip>
                                                                                                </Upload>
                                                                                            )}

                                                                                            <Popconfirm
                                                                                                title="Hapus tahapan ini?"
                                                                                                onConfirm={() => handleDeleteSubtask(st.id, task.id)}
                                                                                                okText="Hapus"
                                                                                                cancelText="Batal"
                                                                                            >
                                                                                                <Button type="text" size="small" danger icon={<DeleteOutlined style={{ fontSize: 11 }} />} />
                                                                                            </Popconfirm>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}

                                                                            {/* Inline Add Subtask */}
                                                                            {addingSubtaskTaskId === task.id ? (
                                                                                <div className="flow-subtask-inline-add">
                                                                                    <Input
                                                                                        size="small"
                                                                                        placeholder="Nama tahapan baru..."
                                                                                        value={cardSubtaskInput}
                                                                                        onChange={(e) => setCardSubtaskInput(e.target.value)}
                                                                                        onPressEnter={() => handleAddSubtaskFromCard(task)}
                                                                                        autoFocus
                                                                                    />
                                                                                    {canEditTaskPicAndDeadline(task) && (
                                                                                        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                                                                            <Select
                                                                                                size="small"
                                                                                                placeholder="Pilih PIC..."
                                                                                                allowClear
                                                                                                value={cardSubtaskPic}
                                                                                                onChange={setCardSubtaskPic}
                                                                                                style={{ flex: 1 }}
                                                                                                showSearch
                                                                                                options={groupAvailableEmployees.map((emp) => ({
                                                                                                    value: emp.id,
                                                                                                    label: emp.name,
                                                                                                }))}
                                                                                            />
                                                                                            <DatePicker
                                                                                                size="small"
                                                                                                placeholder="Deadline"
                                                                                                format="DD/MM/YY"
                                                                                                value={cardSubtaskDueDate}
                                                                                                onChange={setCardSubtaskDueDate}
                                                                                                style={{ width: 110 }}
                                                                                                allowClear
                                                                                            />
                                                                                        </div>
                                                                                    )}
                                                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 6 }}>
                                                                                        <Button size="small" onClick={() => setAddingSubtaskTaskId(null)}>Batal</Button>
                                                                                        <Button size="small" type="primary" onClick={() => handleAddSubtaskFromCard(task)}>Simpan</Button>
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <Button
                                                                                    type="dashed"
                                                                                    size="small"
                                                                                    icon={<PlusOutlined />}
                                                                                    onClick={() => {
                                                                                        setAddingSubtaskTaskId(task.id);
                                                                                        setCardSubtaskInput('');
                                                                                        setCardSubtaskPic(undefined);
                                                                                        setCardSubtaskDueDate(null);
                                                                                    }}
                                                                                    className="flow-subtask-add-trigger"
                                                                                >
                                                                                    + Tambah Tahapan
                                                                                </Button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Card Footer: Riwayat, Deadline, Assignees */}
                                                                <div className="flow-card__footer" onClick={(e) => e.stopPropagation()}>
                                                                    <div className="flow-card__footer-left">
                                                                        <button
                                                                            type="button"
                                                                            className="flow-report-btn"
                                                                            onClick={(e) => handleOpenReportsModal(task, e)}
                                                                            title="Buka riwayat laporan"
                                                                        >
                                                                            <CommentOutlined />
                                                                            <span>{task.reports_count > 0 ? `${task.reports_count} Riwayat` : '+ Riwayat'}</span>
                                                                            {isTaskReportUnread(task) && <span className="flow-unread-dot" />}
                                                                        </button>

                                                                        {task.due_date && (
                                                                            <span className={`flow-date-chip ${isOverdue ? 'flow-date-chip--overdue' : (isToday ? 'flow-date-chip--today' : '')}`}>
                                                                                <ClockCircleOutlined style={{ fontSize: 10 }} />
                                                                                {dayjs(task.due_date).format(DATE_UI)}
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    <div className="flow-card__footer-right">
                                                                        {(task.assignees ?? []).length > 0 ? (
                                                                            <div className="flow-assignees-stack">
                                                                                {task.assignees.slice(0, 3).map((emp) => (
                                                                                    <Tooltip key={emp.id} title={`PIC: ${emp.name}`}>
                                                                                        <div className="flow-avatar-pill">
                                                                                            {getInitials(emp.name)}
                                                                                        </div>
                                                                                    </Tooltip>
                                                                                ))}
                                                                                {task.assignees.length > 3 && (
                                                                                    <div className="flow-avatar-pill flow-avatar-pill--more">
                                                                                        +{task.assignees.length - 3}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ) : null}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}

                                                <button
                                                    type="button"
                                                    className="flow-column__ghost-add"
                                                    onClick={() => handleOpenCreate(col.key)}
                                                >
                                                    + Tambah kartu...
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            /* Table View */
                            <div className="flow-table-wrapper">
                                <Table
                                    rowKey="id"
                                    columns={tableColumns}
                                    dataSource={tasks}
                                    loading={loading}
                                    pagination={{ pageSize: 15, showTotal: (total) => `Total ${total} tugas` }}
                                    size="middle"
                                />
                            </div>
                        )}
                    </main>
                </div>
            </div>

            {/* ── MODAL: BUAT / EDIT GROUPING RUANG KERJA ── */}
            <Modal
                title={groupModalMode === 'create' ? 'Buat Grouping Ruang Kerja Baru' : 'Kelola / Edit Grouping'}
                open={isGroupModalOpen}
                onCancel={() => setIsGroupModalOpen(false)}
                footer={null}
                className="kanban-modal"
                width={560}
                destroyOnClose
            >
                <Form
                    form={groupForm}
                    layout="vertical"
                    onFinish={handleSaveGroup}
                    style={{ marginTop: 12 }}
                >
                    <Form.Item
                        name="name"
                        label="Nama Grouping / Ruang Kerja"
                        rules={[{ required: true, message: 'Masukkan nama ruang kerja (misal: Tata Usaha, Infokom, Pribadi)' }]}
                    >
                        <Input placeholder="Contoh: Tata Usaha, Infokom, Proyek BMN, Pribadi" />
                    </Form.Item>

                    <Form.Item
                        name="type"
                        label="Tipe Akses Ruang Kerja"
                        rules={[{ required: true }]}
                    >
                        <Radio.Group style={{ width: '100%' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                                <Radio.Button value="team" style={{ height: 'auto', padding: '8px 10px', borderRadius: 6, textAlign: 'center' }}>
                                    <div style={{ fontWeight: 600, fontSize: 12 }}><TeamOutlined /> Tim Tertentu</div>
                                    <div style={{ fontSize: 10.5, color: '#64748b' }}>Pilih anggota pegawai</div>
                                </Radio.Button>
                                <Radio.Button value="public" style={{ height: 'auto', padding: '8px 10px', borderRadius: 6, textAlign: 'center' }}>
                                    <div style={{ fontWeight: 600, fontSize: 12 }}><GlobalOutlined /> Publik</div>
                                    <div style={{ fontSize: 10.5, color: '#64748b' }}>Semua pegawai balai</div>
                                </Radio.Button>
                                <Radio.Button value="private" style={{ height: 'auto', padding: '8px 10px', borderRadius: 6, textAlign: 'center' }}>
                                    <div style={{ fontWeight: 600, fontSize: 12 }}><LockOutlined /> Pribadi</div>
                                    <div style={{ fontSize: 10.5, color: '#64748b' }}>Khusus saya sendiri</div>
                                </Radio.Button>
                            </div>
                        </Radio.Group>
                    </Form.Item>

                    {/* Member Selection when type === 'team' */}
                    <Form.Item
                        noStyle
                        shouldUpdate={(prev, cur) => prev.type !== cur.type}
                    >
                        {({ getFieldValue }) => {
                            const t = getFieldValue('type');
                            if (t === 'public' || t === 'private') return null;
                            return (
                                <Form.Item
                                    name="member_ids"
                                    label="Pilih Pegawai yang Masuk Grouping Ini"
                                    rules={[{ required: true, message: 'Pilih minimal satu pegawai' }]}
                                    help="Pegawai yang Anda pilih akan otomatis melihat ruang kerja ini di sidebar mereka."
                                >
                                    <Select
                                        mode="multiple"
                                        placeholder="Pilih pegawai anggota tim..."
                                        optionFilterProp="children"
                                        showSearch
                                        style={{ width: '100%' }}
                                    >
                                        {employees.map((emp) => (
                                            <Select.Option key={emp.id} value={emp.id}>
                                                {emp.name} {emp.nip ? `(${emp.nip})` : ''} — {emp.department || 'Pegawai'}
                                            </Select.Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            );
                        }}
                    </Form.Item>

                    {/* Color Swatch Picker */}
                    <Form.Item label="Warna Tema Grouping">
                        <div className="kanban-color-picker-row">
                            {COLOR_PALETTE.map((c) => (
                                <div
                                    key={c}
                                    className={`kanban-color-swatch ${selectedGroupColor === c ? 'kanban-color-swatch--active' : ''}`}
                                    style={{ background: c }}
                                    onClick={() => setSelectedGroupColor(c)}
                                />
                            ))}
                        </div>
                    </Form.Item>

                    <Form.Item
                        name="icon"
                        label="Pilih Ikon Ruang Kerja"
                        initialValue="team"
                    >
                        <Select style={{ width: '100%' }}>
                            <Select.Option value="team"><TeamOutlined /> Tim / Kolaborasi</Select.Option>
                            <Select.Option value="global"><GlobalOutlined /> Global / Umum</Select.Option>
                            <Select.Option value="thunderbolt"><ThunderboltOutlined /> Thunderbolt / IT Infokom</Select.Option>
                            <Select.Option value="folder"><FolderOutlined /> Berkas / Administrasi</Select.Option>
                            <Select.Option value="lock"><LockOutlined /> Terkunci / Privat</Select.Option>
                            <Select.Option value="safety"><SafetyCertificateOutlined /> Validasi / Pemeriksaan</Select.Option>
                            <Select.Option value="compass"><CompassOutlined /> Navigasi / Substansi</Select.Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="description"
                        label="Deskripsi / Catatan Singkat"
                    >
                        <Input.TextArea rows={2} placeholder="Penjelasan mengenai ruang kerja atau tim ini..." />
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                        <Button onClick={() => setIsGroupModalOpen(false)}>
                            Batal
                        </Button>
                        <Button type="primary" htmlType="submit" loading={groupSubmitting} className="kanban-primary-btn">
                            Simpan Ruang Kerja
                        </Button>
                    </div>
                </Form>
            </Modal>

            {/* ── MODAL: BUAT / EDIT TUGAS ── */}
            <Modal
                title={modalMode === 'create' ? 'Buat Tugas Kanban Baru' : 'Edit Tugas'}
                open={isFormModalOpen}
                onCancel={() => setIsFormModalOpen(false)}
                footer={null}
                className="kanban-modal"
                width={620}
                destroyOnClose
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSaveTask}
                    style={{ marginTop: 12 }}
                >
                    <Form.Item
                        name="title"
                        label="Judul Tugas / Pekerjaan"
                        rules={[{ required: true, message: 'Masukkan judul tugas' }]}
                    >
                        <Input placeholder="Contoh: Rekonsiliasi Dokumen BMN Triwulan I" />
                    </Form.Item>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                        <Form.Item
                            name="group_id"
                            label="Ruang Kerja"
                            rules={[{ required: true, message: 'Pilih Ruang Kerja' }]}
                        >
                            <Select
                                placeholder="Pilih Ruang Kerja"
                                onChange={(newGId) => {
                                    const newG = groups.find((g) => g.id === newGId);
                                    if (newG && !newG.is_public && newG.type !== 'public') {
                                        const memberIds = new Set((newG.members || []).map((m) => m.id));
                                        if (newG.created_by_employee_id) memberIds.add(newG.created_by_employee_id);
                                        const currentAssignees = form.getFieldValue('assignee_ids') || [];
                                        const filteredAssignees = currentAssignees.filter((id) => memberIds.has(id));
                                        form.setFieldsValue({ assignee_ids: filteredAssignees });
                                    }
                                }}
                            >
                                {groups.map((g) => (
                                    <Select.Option key={g.id} value={g.id}>
                                        <span className="kanban-group-channel-dot" style={{ display: 'inline-block', background: g.color || '#0F5B99', marginRight: 6 }} />
                                        {g.name}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="status"
                            label="Status Kolom"
                            rules={[{ required: true }]}
                        >
                            <Select>
                                {COLUMNS.map((c) => (
                                    <Select.Option key={c.key} value={c.key}>
                                        <span className={`kanban-column-dot ${c.dotClass}`} style={{ display: 'inline-block', marginRight: 6 }} />
                                        {c.title}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="priority"
                            label="Prioritas"
                            rules={[{ required: true }]}
                        >
                            <Select>
                                <Select.Option value="urgent">● Mendesak</Select.Option>
                                <Select.Option value="high">● Tinggi</Select.Option>
                                <Select.Option value="medium">● Sedang</Select.Option>
                                <Select.Option value="low">● Rendah</Select.Option>
                            </Select>
                        </Form.Item>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                        <Form.Item
                            name="due_date"
                            label="Batas Waktu (Deadline)"
                            help={modalMode === 'edit' && editingTask && !canEditTaskPicAndDeadline(editingTask) ? 'Hanya pembuat tugas yang dapat mengubah batas waktu.' : undefined}
                        >
                            <DatePicker
                                format={DATE_UI}
                                style={{ width: '100%' }}
                                disabled={modalMode === 'edit' && editingTask && !canEditTaskPicAndDeadline(editingTask)}
                            />
                        </Form.Item>

                        <Form.Item
                            noStyle
                            shouldUpdate={(prev, cur) => prev.group_id !== cur.group_id}
                        >
                            {({ getFieldValue }) => {
                                const selectedGId = getFieldValue('group_id');
                                const selectedG = groups.find((g) => g.id === selectedGId);
                                const isRestrictedInEdit = modalMode === 'edit' && editingTask && !canEditTaskPicAndDeadline(editingTask);

                                let availableEmployees = employees;
                                if (selectedG && !selectedG.is_public && selectedG.type !== 'public') {
                                    if (selectedG.members && selectedG.members.length > 0) {
                                        availableEmployees = selectedG.members;
                                    } else if (selectedG.created_by_employee_id) {
                                        availableEmployees = employees.filter((e) => e.id === selectedG.created_by_employee_id);
                                    }
                                }

                                return (
                                    <Form.Item
                                        name="assignee_ids"
                                        label="Tag Pegawai Bertugas"
                                        help={
                                            isRestrictedInEdit
                                                ? 'Hanya pembuat tugas yang dapat mengubah pegawai bertugas.'
                                                : (selectedG && !selectedG.is_public && selectedG.type !== 'public'
                                                    ? `Hanya ${availableEmployees.length} pegawai anggota "${selectedG.name}" yang dapat ditugaskan.`
                                                    : undefined)
                                        }
                                    >
                                        <Select
                                            mode="multiple"
                                            placeholder="Pilih pegawai yang ditugaskan..."
                                            optionFilterProp="children"
                                            showSearch
                                            style={{ width: '100%' }}
                                            disabled={isRestrictedInEdit}
                                        >
                                            {availableEmployees.map((emp) => (
                                                <Select.Option key={emp.id} value={emp.id}>
                                                    {emp.name} {emp.nip ? `(${emp.nip})` : ''}
                                                </Select.Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                );
                            }}
                        </Form.Item>
                    </div>

                    <Form.Item
                        name="description"
                        label="Deskripsi / Petunjuk Kerja"
                    >
                        <Input.TextArea rows={3} placeholder="Rincian informasi instruksi kerja tugas ini..." />
                    </Form.Item>

                    {/* Initial Subtasks input for Create mode */}
                    {modalMode === 'create' && (
                        <Form.Item
                            noStyle
                            shouldUpdate={(prev, cur) => prev.group_id !== cur.group_id}
                        >
                            {({ getFieldValue }) => {
                                const currentGId = getFieldValue('group_id');
                                const availableForCreate = getAvailableEmployeesForGroup(currentGId);

                                return (
                                    <div style={{ marginBottom: 16, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <div>
                                                <label style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>
                                                    Rincian Tahapan Pekerjaan & PIC
                                                </label>
                                                <div style={{ fontSize: 11, color: '#64748b' }}>
                                                    Tentukan alur tahapan, penunjukan PIC tahapan, dan batas waktu target.
                                                </div>
                                            </div>
                                            <Button
                                                type="link"
                                                size="small"
                                                onClick={() => setInitialSubtasks((prev) => [
                                                    ...prev,
                                                    { id: Date.now() + Math.random(), title: '', assigned_employee_id: undefined, due_date: null }
                                                ])}
                                            >
                                                + Tambah Tahap
                                            </Button>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {initialSubtasks.map((st, idx) => (
                                                <div key={st.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                    <Input
                                                        placeholder={`Tahap ${idx + 1} (misal: Pengumpulan berkas...)`}
                                                        value={st.title}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setInitialSubtasks((prev) => prev.map((item) => (item.id === st.id ? { ...item, title: val } : item)));
                                                        }}
                                                        style={{ flex: 1 }}
                                                    />
                                                    <Select
                                                        placeholder="PIC Tahap"
                                                        allowClear
                                                        value={st.assigned_employee_id}
                                                        onChange={(val) => {
                                                            setInitialSubtasks((prev) => prev.map((item) => (item.id === st.id ? { ...item, assigned_employee_id: val } : item)));
                                                        }}
                                                        style={{ width: 170 }}
                                                        popupMatchSelectWidth={false}
                                                        dropdownMatchSelectWidth={false}
                                                        dropdownStyle={{ minWidth: 250, maxWidth: 380 }}
                                                        popupClassName="kanban-pic-select-popup"
                                                        optionFilterProp="filterText"
                                                        showSearch
                                                        options={availableForCreate.map((emp) => ({
                                                            value: emp.id,
                                                            label: emp.name,
                                                            name: emp.name,
                                                            nip: emp.nip,
                                                            position: emp.position,
                                                            department: emp.department,
                                                            filterText: `${emp.name} ${emp.nip || ''} ${emp.position || ''}`,
                                                        }))}
                                                        optionRender={(option) => {
                                                            const emp = option.data;
                                                            return (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                                                                    <div style={{
                                                                        width: 22,
                                                                        height: 22,
                                                                        borderRadius: '50%',
                                                                        background: '#0F5B99',
                                                                        color: '#ffffff',
                                                                        fontSize: 9,
                                                                        fontWeight: 700,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        flexShrink: 0
                                                                    }}>
                                                                        {getInitials(emp.name || emp.label)}
                                                                    </div>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                                                        <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>
                                                                            {emp.name || emp.label}
                                                                        </span>
                                                                        {(emp.position || emp.department) && (
                                                                            <span style={{ fontSize: 10.5, color: '#64748b', whiteSpace: 'nowrap' }}>
                                                                                {emp.position || emp.department}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        }}
                                                    />
                                                    <DatePicker
                                                        placeholder="Deadline"
                                                        format={DATE_UI}
                                                        value={st.due_date}
                                                        onChange={(val) => {
                                                            setInitialSubtasks((prev) => prev.map((item) => (item.id === st.id ? { ...item, due_date: val } : item)));
                                                        }}
                                                        style={{ width: 130 }}
                                                        allowClear
                                                    />
                                                    {initialSubtasks.length > 1 && (
                                                        <Button
                                                            type="text"
                                                            danger
                                                            icon={<DeleteOutlined />}
                                                            onClick={() => setInitialSubtasks((prev) => prev.filter((item) => item.id !== st.id))}
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            }}
                        </Form.Item>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                        <Button onClick={() => setIsFormModalOpen(false)}>
                            Batal
                        </Button>
                        <Button type="primary" htmlType="submit" loading={submitting} className="kanban-primary-btn">
                            {modalMode === 'create' ? 'Buat Tugas' : 'Simpan Perubahan'}
                        </Button>
                    </div>
                </Form>
            </Modal>

            {/* ── MODAL: DETAIL & SUBTASK EXECUTION MODAL ── */}
            <Modal
                title={detailTask ? detailTask.title : 'Detail Tugas'}
                open={isDetailOpen}
                onCancel={() => setIsDetailOpen(false)}
                footer={null}
                className="kanban-modal"
                width={720}
                destroyOnClose
            >
                {detailTask && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {/* Meta Tags Row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <Select
                                    size="small"
                                    value={detailTask.status}
                                    onChange={(val) => handleMoveStatus(detailTask.id, val)}
                                    style={{ width: 140 }}
                                    className="kanban-select"
                                >
                                    {COLUMNS.map((c) => (
                                        <Select.Option key={c.key} value={c.key}>
                                            <span className={`kanban-column-dot ${c.dotClass}`} style={{ display: 'inline-block', marginRight: 6 }} />
                                            {c.title}
                                        </Select.Option>
                                    ))}
                                </Select>

                                {detailTask.group && (
                                    <Tag color="geekblue" style={{ fontWeight: 600 }}>
                                        {detailTask.group.name}
                                    </Tag>
                                )}

                                <Tag color="blue">{detailTask.category || 'Umum'}</Tag>
                                <span className={`kanban-badge-priority ${PRIORITY_CONFIG[detailTask.priority]?.className}`}>
                                    {PRIORITY_CONFIG[detailTask.priority]?.label}
                                </span>
                            </div>

                            {detailTask.due_date && (
                                <span className="kanban-date-chip">
                                    <ClockCircleOutlined /> Batas Waktu: <strong>{dayjs(detailTask.due_date).format(DATE_UI)}</strong>
                                </span>
                            )}
                        </div>

                        {/* Description */}
                        {detailTask.description && (
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 12px', fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
                                {detailTask.description}
                            </div>
                        )}

                        {/* Tagged Pegawai List */}
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#64748b', marginBottom: 6 }}>
                                Pegawai Bertugas ({detailTask.assignees?.length || 0})
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                {(detailTask.assignees ?? []).length === 0 ? (
                                    <span style={{ fontSize: 12, color: '#94a3b8' }}>Belum ada pegawai yang di-tag</span>
                                ) : (
                                    detailTask.assignees.map((emp) => (
                                        <div key={emp.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '3px 8px', fontSize: 12 }}>
                                            <div className="kanban-assignee-avatar" style={{ width: 20, height: 20, fontSize: 8.5 }}>
                                                {getInitials(emp.name)}
                                            </div>
                                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{emp.name}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Detail Modal Tabs: 1. Checklist Subtasks, 2. Pelaporan & Riwayat */}
                        <Tabs
                            activeKey={activeDetailTab}
                            onChange={setActiveDetailTab}
                            className="kanban-detail-tabs"
                            items={[
                                {
                                    key: 'subtasks',
                                    label: (
                                        <span>
                                            <UnorderedListOutlined style={{ marginRight: 6 }} />
                                            Tahapan & Checklist ({detailTask.completed_subtasks_count}/{detailTask.subtasks_count})
                                        </span>
                                    ),
                                    children: (
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#64748b' }}>
                                                    Alur & Bukti Pengerjaan
                                                </span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <div className="kanban-progress-bar-bg" style={{ width: 80 }}>
                                                        <div className="kanban-progress-bar-fill" style={{ width: `${detailTask.progress_percentage}%` }} />
                                                    </div>
                                                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#10b981' }}>
                                                        {detailTask.progress_percentage}%
                                                    </span>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                                                {(detailTask.subtasks ?? []).map((st) => {
                                                    const isStOverdue = st.due_date && dayjs(st.due_date).isBefore(dayjs(), 'day') && st.status !== 'completed';
                                                    const isStToday = st.due_date && dayjs(st.due_date).isSame(dayjs(), 'day') && st.status !== 'completed';
                                                    const availableForDetail = getAvailableEmployeesForTask(detailTask);

                                                    return (
                                                        <div key={st.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1 }}>
                                                                    <Checkbox
                                                                        checked={st.status === 'completed'}
                                                                        onChange={() => handleToggleSubtask(st, detailTask.id)}
                                                                        style={{ marginTop: 2 }}
                                                                    />
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                                                                        <span style={{ fontSize: 13, fontWeight: 600, color: st.status === 'completed' ? '#94a3b8' : '#0f172a', textDecoration: st.status === 'completed' ? 'line-through' : 'none' }}>
                                                                            {st.title}
                                                                        </span>

                                                                        {/* Subtask Meta: PIC & Batas Waktu */}
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                                            {canEditTaskPicAndDeadline(detailTask) ? (
                                                                                <>
                                                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                                                        <UserOutlined style={{ fontSize: 11, color: '#64748b' }} />
                                                                                        <Select
                                                                                            size="small"
                                                                                            placeholder="Tunjuk PIC..."
                                                                                            allowClear
                                                                                            value={st.assigned_employee_id || undefined}
                                                                                            onChange={(val) => handleUpdateSubtaskField(st.id, { assigned_employee_id: val || null }, detailTask.id)}
                                                                                            style={{ width: 170 }}
                                                                                            popupMatchSelectWidth={false}
                                                                                            dropdownMatchSelectWidth={false}
                                                                                            dropdownStyle={{ minWidth: 250, maxWidth: 380 }}
                                                                                            popupClassName="kanban-pic-select-popup"
                                                                                            optionFilterProp="filterText"
                                                                                            showSearch
                                                                                            options={availableForDetail.map((emp) => ({
                                                                                                value: emp.id,
                                                                                                label: emp.name,
                                                                                                name: emp.name,
                                                                                                nip: emp.nip,
                                                                                                position: emp.position,
                                                                                                department: emp.department,
                                                                                                filterText: `${emp.name} ${emp.nip || ''} ${emp.position || ''}`,
                                                                                            }))}
                                                                                            optionRender={(option) => {
                                                                                                const emp = option.data;
                                                                                                return (
                                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                                                                                                        <div style={{
                                                                                                            width: 22,
                                                                                                            height: 22,
                                                                                                            borderRadius: '50%',
                                                                                                            background: '#0F5B99',
                                                                                                            color: '#ffffff',
                                                                                                            fontSize: 9,
                                                                                                            fontWeight: 700,
                                                                                                            display: 'flex',
                                                                                                            alignItems: 'center',
                                                                                                            justifyContent: 'center',
                                                                                                            flexShrink: 0
                                                                                                        }}>
                                                                                                            {getInitials(emp.name || emp.label)}
                                                                                                        </div>
                                                                                                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                                                                                            <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>
                                                                                                                {emp.name || emp.label}
                                                                                                            </span>
                                                                                                            {(emp.position || emp.department) && (
                                                                                                                <span style={{ fontSize: 10.5, color: '#64748b', whiteSpace: 'nowrap' }}>
                                                                                                                    {emp.position || emp.department}
                                                                                                                </span>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                );
                                                                                            }}
                                                                                        />
                                                                                    </div>

                                                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                                                        <CalendarOutlined style={{ fontSize: 11, color: isStOverdue ? '#ef4444' : '#64748b' }} />
                                                                                        <DatePicker
                                                                                            size="small"
                                                                                            placeholder="Batas Waktu"
                                                                                            format={DATE_UI}
                                                                                            value={st.due_date ? dayjs(st.due_date) : null}
                                                                                            onChange={(date) => handleUpdateSubtaskField(st.id, { due_date: date ? date.format(DATE_API) : null }, detailTask.id)}
                                                                                            style={{ width: 130 }}
                                                                                            className={isStOverdue ? 'kanban-datepicker-overdue' : ''}
                                                                                            allowClear
                                                                                        />
                                                                                        {isStOverdue && (
                                                                                            <span style={{ fontSize: 10.5, color: '#ef4444', fontWeight: 600 }}>Terlewat</span>
                                                                                        )}
                                                                                        {isStToday && (
                                                                                            <span style={{ fontSize: 10.5, color: '#f59e0b', fontWeight: 600 }}>Hari Ini</span>
                                                                                        )}
                                                                                    </div>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <Tooltip title="Hanya pembuat tugas yang berhak mengubah PIC">
                                                                                        <span className="kanban-subtask-readonly-pic">
                                                                                            <UserOutlined style={{ fontSize: 10, color: '#64748b' }} />
                                                                                            {st.assigned_employee?.name || 'Belum ada PIC'}
                                                                                        </span>
                                                                                    </Tooltip>
                                                                                    {st.due_date && (
                                                                                        <Tooltip title="Hanya pembuat tugas yang berhak mengubah Batas Waktu">
                                                                                            <span className={`kanban-subtask-readonly-date ${isStOverdue ? 'kanban-subtask-readonly-date--overdue' : (isStToday ? 'kanban-subtask-readonly-date--today' : '')}`}>
                                                                                                <CalendarOutlined style={{ fontSize: 10 }} />
                                                                                                {dayjs(st.due_date).format(DATE_UI)}
                                                                                                {isStOverdue && <span style={{ marginLeft: 4, fontWeight: 700 }}>● Terlewat</span>}
                                                                                                {isStToday && <span style={{ marginLeft: 4, fontWeight: 700 }}>● Hari Ini</span>}
                                                                                            </span>
                                                                                        </Tooltip>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                    {st.attachment_path ? (
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                            <Button
                                                                                type="text"
                                                                                size="small"
                                                                                icon={<PaperClipOutlined style={{ color: '#0F5B99' }} />}
                                                                                onClick={() => window.open(getSubtaskFileUrl(st.id), '_blank')}
                                                                                style={{ fontSize: 12, color: '#0F5B99', fontWeight: 600 }}
                                                                            >
                                                                                {st.attachment_name || 'Berkas Bukti'}
                                                                            </Button>
                                                                            <Popconfirm
                                                                                title="Hapus berkas ini dari Nextcloud?"
                                                                                onConfirm={() => handleDeleteEvidence(st.id, detailTask.id)}
                                                                                okText="Hapus"
                                                                                cancelText="Batal"
                                                                            >
                                                                                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                                                                            </Popconfirm>
                                                                        </div>
                                                                    ) : (
                                                                        <Upload
                                                                            showUploadList={false}
                                                                            accept={ALLOWED_UPLOAD_ACCEPT}
                                                                            beforeUpload={(file) => {
                                                                                if (!isAllowedFileType(file)) {
                                                                                    notification.error({
                                                                                        message: 'Format Berkas Tidak Didukung',
                                                                                        description: 'Hanya berkas berformat PDF, PNG, JPG, dan JPEG yang dapat diunggah.',
                                                                                    });
                                                                                    return Upload.LIST_IGNORE;
                                                                                }
                                                                                handleUploadEvidence(st.id, file, detailTask.id);
                                                                                return false;
                                                                            }}
                                                                        >
                                                                            <Button
                                                                                size="small"
                                                                                icon={<UploadOutlined />}
                                                                                loading={uploadingSubtaskId === st.id}
                                                                                style={{ fontSize: 11.5 }}
                                                                            >
                                                                                Upload Bukti (Nextcloud)
                                                                            </Button>
                                                                        </Upload>
                                                                    )}

                                                                    <Popconfirm
                                                                        title="Hapus tahapan ini?"
                                                                        onConfirm={() => handleDeleteSubtask(st.id, detailTask.id)}
                                                                        okText="Hapus"
                                                                        cancelText="Batal"
                                                                    >
                                                                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                                                                    </Popconfirm>
                                                                </div>
                                                            </div>

                                                            {st.completed_by_name && (
                                                                <div style={{ fontSize: 11, color: '#10b981', paddingLeft: 28 }}>
                                                                    ✓ Diselesaikan oleh: <strong>{st.completed_by_name}</strong> {st.completed_at ? `(${dayjs(st.completed_at).format('DD/MM/YYYY HH:mm')})` : ''}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}

                                                {/* Add New Subtask Input inside Modal */}
                                                <div style={{ background: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: 6, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Tambah Tahapan Baru</span>
                                                    <Input
                                                        placeholder="Tulis rincian tahapan pekerjaan baru..."
                                                        value={newSubtaskTitle}
                                                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                                        onPressEnter={handleAddSubtaskInDetail}
                                                    />
                                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                                                        {canEditTaskPicAndDeadline(detailTask) ? (
                                                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                                <Select
                                                                    size="small"
                                                                    placeholder="Pilih PIC Tahapan..."
                                                                    allowClear
                                                                    value={newSubtaskPic}
                                                                    onChange={setNewSubtaskPic}
                                                                    style={{ width: 180 }}
                                                                    popupMatchSelectWidth={false}
                                                                    dropdownMatchSelectWidth={false}
                                                                    dropdownStyle={{ minWidth: 250, maxWidth: 380 }}
                                                                    popupClassName="kanban-pic-select-popup"
                                                                    optionFilterProp="filterText"
                                                                    showSearch
                                                                    options={getAvailableEmployeesForTask(detailTask).map((emp) => ({
                                                                        value: emp.id,
                                                                        label: emp.name,
                                                                        name: emp.name,
                                                                        nip: emp.nip,
                                                                        position: emp.position,
                                                                        department: emp.department,
                                                                        filterText: `${emp.name} ${emp.nip || ''} ${emp.position || ''}`,
                                                                    }))}
                                                                    optionRender={(option) => {
                                                                        const emp = option.data;
                                                                        return (
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                                                                                <div style={{
                                                                                    width: 22,
                                                                                    height: 22,
                                                                                    borderRadius: '50%',
                                                                                    background: '#0F5B99',
                                                                                    color: '#ffffff',
                                                                                    fontSize: 9,
                                                                                    fontWeight: 700,
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'center',
                                                                                    flexShrink: 0
                                                                                }}>
                                                                                    {getInitials(emp.name || emp.label)}
                                                                                </div>
                                                                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                                                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>
                                                                                        {emp.name || emp.label}
                                                                                    </span>
                                                                                    {(emp.position || emp.department) && (
                                                                                        <span style={{ fontSize: 10.5, color: '#64748b', whiteSpace: 'nowrap' }}>
                                                                                            {emp.position || emp.department}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    }}
                                                                />
                                                                <DatePicker
                                                                    size="small"
                                                                    placeholder="Batas Waktu"
                                                                    format={DATE_UI}
                                                                    value={newSubtaskDueDate}
                                                                    onChange={setNewSubtaskDueDate}
                                                                    style={{ width: 130 }}
                                                                    allowClear
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div style={{ fontSize: 11, color: '#64748b' }}>
                                                                <em>* Penunjukan PIC & Batas Waktu hanya dapat diatur oleh pembuat tugas.</em>
                                                            </div>
                                                        )}
                                                        <Button type="primary" onClick={handleAddSubtaskInDetail} className="kanban-primary-btn" size="small">
                                                            + Tambah Tahap
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ),
                                },
                                {
                                    key: 'reports',
                                    label: (
                                        <span>
                                            <HistoryOutlined style={{ marginRight: 6 }} />
                                            Pelaporan & Riwayat ({reports.length})
                                        </span>
                                    ),
                                    children: (
                                        <div className="flow-feed-container" style={{ marginTop: 0 }}>
                                            <div className="flow-feed-title">
                                                <span>Riwayat & Catatan Perkembangan ({reports.length})</span>
                                            </div>

                                            {reportsLoading ? (
                                                <div className="flow-feed-loading">
                                                    <Spin size="small" />
                                                </div>
                                            ) : reports.length === 0 ? (
                                                <div className="flow-feed-empty">
                                                    <CommentOutlined style={{ fontSize: 24, color: '#cbd5e1', marginBottom: 6 }} />
                                                    <p>Belum ada catatan riwayat perkembangan.</p>
                                                    <span>Tulis catatan progres pertama pada kolom di bawah.</span>
                                                </div>
                                            ) : (
                                                <div className="flow-feed-list" style={{ maxHeight: 260 }}>
                                                    {reports.map((rep) => (
                                                        <div key={rep.id} className="flow-feed-item">
                                                            <div className="flow-feed-avatar">
                                                                {getInitials(rep.employee?.name || rep.user?.name || 'Admin')}
                                                            </div>
                                                            <div className="flow-feed-content-wrapper">
                                                                <div className="flow-feed-item-header">
                                                                    <div className="flow-feed-author-meta">
                                                                        <span className="flow-feed-author-name">
                                                                            {rep.employee?.name || rep.user?.name || 'Pegawai'}
                                                                        </span>
                                                                        <span className="flow-feed-timestamp">
                                                                            {rep.employee?.department ? `${rep.employee.department} • ` : ''}
                                                                            {dayjs(rep.created_at).format('DD MMM YYYY, HH:mm')}
                                                                        </span>
                                                                    </div>

                                                                    <div className="flow-feed-header-actions">
                                                                        {rep.status_update && (
                                                                            <span className="flow-feed-status-badge">
                                                                                ● {COLUMNS.find((c) => c.key === rep.status_update)?.title || rep.status_update}
                                                                            </span>
                                                                        )}
                                                                        <Popconfirm
                                                                            title="Hapus riwayat laporan ini?"
                                                                            onConfirm={() => handleDeleteReport(rep.id)}
                                                                            okText="Hapus"
                                                                            cancelText="Batal"
                                                                        >
                                                                            <Button type="text" size="small" className="flow-feed-delete-btn" icon={<DeleteOutlined />} />
                                                                        </Popconfirm>
                                                                    </div>
                                                                </div>

                                                                <div className="flow-feed-body">
                                                                    {rep.content}
                                                                </div>

                                                                {rep.attachment_path && (
                                                                    <div className="flow-feed-attachment">
                                                                        <button
                                                                            type="button"
                                                                            className="flow-feed-file-chip"
                                                                            onClick={() => window.open(getReportFileUrl(rep.id), '_blank')}
                                                                        >
                                                                            <PaperClipOutlined style={{ color: '#0F5B99' }} />
                                                                            <span className="flow-feed-file-name">{rep.attachment_name || 'Berkas Lampiran'}</span>
                                                                            {rep.attachment_size && (
                                                                                <span className="flow-feed-file-size">({Math.round(rep.attachment_size / 1024)} KB)</span>
                                                                            )}
                                                                            <DownloadOutlined style={{ marginLeft: 'auto', color: '#64748b' }} />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Modern Integrated Composer */}
                                            <div className="flow-composer">
                                                <Input.TextArea
                                                    rows={2}
                                                    autoSize={{ minRows: 2, maxRows: 5 }}
                                                    placeholder="Tuliskan catatan, hasil pelaksanaan pekerjaan, kendala, atau progres terbaru..."
                                                    value={reportContent}
                                                    onChange={(e) => setReportContent(e.target.value)}
                                                    className="flow-composer-textarea"
                                                />

                                                {reportFile && (
                                                    <div className="flow-composer-file-preview">
                                                        <PaperClipOutlined style={{ color: '#0F5B99' }} />
                                                        <span className="flow-composer-file-name">{reportFile.name}</span>
                                                        <span className="flow-composer-file-size">({Math.round(reportFile.size / 1024)} KB)</span>
                                                        <Button
                                                            type="text"
                                                            size="small"
                                                            icon={<CloseOutlined />}
                                                            onClick={() => setReportFile(null)}
                                                            className="flow-composer-file-remove"
                                                        />
                                                    </div>
                                                )}

                                                <div className="flow-composer-toolbar">
                                                    <div className="flow-composer-toolbar-left">
                                                        <Select
                                                            placeholder="Ubah Status (Opsional)"
                                                            allowClear
                                                            value={reportStatusUpdate}
                                                            onChange={setReportStatusUpdate}
                                                            style={{ width: 170 }}
                                                            size="small"
                                                            className="flow-composer-select"
                                                        >
                                                            {COLUMNS.map((c) => (
                                                                <Select.Option key={c.key} value={c.key}>
                                                                    <span className={`flow-column__dot flow-column__dot--${c.key}`} style={{ display: 'inline-block', marginRight: 6 }} />
                                                                    {c.title}
                                                                </Select.Option>
                                                            ))}
                                                        </Select>

                                                        <Upload
                                                            accept={ALLOWED_UPLOAD_ACCEPT}
                                                            beforeUpload={(file) => {
                                                                if (!isAllowedFileType(file)) {
                                                                    notification.error({
                                                                        message: 'Format Berkas Tidak Didukung',
                                                                        description: 'Hanya berkas berformat PDF, PNG, JPG, dan JPEG yang dapat diunggah.',
                                                                    });
                                                                    return Upload.LIST_IGNORE;
                                                                }
                                                                setReportFile(file);
                                                                return false;
                                                            }}
                                                            showUploadList={false}
                                                            maxCount={1}
                                                        >
                                                            <Button size="small" icon={<PaperClipOutlined />} className="flow-composer-attach-btn">
                                                                {reportFile ? 'Ganti Lampiran' : 'Lampirkan Berkas'}
                                                            </Button>
                                                        </Upload>
                                                    </div>

                                                    <Button
                                                        type="primary"
                                                        size="small"
                                                        icon={<SendOutlined />}
                                                        loading={reportSubmitting}
                                                        onClick={handleSubmitReport}
                                                        className="flow-composer-send-btn"
                                                    >
                                                        Kirim Riwayat
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ),
                                },
                            ]}
                        />

                        {/* Modal Footer Actions */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: 12, marginTop: 6 }}>
                            <Button
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => {
                                    Modal.confirm({
                                        title: 'Hapus Tugas',
                                        content: `Hapus tugas "${detailTask.title}" beserta seluruh berkas Nextcloud?`,
                                        okText: 'Hapus',
                                        cancelText: 'Batal',
                                        okButtonProps: { danger: true },
                                        onOk: () => handleDeleteTask(detailTask.id),
                                    });
                                }}
                            >
                                Hapus Tugas
                            </Button>

                            <div style={{ display: 'flex', gap: 8 }}>
                                <Button onClick={() => setIsDetailOpen(false)}>
                                    Tutup
                                </Button>
                                <Button
                                    type="primary"
                                    icon={<EditOutlined />}
                                    onClick={() => {
                                        setIsDetailOpen(false);
                                        handleOpenEdit(detailTask);
                                    }}
                                    className="kanban-primary-btn"
                                >
                                    Edit Tugas
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ── MODAL: DEDICATED RIWAYAT & PELAPORAN MODAL (ULTRA CLEAN FLOW REDESIGN) ── */}
            <Modal
                title={
                    reportingTask ? (
                        <div className="flow-report-modal-header">
                            <div className="flow-report-modal-context">
                                <span className="flow-context-channel">
                                    {reportingTask.group ? `#${formatChannelName(reportingTask.group.name)}` : '# umum'}
                                </span>
                                {reportingTask.category && (
                                    <span className="flow-context-chip">{reportingTask.category}</span>
                                )}
                                <span className="flow-context-priority">
                                    <span className={`flow-priority-dot flow-priority-dot--${reportingTask.priority || 'medium'}`} />
                                    <span>{PRIORITY_CONFIG[reportingTask.priority]?.label}</span>
                                </span>
                            </div>
                            <h3 className="flow-report-modal-task-title">{reportingTask.title}</h3>
                        </div>
                    ) : 'Riwayat & Pelaporan'
                }
                open={isReportModalOpen}
                onCancel={() => setIsReportModalOpen(false)}
                footer={null}
                className="kanban-modal flow-report-modal"
                width={680}
                destroyOnClose
            >
                {reportingTask && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {/* Task Meta & Quick Status Toolbar */}
                        <div className="flow-report-modal-meta-bar">
                            <div className="flow-report-modal-meta-left">
                                {reportingTask.due_date ? (
                                    <span className={`flow-date-chip ${dayjs(reportingTask.due_date).isBefore(dayjs(), 'day') ? 'flow-date-chip--overdue' : ''}`}>
                                        <ClockCircleOutlined style={{ marginRight: 4 }} />
                                        Batas Waktu: <strong>{dayjs(reportingTask.due_date).format(DATE_UI)}</strong>
                                    </span>
                                ) : (
                                    <span className="flow-date-chip" style={{ color: '#94a3b8' }}>
                                        <ClockCircleOutlined style={{ marginRight: 4 }} />
                                        Tanpa batas waktu
                                    </span>
                                )}
                                {reportingTask.subtasks_count > 0 && (
                                    <span className="flow-subtasks-summary-chip">
                                        ✓ {reportingTask.completed_subtasks_count || 0}/{reportingTask.subtasks_count} Tahapan ({reportingTask.progress_percentage || 0}%)
                                    </span>
                                )}
                            </div>

                            <div className="flow-report-modal-meta-right">
                                <Select
                                    size="small"
                                    value={reportingTask.status}
                                    onChange={(val) => {
                                        handleMoveStatus(reportingTask.id, val);
                                        setReportingTask((prev) => prev ? { ...prev, status: val } : null);
                                    }}
                                    className="flow-modal-status-select"
                                    style={{ width: 145 }}
                                >
                                    {COLUMNS.map((c) => (
                                        <Select.Option key={c.key} value={c.key}>
                                            <span className={`flow-column__dot flow-column__dot--${c.key}`} style={{ display: 'inline-block', marginRight: 6 }} />
                                            {c.title}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </div>
                        </div>

                        {/* Riwayat Timeline Feed */}
                        <div className="flow-feed-container">
                            <div className="flow-feed-title">
                                <span>Daftar Riwayat & Catatan Pengerjaan ({reports.length})</span>
                            </div>

                            {reportsLoading ? (
                                <div className="flow-feed-loading">
                                    <Spin size="small" />
                                </div>
                            ) : reports.length === 0 ? (
                                <div className="flow-feed-empty">
                                    <CommentOutlined style={{ fontSize: 24, color: '#cbd5e1', marginBottom: 6 }} />
                                    <p>Belum ada riwayat pengerjaan.</p>
                                    <span>Tulis catatan perkembangan, kendala, atau update pengerjaan pertama di bawah ini.</span>
                                </div>
                            ) : (
                                <div className="flow-feed-list">
                                    {reports.map((rep) => (
                                        <div key={rep.id} className="flow-feed-item">
                                            <div className="flow-feed-avatar">
                                                {getInitials(rep.employee?.name || rep.user?.name || 'Admin')}
                                            </div>
                                            <div className="flow-feed-content-wrapper">
                                                <div className="flow-feed-item-header">
                                                    <div className="flow-feed-author-meta">
                                                        <span className="flow-feed-author-name">
                                                            {rep.employee?.name || rep.user?.name || 'Pegawai'}
                                                        </span>
                                                        <span className="flow-feed-timestamp">
                                                            {rep.employee?.department ? `${rep.employee.department} • ` : ''}
                                                            {dayjs(rep.created_at).format('DD MMM YYYY, HH:mm')}
                                                        </span>
                                                    </div>

                                                    <div className="flow-feed-header-actions">
                                                        {rep.status_update && (
                                                            <span className="flow-feed-status-badge">
                                                                ● {COLUMNS.find((c) => c.key === rep.status_update)?.title || rep.status_update}
                                                            </span>
                                                        )}
                                                        <Popconfirm
                                                            title="Hapus riwayat laporan ini?"
                                                            onConfirm={() => handleDeleteReport(rep.id)}
                                                            okText="Hapus"
                                                            cancelText="Batal"
                                                        >
                                                            <Button type="text" size="small" className="flow-feed-delete-btn" icon={<DeleteOutlined />} />
                                                        </Popconfirm>
                                                    </div>
                                                </div>

                                                <div className="flow-feed-body">
                                                    {rep.content}
                                                </div>

                                                {rep.attachment_path && (
                                                    <div className="flow-feed-attachment">
                                                        <button
                                                            type="button"
                                                            className="flow-feed-file-chip"
                                                            onClick={() => window.open(getReportFileUrl(rep.id), '_blank')}
                                                        >
                                                            <PaperClipOutlined style={{ color: '#0F5B99' }} />
                                                            <span className="flow-feed-file-name">{rep.attachment_name || 'Berkas Lampiran'}</span>
                                                            {rep.attachment_size && (
                                                                <span className="flow-feed-file-size">({Math.round(rep.attachment_size / 1024)} KB)</span>
                                                            )}
                                                            <DownloadOutlined style={{ marginLeft: 'auto', color: '#64748b' }} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Modern Integrated Composer */}
                        <div className="flow-composer">
                            <Input.TextArea
                                rows={2}
                                autoSize={{ minRows: 2, maxRows: 5 }}
                                placeholder="Ketik riwayat atau catatan perkembangan pengerjaan tugas di sini..."
                                value={reportContent}
                                onChange={(e) => setReportContent(e.target.value)}
                                className="flow-composer-textarea"
                            />

                            {reportFile && (
                                <div className="flow-composer-file-preview">
                                    <PaperClipOutlined style={{ color: '#0F5B99' }} />
                                    <span className="flow-composer-file-name">{reportFile.name}</span>
                                    <span className="flow-composer-file-size">({Math.round(reportFile.size / 1024)} KB)</span>
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<CloseOutlined />}
                                        onClick={() => setReportFile(null)}
                                        className="flow-composer-file-remove"
                                    />
                                </div>
                            )}

                            <div className="flow-composer-toolbar">
                                <div className="flow-composer-toolbar-left">
                                    <Select
                                        placeholder="Ubah Status (Opsional)"
                                        allowClear
                                        value={reportStatusUpdate}
                                        onChange={setReportStatusUpdate}
                                        style={{ width: 170 }}
                                        size="small"
                                        className="flow-composer-select"
                                    >
                                        {COLUMNS.map((c) => (
                                            <Select.Option key={c.key} value={c.key}>
                                                <span className={`flow-column__dot flow-column__dot--${c.key}`} style={{ display: 'inline-block', marginRight: 6 }} />
                                                {c.title}
                                            </Select.Option>
                                        ))}
                                    </Select>

                                    <Upload
                                        accept={ALLOWED_UPLOAD_ACCEPT}
                                        beforeUpload={(file) => {
                                            if (!isAllowedFileType(file)) {
                                                notification.error({
                                                    message: 'Format Berkas Tidak Didukung',
                                                    description: 'Hanya berkas berformat PDF, PNG, JPG, dan JPEG yang dapat diunggah.',
                                                });
                                                return Upload.LIST_IGNORE;
                                            }
                                            setReportFile(file);
                                            return false;
                                        }}
                                        showUploadList={false}
                                        maxCount={1}
                                    >
                                        <Button size="small" icon={<PaperClipOutlined />} className="flow-composer-attach-btn">
                                            {reportFile ? 'Ganti Lampiran' : 'Lampirkan Berkas'}
                                        </Button>
                                    </Upload>
                                </div>

                                <Button
                                    type="primary"
                                    size="small"
                                    icon={<SendOutlined />}
                                    loading={reportSubmitting}
                                    onClick={handleSubmitReport}
                                    className="flow-composer-send-btn"
                                >
                                    Kirim Riwayat
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ── MODAL: LOG AKTIVITAS RUANG KERJA (AUDIT TRAIL) ── */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <HistoryOutlined style={{ color: '#0F5B99', fontSize: 16 }} />
                        <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>
                            Log Aktivitas {activeGroupObj ? `— ${activeGroupObj.name}` : 'Seluruh Ruang Kerja'}
                        </span>
                    </div>
                }
                open={isActivityModalOpen}
                onCancel={() => setIsActivityModalOpen(false)}
                footer={null}
                className="kanban-modal"
                width={680}
                destroyOnClose
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <Radio.Group
                            size="small"
                            value={activityFilter}
                            onChange={(e) => setActivityFilter(e.target.value)}
                        >
                            <Radio.Button value="all">Semua ({activityLogs.length})</Radio.Button>
                            <Radio.Button value="task">Tugas</Radio.Button>
                            <Radio.Button value="subtask">Tahapan & Bukti</Radio.Button>
                            <Radio.Button value="report">Riwayat</Radio.Button>
                            <Radio.Button value="group">Ruang Kerja</Radio.Button>
                        </Radio.Group>

                        <Button
                            size="small"
                            icon={<ReloadOutlined />}
                            loading={activityLoading}
                            onClick={() => fetchActivityLogs(activeGroupId)}
                        >
                            Segarkan
                        </Button>
                    </div>

                    {activityLoading ? (
                        <div style={{ padding: '40px 0', textAlign: 'center' }}>
                            <Spin tip="Memuat log aktivitas..." />
                        </div>
                    ) : (
                        (() => {
                            const filteredActivities = activityLogs.filter((act) => {
                                if (activityFilter === 'all') return true;
                                if (activityFilter === 'task') return ['task_created', 'task_updated', 'status_changed', 'task_deleted'].includes(act.action);
                                if (activityFilter === 'subtask') return ['subtask_added', 'subtask_completed', 'evidence_uploaded', 'evidence_deleted', 'subtask_deleted'].includes(act.action);
                                if (activityFilter === 'report') return ['report_added', 'report_deleted'].includes(act.action);
                                if (activityFilter === 'group') return ['group_created', 'group_updated', 'group_deleted', 'members_updated'].includes(act.action);
                                return true;
                            });

                            if (filteredActivities.length === 0) {
                                return (
                                    <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8' }}>
                                        <HistoryOutlined style={{ fontSize: 32, marginBottom: 8, color: '#cbd5e1' }} />
                                        <p style={{ fontSize: 13, margin: 0 }}>Belum ada log aktivitas yang tercatat pada ruang kerja ini.</p>
                                    </div>
                                );
                            }

                            return (
                                <div className="kanban-activity-timeline">
                                    {filteredActivities.map((act) => {
                                        const badge = getActivityBadge(act.action);
                                        const empName = act.employee?.name || act.user?.name || 'Pengguna';
                                        return (
                                            <div key={act.id} className="kanban-activity-card">
                                                <div className="kanban-activity-avatar" style={{ background: act.group?.color || '#0F5B99' }}>
                                                    {getInitials(empName)}
                                                </div>
                                                <div className="kanban-activity-content">
                                                    <div className="kanban-activity-header">
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <span className="kanban-activity-user">{empName}</span>
                                                            {act.employee?.position && (
                                                                <span style={{ fontSize: 11, color: '#64748b' }}>({act.employee.position})</span>
                                                            )}
                                                        </div>
                                                        <span className="kanban-activity-time">
                                                            {dayjs(act.created_at).format('DD MMM YYYY, HH:mm')} ({dayjs(act.created_at).fromNow()})
                                                        </span>
                                                    </div>
                                                    <div className="kanban-activity-desc">{act.description}</div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                                        <span className="kanban-activity-badge" style={{ color: badge.color, border: `1px solid ${badge.color}30` }}>
                                                            {badge.icon} {badge.text}
                                                        </span>
                                                        {act.task && (
                                                            <Button
                                                                type="link"
                                                                size="small"
                                                                style={{ padding: 0, height: 'auto', fontSize: 11.5 }}
                                                                onClick={() => {
                                                                    setIsActivityModalOpen(false);
                                                                    handleOpenDetail(act.task);
                                                                }}
                                                            >
                                                                Lihat Tugas →
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()
                    )}
                </div>
            </Modal>
        </div>
    );
}

export default function KanbanWork() {
    return (
        <AntdApp>
            <KanbanWorkInner />
        </AntdApp>
    );
}
