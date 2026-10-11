const express = require("express");
const cors = require("cors");

const db = require("./db");
const calculateQuote = require("./utils/calculateQuote");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Allowed values
const COVER_TYPES = ["single", "couple", "family"];

const COVER_HISTORIES = ["yes", "no", "not sure"];

const HOSPITAL_LEVELS = [
    "none",
    "basic",
    "bronze",
    "silver",
    "gold"
];

const EXTRAS_LEVELS = [
    "none",
    "basic",
    "standard",
    "premium"
];

const PAYMENT_FREQUENCIES = ["monthly", "yearly"];

// Validate quote input before saving it.
function validateQuote(data) {
    const errors = [];

    if (!data.customer_name ||
        typeof data.customer_name !== "string" ||
        !data.customer_name.trim()) {
        errors.push("Customer name is required.");
    }

    if (!COVER_TYPES.includes(data.cover_type)) {
        errors.push("Cover type must be single, couple, or family.");
    }

    if (
        !Number.isInteger(data.applicant1_age) ||
        data.applicant1_age < 18 ||
        data.applicant1_age > 100
    ) {
        errors.push("Applicant 1 age must be between 18 and 100.");
    }

    if (!COVER_HISTORIES.includes(data.applicant1_cover_history)) {
        errors.push("Please select Applicant 1's cover history.");
    }

    if (
        data.cover_type === "couple" ||
        data.cover_type === "family"
    ) {
        if (
            !Number.isInteger(data.applicant2_age) ||
            data.applicant2_age < 18 ||
            data.applicant2_age > 100
        ) {
            errors.push("Applicant 2 age must be between 18 and 100.");
        }

        if (!COVER_HISTORIES.includes(data.applicant2_cover_history)) {
            errors.push("Please select Applicant 2's cover history.");
        }
    }

    if (
        data.cover_type === "single" &&
        (
            data.applicant2_age != null ||
            data.applicant2_cover_history != null
        )
    ) {
        errors.push("Single cover must not include Applicant 2.");
    }

    if (!HOSPITAL_LEVELS.includes(data.hospital_cover)) {
        errors.push("Please select a valid hospital cover level.");
    }

    if (!EXTRAS_LEVELS.includes(data.extras_cover)) {
        errors.push("Please select a valid extras cover level.");
    }

    if (!PAYMENT_FREQUENCIES.includes(data.payment_frequency)) {
        errors.push("Payment frequency must be monthly or yearly.");
    }

    const discount = data.annual_discount;

    if (
        typeof discount !== "number" ||
        !Number.isFinite(discount) ||
        discount < 0 ||
        discount > 10
    ) {
        errors.push("Annual discount must be between 0% and 10%.");
    }

    if (
        data.payment_frequency === "monthly" &&
        discount !== 0
    ) {
        errors.push("Monthly payments must have a 0% discount.");
    }

    if (
        data.notes != null &&
        typeof data.notes !== "string"
    ) {
        errors.push("Notes must be text.");
    }

    return errors;
}

// Normalise and prepare input for insertion/update.
function prepareQuote(data) {
    return {
        customer_name: data.customer_name.trim(),
        cover_type: data.cover_type,
        applicant1_age: data.applicant1_age,
        applicant1_cover_history: data.applicant1_cover_history,

        applicant2_age:
            data.cover_type === "single"
                ? null
                : data.applicant2_age,

        applicant2_cover_history:
            data.cover_type === "single"
                ? null
                : data.applicant2_cover_history,

        hospital_cover: data.hospital_cover,
        extras_cover: data.extras_cover,
        payment_frequency: data.payment_frequency,
        annual_discount: data.annual_discount,
        notes: data.notes?.trim() || null
    };
}

// Retrieve a quote and attach its calculated premium breakdown.
function getQuoteDetails(id) {
    const quote = db.prepare(`
        SELECT
            q.*,
            h.price AS hospital_price_per_adult,
            e.price AS extras_price_per_adult
        FROM quotes q
        JOIN hospital_cover_prices h
            ON q.hospital_cover = h.level
        JOIN extras_cover_prices e
            ON q.extras_cover = e.level
        WHERE q.id = ?
    `).get(id);

    if (!quote) {
        return null;
    }

    const calculation = calculateQuote(
        quote,
        quote.hospital_price_per_adult,
        quote.extras_price_per_adult
    );

    return {
        ...quote,
        calculation
    };
}

// --------------------------------------------------
// GET /api/health
// Check whether the backend is running.
// --------------------------------------------------
app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "HealthCoverSim API is running."
    });
});

