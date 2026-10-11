
PRAGMA foreign_keys = ON;

-- Table 1: Hospital cover prices
CREATE TABLE IF NOT EXISTS hospital_cover_prices (
    level TEXT PRIMARY KEY
        CHECK (level IN ('none', 'basic', 'bronze', 'silver', 'gold')),
    price REAL NOT NULL CHECK (price >= 0)
);

-- Table 2: Extras cover prices
CREATE TABLE IF NOT EXISTS extras_cover_prices (
    level TEXT PRIMARY KEY
        CHECK (level IN ('none', 'basic', 'standard', 'premium')),
    price REAL NOT NULL CHECK (price >= 0)
);

-- Table 3: Customer quotes
CREATE TABLE IF NOT EXISTS quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    customer_name TEXT NOT NULL
        CHECK (length(trim(customer_name)) > 0),

    cover_type TEXT NOT NULL
        CHECK (cover_type IN ('single', 'couple', 'family')),

    applicant1_age INTEGER NOT NULL
        CHECK (applicant1_age BETWEEN 18 AND 100),

    applicant1_cover_history TEXT NOT NULL
        CHECK (
            applicant1_cover_history IN ('yes', 'no', 'not sure')
        ),

    applicant2_age INTEGER
        CHECK (
            applicant2_age IS NULL
            OR applicant2_age BETWEEN 18 AND 100
        ),

    applicant2_cover_history TEXT
        CHECK (
            applicant2_cover_history IS NULL
            OR applicant2_cover_history IN ('yes', 'no', 'not sure')
        ),

    hospital_cover TEXT NOT NULL DEFAULT 'none'
        REFERENCES hospital_cover_prices(level),

    extras_cover TEXT NOT NULL DEFAULT 'none'
        REFERENCES extras_cover_prices(level),

    payment_frequency TEXT NOT NULL DEFAULT 'monthly'
        CHECK (payment_frequency IN ('monthly', 'yearly')),

    annual_discount REAL NOT NULL DEFAULT 0
        CHECK (annual_discount BETWEEN 0 AND 10),

    notes TEXT,

    created_at TEXT NOT NULL DEFAULT
        (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

    -- Applicant 2 is required for Couple and Family.
    CHECK (
        (cover_type = 'single'
            AND applicant2_age IS NULL
            AND applicant2_cover_history IS NULL)
        OR
        (cover_type IN ('couple', 'family')
            AND applicant2_age IS NOT NULL
            AND applicant2_cover_history IS NOT NULL)
    ),

    -- Monthly payments cannot receive an annual discount.
    CHECK (
        payment_frequency = 'yearly'
        OR annual_discount = 0
    )
);

-- Insert the assignment's fixed hospital prices.
INSERT OR IGNORE INTO hospital_cover_prices (level, price)
VALUES
    ('none', 0),
    ('basic', 90),
    ('bronze', 120),
    ('silver', 160),
    ('gold', 220);

-- Insert the assignment's fixed extras prices.
INSERT OR IGNORE INTO extras_cover_prices (level, price)
VALUES
    ('none', 0),
    ('basic', 25),
    ('standard', 45),
    ('premium', 70);
