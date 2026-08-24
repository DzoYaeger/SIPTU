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
} from 'antd';
import {
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
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { buildMessageAdapter } from '../utils/notify.js';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import './KanbanWork.css';

dayjs.locale('id');

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

    // Inline Card Subtask Adder
    const [addingSubtaskTaskId, setAddingSubtaskTaskId] = useState(null);
    const [cardSubtaskInput, setCardSubtaskInput] = useState('');
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
    const [unreadRefreshTick, setUnreadRefreshTick] = useState(0);

    const isTaskReportUnread = (task) => {
        if (!task) return false;
        const count = task.reports_count || (task.reports ? task.reports.length : 0);
        if (count === 0) return false;
        const lastRead = localStorage.getItem(`kanban_read_task_${task.id}`);
        if (!lastRead) return true;
        if (task.latest_report_at) {
            return new Date(task.latest_report_at).getTime() > Number(lastRead);
        }
        return false;
    };

    const markTaskReportRead = (taskId) => {
        if (!taskId) return;
        localStorage.setItem(`kanban_read_task_${taskId}`, String(Date.now()));
        setUnreadRefreshTick((prev) => prev + 1);
    };

    // ── Activity Logs (Audit Trail) State ──
    const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
    const [activityLogs, setActivityLogs] = useState([]);
    const [activityLoading, setActivityLoading] = useState(false);
    const [activityFilter, setActivityFilter] = useState('all');

    const fetchActivityLogs = async (groupId = null) => {
        setActivityLoading(true);
        try {
            const targetGroup = groupId !== null ? groupId : activeGroupId;
            const url = (targetGroup && targetGroup !== 'all')
                ? `/kanban-activities?group_id=${targetGroup}`
                : '/kanban-activities';
            const res = await apiFetch(url);
            if (!res.ok) throw new Error('Gagal memuat log aktivitas.');
            const json = await res.json();
            setActivityLogs(json.data || []);
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
                // If activeGroupId is 'all' and groups exist, keep 'all' or select first
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
        return groups.find((g) => String(g.id) === String(activeGroupId)) || null;
    }, [groups, activeGroupId]);

    // Filtered Groups for Right Sidebar
    const filteredGroups = useMemo(() => {
        if (!groupSearch.trim()) return groups;
        const q = groupSearch.toLowerCase();
        return groups.filter((g) => g.name.toLowerCase().includes(q) || (g.description && g.description.toLowerCase().includes(q)));
    }, [groups, groupSearch]);

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
            { id: Date.now(), title: '' },
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
        markTaskReportRead(task.id);
        setDetailTask(task);
        setNewSubtaskTitle('');
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
        markTaskReportRead(task.id);
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
                    .map((s) => ({ title: s.title.trim() }));
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
    const handleAddSubtaskFromCard = async (taskId) => {
        if (!cardSubtaskInput || !cardSubtaskInput.trim()) {
            setAddingSubtaskTaskId(null);
            return;
        }
        try {
            const res = await apiFetch(`/kanban-tasks/${taskId}/subtasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: cardSubtaskInput.trim() }),
            });
            if (!res.ok) throw new Error('Gagal menambah tahapan.');
            setCardSubtaskInput('');
            setAddingSubtaskTaskId(null);
            refreshSingleTask(taskId);
        } catch (e) {
            notification.error({ message: 'Gagal', description: e.message });
        }
    };

    // Add Subtask in Detail Modal
    const handleAddSubtaskInDetail = async () => {
        if (!newSubtaskTitle || !newSubtaskTitle.trim() || !detailTask) return;
        try {
            const res = await apiFetch(`/kanban-tasks/${detailTask.id}/subtasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newSubtaskTitle.trim() }),
            });
            if (!res.ok) throw new Error('Gagal menambah tahapan.');
            setNewSubtaskTitle('');
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
        <div className="kanban-module-root">
            {/* ── TOP COMMAND TOOLBAR ── */}
            <div className="kanban-top-bar">
                <div className="kanban-top-bar__left">
                    <Button
                        type="text"
                        icon={<ArrowLeftOutlined />}
                        className="kanban-back-btn"
                        onClick={() => navigate('/app/layanan-mandiri')}
                        title="Kembali ke Layanan Mandiri"
                    >
                        Layanan Mandiri
                    </Button>

                    <div className="kanban-bar-divider" />
                    <span className="kanban-page-title">Kanban Work</span>
                    <div className="kanban-bar-divider" />

                    {/* Search */}
                    <Input
                        placeholder="Cari tugas, pegawai..."
                        prefix={<SearchOutlined style={{ color: '#8c939d' }} />}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        allowClear
                        className="kanban-search-input"
                    />

                    {/* Filters Group */}
                    <div className="kanban-top-bar__filters">
                        <Select
                            value={priorityFilter}
                            onChange={setPriorityFilter}
                            className="kanban-select"
                            style={{ width: 120 }}
                        >
                            <Select.Option value="all">Prioritas</Select.Option>
                            <Select.Option value="urgent">● Mendesak</Select.Option>
                            <Select.Option value="high">● Tinggi</Select.Option>
                            <Select.Option value="medium">● Sedang</Select.Option>
                            <Select.Option value="low">● Rendah</Select.Option>
                        </Select>

                        <Select
                            value={categoryFilter}
                            onChange={setCategoryFilter}
                            className="kanban-select"
                            style={{ width: 120 }}
                        >
                            <Select.Option value="all">Kategori</Select.Option>
                            {categories.map((cat) => (
                                <Select.Option key={cat} value={cat}>{cat}</Select.Option>
                            ))}
                        </Select>

                        <Select
                            value={employeeFilter}
                            onChange={setEmployeeFilter}
                            className="kanban-select"
                            style={{ width: 140 }}
                        >
                            <Select.Option value="all">Semua Pegawai</Select.Option>
                            <Select.Option value="my">★ Tugas Saya</Select.Option>
                            {employees.map((emp) => (
                                <Select.Option key={emp.id} value={String(emp.id)}>{emp.name}</Select.Option>
                            ))}
                        </Select>

                        {(search || priorityFilter !== 'all' || categoryFilter !== 'all' || employeeFilter !== 'all') && (
                            <Button
                                type="text"
                                icon={<ClearOutlined />}
                                onClick={() => {
                                    setSearch('');
                                    setPriorityFilter('all');
                                    setCategoryFilter('all');
                                    setEmployeeFilter('all');
                                }}
                                style={{ color: '#ef4444', fontSize: 11.5, fontWeight: 600, padding: '0 4px' }}
                            >
                                Reset
                            </Button>
                        )}
                    </div>
                </div>

                <div className="kanban-top-bar__right">
                    <span className="kanban-counter-chip">
                        <span className="kanban-counter-dot" />
                        {tasks.length} Tugas
                    </span>

                    <Tooltip title="Segarkan Data">
                        <Button
                            icon={<ReloadOutlined spin={loading} />}
                            onClick={() => { fetchTasks(); fetchGroups(); }}
                            disabled={loading}
                            style={{ height: 32, borderRadius: 6 }}
                        />
                    </Tooltip>

                    <Radio.Group
                        value={viewMode}
                        onChange={(e) => setViewMode(e.target.value)}
                        className="kanban-view-toggle"
                    >
                        <Radio.Button value="board" title="Tampilan Papan Kanban"><AppstoreOutlined /></Radio.Button>
                        <Radio.Button value="table" title="Tampilan Tabel"><UnorderedListOutlined /></Radio.Button>
                    </Radio.Group>

                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => handleOpenCreate('todo')}
                        className="kanban-primary-btn"
                    >
                        Buat Tugas
                    </Button>
                </div>
            </div>

            {/* ── 2. MAIN LAYOUT: LEFT SIDEBAR + RIGHT KANBAN CANVAS ── */}
            <div className="kanban-layout-container">
                {/* ── LEFT GROUPING / CHANNEL NAVIGATOR (Discord & Layanan Mandiri Style) ── */}
                <div className="kanban-group-sidebar">
                    <div className="kanban-group-sidebar__header">
                        <span className="kanban-group-sidebar__title">
                            <TeamOutlined /> Ruang Kerja ({groups.length})
                        </span>
                        <Button
                            type="text"
                            icon={<PlusOutlined />}
                            className="kanban-group-sidebar__create-btn"
                            onClick={handleOpenCreateGroup}
                        >
                            Buat
                        </Button>
                    </div>

                    <div className="kanban-group-sidebar__search">
                        <Input
                            size="small"
                            placeholder="Cari ruang kerja..."
                            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                            value={groupSearch}
                            onChange={(e) => setGroupSearch(e.target.value)}
                            allowClear
                            style={{ borderRadius: 6 }}
                        />
                    </div>

                    <div className="kanban-group-sidebar__list">
                        {/* Channel Option 0: Semua Ruang Kerja */}
                        <div
                            className={`kanban-group-channel-item ${activeGroupId === 'all' ? 'kanban-group-channel-item--active' : ''}`}
                            onClick={() => setActiveGroupId('all')}
                        >
                            <div className="kanban-group-channel-item__left">
                                <span className="kanban-group-channel-dot" style={{ background: '#0F5B99' }} />
                                <div className="kanban-group-channel-item__meta">
                                    <span className="kanban-group-channel-item__name">🌐 Semua Ruang Kerja</span>
                                    <span className="kanban-group-channel-item__sub">Semua tugas saya</span>
                                </div>
                            </div>
                            <div className="kanban-group-channel-item__right">
                                <span className="kanban-group-channel-badge">{tasks.length}</span>
                            </div>
                        </div>

                        {/* Channel Groups List */}
                        {filteredGroups.map((g) => {
                            const isActive = String(activeGroupId) === String(g.id);
                            return (
                                <div
                                    key={g.id}
                                    className={`kanban-group-channel-item ${isActive ? 'kanban-group-channel-item--active' : ''}`}
                                    onClick={() => setActiveGroupId(String(g.id))}
                                >
                                    <div className="kanban-group-channel-item__left">
                                        <span className="kanban-group-channel-dot" style={{ background: g.color || '#0F5B99' }} />
                                        <div className="kanban-group-channel-item__meta">
                                            <span className="kanban-group-channel-item__name">
                                                {g.name}
                                            </span>
                                            <span className="kanban-group-channel-item__sub">
                                                {g.is_public ? 'Publik' : (g.type === 'private' ? 'Pribadi' : `${(g.members ?? []).length} Pegawai`)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="kanban-group-channel-item__right">
                                        <span className="kanban-group-channel-badge">{g.tasks_count || 0}</span>
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
                                                        ...(!g.is_public || g.name.toLowerCase() !== 'umum' ? [
                                                            { type: 'divider' },
                                                            {
                                                                key: 'delete',
                                                                label: <span style={{ color: '#ef4444' }}>Hapus</span>,
                                                                icon: <DeleteOutlined style={{ color: '#ef4444' }} />,
                                                                onClick: (e) => {
                                                                    Modal.confirm({
                                                                        title: 'Hapus Grouping',
                                                                        content: `Hapus ruang kerja "${g.name}"? Tugas di dalamnya akan tetap aman.`,
                                                                        okText: 'Hapus',
                                                                        cancelText: 'Batal',
                                                                        okButtonProps: { danger: true },
                                                                        onOk: () => handleDeleteGroup(g),
                                                                    });
                                                                },
                                                            },
                                                        ] : []),
                                                    ],
                                                }}
                                                trigger={['click']}
                                                placement="bottomRight"
                                            >
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    shape="circle"
                                                    icon={<MoreOutlined style={{ fontSize: 13, color: '#94a3b8' }} />}
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

                {/* ── RIGHT MAIN CANVAS (Active Group Header + Board / Table) ── */}
                <div className="kanban-main-content">
                    {/* Active Group Banner */}
                    <div className="kanban-active-group-banner">
                        <div className="kanban-active-group-banner__left">
                            <div
                                className="kanban-group-avatar-icon"
                                style={{ background: activeGroupObj ? activeGroupObj.color : '#0F5B99' }}
                            >
                                {activeGroupObj ? getGroupIcon(activeGroupObj.icon) : <AppstoreOutlined />}
                            </div>
                            <div className="kanban-active-group-banner__meta">
                                <div className="kanban-active-group-banner__title-row">
                                    <h2 className="kanban-active-group-banner__title">
                                        {activeGroupObj ? activeGroupObj.name : 'Semua Ruang Kerja (Semua Grouping)'}
                                    </h2>
                                    {activeGroupObj && (
                                        <Tag color={activeGroupObj.is_public ? 'blue' : (activeGroupObj.type === 'private' ? 'default' : 'cyan')}>
                                            {activeGroupObj.is_public ? 'Publik' : (activeGroupObj.type === 'private' ? 'Pribadi' : 'Tim')}
                                        </Tag>
                                    )}
                                </div>
                                <p className="kanban-active-group-banner__desc">
                                    {activeGroupObj
                                        ? (activeGroupObj.description || 'Papan kanban tugas dan pengerjaan tahapan bersama tim')
                                        : 'Menampilkan seluruh tugas dari semua grouping ruang kerja yang dapat Anda akses'}
                                </p>
                            </div>
                        </div>

                        <div className="kanban-active-group-banner__right">
                            {activeGroupObj && (activeGroupObj.members ?? []).length > 0 && (
                                <div className="kanban-group-members-stack">
                                    {activeGroupObj.members.slice(0, 6).map((m) => (
                                        <Tooltip key={m.id} title={`${m.name} (${m.department || 'Pegawai'})`}>
                                            <div className="kanban-member-avatar-mini" style={{ background: activeGroupObj.color }}>
                                                {getInitials(m.name)}
                                            </div>
                                        </Tooltip>
                                    ))}
                                    {activeGroupObj.members.length > 6 && (
                                        <div className="kanban-member-avatar-mini" style={{ background: '#475569' }}>
                                            +{activeGroupObj.members.length - 6}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeGroupObj && activeGroupObj.is_creator && (
                                <Button
                                    type="default"
                                    size="small"
                                    icon={<SettingOutlined />}
                                    onClick={(e) => handleOpenEditGroup(activeGroupObj, e)}
                                    style={{ borderRadius: 6, fontSize: 12 }}
                                >
                                    Kelola Anggota
                                </Button>
                            )}

                            <Button
                                type="default"
                                size="small"
                                icon={<HistoryOutlined />}
                                onClick={() => handleOpenActivityLogs(activeGroupId)}
                                style={{ borderRadius: 6, fontSize: 12 }}
                            >
                                Log Aktivitas
                            </Button>
                        </div>
                    </div>

                    {/* ── KANBAN BOARD OR TABLE VIEW ── */}
                    {viewMode === 'board' ? (
                        <div className="kanban-board-canvas">
                            {COLUMNS.map((col) => {
                                const colTasks = tasks.filter((t) => t.status === col.key);
                                return (
                                    <div key={col.key} className="kanban-column">
                                        <div className="kanban-column__header">
                                            <div className="kanban-column__title-wrap">
                                                <span className={`kanban-column-dot ${col.dotClass}`} />
                                                <h3 className="kanban-column__title">{col.title}</h3>
                                                <span className="kanban-column__badge">{colTasks.length}</span>
                                            </div>
                                            <Button
                                                type="text"
                                                size="small"
                                                icon={<PlusOutlined />}
                                                className="kanban-column__quick-add"
                                                onClick={() => handleOpenCreate(col.key)}
                                                title={`Tambah tugas ke ${col.title}`}
                                            />
                                        </div>

                                        <div className="kanban-column__body">
                                            {colTasks.length === 0 ? (
                                                <div className="kanban-column__empty">
                                                    Belum ada tugas di kolom ini
                                                </div>
                                            ) : (
                                                colTasks.map((task) => {
                                                    const pConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                                                    const isOverdue = task.due_date && dayjs(task.due_date).isBefore(dayjs(), 'day') && task.status !== 'done';
                                                    const isToday = task.due_date && dayjs(task.due_date).isSame(dayjs(), 'day') && task.status !== 'done';

                                                    return (
                                                        <div
                                                            key={task.id}
                                                            className="kanban-card"
                                                            onClick={() => handleOpenDetail(task)}
                                                        >
                                                            {/* Card Tags & Move Action */}
                                                            <div className="kanban-card__top">
                                                                <div className="kanban-card__tags">
                                                                    <span className={`kanban-badge-priority ${pConfig.className}`}>
                                                                        {pConfig.label}
                                                                    </span>
                                                                    {activeGroupId === 'all' && task.group && (
                                                                        <span className="kanban-badge-category" style={{ borderColor: task.group.color, color: task.group.color }}>
                                                                            {task.group.name}
                                                                        </span>
                                                                    )}
                                                                    <span className="kanban-badge-category">
                                                                        {task.category || 'Umum'}
                                                                    </span>
                                                                </div>

                                                                {/* Quick Move Status */}
                                                                <div onClick={(e) => e.stopPropagation()}>
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
                                                                                            <span className={`kanban-column-dot ${c.dotClass}`} style={{ display: 'inline-block', marginRight: 6 }} />
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
                                                                            icon={<MoreOutlined style={{ fontSize: 15, color: '#64748b' }} />}
                                                                        />
                                                                    </Dropdown>
                                                                </div>
                                                            </div>

                                                            {/* Card Title & Desc */}
                                                            <h4 className="kanban-card__title">{task.title}</h4>
                                                            {task.description && (
                                                                <p className="kanban-card__desc">{task.description}</p>
                                                            )}

                                                            {/* Live Direct Subtasks Checklist & Nextcloud Upload */}
                                                            <div className="kanban-card-subtasks" onClick={(e) => e.stopPropagation()}>
                                                                <div className="kanban-card-subtasks__header">
                                                                    <span>Tahapan ({task.completed_subtasks_count}/{task.subtasks_count})</span>
                                                                    <div className="kanban-progress-bar-bg">
                                                                        <div
                                                                            className="kanban-progress-bar-fill"
                                                                            style={{ width: `${task.progress_percentage}%` }}
                                                                        />
                                                                    </div>
                                                                </div>

                                                                {(task.subtasks ?? []).map((st) => (
                                                                    <div key={st.id} className="kanban-card-subtask-item">
                                                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, flex: 1, minWidth: 0 }}>
                                                                            <Checkbox
                                                                                checked={st.status === 'completed'}
                                                                                onChange={() => handleToggleSubtask(st, task.id)}
                                                                                style={{ marginTop: 2 }}
                                                                            />
                                                                            <span className={`kanban-card-subtask-title ${st.status === 'completed' ? 'kanban-card-subtask-item--done' : ''}`}>
                                                                                {st.title}
                                                                            </span>
                                                                        </div>

                                                                        <div className="kanban-card-subtask-item__actions">
                                                                            {st.attachment_path ? (
                                                                                <Tooltip title={`Berkas Bukti: ${st.attachment_name} (Klik untuk unduh)`}>
                                                                                    <Button
                                                                                        type="text"
                                                                                        size="small"
                                                                                        icon={<PaperClipOutlined style={{ color: '#0F5B99', fontSize: 13 }} />}
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
                                                                                    <Tooltip title="Upload Bukti Proses ke Nextcloud">
                                                                                        <Button
                                                                                            type="text"
                                                                                            size="small"
                                                                                            icon={<UploadOutlined style={{ color: '#64748b', fontSize: 12 }} />}
                                                                                            loading={uploadingSubtaskId === st.id}
                                                                                        />
                                                                                    </Tooltip>
                                                                                </Upload>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}

                                                                {/* Inline Quick Add Subtask */}
                                                                {addingSubtaskTaskId === task.id ? (
                                                                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                                                        <Input
                                                                            size="small"
                                                                            placeholder="Tulis tahapan..."
                                                                            value={cardSubtaskInput}
                                                                            onChange={(e) => setCardSubtaskInput(e.target.value)}
                                                                            onPressEnter={() => handleAddSubtaskFromCard(task.id)}
                                                                            autoFocus
                                                                        />
                                                                        <Button size="small" type="primary" onClick={() => handleAddSubtaskFromCard(task.id)}>
                                                                            OK
                                                                        </Button>
                                                                    </div>
                                                                ) : (
                                                                    <Button
                                                                        type="dashed"
                                                                        size="small"
                                                                        icon={<PlusOutlined />}
                                                                        onClick={() => {
                                                                            setAddingSubtaskTaskId(task.id);
                                                                            setCardSubtaskInput('');
                                                                        }}
                                                                        style={{ fontSize: 11, width: '100%', marginTop: 2, height: 24 }}
                                                                    >
                                                                        + Tambah Tahap
                                                                    </Button>
                                                                )}
                                                            </div>

                                                            {/* Card Footer (Deadline & Assigned Pegawai & Riwayat Button) */}
                                                            <div className="kanban-card__footer">
                                                                <div className="kanban-card__meta-left">
                                                                    {task.due_date && (
                                                                        <span className={`kanban-date-chip ${isOverdue ? 'kanban-date-chip--overdue' : (isToday ? 'kanban-date-chip--today' : '')}`}>
                                                                            <ClockCircleOutlined style={{ fontSize: 11 }} />
                                                                            {dayjs(task.due_date).format(DATE_UI)}
                                                                        </span>
                                                                    )}
                                                                    {task.attachments_count > 0 && (
                                                                        <span className="kanban-date-chip">
                                                                            <PaperClipOutlined style={{ fontSize: 11 }} />
                                                                            {task.attachments_count}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                    <button
                                                                        type="button"
                                                                        className="kanban-report-quick-btn"
                                                                        onClick={(e) => handleOpenReportsModal(task, e)}
                                                                        title="Buka riwayat pengerjaan & tambah laporan"
                                                                    >
                                                                        <CommentOutlined style={{ fontSize: 11.5 }} />
                                                                        <span>{task.reports_count > 0 ? `${task.reports_count} Riwayat` : '+ Riwayat'}</span>
                                                                        {isTaskReportUnread(task) && (
                                                                            <Tooltip title="Ada riwayat/laporan baru">
                                                                                <span className="kanban-unread-dot" />
                                                                            </Tooltip>
                                                                        )}
                                                                    </button>

                                                                    {(task.assignees ?? []).length > 0 && (
                                                                        <div className="kanban-card__assignees">
                                                                            {task.assignees.slice(0, 3).map((emp) => (
                                                                                <Tooltip key={emp.id} title={`${emp.name} (${emp.nip || 'Pegawai'})`}>
                                                                                    <div className="kanban-assignee-avatar">
                                                                                        {getInitials(emp.name)}
                                                                                    </div>
                                                                                </Tooltip>
                                                                            ))}
                                                                            {task.assignees.length > 3 && (
                                                                                <div className="kanban-assignee-avatar" style={{ background: '#475569' }}>
                                                                                    +{(task.assignees.length - 3)}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{ background: '#ffffff', borderRadius: 8, padding: 12, border: '1px solid #e2e8f0' }}>
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
                        >
                            <DatePicker format={DATE_UI} style={{ width: '100%' }} />
                        </Form.Item>

                        <Form.Item
                            noStyle
                            shouldUpdate={(prev, cur) => prev.group_id !== cur.group_id}
                        >
                            {({ getFieldValue }) => {
                                const selectedGId = getFieldValue('group_id');
                                const selectedG = groups.find((g) => g.id === selectedGId);

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
                                            selectedG && !selectedG.is_public && selectedG.type !== 'public'
                                                ? `Hanya ${availableEmployees.length} pegawai anggota "${selectedG.name}" yang dapat ditugaskan.`
                                                : undefined
                                        }
                                    >
                                        <Select
                                            mode="multiple"
                                            placeholder="Pilih pegawai yang ditugaskan..."
                                            optionFilterProp="children"
                                            showSearch
                                            style={{ width: '100%' }}
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
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <label style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                                    Rincian Tahapan Pekerjaan (Checklist)
                                </label>
                                <Button
                                    type="link"
                                    size="small"
                                    onClick={() => setInitialSubtasks((prev) => [...prev, { id: Date.now(), title: '' }])}
                                >
                                    + Tambah Tahap
                                </Button>
                            </div>

                            {initialSubtasks.map((st, idx) => (
                                <div key={st.id} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                                    <Input
                                        placeholder={`Tahap ${idx + 1}...`}
                                        value={st.title}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setInitialSubtasks((prev) => prev.map((item) => (item.id === st.id ? { ...item, title: val } : item)));
                                        }}
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
                width={700}
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
                                                {(detailTask.subtasks ?? []).map((st) => (
                                                    <div key={st.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                                                                <Checkbox
                                                                    checked={st.status === 'completed'}
                                                                    onChange={() => handleToggleSubtask(st, detailTask.id)}
                                                                />
                                                                <span style={{ fontSize: 13, fontWeight: 600, color: st.status === 'completed' ? '#94a3b8' : '#0f172a', textDecoration: st.status === 'completed' ? 'line-through' : 'none' }}>
                                                                    {st.title}
                                                                </span>
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
                                                            <div style={{ fontSize: 11, color: '#10b981', paddingLeft: 24 }}>
                                                                ✓ Diselesaikan oleh: <strong>{st.completed_by_name}</strong> {st.completed_at ? `(${dayjs(st.completed_at).format('DD/MM/YYYY HH:mm')})` : ''}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}

                                                {/* Add New Subtask Input inside Modal */}
                                                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                                    <Input
                                                        placeholder="Tambah rincian tahapan pekerjaan baru..."
                                                        value={newSubtaskTitle}
                                                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                                        onPressEnter={handleAddSubtaskInDetail}
                                                    />
                                                    <Button type="primary" onClick={handleAddSubtaskInDetail} className="kanban-primary-btn">
                                                        Tambah
                                                    </Button>
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
                                        <div className="kanban-report-chat-container">
                                            {/* Top: Report History Timeline */}
                                            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#64748b' }}>
                                                Riwayat Perkembangan ({reports.length})
                                            </div>

                                            {reportsLoading ? (
                                                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                                                    <Spin size="small" />
                                                </div>
                                            ) : reports.length === 0 ? (
                                                <Empty
                                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                    description="Belum ada catatan laporan perkembangan untuk tugas ini"
                                                />
                                            ) : (
                                                <div className="kanban-report-timeline">
                                                    {reports.map((rep) => (
                                                        <div key={rep.id} className="kanban-report-card">
                                                            <div className="kanban-report-card__header">
                                                                <div className="kanban-report-card__author">
                                                                    <div className="kanban-report-card__avatar">
                                                                        {getInitials(rep.employee?.name || rep.user?.name || 'Admin')}
                                                                    </div>
                                                                    <div className="kanban-report-card__author-info">
                                                                        <span className="kanban-report-card__name">
                                                                            {rep.employee?.name || rep.user?.name || 'Pegawai'}
                                                                        </span>
                                                                        <span className="kanban-report-card__time">
                                                                            {rep.employee?.department ? `${rep.employee.department} • ` : ''}
                                                                            {dayjs(rep.created_at).format('DD MMM YYYY, HH:mm')}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                    {rep.status_update && (
                                                                        <Tag color="processing" style={{ margin: 0, fontSize: 11 }}>
                                                                            Status: {COLUMNS.find((c) => c.key === rep.status_update)?.title || rep.status_update}
                                                                        </Tag>
                                                                    )}
                                                                    <Popconfirm
                                                                        title="Hapus riwayat laporan ini?"
                                                                        onConfirm={() => handleDeleteReport(rep.id)}
                                                                        okText="Hapus"
                                                                        cancelText="Batal"
                                                                    >
                                                                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                                                                    </Popconfirm>
                                                                </div>
                                                            </div>

                                                            <div className="kanban-report-card__body">
                                                                {rep.content}
                                                            </div>

                                                            {rep.attachment_path && (
                                                                <div className="kanban-report-card__footer">
                                                                    <Button
                                                                        type="text"
                                                                        size="small"
                                                                        className="kanban-report-card__file-btn"
                                                                        icon={<PaperClipOutlined />}
                                                                        onClick={() => window.open(getReportFileUrl(rep.id), '_blank')}
                                                                    >
                                                                        {rep.attachment_name || 'Berkas Lampiran'}
                                                                        {rep.attachment_size ? ` (${Math.round(rep.attachment_size / 1024)} KB)` : ''}
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Bottom: Report Input Bar */}
                                            <div className="kanban-report-input-bar">
                                                <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <SendOutlined style={{ color: '#0F5B99' }} />
                                                    Tambah Riwayat / Catatan Pengerjaan
                                                </div>
                                                <Input.TextArea
                                                    rows={3}
                                                    placeholder="Tuliskan catatan, hasil pelaksanaan pekerjaan, kendala, atau progres terbaru..."
                                                    value={reportContent}
                                                    onChange={(e) => setReportContent(e.target.value)}
                                                />

                                                <div className="kanban-report-input-bar__controls">
                                                    <div className="kanban-report-input-bar__left">
                                                        <Select
                                                            placeholder="Ubah Status Kolom (Opsional)"
                                                            allowClear
                                                            value={reportStatusUpdate}
                                                            onChange={setReportStatusUpdate}
                                                            style={{ width: 170 }}
                                                            size="small"
                                                        >
                                                            {COLUMNS.map((c) => (
                                                                <Select.Option key={c.key} value={c.key}>
                                                                    <span className={`kanban-column-dot ${c.dotClass}`} style={{ display: 'inline-block', marginRight: 6 }} />
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
                                                            onRemove={() => setReportFile(null)}
                                                            fileList={reportFile ? [reportFile] : []}
                                                            maxCount={1}
                                                        >
                                                            <Button size="small" icon={<PaperClipOutlined />} style={{ fontSize: 12 }}>
                                                                {reportFile ? 'Ganti Lampiran' : 'Upload Berkas Bukti (Nextcloud)'}
                                                            </Button>
                                                        </Upload>
                                                    </div>

                                                    <Button
                                                        type="primary"
                                                        size="small"
                                                        icon={<SendOutlined />}
                                                        loading={reportSubmitting}
                                                        onClick={handleSubmitReport}
                                                        className="kanban-primary-btn"
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

            {/* ── MODAL: DEDICATED RIWAYAT & PELAPORAN MODAL (DARI TOMBOL CARD KANAN BAWAH) ── */}
            <Modal
                title={
                    reportingTask ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <CommentOutlined style={{ color: '#0F5B99', fontSize: 16 }} />
                            <span>Riwayat & Pelaporan Pengerjaan</span>
                            <Tag color="geekblue">{reportingTask.category || 'Umum'}</Tag>
                            <span className={`kanban-badge-priority ${PRIORITY_CONFIG[reportingTask.priority]?.className}`}>
                                {PRIORITY_CONFIG[reportingTask.priority]?.label}
                            </span>
                        </div>
                    ) : 'Riwayat & Pelaporan'
                }
                open={isReportModalOpen}
                onCancel={() => setIsReportModalOpen(false)}
                footer={null}
                className="kanban-modal"
                width={720}
                destroyOnClose
            >
                {reportingTask && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {/* Task Brief Info Banner */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                            <div>
                                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                                    {reportingTask.title}
                                </div>
                                {reportingTask.due_date && (
                                    <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                                        <ClockCircleOutlined style={{ marginRight: 4 }} />
                                        Batas Waktu: <strong>{dayjs(reportingTask.due_date).format(DATE_UI)}</strong>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Select
                                    size="small"
                                    value={reportingTask.status}
                                    onChange={(val) => {
                                        handleMoveStatus(reportingTask.id, val);
                                        setReportingTask((prev) => prev ? { ...prev, status: val } : null);
                                    }}
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
                            </div>
                        </div>

                        {/* Top: Riwayat Timeline List */}
                        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#64748b' }}>
                            Daftar Riwayat & Progres Pengerjaan ({reports.length})
                        </div>

                        {reportsLoading ? (
                            <div style={{ textAlign: 'center', padding: '28px 0' }}>
                                <Spin size="small" />
                            </div>
                        ) : reports.length === 0 ? (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description="Belum ada riwayat pengerjaan yang dicatat. Ketik catatan perkembangan pertama di bawah ini."
                            />
                        ) : (
                            <div className="kanban-report-timeline">
                                {reports.map((rep) => (
                                    <div key={rep.id} className="kanban-report-card">
                                        <div className="kanban-report-card__header">
                                            <div className="kanban-report-card__author">
                                                <div className="kanban-report-card__avatar">
                                                    {getInitials(rep.employee?.name || rep.user?.name || 'Admin')}
                                                </div>
                                                <div className="kanban-report-card__author-info">
                                                    <span className="kanban-report-card__name">
                                                        {rep.employee?.name || rep.user?.name || 'Pegawai'}
                                                    </span>
                                                    <span className="kanban-report-card__time">
                                                        {rep.employee?.department ? `${rep.employee.department} • ` : ''}
                                                        {dayjs(rep.created_at).format('DD MMM YYYY, HH:mm')}
                                                    </span>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {rep.status_update && (
                                                    <Tag color="processing" style={{ margin: 0, fontSize: 11 }}>
                                                        Status: {COLUMNS.find((c) => c.key === rep.status_update)?.title || rep.status_update}
                                                    </Tag>
                                                )}
                                                <Popconfirm
                                                    title="Hapus riwayat laporan ini?"
                                                    onConfirm={() => handleDeleteReport(rep.id)}
                                                    okText="Hapus"
                                                    cancelText="Batal"
                                                >
                                                    <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                                                </Popconfirm>
                                            </div>
                                        </div>

                                        <div className="kanban-report-card__body">
                                            {rep.content}
                                        </div>

                                        {rep.attachment_path && (
                                            <div className="kanban-report-card__footer">
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    className="kanban-report-card__file-btn"
                                                    icon={<PaperClipOutlined />}
                                                    onClick={() => window.open(getReportFileUrl(rep.id), '_blank')}
                                                >
                                                    {rep.attachment_name || 'Berkas Lampiran'}
                                                    {rep.attachment_size ? ` (${Math.round(rep.attachment_size / 1024)} KB)` : ''}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Bottom: Input Bar for Adding New Report */}
                        <div className="kanban-report-input-bar">
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <SendOutlined style={{ color: '#0F5B99' }} />
                                Tambah Riwayat / Catatan Pengerjaan
                            </div>

                            <Input.TextArea
                                rows={3}
                                placeholder="Ketik riwayat atau catatan perkembangan pengerjaan tugas di sini..."
                                value={reportContent}
                                onChange={(e) => setReportContent(e.target.value)}
                            />

                            <div className="kanban-report-input-bar__controls">
                                <div className="kanban-report-input-bar__left">
                                    <Select
                                        placeholder="Ubah Status (Opsional)"
                                        allowClear
                                        value={reportStatusUpdate}
                                        onChange={setReportStatusUpdate}
                                        style={{ width: 170 }}
                                        size="small"
                                    >
                                        {COLUMNS.map((c) => (
                                            <Select.Option key={c.key} value={c.key}>
                                                <span className={`kanban-column-dot ${c.dotClass}`} style={{ display: 'inline-block', marginRight: 6 }} />
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
                                        onRemove={() => setReportFile(null)}
                                        fileList={reportFile ? [reportFile] : []}
                                        maxCount={1}
                                    >
                                        <Button size="small" icon={<PaperClipOutlined />} style={{ fontSize: 12 }}>
                                            {reportFile ? 'Ganti Lampiran' : 'Upload Berkas Bukti (Nextcloud)'}
                                        </Button>
                                    </Upload>
                                </div>

                                <Button
                                    type="primary"
                                    size="small"
                                    icon={<SendOutlined />}
                                    loading={reportSubmitting}
                                    onClick={handleSubmitReport}
                                    className="kanban-primary-btn"
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
