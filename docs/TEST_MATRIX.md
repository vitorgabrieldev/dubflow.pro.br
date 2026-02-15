# Test Matrix

This document defines automated test coverage targets by domain to keep business rules stable and prevent regressions during deploys.

## Current Automated Coverage

- Unit tests:
  - `tests/Unit/OrganizationAccessTest.php`
- Backend feature/API tests:
  - `tests/Feature/AuthApiTest.php`
  - `tests/Feature/OrganizationApiTest.php`
  - `tests/Feature/OrganizationInviteApiTest.php`
  - `tests/Feature/PostPublishingApiTest.php`
  - `tests/Feature/PostPermissionMatrixApiTest.php`
  - `tests/Feature/NotificationApiTest.php`
  - `tests/Feature/UserProfileApiTest.php`

## Coverage Targets (100% Business-Rule Oriented)

### Auth
- Register validation and uniqueness
- Login success/failure
- Refresh/logout lifecycle
- Change password invalidates active sessions
- Forgot/reset password flow and invalid token paths

### User Profile
- Profile update validation (text + arrays + media)
- Private profile visibility rules
- Follow/unfollow user rules

### Communities
- Create/update organization validation (including unique name)
- Visibility rules for public/private communities
- Follow/unfollow community
- Join request and ban constraints

### Members & Roles
- Invite by user search
- Invite accept/reject/cancel/re-send
- Role changes (owner-only)
- Ban vs expel rules
- Collaborator limitations against collaborator
- Owner transfer request/accept/reject flows

### Invite Links
- Create/list/revoke invite links
- Accept active invite
- Reject expired/revoked/exhausted invite

### Playlists
- Role-based creation/update/deletion
- Required year and validation boundaries
- Season creation rules
- Prevent deleting playlists with episodes

### Posts
- Publish with media assets
- Publish standalone and with playlist/season constraints
- Edit/delete permission matrix by role and ownership
- Media validation and limits
- Visibility and feed access rules

### Comments
- Creation and moderation permissions
- Two-level nesting limit
- Reply notifications to root-comment author
- Community comment notifications

### Notifications
- Listing + unread count
- Mark read/mark all read
- Invite accepted state transition
- Delete one / clear all
- Invalid notification action paths

### Frontend Quality Gates
- `eslint` and production build
- Playwright smoke flow during CI/deploy quality gates

