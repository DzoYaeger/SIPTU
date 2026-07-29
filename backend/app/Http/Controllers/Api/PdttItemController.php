<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PdttItem;
use App\Models\PdttItemPrice;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PdttItemController extends Controller
{
    public function index(Request $request)
    {
        if (!$this->isAdminOrValidator($request->user())) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $period = $this->parsePeriod($request->query('period'));
        $search = trim((string) $request->query('search', ''));

        $query = PdttItem::query()->with(['prices' => function ($q) {
            $q->orderByDesc('period_start');
        }]);

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('item_name', 'like', "%{$search}%")
                    ->orWhere('brand', 'like', "%{$search}%")
                    ->orWhere('satuan', 'like', "%{$search}%");
            });
        }

        $items = $query->orderBy('item_name')->get();
        $rows = $this->buildRows($items, $period);

        return response()->json([
            'data' => $rows,
            'meta' => [
                'period' => $period->format('Y-m'),
                'count' => count($rows),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!$this->isAdminOrValidator($user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $payload = $request->validate([
            'item_name' => ['required', 'string', 'max:255'],
            'brand' => ['nullable', 'string', 'max:255'],
            'satuan' => ['nullable', 'string', 'max:255'],
            'jumlah' => ['nullable', 'numeric', 'min:1'],
            'price' => ['required', 'numeric', 'min:0'],
            'period' => ['nullable', 'date_format:Y-m'],
        ]);

        $period = $this->parsePeriod($payload['period'] ?? null);

        $item = DB::transaction(function () use ($payload, $period, $user) {
            $item = PdttItem::create([
                'item_name' => $payload['item_name'],
                'brand' => $payload['brand'] ?? null,
                'satuan' => $payload['satuan'] ?? null,
                'jumlah' => $payload['jumlah'] ?? null,
                'created_by' => $user->id,
            ]);

            PdttItemPrice::create([
                'pdtt_item_id' => $item->id,
                'period_start' => $period->toDateString(),
                'price' => $payload['price'],
                'updated_by' => $user->id,
            ]);

            return $item;
        });

        return response()->json([
            'message' => 'Data barang PDTT berhasil ditambahkan.',
            'data' => $item->load('prices'),
        ], 201);
    }

    public function update(Request $request, string $id)
    {
        if (!$this->isAdminOrValidator($request->user())) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $item = PdttItem::findOrFail($id);

        $payload = $request->validate([
            'item_name' => ['required', 'string', 'max:255'],
            'brand' => ['nullable', 'string', 'max:255'],
            'satuan' => ['nullable', 'string', 'max:255'],
            'jumlah' => ['nullable', 'numeric', 'min:1'],
        ]);

        $item->update($payload);

        return response()->json([
            'message' => 'Data barang PDTT berhasil diperbarui.',
            'data' => $item,
        ]);
    }

    public function updatePrice(Request $request, string $id)
    {
        $user = $request->user();
        if (!$this->isAdminOrValidator($user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $item = PdttItem::findOrFail($id);
        $payload = $request->validate([
            'price' => ['required', 'numeric', 'min:0'],
            'period' => ['required', 'date_format:Y-m'],
        ]);
        $period = $this->parsePeriod($payload['period']);

        $priceRow = PdttItemPrice::updateOrCreate(
            [
                'pdtt_item_id' => $item->id,
                'period_start' => $period->toDateString(),
            ],
            [
                'price' => $payload['price'],
                'updated_by' => $user->id,
            ]
        );

        return response()->json([
            'message' => 'Harga periode berhasil diperbarui.',
            'data' => $priceRow,
        ]);
    }

    public function destroy(Request $request, string $id)
    {
        if (!$this->isAdminOrValidator($request->user())) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $item = PdttItem::findOrFail($id);
        $item->prices()->delete();
        $item->delete();

        return response()->json([
            'message' => 'Data barang PDTT berhasil dihapus.',
        ]);
    }

    public function report(Request $request)
    {
        if (!$this->isAdminOrValidator($request->user())) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $period = $this->parsePeriod($request->query('period'));

        $items = PdttItem::query()
            ->with(['prices' => function ($q) {
                $q->orderByDesc('period_start');
            }])
            ->orderBy('item_name')
            ->get();

        $rows = $this->buildRows($items, $period);

        return response()->json([
            'data' => $rows,
            'summary' => [
                'period' => $period->format('Y-m'),
                'total_items' => count($rows),
            ],
        ]);
    }

    private function buildRows($items, Carbon $period): array
    {
        return $items->map(function (PdttItem $item) use ($period) {
            $snapshot = $this->resolvePriceForPeriod($item, $period);

            return [
                'id' => $item->id,
                'item_name' => $item->item_name,
                'brand' => $item->brand,
                'satuan' => $item->satuan,
                'jumlah' => $item->jumlah,
                'price' => $snapshot?->price ? (float) $snapshot->price : null,
                'price_period' => $snapshot?->period_start?->format('Y-m'),
                'created_at' => $item->created_at,
                'updated_at' => $item->updated_at,
            ];
        })->values()->all();
    }

    private function resolvePriceForPeriod(PdttItem $item, Carbon $period): ?PdttItemPrice
    {
        $prices = $item->prices;
        if (!$prices || $prices->isEmpty()) {
            return null;
        }

        $exact = $prices->first(function (PdttItemPrice $price) use ($period) {
            return $price->period_start && $price->period_start->isSameMonth($period);
        });
        if ($exact) {
            return $exact;
        }

        return $prices
            ->filter(fn(PdttItemPrice $price) => $price->period_start && $price->period_start->lessThanOrEqualTo($period))
            ->sortByDesc('period_start')
            ->first();
    }

    public function toggleRequestable(Request $request, string $id)
    {
        if (!$this->isAdminOrValidator($request->user())) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $item = PdttItem::findOrFail($id);
        $payload = $request->validate([
            'is_requestable' => ['required', 'boolean'],
        ]);

        $item->update([
            'is_requestable' => $payload['is_requestable'],
        ]);

        return response()->json([
            'message' => 'Status rujukan item berhasil diperbarui.',
            'data' => $item,
        ]);
    }

    public function requestableItems(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $period = $this->parsePeriod($request->query('period'));
        $targetUserId = $request->query('user_id');

        $effectiveUser = $user;
        if ($targetUserId && $this->isAdminOrValidator($user)) {
            $targetUser = \App\Models\User::find($targetUserId);
            if ($targetUser) {
                $effectiveUser = $targetUser;
            }
        }

        // Authorization check
        $authUser = \App\Models\PdttAuthorizedUser::where('user_id', $effectiveUser->id)->first();
        if (!$authUser && !$this->isAdminOrValidator($effectiveUser)) {
            return response()->json([
                'data' => [],
                'meta' => [
                    'period' => $period->format('Y-m'),
                    'jumlah_hari' => 0,
                    'saldo' => 0,
                    'is_authorized' => false
                ]
            ], 200);
        }

        $jumlah_hari = 0;
        if ($authUser) {
            $periodString = $period->format('Y-m');
            if (is_array($authUser->periods) && isset($authUser->periods[$periodString])) {
                $jumlah_hari = (int) $authUser->periods[$periodString];
            } else {
                $jumlah_hari = (int) $authUser->jumlah_hari;
            }
        }
        $saldo = $jumlah_hari * 19000;

        $items = PdttItem::where('is_requestable', true)
            ->with(['prices' => function ($q) {
                $q->orderByDesc('period_start');
            }])
            ->orderBy('item_name')
            ->get();

        $rows = $this->buildRows($items, $period);

        return response()->json([
            'data' => $rows,
            'meta' => [
                'period' => $period->format('Y-m'),
                'jumlah_hari' => $jumlah_hari,
                'saldo' => $saldo,
            ],
        ]);
    }

    private function parsePeriod(?string $period): Carbon
    {
        if ($period) {
            return Carbon::createFromFormat('Y-m', $period)->startOfMonth();
        }
        return now()->startOfMonth();
    }

    private function isAdminOrValidator($user): bool
    {
        if (!$user) {
            return false;
        }
        if (($user->base_role ?? null) === 'admin') {
            return true;
        }
        $roles = is_array($user->available_roles ?? null) ? $user->available_roles : [];
        return in_array('validator', $roles, true);
    }
}
