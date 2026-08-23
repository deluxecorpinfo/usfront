# Universal School — Foundation Architecture

## Product principle
Universal School is not a YouTube or Instagram clone. It separates identity, learning content, rooms and social relationships so each can evolve independently.

## Core bounded contexts
1. **Identity & Profiles** — one account, primary role (`learner` or `educator`), educator subtype, learning interests, study context, biography signals, and a separate view mode so educators can enter learner mode without a second account.
2. **Content & Video** — future video assets, chapters, subtitles, dubbing tracks, podcast-only playback, transcripts and AI-derived artifacts.
3. **Rooms** — ordered collections of content that can act as classes, courses, playlists or communities. Rooms are first-class objects rather than simple playlists.
4. **Social Graph** — future follow relationships, comments, reactions, saves, shares, direct messages and notifications.
5. **Discovery** — ranking layer that consumes explicit interests, profile context and later behavioral signals. It must not own profile or content data.
6. **AI Services** — future adapter layer for transcription, translation, dubbing, summaries, notes, diagrams, quizzes and tutoring. Providers can be replaced without rewriting product domains.

## Current MVP data
Profile: role, educatorType, organizationType, interests, studyField, educationLevel, voiceBio, identity metadata.

## Current deployed client
Mobile-first React web client. It is the fastest test shell for real phone use. Domain boundaries are deliberately kept portable so a React Native + Expo client can later consume the same product model without redefining roles or onboarding.

## Future production target
- Mobile: React Native + Expo + TypeScript
- Web: React / Next.js
- API: Node.js TypeScript services
- Primary relational database: PostgreSQL
- Video: managed transcoding/CDN provider behind a provider adapter
- Object storage: media originals, thumbnails and AI artifacts
- Search: hybrid text/vector index
- Realtime: direct messages, presence and notifications
- Moderation: policy service + human review queues

## Invariants
- Educator is an account capability; learner mode is always available to an educator.
- Organizations are educator profiles, not a different authentication system.
- A Room can contain video and podcast playback representations of the same content.
- AI output is derived data and never replaces the canonical original video or transcript.
- Recommendation signals are versioned and separate from identity data.
- Media providers and AI providers are replaceable adapters.
