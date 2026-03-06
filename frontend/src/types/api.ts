export type ApiList<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type UserPreview = {
  id: number;
  name: string;
  username: string | null;
  avatar_path: string | null;
  stage_name?: string | null;
};

export type Organization = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  avatar_path: string | null;
  cover_path?: string | null;
  is_verified: boolean;
  is_public?: boolean;
  owner?: UserPreview;
  followers_count?: number;
  posts_count?: number;
  playlists_count?: number;
  viewer?: {
    is_following: boolean;
    membership_status: "active" | "pending" | null;
    role: "owner" | "admin" | "editor" | "member" | null;
    can_request_join: boolean;
    can_view?: boolean;
  };
};

export type Playlist = {
  id: number;
  organization_id: number;
  title: string;
  slug: string;
  description: string | null;
  work_title: string | null;
  season_number: number | null;
  release_year: number | null;
  visibility: "public" | "private" | "unlisted";
  posts_count?: number;
  seasons_count?: number;
  created_at?: string;
  organization?: Pick<Organization, "id" | "name" | "slug" | "avatar_path" | "is_verified"> & {
    owner?: UserPreview;
  };
};

export type PlaylistSeason = {
  id: number;
  playlist_id: number;
  season_number: number;
  title: string | null;
  episodes_count?: number;
  created_at?: string;
};

export type PostCredit = {
  id: number;
  character_name: string | null;
  dubber_name: string | null;
  dubber_user_id: number | null;
  display_order: number;
  dubber?: UserPreview;
};

export type PostComment = {
  id: number;
  body: string;
  created_at: string;
  parent_id?: number | null;
  user?: UserPreview;
  replies?: PostComment[];
};

export type PostCollaborator = {
  id: number;
  status: "pending" | "accepted" | "rejected";
  user?: UserPreview;
};

export type Post = {
  id: number;
  organization_id: number;
  title: string;
  description: string | null;
  media_path?: string;
  media_type: "audio" | "video" | "image";
  thumbnail_path: string | null;
  duration_seconds: number;
  allow_comments?: boolean;
  language_code: string;
  visibility: "public" | "private" | "unlisted";
  published_at: string | null;
  likes_count: number;
  comments_count: number;
  views_count: number;
  viewer_has_liked?: boolean;
  organization?: Organization;
  author?: UserPreview;
  collaborators?: PostCollaborator[];
  credits?: PostCredit[];
  comments?: PostComment[];
  playlist?: Pick<Playlist, "id" | "title" | "slug">;
  season?: Pick<PlaylistSeason, "id" | "season_number" | "title"> | null;
  metadata?: {
    work_title?: string;
    publish_target?: "community" | "profile";
    requires_collaborator_approval?: boolean;
    assets?: {
      path: string;
      type: "audio" | "video" | "image";
      mime?: string | null;
      size_bytes?: number;
    }[];
    display_metrics?: {
      show_likes?: boolean;
      show_views?: boolean;
    };
  };
  viewer_permissions?: {
    can_edit?: boolean;
    can_delete?: boolean;
  };
};

