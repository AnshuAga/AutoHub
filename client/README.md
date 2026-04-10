# AutoHub

AutoHub is a full-stack automobile operations and service management platform.
It supports customer flows, team operations, branch-based assignment control, analytics reporting, and PDF invoice/report exports.

## Core Modules

- Vehicle inventory management
- Customer management
- Booking management (vehicle sales flow)
- Delivery assignment and completion tracking
- Payment tracking and status management
- Service booking management with service categories
- Employee management with role and designation controls
- Reports and operational analytics dashboards
- User profile, feedback, and settings

## Tech Stack

### Frontend

- React 19
- Vite 8
- React Router
- Axios
- Recharts
- jsPDF + jspdf-autotable (PDF exports)
- Redux Toolkit (available in project dependencies)
- Formik + Yup
- Tailwind CSS (dependency available)

### Backend

- Node.js
- Express 5
- MongoDB + Mongoose
- JWT authentication
- bcryptjs for password hashing
- Nodemailer for email flows (OTP)
- CORS + dotenv

## Authentication Model

- Main login is customer-only.
- Team login is for non-customer users (admin, managers, mechanics, delivery staff, and related designations).
- JWT-based protected routes on frontend and backend.
- OTP-enabled login and registration flows are supported.

## Role and Branch Controls

- Admin and branch managers can assign mechanics and delivery staff.
- Branch managers are restricted to assigning only employees from their own branch.
- Mechanics and delivery staff see only operationally relevant data and actions.
- Visibility and actions are filtered by role/designation across dashboard and modules.

## Reporting and Exports

- Booking status breakdown and operational insights
- Conversion funnel metrics and bottleneck indicators
- Download options for reports (CSV/JSON/PDF)
- Professionally formatted PDF invoices for bookings and service bookings

## Project Structure

```
AutoHub/
	client/   # React frontend
	server/   # Express + MongoDB backend
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- MongoDB instance (local or cloud)

### 1. Install Dependencies

From project root:

```bash
cd client
npm install

cd ../server
npm install
```

### 2. Configure Environment Variables

Create a .env file inside server with at least:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

Add mail and OAuth variables if your environment uses OTP email and social authentication.

### 3. Run the Backend

```bash
cd server
npm run server
```

Or production mode:

```bash
npm start
```

### 4. Run the Frontend

```bash
cd client
npm run dev
```

Frontend default URL: http://localhost:5173

Backend default URL: http://localhost:5000

API base in frontend: http://localhost:5000/api

## Available Scripts

### Client

- npm run dev
- npm run build
- npm run preview
- npm run lint

### Server

- npm run server
- npm start

## API Routes (High Level)

Backend routes are mounted under /api:

- /api/auth
- /api/vehicles
- /api/customers
- /api/bookings
- /api/deliveries
- /api/payments
- /api/employees
- /api/services

## Notes

- Reports are lazy-loaded to improve initial load behavior.
- PDF libraries are dynamically imported during download actions to reduce initial bundle impact.
- If role or permission updates are made on backend, re-login may be required to refresh local session data.

## Future Enhancements

- Add automated tests (unit + integration)
- Add centralized error logging and monitoring
- Add Docker-based local setup
- Improve chunk splitting and advanced caching strategy
