<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProcurementRequest;
use App\Models\PdttItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProcurementRequestController extends Controller
{
    private function ensureAdminOrValidator(Request $request)
    {
        $user = $request->user();
        if (!$this->isAdminOrValidator($user)) {
            return response()->json(['message' => 'Unauthorized. Access Denied.'], 403);
        }
        return null;
    }

    private function calculateItemsAndTotal(array $itemsPayload, string $period): array
    {
        $totalPrice = 0;
        $itemsData = [];

        foreach ($itemsPayload as $reqItem) {
            $itemId = $reqItem['item_id'];
            $qty = $reqItem['jumlah'];

            $pdttItem = PdttItem::with(['prices' => function ($q) use ($period) {
                $q->orderByDesc('period_start');
            }])->findOrFail($itemId);

            $currentPrice = $pdttItem->prices->first()?->price ?? 0;
            $totalPrice += ($currentPrice * $qty);

            $itemsData[] = [
                'pdtt_item_id' => $itemId,
                'jumlah' => $qty,
                'harga_saat_ini' => $currentPrice,
            ];
        }

        return [$itemsData, $totalPrice];
    }

    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $rows = ProcurementRequest::query()
            ->where('created_by', $user->id)
            ->with(['items.pdttItem', 'creator:id,name'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $rows]);
    }

    public function indexAdmin(Request $request)
    {
        if ($unauthorized = $this->ensureAdminOrValidator($request)) {
            return $unauthorized;
        }

        $query = ProcurementRequest::query()->with(['items.pdttItem', 'creator:id,name,nip']);

        if ($request->filled('period')) {
            $query->where('period', $request->input('period'));
        }

        $rows = $query->orderByDesc('created_at')->get()->map(function ($req) {
            $authUser = \App\Models\PdttAuthorizedUser::where('user_id', $req->created_by)->first();
            $jumlah_hari = 0;
            if ($authUser) {
                $period = $req->period;
                if (is_array($authUser->periods) && isset($authUser->periods[$period])) {
                    $jumlah_hari = (int) $authUser->periods[$period];
                } else {
                    $jumlah_hari = (int) $authUser->jumlah_hari;
                }
            }
            $req->jumlah_hari = $jumlah_hari;
            $req->total_uang = $jumlah_hari * 19000;
            return $req;
        });

        $pejabat = \App\Models\PejabatPerbendaharaan::with(['bendahara', 'ppk'])->first();
        $ppkName = ($pejabat && $pejabat->ppk) ? $pejabat->ppk->name : 'DODDY PRAYUDI, A.Md';
        $ppkNip = ($pejabat && $pejabat->ppk) ? $pejabat->ppk->nip : '19960805 201903 1 002';

        return response()->json([
            'data' => $rows,
            'ppk_info' => [
                'name' => $ppkName,
                'nip' => $ppkNip,
            ],
        ]);
    }

    public function updateStatus(Request $request, $id)
    {
        if ($unauthorized = $this->ensureAdminOrValidator($request)) {
            return $unauthorized;
        }

        $payload = $request->validate([
            'status' => ['sometimes', 'required', 'string', 'in:pending,approved,rejected,processed,updated,reorder'],
            'period' => ['sometimes', 'required', 'string'],
        ]);

        $procurementRequest = ProcurementRequest::findOrFail($id);
        $procurementRequest->update($payload);

        return response()->json([
            'message' => 'Data pengajuan berhasil diperbarui.',
            'data' => $procurementRequest->load(['items.pdttItem', 'creator:id,name']),
        ]);
    }

    public function updateAdmin(Request $request, $id)
    {
        if ($unauthorized = $this->ensureAdminOrValidator($request)) {
            return $unauthorized;
        }

        $payload = $request->validate([
            'status' => ['sometimes', 'required', 'string', 'in:pending,approved,rejected,processed,updated,reorder'],
            'period' => ['sometimes', 'required', 'string'],
            'items' => ['sometimes', 'required', 'array', 'min:1'],
            'items.*.item_id' => ['required', 'exists:pdtt_items,id'],
            'items.*.jumlah' => ['required', 'integer', 'min:1'],
        ]);

        $procurementRequest = ProcurementRequest::findOrFail($id);
        $user = $request->user();

        // If updating items, validate total price against target user's budget allowance
        if (isset($payload['items'])) {
            $period = $payload['period'] ?? $procurementRequest->period;
            [$itemsData, $totalPrice] = $this->calculateItemsAndTotal($payload['items'], $period);

            $targetUserId = $procurementRequest->created_by;
            $authUser = \App\Models\PdttAuthorizedUser::where('user_id', $targetUserId)->first();
            $jumlah_hari = 0;
            if ($authUser) {
                if (is_array($authUser->periods) && isset($authUser->periods[$period])) {
                    $jumlah_hari = (int) $authUser->periods[$period];
                } else {
                    $jumlah_hari = (int) $authUser->jumlah_hari;
                }
            }
            $saldo = $jumlah_hari * 19000;

            if ($totalPrice > $saldo) {
                return response()->json([
                    'message' => "Total harga pengajuan (Rp " . number_format($totalPrice, 0, ',', '.') . ") melebihi saldo anggaran pegawai (Rp " . number_format($saldo, 0, ',', '.') . ")."
                ], 422);
            }
        }

        DB::transaction(function () use ($procurementRequest, $payload, $user) {
            if (isset($payload['status'])) {
                $procurementRequest->status = $payload['status'];
            } elseif (isset($payload['items'])) {
                $procurementRequest->status = 'updated';
            }

            if (isset($payload['period'])) {
                $procurementRequest->period = $payload['period'];
            }

            $procurementRequest->save();

            if (isset($payload['items'])) {
                $period = $procurementRequest->period;
                [$itemsData, $totalPrice] = $this->calculateItemsAndTotal($payload['items'], $period);

                // Build and save change log
                $currentItems = \App\Models\ProcurementRequestItem::with('pdttItem')
                    ->where('procurement_request_id', $procurementRequest->id)->get();
                $changeLog = $this->buildChangeLog($currentItems, $payload['items'], $user, true);
                $procurementRequest->change_log = $changeLog;

                // Preserve existing fulfillment data by pdtt_item_id
                $existingFulfillmentByPdttId = [];
                foreach ($currentItems as $ci) {
                    $existingFulfillmentByPdttId[$ci->pdtt_item_id] = [
                        'jumlah_terbeli' => (int) $ci->jumlah_terbeli,
                        'harga_terbeli' => $ci->harga_terbeli,
                    ];
                }

                $procurementRequest->items()->delete();

                foreach ($itemsData as $data) {
                    $pdttId = $data['pdtt_item_id'];
                    $preserved = $existingFulfillmentByPdttId[$pdttId] ?? null;
                    $purchasedQty = $preserved ? (int) $preserved['jumlah_terbeli'] : 0;
                    $requestedQty = max($purchasedQty, (int) $data['jumlah']);

                    $procurementRequest->items()->create([
                        'pdtt_item_id' => $pdttId,
                        'jumlah' => $requestedQty,
                        'harga_saat_ini' => $data['harga_saat_ini'],
                        'jumlah_terbeli' => $purchasedQty,
                        'harga_terbeli' => $preserved ? $preserved['harga_terbeli'] : null,
                    ]);
                }

                // Recalculate fulfillment_status
                $allItems = $procurementRequest->items()->get();
                $totalCount = $allItems->count();
                $fulfilledCount = 0;
                $totalPurchased = 0;

                foreach ($allItems as $it) {
                    $purchased = (int) $it->jumlah_terbeli;
                    $totalPurchased += $purchased;
                    if ($purchased >= (int) $it->jumlah && (int) $it->jumlah > 0) {
                        $fulfilledCount++;
                    }
                }

                $fulfillmentStatus = 'unfulfilled';
                if ($totalCount > 0 && $fulfilledCount === $totalCount) {
                    $fulfillmentStatus = 'fulfilled';
                } elseif ($totalPurchased > 0) {
                    $fulfillmentStatus = 'partial';
                }

                $procurementRequest->update(['fulfillment_status' => $fulfillmentStatus]);
            }
        });

        return response()->json([
            'message' => 'Data pengajuan berhasil diperbarui.',
            'data' => $procurementRequest->fresh()->load(['items.pdttItem', 'creator:id,name']),
        ]);
    }

    public function updateFulfillment(Request $request, $id)
    {
        if ($unauthorized = $this->ensureAdminOrValidator($request)) {
            return $unauthorized;
        }

        $payload = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['required', 'integer', 'exists:procurement_request_items,id'],
            'items.*.jumlah_terbeli' => ['required', 'integer', 'min:0'],
            'items.*.harga_terbeli' => ['nullable', 'numeric', 'min:0'],
        ]);

        $procurementRequest = ProcurementRequest::findOrFail($id);

        \Illuminate\Support\Facades\DB::transaction(function () use ($procurementRequest, $payload) {
            foreach ($payload['items'] as $itemPayload) {
                $updateData = [
                    'jumlah_terbeli' => max(0, (int)$itemPayload['jumlah_terbeli']),
                ];
                if (array_key_exists('harga_terbeli', $itemPayload)) {
                    $updateData['harga_terbeli'] = $itemPayload['harga_terbeli'] !== null ? max(0, (float)$itemPayload['harga_terbeli']) : null;
                }
                \App\Models\ProcurementRequestItem::where('procurement_request_id', $procurementRequest->id)
                    ->where('id', $itemPayload['id'])
                    ->update($updateData);
            }

            // Calculate request fulfillment status
            $allItems = $procurementRequest->items()->get();
            $totalItemsCount = $allItems->count();
            $fulfilledCount = 0;
            $totalPurchased = 0;

            foreach ($allItems as $item) {
                $purchased = (int) $item->jumlah_terbeli;
                $totalPurchased += $purchased;
                if ($purchased >= (int) $item->jumlah) {
                    $fulfilledCount++;
                }
            }

            $fulfillmentStatus = 'unfulfilled';
            if ($totalItemsCount > 0 && $fulfilledCount === $totalItemsCount) {
                $fulfillmentStatus = 'fulfilled';
            } elseif ($totalPurchased > 0) {
                $fulfillmentStatus = 'partial';
            }

            $procurementRequest->update([
                'status' => 'approved',
                'fulfillment_status' => $fulfillmentStatus
            ]);
        });

        return response()->json([
            'message' => 'Realisasi pemenuhan/pembelian barang berhasil diperbarui.',
            'data' => $procurementRequest->fresh()->load(['items.pdttItem', 'creator:id,name']),
        ]);
    }

    public function destroyAdmin(Request $request, $id)
    {
        if ($unauthorized = $this->ensureAdminOrValidator($request)) {
            return $unauthorized;
        }

        $procurementRequest = ProcurementRequest::findOrFail($id);
        $procurementRequest->delete();

        return response()->json([
            'message' => 'Pengajuan berhasil dihapus.',
        ]);
    }

    private function isAdminOrValidator($user): bool
    {
        if (!$user) return false;
        if (($user->base_role ?? null) === 'admin') return true;
        $roles = is_array($user->available_roles ?? null) ? $user->available_roles : [];
        return in_array('validator', $roles, true);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $isAdmin = $this->isAdminOrValidator($user);
        $authUser = \App\Models\PdttAuthorizedUser::where('user_id', $user->id)->first();

        if (!$isAdmin && !$authUser) {
            return response()->json(['message' => 'Unauthorized. Access Denied.'], 403);
        }

        $payload = $request->validate([
            'period' => ['required', 'date_format:Y-m'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_id' => ['required', 'exists:pdtt_items,id'],
            'items.*.jumlah' => ['required', 'integer', 'min:1'],
        ]);

        $jumlah_hari = 0;
        if ($authUser) {
            $periodString = $payload['period'];
            if (is_array($authUser->periods) && isset($authUser->periods[$periodString])) {
                $jumlah_hari = (int) $authUser->periods[$periodString];
            } else {
                $jumlah_hari = (int) $authUser->jumlah_hari;
            }
        }
        $saldo = $jumlah_hari * 19000;

        [$itemsData, $totalPrice] = $this->calculateItemsAndTotal($payload['items'], $payload['period']);

        // Validate against saldo if not admin
        if (!$isAdmin && $totalPrice > $saldo) {
            return response()->json([
                'message' => "Total harga pengajuan (Rp " . number_format($totalPrice, 0, ',', '.') . ") melebihi saldo Anda (Rp " . number_format($saldo, 0, ',', '.') . ")."
            ], 422);
        }

        $updated = false;
        $procurementRequest = DB::transaction(function () use ($payload, $user, $itemsData, &$updated) {
            $req = ProcurementRequest::query()
                ->where('created_by', $user->id)
                ->where('period', $payload['period'])
                ->latest('id')
                ->first();

            if ($req) {
                $updated = true;
                $currentItems = \App\Models\ProcurementRequestItem::with('pdttItem')
                    ->where('procurement_request_id', $req->id)->get();
                $changeLog = $this->buildChangeLog($currentItems, $payload['items'], $user, false);
                $req->update([
                    'status' => 'reorder',
                    'change_log' => $changeLog,
                    'updated_by' => $user->id,
                ]);
            } else {
                $req = ProcurementRequest::create([
                    'period' => $payload['period'],
                    'status' => 'pending',
                    'created_by' => $user->id,
                    'updated_by' => $user->id,
                ]);
            }

            $existingFulfillmentByPdttId = [];
            $currentItems = \App\Models\ProcurementRequestItem::where('procurement_request_id', $req->id)->get();
            foreach ($currentItems as $ci) {
                $existingFulfillmentByPdttId[$ci->pdtt_item_id] = [
                    'jumlah_terbeli' => (int) $ci->jumlah_terbeli,
                    'harga_terbeli' => $ci->harga_terbeli,
                ];
            }

            // Clear old item relations for this request and recreate with preserved fulfillment records for this period
            $req->items()->delete();

            foreach ($itemsData as $data) {
                $pdttId = $data['pdtt_item_id'];
                $preserved = $existingFulfillmentByPdttId[$pdttId] ?? null;
                $purchasedQty = $preserved ? (int) $preserved['jumlah_terbeli'] : 0;
                $requestedQty = max($purchasedQty, (int) $data['jumlah']);

                $req->items()->create([
                    'pdtt_item_id' => $pdttId,
                    'jumlah' => $requestedQty,
                    'harga_saat_ini' => $data['harga_saat_ini'],
                    'jumlah_terbeli' => $purchasedQty,
                    'harga_terbeli' => $preserved ? $preserved['harga_terbeli'] : null,
                ]);
            }

            // Recalculate fulfillment_status for the request
            $allItems = $req->items()->get();
            $totalCount = $allItems->count();
            $fulfilledCount = 0;
            $totalPurchased = 0;

            foreach ($allItems as $it) {
                $purchased = (int) $it->jumlah_terbeli;
                $totalPurchased += $purchased;
                if ($purchased >= (int) $it->jumlah && (int) $it->jumlah > 0) {
                    $fulfilledCount++;
                }
            }

            $fulfillmentStatus = 'unfulfilled';
            if ($totalCount > 0 && $fulfilledCount === $totalCount) {
                $fulfillmentStatus = 'fulfilled';
            } elseif ($totalPurchased > 0) {
                $fulfillmentStatus = 'partial';
            }

            $req->update(['fulfillment_status' => $fulfillmentStatus]);

            return $req->load(['items.pdttItem', 'creator:id,name']);
        });

        return response()->json([
            'message' => $updated
                ? 'Permintaan pengadaan berhasil diperbarui.'
                : 'Permintaan pengadaan berhasil dibuat.',
            'data' => $procurementRequest,
        ], $updated ? 200 : 201);
    }

    public function crossTabReport(Request $request)
    {
        if ($unauthorized = $this->ensureAdminOrValidator($request)) {
            return $unauthorized;
        }

        $payload = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'integer', 'exists:procurement_requests,id'],
        ]);

        $requests = ProcurementRequest::whereIn('id', $payload['ids'])
            ->with(['items.pdttItem', 'creator:id,name'])
            ->get();

        // Collect unique item names and build matrix
        $itemNames = [];
        $employees = [];
        $matrix = [];

        foreach ($requests as $req) {
            $empName = $req->creator->name ?? 'Unknown';
            $empId = $req->creator->id ?? $req->id;
            $employees[$empId] = $empName;

            if (!isset($matrix[$empId])) {
                $matrix[$empId] = [];
            }

            foreach ($req->items as $item) {
                $pdtt = $item->pdttItem;
                $name = self::formatPdttItemFullName($pdtt);
                if (!in_array($name, $itemNames)) {
                    $itemNames[] = $name;
                }
                // Accumulate qty if same employee requested same item
                $matrix[$empId][$name] = ($matrix[$empId][$name] ?? 0) + $item->jumlah;
            }
        }

        // Calculate totals per item
        $totals = [];
        foreach ($itemNames as $itemName) {
            $total = 0;
            foreach ($matrix as $empItems) {
                $total += $empItems[$itemName] ?? 0;
            }
            $totals[$itemName] = $total;
        }

        return response()->json([
            'data' => [
                'employees' => collect($employees)->map(function ($name, $id) {
                    return ['id' => $id, 'name' => $name];
                })->values(),
                'items' => $itemNames,
                'matrix' => $matrix,
                'totals' => $totals,
            ],
        ]);
    }

    public function bulkFulfillment(Request $request)
    {
        if ($unauthorized = $this->ensureAdminOrValidator($request)) {
            return $unauthorized;
        }

        $payload = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'integer', 'exists:procurement_requests,id'],
            'action' => ['nullable', 'string', 'in:fulfilled,unfulfilled'],
        ]);

        $action = $payload['action'] ?? 'fulfilled';
        $ids = $payload['ids'];

        DB::transaction(function () use ($ids, $action) {
            $requests = ProcurementRequest::with('items.pdttItem')->whereIn('id', $ids)->get();

            foreach ($requests as $req) {
                if ($action === 'fulfilled') {
                    foreach ($req->items as $item) {
                        $item->update([
                            'jumlah_terbeli' => $item->jumlah,
                            'harga_terbeli' => $item->harga_terbeli !== null ? $item->harga_terbeli : $item->harga_saat_ini,
                        ]);
                    }
                    $req->update(['fulfillment_status' => 'fulfilled']);
                } else {
                    foreach ($req->items as $item) {
                        $item->update([
                            'jumlah_terbeli' => 0,
                            'harga_terbeli' => null,
                        ]);
                    }
                    $req->update(['fulfillment_status' => 'unfulfilled']);
                }
            }
        });

        return response()->json([
            'message' => count($ids) . ' pengajuan berhasil diperbarui status pembeliannya.',
        ]);
    }

    public static function formatPdttItemFullName($pdtt): string
    {
        if (!$pdtt) return 'Unknown Item';
        $parts = [];
        if (!empty($pdtt->item_name)) $parts[] = trim($pdtt->item_name);
        if (!empty($pdtt->brand)) $parts[] = trim($pdtt->brand);
        if (isset($pdtt->jumlah) && $pdtt->jumlah !== '' && $pdtt->jumlah !== null) $parts[] = trim($pdtt->jumlah);
        if (!empty($pdtt->satuan)) $parts[] = trim($pdtt->satuan);
        return !empty($parts) ? implode(' ', $parts) : 'Unknown Item';
    }

    private function buildChangeLog($existingItems, array $newItemsPayload, $user, bool $isAdmin): array
    {
        $oldMap = [];
        foreach ($existingItems as $ci) {
            $pdttItem = $ci->pdttItem;
            $name = $pdttItem ? self::formatPdttItemFullName($pdttItem) : ("Item #" . $ci->pdtt_item_id);
            $oldMap[$ci->pdtt_item_id] = [
                'pdtt_item_id' => $ci->pdtt_item_id,
                'item_name' => $name,
                'jumlah' => (int) $ci->jumlah,
            ];
        }

        $newMap = [];
        foreach ($newItemsPayload as $ni) {
            $id = (int) $ni['item_id'];
            $qty = (int) $ni['jumlah'];
            $pdttItem = PdttItem::find($id);
            $name = $pdttItem ? self::formatPdttItemFullName($pdttItem) : ("Item #" . $id);
            $newMap[$id] = [
                'pdtt_item_id' => $id,
                'item_name' => $name,
                'jumlah' => $qty,
            ];
        }

        $diffs = [];
        $addedCount = 0;
        $increasedCount = 0;
        $decreasedCount = 0;
        $removedCount = 0;

        foreach ($newMap as $id => $newItem) {
            $oldItem = $oldMap[$id] ?? null;
            if (!$oldItem) {
                $diffs[] = [
                    'pdtt_item_id' => $id,
                    'item_name' => $newItem['item_name'],
                    'old_qty' => 0,
                    'new_qty' => $newItem['jumlah'],
                    'diff' => $newItem['jumlah'],
                    'type' => 'added',
                ];
                $addedCount++;
            } else {
                $diff = $newItem['jumlah'] - $oldItem['jumlah'];
                if ($diff > 0) {
                    $diffs[] = [
                        'pdtt_item_id' => $id,
                        'item_name' => $newItem['item_name'],
                        'old_qty' => $oldItem['jumlah'],
                        'new_qty' => $newItem['jumlah'],
                        'diff' => $diff,
                        'type' => 'increased',
                    ];
                    $increasedCount++;
                } elseif ($diff < 0) {
                    $diffs[] = [
                        'pdtt_item_id' => $id,
                        'item_name' => $oldItem['item_name'],
                        'old_qty' => $oldItem['jumlah'],
                        'new_qty' => $newItem['jumlah'],
                        'diff' => $diff,
                        'type' => 'decreased',
                    ];
                    $decreasedCount++;
                }
            }
        }

        foreach ($oldMap as $id => $oldItem) {
            if (!isset($newMap[$id])) {
                $diffs[] = [
                    'pdtt_item_id' => $id,
                    'item_name' => $oldItem['item_name'],
                    'old_qty' => $oldItem['jumlah'],
                    'new_qty' => 0,
                    'diff' => -$oldItem['jumlah'],
                    'type' => 'removed',
                ];
                $removedCount++;
            }
        }

        return [
            'updated_by_role' => $isAdmin ? 'admin' : 'user',
            'updated_by_name' => $user->name ?? ($isAdmin ? 'Admin' : 'Pegawai'),
            'updated_at' => now()->format('d M Y, H:i'),
            'summary' => [
                'added' => $addedCount,
                'increased' => $increasedCount,
                'decreased' => $decreasedCount,
                'removed' => $removedCount,
            ],
            'diffs' => $diffs,
        ];
    }
}
