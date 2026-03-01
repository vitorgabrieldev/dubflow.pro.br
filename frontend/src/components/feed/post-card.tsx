"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock3,
  EllipsisVertical,
  Expand,
  Heart,
  Loader2,
  MessageCircleMore,
  PencilLine,
  Pause,
  Play,
  Share2,
  Sparkles,
  Trash2,
  Volume,
  Volume2,
  VolumeX,
} from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { resolveMediaUrl } from "@/lib/api";
import { type Locale, getDictionary } from "@/lib/i18n";
import type { Post, PostComment, PostCredit } from "@/types/api";

type PostCardProps = {
  post: Post;
  locale: Locale;
  isAuthenticated: boolean;
};

const COMMENTS_BATCH_SIZE = 2;
const REPLIES_BATCH_SIZE = 2;

type MediaAsset = {
  path: string;
  type: "audio" | "video" | "image";
  mime?: string | null;
  size_bytes?: number;
  url: string;
};

export function PostCard({ post, locale, isAuthenticated }: PostCardProps) {
  const router = useRouter();
  const t = getDictionary(locale);
  const thumb = resolveMediaUrl(post.thumbnail_path);
  const primaryMediaUrl = resolveMediaUrl(post.media_path);
  const authorAvatar = resolveMediaUrl(post.author?.avatar_path);
  const workTitle = post.metadata?.work_title ?? "-";
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const postCardRef = useRef<HTMLDivElement | null>(null);
  const hasRecordedViewRef = useRef(false);

  const assets = useMemo<MediaAsset[]>(() => {
    const metadataAssets = post.metadata?.assets ?? [];
    if (metadataAssets.length > 0) {
      return metadataAssets
        .map((asset) => {
          const url = resolveMediaUrl(asset.path);
          if (!url) {
            return null;
          }

          return {
            ...asset,
            url,
          };
        })
        .filter((asset): asset is { path: string; type: "audio" | "video" | "image"; mime?: string | null; size_bytes?: number; url: string } => Boolean(asset));
    }

    if (!primaryMediaUrl) {
      return [];
    }

    return [
      {
        path: post.media_path ?? primaryMediaUrl,
        type: post.media_type,
        url: primaryMediaUrl,
      },
    ];
  }, [post.media_path, post.media_type, post.metadata?.assets, primaryMediaUrl]);

  const defaultAssetIndex = useMemo(
    () => {
      const firstVideoIndex = assets.findIndex((asset) => asset.type === "video");
      if (firstVideoIndex >= 0) {
        return firstVideoIndex;
      }

      const firstAudioIndex = assets.findIndex((asset) => asset.type === "audio");
      return firstAudioIndex >= 0 ? firstAudioIndex : 0;
    },
    [assets]
  );

  const [activeAssetIndex, setActiveAssetIndex] = useState(defaultAssetIndex);
  const activeAsset = assets[activeAssetIndex] ?? null;
  const mediaUrl = activeAsset?.url ?? primaryMediaUrl;
  const mediaType = activeAsset?.type ?? post.media_type;
  const visualImage = mediaType === "image" ? mediaUrl ?? thumb ?? null : thumb ?? assets.find((asset) => asset.type === "image")?.url ?? null;
  const canShowMediaCarousel = assets.length > 1;
  const canShowComments = post.allow_comments !== false;
  const showViewsCount = post.metadata?.display_metrics?.show_views ?? true;

  const [liked, setLiked] = useState(Boolean(post.viewer_has_liked));
  const [viewsCount, setViewsCount] = useState(post.views_count ?? 0);
  const [commentsCount, setCommentsCount] = useState(post.comments_count ?? 0);
  const [comments, setComments] = useState<PostComment[]>(post.comments ?? []);
  const [visibleCommentsLimit, setVisibleCommentsLimit] = useState(COMMENTS_BATCH_SIZE);
  const [visibleRepliesLimitByCommentId, setVisibleRepliesLimitByCommentId] = useState<Record<number, number>>({});
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [submittingLike, setSubmittingLike] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [collaboratorsLoading, setCollaboratorsLoading] = useState(false);
  const [collaboratorsLoaded, setCollaboratorsLoaded] = useState(false);
  const [collaboratorsError, setCollaboratorsError] = useState<string | null>(null);
  const [collaboratorCredits, setCollaboratorCredits] = useState<PostCredit[]>(post.credits ?? []);
  const collaboratorGroups = useMemo(() => groupCollaboratorCredits(collaboratorCredits), [collaboratorCredits]);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyParentId, setReplyParentId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showLikeBurst, setShowLikeBurst] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [videoProgressPercent, setVideoProgressPercent] = useState(0);
  const [videoDurationSeconds, setVideoDurationSeconds] = useState(0);
  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoVolume, setVideoVolume] = useState(0.5);
  const [isTimelineHovering, setIsTimelineHovering] = useState(false);
  const [timelineHoverPercent, setTimelineHoverPercent] = useState(0);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  const [postActionError, setPostActionError] = useState<string | null>(null);
  const [isRemoved, setIsRemoved] = useState(false);

  useEffect(() => {
    setComments(post.comments ?? []);
    setCommentsCount(post.comments_count ?? (post.comments?.length ?? 0));
    setVisibleCommentsLimit(COMMENTS_BATCH_SIZE);
    setVisibleRepliesLimitByCommentId({});
  }, [post.id, post.comments, post.comments_count]);

  useEffect(() => {
    setShowCollaborators(false);
    setCollaboratorsError(null);
    setCollaboratorsLoaded(Array.isArray(post.credits) && post.credits.length > 0);
    setCollaboratorsLoading(false);
    setCollaboratorCredits(post.credits ?? []);
  }, [post.id, post.credits]);

  useEffect(() => {
    setLiked(Boolean(post.viewer_has_liked));
    setViewsCount(post.views_count ?? 0);
    hasRecordedViewRef.current = false;
  }, [post.id, post.viewer_has_liked, post.views_count]);

  useEffect(() => {
    setActiveAssetIndex(defaultAssetIndex);
  }, [defaultAssetIndex, post.id]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || mediaType !== "video") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const isFullyVisible = Boolean(entry && entry.intersectionRatio >= 1);

        if (!isFullyVisible && !video.paused && !isVideoFullscreen) {
          video.pause();
        }
      },
      {
        threshold: [1],
      }
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
    };
  }, [mediaType, mediaUrl, isVideoFullscreen]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || mediaType !== "video") {
      setIsVideoFullscreen(false);
      return;
    }

    const documentWithVendor = document as Document & {
      webkitFullscreenElement?: Element | null;
      msFullscreenElement?: Element | null;
    };
    const videoWithVendor = video as HTMLVideoElement & {
      webkitDisplayingFullscreen?: boolean;
    };

    const syncFullscreen = () => {
      const fullscreenElement =
        document.fullscreenElement ?? documentWithVendor.webkitFullscreenElement ?? documentWithVendor.msFullscreenElement ?? null;
      const insideFullscreenVideo = Boolean(fullscreenElement && (fullscreenElement === video || fullscreenElement.contains(video)));
      const iosFullscreen = Boolean(videoWithVendor.webkitDisplayingFullscreen);

      setIsVideoFullscreen(insideFullscreenVideo || iosFullscreen);
    };

    const handleWebkitBeginFullscreen = () => {
      setIsVideoFullscreen(true);
    };
    const handleWebkitEndFullscreen = () => {
      setIsVideoFullscreen(false);
    };

    syncFullscreen();

    document.addEventListener("fullscreenchange", syncFullscreen);
    document.addEventListener("webkitfullscreenchange", syncFullscreen as EventListener);
    document.addEventListener("MSFullscreenChange", syncFullscreen as EventListener);
    video.addEventListener("webkitbeginfullscreen", handleWebkitBeginFullscreen as EventListener);
    video.addEventListener("webkitendfullscreen", handleWebkitEndFullscreen as EventListener);

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
      document.removeEventListener("webkitfullscreenchange", syncFullscreen as EventListener);
      document.removeEventListener("MSFullscreenChange", syncFullscreen as EventListener);
      video.removeEventListener("webkitbeginfullscreen", handleWebkitBeginFullscreen as EventListener);
      video.removeEventListener("webkitendfullscreen", handleWebkitEndFullscreen as EventListener);
    };
  }, [mediaType, mediaUrl]);

  useEffect(() => {
    setVideoProgressPercent(0);
    setVideoDurationSeconds(0);
    setIsVideoFullscreen(false);
    setIsVideoPlaying(false);
    setVideoVolume(0.5);
    setVideoMuted(false);
    setIsTimelineHovering(false);
    setTimelineHoverPercent(0);
  }, [mediaType, mediaUrl]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setToastMessage(null);
    }, 2500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [toastMessage]);

  useEffect(() => {
    setActionsMenuOpen(false);
    setDeletingPost(false);
    setPostActionError(null);
    setIsRemoved(false);
  }, [post.id]);

  async function toggleLike(forceLike = false) {
    if (!isAuthenticated || submittingLike) {
      return;
    }

    if (forceLike && liked) {
      return;
    }

    const nextLiked = forceLike ? true : !liked;
    const method = nextLiked ? "POST" : "DELETE";

    setSubmittingLike(true);

    try {
      const response = await fetch(`/api/posts/${post.id}/like`, {
        method,
      });

      if (!response.ok) {
        return;
      }
      setLiked(nextLiked);
    } finally {
      setSubmittingLike(false);
    }
  }

  function handleMediaDoubleClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!isAuthenticated) {
      return;
    }

    const target = event.target as HTMLElement;
    if (target.closest("[data-prevent-like-double-click='true']")) {
      return;
    }

    setShowLikeBurst(true);
    window.setTimeout(() => setShowLikeBurst(false), 900);
    void toggleLike(true);
  }

  function mergeComment(list: PostComment[], newComment: PostComment): PostComment[] {
    if (!newComment.parent_id) {
      return [newComment, ...list];
    }

    return list.map((rootComment) => {
      if (rootComment.id !== newComment.parent_id) {
        return rootComment;
      }

      const replies = rootComment.replies ?? [];
      return {
        ...rootComment,
        replies: [newComment, ...replies].slice(0, 8),
      };
    });
  }

  async function submitComment(parentId?: number) {
    const isReply = typeof parentId === "number";

    if (!isAuthenticated || (isReply ? submittingReply : submittingComment) || !canShowComments) {
      return;
    }

    const rawText = isReply ? replyText : commentText;
    const trimmed = rawText.trim();
    if (!trimmed) {
      return;
    }

    if (isReply) {
      setSubmittingReply(true);
    } else {
      setSubmittingComment(true);
    }

    try {
      const response = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          body: trimmed,
          parent_id: isReply ? parentId : null,
        }),
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { comment?: PostComment };
      if (payload.comment) {
        setComments((previous) => mergeComment(previous, payload.comment as PostComment));
        if (!isReply) {
          setCommentsCount((previous) => previous + 1);
        }
        setVisibleCommentsLimit((previous) => Math.max(previous, COMMENTS_BATCH_SIZE));
        if (isReply) {
          setReplyText("");
          setReplyParentId(null);
        } else {
          setCommentText("");
        }
      }
    } finally {
      if (isReply) {
        setSubmittingReply(false);
      } else {
        setSubmittingComment(false);
      }
    }
  }

  async function copyTextToClipboard(text: string) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }

  async function sharePost() {
    const url = `${window.location.origin}/${locale}/post/${post.id}`;

    try {
      await copyTextToClipboard(url);
      setToastMessage("Link copiado para área de transferência");
    } catch {
      setToastMessage("Não foi possível copiar o link");
    }
  }

  async function toggleCollaboratorsPanel() {
    const next = !showCollaborators;
    setShowCollaborators(next);
    if (!next || collaboratorsLoaded || collaboratorsLoading) {
      return;
    }

    setCollaboratorsLoading(true);
    setCollaboratorsError(null);

    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        headers: {
          Accept: "application/json",
        },
      });

      const payload = (await response.json().catch(() => ({}))) as { post?: Post; message?: string };
      if (!response.ok) {
        setCollaboratorsError(payload.message ?? "Não foi possível carregar os colaboradores.");
        return;
      }

      setCollaboratorCredits(payload.post?.credits ?? []);
      setCollaboratorsLoaded(true);
    } catch {
      setCollaboratorsError("Não foi possível carregar os colaboradores.");
    } finally {
      setCollaboratorsLoading(false);
    }
  }

  async function deletePost() {
    if (deletingPost) {
      return;
    }

    const confirmed = window.confirm("Tem certeza que deseja excluir este episódio?");
    if (!confirmed) {
      return;
    }

    setDeletingPost(true);
    setPostActionError(null);

    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: "DELETE",
      });

      const payload = (await response.json().catch(() => ({}))) as { message?: string; already_deleted?: boolean };
      if (response.status === 404 || payload.already_deleted) {
        setActionsMenuOpen(false);
        setIsRemoved(true);
        router.refresh();
        return;
      }

      if (!response.ok) {
        setPostActionError(payload.message ?? "Não foi possível excluir este episódio.");
        return;
      }

      setActionsMenuOpen(false);
      setIsRemoved(true);
      router.refresh();
    } catch {
      setPostActionError("Não foi possível excluir este episódio.");
    } finally {
      setDeletingPost(false);
    }
  }

  const recordView = useCallback(async () => {
    try {
      const response = await fetch(`/api/posts/${post.id}/view`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ watch_seconds: 0 }),
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { views_count?: number };
      if (typeof payload.views_count === "number") {
        setViewsCount(payload.views_count);
      } else {
        setViewsCount((current) => current + 1);
      }
    } catch {
      // Ignora falhas de registro para não impactar a UI.
    }
  }, [post.id]);

  useEffect(() => {
    if (!isAuthenticated || !showViewsCount) {
      return;
    }

    const card = postCardRef.current;
    if (!card) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry || !entry.isIntersecting || entry.intersectionRatio < 0.55 || hasRecordedViewRef.current) {
          return;
        }

        hasRecordedViewRef.current = true;
        observer.disconnect();
        void recordView();
      },
      { threshold: [0.55] }
    );

    observer.observe(card);

    return () => {
      observer.disconnect();
    };
  }, [isAuthenticated, showViewsCount, recordView]);

  async function loadMoreComments() {
    if (loadingMoreComments) {
      return;
    }

    if (visibleCommentsLimit < comments.length) {
      setVisibleCommentsLimit((current) => Math.min(current + COMMENTS_BATCH_SIZE, comments.length));
      return;
    }

    if (comments.length >= commentsCount) {
      return;
    }

    setLoadingMoreComments(true);

    try {
      const response = await fetch(`/api/posts/${post.id}`);
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { post?: Post };
      const fetchedComments = payload.post?.comments ?? [];
      const fetchedCount = payload.post?.comments_count;

      if (typeof fetchedCount === "number") {
        setCommentsCount(fetchedCount);
      }

      if (Array.isArray(fetchedComments) && fetchedComments.length > 0) {
        setComments(fetchedComments as PostComment[]);
        setVisibleCommentsLimit((current) => Math.min(current + COMMENTS_BATCH_SIZE, fetchedComments.length));
      }
    } finally {
      setLoadingMoreComments(false);
    }
  }

  function collapseComments() {
    setVisibleCommentsLimit(COMMENTS_BATCH_SIZE);
  }

  function getVisibleRepliesLimit(commentId: number) {
    return visibleRepliesLimitByCommentId[commentId] ?? REPLIES_BATCH_SIZE;
  }

  function loadMoreReplies(commentId: number, totalReplies: number) {
    setVisibleRepliesLimitByCommentId((current) => {
      const currentLimit = current[commentId] ?? REPLIES_BATCH_SIZE;
      return {
        ...current,
        [commentId]: Math.min(currentLimit + REPLIES_BATCH_SIZE, totalReplies),
      };
    });
  }

  function collapseReplies(commentId: number) {
    setVisibleRepliesLimitByCommentId((current) => ({
      ...current,
      [commentId]: REPLIES_BATCH_SIZE,
    }));
  }

  function goToPreviousMedia() {
    if (!canShowMediaCarousel) {
      return;
    }

    setActiveAssetIndex((current) => (current - 1 + assets.length) % assets.length);
  }

  function goToNextMedia() {
    if (!canShowMediaCarousel) {
      return;
    }

    setActiveAssetIndex((current) => (current + 1) % assets.length);
  }

  function updateVideoProgress(video: HTMLVideoElement) {
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    const progress = duration > 0 ? Math.min(100, Math.max(0, (video.currentTime / duration) * 100)) : 0;
    setVideoDurationSeconds(duration);
    setVideoProgressPercent(progress);
  }

  function seekVideoTo(event: React.MouseEvent<HTMLButtonElement>) {
    seekTimelineByClientX(event.currentTarget, event.clientX);
  }

  function toggleVideoPlayPause() {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (video.paused) {
      void video.play().catch(() => undefined);
      return;
    }

    video.pause();
  }

  function toggleVideoMute() {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (video.muted && video.volume === 0) {
      video.volume = 0.5;
    }

    video.muted = !video.muted;
    setVideoMuted(video.muted);
    setVideoVolume(video.volume);
  }

  function changeVideoVolume(event: ChangeEvent<HTMLInputElement>) {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const nextVolume = Number(event.target.value);
    if (!Number.isFinite(nextVolume)) {
      return;
    }

    const normalized = Math.min(1, Math.max(0, nextVolume));
    video.volume = normalized;
    video.muted = normalized <= 0;
    setVideoVolume(normalized);
    setVideoMuted(video.muted);
  }

  function toggleVideoFullscreen() {
    const video = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (!video) {
      return;
    }

    const documentWithVendor = document as Document & {
      webkitFullscreenElement?: Element | null;
      msFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void> | void;
      msExitFullscreen?: () => Promise<void> | void;
    };

    const fullscreenElement =
      document.fullscreenElement ?? documentWithVendor.webkitFullscreenElement ?? documentWithVendor.msFullscreenElement ?? null;

    if (fullscreenElement) {
      if (document.exitFullscreen) {
        void document.exitFullscreen().catch(() => undefined);
        return;
      }

      if (documentWithVendor.webkitExitFullscreen) {
        void Promise.resolve(documentWithVendor.webkitExitFullscreen()).catch(() => undefined);
        return;
      }

      if (documentWithVendor.msExitFullscreen) {
        void Promise.resolve(documentWithVendor.msExitFullscreen()).catch(() => undefined);
      }

      return;
    }

    if (video.requestFullscreen) {
      void video.requestFullscreen().catch(() => undefined);
      return;
    }

    if (video.webkitEnterFullscreen) {
      video.webkitEnterFullscreen();
    }
  }

  function getTimelineRatioFromClientX(target: HTMLButtonElement, clientX: number) {
    const bounds = target.getBoundingClientRect();
    const relativeX = clientX - bounds.left;
    return Math.min(1, Math.max(0, relativeX / bounds.width));
  }

  function seekTimelineByClientX(target: HTMLButtonElement, clientX: number) {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    if (duration <= 0) {
      return;
    }

    const ratio = getTimelineRatioFromClientX(target, clientX);
    video.currentTime = ratio * duration;
    setVideoProgressPercent(ratio * 100);
  }

  function handleTimelineHover(event: React.MouseEvent<HTMLButtonElement>) {
    const ratio = getTimelineRatioFromClientX(event.currentTarget, event.clientX);
    setTimelineHoverPercent(ratio * 100);
    setIsTimelineHovering(true);
  }

  function handleTimelineLeave() {
    setIsTimelineHovering(false);
  }

  const playedSeconds = videoDurationSeconds > 0 ? Math.round((videoDurationSeconds * videoProgressPercent) / 100) : 0;
  const fallbackVisualImage = thumb ?? assets.find((asset) => asset.type === "image")?.url ?? null;
  const trackTranslatePercent = activeAssetIndex * 100;
  const firstAssetIsVideo = assets[0]?.type === "video";
  const activeVideoPoster = firstAssetIsVideo && activeAssetIndex === 0 ? thumb ?? undefined : undefined;
  const visibleComments = comments.slice(0, visibleCommentsLimit);
  const totalCommentsCount = Math.max(commentsCount, comments.length);
  const hasMoreLoadedComments = visibleCommentsLimit < comments.length;
  const hasMoreServerComments = comments.length < totalCommentsCount;
  const canLoadMoreComments = hasMoreLoadedComments || hasMoreServerComments;
  const visibleCommentsCount = Math.min(visibleComments.length, totalCommentsCount);
  const canCollapseComments = visibleCommentsLimit > COMMENTS_BATCH_SIZE;
  const canEditPost = Boolean(isAuthenticated && post.viewer_permissions?.can_edit);
  const canDeletePost = Boolean(isAuthenticated && post.viewer_permissions?.can_delete);
  const showPostActionsMenu = canEditPost || canDeletePost;

  function renderMediaAsset(asset: MediaAsset, index: number) {
    const isActive = index === activeAssetIndex;

    if (asset.type === "video") {
      if (!isActive) {
        if (firstAssetIsVideo && index === 0 && thumb) {
          return <Image src={thumb} alt={post.title} fill sizes="(max-width: 640px) 100vw, 920px" className="object-cover" />;
        }

        return <span className="absolute inset-0 bg-[linear-gradient(130deg,#20112f_0%,#492173_52%,#7325b3_100%)]" />;
      }

      return (
        <video
          key={asset.url}
          ref={videoRef}
          src={asset.url}
          poster={activeVideoPoster}
          controls={isVideoFullscreen}
          muted={videoMuted}
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
          onClick={() => {
            if (!isVideoFullscreen) {
              toggleVideoPlayPause();
            }
          }}
          onPlay={() => {
            setIsVideoPlaying(true);
          }}
          onPause={() => {
            setIsVideoPlaying(false);
          }}
          onVolumeChange={() => {
            const video = videoRef.current;
            if (!video) {
              return;
            }

            setVideoMuted(video.muted);
            setVideoVolume(video.volume);
          }}
          onLoadedMetadata={(event) => {
            updateVideoProgress(event.currentTarget);
            event.currentTarget.volume = 0.5;
            event.currentTarget.muted = false;
            setIsVideoPlaying(!event.currentTarget.paused);
            setVideoMuted(false);
            setVideoVolume(0.5);
          }}
          onTimeUpdate={(event) => {
            updateVideoProgress(event.currentTarget);
          }}
          onSeeked={(event) => {
            updateVideoProgress(event.currentTarget);
          }}
          onEnded={() => {
            setIsVideoPlaying(false);
          }}
        />
      );
    }

    if (asset.type === "audio") {
      return (
        <>
          {fallbackVisualImage ? (
            <Image src={fallbackVisualImage} alt={post.title} fill sizes="(max-width: 640px) 100vw, 920px" className="object-cover" />
          ) : (
            <span className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_45%),linear-gradient(130deg,#2b1642_0%,#6c2bb9_52%,#9333ea_100%)]" />
          )}

          <span className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-1 rounded-[6px] bg-black/65 px-3 py-1 text-xs font-semibold text-white">
            <Volume size={13} />
            Áudio
          </span>

          {isActive ? (
            <div className="absolute inset-x-4 bottom-4 rounded-[8px] border border-white/25 bg-black/35 px-3 py-2 backdrop-blur-md">
              <audio src={asset.url} controls preload="metadata" className="w-full" />
            </div>
          ) : null}
        </>
      );
    }

    return <Image src={asset.url} alt={post.title} fill sizes="(max-width: 640px) 100vw, 920px" className="object-cover" />;
  }

  if (isRemoved) {
    return null;
  }

  return (
    <div ref={postCardRef}>
      <Card id={`post-${post.id}`} className="overflow-hidden">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start gap-3">
          <Avatar src={authorAvatar} name={post.author?.name} size="md" />

          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 text-base font-semibold text-[var(--color-ink)]">{post.title}</p>
            <p className="line-clamp-1 text-xs text-black/65">
              {post.organization?.name ?? "-"} • {post.author?.stage_name ?? post.author?.name ?? "-"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-[6px] bg-black/5 px-2 py-1 text-[11px] font-semibold uppercase text-black/70">
              {mediaType === "video" ? <Play size={12} /> : <Volume2 size={12} />}
              {mediaType}
            </span>

            {showPostActionsMenu ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActionsMenuOpen((current) => !current)}
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-[6px] border border-black/10 bg-white text-black/70 transition hover:bg-black/[0.03]"
                  aria-label="Mais ações do episódio"
                >
                  <EllipsisVertical size={14} />
                </button>

                {actionsMenuOpen ? (
                  <div className="absolute right-0 top-10 z-30 min-w-[176px] rounded-[8px] border border-black/10 bg-white p-1 shadow-xl">
                    {canEditPost ? (
                      <Link
                        href={`/${locale}/post/${post.id}/editar`}
                        onClick={() => setActionsMenuOpen(false)}
                        className="flex h-9 items-center gap-2 rounded-[6px] px-3 text-sm font-medium text-[var(--color-ink)] hover:bg-black/5"
                      >
                        <PencilLine size={14} />
                        Editar episódio
                      </Link>
                    ) : null}

                    {canDeletePost ? (
                      <button
                        type="button"
                        onClick={() => void deletePost()}
                        disabled={deletingPost}
                        className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-[6px] px-3 text-left text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingPost ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        Excluir episódio
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        {postActionError ? <p className="text-xs text-red-700">{postActionError}</p> : null}
      </CardHeader>

      <div
        className="group/media relative h-[320px] w-full overflow-hidden bg-[linear-gradient(140deg,#2b1642_0%,#5f1d9b_52%,#9333ea_100%)] sm:h-[400px]"
        onDoubleClick={mediaType !== "audio" ? handleMediaDoubleClick : undefined}
      >
        {assets.length > 0 ? (
          <div
            className="flex h-full w-full transition-transform duration-500 ease-[cubic-bezier(0.22,0.9,0.22,1)]"
            style={{ transform: `translateX(-${trackTranslatePercent}%)` }}
          >
            {assets.map((asset, index) => (
              <div key={`${asset.path}-${index}`} className="relative h-full w-full shrink-0">
                {renderMediaAsset(asset, index)}
              </div>
            ))}
          </div>
        ) : visualImage ? (
          <Image src={visualImage} alt={post.title} fill sizes="(max-width: 640px) 100vw, 920px" className="object-cover" />
        ) : null}

        {showLikeBurst ? (
          <span className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
            <span className="feed-like-burst-ring absolute h-28 w-28 rounded-full" />
            <span className="feed-like-burst-glow absolute h-20 w-20 rounded-full" />
            <span className="feed-like-heart-pop inline-flex items-center justify-center">
              <span className="feed-like-heart-gradient text-[52px] leading-none">❤</span>
            </span>
          </span>
        ) : null}

        {mediaType === "video" && !isVideoPlaying ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              toggleVideoPlayPause();
            }}
            onDoubleClick={(event) => {
              event.stopPropagation();
            }}
            data-prevent-like-double-click="true"
            className="absolute left-1/2 top-1/2 z-20 inline-flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/48 text-white shadow-xl backdrop-blur-sm transition hover:scale-[1.04] hover:bg-black/56"
            aria-label="Reproduzir vídeo"
          >
            <Play size={24} className="ml-1" />
          </button>
        ) : null}

        {canShowMediaCarousel ? (
          <>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                goToPreviousMedia();
              }}
              onDoubleClick={(event) => {
                event.stopPropagation();
              }}
              data-prevent-like-double-click="true"
              className="absolute left-3 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/45 text-white opacity-100 backdrop-blur-sm transition hover:bg-black/60 sm:opacity-0 sm:group-hover/media:opacity-100 sm:group-focus-within/media:opacity-100"
              aria-label="Mídia anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                goToNextMedia();
              }}
              onDoubleClick={(event) => {
                event.stopPropagation();
              }}
              data-prevent-like-double-click="true"
              className="absolute right-3 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/45 text-white opacity-100 backdrop-blur-sm transition hover:bg-black/60 sm:opacity-0 sm:group-hover/media:opacity-100 sm:group-focus-within/media:opacity-100"
              aria-label="Próxima mídia"
            >
              <ChevronRight size={18} />
            </button>

            <span className="pointer-events-none absolute bottom-3 right-3 z-20 inline-flex items-center rounded-full bg-black/45 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
              {activeAssetIndex + 1}/{assets.length}
            </span>
          </>
        ) : null}
      </div>

      {mediaType === "video" && mediaUrl ? (
        <div className="space-y-1 border-t border-black/10 bg-black/[0.02] px-4 py-2">
          <button
            type="button"
            onClick={seekVideoTo}
            onMouseDown={(event) => {
              seekTimelineByClientX(event.currentTarget, event.clientX);
            }}
            onMouseEnter={handleTimelineHover}
            onMouseMove={handleTimelineHover}
            onMouseLeave={handleTimelineLeave}
            className="group/timeline relative block h-1.5 w-full cursor-pointer rounded-full bg-black/15"
            aria-label="Linha do tempo do vídeo"
          >
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-[var(--color-primary)]"
              style={{ width: `${videoProgressPercent}%` }}
            />
            {isTimelineHovering ? (
              <span
                className="pointer-events-none absolute -top-1 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white bg-[var(--color-primary)] shadow"
                style={{ left: `${timelineHoverPercent}%` }}
              />
            ) : null}
          </button>
          <div className="flex items-center justify-between gap-3 text-[11px] font-medium text-black/65">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={toggleVideoPlayPause}
                className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/10 text-black/75 transition hover:bg-black/15"
                aria-label={isVideoPlaying ? "Pausar vídeo" : "Reproduzir vídeo"}
              >
                {isVideoPlaying ? <Pause size={13} /> : <Play size={13} />}
              </button>
              <button
                type="button"
                onClick={toggleVideoMute}
                className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/10 text-black/75 transition hover:bg-black/15"
                aria-label={videoMuted ? "Ativar som" : "Silenciar vídeo"}
              >
                {videoMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={videoMuted ? 0 : videoVolume}
                onChange={changeVideoVolume}
                className="h-1.5 w-20 cursor-pointer accent-[var(--color-primary)] sm:w-24"
                aria-label="Volume do vídeo"
              />
              <span>
                {formatDuration(playedSeconds)} / {formatDuration(Math.round(videoDurationSeconds))}
              </span>
            </div>

            <button
              type="button"
              onClick={toggleVideoFullscreen}
              className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/10 text-black/75 transition hover:bg-black/15"
              aria-label="Tela cheia"
            >
              <Expand size={13} />
            </button>
          </div>
        </div>
      ) : null}

      <CardBody className="space-y-4 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-black/60">
          <span>
            <strong className="text-[var(--color-ink)]">{t.cards.workTitle}:</strong> {workTitle}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock3 size={13} />
            {formatDuration(post.duration_seconds)}
          </span>
        </div>

        {post.playlist ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-black/60">
            <span>
              <strong className="text-[var(--color-ink)]">Playlist:</strong>{" "}
              {post.organization?.slug ? (
                <Link
                  href={`/${locale}/playlists/${post.organization.slug}/${post.playlist.id}`}
                  className="font-semibold text-[var(--color-primary)] hover:underline"
                >
                  {post.playlist.title}
                </Link>
              ) : (
                <span>{post.playlist.title}</span>
              )}
            </span>
            {post.season ? (
              <span>
                <strong className="text-[var(--color-ink)]">Temporada:</strong> T{post.season.season_number}
                {post.season.title ? ` • ${post.season.title}` : ""}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {isAuthenticated ? (
                <Button variant="soft" size="md" type="button" onClick={() => void toggleLike()} disabled={submittingLike}>
                  <Heart size={14} className={liked ? "fill-current" : undefined} />
                  {t.actions.like}
                </Button>
              ) : null}

              {isAuthenticated && canShowComments ? (
                <Button variant="soft" size="md" type="button" onClick={() => setShowComposer((current) => !current)}>
                  <span className="text-xs font-semibold tabular-nums">{commentsCount}</span>
                  <MessageCircleMore size={14} />
                  {t.actions.comment}
                </Button>
              ) : null}

              <Button variant="soft" size="md" type="button" onClick={() => void toggleCollaboratorsPanel()}>
                <Sparkles size={14} />
                Colaboradores
                <ChevronDown size={13} className={`transition-transform ${showCollaborators ? "rotate-180" : ""}`} />
              </Button>
            </div>

            <Button variant="soft" size="md" type="button" onClick={sharePost} className="h-9 w-9 px-0" aria-label={t.actions.share}>
              <Share2 size={15} />
            </Button>
          </div>

          {showComposer && isAuthenticated && canShowComments ? (
            <div className="flex items-center gap-2">
              <Input
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                placeholder="Escreva um comentário..."
                className="h-9"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void submitComment();
                  }
                }}
              />
              <Button type="button" onClick={() => void submitComment()} disabled={submittingComment} className="h-9 px-3">
                {submittingComment ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
              </Button>
            </div>
          ) : null}
        </div>

        {showCollaborators ? (
          <div className="rounded-[6px] border border-black/10 bg-black/[0.025] px-3 py-2">
            {collaboratorsLoading ? (
              <p className="inline-flex items-center gap-2 text-sm text-black/65">
                <Loader2 size={14} className="animate-spin" />
                Carregando colaboradores...
              </p>
            ) : collaboratorsError ? (
              <p className="text-sm text-red-700">{collaboratorsError}</p>
            ) : collaboratorGroups.length === 0 ? (
              <p className="text-sm text-black/60">Este episódio ainda não possui colaboradores cadastrados.</p>
            ) : (
              <div className="space-y-2">
                {collaboratorGroups.map((group) => (
                  <p key={group.role} className="text-sm text-black/70">
                    <strong className="text-[var(--color-ink)]">{group.role}:</strong>{" "}
                    {group.people.map((person, index) => (
                      <span key={`${group.role}-${person.userId ?? person.name}-${index}`}>
                        {person.userId ? (
                          <Link href={`/${locale}/perfil/${person.userId}`} className="font-semibold text-[var(--color-primary)] hover:underline">
                            {person.name}
                          </Link>
                        ) : (
                          <span>{person.name}</span>
                        )}
                        {index < group.people.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </p>
                ))}
              </div>
            )}
          </div>
        ) : null}

        <div className="text-xs text-black/65">
          <Badge icon={<Play size={13} />} value={showViewsCount ? viewsCount : 0} />
        </div>

        {canShowComments ? (
          <div className="space-y-2 border-t border-black/10 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-black/55">Comentários</p>
            {comments.length === 0 ? (
              <p className="text-sm text-black/55">Nenhum comentário ainda.</p>
            ) : (
              <div className="space-y-2">
                {visibleComments.map((comment) => {
                  const replies = comment.replies ?? [];
                  const visibleRepliesLimit = getVisibleRepliesLimit(comment.id);
                  const visibleReplies = replies.slice(0, visibleRepliesLimit);
                  const canLoadMoreReplies = visibleRepliesLimit < replies.length;
                  const canCollapseReplies = visibleRepliesLimit > REPLIES_BATCH_SIZE;

                  return (
                    <div key={comment.id} className="rounded-[6px] bg-black/[0.04] px-3 py-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <Avatar
                            src={resolveMediaUrl(comment.user?.avatar_path)}
                            name={comment.user?.stage_name ?? comment.user?.name ?? "Usuário"}
                            size="sm"
                            className="rounded-full"
                          />
                          {comment.user?.id ? (
                            <Link
                              href={`/${locale}/perfil/${comment.user.id}`}
                              className="line-clamp-1 text-xs font-semibold text-[var(--color-ink)] hover:text-[var(--color-primary)]"
                            >
                              {comment.user?.stage_name ?? comment.user?.name ?? "Usuário"}
                            </Link>
                          ) : (
                            <p className="line-clamp-1 text-xs font-semibold text-[var(--color-ink)]">
                              {comment.user?.stage_name ?? comment.user?.name ?? "Usuário"}
                            </p>
                          )}
                        </div>
                        <p className="shrink-0 text-[11px] text-black/45">{formatCommentDate(comment.created_at, locale)}</p>
                      </div>
                      <p className="mt-1 text-sm text-black/75">{comment.body}</p>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        {isAuthenticated ? (
                          <button
                            type="button"
                            onClick={() => {
                              setReplyParentId((current) => (current === comment.id ? null : comment.id));
                              setReplyText("");
                            }}
                            className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-[6px] bg-white px-2.5 text-xs font-semibold text-[var(--color-ink)] ring-1 ring-black/10"
                          >
                            <MessageCircleMore size={12} />
                            Responder
                          </button>
                        ) : (
                          <span />
                        )}
                        <span className="text-[11px] text-black/45">{replies.length} respostas</span>
                      </div>

                      {replyParentId === comment.id && isAuthenticated ? (
                        <div className="mt-2 flex items-center gap-2">
                          <Input
                            value={replyText}
                            onChange={(event) => setReplyText(event.target.value)}
                            placeholder="Responder comentário"
                            className="h-9"
                            onKeyDown={(event) => {
                              if (event.key === "Enter" && !event.shiftKey) {
                                event.preventDefault();
                                void submitComment(comment.id);
                              }
                            }}
                          />
                          <Button
                            type="button"
                            onClick={() => void submitComment(comment.id)}
                            disabled={submittingReply}
                            className="h-9 px-3"
                          >
                            {submittingReply ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                          </Button>
                        </div>
                      ) : null}

                      {replies.length > 0 ? (
                        <div className="mt-3 space-y-2 border-l-2 border-black/10 pl-3">
                          {visibleReplies.map((reply) => (
                            <div key={reply.id} className="rounded-[6px] bg-white px-2.5 py-2">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-2">
                                  <Avatar
                                    src={resolveMediaUrl(reply.user?.avatar_path)}
                                    name={reply.user?.stage_name ?? reply.user?.name ?? "Usuário"}
                                    size="sm"
                                    className="rounded-full"
                                  />
                                  {reply.user?.id ? (
                                    <Link
                                      href={`/${locale}/perfil/${reply.user.id}`}
                                      className="line-clamp-1 text-xs font-semibold text-[var(--color-ink)] hover:text-[var(--color-primary)]"
                                    >
                                      {reply.user?.stage_name ?? reply.user?.name ?? "Usuário"}
                                    </Link>
                                  ) : (
                                    <p className="line-clamp-1 text-xs font-semibold text-[var(--color-ink)]">
                                      {reply.user?.stage_name ?? reply.user?.name ?? "Usuário"}
                                    </p>
                                  )}
                                </div>
                                <p className="shrink-0 text-[11px] text-black/45">{formatCommentDate(reply.created_at, locale)}</p>
                              </div>
                              <p className="mt-1 text-sm text-black/72">{reply.body}</p>
                            </div>
                          ))}

                          <div className="pt-1">
                            <p className="text-[11px] font-medium text-black/50">
                              Mostrando {Math.min(visibleReplies.length, replies.length)} de {replies.length} respostas
                            </p>
                            <div className="mt-1 flex items-center gap-3">
                              {canLoadMoreReplies ? (
                                <button
                                  type="button"
                                  onClick={() => loadMoreReplies(comment.id, replies.length)}
                                  className="inline-flex cursor-pointer items-center text-xs font-semibold text-[var(--color-primary)]"
                                >
                                  Carregar mais respostas
                                </button>
                              ) : null}
                              {canCollapseReplies ? (
                                <button
                                  type="button"
                                  onClick={() => collapseReplies(comment.id)}
                                  className="inline-flex cursor-pointer items-center text-xs font-semibold text-black/65"
                                >
                                  Ocultar respostas
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}

                <div className="pt-1">
                  <p className="text-[11px] font-medium text-black/50">
                    Mostrando {visibleCommentsCount} de {totalCommentsCount} comentários
                  </p>
                  <div className="mt-1 flex items-center gap-3">
                    {canLoadMoreComments ? (
                      <button
                        type="button"
                        onClick={() => void loadMoreComments()}
                        disabled={loadingMoreComments}
                        className="inline-flex cursor-pointer items-center text-xs font-semibold text-[var(--color-primary)] disabled:opacity-60"
                      >
                        {loadingMoreComments ? "Carregando..." : "Carregar mais"}
                      </button>
                    ) : null}
                    {canCollapseComments ? (
                      <button
                        type="button"
                        onClick={collapseComments}
                        className="inline-flex cursor-pointer items-center text-xs font-semibold text-black/65"
                      >
                        Ocultar comentários
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}

      </CardBody>

      {toastMessage ? (
        <span className="pointer-events-none fixed bottom-6 right-6 z-50 inline-flex items-center rounded-[8px] bg-[var(--color-ink)] px-3 py-2 text-xs font-semibold text-white shadow-xl">
          {toastMessage}
        </span>
      ) : null}
      </Card>
    </div>
  );
}

type CollaboratorGroup = {
  role: string;
  people: {
    name: string;
    userId: number | null;
  }[];
};

function groupCollaboratorCredits(credits: PostCredit[]): CollaboratorGroup[] {
  const grouped = new Map<string, CollaboratorGroup["people"]>();

  for (const credit of credits) {
    const role = (credit.character_name ?? "").trim();
    const name = (credit.dubber?.stage_name ?? credit.dubber?.name ?? credit.dubber_name ?? "").trim();
    const userId = credit.dubber?.id ?? credit.dubber_user_id ?? null;
    if (!role || !name) {
      continue;
    }

    const list = grouped.get(role) ?? [];
    const exists = list.some((person) => {
      if (userId !== null && person.userId !== null) {
        return person.userId === userId;
      }

      return person.name.toLocaleLowerCase() === name.toLocaleLowerCase();
    });

    if (!exists) {
      list.push({
        name,
        userId,
      });
    }
    grouped.set(role, list);
  }

  return Array.from(grouped.entries()).map(([role, people]) => ({
    role,
    people,
  }));
}

function Badge({ icon, value }: { icon: ReactNode; value: number }) {
  return (
    <span className="inline-flex items-center justify-center gap-1 rounded-[6px] bg-black/5 px-2 py-1">
      {icon}
      {value}
    </span>
  );
}

function formatDuration(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return "0:00";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatCommentDate(value: string | undefined, locale: Locale) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString(locale, {
    dateStyle: "short",
    timeStyle: "short",
  });
}
