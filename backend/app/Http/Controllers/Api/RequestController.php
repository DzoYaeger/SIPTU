<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Request as RequestModel; // Renamed to avoid conflict with Request class
use App\Models\Employee;
use App\Models\Inventory;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class RequestController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = RequestModel::with(['requester', 'createdBy']);

        // Search functionality
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('item_name', 'LIKE', "%{$search}%")
                  ->orWhere('requester_name', 'LIKE', "%{$search}%")
                  ->orWhere('request_number', 'LIKE', "%{$search}%");
            });
        }

        // Filtering by status
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        // Filtering by date range
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('requested_date', [$request->start_date, $request->end_date]);
        }

        // Pagination
        $page = $request->get('page', 1);
        $pageSize = $request->get('pageSize', 10);

        $requests = $query->paginate($pageSize, ['*'], 'page', $page);

        return response()->json([
            'data' => $requests->items(),
            'meta' => [
                'total' => $requests->total(),
                'page' => $requests->currentPage(),
                'last_page' => $requests->lastPage(),
            ]
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'item_name' => 'required|string|max:255',
            'quantity' => 'required|integer|min:1',
            'unit' => 'nullable|string|max:50',
            'requester_id' => 'required|exists:employees,id',
            'purpose' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Create request number
        $requestNumber = 'REQ-' . date('Ymd') . '-' . strtoupper(Str::random(6));

        $requestModel = RequestModel::create(array_merge(
            $validator->validated(),
            [
                'request_number' => $requestNumber,
                'requester_name' => Employee::findOrFail($request->requester_id)->name,
                'requested_date' => now(),
                'status' => 'diajukan',
                'created_by' => auth()->id()
            ]
        ));

        return response()->json($requestModel, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $requestModel = RequestModel::with(['requester', 'createdBy'])->findOrFail($id);
        return response()->json($requestModel);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $requestModel = RequestModel::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'item_name' => 'sometimes|required|string|max:255',
            'quantity' => 'sometimes|required|integer|min:1',
            'unit' => 'nullable|string|max:50',
            'requester_id' => 'sometimes|required|exists:employees,id',
            'purpose' => 'nullable|string',
            'status' => 'nullable|in:diajukan,disetujui,ditolak,selesai',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $requestModel->update($validator->validated());

        return response()->json($requestModel);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $requestModel = RequestModel::findOrFail($id);
        $requestModel->delete();

        return response()->json(['message' => 'Request deleted successfully']);
    }

    /**
     * Approve a request
     */
    public function approve(Request $request, string $id)
    {
        $requestModel = RequestModel::findOrFail($id);

        // Update request status to approved
        $requestModel->update([
            'status' => 'disetujui',
            'approved_by' => auth()->id(),
            'approved_date' => now()
        ]);

        return response()->json($requestModel);
    }

    /**
     * Reject a request
     */
    public function reject(Request $request, string $id)
    {
        $requestModel = RequestModel::findOrFail($id);

        // Update request status to rejected
        $requestModel->update([
            'status' => 'ditolak',
            'approved_by' => auth()->id(),
            'approved_date' => now()
        ]);

        return response()->json($requestModel);
    }
}
