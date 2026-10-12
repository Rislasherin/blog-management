"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { postService } from "@/services/post.service";
import { ApiError } from "@/services/api-client";
import { Spinner } from "@/components/ui/Spinner";
import type { Post } from "@/types/post.types";

const VALID_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

interface EditPostFormProps {
  post: Post;
}

export function EditPostForm({ post }: EditPostFormProps) {
  const [title, setTitle] = useState(post.title);
  const [subtitle, setSubtitle] = useState(post.subtitle ?? "");
  const [content, setContent] = useState(post.content);
  const [image, setImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [touched, setTouched] = useState({
    title: false,
    subtitle: false,
    content: false,
  });

  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trimmed values for strict validation
  const trimmedTitle = useMemo(() => title.trim(), [title]);
  const trimmedSubtitle = useMemo(() => subtitle.trim(), [subtitle]);
  const trimmedContent = useMemo(() => content.trim(), [content]);

  // Field validation rules
  const isTitleValid = trimmedTitle.length >= 3 && trimmedTitle.length <= 150;
  const isSubtitleValid = trimmedSubtitle.length <= 200;
  const isContentValid = trimmedContent.length >= 10 && trimmedContent.length <= 10000;
  const isImageValid = !imageError;

  // Complete form validation flag
  const isFormValid = isTitleValid && isSubtitleValid && isContentValid && isImageValid;

  // Error messages
  const titleError = useMemo(() => {
    if (!touched.title && title === post.title) return "";
    if (trimmedTitle.length === 0) return "Title is required and cannot be empty.";
    if (trimmedTitle.length < 3) return `Title must be at least 3 characters (${3 - trimmedTitle.length} more needed).`;
    if (trimmedTitle.length > 150) return `Title cannot exceed 150 characters (${trimmedTitle.length - 150} over).`;
    return "";
  }, [trimmedTitle, touched.title, title, post.title]);

  const subtitleError = useMemo(() => {
    if (subtitle.length > 200) return `Subtitle cannot exceed 200 characters (${subtitle.length - 200} over).`;
    return "";
  }, [subtitle.length]);

  const contentError = useMemo(() => {
    if (!touched.content && content === post.content) return "";
    if (trimmedContent.length === 0) return "Content is required and cannot be empty.";
    if (trimmedContent.length < 10) return `Content must be at least 10 characters (${10 - trimmedContent.length} more needed).`;
    if (trimmedContent.length > 10000) return `Content cannot exceed 10,000 characters.`;
    return "";
  }, [trimmedContent, touched.content, content, post.content]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImage(null);
      setImageError("");
      return;
    }

    if (!VALID_IMAGE_TYPES.includes(file.type)) {
      setImageError("Only JPEG, PNG, and WebP images are allowed.");
      setImage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setImageError("Image must be smaller than 5 MB.");
      setImage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setImageError("");
    setImage(file);
  };

  const removeNewImage = () => {
    setImage(null);
    setImageError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setTouched({ title: true, subtitle: true, content: true });

    if (!isFormValid) {
      return;
    }

    setLoading(true);

    try {
      await postService.updatePost(post.id, {
        title: trimmedTitle,
        subtitle: trimmedSubtitle,
        content: trimmedContent,
        image: image || undefined,
      });
      router.push(`/posts/${post.id}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.message);
      } else {
        setSubmitError("An unexpected error occurred while updating the post.");
      }
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-7" aria-busy={loading}>
      {submitError && (
        <div role="alert" className="alert-danger flex items-center justify-between">
          <span>{submitError}</span>
          <button
            type="button"
            onClick={() => setSubmitError("")}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Title Field */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="title" className="field-label mb-0">
            Title <span className="text-danger">*</span>
          </label>
          <span className={`text-xs ${trimmedTitle.length > 150 ? "text-danger font-semibold" : "text-subtle"}`}>
            {trimmedTitle.length} / 150 chars
          </span>
        </div>
        <input
          id="title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => setTouched((prev) => ({ ...prev, title: true }))}
          maxLength={170}
          disabled={loading}
          placeholder="Give your post a clear title"
          aria-invalid={!!titleError}
          aria-describedby={titleError ? "title-error" : undefined}
          className={`field font-serif text-lg ${titleError ? "border-danger focus:ring-danger/20" : ""}`}
        />
        {titleError ? (
          <p id="title-error" className="mt-1.5 text-xs text-danger font-medium">
            {titleError}
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-subtle">
            Must be between 3 and 150 characters.
          </p>
        )}
      </div>

      {/* Subtitle Field */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="subtitle" className="field-label mb-0">
            Subtitle <span className="font-normal text-subtle">(optional)</span>
          </label>
          <span className={`text-xs ${subtitle.length > 200 ? "text-danger font-semibold" : "text-subtle"}`}>
            {subtitle.length} / 200 chars
          </span>
        </div>
        <input
          id="subtitle"
          type="text"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          onBlur={() => setTouched((prev) => ({ ...prev, subtitle: true }))}
          maxLength={220}
          disabled={loading}
          placeholder="Add a catchy subtitle or summary (optional)"
          aria-invalid={!!subtitleError}
          aria-describedby={subtitleError ? "subtitle-error" : undefined}
          className={`field ${subtitleError ? "border-danger focus:ring-danger/20" : ""}`}
        />
        {subtitleError ? (
          <p id="subtitle-error" className="mt-1.5 text-xs text-danger font-medium">
            {subtitleError}
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-subtle">
            Optional. Maximum 200 characters. Leave empty to clear.
          </p>
        )}
      </div>

      {/* Content Field */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="content" className="field-label mb-0">
            Content <span className="text-danger">*</span>
          </label>
          <span className={`text-xs ${trimmedContent.length > 10000 ? "text-danger font-semibold" : "text-subtle"}`}>
            {trimmedContent.length.toLocaleString()} / 10,000 chars
          </span>
        </div>
        <textarea
          id="content"
          required
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={() => setTouched((prev) => ({ ...prev, content: true }))}
          disabled={loading}
          placeholder="Start writing..."
          rows={12}
          aria-invalid={!!contentError}
          aria-describedby={contentError ? "content-error" : undefined}
          className={`field resize-y leading-7 ${contentError ? "border-danger focus:ring-danger/20" : ""}`}
        />
        {contentError ? (
          <p id="content-error" className="mt-1.5 text-xs text-danger font-medium">
            {contentError}
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-subtle">
            Minimum 10 characters required.
          </p>
        )}
      </div>

      {/* Cover Image Upload / Preview */}
      <div>
        <p className="field-label mb-2">Cover image</p>

        {post.imageUrl && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold text-muted">Current cover image:</p>
            <div className="relative aspect-[16/9] w-full max-w-sm overflow-hidden rounded-xl border border-line bg-background shadow-sm">
              <Image
                src={post.imageUrl}
                alt="Current cover image"
                fill
                sizes="(min-width: 640px) 384px, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        )}

        <div className={`rounded-xl border border-dashed bg-background/60 p-5 transition-colors duration-200 ${imageError ? "border-danger" : "border-line hover:border-accent/60 focus-within:border-accent"}`}>
          <label htmlFor="image" className="sr-only">
            Choose a new cover image
          </label>
          <input
            id="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
            ref={fileInputRef}
            disabled={loading}
            aria-invalid={!!imageError}
            aria-describedby={imageError ? "image-error" : "image-hint"}
            className="block w-full cursor-pointer text-sm text-muted file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-accent-soft file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-accent hover:file:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-50"
          />
          {image ? (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-surface px-3 py-2 border border-line">
              <span className="text-xs font-medium text-foreground truncate max-w-xs sm:max-w-md">
                📎 Replacement: {image.name} ({(image.size / (1024 * 1024)).toFixed(2)} MB)
              </span>
              <button
                type="button"
                onClick={removeNewImage}
                disabled={loading}
                className="text-xs text-danger hover:underline ml-2"
              >
                Cancel replace
              </button>
            </div>
          ) : (
            <p id="image-hint" className="mt-3 text-xs text-subtle">
              {post.imageUrl ? "Select a new image above to replace the current cover. " : ""}JPG, PNG or WebP · Max 5 MB
            </p>
          )}
          {imageError && (
            <p id="image-error" className="mt-2 text-xs text-danger font-medium">
              {imageError}
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons with Complete Validation Control */}
      <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-subtle flex flex-wrap gap-x-4 gap-y-1">
          <span className={isTitleValid ? "text-emerald-600 font-medium" : "text-subtle"}>
            {isTitleValid ? "✓ Valid Title" : "○ Title (3–150 chars)"}
          </span>
          <span className={isContentValid ? "text-emerald-600 font-medium" : "text-subtle"}>
            {isContentValid ? "✓ Valid Content" : "○ Content (min 10 chars)"}
          </span>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => router.back()}
            className="btn btn-secondary sm:px-6"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isFormValid || loading}
            title={!isFormValid ? "Please resolve form errors before saving" : "Save Changes"}
            className="btn btn-primary sm:px-8 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Spinner className="h-4 w-4" />
                Saving changes...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>
    </form>
  );
}