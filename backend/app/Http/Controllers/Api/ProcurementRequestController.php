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

        $query = ProcurementRequest::query()->with(['items.pdttItem', 'creator:id,name']);

        if ($request->filled('period')) {
            $query->where('period', $request->input('period'));
        }

        $rows = $query->orderByDesc('created_at')->get();
        return response()->json(['data' => $rows]);
    }

    public function updateStatus(Request $request, $id)
    {
        if ($unauthorized = $this->ensureAdminOrValidator($request)) {
            return $unauthorized;
        }

        $payload = $request->validate([
            'status' => ['sometimes', 'required', 'string', 'in:pending,approved,rejected,processed'],
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
        return $this->updateStatus($request, $id);
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
                $req->update([
                    'status' => 'pending',
                    'updated_by' => $user->id,
                ]);
                $req->items()->delete();
            } else {
                $req = ProcurementRequest::create([
                    'period' => $payload['period'],
                    'status' => 'pending',
                    'created_by' => $user->id,
                    'updated_by' => $user->id,
                ]);
            }

            foreach ($itemsData as $data) {
                $req->items()->create($data);
            }

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
                $nameParts = array_filter([
                    $pdtt->item_name ?? 'Unknown Item',
                    $pdtt->brand ?? null,
                    $pdtt->jumlah ?? null,
                    $pdtt->satuan ?? null,
                ]);
                $name = implode(' ', $nameParts);
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
}
