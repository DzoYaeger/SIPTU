import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import useDebounce from '../hooks/useDebounce.js';
import dayjs from 'dayjs';
import {
  App as AntdApp,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  Dropdown,
  Card,
  Row,
  Col,
  Divider,
  Collapse,
  Empty,
  Alert,
  Radio,
} from 'antd';
import { buildMessageAdapter } from '../utils/notify.js';
import {
  DeleteOutlined,
  EditOutlined,
  HistoryOutlined,
  MoreOutlined,
  SearchOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  FileTextOutlined,
  PlusOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  ArrowLeftOutlined,
  NodeIndexOutlined,
  WarningOutlined,
  SaveOutlined,
  UndoOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';

const { Text, Title, Paragraph } = Typography;

const formatCurrency = (value) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value ?? 0);

// Resizable Header Title Component (Excel-like drag resizing)
const ResizableTitle = (props) => {
  const { onResize, width, children, ...restProps } = props;

  if (!width || !onResize) {
    return <th {...restProps}>{children}</th>;
  }

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = width;

    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      onResize(Math.max(65, startWidth + deltaX));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <th
      {...restProps}
      style={{
        ...restProps.style,
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {children}
      <div
        onMouseDown={handleMouseDown}
        onClick={(e) => e.stopPropagation()}
        title="Geser untuk mengatur lebar kolom"
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '8px',
          cursor: 'col-resize',
          zIndex: 10,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div style={{ width: '2px', height: '55%', background: '#cbd5e1', borderRadius: '1px' }} />
      </div>
    </th>
  );
};

// Helper memparse string MAK ke segmen
const parseMakSegments = (makString) => {
  if (!makString) {
    return { program: '', kro: '', ro: '', komponen: '', subkomponen: '', akun: '' };
  }
  const parts = makString.trim().split('.');
  return {
    program: parts[0] ? parts[0].trim() : '',
    kro: parts[1] ? parts[1].trim() : '',
    ro: parts[2] ? parts[2].trim() : '',
    komponen: parts[3] ? parts[3].trim() : '',
    subkomponen: parts[4] ? parts[4].trim() : '',
    akun: parts[5] ? parts[5].trim() : '',
  };
};

// Component Badge Pill Segmented MAK Renderer
const SegmentedMakPills = ({ mak, segments }) => {
  const segs = useMemo(() => {
    if (segments && (segments.program || segments.kro || segments.ro)) {
      return segments;
    }
    return parseMakSegments(mak);
  }, [mak, segments]);

  const tooltipContent = (
    <div style={{ padding: '4px', fontSize: '11px', lineHeight: 1.6 }}>
      <div style={{ fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '3px', marginBottom: '4px' }}>
        Hierarki APBN: {mak}
      </div>
      <div><strong>1. Program:</strong> {segs.program || '-'}</div>
      <div><strong>2. KRO:</strong> {segs.kro || '-'}</div>
      <div><strong>3. RO:</strong> {segs.ro || '-'}</div>
      <div><strong>4. Komponen:</strong> {segs.komponen || '-'}</div>
      <div><strong>5. Subkomponen:</strong> {segs.subkomponen || '-'}</div>
      <div><strong>6. Akun BAS:</strong> {segs.akun || '-'}</div>
    </div>
  );

  return (
    <Tooltip title={tooltipContent} placement="top">
      <Space size={2} align="center" style={{ flexWrap: 'nowrap', cursor: 'pointer' }}>
        {segs.program && (
          <Tag color="blue" style={{ margin: 0, fontSize: '11px', fontWeight: 600, padding: '0 5px' }}>
            {segs.program}
          </Tag>
        )}
        {segs.kro && (
          <Tag color="cyan" style={{ margin: 0, fontSize: '11px', fontWeight: 600, padding: '0 5px' }}>
            {segs.kro}
          </Tag>
        )}
        {segs.ro && (
          <Tag color="purple" style={{ margin: 0, fontSize: '11px', fontWeight: 600, padding: '0 5px' }}>
            {segs.ro}
          </Tag>
        )}
        {segs.komponen && (
          <Tag color="geekblue" style={{ margin: 0, fontSize: '11px', fontWeight: 600, padding: '0 5px' }}>
            {segs.komponen}
          </Tag>
        )}
        {segs.subkomponen && (
          <Tag color="gold" style={{ margin: 0, fontSize: '11px', fontWeight: 600, padding: '0 5px' }}>
            {segs.subkomponen}
          </Tag>
        )}
        {segs.akun && (
          <Tag color="volcano" style={{ margin: 0, fontSize: '11px', fontWeight: 700, padding: '0 5px' }}>
            {segs.akun}
          </Tag>
        )}
        {!segs.program && !segs.kro && (
          <Text code style={{ fontSize: '11.5px', fontWeight: 600 }}>{mak}</Text>
        )}
      </Space>
    </Tooltip>
  );
};

const Anggaran = () => {
  const { apiFetch, hasRole, currentRole } = useAuth();
  const { modal, message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);

  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // View state: 'planning' (main page view) vs 'manage' (full-page 1 layar interactive workspace)
  const [viewState, setViewState] = useState('planning');

  // Main page view mode: 'tree' (Pohon Hierarki Read-Only default) vs 'table' (Tabel Flat List)
  const [mainViewMode, setMainViewMode] = useState('tree');

  // Draft Staging Mode States (Local Memory Queue)
  const [draftAdded, setDraftAdded] = useState({}); // { [mak]: { mak, deskripsi, anggaran } }
  const [draftEdited, setDraftEdited] = useState({}); // { [mak]: { mak, deskripsi, anggaran, originalRecord } }
  const [draftDeleted, setDraftDeleted] = useState(new Set()); // Set of mak strings to delete

  // Modals state
  const [openSegmentAddModal, setOpenSegmentAddModal] = useState(false);
  const [openHistory, setOpenHistory] = useState(false);

  // Target segment for "+ Tambah Segmen" in Manage Anggaran
  const [addSegmentTarget, setAddSegmentTarget] = useState({
    mode: 'create', // 'create' | 'edit'
    targetLevel: 'program',
    parentPrefix: '',
    nodeFullPrefix: '',
    parentAnggaran: 0,
    parentUsedAnggaran: 0,
    editRecord: null,
  });

  const [inputAnggaranVal, setInputAnggaranVal] = useState(0);

  const [selectedBudget, setSelectedBudget] = useState(null);
  const [segmentForm] = Form.useForm();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Resizable column widths state
  const [colWidths, setColWidths] = useState({
    mak: 250,
    deskripsi: 340,
    anggaran: 160,
    aksi: 70,
  });

  const isValidator = useMemo(() => hasRole('validator', 'keuangan'), [hasRole]);
  const isOperator = useMemo(() => hasRole('operator', 'keuangan'), [hasRole]);

  const mapResponse = useCallback((items) => (
    (items ?? []).map((item) => ({
      ...item,
      key: item.id ?? item.mak,
      history: (item.history ?? []).map((historyItem) => ({
        ...historyItem,
        key: historyItem.id ?? `${item.id}-${historyItem.tanggal}`,
      })),
    }))
  ), []);

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearchTerm) {
        params.append('search', debouncedSearchTerm);
      }
      const response = await apiFetch(`/budgets?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Gagal memuat data anggaran.');
      }
      const data = await response.json();
      setBudgets(mapResponse(data));
    } catch (err) {
      console.error(err);
      message.error(err.message ?? 'Terjadi kesalahan saat mengambil data anggaran.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, mapResponse, message, debouncedSearchTerm]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  // Combine database budgets with draft staging changes for live workspace preview
  const mergedBudgets = useMemo(() => {
    const map = {};

    budgets.forEach((b) => {
      map[b.mak] = { ...b };
    });

    Object.keys(draftEdited).forEach((mak) => {
      if (map[mak]) {
        map[mak] = { ...map[mak], ...draftEdited[mak], isDraftEdit: true };
      } else {
        map[mak] = { mak, ...draftEdited[mak], isDraftEdit: true };
      }
    });

    Object.keys(draftAdded).forEach((mak) => {
      map[mak] = { mak, ...draftAdded[mak], isDraftAdd: true };
    });

    draftDeleted.forEach((mak) => {
      if (map[mak]) {
        map[mak].isDraftDelete = true;
      }
    });

    return Object.values(map);
  }, [budgets, draftAdded, draftEdited, draftDeleted]);

  // Count total draft changes
  const totalDraftCount = useMemo(() => {
    return Object.keys(draftAdded).length + Object.keys(draftEdited).length + draftDeleted.size;
  }, [draftAdded, draftEdited, draftDeleted]);

  // Total Pagu System Calculation
  const totalPaguSystem = useMemo(() => {
    return mergedBudgets.reduce((acc, curr) => {
      if (curr.isDraftDelete) return acc;
      if (!curr.mak.includes('.')) {
        return acc + (curr.anggaran || 0);
      }
      return acc;
    }, 0);
  }, [mergedBudgets]);

  // Reset all local draft changes
  const handleResetDrafts = () => {
    modal.confirm({
      title: 'Batalkan Seluruh Draft Perubahan?',
      content: 'Tindakan ini akan membatalkan seluruh penambahan, pengeditan, dan penghapusan sementara.',
      centered: true,
      okText: 'Ya, Reset Draft',
      okButtonProps: { danger: true },
      cancelText: 'Batal',
      onOk: () => {
        setDraftAdded({});
        setDraftEdited({});
        setDraftDeleted(new Set());
        message.info('Seluruh draft perubahan telah dibatalkan.');
      },
    });
  };

  // Batch Commit (Save All Draft Changes to Backend Database)
  const handleSaveAllDrafts = async () => {
    if (totalDraftCount === 0) {
      message.info('Belum ada perubahan draft untuk disimpan.');
      return;
    }

    setSubmitting(true);
    try {
      for (const makToDelete of draftDeleted) {
        const matchingBudgets = budgets.filter((b) => b.mak === makToDelete || b.mak.startsWith(makToDelete + '.'));
        for (const item of matchingBudgets) {
          if (item.id) {
            await apiFetch(`/budgets/${item.id}`, { method: 'DELETE' });
          }
        }
      }

      for (const mak of Object.keys(draftEdited)) {
        const editData = draftEdited[mak];
        const existingRec = budgets.find((b) => b.mak === mak);
        const payload = {
          mak: editData.mak,
          deskripsi: editData.deskripsi || `Alokasi Segmen ${editData.mak}`,
          anggaran: Number(editData.anggaran ?? 0),
          catatan: 'Revisi Pagu/Deskripsi via Batch Commit Manage Anggaran',
        };

        if (existingRec && existingRec.id) {
          await apiFetch(`/budgets/${existingRec.id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          });
        } else {
          await apiFetch('/budgets', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
        }
      }

      for (const mak of Object.keys(draftAdded)) {
        const addData = draftAdded[mak];
        const payload = {
          mak: addData.mak,
          deskripsi: addData.deskripsi || `Alokasi Segmen ${addData.mak}`,
          anggaran: Number(addData.anggaran ?? 0),
          catatan: 'Dibuat via Batch Commit Manage Anggaran',
        };

        await apiFetch('/budgets', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      notification.success({
        message: 'Perubahan Tersimpan',
        description: `Seluruh ${totalDraftCount} perubahan hierarki anggaran berhasil disimpan ke database.`,
        placement: 'bottomRight',
      });

      setDraftAdded({});
      setDraftEdited({});
      setDraftDeleted(new Set());
      await fetchBudgets();
    } catch (err) {
      console.error(err);
      message.error(err.message ?? 'Terjadi kesalahan saat menyimpan seluruh perubahan.');
    } finally {
      setSubmitting(false);
    }
  };

  // Map mergedBudgets into 6-Level Hierarchical Tree Structure with Draft Badges
  const hierarchyTree = useMemo(() => {
    const budgetMap = {};
    mergedBudgets.forEach((b) => {
      budgetMap[b.mak] = b;
    });

    const progMap = {};

    mergedBudgets.forEach((item) => {
      const segs = item.segments || parseMakSegments(item.mak);
      const progCode = segs.program || 'UNASSIGNED';
      const kroCode = segs.kro;
      const roCode = segs.ro;
      const kompCode = segs.komponen;
      const subKompCode = segs.subkomponen;
      const akunCode = segs.akun;

      // 1. Program Node
      if (!progMap[progCode]) {
        const progMak = progCode;
        const selfProgRecord = budgetMap[progMak];
        progMap[progCode] = {
          level: 'program',
          code: progCode,
          fullPrefix: progCode,
          title: selfProgRecord?.deskripsi || `Program ${progCode}`,
          anggaran: selfProgRecord?.anggaran || 0,
          record: selfProgRecord,
          isDraftAdd: selfProgRecord?.isDraftAdd,
          isDraftEdit: selfProgRecord?.isDraftEdit,
          isDraftDelete: selfProgRecord?.isDraftDelete,
          kroMap: {},
        };
      } else if (!progMap[progCode].record && item?.mak === progCode) {
        progMap[progCode].record = item;
        progMap[progCode].title = item?.deskripsi || `Program ${progCode}`;
        progMap[progCode].anggaran = item?.anggaran || 0;
        progMap[progCode].isDraftAdd = item?.isDraftAdd;
        progMap[progCode].isDraftEdit = item?.isDraftEdit;
        progMap[progCode].isDraftDelete = item?.isDraftDelete;
      }

      if (!kroCode) return;

      // 2. KRO Node
      const kroMap = progMap[progCode].kroMap;
      const kroPrefix = `${progCode}.${kroCode}`;
      if (!kroMap[kroCode]) {
        const selfKroRecord = budgetMap[kroPrefix];
        kroMap[kroCode] = {
          level: 'kro',
          code: kroCode,
          fullPrefix: kroPrefix,
          title: selfKroRecord?.deskripsi || `KRO ${kroCode}`,
          anggaran: selfKroRecord?.anggaran || 0,
          record: selfKroRecord,
          isDraftAdd: selfKroRecord?.isDraftAdd,
          isDraftEdit: selfKroRecord?.isDraftEdit,
          isDraftDelete: selfKroRecord?.isDraftDelete,
          roMap: {},
        };
      } else if (!kroMap[kroCode].record && item?.mak === kroPrefix) {
        kroMap[kroCode].record = item;
        kroMap[kroCode].title = item?.deskripsi || `KRO ${kroCode}`;
        kroMap[kroCode].anggaran = item?.anggaran || 0;
        kroMap[kroCode].isDraftAdd = item?.isDraftAdd;
        kroMap[kroCode].isDraftEdit = item?.isDraftEdit;
        kroMap[kroCode].isDraftDelete = item?.isDraftDelete;
      }

      if (!roCode) return;

      // 3. RO Node
      const roMap = kroMap[kroCode].roMap;
      const roPrefix = `${kroPrefix}.${roCode}`;
      if (!roMap[roCode]) {
        const selfRoRecord = budgetMap[roPrefix];
        roMap[roCode] = {
          level: 'ro',
          code: roCode,
          fullPrefix: roPrefix,
          title: selfRoRecord?.deskripsi || `RO ${roCode}`,
          anggaran: selfRoRecord?.anggaran || 0,
          record: selfRoRecord,
          isDraftAdd: selfRoRecord?.isDraftAdd,
          isDraftEdit: selfRoRecord?.isDraftEdit,
          isDraftDelete: selfRoRecord?.isDraftDelete,
          kompMap: {},
        };
      } else if (!roMap[roCode].record && item?.mak === roPrefix) {
        roMap[roCode].record = item;
        roMap[roCode].title = item?.deskripsi || `RO ${roCode}`;
        roMap[roCode].anggaran = item?.anggaran || 0;
        roMap[roCode].isDraftAdd = item?.isDraftAdd;
        roMap[roCode].isDraftEdit = item?.isDraftEdit;
        roMap[roCode].isDraftDelete = item?.isDraftDelete;
      }

      if (!kompCode) return;

      // 4. Komponen Node
      const kompMap = roMap[roCode].kompMap;
      const kompPrefix = `${roPrefix}.${kompCode}`;
      if (!kompMap[kompCode]) {
        const selfKompRecord = budgetMap[kompPrefix];
        kompMap[kompCode] = {
          level: 'komponen',
          code: kompCode,
          fullPrefix: kompPrefix,
          title: selfKompRecord?.deskripsi || `Komponen ${kompCode}`,
          anggaran: selfKompRecord?.anggaran || 0,
          record: selfKompRecord,
          isDraftAdd: selfKompRecord?.isDraftAdd,
          isDraftEdit: selfKompRecord?.isDraftEdit,
          isDraftDelete: selfKompRecord?.isDraftDelete,
          subKompMap: {},
        };
      } else if (!kompMap[kompCode].record && item?.mak === kompPrefix) {
        kompMap[kompCode].record = item;
        kompMap[kompCode].title = item?.deskripsi || `Komponen ${kompCode}`;
        kompMap[kompCode].anggaran = item?.anggaran || 0;
        kompMap[kompCode].isDraftAdd = item?.isDraftAdd;
        kompMap[kompCode].isDraftEdit = item?.isDraftEdit;
        kompMap[kompCode].isDraftDelete = item?.isDraftDelete;
      }

      if (!subKompCode) return;

      // 5. Subkomponen Node
      const subKompMap = kompMap[kompCode].subKompMap;
      const subKompPrefix = `${kompPrefix}.${subKompCode}`;
      if (!subKompMap[subKompCode]) {
        const selfSubKompRecord = budgetMap[subKompPrefix];
        subKompMap[subKompCode] = {
          level: 'subkomponen',
          code: subKompCode,
          fullPrefix: subKompPrefix,
          title: selfSubKompRecord?.deskripsi || `Subkomponen ${subKompCode}`,
          anggaran: selfSubKompRecord?.anggaran || 0,
          record: selfSubKompRecord,
          isDraftAdd: selfSubKompRecord?.isDraftAdd,
          isDraftEdit: selfSubKompRecord?.isDraftEdit,
          isDraftDelete: selfSubKompRecord?.isDraftDelete,
          akunItems: [],
        };
      } else if (!subKompMap[subKompCode].record && item?.mak === subKompPrefix) {
        subKompMap[subKompCode].record = item;
        subKompMap[subKompCode].title = item?.deskripsi || `Subkomponen ${subKompPrefix}`;
        subKompMap[subKompCode].anggaran = item?.anggaran || 0;
        subKompMap[subKompCode].isDraftAdd = item?.isDraftAdd;
        subKompMap[subKompCode].isDraftEdit = item?.isDraftEdit;
        subKompMap[subKompCode].isDraftDelete = item?.isDraftDelete;
      }

      if (!akunCode) return;

      // 6. Akun BAS Node
      const akunPrefix = `${subKompPrefix}.${akunCode}`;
      if (item?.mak === akunPrefix) {
        subKompMap[subKompCode].akunItems.push({
          level: 'akun',
          code: akunCode,
          fullPrefix: akunPrefix,
          title: item?.deskripsi || `Akun ${akunCode}`,
          anggaran: item?.anggaran || 0,
          record: item,
          isDraftAdd: item?.isDraftAdd,
          isDraftEdit: item?.isDraftEdit,
          isDraftDelete: item?.isDraftDelete,
        });
      }
    });

    return Object.values(progMap).map((p) => {
      const kros = Object.values(p.kroMap).map((k) => {
        const ros = Object.values(k.roMap).map((r) => {
          const komponens = Object.values(r.kompMap).map((km) => {
            const subkomponens = Object.values(km.subKompMap).map((sk) => {
              const usedAkunSum = sk.akunItems
                .filter((a) => !a.isDraftDelete)
                .reduce((acc, a) => acc + (a.anggaran || 0), 0);
              return {
                ...sk,
                usedAnggaran: usedAkunSum,
                remainingAnggaran: (sk.anggaran || 0) - usedAkunSum,
              };
            });
            const usedSubKompSum = subkomponens
              .filter((sk) => !sk.isDraftDelete)
              .reduce((acc, sk) => acc + (sk.anggaran || 0), 0);
            return {
              ...km,
              subkomponens,
              usedAnggaran: usedSubKompSum,
              remainingAnggaran: (km.anggaran || 0) - usedSubKompSum,
            };
          });
          const usedKompSum = komponens
            .filter((km) => !km.isDraftDelete)
            .reduce((acc, km) => acc + (km.anggaran || 0), 0);
          return {
            ...r,
            komponens,
            usedAnggaran: usedKompSum,
            remainingAnggaran: (r.anggaran || 0) - usedKompSum,
          };
        });
        const usedRoSum = ros
          .filter((r) => !r.isDraftDelete)
          .reduce((acc, r) => acc + (r.anggaran || 0), 0);
        return {
          ...k,
          ros,
          usedAnggaran: usedRoSum,
          remainingAnggaran: (k.anggaran || 0) - usedRoSum,
        };
      });
      const usedKroSum = kros
        .filter((k) => !k.isDraftDelete)
        .reduce((acc, k) => acc + (k.anggaran || 0), 0);
      return {
        ...p,
        kros,
        usedAnggaran: usedKroSum,
        remainingAnggaran: (p.anggaran || 0) - usedKroSum,
      };
    });
  }, [mergedBudgets]);

  const handleOpenAddSegment = (targetLevel, parentPrefix, parentData) => {
    if (!isValidator && currentRole !== 'admin') {
      message.warning('Hanya validator yang dapat menambah segmen anggaran.');
      return;
    }

    const parentAnggaran = parentData ? (parentData.anggaran || 0) : totalPaguSystem;
    const parentUsed = parentData ? (parentData.usedAnggaran || 0) : 0;

    setAddSegmentTarget({
      mode: 'create',
      targetLevel,
      parentPrefix,
      nodeFullPrefix: '',
      parentAnggaran,
      parentUsedAnggaran: parentUsed,
      editRecord: null,
    });

    setInputAnggaranVal(0);
    segmentForm.resetFields();
    setOpenSegmentAddModal(true);
  };

  const handleOpenEditSegment = (node) => {
    if (!isValidator && currentRole !== 'admin') {
      message.warning('Hanya validator yang dapat mengedit segmen anggaran.');
      return;
    }

    const record = node.record || budgets.find((b) => b.mak === node.fullPrefix);

    let computedParentPrefix = '';
    if (node.fullPrefix && node.fullPrefix.includes('.')) {
      const parts = node.fullPrefix.split('.');
      parts.pop();
      computedParentPrefix = parts.join('.');
    }

    setAddSegmentTarget({
      mode: 'edit',
      targetLevel: node.level,
      parentPrefix: computedParentPrefix,
      nodeFullPrefix: node.fullPrefix,
      parentAnggaran: node.anggaran || 0,
      parentUsedAnggaran: node.usedAnggaran || 0,
      editRecord: record || null,
    });

    const segs = parseMakSegments(node.fullPrefix);
    const nodeCode = segs[node.level] || node.code;

    setInputAnggaranVal(node.anggaran || 0);
    segmentForm.setFieldsValue({
      code: nodeCode,
      deskripsi: node.title || record?.deskripsi || '',
      anggaran: node.anggaran || 0,
    });

    setOpenSegmentAddModal(true);
  };

  const handleDeleteSegmentLevel = (levelName, prefixCode) => {
    if (!isValidator && currentRole !== 'admin') {
      message.warning('Hanya validator yang dapat menghapus segmen anggaran.');
      return;
    }

    modal.confirm({
      title: `Tandai Hapus ${levelName.toUpperCase()} "${prefixCode}"?`,
      content: `Tindakan ini akan menandai segmen ${prefixCode} untuk dihapus dari database saat Anda menekan tombol Simpan.`,
      centered: true,
      okText: 'Tandai Hapus',
      okButtonProps: { danger: true },
      cancelText: 'Batal',
      onOk: () => {
        setDraftDeleted((prev) => {
          const next = new Set(prev);
          next.add(prefixCode);
          return next;
        });
        message.success(`Segmen ${prefixCode} ditandai Draft Hapus. Klik tombol Simpan di kanan atas untuk memproses.`);
      },
    });
  };

  const handleSaveSegment = async () => {
    try {
      const values = await segmentForm.validateFields();
      const { mode, targetLevel, parentPrefix } = addSegmentTarget;

      let newMak = '';
      if (targetLevel === 'program' || !parentPrefix) {
        newMak = values.code.trim();
      } else {
        newMak = `${parentPrefix}.${values.code.trim()}`;
      }

      const segmentObj = {
        mak: newMak,
        deskripsi: values.deskripsi || `Alokasi Segmen ${values.code}`,
        anggaran: Number(values.anggaran ?? 0),
      };

      if (mode === 'edit') {
        setDraftEdited((prev) => ({
          ...prev,
          [newMak]: segmentObj,
        }));
        message.success(`Segmen ${newMak} ditandai Draft Edit. Klik Simpan untuk memperbarui database.`);
      } else {
        setDraftAdded((prev) => ({
          ...prev,
          [newMak]: segmentObj,
        }));
        message.success(`Segmen ${newMak} ditandai Draft Tambah. Klik Simpan untuk menyimpan ke database.`);
      }

      setOpenSegmentAddModal(false);
    } catch (err) {
      if (err.errorFields) {
        modal.warning({
          title: 'Data belum lengkap',
          content: 'Pastikan kode segmen dan pagu anggaran telah diisi dengan benar.',
        });
      }
    }
  };

  const handleDeleteBudget = (budget) => {
    if (!isValidator && currentRole !== 'admin') {
      message.warning('Hanya validator yang dapat menghapus data anggaran.');
      return;
    }

    setDraftDeleted((prev) => {
      const next = new Set(prev);
      next.add(budget.mak);
      return next;
    });
    message.success(`Akun ${budget.mak} ditandai Draft Hapus. Klik Simpan untuk memproses.`);
  };

  const handleHistory = (budget) => {
    const latestBudget = budgets.find((item) => item.id === budget.id) ?? budget;
    setSelectedBudget(latestBudget);
    setOpenHistory(true);
  };

  const rawColumns = useMemo(() => {
    const base = [
      {
        title: 'Kode Akun (Hierarki 6 Segmen)',
        dataIndex: 'mak',
        key: 'mak',
        width: colWidths.mak,
        sorter: (a, b) => a.mak.localeCompare(b.mak),
        render: (value, record) => <SegmentedMakPills mak={value} segments={record.segments} />,
      },
      {
        title: 'Deskripsi Uraian Anggaran',
        dataIndex: 'deskripsi',
        key: 'deskripsi',
        width: colWidths.deskripsi,
        ellipsis: true,
        sorter: (a, b) => (a.deskripsi || '').localeCompare(b.deskripsi || ''),
        render: (value) => <span style={{ fontSize: '12px', color: '#1e293b' }}>{value || '-'}</span>,
      },
      {
        title: 'Pagu Anggaran',
        dataIndex: 'anggaran',
        key: 'anggaran',
        align: 'right',
        width: colWidths.anggaran,
        sorter: (a, b) => a.anggaran - b.anggaran,
        render: (value) => (
          <Text strong style={{ color: '#0F5B99', fontSize: '12px', whiteSpace: 'nowrap' }}>
            {formatCurrency(value)}
          </Text>
        ),
      },
    ];

    if (isValidator || currentRole === 'admin' || isOperator) {
      base.push({
        title: 'Aksi',
        key: 'aksi',
        width: colWidths.aksi,
        align: 'center',
        render: (_, record) => {
          const items = [];

          if (isValidator || currentRole === 'admin') {
            items.push({
              key: 'delete',
              label: <span style={{ fontSize: '12px' }}>Hapus</span>,
              danger: true,
              icon: <DeleteOutlined style={{ fontSize: 13 }} />,
              onClick: () => handleDeleteBudget(record),
            });
          }

          items.push({
            key: 'history',
            label: <span style={{ fontSize: '12px' }}>Riwayat Revisi</span>,
            icon: <HistoryOutlined style={{ color: '#1890ff', fontSize: 13 }} />,
            onClick: () => handleHistory(record),
          });

          return (
            <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
              <Button type="text" size="small" icon={<MoreOutlined style={{ fontSize: 16 }} />} />
            </Dropdown>
          );
        },
      });
    }

    return base;
  }, [colWidths, isValidator, isOperator, currentRole]);

  const columns = useMemo(() => {
    return rawColumns.map((col) => ({
      ...col,
      onHeaderCell: (column) => ({
        width: colWidths[column.key] || column.width,
        onResize: (newWidth) => {
          setColWidths((prev) => ({
            ...prev,
            [column.key]: newWidth,
          }));
        },
      }),
    }));
  }, [rawColumns, colWidths]);

  const historyContent = useMemo(() => {
    if (!selectedBudget?.history?.length) {
      return <Tag color="default">Belum ada riwayat revisi</Tag>;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
        {selectedBudget.history.map((item) => (
          <Card key={item.key} size="small" style={{ background: '#f8fafc', borderColor: '#e2e8f0', borderRadius: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text strong style={{ fontSize: '12px' }}>
                {dayjs(item.tanggal).format('DD MMM YYYY, HH:mm')}
              </Text>
              <Tag color="green" style={{ fontSize: '10.5px' }}>{item.status || 'Disetujui'}</Tag>
            </div>
            <Paragraph style={{ margin: 0, fontSize: '12px', color: '#0F5B99', fontWeight: 600 }}>
              Alokasi: {formatCurrency(item.anggaran ?? item.perubahan)}
            </Paragraph>
            {item.keterangan && (
              <Paragraph style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b' }}>
                {item.keterangan}
              </Paragraph>
            )}
          </Card>
        ))}
      </div>
    );
  }, [selectedBudget]);

  const parentRemainingCalculated = useMemo(() => {
    if (!addSegmentTarget.parentAnggaran) return Infinity;
    return addSegmentTarget.parentAnggaran - addSegmentTarget.parentUsedAnggaran;
  }, [addSegmentTarget]);

  const isOverCapacity = useMemo(() => {
    if (addSegmentTarget.mode === 'edit') return false;
    if (!addSegmentTarget.parentPrefix) return false;
    return inputAnggaranVal > parentRemainingCalculated;
  }, [inputAnggaranVal, parentRemainingCalculated, addSegmentTarget]);

  // Helper render draft badge (Tulisan Berwarna Saja, Tanpa Icon)
  const renderDraftBadge = (node) => {
    if (node.isDraftDelete) {
      return <span style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', textDecoration: 'line-through' }}>(Draft Hapus)</span>;
    }
    if (node.isDraftAdd) {
      return <span style={{ fontSize: '11px', fontWeight: 700, color: '#10b981' }}>(Draft Tambah)</span>;
    }
    if (node.isDraftEdit) {
      return <span style={{ fontSize: '11px', fontWeight: 700, color: '#d97706' }}>(Draft Edit)</span>;
    }
    return null;
  };

  // Helper render label level corporate (Teks Bold Corporate, Tanpa Background)
  const renderCorporateLevelHeader = (levelName, code, title, isDelete) => (
    <Space size="xs" style={{ marginLeft: 3 }}>
      <Text strong style={{ fontSize: '13px', color: isDelete ? '#94a3b8' : '#0f172a', fontWeight: 700 }}>
        {levelName} {code}
      </Text>
      {title && (
        <Text style={{ fontSize: '12.5px', color: isDelete ? '#cbd5e1' : '#475569', fontWeight: 500 }}>
          - {title}
        </Text>
      )}
    </Space>
  );

  // ════════════════════════════════════════════════════════════════════════
  // RENDER FULL-PAGE LAYAR MANAGE ANGGARAN INTERAKTIF WORKSPACE
  // ════════════════════════════════════════════════════════════════════════
  if (viewState === 'manage') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.25s ease-out' }}>
        {/* Full-Page Top Header Workspace Bar */}
        <Card size="small" style={{ background: '#ffffff', borderRadius: 10, borderColor: '#e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <Space size="middle">
              <Button
                type="default"
                size="small"
                icon={<ArrowLeftOutlined />}
                onClick={() => setViewState('planning')}
                style={{ fontSize: '12px', height: '32px', borderRadius: 6, fontWeight: 600 }}
              >
                Kembali ke Perencanaan
              </Button>
              <Divider type="vertical" style={{ height: 24, margin: '0 4px' }} />
              <div>
                <Title level={4} style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F5B99', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <SettingOutlined /> Pengelola Struktur Hierarki APBN (Manage Anggaran)
                </Title>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Kelola struktur 6 Level (Program ➔ KRO ➔ RO ➔ Komponen ➔ Subkomponen ➔ Akun BAS)
                </Text>
              </div>
            </Space>

            {/* Action Bar Right: Save & Cancel Buttons */}
            <Space size="small">
              {totalDraftCount > 0 && (
                <Button
                  type="default"
                  size="small"
                  icon={<UndoOutlined />}
                  onClick={handleResetDrafts}
                  style={{ fontSize: '12px', height: '32px' }}
                >
                  Batal
                </Button>
              )}

              {/* Main Save Button strictly named "Simpan" */}
              <Button
                type="primary"
                size="small"
                icon={<SaveOutlined />}
                onClick={handleSaveAllDrafts}
                loading={submitting}
                style={{
                  fontSize: '13px',
                  height: '32px',
                  background: totalDraftCount > 0 ? '#10b981' : '#0F5B99',
                  borderColor: totalDraftCount > 0 ? '#10b981' : '#0F5B99',
                  fontWeight: 700,
                  boxShadow: totalDraftCount > 0 ? '0 0 10px rgba(16, 185, 129, 0.4)' : 'none',
                }}
              >
                {totalDraftCount > 0 ? `Simpan (${totalDraftCount})` : 'Simpan'}
              </Button>
            </Space>
          </div>
        </Card>

        {/* Draft Change Notice Strip */}
        {totalDraftCount > 0 && (
          <Alert
            type="info"
            showIcon
            message={<Text strong style={{ fontSize: '12.5px', color: '#1e40af' }}>Terdapat {totalDraftCount} perubahan draft yang belum tersimpan ke database.</Text>}
            description={<span style={{ fontSize: '11.5px' }}>Tinjau penanda draft (Draft Tambah, Draft Edit, Draft Hapus), lalu klik tombol <strong>Simpan</strong> di sudut kanan atas untuk menyimpan permanen.</span>}
            style={{ borderRadius: 8, background: '#eff6ff', borderColor: '#bfdbfe' }}
          />
        )}

        {/* Corporate Summary Cards Strip */}
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={8}>
            <Card size="small" style={{ background: '#f8fafc', borderRadius: 8, borderColor: '#cbd5e1' }}>
              <Text type="secondary" style={{ fontSize: '11.5px' }}>Total Program Terdaftar</Text>
              <Title level={4} style={{ margin: 0, fontSize: '16px', color: '#2563eb', fontWeight: 700, marginTop: 2 }}>
                {hierarchyTree.length} Program Kegiatan
              </Title>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" style={{ background: '#f8fafc', borderRadius: 8, borderColor: '#cbd5e1' }}>
              <Text type="secondary" style={{ fontSize: '11.5px' }}>Total Alokasi Rincian Akun</Text>
              <Title level={4} style={{ margin: 0, fontSize: '16px', color: '#059669', fontWeight: 700, marginTop: 2 }}>
                {mergedBudgets.length} Item Segmen
              </Title>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" style={{ background: '#eff6ff', borderRadius: 8, borderColor: '#bfdbfe' }}>
              <Text type="secondary" style={{ fontSize: '11.5px', color: '#1e40af' }}>Total Pagu Program System</Text>
              <Title level={4} style={{ margin: 0, fontSize: '16px', color: '#0F5B99', fontWeight: 700, marginTop: 2 }}>
                {formatCurrency(totalPaguSystem)}
              </Title>
            </Card>
          </Col>
        </Row>

        {/* Main Full-Page Interactive Drill-Down Tree Card Workspace */}
        <Card
          size="small"
          style={{ background: '#ffffff', borderRadius: 10, borderColor: '#e2e8f0', minHeight: '65vh' }}
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong style={{ fontSize: '13px', color: '#334155' }}>
                <NodeIndexOutlined style={{ color: '#0F5B99', marginRight: 6 }} />
                Pohon Hierarki APBN Drill-Down Interaktif
              </Text>
              {(isValidator || currentRole === 'admin') && (
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => handleOpenAddSegment('program', '', null)}
                  style={{ fontSize: '12px', background: '#0F5B99' }}
                >
                  + Program Baru
                </Button>
              )}
            </div>
          }
        >
          {hierarchyTree.length === 0 ? (
            <Empty description={<Text style={{ fontSize: '12px' }}>Belum ada struktur hierarki anggaran APBN.</Text>} style={{ margin: '60px 0' }} />
          ) : (
            <Collapse accordion size="small" style={{ background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              {hierarchyTree.map((prog) => (
                <Collapse.Panel
                  key={prog.code}
                  header={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '4px 0', opacity: prog.isDraftDelete ? 0.5 : 1, textDecoration: prog.isDraftDelete ? 'line-through' : 'none' }}>
                      <Space size="xs">
                        <FolderOutlined style={{ color: '#2563eb', fontSize: 16 }} />
                        {renderCorporateLevelHeader('Program', prog.code, prog.title, prog.isDraftDelete)}
                        {renderDraftBadge(prog)}
                      </Space>
                      <Space size="small" onClick={(e) => e.stopPropagation()}>
                        <div style={{ textAlign: 'right', marginRight: 8 }}>
                          <Text strong style={{ color: '#2563eb', fontSize: '13px', display: 'block' }}>
                            Pagu: {formatCurrency(prog.anggaran)}
                          </Text>
                          <Text type="secondary" style={{ fontSize: '10.5px' }}>
                            Sisa Rumah: <span style={{ color: prog.remainingAnggaran < 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>{formatCurrency(prog.remainingAnggaran)}</span>
                          </Text>
                        </div>
                        {(isValidator || currentRole === 'admin') && !prog.isDraftDelete && (
                          <>
                            <Button
                              type="dashed"
                              size="small"
                              icon={<PlusOutlined />}
                              onClick={() => handleOpenAddSegment('kro', prog.fullPrefix, prog)}
                              style={{ fontSize: '11.5px', height: '26px' }}
                            >
                              + KRO
                            </Button>
                            <Button
                              type="text"
                              size="small"
                              icon={<EditOutlined style={{ color: '#faad14' }} />}
                              onClick={() => handleOpenEditSegment(prog)}
                            />
                            <Button
                              type="text"
                              danger
                              size="small"
                              icon={<DeleteOutlined />}
                              onClick={() => handleDeleteSegmentLevel('Program', prog.fullPrefix)}
                            />
                          </>
                        )}
                      </Space>
                    </div>
                  }
                >
                  {/* LEVEL 2: KRO List */}
                  <div style={{ paddingLeft: 14, borderLeft: '3px solid #3b82f6', marginTop: 4 }}>
                    {prog.kros.length === 0 ? (
                      <Text type="secondary" style={{ fontSize: '11.5px', fontStyle: 'italic', display: 'block', padding: '6px 0' }}>
                        Belum ada KRO di bawah Program {prog.code}. Klik "+ KRO" untuk menambah.
                      </Text>
                    ) : (
                      prog.kros.map((kro) => (
                        <Collapse accordion key={kro.code} size="small" style={{ marginBottom: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                          <Collapse.Panel
                            header={
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '2px 0', opacity: kro.isDraftDelete ? 0.5 : 1, textDecoration: kro.isDraftDelete ? 'line-through' : 'none' }}>
                                <Space size="xs">
                                  <FolderOpenOutlined style={{ color: '#059669', fontSize: 15 }} />
                                  {renderCorporateLevelHeader('KRO', kro.code, kro.title, kro.isDraftDelete)}
                                  {renderDraftBadge(kro)}
                                </Space>
                                <Space size="small" onClick={(e) => e.stopPropagation()}>
                                  <div style={{ textAlign: 'right', marginRight: 8 }}>
                                    <Text style={{ color: '#059669', fontSize: '12.5px', fontWeight: 600, display: 'block' }}>
                                      Pagu KRO: {formatCurrency(kro.anggaran)}
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: '10.5px' }}>
                                      Sisa: <span style={{ color: kro.remainingAnggaran < 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>{formatCurrency(kro.remainingAnggaran)}</span>
                                    </Text>
                                  </div>
                                  {(isValidator || currentRole === 'admin') && !kro.isDraftDelete && (
                                    <>
                                      <Button
                                        type="dashed"
                                        size="small"
                                        icon={<PlusOutlined />}
                                        onClick={() => handleOpenAddSegment('ro', kro.fullPrefix, kro)}
                                        style={{ fontSize: '11px', height: '24px' }}
                                      >
                                        + RO
                                      </Button>
                                      <Button
                                        type="text"
                                        size="small"
                                        icon={<EditOutlined style={{ color: '#faad14' }} />}
                                        onClick={() => handleOpenEditSegment(kro)}
                                      />
                                      <Button
                                        type="text"
                                        danger
                                        size="small"
                                        icon={<DeleteOutlined />}
                                        onClick={() => handleDeleteSegmentLevel('KRO', kro.fullPrefix)}
                                      />
                                    </>
                                  )}
                                </Space>
                              </div>
                            }
                          >
                            {/* LEVEL 3: RO List */}
                            <div style={{ paddingLeft: 14, borderLeft: '3px solid #10b981', marginTop: 4 }}>
                              {kro.ros.length === 0 ? (
                                <Text type="secondary" style={{ fontSize: '11.5px', fontStyle: 'italic', display: 'block', padding: '6px 0' }}>
                                  Belum ada RO di bawah KRO {kro.code}. Klik "+ RO" untuk menambah.
                                </Text>
                              ) : (
                                kro.ros.map((ro) => (
                                  <Collapse accordion key={ro.code} size="small" style={{ marginBottom: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                                    <Collapse.Panel
                                      header={
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '2px 0', opacity: ro.isDraftDelete ? 0.5 : 1, textDecoration: ro.isDraftDelete ? 'line-through' : 'none' }}>
                                          <Space size="xs">
                                            <FolderOpenOutlined style={{ color: '#7c3aed', fontSize: 14 }} />
                                            {renderCorporateLevelHeader('RO', ro.code, ro.title, ro.isDraftDelete)}
                                            {renderDraftBadge(ro)}
                                          </Space>
                                          <Space size="small" onClick={(e) => e.stopPropagation()}>
                                            <div style={{ textAlign: 'right', marginRight: 8 }}>
                                              <Text style={{ color: '#7c3aed', fontSize: '12px', fontWeight: 600, display: 'block' }}>
                                                Pagu RO: {formatCurrency(ro.anggaran)}
                                              </Text>
                                              <Text type="secondary" style={{ fontSize: '10.5px' }}>
                                                Sisa: <span style={{ color: ro.remainingAnggaran < 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>{formatCurrency(ro.remainingAnggaran)}</span>
                                              </Text>
                                            </div>
                                            {(isValidator || currentRole === 'admin') && !ro.isDraftDelete && (
                                              <>
                                                <Button
                                                  type="dashed"
                                                  size="small"
                                                  icon={<PlusOutlined />}
                                                  onClick={() => handleOpenAddSegment('komponen', ro.fullPrefix, ro)}
                                                  style={{ fontSize: '11px', height: '24px' }}
                                                >
                                                  + Komponen
                                                </Button>
                                                <Button
                                                  type="text"
                                                  size="small"
                                                  icon={<EditOutlined style={{ color: '#faad14' }} />}
                                                  onClick={() => handleOpenEditSegment(ro)}
                                                />
                                                <Button
                                                  type="text"
                                                  danger
                                                  size="small"
                                                  icon={<DeleteOutlined />}
                                                  onClick={() => handleDeleteSegmentLevel('RO', ro.fullPrefix)}
                                                />
                                              </>
                                            )}
                                          </Space>
                                        </div>
                                      }
                                    >
                                      {/* LEVEL 4: Komponen List */}
                                      <div style={{ paddingLeft: 14, borderLeft: '3px solid #8b5cf6', marginTop: 4 }}>
                                        {ro.komponens.length === 0 ? (
                                          <Text type="secondary" style={{ fontSize: '11.5px', fontStyle: 'italic', display: 'block', padding: '6px 0' }}>
                                            Belum ada Komponen di bawah RO {ro.code}. Klik "+ Komponen" untuk menambah.
                                          </Text>
                                        ) : (
                                          ro.komponens.map((km) => (
                                            <Collapse accordion key={km.code} size="small" style={{ marginBottom: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                                              <Collapse.Panel
                                                header={
                                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '2px 0', opacity: km.isDraftDelete ? 0.5 : 1, textDecoration: km.isDraftDelete ? 'line-through' : 'none' }}>
                                                    <Space size="xs">
                                                      <FolderOpenOutlined style={{ color: '#0891b2', fontSize: 14 }} />
                                                      {renderCorporateLevelHeader('Komp', km.code, km.title, km.isDraftDelete)}
                                                      {renderDraftBadge(km)}
                                                    </Space>
                                                    <Space size="small" onClick={(e) => e.stopPropagation()}>
                                                      <div style={{ textAlign: 'right', marginRight: 8 }}>
                                                        <Text style={{ fontSize: '12px', fontWeight: 600, display: 'block' }}>
                                                          Pagu Komp: {formatCurrency(km.anggaran)}
                                                        </Text>
                                                        <Text type="secondary" style={{ fontSize: '10.5px' }}>
                                                          Sisa: <span style={{ color: km.remainingAnggaran < 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>{formatCurrency(km.remainingAnggaran)}</span>
                                                        </Text>
                                                      </div>
                                                      {(isValidator || currentRole === 'admin') && !km.isDraftDelete && (
                                                        <>
                                                          <Button
                                                            type="dashed"
                                                            size="small"
                                                            icon={<PlusOutlined />}
                                                            onClick={() => handleOpenAddSegment('subkomponen', km.fullPrefix, km)}
                                                            style={{ fontSize: '11px', height: '24px' }}
                                                          >
                                                            + Subkomp
                                                          </Button>
                                                          <Button
                                                            type="text"
                                                            size="small"
                                                            icon={<EditOutlined style={{ color: '#faad14' }} />}
                                                            onClick={() => handleOpenEditSegment(km)}
                                                          />
                                                          <Button
                                                            type="text"
                                                            danger
                                                            size="small"
                                                            icon={<DeleteOutlined />}
                                                            onClick={() => handleDeleteSegmentLevel('Komponen', km.fullPrefix)}
                                                          />
                                                        </>
                                                      )}
                                                    </Space>
                                                  </div>
                                                }
                                              >
                                                {/* LEVEL 5: Subkomponen List */}
                                                <div style={{ paddingLeft: 14, borderLeft: '3px solid #f59e0b', marginTop: 4 }}>
                                                  {km.subkomponens.length === 0 ? (
                                                    <Text type="secondary" style={{ fontSize: '11.5px', fontStyle: 'italic', display: 'block', padding: '6px 0' }}>
                                                      Belum ada Subkomponen di bawah Komponen {km.code}. Klik "+ Subkomp" untuk menambah.
                                                    </Text>
                                                  ) : (
                                                    km.subkomponens.map((sk) => (
                                                      <div
                                                        key={sk.code}
                                                        style={{
                                                          background: '#fffbeb',
                                                          border: '1px solid #fef3c7',
                                                          borderRadius: 6,
                                                          padding: '10px 12px',
                                                          marginBottom: 8,
                                                          opacity: sk.isDraftDelete ? 0.5 : 1,
                                                          textDecoration: sk.isDraftDelete ? 'line-through' : 'none',
                                                        }}
                                                      >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                          <Space size="xs">
                                                            <FolderOpenOutlined style={{ color: '#d97706', fontSize: 14 }} />
                                                            {renderCorporateLevelHeader('Subkomp', sk.code, sk.title, sk.isDraftDelete)}
                                                            {renderDraftBadge(sk)}
                                                          </Space>
                                                          <Space size="small">
                                                            <div style={{ textAlign: 'right', marginRight: 6 }}>
                                                              <Text style={{ color: '#d97706', fontSize: '12px', fontWeight: 600, display: 'block' }}>
                                                                Pagu Subkomp: {formatCurrency(sk.anggaran)}
                                                              </Text>
                                                              <Text type="secondary" style={{ fontSize: '10.5px' }}>
                                                                Sisa: <span style={{ color: sk.remainingAnggaran < 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>{formatCurrency(sk.remainingAnggaran)}</span>
                                                              </Text>
                                                            </div>
                                                            {(isValidator || currentRole === 'admin') && !sk.isDraftDelete && (
                                                              <>
                                                                <Button
                                                                  type="primary"
                                                                  size="small"
                                                                  icon={<PlusOutlined />}
                                                                  onClick={() => handleOpenAddSegment('akun', sk.fullPrefix, sk)}
                                                                  style={{ fontSize: '11px', height: '24px', background: '#d97706', borderColor: '#d97706' }}
                                                                >
                                                                  + Akun BAS
                                                                </Button>
                                                                <Button
                                                                  type="text"
                                                                  size="small"
                                                                  icon={<EditOutlined style={{ color: '#faad14' }} />}
                                                                  onClick={() => handleOpenEditSegment(sk)}
                                                                />
                                                                <Button
                                                                  type="text"
                                                                  danger
                                                                  size="small"
                                                                  icon={<DeleteOutlined />}
                                                                  onClick={() => handleDeleteSegmentLevel('Subkomponen', sk.fullPrefix)}
                                                                />
                                                              </>
                                                            )}
                                                          </Space>
                                                        </div>

                                                        {/* LEVEL 6: Akun BAS Item List */}
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8, paddingLeft: 8 }}>
                                                          {sk.akunItems.length === 0 ? (
                                                            <Text type="secondary" style={{ fontSize: '11px', fontStyle: 'italic', display: 'block', padding: '4px 0' }}>
                                                              Belum ada Akun BAS. Klik "+ Akun BAS" untuk menambah item belanja.
                                                            </Text>
                                                          ) : (
                                                            sk.akunItems.map((akItem) => (
                                                              <div
                                                                key={akItem.item?.id || akItem.fullPrefix}
                                                                style={{
                                                                  display: 'flex',
                                                                  justifyContent: 'space-between',
                                                                  alignItems: 'center',
                                                                  background: '#ffffff',
                                                                  border: '1px solid #e2e8f0',
                                                                  borderRadius: 6,
                                                                  padding: '6px 12px',
                                                                  opacity: akItem.isDraftDelete ? 0.5 : 1,
                                                                  textDecoration: akItem.isDraftDelete ? 'line-through' : 'none',
                                                                }}
                                                              >
                                                                <Space size="xs">
                                                                  <FileTextOutlined style={{ color: '#dc2626', fontSize: 14 }} />
                                                                  {renderCorporateLevelHeader('Akun', akItem.code, akItem.title || akItem.item?.deskripsi, akItem.isDraftDelete)}
                                                                  {renderDraftBadge(akItem)}
                                                                </Space>
                                                                <Space size="small">
                                                                  <Text strong style={{ color: '#0F5B99', fontSize: '12px' }}>
                                                                    {formatCurrency(akItem.anggaran || akItem.item?.anggaran)}
                                                                  </Text>
                                                                  {(isValidator || currentRole === 'admin') && !akItem.isDraftDelete && (
                                                                    <>
                                                                      <Button
                                                                        type="text"
                                                                        size="small"
                                                                        icon={<EditOutlined style={{ color: '#faad14' }} />}
                                                                        onClick={() => handleOpenEditSegment(akItem)}
                                                                      />
                                                                      {akItem.item && (
                                                                        <Button
                                                                          type="text"
                                                                          danger
                                                                          size="small"
                                                                          icon={<DeleteOutlined />}
                                                                          onClick={() => handleDeleteBudget(akItem.item)}
                                                                        />
                                                                      )}
                                                                    </>
                                                                  )}
                                                                </Space>
                                                              </div>
                                                            ))
                                                          )}
                                                        </div>
                                                      </div>
                                                    ))
                                                  )}
                                                </div>
                                              </Collapse.Panel>
                                            </Collapse>
                                          ))
                                        )}
                                      </div>
                                    </Collapse.Panel>
                                  </Collapse>
                                ))
                              )}
                            </div>
                          </Collapse.Panel>
                        </Collapse>
                      ))
                    )}
                  </div>
                </Collapse.Panel>
              ))}
            </Collapse>
          )}
        </Card>

        {/* MODAL DYNAMIS TAMBAH/EDIT SEGMEN HIERARKI DENGAN INFO KETERANGAN SISA RUMAH INDUK */}
        <Modal
          open={openSegmentAddModal}
          title={
            <Space>
              <PlusOutlined style={{ color: '#0F5B99' }} />
              <span style={{ fontSize: '14px', fontWeight: 600 }}>
                {addSegmentTarget.mode === 'edit' ? 'Edit Pagu & Deskripsi Segmen' : `Tambah ${addSegmentTarget.targetLevel.toUpperCase()} Baru`}
                {addSegmentTarget.parentPrefix && addSegmentTarget.mode !== 'edit' && ` (Induk: ${addSegmentTarget.parentPrefix})`}
              </span>
            </Space>
          }
          onCancel={() => setOpenSegmentAddModal(false)}
          onOk={handleSaveSegment}
          okText="Terapkan ke Draft"
          cancelText="Batal"
          centered
          destroyOnClose
          width={520}
        >
          <Form form={segmentForm} layout="vertical" requiredMark={false} style={{ marginTop: 10 }}>
            {/* Infobox Pagu Rumah Induk & Sisa Alokasi Tersedia */}
            {addSegmentTarget.parentPrefix && addSegmentTarget.mode !== 'edit' && (
              <Card size="small" style={{ background: '#f8fafc', marginBottom: 14, borderColor: '#bfdbfe', borderRadius: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <Text strong style={{ fontSize: '12px', color: '#1e40af' }}>
                    Informasi Kapasitas Rumah Induk: ({addSegmentTarget.parentPrefix})
                  </Text>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 4, textAlign: 'center' }}>
                    <div style={{ background: '#fff', padding: '6px', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                      <Text type="secondary" style={{ fontSize: '10.5px', display: 'block' }}>Pagu Rumah Induk</Text>
                      <Text strong style={{ fontSize: '11.5px', color: '#334155' }}>
                        {formatCurrency(addSegmentTarget.parentAnggaran)}
                      </Text>
                    </div>

                    <div style={{ background: '#fff', padding: '6px', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                      <Text type="secondary" style={{ fontSize: '10.5px', display: 'block' }}>Pagu Teralokasi</Text>
                      <Text strong style={{ fontSize: '11.5px', color: '#059669' }}>
                        {formatCurrency(addSegmentTarget.parentUsedAnggaran)}
                      </Text>
                    </div>

                    <div style={{ background: '#eff6ff', padding: '6px', borderRadius: 4, border: '1px solid #bfdbfe' }}>
                      <Text type="secondary" style={{ fontSize: '10.5px', display: 'block', color: '#1e40af' }}>Sisa Tersedia</Text>
                      <Text strong style={{ fontSize: '11.5px', color: parentRemainingCalculated < 0 ? '#ef4444' : '#0F5B99' }}>
                        {formatCurrency(parentRemainingCalculated)}
                      </Text>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            <Form.Item
              label={<Text style={{ fontSize: '12px', fontWeight: 600 }}>Kode {addSegmentTarget.targetLevel.toUpperCase()}</Text>}
              name="code"
              rules={[{ required: true, message: 'Kode segmen wajib diisi.' }]}
            >
              <Input
                placeholder={
                  addSegmentTarget.targetLevel === 'program' ? 'Contoh: 3165' :
                  addSegmentTarget.targetLevel === 'kro' ? 'Contoh: BKB' :
                  addSegmentTarget.targetLevel === 'ro' ? 'Contoh: 053' :
                  addSegmentTarget.targetLevel === 'komponen' ? 'Contoh: 001' :
                  addSegmentTarget.targetLevel === 'subkomponen' ? 'Contoh: A' : 'Contoh: 524111'
                }
                style={{ fontSize: '12px' }}
                disabled={addSegmentTarget.mode === 'edit'}
              />
            </Form.Item>

            <Form.Item label={<Text style={{ fontSize: '12px', fontWeight: 600 }}>Deskripsi Uraian Kegiatan / Belanja</Text>} name="deskripsi">
              <Input.TextArea
                placeholder="Masukkan deskripsi alokasi segmen"
                autoSize={{ minRows: 2, maxRows: 3 }}
                style={{ fontSize: '12px' }}
              />
            </Form.Item>

            <Form.Item
              label={<Text style={{ fontSize: '12px', fontWeight: 600 }}>Nilai Pagu Anggaran Segmen Ini (Rp)</Text>}
              name="anggaran"
              rules={[{ required: true, message: 'Nilai anggaran wajib diisi.' }]}
              initialValue={0}
            >
              <InputNumber
                min={0}
                step={1_000_000}
                style={{ width: '100%', fontSize: '12px' }}
                formatter={(value) => (value ? formatCurrency(Number(value.toString().replace(/[^0-9-]/g, ''))) : '')}
                parser={(value) => (value ? Number(value.replace(/[^0-9-]/g, '')) : 0)}
                onChange={(v) => setInputAnggaranVal(Number(v ?? 0))}
                placeholder="Masukkan nilai anggaran"
              />
            </Form.Item>

            {/* Peringatan jika alokasi baru melebihi sisa pagu rumah induk */}
            {isOverCapacity && (
              <Alert
                type="warning"
                showIcon
                icon={<WarningOutlined />}
                message={<Text strong style={{ fontSize: '11.5px', color: '#b45309' }}>Peringatan Alokasi Melebihi Sisa Rumah</Text>}
                description={
                  <span style={{ fontSize: '11px' }}>
                    Nilai alokasi ({formatCurrency(inputAnggaranVal)}) melebihi sisa kapasitas Pagu Induk ({formatCurrency(parentRemainingCalculated)}). Nilai Pagu Induk tidak akan berkurang, namun akan tercatat melebihi kapasitas alokasi.
                  </span>
                }
                style={{ marginTop: 8 }}
              />
            )}
          </Form>
        </Modal>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // RENDER DAFTAR PERENCANAAN ANGGARAN MAIN PAGE (READ-ONLY TREE DRILL-DOWN DEFAULT)
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'fadeIn 0.25s ease-out' }}>
      {/* Header Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#0f172a' }}>
            Perencanaan Anggaran APBN
          </Title>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Struktur alokasi hierarki 6 segmen Kode Akun APBN & pagu alokasi belanja.
          </Text>
        </div>

        <Space size="middle" style={{ flexWrap: 'wrap' }}>
          {/* Main View Mode Toggle: Tree (Default) vs Table */}
          <Radio.Group
            value={mainViewMode}
            onChange={(e) => setMainViewMode(e.target.value)}
            size="small"
            buttonStyle="solid"
          >
            <Radio.Button value="tree">
              <Space size={4}>
                <AppstoreOutlined style={{ fontSize: 12 }} />
                <span style={{ fontSize: '12px' }}>Pohon APBN</span>
              </Space>
            </Radio.Button>
            <Radio.Button value="table">
              <Space size={4}>
                <UnorderedListOutlined style={{ fontSize: 12 }} />
                <span style={{ fontSize: '12px' }}>Daftar Tabel</span>
              </Space>
            </Radio.Button>
          </Radio.Group>

          <Input
            allowClear
            placeholder="Cari Kode Akun atau deskripsi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            prefix={<SearchOutlined style={{ color: '#94a3b8', fontSize: 12 }} />}
            style={{ width: 220, fontSize: '12px' }}
            size="small"
          />

          {/* Main Manage Anggaran Button — Opens 1-Page Full Workspace */}
          <Button
            type="primary"
            size="small"
            icon={<SettingOutlined />}
            onClick={() => setViewState('manage')}
            style={{ fontSize: '13px', height: '32px', background: '#0F5B99', fontWeight: 600 }}
          >
            Manage Anggaran
          </Button>
        </Space>
      </div>

      {/* RENDER VIEW 1: POHON HIERARKI APBN READ-ONLY (DEFAULT) */}
      {mainViewMode === 'tree' ? (
        <Card
          size="small"
          style={{ background: '#ffffff', borderRadius: 10, borderColor: '#e2e8f0' }}
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong style={{ fontSize: '13px', color: '#334155' }}>
                <NodeIndexOutlined style={{ color: '#0F5B99', marginRight: 6 }} />
                Struktur Hierarki Anggaran APBN (Read-Only)
              </Text>
              <Tag color="blue" style={{ fontSize: '11.5px', fontWeight: 700, margin: 0, padding: '2px 8px' }}>
                Total Pagu: {formatCurrency(totalPaguSystem)}
              </Tag>
            </div>
          }
        >
          {hierarchyTree.length === 0 ? (
            <Empty description={<Text style={{ fontSize: '12px' }}>Belum ada struktur hierarki anggaran APBN.</Text>} style={{ margin: '40px 0' }} />
          ) : (
            <Collapse accordion size="small" style={{ background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              {hierarchyTree.map((prog) => (
                <Collapse.Panel
                  key={prog.code}
                  header={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '4px 0' }}>
                      <Space size="xs">
                        <FolderOutlined style={{ color: '#2563eb', fontSize: 16 }} />
                        {renderCorporateLevelHeader('Program', prog.code, prog.title, false)}
                      </Space>
                      <div style={{ textAlign: 'right' }}>
                        <Text strong style={{ color: '#2563eb', fontSize: '13px', display: 'block' }}>
                          Pagu: {formatCurrency(prog.anggaran)}
                        </Text>
                        <Text type="secondary" style={{ fontSize: '10.5px' }}>
                          Sisa Rumah: <span style={{ color: prog.remainingAnggaran < 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>{formatCurrency(prog.remainingAnggaran)}</span>
                        </Text>
                      </div>
                    </div>
                  }
                >
                  {/* LEVEL 2: KRO List */}
                  <div style={{ paddingLeft: 14, borderLeft: '3px solid #3b82f6', marginTop: 4 }}>
                    {prog.kros.length === 0 ? (
                      <Text type="secondary" style={{ fontSize: '11.5px', fontStyle: 'italic', display: 'block', padding: '6px 0' }}>
                        Belum ada KRO di bawah Program {prog.code}.
                      </Text>
                    ) : (
                      prog.kros.map((kro) => (
                        <Collapse accordion key={kro.code} size="small" style={{ marginBottom: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                          <Collapse.Panel
                            header={
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '2px 0' }}>
                                <Space size="xs">
                                  <FolderOpenOutlined style={{ color: '#059669', fontSize: 15 }} />
                                  {renderCorporateLevelHeader('KRO', kro.code, kro.title, false)}
                                </Space>
                                <div style={{ textAlign: 'right' }}>
                                  <Text style={{ color: '#059669', fontSize: '12.5px', fontWeight: 600, display: 'block' }}>
                                    Pagu KRO: {formatCurrency(kro.anggaran)}
                                  </Text>
                                  <Text type="secondary" style={{ fontSize: '10.5px' }}>
                                    Sisa: <span style={{ color: kro.remainingAnggaran < 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>{formatCurrency(kro.remainingAnggaran)}</span>
                                  </Text>
                                </div>
                              </div>
                            }
                          >
                            {/* LEVEL 3: RO List */}
                            <div style={{ paddingLeft: 14, borderLeft: '3px solid #10b981', marginTop: 4 }}>
                              {kro.ros.length === 0 ? (
                                <Text type="secondary" style={{ fontSize: '11.5px', fontStyle: 'italic', display: 'block', padding: '6px 0' }}>
                                  Belum ada RO di bawah KRO {kro.code}.
                                </Text>
                              ) : (
                                kro.ros.map((ro) => (
                                  <Collapse accordion key={ro.code} size="small" style={{ marginBottom: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                                    <Collapse.Panel
                                      header={
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '2px 0' }}>
                                          <Space size="xs">
                                            <FolderOpenOutlined style={{ color: '#7c3aed', fontSize: 14 }} />
                                            {renderCorporateLevelHeader('RO', ro.code, ro.title, false)}
                                          </Space>
                                          <div style={{ textAlign: 'right' }}>
                                            <Text style={{ color: '#7c3aed', fontSize: '12px', fontWeight: 600, display: 'block' }}>
                                              Pagu RO: {formatCurrency(ro.anggaran)}
                                            </Text>
                                            <Text type="secondary" style={{ fontSize: '10.5px' }}>
                                              Sisa: <span style={{ color: ro.remainingAnggaran < 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>{formatCurrency(ro.remainingAnggaran)}</span>
                                            </Text>
                                          </div>
                                        </div>
                                      }
                                    >
                                      {/* LEVEL 4: Komponen List */}
                                      <div style={{ paddingLeft: 14, borderLeft: '3px solid #8b5cf6', marginTop: 4 }}>
                                        {ro.komponens.length === 0 ? (
                                          <Text type="secondary" style={{ fontSize: '11.5px', fontStyle: 'italic', display: 'block', padding: '6px 0' }}>
                                            Belum ada Komponen di bawah RO {ro.code}.
                                          </Text>
                                        ) : (
                                          ro.komponens.map((km) => (
                                            <Collapse accordion key={km.code} size="small" style={{ marginBottom: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                                              <Collapse.Panel
                                                header={
                                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '2px 0' }}>
                                                    <Space size="xs">
                                                      <FolderOpenOutlined style={{ color: '#0891b2', fontSize: 14 }} />
                                                      {renderCorporateLevelHeader('Komp', km.code, km.title, false)}
                                                    </Space>
                                                    <div style={{ textAlign: 'right' }}>
                                                      <Text style={{ fontSize: '12px', fontWeight: 600, display: 'block' }}>
                                                        Pagu Komp: {formatCurrency(km.anggaran)}
                                                      </Text>
                                                      <Text type="secondary" style={{ fontSize: '10.5px' }}>
                                                        Sisa: <span style={{ color: km.remainingAnggaran < 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>{formatCurrency(km.remainingAnggaran)}</span>
                                                      </Text>
                                                    </div>
                                                  </div>
                                                }
                                              >
                                                {/* LEVEL 5: Subkomponen List */}
                                                <div style={{ paddingLeft: 14, borderLeft: '3px solid #f59e0b', marginTop: 4 }}>
                                                  {km.subkomponens.length === 0 ? (
                                                    <Text type="secondary" style={{ fontSize: '11.5px', fontStyle: 'italic', display: 'block', padding: '6px 0' }}>
                                                      Belum ada Subkomponen di bawah Komponen {km.code}.
                                                    </Text>
                                                  ) : (
                                                    km.subkomponens.map((sk) => (
                                                      <div
                                                        key={sk.code}
                                                        style={{
                                                          background: '#fffbeb',
                                                          border: '1px solid #fef3c7',
                                                          borderRadius: 6,
                                                          padding: '10px 12px',
                                                          marginBottom: 8,
                                                        }}
                                                      >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                          <Space size="xs">
                                                            <FolderOpenOutlined style={{ color: '#d97706', fontSize: 14 }} />
                                                            {renderCorporateLevelHeader('Subkomp', sk.code, sk.title, false)}
                                                          </Space>
                                                          <div style={{ textAlign: 'right' }}>
                                                            <Text style={{ color: '#d97706', fontSize: '12px', fontWeight: 600, display: 'block' }}>
                                                              Pagu Subkomp: {formatCurrency(sk.anggaran)}
                                                            </Text>
                                                            <Text type="secondary" style={{ fontSize: '10.5px' }}>
                                                              Sisa: <span style={{ color: sk.remainingAnggaran < 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>{formatCurrency(sk.remainingAnggaran)}</span>
                                                            </Text>
                                                          </div>
                                                        </div>

                                                        {/* LEVEL 6: Akun BAS Item List */}
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8, paddingLeft: 8 }}>
                                                          {sk.akunItems.length === 0 ? (
                                                            <Text type="secondary" style={{ fontSize: '11px', fontStyle: 'italic', display: 'block', padding: '4px 0' }}>
                                                              Belum ada Akun BAS.
                                                            </Text>
                                                          ) : (
                                                            sk.akunItems.map((akItem) => (
                                                              <div
                                                                key={akItem.item?.id || akItem.fullPrefix}
                                                                style={{
                                                                  display: 'flex',
                                                                  justifyContent: 'space-between',
                                                                  alignItems: 'center',
                                                                  background: '#ffffff',
                                                                  border: '1px solid #e2e8f0',
                                                                  borderRadius: 6,
                                                                  padding: '6px 12px',
                                                                }}
                                                              >
                                                                <Space size="xs">
                                                                  <FileTextOutlined style={{ color: '#dc2626', fontSize: 14 }} />
                                                                  {renderCorporateLevelHeader('Akun', akItem.code, akItem.title || akItem.item?.deskripsi, false)}
                                                                </Space>
                                                                <Space size="small">
                                                                  <Text strong style={{ color: '#0F5B99', fontSize: '12px' }}>
                                                                    {formatCurrency(akItem.anggaran || akItem.item?.anggaran)}
                                                                  </Text>
                                                                  {akItem.item && (
                                                                    <Button
                                                                      type="text"
                                                                      size="small"
                                                                      icon={<HistoryOutlined style={{ color: '#1890ff', fontSize: 13 }} />}
                                                                      onClick={() => handleHistory(akItem.item)}
                                                                    />
                                                                  )}
                                                                </Space>
                                                              </div>
                                                            ))
                                                          )}
                                                        </div>
                                                      </div>
                                                    ))
                                                  )}
                                                </div>
                                              </Collapse.Panel>
                                            </Collapse>
                                          ))
                                        )}
                                      </div>
                                    </Collapse.Panel>
                                  </Collapse>
                                ))
                              )}
                            </div>
                          </Collapse.Panel>
                        </Collapse>
                      ))
                    )}
                  </div>
                </Collapse.Panel>
              ))}
            </Collapse>
          )}
        </Card>
      ) : (
        /* RENDER VIEW 2: DAFTAR TABEL FLAT VIEW */
        <Table
          rowKey="id"
          components={{
            header: {
              cell: ResizableTitle,
            },
          }}
          columns={columns}
          dataSource={budgets}
          pagination={{ pageSize: 10, size: 'small', showTotal: (total) => `Total ${total} Akun` }}
          scroll={{ x: '100%' }}
          size="small"
          bordered
          loading={loading}
        />
      )}

      {/* Modal Riwayat Revisi */}
      <Modal
        open={openHistory}
        title={selectedBudget ? `Riwayat Revisi: ${selectedBudget.mak}` : 'Riwayat Revisi'}
        footer={null}
        onCancel={() => setOpenHistory(false)}
        centered
        width={500}
        destroyOnClose
      >
        {historyContent}
      </Modal>
    </div>
  );
};

export default Anggaran;
