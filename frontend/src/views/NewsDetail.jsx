import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Skeleton, Tag } from "antd";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  PushpinOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import "dayjs/locale/id";
import { useAuth } from "../hooks/useAuth.js";
import "./NewsDetail.css";

dayjs.locale("id");

const NewsDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { apiFetch } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchPost = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await apiFetch(`/news/${slug}`);
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(payload?.message || "Berita tidak ditemukan.");
        }
        if (!cancelled) setPost(payload?.data || null);
      } catch (err) {
        if (!cancelled) setError(err.message || "Gagal memuat berita.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (slug) fetchPost();
    return () => {
      cancelled = true;
    };
  }, [apiFetch, slug]);

  const paragraphs = useMemo(() => {
    if (!post?.body) return [];
    return post.body
      .split(/\n{2,}|\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }, [post?.body]);

  return (
    <div className="news-detail-page">
      <div className="news-detail-shell">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          className="news-detail-back"
          onClick={() => navigate("/app/layanan-mandiri")}
        >
          Kembali ke Layanan Mandiri
        </Button>

        {loading ? (
          <div className="news-detail-card">
            <Skeleton active paragraph={{ rows: 8 }} />
          </div>
        ) : error ? (
          <Alert type="warning" showIcon message={error} />
        ) : (
          <article className="news-detail-card">
            <div className="news-detail-meta">
              <span>
                <CalendarOutlined />
                {post?.published_at
                  ? dayjs(post.published_at).format("DD MMMM YYYY HH:mm")
                  : "Belum dijadwalkan"}
              </span>
              {post?.author?.name && (
                <span>
                  <UserOutlined />
                  {post.author.name}
                </span>
              )}
              {post?.pinned && (
                <Tag color="blue" icon={<PushpinOutlined />}>
                  Penting
                </Tag>
              )}
            </div>

            <h1>{post?.title}</h1>
            {post?.excerpt && <p className="news-detail-excerpt">{post.excerpt}</p>}

            <div className="news-detail-body">
              {paragraphs.map((paragraph, index) => (
                <p key={`${post?.id || slug}-${index}`}>{paragraph}</p>
              ))}
            </div>
          </article>
        )}
      </div>
    </div>
  );
};

export default NewsDetail;