export type NotificationItem = {
  id: string;
  type: string;
  read_at: string | null;
  created_at: string;
  data?: {
    type?: string;
    title?: string;
    message?: string;
    icon?: string;
    image?: string | null;
    click_action?: string | null;
    organization_slug?: string;
    role?: string;
    invite_status?: string;
    meta?: {
      organization_slug?: string;
      role?: string;
      invite_status?: string;
      conversation_id?: number;
      message_id?: number;
      sender_user_id?: number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
};

export type ChatAttachment = {
  id: number;
  media_path: string;
  media_type: "audio" | "video" | "image" | "file";
  mime?: string | null;
  original_name?: string | null;
  size_bytes?: number | null;
};

export type ChatMessage = {
  id: number;
  conversation_id: number;
  sender_user_id: number;
  recipient_user_id: number;
  body: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  is_edited: boolean;
  edited_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  status: "sent_not_received" | "received_unread" | "received_read" | "not_received" | "read" | null;
  sender?: UserPreview | null;
  attachments: ChatAttachment[];
};

export type ChatConversation = {
  id: number;
  peer: (UserPreview & { is_private?: boolean; custom_name?: string | null }) | null;
  last_message: ChatMessage | null;
  unread_count: number;
  is_blocked_by_me: boolean;
  has_blocked_me: boolean;
  updated_at: string | null;
};


export type DashboardOverview = {
  summary: {
    total_posts: number;
    total_views: number;
    total_likes: number;
    total_comments: number;
    pending_collaboration_invites: number;
  };
  organizations: Organization[];
  top_posts: Post[];
};

export type RisingDubberInsight = {
  id: number;
  name: string;
  username: string | null;
  avatar_path: string | null;
  score: number;
  metrics: {
    episodes_launched: number;
    episode_comments: number;
    episode_likes: number;
    posting_days: number;
    posting_consistency: number;
    role_submissions: number;
    tests_created: number;
  };
};

export type PublishOrganizationOption = Pick<Organization, "id" | "name" | "slug" | "avatar_path" | "is_verified"> & {
  playlists: (Playlist & {
    seasons?: PlaylistSeason[];
  })[];
};

export type DubbingTestAppearanceEstimate =
  | "protagonista"
  | "coadjuvante"
  | "pontas"
  | "figurante"
  | "voz_adicional";

export type DubbingTestVisibility = "internal" | "external";
export type DubbingTestStatus = "draft" | "published" | "closed" | "results_released" | "archived";

export type DubbingTestMedia = {
  id: number;
  dubbing_test_id: number;
  media_path: string;
  media_type: "audio" | "video" | "image" | "file";
  sort_order?: number;
  size_bytes?: number;
};

export type DubbingTestCharacter = {
  id: number;
  dubbing_test_id: number;
  name: string;
  description?: string | null;
  expectations?: string | null;
  appearance_estimate: DubbingTestAppearanceEstimate;
  position?: number;
};

export type DubbingTest = {
  id: number;
  organization_id: number;
  created_by_user_id: number;
  title: string;
  description: string | null;
  visibility: DubbingTestVisibility;
  status: DubbingTestStatus;
  starts_at: string;
  ends_at: string;
  results_release_at: string;
  created_at?: string;
  organization?: Pick<Organization, "id" | "name" | "slug" | "avatar_path">;
  characters?: DubbingTestCharacter[];
  media?: DubbingTestMedia[];
  characters_count?: number;
  submissions_count?: number;
};

export type DubbingTestSubmissionStatus = "submitted" | "approved" | "reserve" | "rejected";

export type DubbingTestSubmissionMedia = {
  id: number;
  submission_id: number;
  media_path: string;
  media_type: "audio" | "video" | "image" | "file";
};

export type DubbingTestSubmission = {
  id: number;
  dubbing_test_id: number;
  character_id: number;
  user_id: number;
  cover_letter: string | null;
  status: DubbingTestSubmissionStatus;
  effective_status?: DubbingTestSubmissionStatus;
  reviewed_by_user_id?: number | null;
  reviewed_at?: string | null;
  visible_to_candidate_at?: string | null;
  rejection_feedback?: string | null;
  created_at?: string;
  user?: UserPreview;
  reviewer?: UserPreview;
  character?: Pick<DubbingTestCharacter, "id" | "name" | "appearance_estimate">;
  media?: DubbingTestSubmissionMedia[];
};

export type AchievementLevel = {
  id: number;
  level: number;
  threshold: number;
  title: string | null;
  description: string | null;
  rarity: string | null;
  icon: string | null;
  color_start: string | null;
  color_end: string | null;
  valid_for_days: number | null;
  is_unlocked: boolean;
  holders_count: number;
  holders_percentage: number;
};

export type AchievementItem = {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  metric_key: string;
  rarity: string;
  icon: string;
  color_start: string;
  color_end: string;
  is_hidden: boolean;
  progress: {
    value: number;
    next_threshold: number | null;
    remaining_to_next: number;
  };
  user_status: {
    is_unlocked: boolean;
    highest_level: number;
    unlocked_at: string | null;
    expires_at: string | null;
  };
  stats: {
    holders_count: number;
    holders_percentage: number;
  };
  levels: AchievementLevel[];
};

export type AchievementCatalogResponse = {
  summary: {
    total_achievements: number;
    unlocked_achievements: number;
    total_users: number;
  };
  items: AchievementItem[];
};

export type AchievementFeedItem = {
  id: number;
  level: number;
  unlocked_at: string;
  definition?: {
    id: number;
    slug: string;
    title: string;
    description: string | null;
    category: string;
    rarity: string;
    icon: string;
    color_start: string;
    color_end: string;
  };
  level_definition?: {
    id: number;
    level: number;
    threshold: number;
    title: string | null;
    description: string | null;
    rarity: string | null;
    icon: string | null;
    color_start: string | null;
    color_end: string | null;
  };
};