// --------------------------------------------------
// GET /api/quotes
// List quotes, optionally searching by name, ID,
// or cover type.
// Example: /api/quotes?search=single
// --------------------------------------------------
app.get("/api/quotes", (req, res) => {
    try {
        const search = (req.query.search || "").trim();

        let quotes;

        if (search) {
            const pattern = `%${search}%`;

            quotes = db.prepare(`
                SELECT
                    id,
                    customer_name,
                    cover_type,
                    hospital_cover,
                    extras_cover,
                    payment_frequency,
                    created_at
                FROM quotes
                WHERE customer_name LIKE ?
                   OR CAST(id AS TEXT) LIKE ?
                   OR cover_type LIKE ?
                ORDER BY id ASC
            `).all(pattern, pattern, pattern);
        } else {
            quotes = db.prepare(`
                SELECT
                    id,
                    customer_name,
                    cover_type,
                    hospital_cover,
                    extras_cover,
                    payment_frequency,
                    created_at
                FROM quotes
                ORDER BY id ASC
            `).all();
        }

        res.json(quotes);
    } catch (error) {
        console.error("Error listing quotes:", error);
        res.status(500).json({
            error: "Unable to retrieve quotes."
        });
    }
});

// --------------------------------------------------
// GET /api/quotes/:id
// Retrieve one quote and its premium breakdown.
// --------------------------------------------------
app.get("/api/quotes/:id", (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({
                error: "Quote ID must be a positive integer."
            });
        }

        const quote = getQuoteDetails(id);

        if (!quote) {
            return res.status(404).json({
                error: "Quote not found."
            });
        }

        res.json(quote);
    } catch (error) {
        console.error("Error retrieving quote:", error);
        res.status(500).json({
            error: "Unable to retrieve quote details."
        });
    }
});

// --------------------------------------------------
// POST /api/quotes
// Create a new quote.
// --------------------------------------------------
app.post("/api/quotes", (req, res) => {
    try {
        const errors = validateQuote(req.body);

        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }

        const data = prepareQuote(req.body);

        const result = db.prepare(`
            INSERT INTO quotes (
                customer_name,
                cover_type,
                applicant1_age,
                applicant1_cover_history,
                applicant2_age,
                applicant2_cover_history,
                hospital_cover,
                extras_cover,
                payment_frequency,
                annual_discount,
                notes
            )
            VALUES (
                @customer_name,
                @cover_type,
                @applicant1_age,
                @applicant1_cover_history,
                @applicant2_age,
                @applicant2_cover_history,
                @hospital_cover,
                @extras_cover,
                @payment_frequency,
                @annual_discount,
                @notes
            )
        `).run(data);

        const quote = getQuoteDetails(result.lastInsertRowid);

        res.status(201).json(quote);
    } catch (error) {
        console.error("Error creating quote:", error);
        res.status(500).json({
            error: "Unable to create quote."
        });
    }
});

// --------------------------------------------------
// PUT /api/quotes/:id
// Update an existing quote.
// --------------------------------------------------
app.put("/api/quotes/:id", (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({
                error: "Quote ID must be a positive integer."
            });
        }

        const existing = db.prepare(
            "SELECT id FROM quotes WHERE id = ?"
        ).get(id);

        if (!existing) {
            return res.status(404).json({
                error: "Quote not found."
            });
        }

        const errors = validateQuote(req.body);

        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }

        const data = prepareQuote(req.body);

        db.prepare(`
            UPDATE quotes SET
                customer_name = @customer_name,
                cover_type = @cover_type,
                applicant1_age = @applicant1_age,
                applicant1_cover_history = @applicant1_cover_history,
                applicant2_age = @applicant2_age,
                applicant2_cover_history = @applicant2_cover_history,
                hospital_cover = @hospital_cover,
                extras_cover = @extras_cover,
                payment_frequency = @payment_frequency,
                annual_discount = @annual_discount,
                notes = @notes
            WHERE id = @id
        `).run({ ...data, id });

        res.json(getQuoteDetails(id));
    } catch (error) {
        console.error("Error updating quote:", error);
        res.status(500).json({
            error: "Unable to update quote."
        });
    }
});

// --------------------------------------------------
// DELETE /api/quotes/:id
// Delete an existing quote.
// --------------------------------------------------
app.delete("/api/quotes/:id", (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({
                error: "Quote ID must be a positive integer."
            });
        }

        const result = db.prepare(
            "DELETE FROM quotes WHERE id = ?"
        ).run(id);

        if (result.changes === 0) {
            return res.status(404).json({
                error: "Quote not found."
            });
        }

        res.json({
            message: "Quote deleted successfully.",
            id
        });
    } catch (error) {
        console.error("Error deleting quote:", error);
        res.status(500).json({
            error: "Unable to delete quote."
        });
    }
});

// Handle invalid JSON and other unexpected errors.
app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
        return res.status(400).json({
            error: "Invalid JSON request body."
        });
    }

    console.error("Unexpected error:", error);

    res.status(500).json({
        error: "An unexpected server error occurred."
    });
});

const server = app.listen(PORT, () => {
    console.log(`HealthCoverSim API running at http://localhost:${PORT}`);
});

// Close the database connection gracefully when the server stops.
function shutdown() {
    server.close(() => {
        db.close();
        process.exit(0);
    });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);