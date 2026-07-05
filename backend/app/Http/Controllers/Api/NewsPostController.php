<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NewsPost;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class NewsPostController extends Controller
{
    public function publicIndex(Request $request)
    {
        $limit = min(max((int) $request->query('limit', 4), 1), 20);

        $posts = NewsPost::query()
            ->with('author:id,name')
            ->where('status', 'published')
            ->where(function ($query) {
                $query->whereNull('published_at')
                    ->orWhere('published_at', '<=', now());
            })
            ->orderByDesc('pinned')
            ->orderByDesc('published_at')
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();

        return response()->json([
            'data' => $posts->map(fn (NewsPost $post) => $this->serializeSummary($post)),
        ]);
    }

    public function publicShow(string $slug)
    {
        $post = NewsPost::query()
            ->with('author:id,name')
            ->where('slug', $slug)
            ->where('status', 'published')
            ->where(function ($query) {
                $query->whereNull('published_at')
                    ->orWhere('published_at', '<=', now());
            })
            ->firstOrFail();

        return response()->json([
            'data' => $this->serializeDetail($post),
        ]);
    }

    public function index(Request $request)
    {
        $query = NewsPost::query()->with(['author:id,name', 'editor:id,name']);

        if ($request->filled('status') && in_array($request->query('status'), ['draft', 'published'], true)) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('search')) {
            $search = trim((string) $request->query('search'));
            $query->where(function ($builder) use ($search) {
                $builder->where('title', 'like', "%{$search}%")
                    ->orWhere('excerpt', 'like', "%{$search}%")
                    ->orWhere('body', 'like', "%{$search}%");
            });
        }

        $posts = $query
            ->orderByDesc('pinned')
            ->orderByDesc('published_at')
            ->orderByDesc('created_at')
            ->paginate(min(max((int) $request->query('per_page', 20), 5), 100));

        return response()->json($posts);
    }

    public function store(Request $request)
    {
        $validated = $this->validatePost($request);

        $post = new NewsPost($this->normalizePayload($validated));
        $post->slug = $this->makeUniqueSlug($validated['title']);
        $post->created_by = $request->user()?->id;
        $post->updated_by = $request->user()?->id;
        $post->save();

        return response()->json([
            'data' => $this->serializeDetail($post->load(['author:id,name', 'editor:id,name'])),
            'message' => 'Berita berhasil dibuat.',
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $post = NewsPost::findOrFail($id);
        $validated = $this->validatePost($request);
        $payload = $this->normalizePayload($validated);

        if ($post->title !== $validated['title']) {
            $payload['slug'] = $this->makeUniqueSlug($validated['title'], $post->id);
        }

        $payload['updated_by'] = $request->user()?->id;
        $post->update($payload);

        return response()->json([
            'data' => $this->serializeDetail($post->fresh(['author:id,name', 'editor:id,name'])),
            'message' => 'Berita berhasil diperbarui.',
        ]);
    }

    public function destroy(int $id)
    {
        NewsPost::findOrFail($id)->delete();

        return response()->json([
            'message' => 'Berita berhasil dihapus.',
        ]);
    }

    private function validatePost(Request $request): array
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:180',
            'excerpt' => 'nullable|string|max:500',
            'body' => 'required|string',
            'status' => 'required|string|in:draft,published',
            'pinned' => 'sometimes|boolean',
            'published_at' => 'nullable|date',
        ]);

        return $validator->validate();
    }

    private function normalizePayload(array $validated): array
    {
        $status = $validated['status'];
        $publishedAt = $validated['published_at'] ?? null;

        if ($status === 'published' && !$publishedAt) {
            $publishedAt = now();
        }

        return [
            'title' => trim($validated['title']),
            'excerpt' => $this->normalizeExcerpt($validated['excerpt'] ?? null, $validated['body']),
            'body' => trim($validated['body']),
            'status' => $status,
            'pinned' => (bool) ($validated['pinned'] ?? false),
            'published_at' => $publishedAt ? Carbon::parse($publishedAt) : null,
        ];
    }

    private function normalizeExcerpt(?string $excerpt, string $body): string
    {
        $source = trim((string) ($excerpt ?: $body));
        $source = preg_replace('/\s+/', ' ', strip_tags($source));

        return Str::limit($source, 180, '...');
    }

    private function makeUniqueSlug(string $title, ?int $ignoreId = null): string
    {
        $base = Str::slug($title) ?: 'berita';
        $slug = $base;
        $counter = 2;

        while (
            NewsPost::query()
                ->where('slug', $slug)
                ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
                ->exists()
        ) {
            $slug = "{$base}-{$counter}";
            $counter++;
        }

        return $slug;
    }

    private function serializeSummary(NewsPost $post): array
    {
        return [
            'id' => $post->id,
            'title' => $post->title,
            'slug' => $post->slug,
            'excerpt' => $post->excerpt,
            'status' => $post->status,
            'pinned' => $post->pinned,
            'published_at' => optional($post->published_at)->toISOString(),
            'created_at' => optional($post->created_at)->toISOString(),
            'author' => $post->author ? [
                'id' => $post->author->id,
                'name' => $post->author->name,
            ] : null,
        ];
    }

    private function serializeDetail(NewsPost $post): array
    {
        return [
            ...$this->serializeSummary($post),
            'body' => $post->body,
            'updated_at' => optional($post->updated_at)->toISOString(),
            'editor' => $post->editor ? [
                'id' => $post->editor->id,
                'name' => $post->editor->name,
            ] : null,
        ];
    }
}
