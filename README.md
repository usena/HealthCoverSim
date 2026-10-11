# HealthCoverSim — Private Health Insurance Quote Simulator

## 1. Project Overview

HealthCoverSim is a full-stack web application that simulates private health insurance quotes. Users can create, view, edit, search, and delete quote records. The application calculates estimated monthly and yearly premiums based on the selected cover type, hospital cover, extras cover, applicants' ages and hospital cover histories, Lifetime Health Cover (LHC) loading, family upgrade fee, and annual-payment discount.

This project was developed for **Assignment 1 — HealthCoverSim**, CSE3CWA / CSE5006, Semester 2, 2026.

**Important:** This application is a learning simulator only. It is not financial advice and does not represent the actual pricing of any health insurance provider.

## 2. Technologies Used

- **Frontend:** React, Vite, CSS
- **Backend:** Node.js, Express
- **Database:** SQLite
- **Programming languages:** JavaScript, SQL

## 3. Features

### Quote Management

- Create new insurance quotes.
- View a list of saved quotes and their detailed premium breakdowns.
- Edit and update existing quotes.
- Delete quotes.
- Search quotes by customer name, quote ID, or cover type.
- Store quote records persistently in an SQLite database.
- Display quotes in chronological order, oldest first.

### Quote Inputs

Each quote supports the following information:

| Input | Available options |
|---|---|
| Customer name | Required text field |
| Cover type | Single, Couple, Family |
| Applicant 1 age | 18–100 |
| Applicant 1 hospital cover history | Yes, No, Not sure |
| Applicant 2 age | Required for Couple and Family |
| Applicant 2 hospital cover history | Required for Couple and Family |
| Hospital cover | None, Basic, Bronze, Silver, Gold |
| Extras cover | None, Basic, Standard, Premium |
| Payment frequency | Monthly, Yearly |
| Annual discount | 0–10%, applicable to yearly payments only |
| Notes | Optional |

Applicant 2's fields are displayed only when Couple or Family cover is selected. For Single cover, the second applicant's information is stored as NULL.

## 4. Installation and Setup

### Prerequisites

Install the following software before running the project:

- Node.js and npm
- A code editor such as Visual Studio Code
- SQLite (optional if the application initializes its database automatically)

### Step 1: Clone or download the project

