# Blog Management Platform

A robust, secure, and production-ready backend API for a Blog Management system.

The application uses layered architecture, repository abstractions, indexed pagination, validation, centralized error handling, and automated tests to provide a maintainable foundation for further scaling.

## Features

* JWT authentication
* User registration/login
* Post CRUD
* Owner-only update/delete
* Public post viewing
* Image upload with Cloudinary storage
* Pagination
* Zod Validation
* Rate limiting
* Security middleware (Helmet, CORS)
* Centralized Error Handling
* Automated integration and unit tests

## Tech Stack

* Node.js
* Express.js
* TypeScript
* MongoDB / Mongoose
* JWT / bcrypt
* Zod
* Cloudinary / Multer
* Pino
* Vitest / Supertest

## Architecture

The system strictly adheres to the dependency inversion principle and follows a clean layer separation:
```text
Routes
→ Middleware
→ Controllers
→ Services
→ Repositories / Storage
→ Infrastructure
```
Business logic operates inside the `Service` layer, completely decoupled from database models and HTTP request objects. Data persistence is managed by a Repository Pattern, and Cloudinary operations are safely hidden behind a storage abstraction.

## Setup

Install dependencies:
```bash
npm install
```

Create a `.env` file based on the provided `.env.example`:
```env
PORT=2000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=3600

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Run in development mode:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

## Tests

Execute the automated Vitest test suite:
```bash
npm test
```

## TypeScript

Verify strict type compliance:
```bash
npx tsc --noEmit
```

## API Endpoints

### Auth
* `POST /api/auth/register` (Public)
* `POST /api/auth/login` (Public)

### Posts
* `GET /api/posts` (Public) - Supports Pagination
* `GET /api/posts/:id` (Public)
* `GET /api/posts/author/:authorId` (Public) - Supports Pagination
* `POST /api/posts` (**Protected**) - Requires `Authorization: Bearer <token>`
* `PATCH /api/posts/:id` (**Protected**, Owner only) - Requires `Authorization: Bearer <token>`
* `DELETE /api/posts/:id` (**Protected**, Owner only) - Requires `Authorization: Bearer <token>`

### Uploads
For `POST /api/posts` and `PATCH /api/posts/:id`, an image can be attached under the `image` multipart form field.
* Accepted types: JPEG, PNG, WEBP
* Max size: 5 MB

### Pagination
Append `page` and `limit` to `GET` requests for efficient, DB-driven pagination:
```text
GET /api/posts?page=1&limit=10
```
