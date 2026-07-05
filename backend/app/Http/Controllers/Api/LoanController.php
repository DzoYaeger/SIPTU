<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Loan;
use App\Models\Asset;
use App\Models\Employee;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class LoanController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Loan::with(['asset', 'borrower']);

        // Search functionality
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('borrower_name', 'LIKE', "%{$search}%")
                  ->orWhere('asset_name', 'LIKE', "%{$search}%")
                  ->orWhere('loan_number', 'LIKE', "%{$search}%");
            });
        }

        // Filtering by status
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        // Filtering by date range
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('loan_date', [$request->start_date, $request->end_date]);
        }

        // Pagination
        $page = $request->get('page', 1);
        $pageSize = $request->get('pageSize', 10);

        $loans = $query->paginate($pageSize, ['*'], 'page', $page);

        return response()->json([
            'data' => $loans->items(),
            'meta' => [
                'total' => $loans->total(),
                'page' => $loans->currentPage(),
                'last_page' => $loans->lastPage(),
            ]
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'asset_id' => 'required|exists:assets,id',
            'borrower_id' => 'required|exists:employees,id',
            'purpose' => 'nullable|string',
            'loan_date' => 'required|date',
            'due_date' => 'required|date|after_or_equal:loan_date',
            'signatures' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Check if asset is available
        $asset = Asset::findOrFail($request->asset_id);
        if ($asset->status !== 'tersedia') {
            return response()->json(['error' => 'Asset is not available for loan'], 422);
        }

        // Create loan number
        $loanNumber = 'LN-' . date('Ymd') . '-' . strtoupper(Str::random(6));

        $loan = Loan::create(array_merge(
            $validator->validated(),
            [
                'loan_number' => $loanNumber,
                'asset_name' => $asset->name,
                'borrower_name' => Employee::findOrFail($request->borrower_id)->name,
                'status' => 'aktif',
                'created_by' => auth()->id()
            ]
        ));

        // Update asset status
        $asset->update(['status' => 'dipinjam']);

        return response()->json($loan, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $loan = Loan::with(['asset', 'borrower'])->findOrFail($id);
        return response()->json($loan);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $loan = Loan::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'asset_id' => 'sometimes|required|exists:assets,id',
            'borrower_id' => 'sometimes|required|exists:employees,id',
            'purpose' => 'nullable|string',
            'loan_date' => 'sometimes|required|date',
            'due_date' => 'sometimes|required|date|after_or_equal:loan_date',
            'return_date' => 'nullable|date',
            'status' => 'nullable|in:diajukan,disetujui,aktif,dikembalikan,terlambat',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $loan->update($validator->validated());

        return response()->json($loan);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $loan = Loan::findOrFail($id);

        // If loan is active, update asset status back to available
        if ($loan->status === 'aktif' || $loan->status === 'terlambat') {
            $asset = Asset::find($loan->asset_id);
            if ($asset) {
                $asset->update(['status' => 'tersedia']);
            }
        }

        $loan->delete();

        return response()->json(['message' => 'Loan deleted successfully']);
    }

    /**
     * Approve a loan request
     */
    public function approve(Request $request, string $id)
    {
        $loan = Loan::findOrFail($id);

        // Update loan status to approved
        $loan->update([
            'status' => 'disetujui',
            'approved_by' => auth()->id()
        ]);

        return response()->json($loan);
    }

    /**
     * Process return of a loan
     */
    public function return(Request $request, string $id)
    {
        $loan = Loan::findOrFail($id);

        // Update loan status to returned
        $loan->update([
            'status' => 'dikembalikan',
            'return_date' => now()
        ]);

        // Update asset status to available
        $asset = Asset::find($loan->asset_id);
        if ($asset) {
            $asset->update(['status' => 'tersedia']);
        }

        return response()->json($loan);
    }
}
