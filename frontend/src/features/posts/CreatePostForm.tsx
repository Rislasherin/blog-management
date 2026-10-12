"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { postService } from "@/services/post.service";
import { Spinner } from "@/components/ui/Spinner";

const VALID_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export function CreatePostForm() {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  
  // Track touched fields for UX feedback
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
    if (!touched.title && title.length === 0) return "";
    if (trimmedTitle.length === 0) return "Title is required and cannot be empty.";
    if (trimmedTitle.length < 3) return `Title must be at least 3 characters (${3 - trimmedTitle.length} more needed).`;
    if (trimmedTitle.length > 150) return `Title cannot exceed 150 characters (${trimmedTitle.length - 150} over).`;
    return "";
  }, [trimmedTitle, touched.title, title.length]);

  const subtitleError = useMemo(() => {
    if (subtitle.length > 200) return `Subtitle cannot exceed 200 characters (${subtitle.length - 200} over).`;
    return "";
  }, [subtitle.length]);

  const contentError = useMemo(() => {
    if (!touched.content && content.length === 0) return "";
    if (trimmedContent.length === 0) return "Content is required and cannot be empty.";
    if (trimmedContent.length < 10) return `Content must be at least 10 characters (${10 - trimmedContent.length} more needed).`;
    if (trimmedContent.length > 10000) return `Content cannot exceed 10,000 characters.`;
    return "";
  }, [trimmedContent, touched.content, content.length]);

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
      setImageError("Image file size must be less than 5 MB.");
      setImage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setImageError("");
    setImage(file);
  };

  const removeImage = () => {
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
      const response = await postService.createPost({
        title: trimmedTitle,
        subtitle: trimmedSubtitle.length > 0 ? trimmedSubtitle : undefined,
        content: trimmedContent,
        image: image || undefined,
      });
      const createdPost = response.data;
      router.push(`/posts/${createdPost.id}`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while creating the post.";

      setSubmitError(message);
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
          placeholder="Give your post a clear title (min 3 characters)"
          aria-invalid={!!titleError}
          aria-describedby={titleError ? "title-error" : undefined}
          className={`field font-serif text-lg ${titleError ? "border-danger focus:ring-danger/20" : isTitleValid ? "border-line" : ""}`}
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
          placeholder="Brief summary or catchphrase (optional)"
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
            Optional. Maximum 200 characters.
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
          placeholder="Start writing your thoughts... (min 10 characters)"
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
            Minimum 10 characters required. Supports clean formatting.
          </p>
        )}
      </div>

      {/* Cover Image Upload */}
      <div>
        <label htmlFor="image" className="field-label">
          Cover image <span className="font-normal text-subtle">(optional)</span>
        </label>
        <div className={`rounded-xl border border-dashed bg-background/60 p-5 transition-colors duration-200 ${imageError ? "border-danger" : "border-line hover:border-accent/60 focus-within:border-accent"}`}>
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
                📎 {image.name} ({(image.size / (1024 * 1024)).toFixed(2)} MB)
              </span>
              <button
                type="button"
                onClick={removeImage}
                disabled={loading}
                className="text-xs text-danger hover:underline ml-2"
              >
                Remove
              </button>
            </div>
          ) : (
            <p id="image-hint" className="mt-3 text-xs text-subtle">
              Allowed: JPG, PNG, or WebP · Maximum size: 5 MB
            </p>
          )}
          {imageError && (
            <p id="image-error" className="mt-2 text-xs text-danger font-medium">
              {imageError}
            </p>
          )}
        </div>
      </div>

      {/* Form Validation Checklist / Status & Submit Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-line pt-6">
        <div className="text-xs text-subtle flex flex-wrap gap-x-4 gap-y-1">
          <span className={isTitleValid ? "text-emerald-600 font-medium" : "text-subtle"}>
            {isTitleValid ? "✓ Title ready" : "○ Title (3–150 chars)"}
          </span>
          <span className={isContentValid ? "text-emerald-600 font-medium" : "text-subtle"}>
            {isContentValid ? "✓ Content ready" : "○ Content (min 10 chars)"}
          </span>
        </div>

        <button
          type="submit"
          disabled={!isFormValid || loading}
          title={!isFormValid ? "Please fill in all required fields to publish" : "Publish your post"}
          className="btn btn-primary w-full sm:w-auto sm:px-8 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Spinner className="h-4 w-4" />
              Publishing...
            </>
          ) : (
            "Publish Post"
          )}
        </button>
      </div>
    </form>
  );
}