Clone the GitHub repository:

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd HealthCoverSim
```

Alternatively, download the repository ZIP file and extract it.

### Step 2: Install backend dependencies

Open a terminal in the project root and run:

```bash
cd backend
npm install
```

### Step 3: Initialize the database

The project includes `init.sql`, which defines the SQLite database schema, constraints, and default hospital and extras cover prices.

Ensure that the backend's database initialization code executes `init.sql` when setting up the database. If the database is initialized manually instead, run the SQL file using the SQLite CLI from the project root, adjusting the database path to match your configuration:

```bash
sqlite3 backend/healthcoversim.db < init.sql
```

If your backend already initializes the database automatically, you do not need to run this command separately.

### Step 4: Start the backend

From the `backend` directory, run:

```bash
node server.js
```

The Express API should start on:

```text
http://localhost:3000
```

### Step 5: Install frontend dependencies

Open a second terminal and run:

```bash
cd HealthCoverSim/frontend
npm install
```

If the terminal is already in the project root, use:

```bash
cd frontend
npm install
```

### Step 6: Start the frontend

From the `frontend` directory, run:

```bash
npm run dev
```

Open the local URL displayed by Vite, normally:

```text
http://localhost:5173
```

Keep both the backend and frontend terminals running while using the application.

**Note:** The commands above assume the frontend and backend use the folder structure shown in this README. The database filename, initialization path, and npm scripts should match the actual project files.

## 5. Database Design

The application uses SQLite to store quote records and the available cover prices.

### `quotes`

Stores customer information, cover selections, applicant details, payment preferences, annual discount, optional notes, and creation timestamps.

Important fields include:

- `id`: Unique quote identifier.
- `customer_name`: Customer's name.
- `cover_type`: Single, Couple, or Family.
- `applicant1_age` and `applicant1_cover_history`: First applicant's details.
- `applicant2_age` and `applicant2_cover_history`: Second applicant's details when applicable.
- `hospital_cover`: Selected hospital cover tier.
- `extras_cover`: Selected extras cover tier.
- `payment_frequency`: Monthly or Yearly.
- `annual_discount`: Annual-payment discount percentage.
- `notes`: Optional customer notes.
- `created_at`: Quote creation timestamp.

### `hospital_cover_prices`

Stores the base monthly hospital premium for each cover tier.

### `extras_cover_prices`

Stores the base monthly extras premium for each cover tier.

The cover prices are stored separately from quote records to keep pricing information organized and consistent. Database constraints also help prevent invalid values from being stored.

## 6. Premium Calculation Logic

All base prices are monthly prices per adult.

### Hospital Cover

| Cover level | Price per adult/month |
|---|---:|
| None | $0 |
| Basic | $90 |
| Bronze | $120 |
| Silver | $160 |
| Gold | $220 |

LHC loading is calculated separately for each applicant and applies only to hospital cover.

- **Yes:** 0% loading.
- **No:** If the applicant is older than 30 and hospital cover is selected, loading is calculated as `(age − 30) × 2%`. Otherwise, it is 0%.
- **Not sure:** No loading is applied, but a warning explains that the quote may be inaccurate.
- **Hospital cover None:** No LHC loading is applied.

The hospital premium for each applicant is:

`Base hospital price × (1 + LHC loading percentage / 100)`

The total hospital premium is the sum of the applicable premiums for the adults covered by the policy.

### Extras Cover

| Cover level | Price per adult/month |
|---|---:|
| None | $0 |
| Basic | $25 |
| Standard | $45 |
| Premium | $70 |

Extras premium is calculated as:

`Extras price per adult × number of adults`

LHC loading does not apply to extras cover.

### Cover Type and Family Upgrade Fee

| Cover type | Adults counted | Additional monthly fee |
|---|---:|---:|
| Single | 1 | $0 |
| Couple | 2 | $0 |
| Family | 2 | $30 |

Family cover counts two adults for premium calculations. Children are not counted individually. A flat $30 monthly family upgrade fee is added automatically.

### Monthly and Yearly Premiums

The monthly premium is calculated as:

`Hospital premium + Extras premium + Family upgrade fee`

The yearly premium before discount is:

`Monthly premium × 12`

For yearly payments, the annual discount is applied as follows:

`Yearly premium after discount = Yearly premium before discount × (1 − discount percentage / 100)`

The discount applies only when the customer selects Yearly payment. Monthly payments do not receive the annual discount.

## 7. Worked Example

Consider the following quote:

- Cover type: Family
- Applicant 1: Age 40, hospital cover history No
- Applicant 2: Age 35, hospital cover history Yes
- Hospital cover: Silver ($160 per adult/month)
- Extras cover: Standard ($45 per adult/month)
- Payment frequency: Yearly
- Annual discount: 5%

### Calculation

**1. Hospital premium**

Applicant 1 has a 20% LHC loading:

`(40 − 30) × 2% = 20%`

Applicant 1's hospital premium:

`$160 × 1.20 = $192`

Applicant 2 has a 0% LHC loading:

`$160 × 1.00 = $160`

Total hospital premium:

`$192 + $160 = $352/month`

**2. Extras premium**

`$45 × 2 adults = $90/month`

**3. Family upgrade fee**

`$30/month`

**4. Monthly premium**

`$352 + $90 + $30 = $472/month`

**5. Yearly premium before discount**

`$472 × 12 = $5,664/year`

**6. Yearly premium after the 5% discount**

`$5,664 × 0.95 = $5,380.80/year`

The expected results are:

| Premium | Expected amount |
|---|---:|
| Hospital premium | $352/month |
| Extras premium | $90/month |
| Family upgrade fee | $30/month |
| Monthly premium | $472/month |
| Yearly premium before discount | $5,664/year |
| Yearly premium after discount | $5,380.80/year |

## 8. Quote Explanation and Validation

Each quote's detail page provides a readable breakdown of the calculated premiums, including hospital and extras costs, each applicant's LHC loading percentage, the family upgrade fee where applicable, yearly estimates, the annual discount, and relevant warnings.

The following statement is included in the quote explanation:

> Lifetime Health Cover loading applies only to hospital cover. It does not apply to extras cover.

The application validates input data to help prevent invalid or misleading quotes.

Validation includes:

- Customer name and required cover selections must be provided.
- Applicant ages must be whole numbers between 18 and 100.
- Applicant 2's age and cover history are required for Couple and Family cover.
- Annual discounts must be between 0% and 10%.
- Monthly payments must not receive an annual discount.
- Unknown cover history triggers a warning without automatically applying LHC loading.
- Invalid requests sent to the backend should return meaningful error messages rather than causing the application to crash.

## 9. API Endpoints

The Express backend exposes the following API endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check backend availability |
| GET | `/api/quotes` | Retrieve quotes, with search support |
| GET | `/api/quotes/:id` | Retrieve one quote and its calculation |
| POST | `/api/quotes` | Create a new quote |
| PUT | `/api/quotes/:id` | Update an existing quote |
| DELETE | `/api/quotes/:id` | Delete a quote |

The frontend communicates with the backend through HTTP requests. The backend validates incoming data, performs database operations, and calculates the quote breakdown for display.

## 10. Project Structure

```text
HealthCoverSim/
├── init.sql
├── backend/
│   ├── server.js
│   ├── utils/
│   │   └── calculateQuote.js
│   ├── package.json
│   └── healthcoversim.db
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── App.css
    │   └── ...
    ├── package.json
    └── ...
```

The exact files may vary depending on the final project setup. The SQLite database file may be created automatically when the backend starts.

## 11. AI Use Statement

**AI tool used:** ChatGPT.

ChatGPT was used to assist with code starter, understanding React, Express, and SQLite, troubleshooting code issues, improving input validation, and drafting project documentation. I reviewed the suggested changes and used testing and debugging to check the application's behavior and consistency.

**My contributions:** I designed the application's flow and navigation, including how users create, view, edit, and manage insurance quotes. I also implemented the quote-list sorting by cover type (Family, Single, and Couple) to make quotes easier to organize. In addition, I tested the database and debugged inconsistencies to help ensure that the stored data and displayed information were consistent.

**Design decision:** I decided to organize the quote list by cover type—Family, Single, and Couple—to make it easier for users to find and compare quotes with different coverage arrangements.

**Verification:** I tested the database and investigated inconsistencies during development. I also checked the premium calculation logic against the assignment's worked example to verify that the results followed the required pricing rules.

## 12. Limitations

HealthCoverSim is a simplified educational simulator rather than a real insurance quotation service. It uses fixed cover prices and a simplified LHC loading rule. It does not account for every rule, exception, price variation, or policy condition used by real health insurers. Its estimates should therefore not be used to make actual insurance or financial decisions.